#!/usr/bin/env python3
"""
Test script for PDF Agent API
Usage: python test_agent.py [pdf_file_path]
"""
import sys
import requests
import json
from pathlib import Path

AGENT_URL = "http://127.0.0.1:7001/agent/analyze-file"

def test_agent_api(file_path: str = None):
    """Test the agent API with a sample PDF file"""
    
    if file_path and Path(file_path).exists():
        test_file = file_path
        print(f"📄 Testing with file: {test_file}")
    else:
        print("⚠️  No valid file provided. Please provide a PDF file path.")
        print("Usage: python test_agent.py [path_to_pdf_file]")
        return
    
    try:
        # Test file upload
        print(f"🚀 Sending file to agent API: {AGENT_URL}")
        print("⏳ Processing... (this may take 30-60 seconds)")
        
        with open(test_file, 'rb') as f:
            files = {'file': (Path(test_file).name, f, 'application/pdf')}
            data = {'max_pages': '3'}
            
            response = requests.post(AGENT_URL, files=files, data=data, timeout=120)
        
        print(f"📊 Response Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS! Agent processed the document.")
            print("\n📋 Extracted Data:")
            print(json.dumps(result, indent=2, ensure_ascii=False))
            
            # Validate structure
            if 'documentType' in result:
                print(f"\n🏷️  Document Type: {result['documentType']}")
            if 'items' in result and result['items']:
                print(f"📦 Items Found: {len(result['items'])}")
            if 'totals' in result:
                print(f"💰 Total Amount: {result['totals'].get('totalAmount', 'N/A')}")
                
        else:
            print(f"❌ FAILED! Error response:")
            print(response.text)
            
    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR: Cannot reach agent server")
        print("Make sure to run: start_agent_stack.bat")
        
    except requests.exceptions.Timeout:
        print("⏰ TIMEOUT: Agent took too long to process")
        print("Try with a smaller/simpler document")
        
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {e}")

def check_agent_health():
    """Check if agent server is running"""
    try:
        # Try to reach the FastAPI docs page
        health_url = "http://127.0.0.1:7001/docs"
        response = requests.get(health_url, timeout=5)
        if response.status_code == 200:
            print("✅ Agent server is running and healthy!")
            return True
        else:
            print(f"⚠️  Agent server responded with status: {response.status_code}")
            return False
    except:
        print("❌ Agent server is not reachable at http://127.0.0.1:7001")
        print("Run: start_agent_stack.bat")
        return False

if __name__ == "__main__":
    print("🔧 PDF Agent API Test Script")
    print("=" * 50)
    
    # Check if agent is running
    if not check_agent_health():
        sys.exit(1)
    
    # Get file path from command line or ask user
    file_path = sys.argv[1] if len(sys.argv) > 1 else None
    
    if not file_path:
        file_path = input("\n📁 Enter path to PDF file to test: ").strip().strip('"')
    
    test_agent_api(file_path)