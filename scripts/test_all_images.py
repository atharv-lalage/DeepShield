import os
import requests
import json
import time

API_URL = "http://localhost:8000/detect/image"

TEST_CASES = [
    {
        "expected_label": "fake",
        "path": r"C:\Users\Atharv\Downloads\test1.jpeg"
    },
    {
        "expected_label": "fake",
        "path": r"C:\Users\Atharv\Downloads\test2.jpg.jpeg"
    },
    {
        "expected_label": "real/uncertain",
        "path": r"C:\Users\Atharv\Downloads\WhatsApp Image 2026-03-18 at 11.26.31 AM.jpeg"
    },
    {
        "expected_label": "real/uncertain",
        "path": r"C:\Users\Atharv\.gemini\antigravity\brain\da3636f0-f656-4802-bc7f-680417503adf\media__1775210359713.jpg"
    },
    {
        "expected_label": "real/uncertain",
        "path": r"C:\Users\Atharv\Downloads\test5.jpg"
    }
]

def main():
    print("="*60)
    print("🚀 AUTOMATED PIPELINE TEST: PROJECT XERO PICT")
    print("="*60 + "\n")

    for case in TEST_CASES:
        path = case["path"]
        expected = case["expected_label"].upper()
        
        print(f"Testing File: {os.path.basename(path)}")
        print(f"Expected:     {expected}")
        
        if not os.path.exists(path):
            print("❌ Error: File not found exactly at that path. Skipping...\n")
            continue
            
        print("Sending request to backend...")
        
        try:
            start_time = time.time()
            with open(path, 'rb') as f:
                files = {'file': (os.path.basename(path), f, 'image/jpeg')}
                response = requests.post(API_URL, files=files)
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                verdict = data.get("verdict", {})
                label = verdict.get("label", "Unknown").upper()
                confidence = verdict.get("percentage", "N/A")
                
                print(f"Result:       ✅ Success ({duration:.2f}s)")
                print(f"AI Verdict:   [{label}] with {confidence} confidence.")
                print(f"Explanation:  {data.get('explanation')}")
                
            else:
                print(f"❌ Server Error: HTTP {response.status_code}")
                print(response.text)
                
        except requests.exceptions.ConnectionError:
            print("❌ Connection Error: Is the FastAPI backend running on port 8000?")
        except Exception as e:
            print(f"❌ Unexpected Error: {str(e)}")
            
        print("-" * 60)

if __name__ == "__main__":
    main()
