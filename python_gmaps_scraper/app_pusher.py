import requests
import json

def push_leads_to_bulk_sender(leads, app_base_url="http://localhost:3001"):
    if not leads or len(leads) == 0:
        print("[-] No leads available to push.")
        return False

    # Candidate URLs to try
    candidate_urls = [
        app_base_url.rstrip("/"),
        "http://localhost:3001",
        "http://localhost:3000",
        "http://localhost:3002",
    ]

    # Remove duplicates while preserving order
    urls_to_try = []
    for u in candidate_urls:
        if u not in urls_to_try:
            urls_to_try.append(u)

    for base_url in urls_to_try:
        api_url = base_url + "/api/leads/push"
        print(f"[*] Trying to push {len(leads)} leads to: {api_url}...")

        try:
            response = requests.post(
                api_url,
                json={"leads": leads},
                headers={"Content-Type": "application/json"},
                timeout=10
            )

            if response.status_code == 200:
                res_data = response.json()
                print(f"[+] SUCCESS! {res_data.get('message', 'Leads pushed successfully')}")
                return True
            else:
                print(f"[-] HTTP {response.status_code} at {api_url}: {response.text}")
        except Exception:
            continue

    print("[-] Connection Error: Could not connect to local server or Vercel URL.")
    print("Tip: Make sure Next.js application is running or check the port number.")
    return False
