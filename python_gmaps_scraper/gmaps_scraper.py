import requests
import json
import re
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor

SERPER_API_KEY = "48853f5c845df9f552b47f65a2364377131b6e1d"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

def extract_emails(text):
    if not text:
        return []
    regex = r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}'
    emails = re.findall(regex, text)
    blacklist = ['example.com', 'w3.org', 'schema.org', 'sentry.io', 'google.com', 'facebook.com', 'yellowpages.com', 'yelp.com', 'bing.com', 'wixpress.com', 'domain.com']
    valid = [e for e in set(emails) if not any(b in e.lower() for b in blacklist) and len(e) < 60]
    return valid

def fetch_email_from_website(url):
    if not url or not url.startswith('http') or 'yelp.com' in url or 'google.com' in url:
        return ""

    urls_to_check = [url]
    base_url = url.rstrip('/')
    urls_to_check.extend([
        f"{base_url}/contact",
        f"{base_url}/contact-us",
        f"{base_url}/about",
        f"{base_url}/about-us",
    ])

    for target in urls_to_check:
        try:
            res = requests.get(target, headers=HEADERS, timeout=3.0)
            if res.status_code == 200:
                found = extract_emails(res.text)
                if found:
                    return found[0]
        except:
            pass

    return ""

def scrape_serper_gmaps(niche, city, country, max_leads, api_key=SERPER_API_KEY):
    results = []
    seen = set()

    max_pages = max(1, (max_leads // 10) + 2)

    for page in range(1, max_pages + 1):
        if len(results) >= max_leads:
            break

        print(f"[*] Fetching Google Maps Page {page}...")
        payload = {
            "q": f"{niche} in {city} {country}",
            "location": f"{city}, {country}",
            "page": page
        }

        try:
            res = requests.post(
                "https://google.serper.dev/places",
                headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
                json=payload,
                timeout=10
            )

            if res.status_code == 200:
                data = res.json()
                places = data.get("places", [])
                if not places:
                    print(f"[*] No more places found on page {page}.")
                    break

                for p in places:
                    name = p.get("title") or p.get("name")
                    if not name:
                        continue

                    key = name.lower()
                    if key in seen:
                        continue
                    seen.add(key)

                    phone = p.get("phoneNumber") or p.get("phone") or ""
                    website = p.get("website") or ""
                    address = p.get("address") or f"{city}, {country}"
                    rating = p.get("rating")
                    rating_str = f"Rating {rating} ({p.get('ratingCount', 0)})" if rating else "Google Maps"

                    results.append({
                        "businessName": name,
                        "phone": phone,
                        "email": "",
                        "website": website,
                        "address": address,
                        "niche": niche,
                        "city": city,
                        "country": country,
                        "status": "new",
                        "notes": f"{rating_str} · Python Google Maps Page {page}",
                        "source": "Python Google Maps Scraper",
                    })

                    if len(results) >= max_leads:
                        break

        except Exception as e:
            print(f"[-] Serper API error page {page}: {e}")
            break

    return results

def enrich_emails_in_parallel(leads):
    print("\n[Email Finder] Deep scanning website contact pages for emails...")
    
    def worker(lead):
        if lead.get("website") and not lead.get("email"):
            email = fetch_email_from_website(lead["website"])
            if email:
                lead["email"] = email
                print(f"   [+] Email Found: {lead['businessName']} -> {email}")
        return lead

    with ThreadPoolExecutor(max_workers=8) as executor:
        leads = list(executor.map(worker, leads))

    return leads

def scrape_google_maps_leads(niche, city, country="United States", max_leads=50):
    print(f"\n[Search] Scraping Google Maps for '{niche}' in '{city}, {country}' (Target: {max_leads} leads)...")

    # 1. Multi-Page Google Maps Scraper
    results = scrape_serper_gmaps(niche, city, country, max_leads)

    # 2. Deep Email Scraper
    if results:
        results = enrich_emails_in_parallel(results)

    print(f"\n[+] Scraping complete! Collected {len(results)} total Google Maps leads.")
    return results
