import { NextResponse } from 'next/server';

interface FindRequest {
  niche: string;
  city: string;
  country: string;
  maxResults: number;
}

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
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
    'yellowpages.com', 'ypcdn.com', 'yp.com',
  ];
  const valid = matches.filter(e =>
    !blacklist.some(bl => e.toLowerCase().includes(bl)) &&
    !e.includes('..') && e.length < 60 && !e.startsWith('.')
  );
  return Array.from(new Set(valid));
}

function extractPhones(text: string): string[] {
  const phoneRegex = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.\-]?\d{3,4}[\s.\-]?\d{3,4}/g;
  const matches = text.match(phoneRegex) || [];
  const valid = matches.map(p => p.trim()).filter(p => {
    const digitsOnly = p.replace(/\D/g, '');
    return digitsOnly.length >= 10 && digitsOnly.length <= 15;
  });
  return Array.from(new Set(valid));
}

async function fetchPage(url: string, timeoutMs = 8000): Promise<string> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      headers: {
        'User-Agent': getRandomUA(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
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

// ==================== SOURCE 0: GOOGLE MAPS (No API Key) ====================
async function searchGoogleMaps(niche: string, city: string, country: string): Promise<{ name: string; phone: string; website: string; address: string; rating: string }[]> {
  const results: { name: string; phone: string; website: string; address: string; rating: string }[] = [];
  try {
    const query = `${niche} in ${city}, ${country}`;
    // Google Maps search URL — returns HTML with embedded JSON data
    const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
    console.log(`[GMaps] Fetching: ${url}`);

    const html = await fetchPage(url, 15000);
    if (!html || html.length < 3000) {
      console.log('[GMaps] Empty or blocked response');
      return results;
    }

    // Google Maps embeds business data in the HTML page as JSON arrays
    // Pattern: look for arrays containing business info between certain markers

    // Method 1: Extract from window.APP_INITIALIZATION_STATE or embedded JSON
    // Business names appear near phone numbers and addresses in predictable patterns

    // Extract business names — they appear in specific JSON string patterns
    // Pattern: ["BusinessName",null,null,null,null,null,null,["address"]
    const namePattern = /\["([^"]{3,60})",null,null,null,null,null,null,\[/g;
    let nameMatch;
    const rawNames: string[] = [];
    while ((nameMatch = namePattern.exec(html)) !== null) {
      const name = nameMatch[1];
      if (name && !name.includes('\\') && !name.startsWith('http') && name.length > 2) {
        rawNames.push(name);
      }
    }

    // Method 2: Extract phone numbers — format like "+1 234-567-8901" in JSON strings
    const allPhones = extractPhones(html);

    // Method 3: Extract addresses — look for street-like patterns near business data
    const addrPattern = /\["([^"]*\d+[^"]*(?:St|Ave|Rd|Blvd|Dr|Ln|Way|Ct|Pl|Hwy|Suite|Floor|#)[^"]*)"/gi;
    let addrMatch;
    const rawAddresses: string[] = [];
    while ((addrMatch = addrPattern.exec(html)) !== null) {
      rawAddresses.push(addrMatch[1]);
    }

    // Method 4: Extract websites from the embedded data
    const websitePattern = /\["(https?:\/\/(?!www\.google|maps\.google|play\.google|support\.google|accounts\.google|policies\.google)[^"]+)"/g;
    let webMatch;
    const rawWebsites: string[] = [];
    while ((webMatch = websitePattern.exec(html)) !== null) {
      const url = webMatch[1];
      if (!url.includes('google.com') && !url.includes('gstatic.com') && !url.includes('googleapis.com') && url.length < 200) {
        rawWebsites.push(url);
      }
    }

    // Method 5: Extract ratings
    const ratingPattern = /(\d\.\d),\s*"(\d+)\s*reviews?"/gi;
    let ratingMatch;
    const rawRatings: string[] = [];
    while ((ratingMatch = ratingPattern.exec(html)) !== null) {
      rawRatings.push(`${ratingMatch[1]} (${ratingMatch[2]} reviews)`);
    }

    // Method 6: Better structured extraction — search for patterns like:
    // [null,"BusinessName"] followed by address and phone data
    const structuredPattern = /\[null,"([^"]{3,60})"\s*(?:,null)*\s*,\s*"([^"]*)"(?:[\s\S]{0,500}?)(\+?\d[\d\s\-().]{8,18}\d)/g;
    let structMatch;
    while ((structMatch = structuredPattern.exec(html)) !== null) {
      const name = structMatch[1];
      const possibleAddr = structMatch[2];
      const phone = structMatch[3];
      if (name && !name.startsWith('http') && name.length > 2) {
        results.push({
          name,
          phone: phone || '',
          address: possibleAddr || `${city}, ${country}`,
          website: '',
          rating: '',
        });
      }
    }

    // If structured extraction didn't work, fall back to matching arrays
    if (results.length === 0 && rawNames.length > 0) {
      for (let i = 0; i < rawNames.length; i++) {
        results.push({
          name: rawNames[i],
          phone: allPhones[i] || '',
          address: rawAddresses[i] || `${city}, ${country}`,
          website: rawWebsites[i] || '',
          rating: rawRatings[i] || '',
        });
      }
    }

    // Deduplicate by name
    const seen = new Set<string>();
    const deduped = results.filter(r => {
      const key = r.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`[GMaps] Found ${deduped.length} businesses`);
    return deduped;
  } catch (err) {
    console.error('[GMaps] Error:', err);
    return results;
  }
}

// ==================== SOURCE 1: YELLOW PAGES ====================
async function searchYellowPages(niche: string, city: string): Promise<{ name: string; phone: string; website: string; address: string }[]> {
  const results: { name: string; phone: string; website: string; address: string }[] = [];
  try {
    const url = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(niche)}&geo_location_terms=${encodeURIComponent(city)}`;
    console.log(`[YP] Fetching: ${url}`);
    const html = await fetchPage(url, 12000);
    if (!html || html.length < 1000) return results;

    // Parse Yellow Pages listings
    // Each result has: class="result", data-company-name, phone in <div class="phones">, website link
    const listingRegex = /<div[^>]*class="[^"]*result[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
    const listings = html.match(listingRegex) || [];

    // Alternate simpler approach: extract structured data
    // Business name from <a class="business-name">
    const nameRegex = /<a[^>]*class="[^"]*business-name[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
    const phoneRegex = /<div[^>]*class="[^"]*phones[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const addrRegex = /<div[^>]*class="[^"]*adr[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    const webRegex = /<a[^>]*class="[^"]*track-visit-website[^"]*"[^>]*href="([^"]+)"/gi;

    const names: string[] = [];
    const phones: string[] = [];
    const addresses: string[] = [];
    const websites: string[] = [];

    let m;
    while ((m = nameRegex.exec(html)) !== null) {
      names.push(m[1].replace(/<[^>]*>/g, '').trim());
    }
    while ((m = phoneRegex.exec(html)) !== null) {
      phones.push(m[1].replace(/<[^>]*>/g, '').trim());
    }
    while ((m = addrRegex.exec(html)) !== null) {
      addresses.push(m[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
    }
    while ((m = webRegex.exec(html)) !== null) {
      websites.push(m[1]);
    }

    // Match up results
    for (let i = 0; i < names.length; i++) {
      results.push({
        name: names[i] || '',
        phone: phones[i] || '',
        address: addresses[i] || '',
        website: websites[i] || '',
      });
    }

    console.log(`[YP] Found ${results.length} listings`);
  } catch (err) {
    console.error('[YP] Error:', err);
  }
  return results;
}

// ==================== SOURCE 2: SEARXNG (Meta Search) ====================
async function searchSearXNG(query: string): Promise<{ title: string; link: string }[]> {
  // Public SearXNG instances that support JSON API
  const instances = [
    'https://search.sapti.me',
    'https://searx.be',
    'https://search.bus-hit.me',
    'https://searx.tiekoetter.com',
    'https://search.ononoki.org',
  ];

  for (const instance of instances) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&categories=general`;
      console.log(`[SearXNG] Trying: ${instance}`);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        headers: {
          'User-Agent': getRandomUA(),
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) continue;
      const data = await res.json();

      if (data.results && data.results.length > 0) {
        console.log(`[SearXNG] ${instance} returned ${data.results.length} results`);
        return data.results.map((r: any) => ({
          title: r.title || '',
          link: r.url || '',
        })).filter((r: any) => r.title && r.link && r.link.startsWith('http'));
      }
    } catch {
      console.log(`[SearXNG] ${instance} failed, trying next...`);
    }
  }

  return [];
}

