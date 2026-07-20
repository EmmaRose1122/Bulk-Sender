import { NextResponse } from 'next/server';

interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  international_phone_number?: string;
}

interface FindRequest {
  niche: string;
  city: string;
  country: string;
  maxResults: number;
  apiKey?: string;
}

// Try to extract email from a business website
async function tryExtractEmailFromWebsite(website: string): Promise<string> {
  try {
    const cleanUrl = website.startsWith('http') ? website : `https://${website}`;
    const res = await fetch(cleanUrl, {
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0)' }
    });
    const html = await res.text();
    // Extract email from HTML using regex
    const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
    const matches = html.match(emailRegex) || [];
    // Filter out common false positives
    const blacklist = ['example.com', 'sentry.io', 'w3.org', 'schema.org', 'cloudflare', 'google.com', 'apple.com', 'facebook.com'];
    const valid = matches.filter(e =>
      !blacklist.some(bl => e.includes(bl)) &&
      !e.includes('..') &&
      e.length < 60
    );
    return valid[0] || '';
  } catch {
    return '';
  }
}

// Get place details (phone, website) from Google Places
async function getPlaceDetails(placeId: string, apiKey: string): Promise<Partial<PlaceResult>> {
  try {
    const fields = 'formatted_phone_number,website,international_phone_number';
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.status === 'OK') return data.result;
    return {};
  } catch {
    return {};
  }
}

export async function POST(request: Request) {
  try {
    const body: FindRequest = await request.json();
    const { niche, city, country, maxResults, apiKey } = body;

    if (!niche || !city) {
      return NextResponse.json({ success: false, message: 'Niche and city are required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        message: 'Google Places API key required. Add it in Settings → API Keys.',
        requiresApiKey: true,
        leads: []
      }, { status: 200 });
    }

    const query = `${niche} in ${city}, ${country}`;
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`;

    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
      return NextResponse.json({
        success: false,
        message: `Google Places API error: ${searchData.status} — ${searchData.error_message || ''}`,
        leads: []
      }, { status: 200 });
    }

    const places: any[] = (searchData.results || []).slice(0, maxResults);
    const leads = [];

    for (const place of places) {
      // Get detailed info (phone, website)
      const details = await getPlaceDetails(place.place_id, apiKey);

      const website = details.website || '';
      const phone = details.formatted_phone_number || details.international_phone_number || '';

      // Try to get email from website
      let email = '';
      if (website) {
        email = await tryExtractEmailFromWebsite(website);
      }

      leads.push({
        id: crypto.randomUUID(),
        businessName: place.name,
        email,
        phone,
        website,
        address: place.formatted_address || '',
        niche,
        city,
        country,
        status: 'new',
        notes: '',
        communicationHistory: [],
        createdAt: Date.now(),
      });

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 200));
    }

    return NextResponse.json({ success: true, leads, total: leads.length });

  } catch (error: any) {
    console.error('Lead Finder Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal error', leads: [] }, { status: 500 });
  }
}
