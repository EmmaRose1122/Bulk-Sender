import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import threading
import json
import os
import sys

from gmaps_scraper import scrape_google_maps_leads
from app_pusher import push_leads_to_bulk_sender
from geo_presets import COUNTRY_CITIES, NICHES_LIST

class GMapsScraperGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Bulk Sender — Google Maps Lead Scraper & Auto Pusher")
        self.root.geometry("960x700")
        self.root.minsize(850, 600)

        # Style configuration
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Color Palette
        self.bg_color = "#f8fafc"
        self.card_bg = "#ffffff"
        self.primary_color = "#ef4444" # Red
        self.primary_dark = "#dc2626"
        self.text_main = "#0f172a"
        self.text_sub = "#64748b"

        self.root.configure(bg=self.bg_color)
        self.scraped_leads = []

        self.create_widgets()

    def create_widgets(self):
        # Top Header Frame
        header = tk.Frame(self.root, bg=self.primary_color, height=70)
        header.pack(fill="x")
        
        title_lbl = tk.Label(
            header,
            text="[GMaps] Google Maps Lead Scraper & 1-Click System Pusher",
            font=("Segoe UI", 16, "bold"),
            fg="white",
            bg=self.primary_color,
            pady=15
        )
        title_lbl.pack()

        # Main Container
        main_container = tk.Frame(self.root, bg=self.bg_color, padx=20, pady=15)
        main_container.pack(fill="both", expand=True)

        # Search Controls Card
        card = tk.LabelFrame(
            main_container,
            text=" Search Configuration ",
            font=("Segoe UI", 11, "bold"),
            fg=self.text_main,
            bg=self.card_bg,
            padx=15,
            pady=15,
            bd=1,
            relief="solid"
        )
        card.pack(fill="x", pady=(0, 15))

        # Grid row 1: Country & City
        tk.Label(card, text="Country:", font=("Segoe UI", 9, "bold"), bg=self.card_bg, fg=self.text_sub).grid(row=0, column=0, sticky="w", padx=5, pady=5)
        country_options = list(COUNTRY_CITIES.keys())
        self.country_combo = ttk.Combobox(card, values=country_options, width=18, font=("Segoe UI", 10), state="readonly")
        self.country_combo.set("United States")
        self.country_combo.grid(row=0, column=1, padx=5, pady=5)
        self.country_combo.bind("<<ComboboxSelected>>", self.on_country_change)

        tk.Label(card, text="City:", font=("Segoe UI", 9, "bold"), bg=self.card_bg, fg=self.text_sub).grid(row=0, column=2, sticky="w", padx=5, pady=5)
        self.city_combo = ttk.Combobox(card, width=22, font=("Segoe UI", 10))
        self.city_combo.grid(row=0, column=3, padx=5, pady=5)

        tk.Label(card, text="Niche / Industry:", font=("Segoe UI", 9, "bold"), bg=self.card_bg, fg=self.text_sub).grid(row=0, column=4, sticky="w", padx=5, pady=5)
        self.niche_combo = ttk.Combobox(card, values=NICHES_LIST, width=22, font=("Segoe UI", 10))
        self.niche_combo.set("Plumber")
        self.niche_combo.grid(row=0, column=5, padx=5, pady=5)

        # Populate initial cities for United States
        self.update_city_dropdown("United States")

        # Grid row 2: Max Results & App Domain
        tk.Label(card, text="Max Leads / City:", font=("Segoe UI", 9, "bold"), bg=self.card_bg, fg=self.text_sub).grid(row=1, column=0, sticky="w", padx=5, pady=5)
        self.max_combo = ttk.Combobox(card, values=[10, 20, 50, 100, 200], width=18, font=("Segoe UI", 10), state="readonly")
        self.max_combo.set(50)
        self.max_combo.grid(row=1, column=1, padx=5, pady=5)

        tk.Label(card, text="App Web URL:", font=("Segoe UI", 9, "bold"), bg=self.card_bg, fg=self.text_sub).grid(row=1, column=2, sticky="w", padx=5, pady=5)
        self.app_url_entry = ttk.Entry(card, width=48, font=("Segoe UI", 10))
        self.app_url_entry.insert(0, "https://lead-finder-bulk-sender.vercel.app")
        self.app_url_entry.grid(row=1, column=3, columnspan=3, sticky="we", padx=5, pady=5)

        # Action Buttons Frame
        btn_frame = tk.Frame(card, bg=self.card_bg)
        btn_frame.grid(row=2, column=0, columnspan=6, pady=(15, 0), sticky="we")

        self.scrape_btn = tk.Button(
            btn_frame,
            text="[Search]  Start Scraping",
            font=("Segoe UI", 10, "bold"),
            bg=self.primary_color,
            fg="white",
            activebackground=self.primary_dark,
            activeforeground="white",
            bd=0,
            padx=20,
            pady=8,
            cursor="hand2",
            command=self.start_scrape_thread
        )
        self.scrape_btn.pack(side="left", padx=5)

        self.push_btn = tk.Button(
            btn_frame,
            text="[Push]  Push All to Bulk Sender App",
            font=("Segoe UI", 10, "bold"),
            bg="#10b981", # Emerald green
            fg="white",
            activebackground="#059669",
            activeforeground="white",
            bd=0,
            padx=20,
            pady=8,
            cursor="hand2",
            state="disabled",
            command=self.start_push_thread
        )
        self.push_btn.pack(side="left", padx=5)

        self.export_btn = tk.Button(
            btn_frame,
            text="[Save] Export JSON",
            font=("Segoe UI", 9, "bold"),
            bg="#64748b",
            fg="white",
            bd=0,
            padx=15,
            pady=8,
            cursor="hand2",
            state="disabled",
            command=self.export_json
        )
        self.export_btn.pack(side="right", padx=5)

        # Status Label
        self.status_lbl = tk.Label(main_container, text="Ready. Select Country & City and click 'Start Scraping'.", font=("Segoe UI", 9, "italic"), bg=self.bg_color, fg=self.text_sub, anchor="w")
        self.status_lbl.pack(fill="x", pady=(0, 5))

        # Data Table Frame
        table_frame = tk.Frame(main_container, bg=self.card_bg, bd=1, relief="solid")
        table_frame.pack(fill="both", expand=True)

        columns = ("name", "phone", "email", "website", "address")
        self.tree = ttk.Treeview(table_frame, columns=columns, show="headings", selectmode="browse")

        self.tree.heading("name", text="Business Name")
        self.tree.heading("phone", text="Phone Number")
        self.tree.heading("email", text="Email Address")
        self.tree.heading("website", text="Website")
        self.tree.heading("address", text="Address")

        self.tree.column("name", width=200)
        self.tree.column("phone", width=130)
        self.tree.column("email", width=180)
        self.tree.column("website", width=180)
        self.tree.column("address", width=220)

        scrollbar = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)

        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

    def on_country_change(self, event=None):
        selected_country = self.country_combo.get()
        self.update_city_dropdown(selected_country)

    def update_city_dropdown(self, country):
        cities = COUNTRY_CITIES.get(country, ["New York", "Los Angeles", "Chicago"])
        values = ["[ALL MAJOR CITIES]"] + cities
        self.city_combo["values"] = values
        self.city_combo.set(cities[0] if cities else "")

    def start_scrape_thread(self):
        country = self.country_combo.get().strip()
        city = self.city_combo.get().strip()
        niche = self.niche_combo.get().strip()
        max_leads = int(self.max_combo.get())

        if not niche or not country:
          messagebox.showerror("Error", "Please select a Country and Niche.")
          return

        self.scrape_btn.config(state="disabled")
        self.push_btn.config(state="disabled")
        self.export_btn.config(state="disabled")
        self.status_lbl.config(text=f"Searching Google Maps for '{niche}' in '{city}, {country}'... Please wait.")
        
        for item in self.tree.get_children():
            self.tree.delete(item)

        threading.Thread(target=self.run_scrape, args=(niche, city, country, max_leads), daemon=True).start()

    def run_scrape(self, niche, city, country, max_leads):
        try:
            all_collected = []
            
            if city == "[ALL MAJOR CITIES]":
                city_list = COUNTRY_CITIES.get(country, [])
                for idx, c_name in enumerate(city_list):
                    self.root.after(0, lambda c=c_name, i=idx+1, total=len(city_list): self.status_lbl.config(
                        text=f"Scraping City {i}/{total}: '{c}, {country}' for '{niche}'..."
                    ))
                    res = scrape_google_maps_leads(niche, c_name, country, min(20, max_leads))
                    all_collected.extend(res)
            else:
                all_collected = scrape_google_maps_leads(niche, city, country, max_leads)

            self.scraped_leads = all_collected
            self.root.after(0, self.update_table_after_scrape, all_collected)

        except Exception as e:
            self.root.after(0, lambda: messagebox.showerror("Scraping Error", str(e)))
            self.root.after(0, lambda: self.status_lbl.config(text="Scraping failed."))
            self.root.after(0, lambda: self.scrape_btn.config(state="normal"))

    def update_table_after_scrape(self, leads):
        for lead in leads:
            self.tree.insert("", "end", values=(
                lead.get("businessName", ""),
                lead.get("phone", "N/A"),
                lead.get("email", "") or "Scanning...",
                lead.get("website", "N/A"),
                lead.get("address", "")
            ))

        self.scrape_btn.config(state="normal")
        if leads:
            self.push_btn.config(state="normal")
            self.export_btn.config(state="normal")
            self.status_lbl.config(text=f"Done! Scraped {len(leads)} business leads from Google Maps.")
            messagebox.showinfo("Success", f"Found {len(leads)} Google Maps leads!\nClick 'Push All to Bulk Sender App' to send to system.")
        else:
            self.status_lbl.config(text="No leads found for search criteria.")
            messagebox.showwarning("No Results", "No leads were found for your search term.")

    def start_push_thread(self):
        if not self.scraped_leads:
            return

        app_url = self.app_url_entry.get().strip()
        if not app_url:
            app_url = "https://lead-finder-bulk-sender.vercel.app"

        self.push_btn.config(state="disabled")
        self.status_lbl.config(text=f"Pushing {len(self.scraped_leads)} leads to web app at '{app_url}'...")

        threading.Thread(target=self.run_push, args=(app_url,), daemon=True).start()

    def run_push(self, app_url):
        success = push_leads_to_bulk_sender(self.scraped_leads, app_url)
        self.root.after(0, self.finish_push, success)

    def finish_push(self, success):
        self.push_btn.config(state="normal")
        if success:
            self.status_lbl.config(text=f"Successfully sent {len(self.scraped_leads)} leads to Bulk Sender System!")
            messagebox.showinfo("Push Success", f"All {len(self.scraped_leads)} leads pushed to your Bulk Sender System successfully!")
        else:
            self.status_lbl.config(text="Push failed. Check connection / URL.")

    def export_json(self):
        if not self.scraped_leads:
            return

        file_path = filedialog.asksaveasfilename(
            defaultextension=".json",
            filetypes=[("JSON files", "*.json"), ("All Files", "*.*")],
            title="Save Leads Backup"
        )
        if file_path:
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(self.scraped_leads, f, indent=2)
            messagebox.showinfo("Exported", f"Saved {len(self.scraped_leads)} leads to {file_path}")

if __name__ == "__main__":
    root = tk.Tk()
    app = GMapsScraperGUI(root)
    root.mainloop()
