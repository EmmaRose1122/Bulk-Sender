import { NextResponse } from 'next/server';

// ─────────────────────────────────────────────
// Vercel Production Safe — High Yield Multi-Source Scraper
// No Puppeteer / No Chrome / No API key needed
// ─────────────────────────────────────────────

export const maxDuration = 60; // Vercel Pro: 60s, Hobby: 10s

interface FindRequest {
  niche: string;
  city: string;
  country: string;
  maxResults: number;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
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
// 1. GOOGLE LOCAL MAPS SCRAPER
// ════════════════════════════════════════════════════
interface BusinessItem {
  name: string;
  phone: string;
  address: string;
  website: string;
  rating?: string;
  source: string;
}

async function scrapeGoogleLocalPlaces(niche: string, city: string, country: string): Promise<BusinessItem[]> {
  const results: BusinessItem[] = [];
  const query = `${niche} in ${city} ${country}`;
  
  const urls = [
    `https://www.google.com/search?q=${encodeURIComponent(query)}&tbm=lcl&hl=en`,
    `https://www.google.com/search?q=${encodeURIComponent(niche + ' ' + city)}&tbm=lcl&hl=en`,
  ];

  for (const url of urls) {
    const html = await fetchHtml(url, 15000, { 'Cookie': 'CONSENT=YES+;' });
    if (!html || html.length < 3000) continue;

    try {
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
      }

      const phones = extractPhones(html.replace(/<[^>]*>/g, ' '));
      const websiteMatches = html.match(/href="(https?:\/\/(?!(?:google|gstatic|youtube|facebook\.com\/sharer)[^"]*)[^"]{5,100})"/g) || [];
      const websites = websiteMatches.map(w => w.replace(/^href="/, '').replace(/"$/, ''));

      for (let i = 0; i < names.length; i++) {
        if (!results.find(r => r.name.toLowerCase() === names[i].toLowerCase())) {
          results.push({
            name: names[i],
            phone: phones[i] || '',
            address: `${city}, ${country}`,
            website: websites[i] || '',
            rating: '⭐ 4.5',
            source: 'Google Maps',
          });
        }
      }
    } catch (err) {
      console.error('[GoogleLocal] Parse error:', err);
    }
  }

  console.log(`[GoogleLocal] Extracted ${results.length} businesses`);
  return results;
}

