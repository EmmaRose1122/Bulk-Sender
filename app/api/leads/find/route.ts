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
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
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
        'Pragma': 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
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
    const html = await fetchHtml(url, 10000);
    if (!html) return { email, phone };

    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    const emails = extractEmails(text);
    const phones = extractPhones(text);

    if (emails.length) email = emails[0];
    if (phones.length) phone = phones[0];

    // Try contact/about page if email not found
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
          const contactHtml = await fetchHtml(contactUrl, 8000);
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
// GOOGLE MAPS SCRAPER  — Pure fetch, Vercel-safe
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

async function scrapeGoogleMaps(niche: string, city: string, country: string): Promise<GoogleBusiness[]> {
  const results: GoogleBusiness[] = [];

  const query = `${niche} in ${city} ${country}`;
  const encodedQuery = encodeURIComponent(query);

  // Google Maps search URL
  const url = `https://www.google.com/maps/search/${encodedQuery}`;

  console.log(`[GMaps] Fetching: ${url}`);

  const html = await fetchHtml(url, 20000, {
    'Cookie': 'CONSENT=YES+; SameSite=None; Secure',
    'Referer': 'https://www.google.com/',
  });

  if (!html || html.length < 5000) {
    console.log('[GMaps] Empty or too short response');
    return results;
  }

  console.log(`[GMaps] Got ${html.length} bytes`);

  try {
    // ── Strategy 1: Extract from APP_INITIALIZATION_STATE JSON ──
    // Google Maps embeds all business data in a large JS array
    const initStateMatch = html.match(/window\.APP_INITIALIZATION_STATE\s*=\s*(\[[\s\S]+?\]);\s*window\.APP_FLAGS/);
    if (initStateMatch) {
      console.log('[GMaps] Found APP_INITIALIZATION_STATE');
      // Parse business names from the state
      const raw = initStateMatch[1];
      extractFromGMapsJSON(raw, results);
    }

    // ── Strategy 2: Extract from embedded JSON data chunks ──
    if (results.length === 0) {
      // Pattern: ["business name", null, ["address"], ...]
      const dataChunks = html.match(/\["([^"]{3,80})",null,\["[^"]{5,}"/g) || [];
      for (const chunk of dataChunks.slice(0, 50)) {
        const nameMatch = chunk.match(/^\["([^"]+)"/);
        if (nameMatch) {
          const name = decodeHtml(nameMatch[1]);
          if (name && !results.find(r => r.name === name)) {
            results.push({
              name, phone: '', address: '', website: '', rating: '', category: niche, mapsUrl: '',
            });
          }
        }
      }
    }

    // ── Strategy 3: Regex on rendered business cards ──
    if (results.length === 0) {
      const bizNameRegex = /data-value="([^"]{3,80})"[^>]*role="article"/g;
      let m;
      while ((m = bizNameRegex.exec(html)) !== null) {
        const name = decodeHtml(m[1]);
        if (name && !results.find(r => r.name === name)) {
          results.push({ name, phone: '', address: '', website: '', rating: '', category: niche, mapsUrl: '' });
        }
      }
    }

    // ── Strategy 4: Extract from Google's JSON data blobs ──
    if (results.length === 0) {
      extractBusinessesFromHTML(html, niche, results);
    }

    // ── Extract phones, addresses, websites from HTML ──
    enrichGMapsResults(html, results);

  } catch (err) {
    console.error('[GMaps] Parse error:', err);
  }

  console.log(`[GMaps] Found ${results.length} businesses`);
  return results;
}

function extractFromGMapsJSON(raw: string, results: GoogleBusiness[]) {
  try {
    // Extract business name patterns from the large JSON blob
    // Google Maps uses: ["Business Name", ..., "address", ..., "phone"]
    const namePattern = /"([A-Z][^"]{2,60})(?:\s+(?:Restaurant|Salon|Clinic|Shop|Store|Services|Agency|Studio|Gym|Center|Centre|Bakery|Spa|Cafe|Bar|Hotel|School|Academy|Institute|Dental|Medical|Legal|Law|Accounting|Real Estate|Auto|Repair|Cleaning|Plumbing|Electric|Roofing|Landscaping|HVAC|Photography|Consulting|Florist|Vet|Optometry|Chiropractic|Fitness|Yoga|Pilates|Coffee|Pizza|Burger|Sushi|Thai|Indian|Chinese|Italian|Mexican|French|Japanese|Korean|American|BBQ|Grill|Diner|Bistro|Pub|Lounge|Club|Bar|Brewery|Winery|Distillery))"/g;

    let m;
    while ((m = namePattern.exec(raw)) !== null) {
      const name = decodeHtml(m[1] + m[2] || m[1]);
      if (name.length > 3 && name.length < 80 && !results.find(r => r.name.toLowerCase() === name.toLowerCase())) {
        results.push({ name, phone: '', address: '', website: '', rating: '', category: '', mapsUrl: '' });
      }
    }

    // Phone pattern in JSON
    const phonePattern = /"(\+?[\d\s\-().]{10,20})"/g;
    let phoneIdx = 0;
    while ((m = phonePattern.exec(raw)) !== null && phoneIdx < results.length) {
      const digits = m[1].replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 15) {
        if (!results[phoneIdx].phone) {
          results[phoneIdx].phone = m[1].trim();
          phoneIdx++;
        }
      }
    }
  } catch { }
}

