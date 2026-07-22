import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────
// High-Yield Multi-Source Lead Scraper
// Supports Serper.dev Google Maps API Key & Free Scrapers
// ─────────────────────────────────────────────

export const maxDuration = 60; // Vercel Pro: 60s, Hobby: 10s

// Active default Serper.dev API Key for instant Google Maps results
const DEFAULT_SERPER_KEY = '48853f5c845df9f552b47f65a2364377131b6e1d';

interface FindRequest {
  niche: string;
  city: string;
  country: string;
  maxResults: number;
  apiKey?: string;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0',
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function extractEmails(text: string): string[] {
  const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex) || [];
  const blacklist = [
    'example.com', 'sentry.io', 'w3.org', 'schema.org', 'cloudflare',
    'google.com', 'apple.com', 'facebook.com', 'sentry.invalid',
    'example.org', 'wixpress.com', 'squarespace.com', 'wordpress.com',
    'gravatar.com', 'yourdomain.com', 'email.com', 'test.com',
    'yourcompany.com', 'company.com', 'domain.com', 'website.com',
    'yellowpages.com', 'yelp.com', 'yelpcdn.com', 'maps.google.com',
    'googleapis.com', 'gstatic.com', 'googleusercontent.com', 'fbcdn.net',
    'amazonaws.com', 'akamai.com', 'jquery.com', 'bootstrapcdn.com',
    'bing.com', 'duckduckgo.com', 'microsoft.com',
  ];
  const valid = matches.filter(e =>
    !blacklist.some(bl => e.toLowerCase().includes(bl)) &&
    !e.includes('..') && e.length < 60 && !e.startsWith('.') &&
    !/\.(png|jpg|gif|svg|css|js|ico|woff)$/i.test(e)
  );
  return Array.from(new Set(valid));
}

function extractPhones(text: string): string[] {
  const phoneRegex = /(?:\+?[\d]{1,3}[\s.\-]?)?\(?[\d]{2,4}\)?[\s.\-]?[\d]{3,4}[\s.\-]?[\d]{3,4}/g;
  const matches = text.match(phoneRegex) || [];
  const valid = matches.map(p => p.trim()).filter(p => {
    const digits = p.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15;
  });
  return Array.from(new Set(valid));
}

function decodeHtml(str: string): string {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>')
    .replace(/\\u0026/g, '&')
    .replace(/\\n/g, ' ')
    .trim();
}

function decodeBingUrl(url: string): string {
  try {
    const uMatch = url.match(/(?:&|&amp;)u=a1([^&]+)/);
    if (uMatch) {
      const b64 = uMatch[1].replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4;
      const paddedB64 = pad ? b64 + '='.repeat(4 - pad) : b64;
      return Buffer.from(paddedB64, 'base64').toString('utf-8');
    }
  } catch { }
  return url;
}

async function fetchHtml(url: string, timeoutMs = 6000, extraHeaders: Record<string, string> = {}): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: {
        'User-Agent': getRandomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
        ...extraHeaders,
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);
    if (!res.ok) return '';
    return await res.text();
  } catch {
    return '';
  }
}

async function quickScrapeWebsite(url: string): Promise<{ email: string; phone: string }> {
  let email = '';
  let phone = '';
  if (!url || !url.startsWith('http') || url.includes('yelp.com') || url.includes('yellowpages.com')) {
    return { email, phone };
  }

  try {
    const html = await fetchHtml(url, 2500);
    if (!html) return { email, phone };

    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    const emails = extractEmails(text);
    const phones = extractPhones(text);

    if (emails.length) email = emails[0];
    if (phones.length) phone = phones[0];
  } catch { }

  return { email, phone };
}

interface BusinessItem {
  name: string;
  phone: string;
  email?: string;
  address: string;
  website: string;
  rating?: string;
  source: string;
}

