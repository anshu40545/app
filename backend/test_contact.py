import requests
import json

url = "http://localhost:8000/api/contact"
data = {
    "name": "Test User",
    "email": "test@test.com",
    "phone": "+91 9876543210",
    "company": "Test Company",
    "service_type": "general",
    "project_scope": "small",
    "message": "Testing the contact form submission"
}

try:
    response = requests.post(url, json=data, timeout=30)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
