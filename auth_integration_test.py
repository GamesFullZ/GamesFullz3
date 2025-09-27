#!/usr/bin/env python3
"""
Test Emergent Authentication Integration
"""

import requests
import json

BASE_URL = "https://gamestack-6.preview.emergentagent.com/api"

def test_emergent_auth_integration():
    """Test the Emergent authentication integration"""
    print("🔐 Testing Emergent Authentication Integration")
    print("=" * 50)
    
    # Test with invalid session_id
    print("\n1. Testing with invalid session_id...")
    response = requests.post(f"{BASE_URL}/auth/process-session", 
                           params={"session_id": "invalid_session_123"})
    
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 400:
        print("✅ Correctly handles invalid session_id")
    else:
        print("❌ Unexpected response for invalid session_id")
    
    # Test direct call to Emergent service
    print("\n2. Testing direct Emergent service call...")
    emergent_response = requests.get(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        headers={"X-Session-ID": "test123"}
    )
    
    print(f"Emergent Status: {emergent_response.status_code}")
    print(f"Emergent Response: {emergent_response.text}")
    
    if emergent_response.status_code == 404:
        print("✅ Emergent service properly rejects invalid session")
    else:
        print("❌ Unexpected Emergent service response")

if __name__ == "__main__":
    test_emergent_auth_integration()