// ════════════════════════════════════════════════════
// SERPER.DEV GOOGLE PLACES API SCRAPER
// ════════════════════════════════════════════════════
async function scrapeSerperGooglePlaces(niche: string, city: string, country: string, apiKey: string): Promise<BusinessItem[]> {
  const results: BusinessItem[] = [];
  try {
    const queryPlaces = `${niche} in ${city} ${country}`;
    const querySearch = `${niche} ${city} ${country} phone email website`;

    const placesPromise = fetch('https://google.serper.dev/places', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: queryPlaces, num: 40 }),
    });

    const searchPromise = fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: querySearch, num: 40 }),
    });

    const [placesRes, searchRes] = await Promise.allSettled([placesPromise, searchPromise]);

    if (placesRes.status === 'fulfilled' && placesRes.value.ok) {
      const data = await placesRes.value.json();
      if (Array.isArray(data.places)) {
        for (const p of data.places) {
          const name = p.title || p.name;
          if (!name) continue;

          results.push({
            name,
            phone: p.phoneNumber || p.phone || '',
            address: p.address || `${city}, ${country}`,
            website: p.website || '',
            rating: p.rating ? `⭐ ${p.rating} (${p.ratingCount || 0})` : '⭐ Google Maps',
            source: 'Google Maps API',
          });
        }
      }
    }

    if (searchRes.status === 'fulfilled' && searchRes.value.ok) {
      const searchData = await searchRes.value.json();
      if (Array.isArray(searchData.organic)) {
        for (const item of searchData.organic) {
          const name = item.title ? item.title.split('-')[0].split('|')[0].trim() : '';
          const snippet = item.snippet || '';
          const siteUrl = item.link || '';

          if (
            name && name.length > 2 && name.length < 80 &&
            !siteUrl.includes('google.com') && !siteUrl.includes('zocdoc.com') && !siteUrl.includes('yelp.com')
          ) {
            const extractedEmails = extractEmails(snippet);
            const extractedPhones = extractPhones(snippet);

            const existing = results.find(r => r.name.toLowerCase() === name.toLowerCase());
            if (existing) {
              if (!existing.email && extractedEmails.length) existing.email = extractedEmails[0];
              if (!existing.phone && extractedPhones.length) existing.phone = extractedPhones[0];
              if (!existing.website) existing.website = siteUrl;
            } else {
              results.push({
                name,
                phone: extractedPhones[0] || '',
                email: extractedEmails[0] || '',
                address: `${city}, ${country}`,
                website: siteUrl,
                source: 'Google Search API',
              });
            }
          }
        }
      }
    }

    console.log(`[SerperAPI] Found ${results.length} Google Maps & Search items`);
    return results;

  } catch (err) {
    console.error('[GoogleAPI] Error:', err);
  }

  return results;
}

// ════════════════════════════════════════════════════
// OPENSTREETMAP MAPS SCRAPER
// ════════════════════════════════════════════════════
async function scrapeOSMMaps(niche: string, city: string, country: string): Promise<BusinessItem[]> {
  const results: BusinessItem[] = [];
  try {
    const queries = [`${niche} ${city} ${country}`, `${niche} ${city}`];

    for (const q of queries) {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&extratags=1&limit=50`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'BulkEmailSenderApp/1.0 (contact@dot-skills.com)',
          'Accept': 'application/json',
        }
      });

      if (!res.ok) continue;
      const data = await res.json();

      if (Array.isArray(data)) {
        for (const item of data) {
          const name = item.display_name ? item.display_name.split(',')[0].trim() : '';
          if (!name || name.length < 2) continue;

          const addr = item.address ? 
            [item.address.road, item.address.suburb, item.address.city || item.address.town, item.address.country].filter(Boolean).join(', ') 
            : item.display_name;

          const phone = item.extratags?.phone || item.extratags?.['contact:phone'] || '';
          const website = item.extratags?.website || item.extratags?.['contact:website'] || '';

          if (!results.find(r => r.name.toLowerCase() === name.toLowerCase())) {
            results.push({
              name,
              phone,
              address: addr || `${city}, ${country}`,
              website,
              source: 'Google Maps',
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('[OSMMaps] Error:', err);
  }

  return results;
}

// ════════════════════════════════════════════════════
// YELP SCRAPER
// ════════════════════════════════════════════════════
async function searchYelp(niche: string, city: string): Promise<BusinessItem[]> {
  const results: BusinessItem[] = [];
  const url = `https://www.yelp.com/search?find_desc=${encodeURIComponent(niche)}&find_loc=${encodeURIComponent(city)}`;

  const html = await fetchHtml(url, 8000);
  if (!html || html.length < 4000) return results;

  try {
    const nameRegex1 = /"name":"([^"]{3,80})","neighborhoods"/g;
    let m;
    const names: string[] = [];

    while ((m = nameRegex1.exec(html)) !== null) names.push(decodeHtml(m[1]));

    const phones: string[] = [];
    const phoneRegex = /"phone":"(\(?[0-9][^"]{8,18})"/g;
    while ((m = phoneRegex.exec(html)) !== null) phones.push(m[1]);

    const addresses: string[] = [];
    const addrRegex = /"formattedAddress":"([^"]+)"/g;
    while ((m = addrRegex.exec(html)) !== null) addresses.push(decodeHtml(m[1]));

    for (let i = 0; i < names.length; i++) {
      if (!results.find(r => r.name.toLowerCase() === names[i].toLowerCase())) {
        results.push({
          name: names[i],
          phone: phones[i] || '',
          address: addresses[i] || `${city}`,
          website: '',
          source: 'Yelp',
        });
      }
    }
  } catch (err) {
    console.error('[Yelp] Error:', err);
  }

  return results;
}

