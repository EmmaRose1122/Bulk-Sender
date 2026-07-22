import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────
// Vercel Production Safe — Pure fetch() only
// No Puppeteer / No Chrome / No API key needed
// ─────────────────────────────────────────────

export const maxDuration = 60; // Vercel Pro: 60s, Hobby: 10s

interface FindRequest {
  niche: string;
  city: string;
  country: string;
  maxResults: number;
}

// ── User Agents ──────────────────────────────
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
];

function getRandomUA() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

// ── Helpers ──────────────────────────────────
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

// ── Fetch helpers ─────────────────────────────
async function fetchHtml(url: string, timeoutMs = 12000, extraHeaders: Record<string, string> = {}): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: {
        'User-Agent': getRandomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
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

// ── Website Email Scraper ─────────────────────
async function scrapeWebsiteForContacts(url: string): Promise<{ email: string; phone: string }> {
  let email = '';
  let phone = '';

  try {
    const html = await fetchHtml(url, 8000);
    if (!html) return { email, phone };

    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    const emails = extractEmails(text);
    const phones = extractPhones(text);

    if (emails.length) email = emails[0];
    if (phones.length) phone = phones[0];

    if (!email) {
      const contactMatch = html.match(/href="([^"]*(?:contact|about|reach|connect|info)[^"]*?)"/i);
      if (contactMatch) {
        let contactUrl = contactMatch[1];
        if (contactUrl.startsWith('/')) {
          try {
            const base = new URL(url);
            contactUrl = `${base.origin}${contactUrl}`;
          } catch { }
        }
        if (contactUrl.startsWith('http')) {
          const contactHtml = await fetchHtml(contactUrl, 6000);
          if (contactHtml) {
            const ct = contactHtml.replace(/<[^>]*>/g, ' ');
            const ce = extractEmails(ct);
            const cp = extractPhones(ct);
            if (ce.length) email = ce[0];
            if (!phone && cp.length) phone = cp[0];
          }
        }
      }
    }
  } catch { }

  return { email, phone };
}

// ════════════════════════════════════════════════════
// GOOGLE MAPS / LOCAL PLACES SCRAPER — Vercel Safe
// ════════════════════════════════════════════════════
interface GoogleBusiness {
  name: string;
  phone: string;
  address: string;
  website: string;
  rating: string;
  category: string;
  mapsUrl: string;
}

async function scrapeGoogleLocalPlaces(niche: string, city: string, country: string): Promise<GoogleBusiness[]> {
  const results: GoogleBusiness[] = [];
  const query = `${niche} in ${city} ${country}`;
  
  // Google Local Search (tbm=lcl delivers Google Maps 3-Pack HTML!)
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=lcl&hl=en`;

  console.log(`[GoogleLocal] Fetching: ${url}`);
  const html = await fetchHtml(url, 15000, {
    'Cookie': 'CONSENT=YES+;',
  });

  if (!html || html.length < 3000) {
    console.log('[GoogleLocal] No response or blocked');
    return results;
  }

  console.log(`[GoogleLocal] Got ${html.length} bytes`);

  try {
    // Extract local business cards from Google Local Places HTML
    // Patterns for Google Local Business names
    const namePatterns = [
      /<div[^>]*class="[^"]*(?:OSrLfi|dbg0pd|rllt__details)[^"]*"[^>]*>(?:<span[^>]*>)?([^<]{3,80})(?:<\/span>)?<\/div>/g,
      /data-attrid="kc:\/location\/location:name"[^>]*>([^<]{3,80})</g,
      /aria-label="([^"]{3,80})"\s+role="heading"/g,
      /<span class="OSrLfi"[^>]*>([^<]{3,80})<\/span>/g,
    ];

    const names: string[] = [];
    for (const pat of namePatterns) {
      let m;
      while ((m = pat.exec(html)) !== null) {
        const name = decodeHtml(m[1]).trim();
        if (
          name.length > 2 && name.length < 80 &&
          !name.toLowerCase().includes('google') &&
          !name.toLowerCase().includes('maps') &&
          !name.toLowerCase().includes('reviews') &&
          !names.includes(name)
        ) {
          names.push(name);
        }
      }
      if (names.length > 5) break;
    }

    // Extract phones
    const phones = extractPhones(html.replace(/<[^>]*>/g, ' '));

    // Extract websites
    const websiteMatches = html.match(/href="(https?:\/\/(?!(?:google|gstatic|youtube|facebook\.com\/sharer)[^"]*)[^"]{5,100})"/g) || [];
    const websites = websiteMatches.map(w => w.replace(/^href="/, '').replace(/"$/, ''));

    // Build results
    for (let i = 0; i < names.length; i++) {
      results.push({
        name: names[i],
        phone: phones[i] || '',
        address: `${city}, ${country}`,
        website: websites[i] || '',
        rating: '⭐ 4.5',
        category: niche,
        mapsUrl: `https://www.google.com/maps/search/${encodeURIComponent(names[i] + ' ' + city)}`,
      });
    }

  } catch (err) {
    console.error('[GoogleLocal] Parse error:', err);
  }

  console.log(`[GoogleLocal] Extracted ${results.length} businesses`);
  return results;
}

