import { NextResponse } from 'next/server';

interface IncomingLead {
  id?: string;
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
  createdAt?: number;
}

// In-memory server store for pushed leads across API requests
let globalPushedLeads: any[] = [];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json(
    { success: true, count: globalPushedLeads.length, leads: globalPushedLeads },
    { headers: corsHeaders }
  );
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { ids, clearAll } = body;

    if (clearAll) {
      globalPushedLeads = [];
      return NextResponse.json({ success: true, message: 'Cleared all server leads', count: 0 }, { headers: corsHeaders });
    }

    if (Array.isArray(ids) && ids.length > 0) {
      const deleteSet = new Set(ids);
      globalPushedLeads = globalPushedLeads.filter(l => !deleteSet.has(l.id));
      return NextResponse.json(
        { success: true, message: `Deleted ${ids.length} leads`, count: globalPushedLeads.length },
        { headers: corsHeaders }
      );
    }

    // Default clear all if empty DELETE request
    globalPushedLeads = [];
    return NextResponse.json({ success: true, message: 'Cleared server leads', count: 0 }, { headers: corsHeaders });

  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Delete failed' }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rawLeads: IncomingLead[] = Array.isArray(body) ? body : (body.leads || [body]);

    if (!rawLeads || rawLeads.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No leads provided in payload' },
        { status: 400, headers: corsHeaders }
      );
    }

    const newFormattedLeads = rawLeads.map(item => ({
      id: item.id || crypto.randomUUID(),
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
      createdAt: item.createdAt || Date.now(),
    }));

    for (const lead of newFormattedLeads) {
      const exists = globalPushedLeads.find(l => l.businessName === lead.businessName && (l.email === lead.email || l.phone === lead.phone));
      if (!exists) {
        globalPushedLeads.unshift(lead);
      }
    }

    console.log(`[LeadsPushAPI] Received & saved ${newFormattedLeads.length} leads. Total stored: ${globalPushedLeads.length}`);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully received and saved ${newFormattedLeads.length} leads`,
        count: globalPushedLeads.length,
        leads: globalPushedLeads,
      },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('[LeadsPushAPI] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Push failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