// ==================== SOURCE 3: BING (Backup) ====================
async function searchBing(query: string, count: number): Promise<{ title: string; link: string }[]> {
  try {
    const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${count}`;
    console.log(`[Bing] Fetching...`);
    const html = await fetchPage(bingUrl, 12000);
    if (!html || html.length < 2000) return [];

    const results: { title: string; link: string }[] = [];
    const resultRegex = /<li\s+class="b_algo"[\s\S]*?<h2>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match;
    while ((match = resultRegex.exec(html)) !== null) {
      const link = match[1];
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      if (link.startsWith('http') && title) {
        results.push({ title, link });
      }
    }
    console.log(`[Bing] Found ${results.length} results`);
    return results;
  } catch {
    return [];
  }
}

// Deep scrape a business website for email
async function scrapeWebsiteForEmail(url: string): Promise<{ email: string; phone: string }> {
  let foundEmail = '';
  let foundPhone = '';

  const pageHtml = await fetchPage(url);
  if (!pageHtml) return { email: '', phone: '' };

  const pageText = pageHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const emails = extractEmails(pageText);
  const phones = extractPhones(pageText);
  if (emails.length > 0) foundEmail = emails[0];
  if (phones.length > 0) foundPhone = phones[0];

  // Try contact/about page
  if (!foundEmail) {
    const contactMatch = pageHtml.match(/href="([^"]*(?:contact|about|reach|connect)[^"]*)"/i);
    if (contactMatch) {
      let contactUrl = contactMatch[1];
      if (!contactUrl.startsWith('http')) {
        try {
          const base = new URL(url);
          contactUrl = `${base.origin}${contactUrl.startsWith('/') ? '' : '/'}${contactUrl}`;
        } catch { return { email: foundEmail, phone: foundPhone }; }
      }
      const contactHtml = await fetchPage(contactUrl);
      if (contactHtml) {
        const contactText = contactHtml.replace(/<[^>]*>/g, ' ');
        if (!foundEmail) {
          const cEmails = extractEmails(contactText);
          if (cEmails.length > 0) foundEmail = cEmails[0];
        }
        if (!foundPhone) {
          const cPhones = extractPhones(contactText);
          if (cPhones.length > 0) foundPhone = cPhones[0];
        }
      }
    }
  }

  return { email: foundEmail, phone: foundPhone };
}

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

      try {
        console.log(`[LeadFinder] Starting search: ${niche} in ${city}, ${country}`);

        // ====== PHASE 0: Google Maps (best structured data, no API key) ======
        const gmapsResults = await searchGoogleMaps(niche, city, country);

        for (let i = 0; i < Math.min(gmapsResults.length, maxItems); i++) {
          const biz = gmapsResults[i];
          if (!biz.name || seenNames.has(biz.name.toLowerCase())) continue;
          seenNames.add(biz.name.toLowerCase());

          let email = '';
          let phone = biz.phone;

          // If Maps gave us a website, scrape it for email
          if (biz.website) {
            const details = await scrapeWebsiteForEmail(biz.website);
            email = details.email;
            if (!phone && details.phone) phone = details.phone;
          }

          const lead = {
            id: crypto.randomUUID(),
            businessName: biz.name,
            email,
            phone,
            website: biz.website,
            address: biz.address || `${city}, ${country}`,
            niche, city, country,
            status: 'new', notes: biz.rating ? `Rating: ${biz.rating}` : '',
            communicationHistory: [],
            createdAt: Date.now(),
          };

          totalFound++;
          await writer.write(encoder.encode(JSON.stringify(lead) + '\n'));
          await new Promise(r => setTimeout(r, 200));
        }

        // ====== PHASE 1: Yellow Pages (best for structured business data) ======
        if (totalFound < maxItems) {
        const ypResults = await searchYellowPages(niche, city);

        for (let i = 0; i < Math.min(ypResults.length, maxItems - totalFound); i++) {
          const biz = ypResults[i];
          if (!biz.name || seenNames.has(biz.name.toLowerCase())) continue;
          seenNames.add(biz.name.toLowerCase());

          let email = '';
          let phone = biz.phone;

          // If YP gave us a website, scrape it for email
          if (biz.website) {
            const details = await scrapeWebsiteForEmail(biz.website);
            email = details.email;
            if (!phone && details.phone) phone = details.phone;
          }

          const lead = {
            id: crypto.randomUUID(),
            businessName: biz.name,
            email,
            phone,
            website: biz.website,
            address: biz.address || `${city}, ${country}`,
            niche, city, country,
            status: 'new', notes: '',
            communicationHistory: [],
            createdAt: Date.now(),
          };

          totalFound++;
          await writer.write(encoder.encode(JSON.stringify(lead) + '\n'));
          await new Promise(r => setTimeout(r, 200));
        }
        }

        // ====== PHASE 2: SearXNG meta-search (if need more results) ======
        if (totalFound < maxItems) {
          const query = `${niche} in ${city} ${country} contact email`;
          const searxResults = await searchSearXNG(query);

          for (let i = 0; i < Math.min(searxResults.length, maxItems - totalFound); i++) {
            const result = searxResults[i];
            const cleanName = result.title.replace(/\|.*/, '').replace(/-\s*$/, '').trim();
            if (!cleanName || seenNames.has(cleanName.toLowerCase())) continue;
            seenNames.add(cleanName.toLowerCase());

            const details = await scrapeWebsiteForEmail(result.link);

            const lead = {
              id: crypto.randomUUID(),
              businessName: cleanName,
              email: details.email,
              phone: details.phone,
              website: result.link,
              address: `${city}, ${country}`,
              niche, city, country,
              status: 'new', notes: '',
              communicationHistory: [],
              createdAt: Date.now(),
            };

            totalFound++;
            await writer.write(encoder.encode(JSON.stringify(lead) + '\n'));
            await new Promise(r => setTimeout(r, 300));
          }
        }

        // ====== PHASE 3: Bing fallback ======
        if (totalFound < maxItems) {
          const query = `${niche} in ${city} ${country} contact`;
          const bingResults = await searchBing(query, maxItems - totalFound);

          for (let i = 0; i < Math.min(bingResults.length, maxItems - totalFound); i++) {
            const result = bingResults[i];
            const cleanName = result.title.replace(/\|.*/, '').replace(/-\s*$/, '').trim();
            if (!cleanName || seenNames.has(cleanName.toLowerCase())) continue;
            seenNames.add(cleanName.toLowerCase());

            const details = await scrapeWebsiteForEmail(result.link);

            const lead = {
              id: crypto.randomUUID(),
              businessName: cleanName,
              email: details.email,
              phone: details.phone,
              website: result.link,
              address: `${city}, ${country}`,
              niche, city, country,
              status: 'new', notes: '',
              communicationHistory: [],
              createdAt: Date.now(),
            };

            totalFound++;
            await writer.write(encoder.encode(JSON.stringify(lead) + '\n'));
            await new Promise(r => setTimeout(r, 300));
          }
        }

        // Final status
        if (totalFound === 0) {
          await writer.write(encoder.encode(
            JSON.stringify({ _error: true, message: `No businesses found for "${niche}" in "${city}". Try a broader niche or larger city.` }) + '\n'
          ));
        } else {
          await writer.write(encoder.encode(
            JSON.stringify({ _done: true, total: totalFound }) + '\n'
          ));
        }

      } catch (error) {
        console.error('[LeadFinder] Error:', error);
        await writer.write(encoder.encode(
          JSON.stringify({ _error: true, message: 'Scraping error occurred. Please try again.' }) + '\n'
        ));
      } finally {
        try { await writer.close(); } catch {}
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
        'Connection': 'keep-alive',
      }
    });

  } catch (error: any) {
    console.error('[LeadFinder] Init Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal error' }, { status: 500 });
  }
}