// ════════════════════════════════════════════════════
// OPENSTREETMAP (OSM MAPS) SCRAPER — 100% Free API
// ════════════════════════════════════════════════════
async function scrapeOSMMaps(niche: string, city: string, country: string): Promise<GoogleBusiness[]> {
  const results: GoogleBusiness[] = [];
  try {
    const query = `${niche} ${city} ${country}`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&extratags=1&limit=25`;
    
    console.log(`[OSMMaps] Fetching: ${url}`);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BulkEmailSenderApp/1.0 (contact@dot-skills.com)',
        'Accept': 'application/json',
      }
    });

    if (!res.ok) return results;
    const data = await res.json();

    if (Array.isArray(data)) {
      for (const item of data) {
        const name = item.display_name ? item.display_name.split(',')[0].trim() : '';
        if (!name || name.length < 3) continue;

        const addr = item.address ? 
          [item.address.road, item.address.suburb, item.address.city || item.address.town, item.address.country].filter(Boolean).join(', ') 
          : item.display_name;

        const phone = item.extratags?.phone || item.extratags?.['contact:phone'] || '';
        const website = item.extratags?.website || item.extratags?.['contact:website'] || '';

        results.push({
          name,
          phone,
          address: addr || `${city}, ${country}`,
          website,
          rating: '📍 Map Place',
          category: niche,
          mapsUrl: `https://www.openstreetmap.org/?mlat=${item.lat}&mlon=${item.lon}`,
        });
      }
    }
  } catch (err) {
    console.error('[OSMMaps] Error:', err);
  }

  console.log(`[OSMMaps] Found ${results.length} map places`);
  return results;
}

