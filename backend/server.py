from fastapi import FastAPI, APIRouter, HTTPException, Request, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import razorpay
import asyncio
import resend
import hmac
import hashlib
import dns.resolver
import secrets
from jose import JWTError, jwt
from passlib.context import CryptContext

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

# JWT & Password Hashing Configuration
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
REFRESH_TOKEN_EXPIRE_DAYS = 30
PASSWORD_RESET_EXPIRE_MINUTES = 30
EMAIL_VERIFY_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

# Frontend URL for email links
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

# GitHub OAuth Configuration
GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', '')
GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', '')
GITHUB_REDIRECT_URI = os.environ.get('GITHUB_REDIRECT_URI', f'{FRONTEND_URL}/auth/github/callback')

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

# ===== AUTH MODELS =====

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    password_hash: str
    name: str
    avatar: Optional[str] = None
    email_verified: bool = False
    verification_token: Optional[str] = None
    verification_token_expires: Optional[str] = None
    reset_token: Optional[str] = None
    reset_token_expires: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    last_login: Optional[str] = None
    is_active: bool = True

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    
class UserLogin(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False

class UserProfile(BaseModel):
    id: str
    email: str
    name: str
    avatar: Optional[str]
    email_verified: bool
    created_at: str
    last_login: Optional[str]

class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserProfile

class UserOrder(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    razorpay_order_id: Optional[str] = None
    razorpay_payment_id: Optional[str] = None
    items: List[dict]
    total_amount: float
    currency: str = "INR"
    status: str = "pending"  # pending, paid, failed, refunded
    invoice_number: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class Download(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    product_id: str
    order_id: str
    downloaded_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    download_count: int = 1
    last_downloaded: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# ===== AUTH HELPER FUNCTIONS =====

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_verification_token() -> str:
    return secrets.token_urlsafe(32)

def validate_password_strength(password: str) -> tuple[bool, str]:
    """Validate password meets security requirements"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        return False, "Password must contain at least one special character"
    return True, "Password is valid"

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """Get current user from JWT token"""
    if credentials is None:
        return None
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        return user
    except JWTError:
        return None

async def get_required_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current user or raise 401"""
    user = await get_current_user(credentials)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

async def send_verification_email(email: str, name: str, token: str):
    """Send email verification link"""
    if not resend_api_key:
        logger.warning("Resend API key not configured, skipping verification email")
        return
    
    verification_link = f"{FRONTEND_URL}/verify-email?token={token}"
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev'),
            "to": [email],
            "subject": "Verify your email - Devmora Web Solutions",
            "html": f"""
            <div style="font-family: 'Satoshi', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1e3a5f;">Welcome to Devmora!</h1>
                </div>
                <p>Hi {name},</p>
                <p>Thank you for registering with Devmora Web Solutions. Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_link}" style="background-color: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600;">
                        Verify Email Address
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{verification_link}</p>
                <p>This link will expire in 24 hours.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">If you didn't create an account with Devmora, please ignore this email.</p>
            </div>
            """
        })
    except Exception as e:
        logger.error(f"Failed to send verification email: {e}")

async def send_password_reset_email(email: str, name: str, token: str):
    """Send password reset link"""
    if not resend_api_key:
        logger.warning("Resend API key not configured, skipping password reset email")
        return
    
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev'),
            "to": [email],
            "subject": "Reset your password - Devmora Web Solutions",
            "html": f"""
            <div style="font-family: 'Satoshi', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1e3a5f;">Password Reset</h1>
                </div>
                <p>Hi {name},</p>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background-color: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600;">
                        Reset Password
                    </a>
                </div>
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{reset_link}</p>
                <p>This link will expire in 30 minutes.</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #666; font-size: 12px;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            """
        })
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")

