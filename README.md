# Devmora Web Solutions

A modern e-commerce and portfolio platform for digital products and services.

## 🚀 Features

- **Digital Marketplace** - Browse and purchase website templates, mobile app UI kits, logo packages, and design assets
- **Portfolio Showcase** - View completed projects across web development, mobile apps, branding, and UI/UX design
- **Custom Services** - Request quotes for custom software development, website design, and branding solutions
- **Contact Form** - Integrated contact system with database storage

## 🛠️ Tech Stack

### Frontend
- React 19
- Tailwind CSS
- shadcn/ui Components
- React Router v7
- Axios

### Backend
- FastAPI (Python)
- MongoDB Atlas (Cloud Database)
- Motor (Async MongoDB Driver)

## 📦 Installation

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB Atlas account (or local MongoDB)

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Configure .env with your MongoDB connection
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

## 🔗 URLs

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api

## 📄 License

MIT License
