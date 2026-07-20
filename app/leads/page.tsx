'use client';

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card } from '../../components/ui/card';
import { Search, Building2, Mail, Phone, Globe, MapPin, Check, AlertCircle, Info, Plus, ExternalLink, Loader2, Key } from 'lucide-react';
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
  const { googleApiSettings, addLeads, leads } = useAppContext();

  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('US');
  const [maxResults, setMaxResults] = useState(20);
  const [isScraping, setIsScraping] = useState(false);
  const [results, setResults] = useState<Lead[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [requiresKey, setRequiresKey] = useState(false);

  const handleScrape = async () => {
    if (!niche || !city) {
      toast.error('Please select a niche and enter a city');
      return;
    }

    setIsScraping(true);
    setResults([]);
    setRequiresKey(false);

    try {
      const res = await fetch('/api/leads/find', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          niche,
          city,
          country: COUNTRIES.find(c => c.code === country)?.name || country,
          maxResults,
          apiKey: googleApiSettings.placesApiKey,
        }),
      });

      const data = await res.json();

      if (data.requiresApiKey) {
        setRequiresKey(true);
        toast.error('Google Places API key required');
        return;
      }

      if (!data.success) {
        toast.error(data.message || 'Scraping failed');
        return;
      }

      setResults(data.leads || []);

      if (data.leads?.length === 0) {
        toast.info('No businesses found. Try a different niche or city.');
      } else {
        toast.success(`Found ${data.leads.length} businesses!`);
      }
    } catch (err) {
      toast.error('Network error. Please try again.');
    } finally {
      setIsScraping(false);
    }
  };

  const handleSaveLead = (lead: Lead) => {
    // Check if already in database
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

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <header>
        <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Lead Finder</h1>
        <p className="text-slate-500 font-medium mt-1">Find real businesses using public data sources. Only verified data is stored.</p>
      </header>

      {/* Search Card */}
      <Card className="glass border-none shadow-xl p-8 rounded-3xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Niche */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Niche <span className="text-red-500">*</span></Label>
            <select
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-6">
          <Button
            onClick={handleScrape}
            disabled={isScraping}
            className="h-12 px-8 rounded-2xl gradient-primary text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.01] transition-all"
          >
            {isScraping ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scraping...</>
            ) : (
              <><Search className="mr-2 h-4 w-4" /> Start Scraping</>
            )}
          </Button>

          {results.length > 0 && (
            <Button
              onClick={handleSaveAll}
              variant="outline"
              className="h-12 px-6 rounded-2xl border-indigo-200 text-indigo-700 font-bold hover:bg-indigo-50"
            >
              <Plus className="mr-2 h-4 w-4" /> Save All ({results.length})
            </Button>
          )}
        </div>
      </Card>

      {/* API Key Warning */}
      {requiresKey && (
        <div className="flex items-start gap-4 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
          <Key className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">Google Places API Key Required</p>
            <p className="text-xs text-amber-600 mt-1">
              Add your API key in{' '}
              <Link href="/settings" className="underline font-bold">Settings → API Keys</Link>{' '}
              to start finding real business leads.
            </p>
          </div>
        </div>
      )}

      {/* How it works info box */}
      {results.length === 0 && !isScraping && (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-black text-amber-800 uppercase tracking-wider">How Scraping Works</h3>
          </div>
          <ul className="space-y-1.5 text-xs text-amber-700 font-medium">
            <li>• <strong>With Google Maps API key:</strong> Scrapes real businesses (add key in Settings)</li>
            <li>• <strong>Email extraction:</strong> Automatically visits each business website to find contact emails</li>
            <li>• <strong>All data is validated</strong> (email format, phone format) before storing</li>
            <li>• <strong>Duplicates are automatically detected</strong> by business name + phone/email</li>
            <li>• <strong>If nothing is found, no fake data is generated</strong></li>
          </ul>
        </div>
      )}

      {/* Loading state */}
      {isScraping && (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="relative">
            <div className="h-16 w-16 rounded-full gradient-primary animate-spin" style={{ clipPath: 'polygon(0 0, 50% 0, 50% 50%, 0 50%)' }} />
            <div className="absolute inset-2 rounded-full bg-white" />
            <Search className="absolute inset-0 m-auto h-6 w-6 text-indigo-600" />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-widest animate-pulse">Scanning businesses...</p>
          <p className="text-xs text-slate-400">Fetching details & extracting emails from websites</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-slate-800">
              Found {results.length} Businesses
            </h2>
            <Link href="/leads/list">
              <Button variant="ghost" size="sm" className="text-indigo-600 font-bold">
                View All Leads →
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
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 text-sm leading-tight truncate">{lead.businessName}</h3>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider mt-0.5">{lead.niche}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-5">
                    {lead.email ? (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-700 truncate">{lead.email}</span>
                        <span className="ml-auto text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">✓</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                        <span className="text-xs text-slate-400 italic">No email found</span>
                      </div>
                    )}

                    {lead.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-xs font-medium text-slate-700">{lead.phone}</span>
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
                          className="text-xs text-indigo-600 font-medium truncate hover:underline flex items-center gap-1"
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
                        : 'gradient-primary text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.01]'
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
