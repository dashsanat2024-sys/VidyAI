import requests
import json

try:
    res = requests.post('http://localhost:5000/api/auth/signup', json={
        "name": "Test Python",
        "email": "testpy@test.com",
        "password": "password",
        "role": "teacher"
    })
    print("STATUS:", res.status_code)
    print("RESPONSE:", res.json())
except Exception as e:
    print(e)
