from fastapi import FastAPI, APIRouter, HTTPException, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import razorpay
import asyncio
import resend
import hmac
import hashlib
import dns.resolver

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Fix DNS resolution for MongoDB Atlas on Windows
dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
dns.resolver.default_resolver.nameservers = ['8.8.8.8', '8.8.4.4']

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=5000)
db = client[os.environ['DB_NAME']]

# Razorpay client
razorpay_key_id = os.environ.get('RAZORPAY_KEY_ID', '')
razorpay_key_secret = os.environ.get('RAZORPAY_KEY_SECRET', '')
razorpay_client = None
if razorpay_key_id and razorpay_key_secret:
    razorpay_client = razorpay.Client(auth=(razorpay_key_id, razorpay_key_secret))

# Resend setup
resend_api_key = os.environ.get('RESEND_API_KEY', '')
if resend_api_key:
    resend.api_key = resend_api_key

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ===== MODELS =====

class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str  # template, logo, app_template, design_asset
    subcategory: str
    price: float
    currency: str = "INR"
    image: str
    preview_images: List[str] = []
    features: List[str] = []
    license_type: str = "Standard"
    platform: Optional[str] = None
    industry: Optional[str] = None
    style: Optional[str] = None
    downloads: int = 0
    rating: float = 4.5
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ProductCreate(BaseModel):
    name: str
    description: str
    category: str
    subcategory: str
    price: float
    currency: str = "INR"
    image: str
    preview_images: List[str] = []
    features: List[str] = []
    license_type: str = "Standard"
    platform: Optional[str] = None
    industry: Optional[str] = None
    style: Optional[str] = None

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    items: List[dict]
    total_amount: float
    currency: str = "INR"
    customer_email: str
    customer_name: str
    status: str = "pending"  # pending, paid, failed
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class OrderCreate(BaseModel):
    items: List[CartItem]
    customer_email: EmailStr
    customer_name: str

class Contact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    service_type: str
    project_scope: str
    budget_range: Optional[str] = None
    timeline: Optional[str] = None
    message: str
    status: str = "new"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ContactCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    company: Optional[str] = None
    service_type: str
    project_scope: str
    budget_range: Optional[str] = None
    timeline: Optional[str] = None
    message: str

class Testimonial(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    company: str
    role: str
    content: str
    avatar: str
    rating: int = 5
    verified: bool = True
    project_type: str

class PortfolioItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    category: str
    industry: str
    technologies: List[str]
    image: str
    gallery: List[str] = []
    results: List[str] = []
    client: Optional[str] = None
    year: int
    featured: bool = False

# ===== ROUTES =====

@api_router.get("/")
async def root():
    return {"message": "Devmora Web Solutions API", "version": "1.0.0"}

# Products
@api_router.get("/products", response_model=List[Product])
async def get_products(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    platform: Optional[str] = None,
    industry: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    search: Optional[str] = None
):
    query = {}
    if category:
        query["category"] = category
    if subcategory:
        query["subcategory"] = subcategory
    if platform:
        query["platform"] = platform
    if industry:
        query["industry"] = industry
    if min_price is not None or max_price is not None:
        price_query = {}
        if min_price is not None:
            price_query["$gte"] = min_price
        if max_price is not None:
            price_query["$lte"] = max_price
        query["price"] = price_query
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    return products

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate):
    product = Product(**product_data.model_dump())
    doc = product.model_dump()
    await db.products.insert_one(doc)
    return product

# Orders & Payments
@api_router.post("/orders/create")
async def create_order(order_data: OrderCreate):
    # Fetch products and calculate total
    items_with_details = []
    total = 0.0
    
    for item in order_data.items:
        product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        item_total = product["price"] * item.quantity
        total += item_total
        items_with_details.append({
            "product_id": item.product_id,
            "name": product["name"],
            "price": product["price"],
            "quantity": item.quantity,
            "item_total": item_total
        })
    
    # Create Razorpay order
    razorpay_order = None
    if razorpay_client:
        try:
            razorpay_order = razorpay_client.order.create({
                "amount": int(total * 100),  # Convert to paise
                "currency": "INR",
                "payment_capture": 1
            })
        except Exception as e:
            logger.error(f"Razorpay order creation failed: {e}")
            raise HTTPException(status_code=500, detail="Payment gateway error")
    
    # Create order in database
    order = Order(
        items=items_with_details,
        total_amount=total,
        customer_email=order_data.customer_email,
        customer_name=order_data.customer_name,
        razorpay_order_id=razorpay_order["id"] if razorpay_order else None
    )
    
    await db.orders.insert_one(order.model_dump())
    
    return {
        "order_id": order.id,
        "razorpay_order_id": razorpay_order["id"] if razorpay_order else None,
        "amount": int(total * 100),
        "currency": "INR",
        "key_id": razorpay_key_id
    }

