import asyncio
import dns.resolver
from motor.motor_asyncio import AsyncIOMotorClient

# Fix DNS for MongoDB Atlas on Windows
dns.resolver.default_resolver = dns.resolver.Resolver(configure=False)
dns.resolver.default_resolver.nameservers = ['8.8.8.8', '8.8.4.4']

async def test_connection():
    try:
        client = AsyncIOMotorClient(
            'mongodb+srv://anilveersinghstudycode_db_user:S6Yfa14hjJ1JlNO7@web1.oxf4mkz.mongodb.net/?retryWrites=true&w=majority',
            serverSelectionTimeoutMS=10000
        )
        db = client['devmora_db']
        
        # Test insert
        test_doc = {
            'name': 'Test Contact',
            'email': 'test@test.com',
            'message': 'Test message'
        }
        result = await db.contacts.insert_one(test_doc)
        print(f"✅ Insert successful! ID: {result.inserted_id}")
        
        # Verify
        found = await db.contacts.find_one({'_id': result.inserted_id})
        print(f"✅ Found document: {found}")
        
        # Cleanup
        await db.contacts.delete_one({'_id': result.inserted_id})
        print("✅ Cleanup successful!")
        
        print("\n🎉 MongoDB Atlas connection is working properly!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        client.close()

if __name__ == "__main__":
    asyncio.run(test_connection())