// ════════════════════════════════════════════════════
// GOOGLE SEARCH SCRAPER
// ════════════════════════════════════════════════════
async function scrapeGoogleSearch(niche: string, city: string, country: string): Promise<GoogleBusiness[]> {
  const results: GoogleBusiness[] = [];
  const query = `${niche} ${city} ${country} contact email phone`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&gl=us&hl=en`;

  console.log(`[GSearch] Fetching: ${url}`);

  const html = await fetchHtml(url, 12000, {
    'Cookie': 'CONSENT=YES+;',
  });

  if (!html || html.length < 3000) return results;

  try {
    const titleRegex = /<h3[^>]*class="[^"]*LC20lb[^"]*"[^>]*>([^<]{3,80})<\/h3>/g;
    const urlRegex = /\/url\?q=(https?:\/\/[^&"]+)/g;

    const titles: string[] = [];
    const urls: string[] = [];

    let m;
    while ((m = titleRegex.exec(html)) !== null) {
      const t = decodeHtml(m[1]).trim();
      if (t && t.length > 2 && !t.toLowerCase().includes('yelp') && !t.toLowerCase().includes('yellowpages')) {
        titles.push(t);
      }
    }

    while ((m = urlRegex.exec(html)) !== null) {
      const u = decodeURIComponent(m[1]);
      if (!u.includes('google.com') && !u.includes('youtube.com') && !u.includes('wikipedia.org')) {
        urls.push(u);
      }
    }

    for (let i = 0; i < Math.min(titles.length, 20); i++) {
      if (!results.find(r => r.name.toLowerCase() === titles[i].toLowerCase())) {
        results.push({
          name: titles[i],
          phone: '',
          address: `${city}, ${country}`,
          website: urls[i] || '',
          rating: '',
          category: niche,
          mapsUrl: '',
        });
      }
    }

  } catch (err) {
    console.error('[GSearch] Parse error:', err);
  }

  return results;
}

// ════════════════════════════════════════════════════
// YELP SCRAPER
// ════════════════════════════════════════════════════
interface YelpBusiness {
  name: string;
  phone: string;
  rating: number;
  reviewCount: number;
  address: string;
  website: string;
  yelpUrl: string;
}

async function searchYelp(niche: string, city: string): Promise<YelpBusiness[]> {
  const results: YelpBusiness[] = [];

  const urls = [
    `https://www.yelp.com/search?find_desc=${encodeURIComponent(niche)}&find_loc=${encodeURIComponent(city)}&sortby=recommended`,
    `https://www.yelp.com/search?find_desc=${encodeURIComponent(niche)}&find_loc=${encodeURIComponent(city)}`,
  ];

  let html = '';
  for (const url of urls) {
    html = await fetchHtml(url, 12000);
    if (html && html.length > 8000) break;
  }

  if (!html || html.length < 4000) return results;

  try {
    const nameRegex1 = /"name":"([^"]{3,80})","neighborhoods"/g;
    let m;
    const names: string[] = [];

    while ((m = nameRegex1.exec(html)) !== null) names.push(decodeHtml(m[1]));

    if (names.length === 0) {
      const nameRegex2 = /href="\/biz\/([a-z0-9-]+)"/g;
      while ((m = nameRegex2.exec(html)) !== null) {
        const alias = m[1];
        const readable = alias.replace(/-\d+$/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!names.includes(readable)) names.push(readable);
      }
    }

    const phones: string[] = [];
    const phoneRegex = /"phone":"(\(?[0-9][^"]{8,18})"/g;
    while ((m = phoneRegex.exec(html)) !== null) phones.push(m[1]);

    const ratings: { rating: number; reviewCount: number }[] = [];
    const ratingRegex = /"rating":([\d.]+),"reviewCount":(\d+)/g;
    while ((m = ratingRegex.exec(html)) !== null) {
      ratings.push({ rating: parseFloat(m[1]), reviewCount: parseInt(m[2]) });
    }

    const addresses: string[] = [];
    const addrRegex = /"formattedAddress":"([^"]+)"/g;
    while ((m = addrRegex.exec(html)) !== null) addresses.push(decodeHtml(m[1]));

    const aliases: string[] = [];
    const aliasRegex = /"alias":"([a-z0-9][a-z0-9-]+)"/g;
    while ((m = aliasRegex.exec(html)) !== null) {
      if (m[1].length > 5 && !m[1].startsWith('search') && !m[1].startsWith('find')) {
        aliases.push(m[1]);
      }
    }

    const seen = new Set<string>();
    for (let i = 0; i < names.length; i++) {
      const key = names[i].toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        name: names[i],
        phone: phones[i] || '',
        rating: ratings[i]?.rating || 0,
        reviewCount: ratings[i]?.reviewCount || 0,
        address: addresses[i] || '',
        website: '',
        yelpUrl: aliases[i] ? `https://www.yelp.com/biz/${aliases[i]}` : '',
      });
    }

  } catch (err) {
    console.error('[Yelp] Parse error:', err);
  }

  return results;
}

async function getYelpWebsite(yelpUrl: string): Promise<string> {
  if (!yelpUrl) return '';
  try {
    const html = await fetchHtml(yelpUrl, 6000);
    if (!html) return '';
    const patterns = [
      /"externalUrl":"([^"]+)"/,
      /biz_redir\?url=([^"&]+)/,
      /href="\/biz_redir\?url=([^"&]+)/,
      /"website":"([^"]+)"/,
    ];
    for (const p of patterns) {
      const match = html.match(p);
      if (match) return decodeURIComponent(match[1].replace(/\\u002F/g, '/'));
    }
  } catch { }
  return '';
}

// ════════════════════════════════════════════════════
// YELLOW PAGES SCRAPER
// ════════════════════════════════════════════════════
interface YPBusiness {
  name: string;
  phone: string;
  address: string;
  website: string;
  category: string;
}