function extractBusinessesFromHTML(html: string, niche: string, results: GoogleBusiness[]) {
  // Pattern: aria-label on business listing items
  const patterns = [
    // Pattern for listing items with business name
    /aria-label="([^"]{3,80})"\s+[^>]*class="[^"]*Nv2PK[^"]*"/g,
    // Pattern for result headings
    /class="qBF1Pd[^"]*"[^>]*>([^<]{3,80})<\/div>/g,
    // Pattern for business titles
    /"title":"([^"]{3,80})","type":"/g,
    // General named place pattern
    /\["([A-Z][a-zA-Z\s&'.,-]{2,60})",null,\[/g,
  ];

  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(html)) !== null) {
      const name = decodeHtml(m[1]).trim();
      // Filter out generic strings
      if (
        name.length > 3 && name.length < 80 &&
        !name.toLowerCase().includes('google') &&
        !name.toLowerCase().includes('maps') &&
        !name.toLowerCase().includes('search') &&
        !name.match(/^\d+$/) &&
        !results.find(r => r.name.toLowerCase() === name.toLowerCase())
      ) {
        results.push({ name, phone: '', address: '', website: '', rating: '', category: niche, mapsUrl: '' });
      }
    }
    if (results.length > 5) break;
  }
}

function enrichGMapsResults(html: string, results: GoogleBusiness[]) {
  // Extract all phones from HTML
  const allPhones = extractPhones(html.replace(/<[^>]*>/g, ' '));
  const allAddresses: string[] = [];

  // Address pattern in Google Maps HTML
  const addrPattern = /"([^"]{5,80}(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Blvd|Boulevard|Way|Place|Pl|Court|Ct|Circle|Cir|Highway|Hwy|Route|Rte)[^"]{0,40})"/gi;
  let m;
  while ((m = addrPattern.exec(html)) !== null) {
    allAddresses.push(decodeHtml(m[1]));
  }

  // Website pattern
  const websitePattern = /"(https?:\/\/(?!(?:maps|www\.google|goo\.gl|googleapis)[^"]*)[^"]{5,80})"/g;
  const allWebsites: string[] = [];
  while ((m = websitePattern.exec(html)) !== null) {
    const site = m[1];
    if (!site.includes('google') && !site.includes('gstatic') && !site.includes('youtube') && !site.includes('facebook.com/sharer')) {
      allWebsites.push(site);
    }
  }

  // Rating pattern
  const ratingPattern = /"([45](?:\.\d)?)\s*(?:star|★|\()"/gi;
  const allRatings: string[] = [];
  while ((m = ratingPattern.exec(html)) !== null) {
    allRatings.push(m[1]);
  }

  // Assign to results
  for (let i = 0; i < results.length; i++) {
    if (!results[i].phone && allPhones[i]) results[i].phone = allPhones[i];
    if (!results[i].address && allAddresses[i]) results[i].address = allAddresses[i];
    if (!results[i].website && allWebsites[i]) results[i].website = allWebsites[i];
    if (!results[i].rating && allRatings[i]) results[i].rating = allRatings[i];
  }
}

