import requests
import json

def push_leads_to_bulk_sender(leads, app_base_url="http://localhost:3000"):
    if not leads or len(leads) == 0:
        print("[-] No leads available to push.")
        return False

    api_url = app_base_url.rstrip("/") + "/api/leads/push"
    print(f"\n[*] Pushing {len(leads)} leads to Bulk Sender App at: {api_url}...")

    try:
        response = requests.post(
            api_url,
            json={"leads": leads},
            headers={"Content-Type": "application/json"},
            timeout=20
        )

        if response.status_code == 200:
            res_data = response.json()
            print(f"[+] SUCCESS! {res_data.get('message', 'Leads pushed successfully')}")
            return True
        else:
            print(f"[-] Push failed (HTTP {response.status_code}): {response.text}")
    except Exception as err:
        print(f"[-] Connection Error: Could not connect to '{api_url}'.")
        print("Tip: Ensure your Next.js application is running or use your live Vercel domain URL.")

    return False
