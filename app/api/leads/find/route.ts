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
  ];
  const valid = matches.filter(e =>
    !blacklist.some(bl => e.toLowerCase().includes(bl)) &&
    !e.includes('..') &&
    e.length < 60 &&
    !e.startsWith('.')
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
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
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

// Strategy 1: DuckDuckGo HTML (most reliable from servers)
async function searchDuckDuckGo(query: string): Promise<{ title: string; link: string }[]> {
  const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const html = await fetchPage(ddgUrl, 12000);
  if (!html) return [];

  const results: { title: string; link: string }[] = [];

  // DuckDuckGo result links
  const linkRegex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    let link = decodeURIComponent(match[1]);
    // DDG wraps links through redirects
    if (link.includes('uddg=')) {
      const uddgMatch = link.match(/uddg=([^&]+)/);
      if (uddgMatch) link = decodeURIComponent(uddgMatch[1]);
    }
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    if (link.startsWith('http') && title && !link.includes('duckduckgo.com')) {
      results.push({ title, link });
    }
  }

  return results;
}

// Strategy 2: Bing search (more server-friendly than Google)
async function searchBing(query: string, count: number): Promise<{ title: string; link: string }[]> {
  const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${count}`;
  const html = await fetchPage(bingUrl, 12000);
  if (!html) return [];

  const results: { title: string; link: string }[] = [];

  // Bing results: <li class="b_algo"><h2><a href="URL">Title</a></h2>
  const resultRegex = /<li\s+class="b_algo"[\s\S]*?<h2>\s*<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = resultRegex.exec(html)) !== null) {
    const link = match[1];
    const title = match[2].replace(/<[^>]*>/g, '').trim();
    if (link.startsWith('http') && title) {
      results.push({ title, link });
    }
  }

  return results;
}

// Strategy 3: Google search (might be blocked from servers)
async function searchGoogle(query: string, count: number): Promise<{ title: string; link: string }[]> {
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=${count}&hl=en`;
  const html = await fetchPage(googleUrl, 10000);
  if (!html || html.length < 5000) return [];

  const results: { title: string; link: string }[] = [];

  const linkRegex = /<a[^>]+href="\/url\?q=([^"&]+)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const rawUrl = decodeURIComponent(match[1]);
    const innerHtml = match[2];
    if (rawUrl.includes('google.com') || rawUrl.includes('youtube.com')) continue;
    if (!rawUrl.startsWith('http')) continue;

    const h3Match = innerHtml.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
    const title = h3Match ? h3Match[1].replace(/<[^>]*>/g, '').trim() : '';
    if (!title) continue;

    results.push({ title, link: rawUrl });
  }

  return results;
}

// Deep scrape: visit website + contact page for email/phone
async function scrapeBusinessDetails(url: string): Promise<{ email: string; phone: string }> {
  let foundEmail = '';
  let foundPhone = '';

  const pageHtml = await fetchPage(url);
  if (!pageHtml) return { email: '', phone: '' };

  const pageText = pageHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  const emails = extractEmails(pageText);
  const phones = extractPhones(pageText);
  if (emails.length > 0) foundEmail = emails[0];
  if (phones.length > 0) foundPhone = phones[0];

  // Try contact/about page if email not found
  if (!foundEmail || !foundPhone) {
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

      try {
        const query = `${niche} in ${city} ${country} contact email`;
        console.log(`[LeadFinder] Searching: "${query}"`);

        // Try all search engines in order of reliability from server
        let searchResults: { title: string; link: string }[] = [];

        // 1. DuckDuckGo (most reliable from servers)
        console.log('[LeadFinder] Trying DuckDuckGo...');
        searchResults = await searchDuckDuckGo(query);
        console.log(`[LeadFinder] DuckDuckGo: ${searchResults.length} results`);

        // 2. Bing fallback
        if (searchResults.length === 0) {
          console.log('[LeadFinder] Trying Bing...');
          searchResults = await searchBing(query, maxItems);
          console.log(`[LeadFinder] Bing: ${searchResults.length} results`);
        }

        // 3. Google fallback
        if (searchResults.length === 0) {
          console.log('[LeadFinder] Trying Google...');
          searchResults = await searchGoogle(query, maxItems);
          console.log(`[LeadFinder] Google: ${searchResults.length} results`);
        }

        // If no search engine worked
        if (searchResults.length === 0) {
          await writer.write(encoder.encode(
            JSON.stringify({ _error: true, message: 'No results found. Search engines may be rate-limiting. Please wait a moment and try again.' }) + '\n'
          ));
          await writer.close();
          return;
        }

        // Process each result
        for (let i = 0; i < Math.min(searchResults.length, maxItems); i++) {
          const result = searchResults[i];

          // Deep scrape each business site
          const details = await scrapeBusinessDetails(result.link);

          const lead = {
            id: crypto.randomUUID(),
            businessName: result.title.replace(/\|.*/, '').replace(/-\s*$/, '').trim() || 'Unknown Business',
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

          // Rate limit
          await new Promise(r => setTimeout(r, 300));
        }

        // Send final summary
        await writer.write(encoder.encode(
          JSON.stringify({ _done: true, total: totalFound }) + '\n'
        ));

      } catch (error) {
        console.error('[LeadFinder] Stream error:', error);
        await writer.write(encoder.encode(
          JSON.stringify({ _error: true, message: 'An error occurred during scraping. Please try again.' }) + '\n'
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
