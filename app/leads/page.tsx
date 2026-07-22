'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card } from '../../components/ui/card';
import { Search, Building2, Mail, Phone, Globe, MapPin, Check, Plus, ExternalLink, Loader2, MessageSquare, Trash2, Key, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Lead } from '../../types/index';
import Link from 'next/link';

const NICHES = [
  'Beauty Salon', 'Restaurant', 'Plumber', 'Dentist', 'Real Estate Agent',
  'Gym / Fitness', 'Lawyer', 'Accountant', 'Photographer', 'Cleaning Service',
  'Electrician', 'Mechanic / Auto Repair', 'Bakery', 'Florist', 'Veterinarian',
  'Landscaping', 'Roofing', 'HVAC', 'Optometrist', 'Chiropractor',
  'Marketing Agency', 'Web Design Agency', 'Tutoring / Education', 'Spa & Wellness',
];

const COUNTRIES = [
  { code: 'US', name: 'United States' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'CA', name: 'Canada' }, { code: 'AU', name: 'Australia' },
  { code: 'PK', name: 'Pakistan' }, { code: 'IN', name: 'India' },
  { code: 'AE', name: 'UAE' }, { code: 'SA', name: 'Saudi Arabia' },
  { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' },
  { code: 'NL', name: 'Netherlands' }, { code: 'SG', name: 'Singapore' },
  { code: 'ZA', name: 'South Africa' }, { code: 'NG', name: 'Nigeria' },
];

export default function LeadFinderPage() {
  const { addLeads, leads, googleApiSettings, updateGoogleApiSettings } = useAppContext();

  // Persistent search form & persistent scraped results (won't disappear on tab change!)
  const [niche, setNiche] = useLocalStorage<string>('lf_niche', '');
  const [city, setCity] = useLocalStorage<string>('lf_city', '');
  const [country, setCountry] = useLocalStorage<string>('lf_country', 'US');
  const [maxResults, setMaxResults] = useLocalStorage<number>('lf_max_results', 50);

  const [isScraping, setIsScraping] = useState(false);
  const [results, setResults] = useLocalStorage<Lead[]>('lead_finder_live_results', []);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(googleApiSettings?.placesApiKey || '');

  // Sync saved status on load or leads update
  useEffect(() => {
    if (leads && leads.length > 0) {
      const savedSet = new Set<string>();
      results.forEach(res => {
        const found = leads.find(l => 
          l.businessName.toLowerCase() === res.businessName.toLowerCase() &&
          (l.email === res.email || l.phone === res.phone)
        );
        if (found) savedSet.add(res.id);
      });
      setSavedIds(savedSet);
    }
  }, [leads, results]);

  const handleScrape = async () => {
    if (!niche || !city) {
      toast.error('Please select a niche and enter a city');
      return;
    }

    setIsScraping(true);
    setResults([]);

    try {
      const response = await fetch('/api/leads/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          city,
          country: COUNTRIES.find(c => c.code === country)?.name || country,
          maxResults,
          apiKey: googleApiSettings?.placesApiKey || '',
        }),
      });

      if (!response.ok || !response.body) {
        toast.error('Scraping failed to start');
        setIsScraping(false);
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let leadsFound = 0;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const parsed = JSON.parse(line);

              if (parsed._error) {
                toast.error(parsed.message || 'Scraping failed');
                continue;
              }

              if (parsed._done) {
                continue;
              }

              const newLead: Lead = parsed;
              setResults(prev => [...prev, newLead]);
              leadsFound++;
            } catch (err) {
              console.error('Error parsing live lead chunk:', err);
            }
          }
        }
      }

      if (leadsFound > 0) {
        toast.success(`Found ${leadsFound} businesses!`);
      } else {
        toast.error('No leads found. Try a different niche or city.');
      }

    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleSaveLead = (lead: Lead) => {
    const alreadyExists = leads.find(l =>
      l.businessName === lead.businessName &&
      (l.email === lead.email || l.phone === lead.phone)
    );

    if (alreadyExists) {
      toast.info('Lead already saved');
      setSavedIds(prev => new Set([...prev, lead.id]));
      return;
    }

    addLeads([lead]);
    setSavedIds(prev => new Set([...prev, lead.id]));
    toast.success(`${lead.businessName} saved to leads!`);
  };

  const handleSaveAll = () => {
    const toSave = results.filter(r => !savedIds.has(r.id));
    if (toSave.length === 0) {
      toast.info('All leads already saved');
      return;
    }
    addLeads(toSave);
    setSavedIds(new Set(results.map(r => r.id)));
    toast.success(`${toSave.length} leads saved!`);
  };

  const handleClearResults = () => {
    setResults([]);
    setSavedIds(new Set());
    toast.info('Search results cleared');
  };

  const saveApiKey = () => {
    updateGoogleApiSettings({ ...googleApiSettings, placesApiKey: tempApiKey });
    setShowApiKeyModal(false);
    toast.success(tempApiKey ? 'API Key saved successfully!' : 'API Key removed');
  };

  const getWhatsAppLink = (phone: string, businessName: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Hi ${businessName}, I found your details online and wanted to reach out.`);
    return `https://wa.me/${cleanPhone}?text=${message}`;
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-8 pb-8 animate-in fade-in duration-500 overflow-y-auto custom-scrollbar pr-2 flex-1">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Live Lead Finder</h1>
          <p className="text-slate-500 font-medium mt-1">Multi-Source Real-time Scraper (Google Maps, Bing, Yelp, OpenStreetMap & YellowPages).</p>
        </div>

        <Button
          onClick={() => setShowApiKeyModal(!showApiKeyModal)}
          variant="outline"
          className="rounded-2xl border-slate-200 text-xs font-bold gap-2 text-slate-700 hover:bg-slate-50"
        >
          <Key className="h-4 w-4 text-red-500" />
          {googleApiSettings?.placesApiKey ? '✅ API Key Active' : '🔑 Add Free API Key'}
        </Button>
      </header>

      {/* Free API Key Banner / Modal */}
      {showApiKeyModal && (
        <Card className="glass border-red-200 bg-red-50/40 p-6 rounded-3xl animate-in fade-in">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-2xl bg-red-500 text-white flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="font-black text-slate-900 text-base">Free Google Maps API Key (Optional)</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Want 100% official Google Maps results? Get <b>2,500 FREE queries (No credit card needed)</b> from <a href="https://serper.dev" target="_blank" rel="noreferrer" className="text-red-600 font-bold underline">Serper.dev</a> or your Google Cloud Console.
              </p>

              <div className="flex items-center gap-3 mt-4">
                <Input
                  type="password"
                  value={tempApiKey}
                  onChange={(e) => setTempApiKey(e.target.value)}
                  placeholder="Paste Serper.dev or Google Places API Key here..."
                  className="h-11 rounded-xl bg-white border-slate-200 text-xs text-slate-900 font-medium"
                />
                <Button onClick={saveApiKey} className="h-11 px-6 rounded-xl gradient-primary text-white font-bold text-xs shrink-0">
                  Save Key
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Search Card */}
      <Card className="glass border-none shadow-xl p-8 rounded-3xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Niche */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Niche <span className="text-red-500">*</span></Label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select a niche...</option>
              {NICHES.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">City <span className="text-red-500">*</span></Label>
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. New York"
              className="h-11 rounded-xl border-slate-200 text-slate-800"
              onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
            />
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Country <span className="text-red-500">*</span></Label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>

          {/* Max Results */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Max Results</Label>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value={20}>20 Leads</option>
              <option value={50}>50 Leads</option>
              <option value={100}>100 Leads (Deep Search)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mt-6">
          <div className="flex items-center gap-4">
            <Button
              onClick={handleScrape}
              disabled={isScraping}
              className="h-12 px-8 rounded-2xl gradient-primary text-white font-black uppercase tracking-widest shadow-xl shadow-red-500/20 hover:scale-[1.01] transition-all"
            >
              {isScraping ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scraping Live...</>
              ) : (
                <><Search className="mr-2 h-4 w-4" /> Start Multi-Source Scraping</>
              )}
            </Button>

            {results.length > 0 && (
              <Button
                onClick={handleSaveAll}
                variant="outline"
                className="h-12 px-6 rounded-2xl border-red-200 text-red-700 font-bold hover:bg-red-50"
              >
                <Plus className="mr-2 h-4 w-4" /> Save All ({results.length})
              </Button>
            )}
          </div>

          {results.length > 0 && (
            <Button
              onClick={handleClearResults}
              variant="ghost"
              className="h-10 text-slate-500 hover:text-red-600 font-semibold text-xs"
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear Screen
            </Button>
          )}
        </div>
      </Card>

      {/* Results Section */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              Found {results.length} Businesses {isScraping && <Loader2 className="h-4 w-4 animate-spin text-red-500" />}
            </h2>
            <Link href="/leads/list">
              <Button variant="ghost" size="sm" className="text-red-600 font-bold">
                View Saved Leads ({leads.length}) →
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {results.map((lead) => {
              const isSaved = savedIds.has(lead.id);
              return (
                <Card
                  key={lead.id}
                  className="glass border-none shadow-lg p-6 rounded-2xl hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group"
                >
                  {isSaved && (
                    <div className="absolute top-3 right-3">
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                        <Check className="h-3 w-3" /> Saved
                      </span>
                    </div>
                  )}

                  <div className="flex items-start gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white shrink-0">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black text-slate-900 text-sm leading-tight truncate">{lead.businessName}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{lead.niche}</p>
                        {(lead as any).source && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            (lead as any).source.includes('Google')
                              ? 'bg-blue-50 text-blue-600'
                              : (lead as any).source === 'Yelp'
                              ? 'bg-red-50 text-red-500'
                              : (lead as any).source === 'Bing Search'
                              ? 'bg-purple-50 text-purple-600'
                              : 'bg-amber-50 text-amber-600'
                          }`}>
                            {(lead as any).source.includes('Google') ? '📍 GMaps'
                              : (lead as any).source === 'Yelp' ? '⭐ Yelp'
                              : (lead as any).source === 'Bing Search' ? '🔍 Bing'
                              : '📋 YP'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-5">
                    {lead.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-700 truncate">{lead.email}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        <span className="text-xs text-slate-400 italic">No email found</span>
                      </div>
                    )}

                    {lead.phone ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="text-xs font-medium text-slate-700">{lead.phone}</span>
                        </div>

                        {/* WhatsApp direct chat link */}
                        <a
                          href={getWhatsAppLink(lead.phone, lead.businessName)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-[11px] font-bold bg-emerald-500 text-white px-2 py-1 rounded-lg hover:bg-emerald-600 transition-colors shadow-sm"
                        >
                          <MessageSquare className="h-3 w-3" /> WhatsApp
                        </a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        <span className="text-xs text-slate-400 italic">No phone found</span>
                      </div>
                    )}

                    {lead.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="text-xs text-slate-600 leading-tight line-clamp-2">{lead.address}</span>
                      </div>
                    )}

                    {lead.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <a
                          href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-red-600 font-medium truncate hover:underline flex items-center gap-1"
                        >
                          {lead.website.replace(/^https?:\/\//, '').split('/')[0]}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={() => handleSaveLead(lead)}
                    disabled={isSaved}
                    size="sm"
                    className={`w-full h-9 rounded-xl font-bold text-xs ${
                      isSaved
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 cursor-default'
                        : 'gradient-primary text-white shadow-lg shadow-red-500/20 hover:scale-[1.01]'
                    }`}
                  >
                    {isSaved ? (
                      <><Check className="mr-1.5 h-3.5 w-3.5" /> Saved to Leads</>
                    ) : (
                      <><Plus className="mr-1.5 h-3.5 w-3.5" /> Save Lead</>
                    )}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
