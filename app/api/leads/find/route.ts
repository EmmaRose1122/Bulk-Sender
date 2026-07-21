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
    'yellowpages.com', 'yelp.com', 'yelpcdn.com',
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

// ==================== SOURCE 1: YELP (Primary — works from servers!) ====================
interface YelpBusiness {
  name: string;
  phone: string;
  rating: number;
  reviewCount: number;
  address: string;
  website: string;
  yelpUrl: string;
  neighborhoods: string;
}

async function searchYelp(niche: string, city: string): Promise<YelpBusiness[]> {
  const results: YelpBusiness[] = [];
  try {
    const url = `https://www.yelp.com/search?find_desc=${encodeURIComponent(niche)}&find_loc=${encodeURIComponent(city)}`;
    console.log(`[Yelp] Fetching: ${url}`);
    const html = await fetchPage(url, 15000);
    if (!html || html.length < 5000) {
      console.log('[Yelp] Empty response');
      return results;
    }

    // Extract business names: "name":"BusinessName","neighborhoods"
    const nameRegex = /"name":"([^"]{3,80})","neighborhoods"/g;
    const names: string[] = [];
    let m;
    while ((m = nameRegex.exec(html)) !== null) {
      const name = m[1].replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
      names.push(name);
    }

    // Extract phones: "phone":"(xxx) xxx-xxxx"
    const phoneRegex = /"phone":"(\([^"]+)"/g;
    const phones: string[] = [];
    while ((m = phoneRegex.exec(html)) !== null) {
      phones.push(m[1]);
    }

    // Extract ratings: "rating":4.5,"reviewCount":123
    const ratingRegex = /"rating":([\d.]+),"reviewCount":(\d+)/g;
    const ratings: { rating: number; reviewCount: number }[] = [];
    while ((m = ratingRegex.exec(html)) !== null) {
      ratings.push({ rating: parseFloat(m[1]), reviewCount: parseInt(m[2]) });
    }

    // Extract addresses from the page — look for "addressLines" or street patterns
    const addrRegex = /"formattedAddress":"([^"]+)"/g;
    const addresses: string[] = [];
    while ((m = addrRegex.exec(html)) !== null) {
      addresses.push(m[1].replace(/&amp;/g, '&'));
    }

    // Extract business page URLs from alias
    const aliasRegex = /"alias":"([a-z0-9-]+)"/g;
    const aliases: string[] = [];
    while ((m = aliasRegex.exec(html)) !== null) {
      aliases.push(m[1]);
    }

    // Build results
    const seen = new Set<string>();
    for (let i = 0; i < names.length; i++) {
      if (seen.has(names[i].toLowerCase())) continue;
      seen.add(names[i].toLowerCase());

      results.push({
        name: names[i],
        phone: phones[i] || '',
        rating: ratings[i]?.rating || 0,
        reviewCount: ratings[i]?.reviewCount || 0,
        address: addresses[i] || '',
        website: '',
        yelpUrl: aliases[i] ? `https://www.yelp.com/biz/${aliases[i]}` : '',
        neighborhoods: '',
      });
    }

    console.log(`[Yelp] Found ${results.length} businesses`);
  } catch (err) {
    console.error('[Yelp] Error:', err);
  }
  return results;
}

// Get website URL from individual Yelp business page
async function getYelpBusinessWebsite(yelpUrl: string): Promise<string> {
  if (!yelpUrl) return '';
  try {
    const html = await fetchPage(yelpUrl, 8000);
    if (!html) return '';

    // Yelp business pages have "businessWebsite" or external link
    const webMatch = html.match(/"externalUrl":"([^"]+)"/);
    if (webMatch) {
      return decodeURIComponent(webMatch[1].replace(/\\u002F/g, '/'));
    }

    // Alternative: look for redirect link to business website
    const redirectMatch = html.match(/biz_redir\?url=([^"&]+)/);
    if (redirectMatch) {
      return decodeURIComponent(redirectMatch[1]);
    }
  } catch {}
  return '';
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

        // ====== PRIMARY: Yelp (works reliably from servers) ======
        const yelpResults = await searchYelp(niche, city);

        for (let i = 0; i < Math.min(yelpResults.length, maxItems); i++) {
          const biz = yelpResults[i];
          if (!biz.name || seenNames.has(biz.name.toLowerCase())) continue;
          seenNames.add(biz.name.toLowerCase());

          let email = '';
          let phone = biz.phone;
          let website = biz.website;

          // Try to get business website from Yelp page
          if (!website && biz.yelpUrl) {
            website = await getYelpBusinessWebsite(biz.yelpUrl);
          }

          // Scrape business website for email
          if (website) {
            const details = await scrapeWebsiteForEmail(website);
            email = details.email;
            if (!phone && details.phone) phone = details.phone;
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
            notes: biz.rating ? `⭐ ${biz.rating} (${biz.reviewCount} reviews)` : '',
            communicationHistory: [],
            createdAt: Date.now(),
          };

          totalFound++;
          await writer.write(encoder.encode(JSON.stringify(lead) + '\n'));
          await new Promise(r => setTimeout(r, 200));
        }

        // Send final status
        if (totalFound === 0) {
          await writer.write(encoder.encode(
            JSON.stringify({ _error: true, message: `No businesses found for "${niche}" in "${city}". Try a broader niche or larger US city.` }) + '\n'
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