// ════════════════════════════════════════════════════
// MAIN STREAMING ROUTE
// ════════════════════════════════════════════════════
export async function POST(request: Request) {
  try {
    const body: FindRequest = await request.json();
    const { niche, city, country, maxResults, apiKey } = body;

    if (!niche || !city) {
      return NextResponse.json({ success: false, message: 'Niche and city are required' }, { status: 400 });
    }

    const activeApiKey = (apiKey && apiKey.trim().length > 5) ? apiKey.trim() : DEFAULT_SERPER_KEY;
    const maxItems = Math.min(maxResults || 50, 100);

    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    (async () => {
      let totalFound = 0;
      const seenNames = new Set<string>();

      const writeLead = async (lead: object) => {
        await writer.write(encoder.encode(JSON.stringify(lead) + '\n'));
      };

      try {
        console.log(`[LeadFinder] Scraping: ${niche} in ${city}, ${country} (APIKey: ${activeApiKey ? 'YES' : 'NO'})`);

        const scraperPromises: Promise<BusinessItem[]>[] = [];

        // 1. Primary: Serper.dev Google Maps & Search API
        if (activeApiKey) {
          scraperPromises.push(scrapeSerperGooglePlaces(niche, city, country, activeApiKey));
        }

        // 2. Complementary: Yelp & OSM Maps
        scraperPromises.push(
          scrapeOSMMaps(niche, city, country),
          searchYelp(niche, city)
        );

        const settled = await Promise.allSettled(scraperPromises);
        const allItems: BusinessItem[] = [];

        for (const res of settled) {
          if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            allItems.push(...res.value);
          }
        }

        console.log(`[LeadFinder] Total raw items collected: ${allItems.length}`);

        for (const item of allItems) {
          if (totalFound >= maxItems) break;
          if (!item.name || seenNames.has(item.name.toLowerCase())) continue;
          seenNames.add(item.name.toLowerCase());

          let email = item.email || '';
          let phone = item.phone;
          const website = item.website;

          if (!email && website && website.startsWith('http')) {
            const contacts = await quickScrapeWebsite(website);
            if (contacts.email) email = contacts.email;
            if (!phone && contacts.phone) phone = contacts.phone;
          }

          const lead = {
            id: crypto.randomUUID(),
            businessName: item.name,
            email,
            phone,
            website,
            address: item.address || `${city}, ${country}`,
            niche, city, country,
            status: 'new',
            notes: item.rating ? `⭐ ${item.rating} · ${item.source}` : `📍 ${item.source}`,
            source: item.source,
            communicationHistory: [],
            createdAt: Date.now(),
          };

          totalFound++;
          await writeLead(lead);
          await new Promise(r => setTimeout(r, 20));
        }

        if (totalFound > 0) {
          await writer.write(encoder.encode(
            JSON.stringify({ _done: true, total: totalFound }) + '\n'
          ));
        } else {
          await writer.write(encoder.encode(
            JSON.stringify({ _error: true, message: `No businesses found for "${niche}" in "${city}". Try another location.` }) + '\n'
          ));
        }

      } catch (error) {
        console.error('[LeadFinder] Stream Error:', error);
      } finally {
        try { await writer.close(); } catch { }
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive',
        'X-Content-Type-Options': 'nosniff',
      },
    });

  } catch (error: any) {
    console.error('[LeadFinder] Init Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal error' }, { status: 500 });
  }
}
