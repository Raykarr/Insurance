#!/usr/bin/env python3
"""
Test script to verify FastAPI app deployment readiness
Run this before deploying to Vercel
"""

import requests
import json
import sys
from pathlib import Path

def test_health_endpoint():
    """Test the health endpoint"""
    try:
        # Test locally first
        response = requests.get("http://localhost:8000/health", timeout=5)
        if response.status_code == 200:
            print("✅ Health endpoint working locally")
            return True
    except requests.exceptions.ConnectionError:
        print("⚠️  Local server not running, skipping local test")
    
    return False

def test_file_size_validation():
    """Test file size validation logic"""
    try:
        # Import the app to test the validation logic
        import sys
        sys.path.append('frontend/api')
        
        from app import app
        from fastapi.testclient import TestClient
        
        client = TestClient(app)
        
        # Test with a small file (should pass)
        test_file_content = b"test" * 1000  # 4KB file
        
        response = client.post(
            "/ingest",
            files={"file": ("test.pdf", test_file_content, "application/pdf")}
        )
        
        if response.status_code == 200:
            print("✅ File size validation working (small file)")
        else:
            print(f"❌ File size validation failed: {response.status_code}")
            return False
            
        # Test with a large file (should fail)
        large_file_content = b"test" * (5 * 1024 * 1024)  # 5MB file
        
        response = client.post(
            "/ingest",
            files={"file": ("large.pdf", large_file_content, "application/pdf")}
        )
        
        if response.status_code == 413:
            print("✅ File size validation working (large file rejected)")
        else:
            print(f"❌ File size validation failed for large file: {response.status_code}")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ File size validation test failed: {e}")
        return False

def test_environment_variables():
    """Test environment variable loading"""
    try:
        import os
        from dotenv import load_dotenv
        
        # Load environment variables
        load_dotenv()
        
        required_vars = [
            "GROQ_API_KEY",
            "PINECONE_API_KEY", 
            "SUPABASE_URL",
            "SUPABASE_KEY",
            "HF_API_KEY"
        ]
        
        missing_vars = []
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            print(f"⚠️  Missing environment variables: {missing_vars}")
            print("   These should be set in Vercel dashboard")
        else:
            print("✅ All environment variables found")
            
        return True
        
    except Exception as e:
        print(f"❌ Environment variable test failed: {e}")
        return False

def test_requirements():
    """Test that all required packages can be imported"""
    try:
        required_packages = [
            "fastapi",
            "uvicorn",
            "fitz",  # PyMuPDF
            "groq",
            "requests",
            "pinecone",
            "supabase",
            "python-dotenv",
            "loguru",
            "tiktoken",
            "pydantic",
        ]
        
        for package in required_packages:
            __import__(package)
            print(f"✅ {package} imported successfully")
            
        return True
        
    except ImportError as e:
        print(f"❌ Package import failed: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing FastAPI app deployment readiness...\n")
    
    tests = [
        ("Environment Variables", test_environment_variables),
        ("Package Imports", test_requirements),
        ("File Size Validation", test_file_size_validation),
        ("Health Endpoint", test_health_endpoint),
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"Testing: {test_name}")
        try:
            if test_func():
                passed += 1
                print(f"✅ {test_name} passed\n")
            else:
                print(f"❌ {test_name} failed\n")
        except Exception as e:
            print(f"❌ {test_name} failed with error: {e}\n")
    
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Ready for Vercel deployment.")
        return 0
    else:
        print("⚠️  Some tests failed. Please fix issues before deploying.")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 