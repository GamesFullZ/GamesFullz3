#!/usr/bin/env python3
"""
GameStack Backend API Testing Suite
Tests all backend endpoints for the GameStack application
"""

import requests
import json
import time
from datetime import datetime, timezone
import uuid

# Configuration
BASE_URL = "https://gamestack-6.preview.emergentagent.com/api"
TEST_USER_EMAIL = "testuser@gamestack.com"
TEST_USER_NAME = "Test User GameStack"
TEST_GAME_IDS = ["1", "2", "3"]  # Valid game IDs from data.js

class GameStackTester:
    def __init__(self):
        self.session = requests.Session()
        self.session_token = None
        self.user_data = None
        self.test_results = {
            "health_check": {"passed": False, "details": ""},
            "auth_session": {"passed": False, "details": ""},
            "auth_process_session": {"passed": False, "details": ""},
            "auth_logout": {"passed": False, "details": ""},
            "favorites_get": {"passed": False, "details": ""},
            "favorites_add": {"passed": False, "details": ""},
            "favorites_remove": {"passed": False, "details": ""},
            "ratings_create": {"passed": False, "details": ""},
            "ratings_get": {"passed": False, "details": ""}
        }

    def log_test(self, test_name, passed, details):
        """Log test results"""
        self.test_results[test_name]["passed"] = passed
        self.test_results[test_name]["details"] = details
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} {test_name}: {details}")

    def test_health_endpoints(self):
        """Test basic health check endpoints"""
        print("\n=== Testing Health Check Endpoints ===")
        
        # Test root endpoint
        try:
            response = self.session.get(f"{BASE_URL}/")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "GameStack" in data["message"]:
                    self.log_test("health_check", True, f"Root endpoint working: {data['message']}")
                else:
                    self.log_test("health_check", False, f"Unexpected root response: {data}")
            else:
                self.log_test("health_check", False, f"Root endpoint failed: {response.status_code}")
        except Exception as e:
            self.log_test("health_check", False, f"Root endpoint error: {str(e)}")

        # Test health endpoint
        try:
            response = self.session.get(f"{BASE_URL}/health")
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    print(f"✅ Health endpoint working: {data}")
                else:
                    print(f"⚠️  Health endpoint unexpected response: {data}")
            else:
                print(f"❌ Health endpoint failed: {response.status_code}")
        except Exception as e:
            print(f"❌ Health endpoint error: {str(e)}")

    def test_auth_without_session(self):
        """Test authentication endpoints without valid session"""
        print("\n=== Testing Authentication (No Session) ===")
        
        # Test GET /auth/session without authentication
        try:
            response = self.session.get(f"{BASE_URL}/auth/session")
            if response.status_code == 401:
                self.log_test("auth_session", True, "Correctly returns 401 for unauthenticated request")
            else:
                self.log_test("auth_session", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_test("auth_session", False, f"Auth session test error: {str(e)}")

    def test_auth_process_session(self):
        """Test session processing - this will fail without valid Emergent session_id"""
        print("\n=== Testing Session Processing ===")
        
        # Test with invalid session_id
        try:
            fake_session_id = str(uuid.uuid4())
            response = self.session.post(f"{BASE_URL}/auth/process-session", 
                                       params={"session_id": fake_session_id})
            
            if response.status_code == 400:
                self.log_test("auth_process_session", True, 
                            "Correctly rejects invalid session_id with 400 error")
            else:
                self.log_test("auth_process_session", False, 
                            f"Expected 400 for invalid session_id, got {response.status_code}")
        except Exception as e:
            self.log_test("auth_process_session", False, f"Process session error: {str(e)}")

    def test_favorites_without_auth(self):
        """Test favorites endpoints without authentication"""
        print("\n=== Testing Favorites (No Auth) ===")
        
        # Test GET favorites without auth
        try:
            response = self.session.get(f"{BASE_URL}/favorites")
            if response.status_code == 401:
                self.log_test("favorites_get", True, "Correctly requires authentication for favorites")
            else:
                self.log_test("favorites_get", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_test("favorites_get", False, f"Favorites get error: {str(e)}")

        # Test POST favorites without auth
        try:
            response = self.session.post(f"{BASE_URL}/favorites/1")
            if response.status_code == 401:
                self.log_test("favorites_add", True, "Correctly requires authentication for adding favorites")
            else:
                self.log_test("favorites_add", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_test("favorites_add", False, f"Favorites add error: {str(e)}")

        # Test DELETE favorites without auth
        try:
            response = self.session.delete(f"{BASE_URL}/favorites/1")
            if response.status_code == 401:
                self.log_test("favorites_remove", True, "Correctly requires authentication for removing favorites")
            else:
                self.log_test("favorites_remove", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_test("favorites_remove", False, f"Favorites remove error: {str(e)}")

    def test_ratings_without_auth(self):
        """Test ratings endpoints without authentication"""
        print("\n=== Testing Ratings ===")
        
        # Test POST ratings without auth
        try:
            rating_data = {"game_id": "1", "rating": 4.5, "review": "Great game!"}
            response = self.session.post(f"{BASE_URL}/ratings", json=rating_data)
            if response.status_code == 401:
                self.log_test("ratings_create", True, "Correctly requires authentication for creating ratings")
            else:
                self.log_test("ratings_create", False, f"Expected 401, got {response.status_code}")
        except Exception as e:
            self.log_test("ratings_create", False, f"Ratings create error: {str(e)}")

        # Test GET ratings (should work without auth)
        try:
            response = self.session.get(f"{BASE_URL}/ratings/1")
            if response.status_code == 200:
                data = response.json()
                if "average_rating" in data and "total_ratings" in data:
                    self.log_test("ratings_get", True, f"Ratings endpoint working: {data}")
                else:
                    self.log_test("ratings_get", False, f"Unexpected ratings response: {data}")
            else:
                self.log_test("ratings_get", False, f"Ratings get failed: {response.status_code}")
        except Exception as e:
            self.log_test("ratings_get", False, f"Ratings get error: {str(e)}")

    def test_logout(self):
        """Test logout endpoint"""
        print("\n=== Testing Logout ===")
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/logout")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "Logged out" in data["message"]:
                    self.log_test("auth_logout", True, f"Logout working: {data['message']}")
                else:
                    self.log_test("auth_logout", False, f"Unexpected logout response: {data}")
            else:
                self.log_test("auth_logout", False, f"Logout failed: {response.status_code}")
        except Exception as e:
            self.log_test("auth_logout", False, f"Logout error: {str(e)}")

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting GameStack Backend API Tests")
        print(f"📍 Testing against: {BASE_URL}")
        print("=" * 60)

        # Run tests in logical order
        self.test_health_endpoints()
        self.test_auth_without_session()
        self.test_auth_process_session()
        self.test_favorites_without_auth()
        self.test_ratings_without_auth()
        self.test_logout()

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed_tests = 0
        total_tests = len(self.test_results)
        
        for test_name, result in self.test_results.items():
            status = "✅ PASS" if result["passed"] else "❌ FAIL"
            print(f"{status} {test_name.replace('_', ' ').title()}")
            if result["passed"]:
                passed_tests += 1
        
        print(f"\n📈 Overall: {passed_tests}/{total_tests} tests passed")
        
        if passed_tests == total_tests:
            print("🎉 All tests passed!")
        else:
            print("⚠️  Some tests failed - check details above")
            
        # Critical issues summary
        critical_issues = []
        if not self.test_results["health_check"]["passed"]:
            critical_issues.append("Health check endpoints not working")
        if not self.test_results["auth_session"]["passed"]:
            critical_issues.append("Authentication session endpoint issues")
        if not self.test_results["ratings_get"]["passed"]:
            critical_issues.append("Ratings retrieval not working")
            
        if critical_issues:
            print("\n🚨 CRITICAL ISSUES:")
            for issue in critical_issues:
                print(f"   • {issue}")

if __name__ == "__main__":
    tester = GameStackTester()
    tester.run_all_tests()