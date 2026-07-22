import requests
import json
import re
import time
import urllib.parse
from bs4 import BeautifulSoup

# ═════════════════════════════════════════════════════════════
# BULK EMAIL SENDER — PYTHON AUTOMATIC LEAD SCRAPER & PUSHER
# ═════════════════════════════════════════════════════════════
# Change this URL to your deployed Vercel domain or localhost:
# e.g., "https://bulk-sender.vercel.app" or "http://localhost:3000"
APP_API_URL = "http://localhost:3000/api/leads/push"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

def extract_emails(text):
    regex = r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}'
    emails = re.findall(regex, text)
    blacklist = ['example.com', 'w3.org', 'schema.org', 'sentry.io', 'google.com', 'facebook.com', 'yellowpages.com', 'yelp.com']
    valid = [e for e in set(emails) if not any(b in e.lower() for b in blacklist) and len(e) < 60]
    return valid

def extract_phones(text):
    regex = r'(?:\+?[\d]{1,3}[\s.\-]?)?\(?[\d]{2,4}\)?[\s.\-]?[\d]{3,4}[\s.\-]?[\d]{3,4}'
    matches = re.findall(regex, text)
    valid = []
    for m in set(matches):
        digits = re.sub(r'\D', '', m)
        if 10 <= len(digits) <= 15:
            valid.append(m.strip())
    return valid

def scrape_google_maps_python(niche, city, country="United States"):
    print(f"\n🔍 [Python Scraper] Scraping Google Maps for '{niche}' in '{city}, {country}'...")
    leads = []
    query = f"{niche} in {city} {country}"
    url = f"https://www.google.com/search?q={urllib.parse.quote(query)}&tbm=lcl&hl=en"

    try:
        res = requests.get(url, headers=HEADERS, cookies={'CONSENT': 'YES+'}, timeout=10)
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, 'html.parser')
            
            # Extract business cards
            cards = soup.find_all('div', class_=re.compile(r'OSrLfi|dbg0pd|rllt__details'))
            names = []
            for c in cards:
                name = c.get_text().strip()
                if name and len(name) > 2 and 'google' not in name.lower() and name not in names:
                    names.append(name)

            all_phones = extract_phones(res.text)
            
            for i, name in enumerate(names):
                leads.append({
                    "businessName": name,
                    "phone": all_phones[i] if i < len(all_phones) else "",
                    "address": f"{city}, {country}",
                    "website": "",
                    "niche": niche,
                    "city": city,
                    "country": country,
                    "source": "Python Google Maps Scraper",
                    "notes": "📍 Google Maps (Python)"
                })
    except Exception as e:
        print(f"❌ Scraping error: {e}")

    print(f"✅ Found {len(leads)} business leads!")
    return leads

def push_leads_to_app(leads, target_url=APP_API_URL):
    if not leads:
        print("⚠️ No leads to send.")
        return False

    print(f"\n🚀 Sending {len(leads)} leads to Bulk Email Sender system...")
    try:
        res = requests.post(target_url, json={"leads": leads}, headers={"Content-Type": "application/json"}, timeout=15)
        if res.status_code == 200:
            data = res.json()
            print(f"🎉 SUCCESS! System response: {data.get('message')}")
            return True
        else:
            print(f"❌ System error ({res.status_code}): {res.text}")
    except Exception as e:
        print(f"❌ Connection error: {e}\nTip: Make sure the app URL '{target_url}' is correct and running.")
    return False

if __name__ == "__main__":
    print("=" * 60)
    print("      BULK EMAIL SENDER — PYTHON ONE-CLICK SCRAPER")
    print("=" * 60)

    app_url = input("Enter your App Web URL (Press Enter for 'http://localhost:3000/api/leads/push'): ").strip()
    if not app_url:
        app_url = APP_API_URL
    elif not app_url.endswith("/api/leads/push"):
        app_url = app_url.rstrip("/") + "/api/leads/push"

    niche_input = input("Enter Niche (e.g. Plumber, Dentist, Restaurant): ").strip() or "Plumber"
    city_input = input("Enter City (e.g. New York, Chicago, London): ").strip() or "New York"
    country_input = input("Enter Country (e.g. United States, UK): ").strip() or "United States"

    # Scrape
    scraped_leads = scrape_google_maps_python(niche_input, city_input, country_input)

    # 1-Click Push
    if scraped_leads:
        confirm = input(f"\nPress Enter to send all {len(scraped_leads)} leads to your application... ").strip()
        push_leads_to_app(scraped_leads, app_url)
