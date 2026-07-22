import { NextResponse } from 'next/server';

interface IncomingLead {
  businessName: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  niche?: string;
  city?: string;
  country?: string;
  source?: string;
  notes?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawLeads: IncomingLead[] = Array.isArray(body) ? body : (body.leads || [body]);

    if (!rawLeads || rawLeads.length === 0) {
      return NextResponse.json({ success: false, message: 'No leads provided in payload' }, { status: 400 });
    }

    const formattedLeads = rawLeads.map(item => ({
      id: crypto.randomUUID(),
      businessName: item.businessName || 'Unknown Business',
      email: item.email || '',
      phone: item.phone || '',
      website: item.website || '',
      address: item.address || '',
      niche: item.niche || 'General',
      city: item.city || '',
      country: item.country || '',
      status: 'new',
      notes: item.notes || `📍 ${item.source || 'Python Scraper'}`,
      source: item.source || 'Python Scraper',
      communicationHistory: [],
      createdAt: Date.now(),
    }));

    console.log(`[LeadsPushAPI] Received ${formattedLeads.length} leads from external Python scraper`);

    return NextResponse.json({
      success: true,
      message: `Successfully received ${formattedLeads.length} leads`,
      leads: formattedLeads,
    });

  } catch (error: any) {
    console.error('[LeadsPushAPI] Error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Push failed' }, { status: 500 });
  }
}
