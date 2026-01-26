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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
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
    contact = Contact(**contact_data.model_dump())
    await db.contacts.insert_one(contact.model_dump())
    
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
    
    # Sample Products
    products = [
        # Website Templates
        Product(name="Corporate Pro", description="Professional corporate website template with modern design, animations, and responsive layout. Perfect for agencies and businesses.", category="template", subcategory="website", price=2999, image="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800", preview_images=["https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80"], features=["Responsive Design", "SEO Optimized", "Contact Forms", "Blog Section", "Dark Mode"], license_type="Standard", platform="React", industry="Business"),
        Product(name="E-Commerce starter", description="Complete e-commerce template with product listings, cart, and checkout functionality.", category="template", subcategory="website", price=4999, image="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=800", preview_images=["https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80"], features=["Product Catalog", "Shopping Cart", "Payment Integration", "Order Management", "Inventory System"], license_type="Extended", platform="Next.js", industry="Retail"),
        Product(name="Portfolio Starter", description="Elegant portfolio template for designers, photographers, and creatives.", category="template", subcategory="website", price=1499, image="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800", preview_images=["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80"], features=["Gallery Grid", "Project Showcase", "About Section", "Contact Form", "Smooth Animations"], license_type="Standard", platform="React", industry="Creative"),
        Product(name="SaaS Dashboard", description="Modern SaaS dashboard template with analytics, charts, and user management.", category="template", subcategory="website", price=5999, image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800", preview_images=["https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80"], features=["Charts & Analytics", "User Management", "Dark/Light Mode", "Notifications", "Settings Panel"], license_type="Extended", platform="React", industry="Technology"),
        
        # Logo Packages
        Product(name="Tech Startup Logo Pack", description="5 modern logo variations perfect for tech startups and SaaS companies.", category="logo", subcategory="tech", price=999, image="https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800", preview_images=["https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80"], features=["5 Logo Variations", "Source Files (AI, PSD)", "Vector Format", "Color Variations", "Brand Guidelines"], license_type="Commercial", style="Modern", industry="Technology"),
        Product(name="Restaurant Logo Collection", description="Elegant logo designs for restaurants, cafes, and food businesses.", category="logo", subcategory="food", price=799, image="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=800", preview_images=["https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80"], features=["4 Logo Designs", "Menu Card Template", "Social Media Kit", "Print Ready", "Editable Files"], license_type="Commercial", style="Classic", industry="Food & Beverage"),
        Product(name="Minimal Logo Bundle", description="Clean, minimalist logo designs suitable for any modern brand.", category="logo", subcategory="minimal", price=599, image="https://images.unsplash.com/photo-1614036417651-efe5912149d8?auto=format&fit=crop&q=80&w=800", preview_images=["https://images.unsplash.com/photo-1614036417651-efe5912149d8?auto=format&fit=crop&q=80"], features=["6 Minimal Logos", "Black & White Versions", "Scalable Vector", "Font Pairings", "Usage Guide"], license_type="Standard", style="Minimal", industry="General"),
        
        # App Templates
        Product(name="Fitness App UI Kit", description="Complete UI kit for fitness and workout tracking applications.", category="app_template", subcategory="mobile", price=3499, image="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=800", preview_images=["https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80"], features=["50+ Screens", "Workout Tracking", "Progress Charts", "Social Features", "Dark Mode"], license_type="Extended", platform="React Native", industry="Health & Fitness"),
        Product(name="Food Delivery App Template", description="Ready-to-use food delivery app template with customer and driver apps.", category="app_template", subcategory="mobile", price=6999, image="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800", preview_images=["https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80"], features=["Customer App", "Driver App", "Restaurant Panel", "Real-time Tracking", "Payment Integration"], license_type="Extended", platform="Flutter", industry="Food & Beverage"),
        
        # Design Assets
        Product(name="UI Icon Pack Pro", description="500+ premium icons for web and mobile applications.", category="design_asset", subcategory="icons", price=499, image="https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80&w=800", preview_images=["https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&q=80"], features=["500+ Icons", "SVG & PNG Formats", "Multiple Sizes", "Consistent Style", "Regular Updates"], license_type="Standard", style="Modern"),
        Product(name="Illustration Bundle", description="Beautiful hand-drawn illustrations for websites and presentations.", category="design_asset", subcategory="illustrations", price=1299, image="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800", preview_images=["https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80"], features=["100 Illustrations", "Customizable Colors", "AI & SVG Files", "Commercial License", "Figma Components"], license_type="Commercial", style="Hand-drawn"),
        Product(name="Social Media Template Kit", description="Complete social media template kit for Instagram, Facebook, and LinkedIn.", category="design_asset", subcategory="social", price=899, image="https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&q=80&w=800", preview_images=["https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&q=80"], features=["200+ Templates", "Story Templates", "Post Templates", "Editable in Canva", "Brand Consistency"], license_type="Standard", style="Modern"),
    ]
    
    # Sample Testimonials
    testimonials = [
        Testimonial(client_name="Rahul Sharma", company="TechFlow Solutions", role="CEO", content="Devmora delivered an exceptional e-commerce platform that exceeded our expectations. The attention to detail and technical expertise was outstanding.", avatar="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150", rating=5, project_type="Web Development"),
        Testimonial(client_name="Priya Patel", company="Bloom Studio", role="Creative Director", content="The logo design perfectly captured our brand essence. Professional, creative, and delivered on time. Highly recommended!", avatar="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150", rating=5, project_type="Logo Design"),
        Testimonial(client_name="Amit Kumar", company="FitLife App", role="Founder", content="Our fitness app went from concept to App Store in record time. The UI/UX work was phenomenal and our users love it.", avatar="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150", rating=5, project_type="App Development"),
        Testimonial(client_name="Sneha Reddy", company="CloudNine Ventures", role="CTO", content="The SaaS dashboard they built has transformed how we manage our operations. Clean code, great performance, excellent support.", avatar="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150", rating=5, project_type="Software Development"),
    ]
    
    # Sample Portfolio
    portfolio_items = [
        PortfolioItem(title="CloudFlow CRM", description="A comprehensive CRM solution for enterprise clients with AI-powered analytics.", category="Software Development", industry="Technology", technologies=["React", "Node.js", "PostgreSQL", "AWS"], image="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800", gallery=["https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80"], results=["50% increase in sales efficiency", "Reduced response time by 40%", "10,000+ active users"], client="TechFlow Solutions", year=2024, featured=True),
        PortfolioItem(title="FreshBite Food Delivery", description="End-to-end food delivery platform with real-time tracking and multi-vendor support.", category="App Development", industry="Food & Beverage", technologies=["Flutter", "Firebase", "Node.js", "MongoDB"], image="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80&w=800", gallery=["https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&q=80"], results=["100K+ downloads", "4.8 star rating", "500+ restaurant partners"], client="FreshBite Inc.", year=2024, featured=True),
        PortfolioItem(title="Zenith Bank Redesign", description="Complete website redesign for a leading financial institution focusing on user experience.", category="Website Development", industry="Finance", technologies=["Next.js", "Tailwind CSS", "Sanity CMS"], image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800", gallery=["https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80"], results=["60% increase in online applications", "Improved accessibility score to 98", "30% reduction in bounce rate"], client="Zenith Bank", year=2024, featured=True),
        PortfolioItem(title="Bloom Studio Branding", description="Complete brand identity including logo, stationery, and brand guidelines.", category="Logo Design", industry="Creative", technologies=["Adobe Illustrator", "Figma", "After Effects"], image="https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=800", gallery=["https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80"], results=["Brand recognition increased by 200%", "Consistent brand presence across 5 platforms", "Award-winning design"], client="Bloom Studio", year=2024, featured=False),
    ]
    
    # Insert all data
    for product in products:
        await db.products.insert_one(product.model_dump())
    
    for testimonial in testimonials:
        await db.testimonials.insert_one(testimonial.model_dump())
    
    for item in portfolio_items:
        await db.portfolio.insert_one(item.model_dump())
    
    return {"message": "Data seeded successfully", "products": len(products), "testimonials": len(testimonials), "portfolio": len(portfolio_items)}

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
