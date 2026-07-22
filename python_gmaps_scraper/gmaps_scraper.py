import requests
import json
import re
import time
import urllib.parse

# Default active Serper API key for instant Google Maps scraping
SERPER_API_KEY = "48853f5c845df9f552b47f65a2364377131b6e1d"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

def extract_emails(text):
    regex = r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}'
    emails = re.findall(regex, text)
    blacklist = ['example.com', 'w3.org', 'schema.org', 'sentry.io', 'google.com', 'facebook.com', 'yellowpages.com', 'yelp.com', 'bing.com']
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

def scrape_serper_gmaps(niche, city, country, max_leads, api_key=SERPER_API_KEY):
    results = []
    seen = set()

    queries = [
        {"q": f"{niche} in {city} {country}", "location": f"{city}, {country}"},
        {"q": f"best {niche} in {city}", "location": f"{city}, {country}"},
        {"q": f"{niche} services {city}", "location": f"{city}, {country}"},
    ]

    for item in queries:
        if len(results) >= max_leads:
            break

        try:
            res = requests.post(
                "https://google.serper.dev/places",
                headers={"X-API-KEY": api_key, "Content-Type": "application/json"},
                json=item,
                timeout=10
            )

            if res.status_code == 200:
                data = res.json()
                places = data.get("places", [])
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
                    rating_str = f"⭐ {rating} ({p.get('ratingCount', 0)})" if rating else "⭐ Google Maps"

                    print(f"   [+] Found: {name} | Phone: {phone or 'N/A'} | Address: {address}")

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
                        "notes": f"{rating_str} · Python Google Maps",
                        "source": "Python Google Maps Scraper",
                    })

                    if len(results) >= max_leads:
                        break

        except Exception as e:
            print(f"[-] Serper API query error: {e}")

    return results

def scrape_duckduckgo_fallback(niche, city, country, max_leads):
    results = []
    seen = set()
    query = f"{niche} in {city} {country} phone contact"
    url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote(query)}"

    try:
        res = requests.get(url, headers=HEADERS, timeout=8)
        if res.status_code == 200:
            link_matches = re.findall(r'<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>', res.text)
            for raw_url, name in link_matches:
                if len(results) >= max_leads:
                    break
                name = name.strip()
                uddg = re.search(r'uddg=([^&]+)', raw_url)
                site_url = urllib.parse.unquote(uddg.group(1)) if uddg else raw_url

                if site_url.startswith('http') and 'duckduckgo.com' not in site_url and 'wikipedia.org' not in site_url:
                    key = name.lower()
                    if key not in seen:
                        seen.add(key)
                        results.append({
                            "businessName": name,
                            "phone": "",
                            "email": "",
                            "website": site_url,
                            "address": f"{city}, {country}",
                            "niche": niche,
                            "city": city,
                            "country": country,
                            "status": "new",
                            "notes": "DuckDuckGo Scraper",
                            "source": "Python DuckDuckGo",
                        })
    except Exception as e:
        print(f"[-] DDG fallback error: {e}")

    return results

def scrape_google_maps_leads(niche, city, country="United States", max_leads=50):
    print(f"\n[Search] Scraping Google Maps for '{niche}' in '{city}, {country}'...")
    
    # 1. Primary: Serper.dev Google Maps Engine
    results = scrape_serper_gmaps(niche, city, country, max_leads)

    # 2. Fallback if needed
    if len(results) < max_leads:
        remains = max_leads - len(results)
        fallback = scrape_duckduckgo_fallback(niche, city, country, remains)
        for f in fallback:
            if not any(r["businessName"].lower() == f["businessName"].lower() for r in results):
                results.append(f)

    print(f"\n[+] Scraping finished! Collected {len(results)} total leads.")
    return results
