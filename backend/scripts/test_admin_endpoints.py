#!/usr/bin/env python3
"""
Test script for admin embedding endpoints.
Tests the API endpoints directly using HTTP requests.
"""

import os
import sys
import requests
import time
import json
from typing import Dict, Any

# Configuration
BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
API_KEY = os.getenv("TEST_API_KEY", "test-key")  # You'll need to set this


class AdminEndpointTester:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-User-Id": "test-user"  # Required by your endpoints
        }
        self.results = {"passed": 0, "failed": 0, "errors": []}
    
    def log(self, message: str, level: str = "INFO"):
        """Log test messages with timestamp."""
        from datetime import datetime
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
    
    def assert_test(self, condition: bool, test_name: str, error_msg: str = None):
        """Assert a test condition and log results."""
        if condition:
            self.results["passed"] += 1
            self.log(f"✅ {test_name}", "PASS")
            return True
        else:
            self.results["failed"] += 1
            error = error_msg or f"Test failed: {test_name}"
            self.results["errors"].append(error)
            self.log(f"❌ {test_name}: {error}", "FAIL")
            return False
    
    def make_request(self, method: str, endpoint: str, **kwargs) -> Dict[str, Any]:
        """Make HTTP request to API endpoint."""
        url = f"{self.base_url}{endpoint}"
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self.headers,
                timeout=30,
                **kwargs
            )
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.content else {},
                "success": 200 <= response.status_code < 300
            }
            
        except requests.exceptions.RequestException as e:
            return {
                "status_code": 0,
                "data": {"error": str(e)},
                "success": False
            }
        except json.JSONDecodeError:
            return {
                "status_code": response.status_code,
                "data": {"error": "Invalid JSON response"},
                "success": False
            }
    
    def test_1_embedding_status_endpoint(self):
        """Test GET /admin/embeddings/status endpoint."""
        self.log("Testing embedding status endpoint...")
        
        result = self.make_request("GET", "/admin/embeddings/status")
        
        if not result["success"]:
            return self.assert_test(False, "Embedding status endpoint", 
                                  f"HTTP {result['status_code']}: {result['data']}")
        
        data = result["data"]
        required_fields = ["embedding_stats", "sync_hook", "queue_stats", "configuration"]
        
        has_required_fields = all(field in data for field in required_fields)
        
        return self.assert_test(has_required_fields, "Embedding status endpoint",
                              f"Missing required fields. Got: {list(data.keys())}")
    
    def test_2_sync_pending_endpoint(self):
        """Test POST /admin/embeddings/sync-pending endpoint."""
        self.log("Testing sync pending endpoint...")
        
        result = self.make_request("POST", "/admin/embeddings/sync-pending")
        
        if not result["success"]:
            return self.assert_test(False, "Sync pending endpoint",
                                  f"HTTP {result['status_code']}: {result['data']}")
        
        data = result["data"]
        has_message = "message" in data
        
        return self.assert_test(has_message, "Sync pending endpoint",
                              f"Response missing 'message' field. Got: {data}")
    
    def test_3_missing_embeddings_endpoint(self):
        """Test POST /admin/embeddings/missing endpoint."""
        self.log("Testing missing embeddings endpoint...")
        
        params = {"limit": 10}
        result = self.make_request("POST", "/admin/embeddings/missing", params=params)
        
        if not result["success"]:
            return self.assert_test(False, "Missing embeddings endpoint",
                                  f"HTTP {result['status_code']}: {result['data']}")
        
        data = result["data"]
        required_fields = ["message", "processed", "updated", "skipped", "errors"]
        
        has_required_fields = all(field in data for field in required_fields)
        
        return self.assert_test(has_required_fields, "Missing embeddings endpoint",
                              f"Missing required fields. Got: {list(data.keys())}")
    
    def test_4_campaign_embeddings_endpoint(self):
        """Test POST /admin/embeddings/campaign/{campaign_id} endpoint."""
        self.log("Testing campaign embeddings endpoint...")
        
        test_campaign_id = "test-campaign"
        params = {"force": False}
        
        result = self.make_request(
            "POST", 
            f"/admin/embeddings/campaign/{test_campaign_id}",
            params=params
        )
        
        if not result["success"]:
            return self.assert_test(False, "Campaign embeddings endpoint",
                                  f"HTTP {result['status_code']}: {result['data']}")
        
        data = result["data"]
        required_fields = ["message", "task_id", "force"]
        
        has_required_fields = all(field in data for field in required_fields)
        
        return self.assert_test(has_required_fields, "Campaign embeddings endpoint",
                              f"Missing required fields. Got: {list(data.keys())}")
    
    def test_5_error_handling(self):
        """Test error handling for invalid requests."""
        self.log("Testing error handling...")
        
        # Test invalid campaign ID
        result = self.make_request("POST", "/admin/embeddings/campaign/")
        
        # Should return 404 Not Found or similar error
        is_error = not result["success"]
        
        return self.assert_test(is_error, "Error handling",
                              f"Should return error for invalid request. Got: {result}")
    
    def run_all_tests(self):
        """Run all API endpoint tests."""
        self.log("=" * 60)
        self.log("STARTING ADMIN ENDPOINTS INTEGRATION TESTS")
        self.log(f"Testing against: {self.base_url}")
        self.log("=" * 60)
        
        # Check if server is running
        health_result = self.make_request("GET", "/")
        if not health_result["success"] and health_result["status_code"] != 404:
            self.log(f"⚠️  Server may not be running at {self.base_url}", "WARNING")
            self.log("Make sure your API server is running before running these tests", "WARNING")
        
        # Run tests
        tests = [
            self.test_1_embedding_status_endpoint,
            self.test_2_sync_pending_endpoint,
            self.test_3_missing_embeddings_endpoint,
            self.test_4_campaign_embeddings_endpoint,
            self.test_5_error_handling,
        ]
        
        for test_func in tests:
            try:
                test_func()
                time.sleep(0.5)  # Brief pause between tests
            except Exception as e:
                self.assert_test(False, test_func.__name__, f"Test threw exception: {e}")
        
        # Results
        self.log("=" * 60)
        self.log("API TESTS RESULTS SUMMARY")
        self.log("=" * 60)
        self.log(f"✅ Passed: {self.results['passed']}")
        self.log(f"❌ Failed: {self.results['failed']}")
        
        if self.results["errors"]:
            self.log("ERRORS:")
            for error in self.results["errors"]:
                self.log(f"  - {error}")
        
        total_tests = self.results['passed'] + self.results['failed']
        success_rate = (self.results['passed'] / total_tests * 100) if total_tests > 0 else 0
        
        self.log(f"Success Rate: {success_rate:.1f}%")
        
        if self.results['failed'] == 0:
            self.log("🎉 ALL API TESTS PASSED!", "SUCCESS")
            return True
        else:
            self.log("⚠️  Some API tests failed. Check server logs.", "WARNING")
            return False


def main():
    """Main test runner."""
    if len(sys.argv) > 1:
        base_url = sys.argv[1]
    else:
        base_url = BASE_URL
    
    if len(sys.argv) > 2:
        api_key = sys.argv[2]
    else:
        api_key = API_KEY
    
    print(f"Testing API at: {base_url}")
    print(f"Using API key: {api_key[:10]}..." if api_key else "No API key provided")
    print()
    
    tester = AdminEndpointTester(base_url, api_key)
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()