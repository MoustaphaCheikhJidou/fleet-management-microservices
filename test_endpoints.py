#!/usr/bin/env python3
import requests
import json
import sys
import time

BASE_URL_IAM = "http://localhost:8090"
BASE_URL_GATEWAY = "http://localhost:8080"

def test_health():
    """Test health endpoint"""
    try:
        resp = requests.get(f"{BASE_URL_IAM}/actuator/health", timeout=5)
        print("Health Check Response:")
        print(json.dumps(resp.json(), indent=2))
        return resp.status_code == 200
    except Exception as e:
        print(f"Health check failed: {e}")
        return False

def test_signup(email, password, roles):
    """Test sign-up endpoint on IAM service"""
    url = f"{BASE_URL_IAM}/api/v1/authentication/sign-up"
    payload = {
        "email": email,
        "password": password,
        "roles": roles
    }
    try:
        resp = requests.post(url, json=payload, timeout=5)
        print(f"Sign-Up Response (IAM 8090):")
        print(f"Status: {resp.status_code}")
        print(f"Headers: {dict(resp.headers)}")
        print(f"Body: {resp.text}")
        return resp.status_code in [201, 200]
    except Exception as e:
        print(f"Sign-up failed: {e}")
        return False

def test_signin_iam(email, password):
    """Test sign-in endpoint on IAM service"""
    url = f"{BASE_URL_IAM}/api/v1/authentication/sign-in"
    payload = {
        "email": email,
        "password": password
    }
    try:
        resp = requests.post(url, json=payload, timeout=5)
        print(f"Sign-In Response (IAM 8090):")
        print(f"Status: {resp.status_code}")
        print(f"Headers: {dict(resp.headers)}")
        print(f"Body: {resp.text}")
        return resp.status_code in [200, 201]
    except Exception as e:
        print(f"Sign-in failed: {e}")
        return False

def test_signin_gateway(email, password):
    """Test sign-in endpoint via Gateway"""
    url = f"{BASE_URL_GATEWAY}/api/v1/authentication/sign-in"
    payload = {
        "email": email,
        "password": password
    }
    try:
        resp = requests.post(url, json=payload, timeout=5)
        print(f"Sign-In Response (Gateway 8080):")
        print(f"Status: {resp.status_code}")
        print(f"Headers: {dict(resp.headers)}")
        print(f"Body: {resp.text}")
        return resp.status_code in [200, 201]
    except Exception as e:
        print(f"Gateway sign-in failed: {e}")
        return False

if __name__ == "__main__":
    print("="*60)
    print("FLEET MANAGEMENT - API TEST SCRIPT")
    print("="*60)
    
    print("\n1. Testing Health Endpoint...")
    health_ok = test_health()
    
    print("\n2. Testing Sign-Up on IAM (8090)...")
    signup_ok = test_signup("testuser@example.com", "TestPassword123", ["ROLE_ADMIN"])
    
    print("\n3. Testing Sign-In on IAM (8090)...")
    signin_iam_ok = test_signin_iam("testuser@example.com", "TestPassword123")
    
    print("\n4. Testing Sign-In via Gateway (8080)...")
    signin_gateway_ok = test_signin_gateway("testuser@example.com", "TestPassword123")
    
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    print(f"Health Check: {'PASS' if health_ok else 'FAIL'}")
    print(f"Sign-Up (8090): {'PASS' if signup_ok else 'FAIL'}")
    print(f"Sign-In (8090): {'PASS' if signin_iam_ok else 'FAIL'}")
    print(f"Sign-In (8080): {'PASS' if signin_gateway_ok else 'FAIL'}")
    
    all_pass = health_ok and signup_ok and signin_iam_ok and signin_gateway_ok
    sys.exit(0 if all_pass else 1)
