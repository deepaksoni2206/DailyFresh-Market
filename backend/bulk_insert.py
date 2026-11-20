import requests

# Apni API ka actual URL yahan daalein (jahan aapki CategoryView map hai)
API_URL = "http://127.0.0.1:8000/api/category/" 

# Jo categories aapko add karni hain unki list
categories_list = [
    {
        "name": "Dairy & Eggs",
        "description": "Fresh milk, paneer, butter, cheese, and farm-fresh eggs.",
        "is_active": True
    },
    {
        "name": "Fresh Fruits",
        "description": "Juicy, seasonal, and farm-fresh fruits handpicked for you.",
        "is_active": True
    },
    {
        "name": "Beverages",
        "description": "Refreshing teas, coffees, juices, and cold drinks.",
        "is_active": True
    },
    {
        "name": "Munchies",
        "description": "Crunchy snacks, chips, namkeen, and quick bites.",
        "is_active": True
    }
]

# Loop chala kar ek-ek karke saari categories API par bhej rahe hain
for item in categories_list:
    response = requests.post(API_URL, json=item)
    
    if response.status_code == 201:
        print(f"✅ Created Successfully: {item['name']}")
    else:
        print(f"❌ Failed for {item['name']} | Error: {response.json()}")