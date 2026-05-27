import urllib.request
import json

def test_api():
    login_url = "http://localhost:8000/api/v1/auth/login"
    login_data = json.dumps({"email": "admin@nawa.com", "password": "Admin123!"}).encode()
    req = urllib.request.Request(login_url, data=login_data, headers={"Content-Type": "application/json"})
    
    try:
        res = urllib.request.urlopen(req)
        response_data = json.loads(res.read())
        token = response_data.get("access_token")
        print("Logged in successfully. Token:", token[:10], "...")
        
        # Test stats
        stats_url = "http://localhost:8000/api/v1/questions/stats"
        stats_req = urllib.request.Request(stats_url, headers={"Authorization": f"Bearer {token}"})
        stats_res = urllib.request.urlopen(stats_req)
        print("Stats:", stats_res.read().decode())

        # Test users
        users_url = "http://localhost:8000/api/v1/users"
        users_req = urllib.request.Request(users_url, headers={"Authorization": f"Bearer {token}"})
        users_res = urllib.request.urlopen(users_req)
        print("Users:", users_res.read().decode())

    except Exception as e:
        print("Error:", e)
        if hasattr(e, 'read'):
            print("Response:", e.read().decode())

test_api()
