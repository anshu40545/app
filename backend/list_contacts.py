import requests

response = requests.get('http://localhost:8000/api/contacts')
contacts = response.json()

print(f"Total contacts in database: {len(contacts)}\n")
for c in contacts:
    print(f"  📧 {c['name']} ({c['email']})")
    print(f"     Service: {c['service_type']} | Scope: {c['project_scope']}")
    print(f"     Message: {c['message'][:50]}...")
    print(f"     Status: {c['status']} | Created: {c['created_at'][:10]}")
    print()
