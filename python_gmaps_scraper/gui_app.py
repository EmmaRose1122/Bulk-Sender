import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import threading
import json
import os
import sys

from gmaps_scraper import scrape_google_maps_leads
from app_pusher import push_leads_to_bulk_sender

class GMapsScraperGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Bulk Sender — Google Maps Lead Scraper & Auto Pusher")
        self.root.geometry("900" + "x" + "650")
        self.root.minsize(800, 550)

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
            text="📍 Google Maps Lead Scraper & 1-Click System Pusher",
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

        # Grid row 1: Inputs
        tk.Label(card, text="Niche / Industry:", font=("Segoe UI", 9, "bold"), bg=self.card_bg, fg=self.text_sub).grid(row=0, column=0, sticky="w", padx=5, pady=5)
        self.niche_entry = ttk.Combobox(card, values=["Plumber", "Dentist", "Restaurant", "Beauty Salon", "Real Estate Agent", "Gym / Fitness", "Lawyer", "Accountant"], width=18, font=("Segoe UI", 10))
        self.niche_entry.set("Plumber")
        self.niche_entry.grid(row=0, column=1, padx=5, pady=5)

        tk.Label(card, text="City:", font=("Segoe UI", 9, "bold"), bg=self.card_bg, fg=self.text_sub).grid(row=0, column=2, sticky="w", padx=5, pady=5)
        self.city_entry = ttk.Entry(card, width=18, font=("Segoe UI", 10))
        self.city_entry.insert(0, "New York")
        self.city_entry.grid(row=0, column=3, padx=5, pady=5)

        tk.Label(card, text="Country:", font=("Segoe UI", 9, "bold"), bg=self.card_bg, fg=self.text_sub).grid(row=0, column=4, sticky="w", padx=5, pady=5)
        self.country_entry = ttk.Entry(card, width=16, font=("Segoe UI", 10))
        self.country_entry.insert(0, "United States")
        self.country_entry.grid(row=0, column=5, padx=5, pady=5)

        # Grid row 2: Max Results & App Domain
        tk.Label(card, text="Max Leads:", font=("Segoe UI", 9, "bold"), bg=self.card_bg, fg=self.text_sub).grid(row=1, column=0, sticky="w", padx=5, pady=5)
        self.max_combo = ttk.Combobox(card, values=[20, 50, 100, 200], width=18, font=("Segoe UI", 10), state="readonly")
        self.max_combo.set(50)
        self.max_combo.grid(row=1, column=1, padx=5, pady=5)

        tk.Label(card, text="App URL:", font=("Segoe UI", 9, "bold"), bg=self.card_bg, fg=self.text_sub).grid(row=1, column=2, sticky="w", padx=5, pady=5)
        self.app_url_entry = ttk.Entry(card, width=42, font=("Segoe UI", 10))
        self.app_url_entry.insert(0, "http://localhost:3001")
        self.app_url_entry.grid(row=1, column=3, columnspan=3, sticky="we", padx=5, pady=5)

        # Action Buttons Frame
        btn_frame = tk.Frame(card, bg=self.card_bg)
        btn_frame.grid(row=2, column=0, columnspan=6, pady=(15, 0), sticky="we")

        self.scrape_btn = tk.Button(
            btn_frame,
            text="🔍  Start Scraping",
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
            text="🚀  Push All to Bulk Sender App",
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
            text="💾 Export JSON",
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
        self.status_lbl = tk.Label(main_container, text="Ready. Enter search criteria and click 'Start Scraping'.", font=("Segoe UI", 9, "italic"), bg=self.bg_color, fg=self.text_sub, anchor="w")
        self.status_lbl.pack(fill="x", pady=(0, 5))

        # Data Table Frame
        table_frame = tk.Frame(main_container, bg=self.card_bg, bd=1, relief="solid")
        table_frame.pack(fill="both", expand=True)

        columns = ("name", "phone", "website", "address")
        self.tree = ttk.Treeview(table_frame, columns=columns, show="headings", selectmode="browse")

        self.tree.heading("name", text="Business Name")
        self.tree.heading("phone", text="Phone Number")
        self.tree.heading("website", text="Website")
        self.tree.heading("address", text="Address")

        self.tree.column("name", width=220)
        self.tree.column("phone", width=140)
        self.tree.column("website", width=200)
        self.tree.column("address", width=240)

        scrollbar = ttk.Scrollbar(table_frame, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)

        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

    def start_scrape_thread(self):
        niche = self.niche_entry.get().strip()
        city = self.city_entry.get().strip()
        country = self.country_entry.get().strip()
        max_leads = int(self.max_combo.get())

        if not niche or not city:
          messagebox.showerror("Error", "Please enter Niche and City.")
          return

        self.scrape_btn.config(state="disabled")
        self.push_btn.config(state="disabled")
        self.export_btn.config(state="disabled")
        self.status_lbl.config(text=f"Searching Google Maps for '{niche}' in '{city}'... Please wait.")
        
        # Clear tree
        for item in self.tree.get_children():
            self.tree.delete(item)

        threading.Thread(target=self.run_scrape, args=(niche, city, country, max_leads), daemon=True).start()

    def run_scrape(self, niche, city, country, max_leads):
        try:
            leads = scrape_google_maps_leads(niche, city, country, max_leads)
            self.scraped_leads = leads

            self.root.after(0, self.update_table_after_scrape, leads)
        except Exception as e:
            self.root.after(0, lambda: messagebox.showerror("Scraping Error", str(e)))
            self.root.after(0, lambda: self.status_lbl.config(text="Scraping failed."))
            self.root.after(0, lambda: self.scrape_btn.config(state="normal"))

    def update_table_after_scrape(self, leads):
        for lead in leads:
            self.tree.insert("", "end", values=(
                lead.get("businessName", ""),
                lead.get("phone", "N/A"),
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
            app_url = "http://localhost:3000"

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