async def send_welcome_email(email: str, name: str):
    """Send welcome email after verification"""
    if not resend_api_key:
        return
    
    try:
        await asyncio.to_thread(resend.Emails.send, {
            "from": os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev'),
            "to": [email],
            "subject": "Welcome to Devmora Web Solutions!",
            "html": f"""
            <div style="font-family: 'Satoshi', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #1e3a5f;">Welcome Aboard! 🎉</h1>
                </div>
                <p>Hi {name},</p>
                <p>Your email has been verified and your Devmora account is now fully activated!</p>
                <p>Here's what you can do now:</p>
                <ul>
                    <li>Browse our marketplace for premium templates and digital assets</li>
                    <li>Access your purchased products anytime from your dashboard</li>
                    <li>Download unlimited times for products you've purchased</li>
                    <li>Track your order history and invoices</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{FRONTEND_URL}/marketplace" style="background-color: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600;">
                        Explore Marketplace
                    </a>
                </div>
                <p>Thank you for choosing Devmora Web Solutions!</p>
            </div>
            """
        })
    except Exception as e:
        logger.error(f"Failed to send welcome email: {e}")

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

# ===== AUTHENTICATION ROUTES =====

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserRegister):
    """Register a new user"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists"
        )
    
    # Validate password strength
    is_valid, message = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Generate verification token
    verification_token = generate_verification_token()
    verification_expires = (datetime.now(timezone.utc) + timedelta(hours=EMAIL_VERIFY_EXPIRE_HOURS)).isoformat()
    
    # Create user
    user = User(
        email=user_data.email.lower(),
        password_hash=get_password_hash(user_data.password),
        name=user_data.name,
        verification_token=verification_token,
        verification_token_expires=verification_expires
    )
    
    await db.users.insert_one(user.model_dump())
    
    # Send verification email
    await send_verification_email(user.email, user.name, verification_token)
    
    # Create access token
    access_token = create_access_token(
        data={"sub": user.id, "email": user.email}
    )
    
    return TokenResponse(
        access_token=access_token,
        user=UserProfile(
            id=user.id,
            email=user.email,
            name=user.name,
            avatar=user.avatar,
            email_verified=user.email_verified,
            created_at=user.created_at,
            last_login=user.last_login
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    """Login user"""
    user = await db.users.find_one({"email": user_data.email.lower()})
    
    if not user or not verify_password(user_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.get("is_active", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )
    
    # Update last login
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Set token expiry based on remember me
    if user_data.remember_me:
        expires_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    else:
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"]},
        expires_delta=expires_delta
    )
    
    return TokenResponse(
        access_token=access_token,
        user=UserProfile(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            avatar=user.get("avatar"),
            email_verified=user.get("email_verified", False),
            created_at=user["created_at"],
            last_login=datetime.now(timezone.utc).isoformat()
        )
    )

@api_router.post("/auth/verify-email")
async def verify_email(token: str):
    """Verify user email"""
    user = await db.users.find_one({"verification_token": token})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Check if token is expired
    if user.get("verification_token_expires"):
        expires = datetime.fromisoformat(user["verification_token_expires"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token has expired. Please request a new one."
            )
    
    # Update user as verified
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "email_verified": True,
                "verification_token": None,
                "verification_token_expires": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    # Send welcome email
    await send_welcome_email(user["email"], user["name"])
    
    return {"message": "Email verified successfully"}

@api_router.post("/auth/resend-verification")
async def resend_verification(current_user: dict = Depends(get_required_user)):
    """Resend verification email"""
    if current_user.get("email_verified"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified"
        )
    
    # Generate new verification token
    verification_token = generate_verification_token()
    verification_expires = (datetime.now(timezone.utc) + timedelta(hours=EMAIL_VERIFY_EXPIRE_HOURS)).isoformat()
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "verification_token": verification_token,
                "verification_token_expires": verification_expires
            }
        }
    )
    
    await send_verification_email(current_user["email"], current_user["name"], verification_token)
    
    return {"message": "Verification email sent"}

@api_router.post("/auth/forgot-password")
async def forgot_password(data: PasswordReset):
    """Request password reset"""
    user = await db.users.find_one({"email": data.email.lower()})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If an account with that email exists, we've sent a password reset link"}
    
    # Generate reset token
    reset_token = generate_verification_token()
    reset_expires = (datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)).isoformat()
    
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "reset_token": reset_token,
                "reset_token_expires": reset_expires
            }
        }
    )
    
    await send_password_reset_email(user["email"], user["name"], reset_token)
    
    return {"message": "If an account with that email exists, we've sent a password reset link"}

@api_router.post("/auth/reset-password")
async def reset_password(data: PasswordResetConfirm):
    """Reset password with token"""
    user = await db.users.find_one({"reset_token": data.token})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Check if token is expired
    if user.get("reset_token_expires"):
        expires = datetime.fromisoformat(user["reset_token_expires"].replace('Z', '+00:00'))
        if datetime.now(timezone.utc) > expires:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired. Please request a new one."
            )
    
    # Validate new password
    is_valid, message = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Update password
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "password_hash": get_password_hash(data.new_password),
                "reset_token": None,
                "reset_token_expires": None,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Password reset successfully"}

@api_router.get("/auth/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_required_user)):
    """Get current user profile"""
    return UserProfile(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        avatar=current_user.get("avatar"),
        email_verified=current_user.get("email_verified", False),
        created_at=current_user["created_at"],
        last_login=current_user.get("last_login")
    )

@api_router.put("/auth/profile", response_model=UserProfile)
async def update_profile(data: UserUpdate, current_user: dict = Depends(get_required_user)):
    """Update user profile"""
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if data.name is not None:
        update_data["name"] = data.name
    if data.avatar is not None:
        update_data["avatar"] = data.avatar
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password_hash": 0})
    
    return UserProfile(
        id=updated_user["id"],
        email=updated_user["email"],
        name=updated_user["name"],
        avatar=updated_user.get("avatar"),
        email_verified=updated_user.get("email_verified", False),
        created_at=updated_user["created_at"],
        last_login=updated_user.get("last_login")
    )

@api_router.post("/auth/change-password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_required_user)):
    """Change user password"""
    # Verify current password
    user = await db.users.find_one({"id": current_user["id"]})
    if not verify_password(data.current_password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Validate new password
    is_valid, message = validate_password_strength(data.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message
        )
    
    # Update password
    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "password_hash": get_password_hash(data.new_password),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {"message": "Password changed successfully"}

# ===== GITHUB OAUTH ROUTES =====

class GitHubCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None

@api_router.get("/auth/github")
async def github_auth():
    """Initiate GitHub OAuth flow"""
    if not GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured"
        )
    
    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)
    
    # Store state temporarily (expires in 10 minutes)
    await db.oauth_states.insert_one({
        "state": state,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    })
    
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_REDIRECT_URI}"
        f"&scope=user:email"
        f"&state={state}"
    )
    
    return {"auth_url": github_auth_url, "state": state}

@api_router.post("/auth/github/callback", response_model=TokenResponse)
async def github_callback(data: GitHubCallbackRequest):
    """Handle GitHub OAuth callback"""
    import httpx
    
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GitHub OAuth is not configured"
        )
    
    # Verify state if provided
    if data.state:
        stored_state = await db.oauth_states.find_one({"state": data.state})
        if not stored_state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid state parameter"
            )
        # Clean up used state
        await db.oauth_states.delete_one({"state": data.state})
        
        # Check expiry
        if stored_state.get("expires_at"):
            expires = datetime.fromisoformat(stored_state["expires_at"].replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > expires:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="State has expired"
                )
    
    # Exchange code for access token
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": data.code,
                "redirect_uri": GITHUB_REDIRECT_URI
            },
            headers={"Accept": "application/json"}
        )
        
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange code for token"
            )
        
        token_data = token_response.json()
        
        if "error" in token_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=token_data.get("error_description", "GitHub authentication failed")
            )
        
        github_access_token = token_data.get("access_token")
        
        # Get user info from GitHub
        user_response = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {github_access_token}",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        
        if user_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from GitHub"
            )
        
        github_user = user_response.json()
        
        # Get primary email if not public
        email = github_user.get("email")
        if not email:
            emails_response = await client.get(
                "https://api.github.com/user/emails",
                headers={
                    "Authorization": f"Bearer {github_access_token}",
                    "Accept": "application/vnd.github.v3+json"
                }
            )
            if emails_response.status_code == 200:
                emails = emails_response.json()
                primary_email = next(
                    (e for e in emails if e.get("primary") and e.get("verified")),
                    None
                )
                if primary_email:
                    email = primary_email["email"]
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not retrieve email from GitHub. Please ensure your email is public or verified."
            )
    
    # Check if user exists with this GitHub ID
    existing_user = await db.users.find_one({"github_id": str(github_user["id"])})
    
    if existing_user:
        # User exists with GitHub - log them in
        await db.users.update_one(
            {"id": existing_user["id"]},
            {
                "$set": {
                    "last_login": datetime.now(timezone.utc).isoformat(),
                    "avatar": github_user.get("avatar_url") or existing_user.get("avatar")
                }
            }
        )
        user = existing_user
    else:
        # Check if user exists with this email
        existing_email_user = await db.users.find_one({"email": email.lower()})
        
        if existing_email_user:
            # Link GitHub to existing account
            await db.users.update_one(
                {"id": existing_email_user["id"]},
                {
                    "$set": {
                        "github_id": str(github_user["id"]),
                        "github_username": github_user.get("login"),
                        "avatar": github_user.get("avatar_url") or existing_email_user.get("avatar"),
                        "email_verified": True,  # GitHub emails are verified
                        "last_login": datetime.now(timezone.utc).isoformat()
                    }
                }
            )
            user = existing_email_user
            user["github_id"] = str(github_user["id"])
        else:
            # Create new user
            user_id = str(uuid.uuid4())
            new_user = {
                "id": user_id,
                "email": email.lower(),
                "name": github_user.get("name") or github_user.get("login"),
                "password_hash": None,  # No password for OAuth users
                "avatar": github_user.get("avatar_url"),
                "github_id": str(github_user["id"]),
                "github_username": github_user.get("login"),
                "email_verified": True,  # GitHub emails are verified
                "is_active": True,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "last_login": datetime.now(timezone.utc).isoformat()
            }
            await db.users.insert_one(new_user)
            user = new_user
            
            # Send welcome email
            try:
                await send_welcome_email(email, new_user["name"])
            except Exception as e:
                logger.error(f"Failed to send welcome email: {e}")
    
    # Generate JWT token
    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"]},
        expires_delta=timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    )
    
    return TokenResponse(
        access_token=access_token,
        user=UserProfile(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            avatar=user.get("avatar"),
            email_verified=user.get("email_verified", True),
            created_at=user["created_at"],
            last_login=datetime.now(timezone.utc).isoformat()
        )
    )

@api_router.get("/auth/github/config")
async def github_config():
    """Get GitHub OAuth configuration for frontend"""
    return {
        "enabled": bool(GITHUB_CLIENT_ID),
        "client_id": GITHUB_CLIENT_ID if GITHUB_CLIENT_ID else None
    }

# ===== USER DASHBOARD ROUTES =====

@api_router.get("/user/purchases")
async def get_user_purchases(current_user: dict = Depends(get_required_user)):
    """Get all purchases for current user"""
    orders = await db.user_orders.find(
        {"user_id": current_user["id"], "status": "paid"},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get product details for each purchase
    purchases = []
    for order in orders:
        for item in order.get("items", []):
            product = await db.products.find_one({"id": item.get("product_id")}, {"_id": 0})
            if product:
                # Get download info
                download = await db.downloads.find_one({
                    "user_id": current_user["id"],
                    "product_id": item.get("product_id"),
                    "order_id": order["id"]
                }, {"_id": 0})
                
                purchases.append({
                    "order_id": order["id"],
                    "product": product,
                    "purchase_date": order["created_at"],
                    "price_paid": item.get("price", product.get("price")),
                    "license_type": item.get("license_type", product.get("license_type", "Standard")),
                    "download_count": download.get("download_count", 0) if download else 0,
                    "last_downloaded": download.get("last_downloaded") if download else None
                })
    
    return purchases

@api_router.get("/user/orders")
async def get_user_orders(current_user: dict = Depends(get_required_user)):
    """Get all orders for current user"""
    orders = await db.user_orders.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    return orders

@api_router.get("/user/orders/{order_id}")
async def get_user_order(order_id: str, current_user: dict = Depends(get_required_user)):
    """Get specific order details"""
    order = await db.user_orders.find_one(
        {"id": order_id, "user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    return order

@api_router.get("/user/downloads")
async def get_user_downloads(current_user: dict = Depends(get_required_user)):
    """Get download history for current user"""
    downloads = await db.downloads.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("last_downloaded", -1).to_list(100)
    
    # Enrich with product details
    enriched_downloads = []
    for download in downloads:
        product = await db.products.find_one({"id": download["product_id"]}, {"_id": 0})
        if product:
            enriched_downloads.append({
                **download,
                "product": product
            })
    
    return enriched_downloads

@api_router.post("/user/download/{product_id}")
async def download_product(product_id: str, current_user: dict = Depends(get_required_user)):
    """Generate download link for a purchased product"""
    # Check if user has purchased this product
    purchase = await db.user_orders.find_one({
        "user_id": current_user["id"],
        "status": "paid",
        "items.product_id": product_id
    })
    
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You haven't purchased this product"
        )
    
    # Get product details
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Update or create download record
    existing_download = await db.downloads.find_one({
        "user_id": current_user["id"],
        "product_id": product_id,
        "order_id": purchase["id"]
    })
    
    if existing_download:
        await db.downloads.update_one(
            {"id": existing_download["id"]},
            {
                "$inc": {"download_count": 1},
                "$set": {"last_downloaded": datetime.now(timezone.utc).isoformat()}
            }
        )
    else:
        download = Download(
            user_id=current_user["id"],
            product_id=product_id,
            order_id=purchase["id"]
        )
        await db.downloads.insert_one(download.model_dump())
    
    # Increment product downloads
    await db.products.update_one(
        {"id": product_id},
        {"$inc": {"downloads": 1}}
    )
    
    # Generate time-limited download token (valid for 1 hour)
    download_token = create_access_token(
        data={"product_id": product_id, "user_id": current_user["id"]},
        expires_delta=timedelta(hours=1)
    )
    
    return {
        "message": "Download authorized",
        "download_token": download_token,
        "product_name": product["name"],
        "expires_in": 3600  # 1 hour in seconds
    }

@api_router.get("/user/stats")
async def get_user_stats(current_user: dict = Depends(get_required_user)):
    """Get user dashboard statistics"""
    # Count total purchases
    total_purchases = await db.user_orders.count_documents({
        "user_id": current_user["id"],
        "status": "paid"
    })
    
    # Count total downloads
    downloads = await db.downloads.find(
        {"user_id": current_user["id"]}
    ).to_list(1000)
    total_downloads = sum(d.get("download_count", 0) for d in downloads)
    
    # Calculate total spent
    orders = await db.user_orders.find(
        {"user_id": current_user["id"], "status": "paid"},
        {"total_amount": 1}
    ).to_list(1000)
    total_spent = sum(o.get("total_amount", 0) for o in orders)
    
    return {
        "total_purchases": total_purchases,
        "total_downloads": total_downloads,
        "total_spent": total_spent,
        "member_since": current_user["created_at"]
    }

# ===== MODIFIED ORDER ROUTES FOR AUTHENTICATED USERS =====

@api_router.post("/orders/create-authenticated")
async def create_authenticated_order(order_data: OrderCreate, current_user: dict = Depends(get_required_user)):
    """Create order for authenticated user"""
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
            "item_total": item_total,
            "license_type": product.get("license_type", "Standard"),
            "image": product.get("image")
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
    
    # Generate invoice number
    invoice_count = await db.user_orders.count_documents({})
    invoice_number = f"INV-{datetime.now().strftime('%Y%m')}-{str(invoice_count + 1).zfill(5)}"
    
    # Create order in database
    user_order = UserOrder(
        user_id=current_user["id"],
        items=items_with_details,
        total_amount=total,
        razorpay_order_id=razorpay_order["id"] if razorpay_order else None,
        invoice_number=invoice_number
    )
    
    await db.user_orders.insert_one(user_order.model_dump())
    
    # Also create in regular orders collection for backward compatibility
    order = Order(
        id=user_order.id,
        items=items_with_details,
        total_amount=total,
        customer_email=current_user["email"],
        customer_name=current_user["name"],
        razorpay_order_id=razorpay_order["id"] if razorpay_order else None
    )
    await db.orders.insert_one(order.model_dump())
    
    return {
        "order_id": user_order.id,
        "razorpay_order_id": razorpay_order["id"] if razorpay_order else None,
        "amount": int(total * 100),
        "currency": "INR",
        "key_id": razorpay_key_id,
        "invoice_number": invoice_number
    }

@api_router.post("/orders/verify-authenticated")
async def verify_authenticated_payment(request: Request, current_user: dict = Depends(get_required_user)):
    """Verify payment for authenticated user"""
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
    
    # Update user order status
    result = await db.user_orders.update_one(
        {"razorpay_order_id": razorpay_order_id, "user_id": current_user["id"]},
        {"$set": {"status": "paid", "razorpay_payment_id": razorpay_payment_id}}
    )
    
    # Also update regular orders collection
    await db.orders.update_one(
        {"razorpay_order_id": razorpay_order_id},
        {"$set": {"status": "paid", "razorpay_payment_id": razorpay_payment_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Fetch order details
    order = await db.user_orders.find_one({"razorpay_order_id": razorpay_order_id}, {"_id": 0})
    
    # Send confirmation email
    if resend_api_key and order:
        try:
            items_html = "".join([
                f"<li>{item['name']} - ₹{item['item_total']}</li>"
                for item in order["items"]
            ])
            await asyncio.to_thread(resend.Emails.send, {
                "from": os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev'),
                "to": [current_user["email"]],
                "subject": f"Order Confirmation #{order.get('invoice_number', order['id'])} - Devmora Web Solutions",
                "html": f"""
                <div style="font-family: 'Satoshi', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #1e3a5f;">Order Confirmed! 🎉</h1>
                    </div>
                    <p>Hi {current_user['name']},</p>
                    <p>Thank you for your purchase! Your order has been confirmed.</p>
                    <h3>Order Details:</h3>
                    <p><strong>Order #:</strong> {order.get('invoice_number', order['id'])}</p>
                    <ul>{items_html}</ul>
                    <p><strong>Total: ₹{order['total_amount']}</strong></p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{FRONTEND_URL}/dashboard" style="background-color: #1e3a5f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; font-weight: 600;">
                            Download Your Products
                        </a>
                    </div>
                    <p>You can download your purchased products anytime from your dashboard.</p>
                    <p>Thank you for choosing Devmora Web Solutions!</p>
                </div>
                """
            })
        except Exception as e:
            logger.error(f"Email sending failed: {e}")
    
    return {"status": "success", "order_id": order["id"] if order else None}

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

# CORS configuration - handle dev tunnels and production URLs
cors_origins_env = os.environ.get('CORS_ORIGINS', '')
if cors_origins_env:
    cors_origins = [origin.strip() for origin in cors_origins_env.split(',') if origin.strip()]
else:
    cors_origins = []

# Allow all origins in development (for dev tunnels compatibility)
# In production, set CORS_ORIGINS explicitly
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=cors_origins if cors_origins else ["*"],
    allow_origin_regex=r"https://.*\.devtunnels\.ms|https://.*\.ngrok\.io|https://.*\.ngrok-free\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
