import requests
import json
import re
import time
import urllib.parse
from bs4 import BeautifulSoup

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
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

def quick_scrape_website_email(url):
    if not url or not url.startsWith('http') if hasattr(url, 'startsWith') else not url.startswith('http') or 'yelp.com' in url or 'google.com' in url:
        return ""
    try:
        res = requests.get(url, headers=HEADERS, timeout=4)
        if res.status_code == 200:
            emails = extract_emails(res.text)
            if emails:
                return emails[0]
    except:
        pass
    return ""

def scrape_google_maps_leads(niche, city, country="United States", max_leads=50):
    print(f"\n[Search] Searching Google Maps for '{niche}' in '{city}, {country}'...")
    results = []
    seen = set()

    queries = [
        f"{niche} in {city} {country}",
        f"best {niche} in {city}",
        f"{niche} services {city}",
    ]

    for query in queries:
        if len(results) >= max_leads:
            break

        url = f"https://www.google.com/search?q={urllib.parse.quote(query)}&tbm=lcl&hl=en"
        print(f"[*] Querying Google Maps: {query}...")

        try:
            res = requests.get(url, headers=HEADERS, cookies={'CONSENT': 'YES+'}, timeout=10)
            if res.status_code != 200:
                continue

            html = res.text
            soup = BeautifulSoup(html, 'html.parser')

            card_elements = soup.find_all('div', class_=re.compile(r'OSrLfi|dbg0pd|rllt__details'))
            names = []
            for elem in card_elements:
                name = elem.get_text().strip()
                if name and len(name) > 2 and 'google' not in name.lower() and 'map' not in name.lower() and name not in names:
                    names.append(name)

            all_phones = extract_phones(html)
            website_matches = re.findall(r'href="(https?:\/\/(?!(?:google|gstatic|youtube|facebook)[^"]*)[^"]{5,100})"', html)
            websites = list(set(website_matches))

            for i, name in enumerate(names):
                if len(results) >= max_leads:
                    break
                
                key = name.lower()
                if key in seen:
                    continue
                seen.add(key)

                phone = all_phones[i] if i < len(all_phones) else ""
                website = websites[i] if i < len(websites) else ""

                print(f"   [+] Found: {name} | Phone: {phone or 'N/A'} | Web: {website or 'N/A'}")

                email = ""
                if website:
                    email = quick_scrape_website_email(website)

                results.append({
                    "businessName": name,
                    "phone": phone,
                    "email": email,
                    "website": website,
                    "address": f"{city}, {country}",
                    "niche": niche,
                    "city": city,
                    "country": country,
                    "status": "new",
                    "notes": "Google Maps Python Scraper",
                    "source": "Python Google Maps Scraper",
                })

                time.sleep(0.05)

        except Exception as e:
            print(f"[-] Scraping error for query '{query}': {e}")

    print(f"\n[+] Scraping finished! Collected {len(results)} total Google Maps leads.")
    return results
