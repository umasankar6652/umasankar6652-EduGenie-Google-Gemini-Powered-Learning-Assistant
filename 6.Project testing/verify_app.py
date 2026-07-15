import sys
import os

# Add project root to python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "5. Project Development Phase")))

from fastapi.testclient import TestClient
import main

client = TestClient(main.app)

def run_tests():
    print("=== STARTING EDUGENIE INTEGRATION TESTS ===")

    # 1. Test GET /
    print("\n1. Testing GET / (dashboard)...")
    response = client.get("/")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    assert "EduGenie" in response.text, "Expected 'EduGenie' in HTML response"
    print("OK: GET / succeeded")

    # 2. Test GET /api/status
    print("\n2. Testing GET /api/status...")
    response = client.get("/api/status")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    status_data = response.json()
    print("Backend Status:", status_data)
    assert "gemini_active" in status_data, "Expected 'gemini_active' key in status response"
    print("OK: GET /api/status succeeded")

    # 3. Test POST /api/qa with local model (to verify LaMini-Flan-T5 works)
    print("\n3. Testing POST /api/qa (force local model)...")
    qa_payload = {
        "question": "Which is the largest ocean?",
        "use_local": True
    }
    response = client.post("/api/qa", json=qa_payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    qa_data = response.json()
    print("QA Response:", qa_data)
    assert "answer" in qa_data, "Expected 'answer' key in response"
    assert qa_data["success"] is True, "Expected success to be True"
    print("OK: POST /api/qa (local) succeeded")

    # 4. Test POST /api/summarize (uses local LaMini-Flan-T5)
    print("\n4. Testing POST /api/summarize...")
    sum_payload = {
        "text": "Photosynthesis is the process used by plants, algae and certain bacteria to harness energy from sunlight and turn it into chemical energy.",
        "max_length": 50
    }
    response = client.post("/api/summarize", json=sum_payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}"
    sum_data = response.json()
    print("Summarize Response:", sum_data)
    assert "summary" in sum_data, "Expected 'summary' key in response"
    print("OK: POST /api/summarize succeeded")

    # 5. Test POST /api/explain without Gemini API key (should handle missing key gracefully)
    print("\n5. Testing POST /api/explain (without API Key, should fail gracefully)...")
    explain_payload = {
        "concept": "Photosynthesis",
        "level": "Child"
    }
    response = client.post("/api/explain", json=explain_payload)
    if status_data["gemini_active"]:
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print("OK: POST /api/explain (Gemini active) succeeded")
    else:
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print("Explain Response (Expected Failure):", response.json())
        print("OK: POST /api/explain (Gemini missing key) handled gracefully")

    print("\n=== ALL TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