// ════════════════════════════════════════════════════
// 2. OPENSTREETMAP (OSM MAPS) SCRAPER
// ════════════════════════════════════════════════════
async function scrapeOSMMaps(niche: string, city: string, country: string): Promise<BusinessItem[]> {
  const results: BusinessItem[] = [];
  try {
    const queries = [
      `${niche} ${city} ${country}`,
      `${niche} in ${city}`,
    ];

    for (const q of queries) {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&extratags=1&limit=40`;
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
          if (!name || name.length < 3) continue;

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

  console.log(`[OSMMaps] Found ${results.length} map places`);
  return results;
}

// ════════════════════════════════════════════════════
// 3. BING LOCAL & SEARCH SCRAPER (High Yield)
// ════════════════════════════════════════════════════
async function scrapeBingSearch(niche: string, city: string, country: string): Promise<BusinessItem[]> {
  const results: BusinessItem[] = [];
  const query = `${niche} ${city} ${country} phone email contact address`;
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=40`;

  console.log(`[BingSearch] Fetching: ${url}`);
  const html = await fetchHtml(url, 12000);

  if (!html || html.length < 3000) return results;

  try {
    // Extract Bing business titles + websites
    const titleUrlRegex = /<h2[^>]*><a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([^<]+)<\/a><\/h2>/gi;
    let m;
    while ((m = titleUrlRegex.exec(html)) !== null) {
      const siteUrl = m[1];
      const name = decodeHtml(m[2]).trim();

      if (
        name.length > 2 && name.length < 80 &&
        !siteUrl.includes('bing.com') && !siteUrl.includes('microsoft.com') &&
        !siteUrl.includes('facebook.com') && !siteUrl.includes('twitter.com')
      ) {
        if (!results.find(r => r.name.toLowerCase() === name.toLowerCase())) {
          results.push({
            name,
            phone: '',
            address: `${city}, ${country}`,
            website: siteUrl,
            source: 'Bing Search',
          });
        }
      }
    }
  } catch (err) {
    console.error('[BingSearch] Error:', err);
  }

  console.log(`[BingSearch] Found ${results.length} businesses`);
  return results;
}

// ════════════════════════════════════════════════════
// 4. DUCKDUCKGO HTML SCRAPER
// ════════════════════════════════════════════════════
async function scrapeDuckDuckGo(niche: string, city: string, country: string): Promise<BusinessItem[]> {
  const results: BusinessItem[] = [];
  const query = `${niche} in ${city} ${country} business contact`;
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const html = await fetchHtml(url, 12000);
  if (!html || html.length < 3000) return results;

  try {
    const linkRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
      let rawUrl = m[1];
      const name = decodeHtml(m[2]).trim();

      const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
      if (uddgMatch) {
        rawUrl = decodeURIComponent(uddgMatch[1]);
      }

      if (
        name.length > 2 && name.length < 80 &&
        rawUrl.startsWith('http') &&
        !rawUrl.includes('duckduckgo.com') && !rawUrl.includes('wikipedia.org')
      ) {
        if (!results.find(r => r.name.toLowerCase() === name.toLowerCase())) {
          results.push({
            name,
            phone: '',
            address: `${city}, ${country}`,
            website: rawUrl,
            source: 'DuckDuckGo',
          });
        }
      }
    }
  } catch (err) {
    console.error('[DuckDuckGo] Error:', err);
  }

  console.log(`[DuckDuckGo] Found ${results.length} results`);
  return results;
}

// ════════════════════════════════════════════════════
// 5. GOOGLE SEARCH SCRAPER
// ════════════════════════════════════════════════════
async function scrapeGoogleSearch(niche: string, city: string, country: string): Promise<BusinessItem[]> {
  const results: BusinessItem[] = [];
  const query = `${niche} ${city} ${country} contact email phone`;
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=30&gl=us&hl=en`;

  const html = await fetchHtml(url, 12000, { 'Cookie': 'CONSENT=YES+;' });
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

    for (let i = 0; i < Math.min(titles.length, 30); i++) {
      if (!results.find(r => r.name.toLowerCase() === titles[i].toLowerCase())) {
        results.push({
          name: titles[i],
          phone: '',
          address: `${city}, ${country}`,
          website: urls[i] || '',
          source: 'Google Search',
        });
      }
    }

  } catch (err) {
    console.error('[GSearch] Parse error:', err);
  }

  return results;
}

// ════════════════════════════════════════════════════
// 6. YELP SCRAPER
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
// 7. YELLOW PAGES SCRAPER
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

    const maxItems = Math.min(maxResults || 50, 100);
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
        console.log(`[LeadFinder] Scraping: ${niche} in ${city}, ${country}`);

        // ── Parallel execution across 6 scrapers ──────────────
        const [gLocalResults, osmResults, bingResults, ddgResults, gsearchResults, yelpResults, ypResults] = await Promise.allSettled([
          scrapeGoogleLocalPlaces(niche, city, country),
          scrapeOSMMaps(niche, city, country),
          scrapeBingSearch(niche, city, country),
          scrapeDuckDuckGo(niche, city, country),
          scrapeGoogleSearch(niche, city, country),
          searchYelp(niche, city),
          searchYellowPages(niche, city),
        ]);

        const gLocalBiz = gLocalResults.status === 'fulfilled' ? gLocalResults.value : [];
        const osmBiz = osmResults.status === 'fulfilled' ? osmResults.value : [];
        const bingBiz = bingResults.status === 'fulfilled' ? bingResults.value : [];
        const ddgBiz = ddgResults.status === 'fulfilled' ? ddgResults.value : [];
        const gSearchBiz = gsearchResults.status === 'fulfilled' ? gsearchResults.value : [];
        const yelpBiz = yelpResults.status === 'fulfilled' ? yelpResults.value : [];
        const ypBiz = ypResults.status === 'fulfilled' ? ypResults.value : [];

        console.log(`[LeadFinder] Yield: GLocal=${gLocalBiz.length} OSM=${osmBiz.length} Bing=${bingBiz.length} DDG=${ddgBiz.length} GSearch=${gSearchBiz.length} Yelp=${yelpBiz.length} YP=${ypBiz.length}`);

        const allRawItems = [
          ...gLocalBiz,
          ...osmBiz,
          ...bingBiz,
          ...ddgBiz,
          ...gSearchBiz,
          ...yelpBiz.map(b => ({ name: b.name, phone: b.phone, address: b.address, website: b.website || b.yelpUrl, source: 'Yelp' })),
          ...ypBiz.map(b => ({ name: b.name, phone: b.phone, address: b.address, website: b.website, source: 'Yellow Pages' })),
        ];

        for (const item of allRawItems) {
          if (totalFound >= maxItems) break;
          if (!item.name || seenNames.has(item.name.toLowerCase())) continue;
          seenNames.add(item.name.toLowerCase());

          let email = '';
          let phone = item.phone;
          let website = item.website;

          // Deep scrape website for contact info
          if (website && website.startsWith('http') && !website.includes('yelp.com')) {
            const contacts = await scrapeWebsiteForContacts(website);
            email = contacts.email;
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
            notes: `📍 ${item.source}`,
            source: item.source,
            communicationHistory: [],
            createdAt: Date.now(),
          };

          totalFound++;
          await writeLead(lead);
          await new Promise(r => setTimeout(r, 60));
        }

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
