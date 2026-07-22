import os
import sys
import json
from gmaps_scraper import scrape_google_maps_leads
from app_pusher import push_leads_to_bulk_sender

def main():
    print("=" * 65)
    print("   [GMaps] GOOGLE MAPS PYTHON SCRAPER & BULK SENDER INTEGRATION")
    print("=" * 65)

    # 1. Ask for Web App URL
    default_url = "http://localhost:3000"
    user_url = input(f"Enter Bulk Sender App Domain (Press Enter for '{default_url}'): ").strip()
    target_url = user_url if user_url else default_url

    # 2. Ask for Search Parameters
    niche = input("\n[1] Enter Business Niche (e.g. Plumber, Dentist, Restaurant): ").strip()
    if not niche:
        niche = "Plumber"

    city = input("[2] Enter City (e.g. New York, Chicago, London): ").strip()
    if not city:
        city = "New York"

    country = input("[3] Enter Country (e.g. United States, UK): ").strip()
    if not country:
        country = "United States"

    max_str = input("[4] Max Leads to Scrape (Press Enter for 50): ").strip()
    max_leads = int(max_str) if max_str.isdigit() else 50

    # 3. Execute Scraping
    leads = scrape_google_maps_leads(niche, city, country, max_leads)

    if not leads:
        print("[-] No leads were found. Please check your search term.")
        return

    # 4. Save local JSON backup file
    backup_file = f"gmaps_{niche.lower().replace(' ', '_')}_{city.lower().replace(' ', '_')}.json"
    with open(backup_file, "w", encoding="utf-8") as f:
        json.dump(leads, f, indent=2)
    print(f"[+] Local backup saved to file: '{backup_file}'")

    # 5. One-Click Push to App
    print("\n" + "─" * 65)
    push_choice = input(f"-> Push {len(leads)} scraped leads directly to Bulk Sender App? (Y/n): ").strip().lower()
    
    if push_choice in ["", "y", "yes"]:
        push_leads_to_bulk_sender(leads, target_url)
    else:
        print("[i] Push skipped. Leads saved locally in JSON file.")

if __name__ == "__main__":
    main()