@api_router.post("/orders/verify")
async def verify_payment(request: Request):
    data = await request.json()
    razorpay_order_id = data.get("razorpay_order_id")
    razorpay_payment_id = data.get("razorpay_payment_id")
    razorpay_signature = data.get("razorpay_signature")
    
    if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
        raise HTTPException(status_code=400, detail="Missing payment details")
    
    # Verify signature
    try:
        msg = f"{razorpay_order_id}|{razorpay_payment_id}"
        generated_signature = hmac.new(
            razorpay_key_secret.encode(),
            msg.encode(),
            hashlib.sha256
        ).hexdigest()
        
        if generated_signature != razorpay_signature:
            raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.error(f"Signature verification failed: {e}")
        raise HTTPException(status_code=400, detail="Payment verification failed")
    
    # Update order status
    result = await db.orders.update_one(
        {"razorpay_order_id": razorpay_order_id},
        {"$set": {"status": "paid", "razorpay_payment_id": razorpay_payment_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Fetch order details for email
    order = await db.orders.find_one({"razorpay_order_id": razorpay_order_id}, {"_id": 0})
    
    # Send confirmation email
    if resend_api_key and order:
        try:
            items_html = "".join([
                f"<li>{item['name']} x {item['quantity']} - ₹{item['item_total']}</li>"
                for item in order["items"]
            ])
            await asyncio.to_thread(resend.Emails.send, {
                "from": os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev'),
                "to": [order["customer_email"]],
                "subject": f"Order Confirmation - Devmora Web Solutions",
                "html": f"""
                <h2>Thank you for your purchase, {order['customer_name']}!</h2>
                <p>Your order has been confirmed.</p>
                <h3>Order Details:</h3>
                <ul>{items_html}</ul>
                <p><strong>Total: ₹{order['total_amount']}</strong></p>
                <p>You can download your items from your account dashboard.</p>
                <p>Thank you for choosing Devmora Web Solutions!</p>
                """
            })
        except Exception as e:
            logger.error(f"Email sending failed: {e}")
    
    return {"status": "success", "order_id": order["id"] if order else None}

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# Contact / Inquiries
@api_router.post("/contact", response_model=Contact)
async def create_contact(contact_data: ContactCreate):
    try:
        contact = Contact(**contact_data.model_dump())
        await db.contacts.insert_one(contact.model_dump())
        logger.info(f"Contact saved successfully: {contact.id}")
        
        # Send notification email
        if resend_api_key:
            try:
                await asyncio.to_thread(resend.Emails.send, {
                    "from": os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev'),
                    "to": [os.environ.get('ADMIN_EMAIL', 'admin@devmora.com')],
                    "subject": f"New Inquiry: {contact_data.service_type} - {contact_data.name}",
                    "html": f"""
                    <h2>New Service Inquiry</h2>
                    <p><strong>Name:</strong> {contact_data.name}</p>
                    <p><strong>Email:</strong> {contact_data.email}</p>
                    <p><strong>Phone:</strong> {contact_data.phone or 'Not provided'}</p>
                    <p><strong>Company:</strong> {contact_data.company or 'Not provided'}</p>
                    <p><strong>Service:</strong> {contact_data.service_type}</p>
                    <p><strong>Project Scope:</strong> {contact_data.project_scope}</p>
                    <p><strong>Budget:</strong> {contact_data.budget_range or 'Not specified'}</p>
                    <p><strong>Timeline:</strong> {contact_data.timeline or 'Not specified'}</p>
                    <p><strong>Message:</strong></p>
                    <p>{contact_data.message}</p>
                    """
                })
            except Exception as e:
                logger.error(f"Contact email failed: {e}")
        
        return contact
    except Exception as e:
        logger.error(f"Failed to save contact: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save contact: {str(e)}")

@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts():
    contacts = await db.contacts.find({}, {"_id": 0}).to_list(100)
    return contacts

# Testimonials
@api_router.get("/testimonials", response_model=List[Testimonial])
async def get_testimonials():
    testimonials = await db.testimonials.find({}, {"_id": 0}).to_list(20)
    return testimonials

# Portfolio
@api_router.get("/portfolio", response_model=List[PortfolioItem])
async def get_portfolio(category: Optional[str] = None, featured: Optional[bool] = None):
    query = {}
    if category:
        query["category"] = category
    if featured is not None:
        query["featured"] = featured
    portfolio = await db.portfolio.find(query, {"_id": 0}).to_list(50)
    return portfolio

@api_router.get("/portfolio/{portfolio_id}", response_model=PortfolioItem)
async def get_portfolio_item(portfolio_id: str):
    item = await db.portfolio.find_one({"id": portfolio_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Portfolio item not found")
    return item

# Stats
@api_router.get("/stats")
async def get_stats():
    return {
        "years_in_business": 2,
        "completed_projects": 10,
        "happy_clients": 8,
        "products_sold": 25
    }

# Seed data endpoint (for initial setup)
@api_router.post("/seed")
async def seed_data():
    # Check if already seeded
    existing = await db.products.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    # ============================================================
    # SAMPLE PRODUCTS - Comprehensive digital marketplace inventory
    # ============================================================
    products = [
        # ----------------- WEBSITE TEMPLATES -----------------
        Product(
            name="Corporate Pro", 
            description="Professional corporate website template with modern design, animations, and responsive layout. Perfect for agencies and businesses. Includes 15+ page layouts, contact forms, team sections, and blog integration.", 
            category="template", 
            subcategory="website", 
            price=2999, 
            image="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Responsive Design", "SEO Optimized", "Contact Forms", "Blog Section", "Dark Mode", "CMS Ready"], 
            license_type="Standard", 
            platform="React", 
            industry="Business",
            downloads=1250,
            rating=4.8
        ),
        Product(
            name="E-Commerce starter", 
            description="Complete e-commerce template with product listings, cart, and checkout functionality. Built with performance in mind, featuring lazy loading, optimized images, and seamless payment integration.", 
            category="template", 
            subcategory="website", 
            price=4999, 
            image="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Product Catalog", "Shopping Cart", "Payment Integration", "Order Management", "Inventory System", "Wishlist"], 
            license_type="Extended", 
            platform="Next.js", 
            industry="Retail",
            downloads=890,
            rating=4.9
        ),
        Product(
            name="Portfolio Starter", 
            description="Elegant portfolio template for designers, photographers, and creatives. Showcase your work beautifully with masonry grids, lightbox galleries, and smooth page transitions.", 
            category="template", 
            subcategory="website", 
            price=1499, 
            image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1545665277-5937489579f2?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Gallery Grid", "Project Showcase", "About Section", "Contact Form", "Smooth Animations", "Lightbox"], 
            license_type="Standard", 
            platform="React", 
            industry="Creative",
            downloads=2100,
            rating=4.7
        ),
        Product(
            name="SaaS Dashboard Pro", 
            description="Modern SaaS dashboard template with analytics, charts, and user management. Includes data visualization components, admin panels, and notification systems.", 
            category="template", 
            subcategory="website", 
            price=5999, 
            image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Charts & Analytics", "User Management", "Dark/Light Mode", "Notifications", "Settings Panel", "Role-Based Access"], 
            license_type="Extended", 
            platform="React", 
            industry="Technology",
            downloads=650,
            rating=4.9
        ),
        Product(
            name="Restaurant & Cafe", 
            description="Beautiful restaurant website template with menu management, online ordering, and table reservations. Features interactive menu, gallery, and location maps.", 
            category="template", 
            subcategory="website", 
            price=2499, 
            image="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Menu Management", "Table Reservations", "Online Ordering", "Gallery", "Location Map", "Reviews Section"], 
            license_type="Standard", 
            platform="Vue.js", 
            industry="Food & Beverage",
            downloads=780,
            rating=4.6
        ),
        Product(
            name="Real Estate Portal", 
            description="Comprehensive real estate website template with property listings, advanced search filters, and agent profiles. Perfect for realtors and property management companies.", 
            category="template", 
            subcategory="website", 
            price=6499, 
            image="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Property Listings", "Advanced Search", "Agent Profiles", "Virtual Tours", "Mortgage Calculator", "Map Integration"], 
            license_type="Extended", 
            platform="Next.js", 
            industry="Real Estate",
            downloads=420,
            rating=4.8
        ),
        
        # ----------------- LOGO PACKAGES & BRANDING -----------------
        Product(
            name="Tech Startup Logo Pack", 
            description="5 modern logo variations perfect for tech startups and SaaS companies. Includes primary logo, icon-only version, horizontal layout, and monochrome variations.", 
            category="logo", 
            subcategory="tech", 
            price=999, 
            image="https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1614036417651-efe5912149d8?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["5 Logo Variations", "Source Files (AI, PSD)", "Vector Format", "Color Variations", "Brand Guidelines", "Social Media Sizes"], 
            license_type="Commercial", 
            style="Modern", 
            industry="Technology",
            downloads=1850,
            rating=4.9
        ),
        Product(
            name="Restaurant Logo Collection", 
            description="Elegant logo designs for restaurants, cafes, and food businesses. Classic and contemporary styles with food-themed iconography and appetizing color palettes.", 
            category="logo", 
            subcategory="food", 
            price=799, 
            image="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["4 Logo Designs", "Menu Card Template", "Social Media Kit", "Print Ready", "Editable Files", "Mockups Included"], 
            license_type="Commercial", 
            style="Classic", 
            industry="Food & Beverage",
            downloads=920,
            rating=4.7
        ),
        Product(
            name="Minimal Logo Bundle", 
            description="Clean, minimalist logo designs suitable for any modern brand. Timeless aesthetics with geometric shapes and refined typography.", 
            category="logo", 
            subcategory="minimal", 
            price=599, 
            image="https://images.unsplash.com/photo-1614036417651-efe5912149d8?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1614036417651-efe5912149d8?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["6 Minimal Logos", "Black & White Versions", "Scalable Vector", "Font Pairings", "Usage Guide", "Favicon Set"], 
            license_type="Standard", 
            style="Minimal", 
            industry="General",
            downloads=2400,
            rating=4.8
        ),
        Product(
            name="Fitness & Gym Branding Kit", 
            description="Complete branding package for fitness centers, gyms, and personal trainers. Bold, energetic designs that inspire action.", 
            category="logo", 
            subcategory="fitness", 
            price=1299, 
            image="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Logo + Variations", "Business Cards", "Letterhead", "T-shirt Mockups", "Social Media Templates", "Brand Guidelines PDF"], 
            license_type="Commercial", 
            style="Bold", 
            industry="Health & Fitness",
            downloads=680,
            rating=4.6
        ),
        Product(
            name="Fashion Brand Identity", 
            description="Sophisticated branding suite for fashion labels, boutiques, and clothing brands. Elegant typography and luxurious color schemes.", 
            category="logo", 
            subcategory="fashion", 
            price=1499, 
            image="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Primary Logo", "Submark", "Patterns", "Hang Tags", "Shopping Bags Mockup", "Lookbook Template"], 
            license_type="Extended", 
            style="Elegant", 
            industry="Fashion",
            downloads=540,
            rating=4.9
        ),
        Product(
            name="Eco & Nature Logo Set", 
            description="Earth-friendly logo designs for sustainable businesses, organic products, and environmental organizations. Features leaf motifs and natural color palettes.", 
            category="logo", 
            subcategory="eco", 
            price=699, 
            image="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["5 Eco Logos", "Leaf & Nature Icons", "Earth Tones Palette", "Recyclable Packaging Designs", "Sticker Templates"], 
            license_type="Commercial", 
            style="Natural", 
            industry="Environment",
            downloads=760,
            rating=4.7
        ),
        
        # ----------------- MOBILE APP TEMPLATES -----------------
        Product(
            name="Fitness App UI Kit", 
            description="Complete UI kit for fitness and workout tracking applications. 50+ screens covering workouts, nutrition tracking, progress analytics, and social features.", 
            category="app_template", 
            subcategory="mobile", 
            price=3499, 
            image="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["50+ Screens", "Workout Tracking", "Progress Charts", "Social Features", "Dark Mode", "Apple Health Integration"], 
            license_type="Extended", 
            platform="React Native", 
            industry="Health & Fitness",
            downloads=1120,
            rating=4.8
        ),
        Product(
            name="Food Delivery App Template", 
            description="Ready-to-use food delivery app template with customer, restaurant, and driver apps. Real-time tracking, payment integration, and push notifications.", 
            category="app_template", 
            subcategory="mobile", 
            price=6999, 
            image="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Customer App", "Driver App", "Restaurant Panel", "Real-time Tracking", "Payment Integration", "Push Notifications"], 
            license_type="Extended", 
            platform="Flutter", 
            industry="Food & Beverage",
            downloads=890,
            rating=4.9
        ),
        Product(
            name="E-Learning App UI", 
            description="Modern education app template with course management, video lessons, quizzes, and certificates. Designed for online learning platforms.", 
            category="app_template", 
            subcategory="mobile", 
            price=4499, 
            image="https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Course Catalog", "Video Player", "Quiz System", "Progress Tracking", "Certificates", "Offline Mode"], 
            license_type="Extended", 
            platform="React Native", 
            industry="Education",
            downloads=670,
            rating=4.7
        ),
        Product(
            name="Banking & Finance App", 
            description="Secure banking application template with account management, transactions, budgeting tools, and biometric authentication.", 
            category="app_template", 
            subcategory="mobile", 
            price=7999, 
            image="https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Account Dashboard", "Transaction History", "Bill Payments", "Budget Tracking", "Biometric Auth", "Card Management"], 
            license_type="Extended", 
            platform="Flutter", 
            industry="Finance",
            downloads=450,
            rating=4.9
        ),
        Product(
            name="Social Media App Template", 
            description="Feature-rich social networking app template with posts, stories, messaging, and live streaming capabilities.", 
            category="app_template", 
            subcategory="mobile", 
            price=5499, 
            image="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Feed & Stories", "Direct Messaging", "Live Streaming", "User Profiles", "Notifications", "Content Moderation"], 
            license_type="Extended", 
            platform="React Native", 
            industry="Social",
            downloads=780,
            rating=4.6
        ),
        Product(
            name="Travel Booking App", 
            description="Comprehensive travel booking app for flights, hotels, and experiences. Includes itinerary planning and offline maps.", 
            category="app_template", 
            subcategory="mobile", 
            price=5999, 
            image="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Flight Booking", "Hotel Search", "Trip Itinerary", "Offline Maps", "Reviews & Ratings", "Multi-Currency"], 
            license_type="Extended", 
            platform="Flutter", 
            industry="Travel",
            downloads=560,
            rating=4.8
        ),
        
        # ----------------- SOFTWARE/DESKTOP TEMPLATES -----------------
        Product(
            name="Admin Dashboard Pro", 
            description="Comprehensive admin dashboard template for managing applications, users, and analytics. Clean interface with 100+ components.", 
            category="software", 
            subcategory="admin", 
            price=3999, 
            image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["100+ Components", "Data Tables", "Charts Library", "Form Builder", "User Management", "API Integration"], 
            license_type="Extended", 
            platform="React + Electron", 
            industry="Technology",
            downloads=1340,
            rating=4.9
        ),
        Product(
            name="Invoice & Billing System", 
            description="Desktop invoicing application with client management, recurring invoices, and financial reports. Perfect for freelancers and small businesses.", 
            category="software", 
            subcategory="finance", 
            price=2999, 
            image="https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Invoice Generator", "Client Database", "Payment Tracking", "Tax Calculations", "Financial Reports", "PDF Export"], 
            license_type="Extended", 
            platform="Electron", 
            industry="Finance",
            downloads=890,
            rating=4.7
        ),
        Product(
            name="Project Management Suite", 
            description="Full-featured project management software with task boards, time tracking, team collaboration, and Gantt charts.", 
            category="software", 
            subcategory="productivity", 
            price=4999, 
            image="https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Kanban Boards", "Gantt Charts", "Time Tracking", "Team Chat", "File Sharing", "Reporting"], 
            license_type="Extended", 
            platform="React + Node.js", 
            industry="Business",
            downloads=720,
            rating=4.8
        ),
        Product(
            name="Inventory Management System", 
            description="Robust inventory tracking software for warehouses and retail. Features barcode scanning, stock alerts, and multi-location support.", 
            category="software", 
            subcategory="inventory", 
            price=5499, 
            image="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["Barcode Scanner", "Stock Alerts", "Purchase Orders", "Multi-Location", "Supplier Management", "Analytics"], 
            license_type="Extended", 
            platform="Python + React", 
            industry="Retail",
            downloads=480,
            rating=4.6
        ),
        
        # ----------------- DESIGN ASSETS -----------------
        Product(
            name="UI Icon Pack Pro", 
            description="500+ premium icons for web and mobile applications. Includes solid, outline, and duo-tone variants in multiple sizes.", 
            category="design_asset", 
            subcategory="icons", 
            price=499, 
            image="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["500+ Icons", "SVG & PNG Formats", "Multiple Sizes", "3 Styles", "Regular Updates", "Figma Plugin"], 
            license_type="Standard", 
            style="Modern",
            downloads=3200,
            rating=4.9
        ),
        Product(
            name="Illustration Bundle", 
            description="Beautiful hand-drawn illustrations for websites and presentations. 100 unique illustrations with customizable colors.", 
            category="design_asset", 
            subcategory="illustrations", 
            price=1299, 
            image="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["100 Illustrations", "Customizable Colors", "AI & SVG Files", "Commercial License", "Figma Components", "Lottie Animations"], 
            license_type="Commercial", 
            style="Hand-drawn",
            downloads=1890,
            rating=4.8
        ),
        Product(
            name="Social Media Template Kit", 
            description="Complete social media template kit for Instagram, Facebook, LinkedIn, and Twitter. 200+ templates in Figma and Canva formats.", 
            category="design_asset", 
            subcategory="social", 
            price=899, 
            image="https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["200+ Templates", "Story Templates", "Post Templates", "Editable in Canva", "Brand Consistency", "Content Calendar"], 
            license_type="Standard", 
            style="Modern",
            downloads=2650,
            rating=4.7
        ),
        Product(
            name="3D Mockup Collection", 
            description="Professional 3D mockups for product presentations. Includes device mockups, packaging, and branding mockups.", 
            category="design_asset", 
            subcategory="mockups", 
            price=799, 
            image="https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&q=80&w=800", 
            preview_images=[
                "https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?auto=format&fit=crop&q=80&w=800"
            ], 
            features=["50+ Mockups", "Smart Objects", "High Resolution", "Multiple Angles", "Easy Customization", "PSD Files"], 
            license_type="Commercial", 
            style="3D",
            downloads=1450,
            rating=4.8
        ),
    ]
    
    # ============================================================
    # SAMPLE TESTIMONIALS - Real-looking client feedback
    # ============================================================
    testimonials = [
        Testimonial(
            client_name="Rahul Sharma", 
            company="TechFlow Solutions", 
            role="CEO", 
            content="Devmora delivered an exceptional e-commerce platform that exceeded our expectations. The attention to detail and technical expertise was outstanding. Our online sales increased by 150% within 3 months!", 
            avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150", 
            rating=5, 
            project_type="Web Development"
        ),
        Testimonial(
            client_name="Priya Patel", 
            company="Bloom Studio", 
            role="Creative Director", 
            content="The logo design perfectly captured our brand essence. Professional, creative, and delivered ahead of schedule. The brand guidelines they provided have been invaluable for maintaining consistency.", 
            avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150", 
            rating=5, 
            project_type="Logo Design"
        ),
        Testimonial(
            client_name="Amit Kumar", 
            company="FitLife App", 
            role="Founder", 
            content="Our fitness app went from concept to App Store in record time. The UI/UX work was phenomenal and our users love the intuitive interface. We've achieved 100K downloads in just 6 months!", 
            avatar="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150", 
            rating=5, 
            project_type="App Development"
        ),
        Testimonial(
            client_name="Sneha Reddy", 
            company="CloudNine Ventures", 
            role="CTO", 
            content="The SaaS dashboard they built has transformed how we manage our operations. Clean code, great performance, and excellent post-launch support. Highly recommend their services!", 
            avatar="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150", 
            rating=5, 
            project_type="Software Development"
        ),
        Testimonial(
            client_name="Vikram Singh", 
            company="Urban Eats", 
            role="Co-Founder", 
            content="The food delivery app they created helped us compete with major players. Real-time tracking works flawlessly and our customers love the experience. Revenue doubled in Q1!", 
            avatar="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150", 
            rating=5, 
            project_type="App Development"
        ),
        Testimonial(
            client_name="Ananya Mehta", 
            company="Zenith Realty", 
            role="Marketing Head", 
            content="Our new website is stunning and has significantly improved our lead generation. The property search feature and virtual tours have been game-changers for our business.", 
            avatar="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150", 
            rating=5, 
            project_type="Website Development"
        ),
        Testimonial(
            client_name="Karthik Nair", 
            company="EduSpark", 
            role="Product Manager", 
            content="The e-learning platform exceeded all expectations. Student engagement is up 80% and our instructors find it incredibly easy to use. A truly professional team!", 
            avatar="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150", 
            rating=5, 
            project_type="Software Development"
        ),
        Testimonial(
            client_name="Maya Joshi", 
            company="Artisan Coffee", 
            role="Owner", 
            content="The branding package gave our cafe chain a fresh, memorable identity. From logo to menu designs, everything is cohesive and beautiful. Customers constantly compliment our aesthetics!", 
            avatar="https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?auto=format&fit=crop&q=80&w=150", 
            rating=5, 
            project_type="Branding"
        ),
    ]
    
    # ============================================================
    # SAMPLE PORTFOLIO - Showcase projects across all categories
    # ============================================================
    portfolio_items = [
        # ----- SOFTWARE PROJECTS -----
        PortfolioItem(
            title="CloudFlow CRM", 
            description="A comprehensive customer relationship management solution for enterprise clients with AI-powered analytics, sales pipeline management, and automated lead scoring. Built to handle 100K+ contacts with real-time synchronization.", 
            category="Software", 
            industry="Technology", 
            technologies=["React", "Node.js", "PostgreSQL", "AWS", "TensorFlow"], 
            image="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["50% increase in sales efficiency", "Reduced response time by 40%", "10,000+ active daily users", "99.9% uptime achieved"], 
            client="TechFlow Solutions", 
            year=2024, 
            featured=True
        ),
        PortfolioItem(
            title="FinanceHub Analytics", 
            description="Enterprise-grade financial analytics platform with real-time market data, portfolio management, and automated trading signals. Processes 1M+ transactions daily with sub-second latency.", 
            category="Software", 
            industry="Finance", 
            technologies=["Python", "React", "Redis", "Kafka", "Docker"], 
            image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["Processing 1M+ daily transactions", "Sub-100ms response time", "30% cost reduction for client", "Regulatory compliance achieved"], 
            client="Global Capital Partners", 
            year=2024, 
            featured=True
        ),
        PortfolioItem(
            title="MedTrack Hospital System", 
            description="Comprehensive hospital management software with patient records, appointment scheduling, billing integration, and telemedicine capabilities. HIPAA compliant and highly secure.", 
            category="Software", 
            industry="Healthcare", 
            technologies=["Java", "Spring Boot", "React", "PostgreSQL", "FHIR"], 
            image="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["50% reduction in admin time", "HIPAA compliant implementation", "200+ healthcare staff trained", "Patient wait times reduced 35%"], 
            client="City General Hospital", 
            year=2024, 
            featured=False
        ),
        PortfolioItem(
            title="LogiFlow Warehouse Manager", 
            description="Smart warehouse management system with barcode scanning, automated inventory tracking, and predictive restocking. Integrates with major shipping carriers.", 
            category="Software", 
            industry="Logistics", 
            technologies=["Python", "Django", "React", "TensorFlow", "IoT"], 
            image="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["45% faster order processing", "Inventory accuracy 99.5%", "Reduced stockouts by 60%", "ROI achieved in 4 months"], 
            client="Rapid Logistics Ltd", 
            year=2023, 
            featured=False
        ),
        
        # ----- WEBSITE PROJECTS -----
        PortfolioItem(
            title="Zenith Bank Redesign", 
            description="Complete website redesign for a leading financial institution with focus on user experience, accessibility, and security. Includes online banking portal, loan applications, and customer support.", 
            category="Website", 
            industry="Finance", 
            technologies=["Next.js", "Tailwind CSS", "Sanity CMS", "Node.js"], 
            image="https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["60% increase in online applications", "Accessibility score improved to 98", "30% reduction in bounce rate", "Mobile traffic up 120%"], 
            client="Zenith Bank", 
            year=2024, 
            featured=True
        ),
        PortfolioItem(
            title="Wanderlust Travel Portal", 
            description="Feature-rich travel booking website with flight and hotel search, itinerary planning, and travel blog. Includes multi-currency support and live availability checking.", 
            category="Website", 
            industry="Travel", 
            technologies=["React", "Node.js", "MongoDB", "Stripe", "Amadeus API"], 
            image="https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["25,000+ bookings in first quarter", "4.9 star customer rating", "Conversion rate increased 85%", "Average session duration 8 min"], 
            client="Wanderlust Travels", 
            year=2024, 
            featured=True
        ),
        PortfolioItem(
            title="Urban Spaces Real Estate", 
            description="Modern real estate platform with virtual property tours, advanced search filters, and agent matching. Features 3D walkthroughs and neighborhood analytics.", 
            category="Website", 
            industry="Real Estate", 
            technologies=["Next.js", "Three.js", "PostgreSQL", "MapBox"], 
            image="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["40% more qualified leads", "Virtual tours viewed 50K times", "Agent productivity up 60%", "Market leader in region"], 
            client="Urban Spaces Realty", 
            year=2024, 
            featured=False
        ),
        PortfolioItem(
            title="GreenMart E-commerce", 
            description="Sustainable products e-commerce platform with carbon footprint tracking, eco-friendly packaging options, and community marketplace for local sellers.", 
            category="Website", 
            industry="Retail", 
            technologies=["Next.js", "Shopify API", "Tailwind CSS", "Stripe"], 
            image="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["₹2Cr revenue in first year", "500+ eco-brands onboarded", "Carbon neutral delivery achieved", "50K+ registered customers"], 
            client="GreenMart India", 
            year=2023, 
            featured=False
        ),
        PortfolioItem(
            title="TechEd Learning Platform", 
            description="Online learning platform for tech professionals with video courses, coding exercises, and certification programs. Features adaptive learning paths and mentorship matching.", 
            category="Website", 
            industry="Education", 
            technologies=["React", "Node.js", "MongoDB", "WebRTC", "AWS"], 
            image="https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["75,000+ enrolled students", "92% course completion rate", "4.8 average course rating", "Partnership with 50+ companies"], 
            client="TechEd Academy", 
            year=2024, 
            featured=False
        ),
        
        # ----- MOBILE APP PROJECTS -----
        PortfolioItem(
            title="FreshBite Food Delivery", 
            description="End-to-end food delivery platform with customer app, restaurant dashboard, and driver app. Features real-time tracking, split payments, and group ordering capabilities.", 
            category="Mobile App", 
            industry="Food & Beverage", 
            technologies=["Flutter", "Firebase", "Node.js", "MongoDB", "Google Maps"], 
            image="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["100K+ downloads in 6 months", "4.8 star rating on both stores", "500+ restaurant partners", "30-minute average delivery"], 
            client="FreshBite Inc.", 
            year=2024, 
            featured=True
        ),
        PortfolioItem(
            title="FitPulse Workout App", 
            description="Comprehensive fitness application with AI-powered workout plans, nutrition tracking, and social challenges. Integrates with wearables and provides detailed health insights.", 
            category="Mobile App", 
            industry="Health & Fitness", 
            technologies=["React Native", "TensorFlow Lite", "Firebase", "HealthKit", "Google Fit"], 
            image="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["250K+ active users", "Users lost avg 5kg in 3 months", "Featured in App Store", "40% premium conversion"], 
            client="FitPulse Health", 
            year=2024, 
            featured=True
        ),
        PortfolioItem(
            title="QuickPay Wallet", 
            description="Digital wallet application with UPI payments, bill splitting, rewards program, and investment options. Bank-grade security with biometric authentication.", 
            category="Mobile App", 
            industry="Finance", 
            technologies=["Flutter", "Node.js", "PostgreSQL", "UPI", "AWS KMS"], 
            image="https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["1M+ registered users", "₹100Cr+ monthly transactions", "99.99% uptime", "RBI compliant"], 
            client="QuickPay Financial", 
            year=2024, 
            featured=False
        ),
        PortfolioItem(
            title="PetCare Connect", 
            description="Pet services marketplace app connecting pet owners with vets, groomers, walkers, and pet stores. Includes health records and appointment scheduling.", 
            category="Mobile App", 
            industry="Pet Services", 
            technologies=["React Native", "Firebase", "Node.js", "Stripe"], 
            image="https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1587300003388-59208cc962cb?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["50K+ pet profiles created", "2000+ service providers", "4.9 star rating", "Expanded to 5 cities"], 
            client="PetCare India", 
            year=2023, 
            featured=False
        ),
        PortfolioItem(
            title="RideShare Commute", 
            description="Carpooling app for daily commuters with route matching, cost splitting, and corporate plans. Eco-friendly travel solution with carbon savings tracking.", 
            category="Mobile App", 
            industry="Transportation", 
            technologies=["Flutter", "Go", "PostgreSQL", "Google Maps", "Firebase"], 
            image="https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["80K+ daily rides shared", "2M kg CO2 saved annually", "50+ corporate partnerships", "₹3Cr saved by users monthly"], 
            client="RideShare Mobility", 
            year=2024, 
            featured=False
        ),
        
        # ----- BRANDING & LOGO PROJECTS -----
        PortfolioItem(
            title="Bloom Studio Branding", 
            description="Complete brand identity for creative design studio including logo, stationery, brand guidelines, and digital assets. Modern, vibrant aesthetic reflecting creativity and innovation.", 
            category="Branding", 
            industry="Creative", 
            technologies=["Adobe Illustrator", "Figma", "After Effects", "Photoshop"], 
            image="https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1614036417651-efe5912149d8?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["Brand recognition up 200%", "Consistent presence across 5 platforms", "Award-winning design", "Featured in design publications"], 
            client="Bloom Studio", 
            year=2024, 
            featured=True
        ),
        PortfolioItem(
            title="Artisan Coffee Rebrand", 
            description="Full rebrand for specialty coffee chain including logo redesign, packaging, store signage, and merchandise. Rustic-modern aesthetic celebrating craft coffee culture.", 
            category="Branding", 
            industry="Food & Beverage", 
            technologies=["Adobe Illustrator", "Photoshop", "InDesign"], 
            image="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=800",
                "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["Store footfall increased 45%", "Merchandise sales up 300%", "Social media following tripled", "3 new locations opened"], 
            client="Artisan Coffee Co.", 
            year=2024, 
            featured=True
        ),
        PortfolioItem(
            title="TechVentures Identity", 
            description="Startup accelerator brand identity with dynamic logo system, pitch deck templates, and event branding. Professional yet approachable design for the innovation ecosystem.", 
            category="Branding", 
            industry="Technology", 
            technologies=["Figma", "Adobe Illustrator", "After Effects"], 
            image="https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1559136555-9303baea8ebd?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["200+ startups attracted", "Brand recall improved 180%", "Investor interest doubled", "Event attendance up 250%"], 
            client="TechVentures Accelerator", 
            year=2024, 
            featured=False
        ),
        PortfolioItem(
            title="EcoWear Fashion Brand", 
            description="Sustainable fashion brand identity with eco-conscious messaging, recyclable packaging design, and cohesive visual language. Earthy, minimal aesthetic.", 
            category="Branding", 
            industry="Fashion", 
            technologies=["Adobe Illustrator", "Photoshop", "Figma"], 
            image="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["₹1.5Cr launch sales", "15K Instagram followers in 3 months", "Featured in Vogue India", "Zero-waste packaging achieved"], 
            client="EcoWear Clothing", 
            year=2023, 
            featured=False
        ),
        PortfolioItem(
            title="HealthFirst Clinic Branding", 
            description="Healthcare clinic brand identity conveying trust, professionalism, and care. Includes logo, signage, patient communication materials, and digital presence.", 
            category="Branding", 
            industry="Healthcare", 
            technologies=["Adobe Illustrator", "InDesign", "Figma"], 
            image="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["Patient trust score 95%", "New patient registrations up 120%", "Brand consistency across 10 locations", "Healthcare excellence award"], 
            client="HealthFirst Clinics", 
            year=2024, 
            featured=False
        ),
        PortfolioItem(
            title="Urban Fitness Gym Branding", 
            description="Bold, energetic brand identity for modern gym chain including logo, merchandise, app design, and environmental graphics. High-impact visuals that inspire action.", 
            category="Branding", 
            industry="Health & Fitness", 
            technologies=["Adobe Illustrator", "After Effects", "Photoshop"], 
            image="https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&q=80&w=800", 
            gallery=[
                "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&q=80&w=800"
            ], 
            results=["Membership grew 80%", "Merchandise line launched", "Social engagement up 400%", "Franchise inquiries doubled"], 
            client="Urban Fitness", 
            year=2024, 
            featured=False
        ),
    ]
    
    # Insert all data
    for product in products:
        await db.products.insert_one(product.model_dump())
    
    for testimonial in testimonials:
        await db.testimonials.insert_one(testimonial.model_dump())
    
    for item in portfolio_items:
        await db.portfolio.insert_one(item.model_dump())
    
    return {
        "message": "Data seeded successfully", 
        "products": len(products), 
        "testimonials": len(testimonials), 
        "portfolio": len(portfolio_items)
    }

# Force reseed endpoint (clears existing data first)
@api_router.post("/reseed")
async def reseed_data():
    # Clear existing data
    await db.products.delete_many({})
    await db.testimonials.delete_many({})
    await db.portfolio.delete_many({})
    
    # Call seed function
    return await seed_data()

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