// ── Google Maps Alternative: Use Google Search ──
async function scrapeGoogleSearch(niche: string, city: string, country: string): Promise<GoogleBusiness[]> {
  const results: GoogleBusiness[] = [];
  const query = `${niche} ${city} ${country} contact email phone`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20&gl=us&hl=en`;

  console.log(`[GSearch] Fetching: ${url}`);

  const html = await fetchHtml(url, 15000, {
    'Cookie': 'CONSENT=YES+;',
  });

  if (!html || html.length < 3000) {
    console.log('[GSearch] No response');
    return results;
  }

  console.log(`[GSearch] Got ${html.length} bytes`);

  try {
    // Extract business names + websites from Google Search results
    // Pattern: <h3 class="...">Business Name</h3>
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

    // Also extract from structured data
    const structuredRegex = /"name"\s*:\s*"([^"]{3,80})"\s*,\s*"url"\s*:\s*"(https?:\/\/[^"]+)"/g;
    while ((m = structuredRegex.exec(html)) !== null) {
      const name = decodeHtml(m[1]);
      const website = m[2];
      if (!results.find(r => r.name.toLowerCase() === name.toLowerCase())) {
        results.push({ name, phone: '', address: '', website, rating: '', category: niche, mapsUrl: '' });
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

  console.log(`[GSearch] Found ${results.length} results`);
  return results;
}

// ════════════════════════════════════════════════════
// YELP SCRAPER — kept as backup source
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
    console.log(`[Yelp] Trying: ${url}`);
    html = await fetchHtml(url, 15000);
    if (html && html.length > 10000) {
      console.log(`[Yelp] Got ${html.length} bytes`);
      break;
    }
  }

  if (!html || html.length < 5000) {
    console.log('[Yelp] No usable response');
    return results;
  }

  try {
    // Extract names
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

    // Extract phones
    const phones: string[] = [];
    const phoneRegex = /"phone":"(\(?[0-9][^"]{8,18})"/g;
    while ((m = phoneRegex.exec(html)) !== null) phones.push(m[1]);

    // Extract ratings
    const ratings: { rating: number; reviewCount: number }[] = [];
    const ratingRegex = /"rating":([\d.]+),"reviewCount":(\d+)/g;
    while ((m = ratingRegex.exec(html)) !== null) {
      ratings.push({ rating: parseFloat(m[1]), reviewCount: parseInt(m[2]) });
    }

    // Extract addresses
    const addresses: string[] = [];
    const addrRegex = /"formattedAddress":"([^"]+)"/g;
    while ((m = addrRegex.exec(html)) !== null) addresses.push(decodeHtml(m[1]));

    // Extract Yelp biz URLs
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

    console.log(`[Yelp] Found ${results.length} businesses`);
  } catch (err) {
    console.error('[Yelp] Parse error:', err);
  }

  return results;
}

async function getYelpWebsite(yelpUrl: string): Promise<string> {
  if (!yelpUrl) return '';
  try {
    const html = await fetchHtml(yelpUrl, 8000);
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
// YELLOW PAGES SCRAPER — extra source
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

  console.log(`[YP] Fetching: ${url}`);
  const html = await fetchHtml(url, 12000);

  if (!html || html.length < 3000) {
    console.log('[YP] No response');
    return results;
  }

  console.log(`[YP] Got ${html.length} bytes`);

  try {
    // Name pattern
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

    // Alternative name pattern
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

    console.log(`[YP] Found ${results.length} businesses`);
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

        // ── Run all scrapers in parallel ──────────────
        const [gmapsResults, gsearchResults, yelpResults, ypResults] = await Promise.allSettled([
          scrapeGoogleMaps(niche, city, country),
          scrapeGoogleSearch(niche, city, country),
          searchYelp(niche, city),
          searchYellowPages(niche, city),
        ]);

        const gMapsBiz = gmapsResults.status === 'fulfilled' ? gmapsResults.value : [];
        const gSearchBiz = gsearchResults.status === 'fulfilled' ? gsearchResults.value : [];
        const yelpBiz = yelpResults.status === 'fulfilled' ? yelpResults.value : [];
        const ypBiz = ypResults.status === 'fulfilled' ? ypResults.value : [];

        console.log(`[LeadFinder] Sources: GMaps=${gMapsBiz.length} GSearch=${gSearchBiz.length} Yelp=${yelpBiz.length} YP=${ypBiz.length}`);

        // ── Process Google Maps results ───────────────
        for (const biz of gMapsBiz) {
          if (totalFound >= maxItems) break;
          if (!biz.name || seenNames.has(biz.name.toLowerCase())) continue;
          seenNames.add(biz.name.toLowerCase());

          let email = '';
          let phone = biz.phone;
          let website = biz.website;

          // Scrape website for email
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
            notes: biz.rating ? `⭐ ${biz.rating} · 📍 Google Maps` : '📍 Google Maps',
            source: 'Google Maps',
            communicationHistory: [],
            createdAt: Date.now(),
          };

          totalFound++;
          await writeLead(lead);
          await new Promise(r => setTimeout(r, 150));
        }

        // ── Process Google Search results ─────────────
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
          await new Promise(r => setTimeout(r, 150));
        }

        // ── Process Yelp results ──────────────────────
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
          await new Promise(r => setTimeout(r, 150));
        }

        // ── Process Yellow Pages results ──────────────
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
          await new Promise(r => setTimeout(r, 150));
        }

        // ── Final response ────────────────────────────
        if (totalFound > 0) {
          await writer.write(encoder.encode(
            JSON.stringify({ _done: true, total: totalFound }) + '\n'
          ));
        } else {
          await writeError(
            `No businesses found for "${niche}" in "${city}". Try a different city or niche (e.g. "Dentist" in "New York").`
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