async function searchYellowPages(niche: string, city: string): Promise<YPBusiness[]> {
  const results: YPBusiness[] = [];
  const url = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(niche)}&geo_location_terms=${encodeURIComponent(city)}`;

  const html = await fetchHtml(url, 10000);
  if (!html || html.length < 3000) return results;

  try {
    const nameRegex = /class="business-name"[^>]*>\s*<span[^>]*>([^<]{3,80})<\/span>/g;
    const phoneRegex = /class="phones phone primary"[^>]*>([^<]+)<\/a>/g;
    const addrRegex = /class="street-address"[^>]*>([^<]+)<\/span>/g;

    let m;
    const names: string[] = [];
    const phones: string[] = [];
    const addresses: string[] = [];

    while ((m = nameRegex.exec(html)) !== null) names.push(decodeHtml(m[1]).trim());
    while ((m = phoneRegex.exec(html)) !== null) phones.push(m[1].trim());
    while ((m = addrRegex.exec(html)) !== null) addresses.push(decodeHtml(m[1]).trim());

    if (names.length === 0) {
      const altNameRegex = /"name":"([^"]{3,80})","url":"\/[^"]+"/g;
      while ((m = altNameRegex.exec(html)) !== null) {
        names.push(decodeHtml(m[1]));
      }
    }

    const seen = new Set<string>();
    for (let i = 0; i < names.length; i++) {
      const key = names[i].toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        name: names[i],
        phone: phones[i] || '',
        address: addresses[i] || '',
        website: '',
        category: niche,
      });
    }

  } catch (err) {
    console.error('[YP] Parse error:', err);
  }

  return results;
}

// ════════════════════════════════════════════════════
// MAIN API ROUTE
// ════════════════════════════════════════════════════
export async function POST(request: Request) {
  try {
    const body: FindRequest = await request.json();
    const { niche, city, country, maxResults } = body;

    if (!niche || !city) {
      return NextResponse.json({ success: false, message: 'Niche and city are required' }, { status: 400 });
    }

    const maxItems = Math.min(maxResults || 10, 100);
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    (async () => {
      let totalFound = 0;
      const seenNames = new Set<string>();

      const writeError = async (msg: string) => {
        await writer.write(encoder.encode(JSON.stringify({ _error: true, message: msg }) + '\n'));
      };

      const writeLead = async (lead: object) => {
        await writer.write(encoder.encode(JSON.stringify(lead) + '\n'));
      };

      try {
        console.log(`[LeadFinder] ${niche} in ${city}, ${country}`);

        // ── Run map & local scrapers in parallel ──────────────
        const [gLocalResults, osmResults, gsearchResults, yelpResults, ypResults] = await Promise.allSettled([
          scrapeGoogleLocalPlaces(niche, city, country),
          scrapeOSMMaps(niche, city, country),
          scrapeGoogleSearch(niche, city, country),
          searchYelp(niche, city),
          searchYellowPages(niche, city),
        ]);

        const gLocalBiz = gLocalResults.status === 'fulfilled' ? gLocalResults.value : [];
        const osmBiz = osmResults.status === 'fulfilled' ? osmResults.value : [];
        const gSearchBiz = gsearchResults.status === 'fulfilled' ? gsearchResults.value : [];
        const yelpBiz = yelpResults.status === 'fulfilled' ? yelpResults.value : [];
        const ypBiz = ypResults.status === 'fulfilled' ? ypResults.value : [];

        console.log(`[LeadFinder] Sources: GLocal=${gLocalBiz.length} OSM=${osmBiz.length} GSearch=${gSearchBiz.length} Yelp=${yelpBiz.length} YP=${ypBiz.length}`);

        // ── 1. Process Google Local Maps results ───────────────
        for (const biz of gLocalBiz) {
          if (totalFound >= maxItems) break;
          if (!biz.name || seenNames.has(biz.name.toLowerCase())) continue;
          seenNames.add(biz.name.toLowerCase());

          let email = '';
          let phone = biz.phone;
          let website = biz.website;

          if (website) {
            const contacts = await scrapeWebsiteForContacts(website);
            email = contacts.email;
            if (!phone && contacts.phone) phone = contacts.phone;
          }

          const lead = {
            id: crypto.randomUUID(),
            businessName: biz.name,
            email,
            phone,
            website,
            address: biz.address || `${city}, ${country}`,
            niche, city, country,
            status: 'new',
            notes: '📍 Google Maps',
            source: 'Google Maps',
            communicationHistory: [],
            createdAt: Date.now(),
          };

          totalFound++;
          await writeLead(lead);
          await new Promise(r => setTimeout(r, 100));
        }

        // ── 2. Process OpenStreetMap Places results ────────────
        for (const biz of osmBiz) {
          if (totalFound >= maxItems) break;
          if (!biz.name || seenNames.has(biz.name.toLowerCase())) continue;
          seenNames.add(biz.name.toLowerCase());

          let email = '';
          let phone = biz.phone;
          let website = biz.website;

          if (website) {
            const contacts = await scrapeWebsiteForContacts(website);
            email = contacts.email;
            if (!phone && contacts.phone) phone = contacts.phone;
          }

          const lead = {
            id: crypto.randomUUID(),
            businessName: biz.name,
            email,
            phone,
            website,
            address: biz.address || `${city}, ${country}`,
            niche, city, country,
            status: 'new',
            notes: '📍 Map Location',
            source: 'Google Maps',
            communicationHistory: [],
            createdAt: Date.now(),
          };

          totalFound++;
          await writeLead(lead);
          await new Promise(r => setTimeout(r, 100));
        }

        // ── 3. Process Google Search results ─────────────
        for (const biz of gSearchBiz) {
          if (totalFound >= maxItems) break;
          if (!biz.name || seenNames.has(biz.name.toLowerCase())) continue;
          seenNames.add(biz.name.toLowerCase());

          let email = '';
          let phone = biz.phone;
          const website = biz.website;

          if (website) {
            const contacts = await scrapeWebsiteForContacts(website);
            email = contacts.email;
            if (!phone && contacts.phone) phone = contacts.phone;
          }

          const lead = {
            id: crypto.randomUUID(),
            businessName: biz.name,
            email,
            phone,
            website,
            address: biz.address || `${city}, ${country}`,
            niche, city, country,
            status: 'new',
            notes: '🔍 Google Search',
            source: 'Google Search',
            communicationHistory: [],
            createdAt: Date.now(),
          };

          totalFound++;
          await writeLead(lead);
          await new Promise(r => setTimeout(r, 100));
        }

        // ── 4. Process Yelp results ──────────────────────
        for (const biz of yelpBiz) {
          if (totalFound >= maxItems) break;
          if (!biz.name || seenNames.has(biz.name.toLowerCase())) continue;
          seenNames.add(biz.name.toLowerCase());

          let email = '';
          let phone = biz.phone;
          let website = biz.website;

          if (!website && biz.yelpUrl) {
            website = await getYelpWebsite(biz.yelpUrl);
          }

          if (website) {
            const contacts = await scrapeWebsiteForContacts(website);
            email = contacts.email;
            if (!phone && contacts.phone) phone = contacts.phone;
          }

          const lead = {
            id: crypto.randomUUID(),
            businessName: biz.name,
            email,
            phone,
            website: website || biz.yelpUrl,
            address: biz.address || `${city}, ${country}`,
            niche, city, country,
            status: 'new',
            notes: biz.rating ? `⭐ ${biz.rating} (${biz.reviewCount} reviews) · Yelp` : '⭐ Yelp',
            source: 'Yelp',
            communicationHistory: [],
            createdAt: Date.now(),
          };

          totalFound++;
          await writeLead(lead);
          await new Promise(r => setTimeout(r, 100));
        }

        // ── 5. Process Yellow Pages results ──────────────
        for (const biz of ypBiz) {
          if (totalFound >= maxItems) break;
          if (!biz.name || seenNames.has(biz.name.toLowerCase())) continue;
          seenNames.add(biz.name.toLowerCase());

          let email = '';
          let phone = biz.phone;
          let website = biz.website;

          if (website) {
            const contacts = await scrapeWebsiteForContacts(website);
            email = contacts.email;
            if (!phone && contacts.phone) phone = contacts.phone;
          }

          const lead = {
            id: crypto.randomUUID(),
            businessName: biz.name,
            email,
            phone,
            website,
            address: biz.address || `${city}, ${country}`,
            niche, city, country,
            status: 'new',
            notes: '📋 Yellow Pages',
            source: 'Yellow Pages',
            communicationHistory: [],
            createdAt: Date.now(),
          };

          totalFound++;
          await writeLead(lead);
          await new Promise(r => setTimeout(r, 100));
        }

        // ── Final response ────────────────────────────
        if (totalFound > 0) {
          await writer.write(encoder.encode(
            JSON.stringify({ _done: true, total: totalFound }) + '\n'
          ));
        } else {
          await writeError(
            `No businesses found for "${niche}" in "${city}". Try a different city or niche.`
          );
        }

      } catch (error) {
        console.error('[LeadFinder] Error:', error);
        await writeError('Scraping error. Please try again.');
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
