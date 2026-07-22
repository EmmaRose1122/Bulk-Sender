'use client';

import { useState, useMemo, useRef } from 'react';
import Papa from 'papaparse';
import { useAppContext } from '../../../context/AppContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';
import {
  X, Mail, Phone, Globe, MapPin, Building2, Search,
  Clock, CheckCircle2, Loader2, Send, StickyNote,
  AlertCircle, ChevronDown, Trash2, Filter, Upload, Download, Sparkles, MessageCircle, Eye, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { Lead, LeadStatus, CommunicationEntry } from '../../../types/index';
import { cn } from '../../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog';
import { Checkbox } from '../../../components/ui/checkbox';

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; ring: string }> = {
  new:        { label: 'New',        color: 'text-blue-600',   bg: 'bg-blue-50',   ring: 'ring-blue-200'   },
  contacted:  { label: 'Contacted',  color: 'text-amber-600',  bg: 'bg-amber-50',  ring: 'ring-amber-200'  },
  replied:    { label: 'Replied',    color: 'text-emerald-600',bg: 'bg-emerald-50',ring: 'ring-emerald-200' },
  interested: { label: 'Interested', color: 'text-rose-600', bg: 'bg-rose-50', ring: 'ring-rose-200'  },
  closed:     { label: 'Closed',     color: 'text-slate-500',  bg: 'bg-slate-100', ring: 'ring-slate-200'   },
};

export default function LeadsListPage() {
  const { leads, updateLead, removeLead, removeLeads, clearAllLeads, addLeads, smtpConfigs, googleApiSettings } = useAppContext();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
  const [filterNiche, setFilterNiche] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isCsvGuideOpen, setIsCsvGuideOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Bulk selection
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());

  const allNiches = useMemo(() => Array.from(new Set(leads.map(l => l.niche).filter(Boolean))), [leads]);

  const filtered = useMemo(() => {
    return leads
      .filter(l => {
        const matchSearch =
          l.businessName.toLowerCase().includes(search.toLowerCase()) ||
          l.email.toLowerCase().includes(search.toLowerCase()) ||
          l.city.toLowerCase().includes(search.toLowerCase()) ||
          l.niche.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' || l.status === filterStatus;
        const matchNiche = filterNiche === 'all' || l.niche === filterNiche;
        return matchSearch && matchStatus && matchNiche;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [leads, search, filterStatus, filterNiche]);

  const openPanel = (lead: Lead) => {
    setSelectedLead(lead);
    setNotes(lead.notes || '');
  };

  const closePanel = () => {
    setSelectedLead(null);
    setNotes('');
  };

  const handleStatusChange = (status: LeadStatus) => {
    if (!selectedLead) return;
    const updated = { ...selectedLead, status };
    updateLead(updated);
    setSelectedLead(updated);
    toast.success(`Status updated to ${STATUS_CONFIG[status].label}`);
  };

  const handleBulkStatusChange = (status: LeadStatus) => {
    selectedLeadIds.forEach(id => {
      const lead = leads.find(l => l.id === id);
      if (lead) {
        updateLead({ ...lead, status });
      }
    });
    toast.success(`Marked ${selectedLeadIds.size} leads as ${STATUS_CONFIG[status].label}`);
    setSelectedLeadIds(new Set());
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedLeadIds);
    if (ids.length === 0) return;

    removeLeads(ids);
    if (selectedLead && ids.includes(selectedLead.id)) closePanel();

    try {
      await fetch('/api/leads/push', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
    } catch { }

    toast.success(`Successfully deleted ${ids.length} leads!`);
    setSelectedLeadIds(new Set());
  };

  const toggleSelectAll = () => {
    if (selectedLeadIds.size === filtered.length) {
      setSelectedLeadIds(new Set());
    } else {
      setSelectedLeadIds(new Set(filtered.map(l => l.id)));
    }
  };

  const toggleSelectLead = (id: string, checked: boolean) => {
    const newSet = new Set(selectedLeadIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedLeadIds(newSet);
  };

  const handleSaveNotes = () => {
    if (!selectedLead) return;
    const updated = { ...selectedLead, notes };
    updateLead(updated);
    setSelectedLead(updated);
    toast.success('Notes saved');
  };

const stripHtmlTags = (str: string) => str ? str.replace(/<[^>]*>/g, '') : '';

const DOT_SKILLS_TEMPLATES = [
  {
    id: 'web_dev',
    name: '🌐 Web Development & Modernization',
    getSubject: (lead: Lead) => `Quick website proposal for ${lead.businessName}`,
    getBody: (lead: Lead) => `Hi team at ${lead.businessName},

I noticed ${lead.businessName} while reviewing ${lead.niche} businesses in ${lead.city || 'your area'}. You have a great business, but your online presence could be generating 3x more customer leads.

At Dot Skills, we specialize in high-converting agency services:
• Web Development: Modern, fast-loading, mobile-friendly websites that convert visitors into paying customers.
• SEO: Rank at the top of Google search results.
• Local SEO: Dominate Google Maps 3-Pack rankings for local clients.
• Social Media Marketing: Engage target customers and build brand authority.

Would you be open to a quick 10-minute call this week to see how Dot Skills can help ${lead.businessName} grow?

Best regards,
Dot Skills Team
Web Development | SEO | Local SEO | Social Media Marketing`
  },
  {
    id: 'local_seo',
    name: '📍 Local SEO & Google Maps Ranking',
    getSubject: (lead: Lead) => `Google Maps ranking idea for ${lead.businessName}`,
    getBody: (lead: Lead) => `Hi team at ${lead.businessName},

I came across ${lead.businessName} and noticed a huge opportunity to significantly increase your local customer calls in ${lead.city || 'your city'}.

At Dot Skills, our Local SEO & Google Maps optimization service helps businesses like yours:
• Rank in the Google Maps Top 3-Pack for local searches
• Dominate local keyword search results
• Convert local search traffic into direct calls & walk-in clients

We also provide complete Web Development, SEO, and Social Media Marketing to scale ${lead.businessName}.

We'd love to send a free 5-minute video audit customized for ${lead.businessName}. Would you be interested?

Best regards,
Dot Skills Team
Web Development | SEO | Local SEO | Social Media Marketing`
  },
  {
    id: 'smm',
    name: '📱 Social Media Marketing & Growth',
    getSubject: (lead: Lead) => `Social media strategy for ${lead.businessName}`,
    getBody: (lead: Lead) => `Hi team at ${lead.businessName},

I was checking out ${lead.businessName} and saw great potential to expand your brand reach on social media.

At Dot Skills, our Social Media Marketing team creates high-impact content that attracts and retains customers:
• Custom visual content creation & branding
• Targeted ad campaigns for local lead generation
• Consistent engagement & community management

Together with our Web Development and SEO services, we help ${lead.businessName} dominate your market.

Could we schedule a quick 10-minute chat to discuss how Dot Skills can elevate ${lead.businessName}?

Best regards,
Dot Skills Team
Web Development | SEO | Local SEO | Social Media Marketing`
  },
  {
    id: 'full_package',
    name: '🚀 All-in-One Growth Package (Web Dev + SEO + SMM)',
    getSubject: (lead: Lead) => `Digital growth plan for ${lead.businessName}`,
    getBody: (lead: Lead) => `Hi team at ${lead.businessName},

I hope this email finds you well! I reached out because ${lead.businessName} has strong growth potential in ${lead.city || 'your market'}.

At Dot Skills, we provide full-suite digital solutions tailored for ${lead.niche} businesses:
1. Web Development: Modern, high-speed, conversion-focused websites
2. SEO & Local SEO: Rank #1 on Google & Google Maps 3-Pack
3. Social Media Marketing: Expand reach & run targeted lead campaigns

We can handle your entire digital presence so you can focus on running ${lead.businessName}.

Would you be open to a quick discovery call this week?

Best regards,
Dot Skills Team
Web Development | SEO | Local SEO | Social Media Marketing`
  }
];

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('web_dev');

  const openEmailDialog = (lead: Lead) => {
    setSelectedLead(lead);
    const tpl = DOT_SKILLS_TEMPLATES.find(t => t.id === selectedTemplateId) || DOT_SKILLS_TEMPLATES[0];
    setEmailSubject(tpl.getSubject(lead));
    setEmailBody(tpl.getBody(lead));
    setIsEmailDialogOpen(true);
  };

  const handleRegenerateEmail = async () => {
    if (!googleApiSettings?.geminiApiKey) {
      toast.error('Gemini API key is not configured in Settings.');
      return;
    }

    setIsRegenerating(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${googleApiSettings.geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Rewrite the following cold email to make it more professional, engaging, and personalized for a ${selectedLead?.niche} business. Keep it concise. Current Draft: ${emailBody}`
            }]
          }]
        })
      });
      
      const data = await response.json();
      if (data.candidates && data.candidates.length > 0) {
        setEmailBody(data.candidates[0].content.parts[0].text);
        toast.success('Email regenerated successfully!');
      } else {
        toast.error('Failed to regenerate email.');
      }
    } catch (e) {
      toast.error('Network error during generation.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedLead || !emailSubject || !emailBody) {
      toast.error('Subject and body are required');
      return;
    }

    const smtp = smtpConfigs[0];
    if (!smtp) {
      const cleanSubject = stripHtmlTags(emailSubject);
      const cleanBody = stripHtmlTags(emailBody);
      const targetUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selectedLead.email)}&su=${encodeURIComponent(cleanSubject)}&body=${encodeURIComponent(cleanBody)}`;
      const chooserUrl = `https://accounts.google.com/AccountChooser?continue=${encodeURIComponent(targetUrl)}`;
      window.open(chooserUrl, '_blank');

      // Update lead status + add to history
      const entry: CommunicationEntry = {
        id: crypto.randomUUID(),
        type: 'email_sent',
        subject: emailSubject,
        body: emailBody,
        sentAt: Date.now(),
      };

      const updated: Lead = {
        ...selectedLead,
        status: 'contacted',
        lastContactedAt: Date.now(),
        communicationHistory: [entry, ...(selectedLead.communicationHistory || [])],
      };

      updateLead(updated);
      setSelectedLead(updated);
      setIsEmailDialogOpen(false);
      toast.success(`Opened default email app for ${selectedLead.businessName}!`);
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await fetch('/api/leads/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: smtp,
          to: selectedLead.email,
          subject: emailSubject,
          html: emailBody, // Assuming the backend converts text to HTML or we are sending text.
          leadId: selectedLead.id,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || 'Failed to send email');
        return;
      }

      // Update lead status + add to history
      const entry: CommunicationEntry = {
        id: crypto.randomUUID(),
        type: 'email_sent',
        subject: emailSubject,
        body: emailBody,
        sentAt: Date.now(),
      };

      const updated: Lead = {
        ...selectedLead,
        status: 'contacted',
        lastContactedAt: Date.now(),
        communicationHistory: [entry, ...(selectedLead.communicationHistory || [])],
      };

      updateLead(updated);
      setSelectedLead(updated);
      setIsEmailDialogOpen(false);
      toast.success(`Email sent to ${selectedLead.businessName}!`);
    } catch {
      toast.error('Network error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleDelete = (id: string) => {
    removeLead(id);
    if (selectedLead?.id === id) closePanel();
    setDeleteConfirm(null);
    toast.success('Lead removed');
  };

  const handleExportCSV = () => {
    if (leads.length === 0) {
      toast.info('No leads to export.');
      return;
    }
    
    const exportData = leads.map(l => ({
      BusinessName: l.businessName,
      Email: l.email,
      Phone: l.phone,
      Website: l.website,
      Address: l.address,
      City: l.city,
      Country: l.country,
      Niche: l.niche,
      Status: l.status,
      Notes: l.notes,
      CreatedAt: new Date(l.createdAt).toLocaleString(),
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'leads_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Leads exported successfully!');
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        let importedCount = 0;
        const newLeads = results.data.map((row: any) => {
          const exists = leads.find(l => (row.Email && l.email === row.Email) || (row.Phone && l.phone === row.Phone));
          if (!exists && row.BusinessName) {
            importedCount++;
            return {
              id: crypto.randomUUID(),
              businessName: row.BusinessName || 'Unknown Business',
              email: row.Email || '',
              phone: row.Phone || '',
              website: row.Website || '',
              address: row.Address || '',
              city: row.City || '',
              country: row.Country || '',
              niche: row.Niche || 'General',
              status: (row.Status as LeadStatus) || 'new',
              notes: row.Notes || '',
              communicationHistory: [],
              createdAt: Date.now(),
            } as Lead;
          }
          return null;
        }).filter(Boolean) as Lead[];

        if (newLeads.length > 0) {
            addLeads(newLeads);
            toast.success(`Successfully imported ${importedCount} new leads!`);
        } else {
            toast.info('No new leads to import or invalid CSV format.');
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
      error: () => {
        toast.error('Failed to parse CSV file.');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
  };

  return (
    <div className="flex h-full min-h-0 gap-0 animate-in fade-in duration-500 relative flex-1">
      {/* Main Content */}
      <div className={cn('flex-1 min-w-0 flex flex-col space-y-6 transition-all duration-300 h-full min-h-0', selectedLead ? 'lg:pr-[380px]' : '')}>
        
        {/* Header with Export/Import */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Leads</h1>
            <p className="text-slate-500 font-medium mt-1">{leads.length} leads in database</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  const res = await fetch('/api/leads/push');
                  if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.leads) {
                      addLeads(data.leads);
                      toast.success(`Synced ${data.leads.length} leads from database!`);
                    }
                  }
                } catch {
                  toast.error('Sync failed');
                }
              }}
              className="h-10 rounded-xl border-slate-200 text-rose-600 font-bold text-xs hover:bg-rose-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Sync Database
            </Button>
            <Button variant="outline" onClick={handleExportCSV} className="h-10 rounded-xl border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50">
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-0.5">
              <input type="file" accept=".csv" ref={fileInputRef} onChange={handleImportCSV} className="hidden" id="csvUpload" />
              <Button variant="ghost" onClick={() => fileInputRef.current?.click()} className="h-9 rounded-lg text-slate-700 font-bold text-xs hover:bg-white hover:shadow-sm">
                <Upload className="h-4 w-4 mr-2" /> Import
              </Button>
              <div className="w-px h-4 bg-slate-200 mx-1"></div>
              <Button variant="ghost" onClick={() => setIsCsvGuideOpen(true)} className="h-9 w-9 p-0 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-white hover:shadow-sm" title="CSV Format Guide">
                <AlertCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads..."
              className="pl-9 h-11 border-none focus-visible:ring-0 shadow-none text-sm font-medium bg-transparent"
            />
          </div>
          <div className="h-6 w-px bg-slate-200 hidden md:block" />
          <div className="flex items-center px-2">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="h-10 bg-transparent border-none text-sm font-bold text-slate-600 focus:ring-0 cursor-pointer outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="replied">Replied</option>
              <option value="interested">Interested</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="h-6 w-px bg-slate-200 hidden md:block" />
          <div className="flex items-center px-2">
            <select
              value={filterNiche}
              onChange={e => setFilterNiche(e.target.value)}
              className="h-10 bg-transparent border-none text-sm font-bold text-slate-600 focus:ring-0 cursor-pointer outline-none max-w-[150px] truncate"
            >
              <option value="all">All Niches</option>
              {allNiches.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedLeadIds.size > 0 && (
          <div className="flex items-center gap-4 bg-red-50/50 border border-red-100 p-3 rounded-2xl animate-in slide-in-from-top-2">
            <span className="text-sm font-bold text-red-900 px-2">{selectedLeadIds.size} selected</span>
            <div className="h-4 w-px bg-red-200" />
            <div className="flex items-center gap-2 flex-1">
              <Button size="sm" variant="ghost" onClick={() => handleBulkStatusChange('contacted')} className="text-xs font-bold text-amber-600 hover:bg-amber-100 hover:text-amber-700 bg-amber-50 h-8">Mark Contacted</Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkStatusChange('interested')} className="text-xs font-bold text-rose-600 hover:bg-rose-100 hover:text-rose-700 bg-rose-50 h-8">Mark Interested</Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkStatusChange('closed')} className="text-xs font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-700 bg-slate-100 h-8">Mark Closed</Button>
            </div>
            <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 h-8">
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex-1">
            <Building2 className="h-12 w-12 text-slate-300 mb-4 animate-float" />
            <p className="text-slate-400 font-bold">No leads found</p>
            <p className="text-xs text-slate-400 mt-1">Your database is empty. Go to Lead Finder to start scraping real business data.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
            <div className="overflow-auto flex-1 custom-scrollbar">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="p-4 pl-6 w-10">
                      <Checkbox 
                        checked={selectedLeadIds.size === filtered.length && filtered.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Business</th>
                    <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Contact</th>
                    <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Location</th>
                    <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-widest">Status</th>
                    <th className="p-4 font-bold text-slate-500 text-xs uppercase tracking-widest text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(lead => {
                    const cfg = STATUS_CONFIG[lead.status];
                    const isSelected = selectedLead?.id === lead.id;
                    const isChecked = selectedLeadIds.has(lead.id);
                    
                    return (
                      <tr 
                        key={lead.id} 
                        className={cn(
                          "transition-colors hover:bg-slate-50/50 group cursor-pointer",
                          isSelected && "bg-red-50/30"
                        )}
                        onClick={() => openPanel(lead)}
                      >
                        <td className="p-4 pl-6" onClick={(e) => e.stopPropagation()}>
                          <Checkbox 
                            checked={isChecked}
                            onCheckedChange={(checked) => toggleSelectLead(lead.id, !!checked)}
                          />
                        </td>
                        <td className="p-4">
                          <p className="font-bold text-slate-900 truncate max-w-[250px]">{lead.businessName}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[250px] flex items-center gap-1">
                            {lead.website ? <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline inline-flex items-center gap-1" onClick={e => e.stopPropagation()}><Globe className="h-3 w-3"/> Website</a> : lead.niche}
                          </p>
                        </td>
                        <td className="p-4 text-slate-500">
                          {lead.phone && <p className="text-xs mb-1 flex items-center gap-1"><Phone className="h-3 w-3 opacity-50"/> {lead.phone}</p>}
                          {lead.email ? (
                            <p className="text-xs flex items-center gap-1"><Mail className="h-3 w-3 opacity-50"/> {lead.email}</p>
                          ) : (
                            <span className="text-xs text-slate-300 italic">N/A</span>
                          )}
                        </td>
                        <td className="p-4 text-xs text-slate-600">
                          <p className="truncate max-w-[200px]">{lead.address || `${lead.city}, ${lead.country || ''}`}</p>
                        </td>
                        <td className="p-4">
                          <span className={cn('px-3 py-1 rounded-full text-[10px] font-bold border border-transparent', cfg.bg, cfg.color)}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); openEmailDialog(lead); }}
                              className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                              title="Send Email"
                            >
                              <Mail className="h-4 w-4" />
                            </button>
                            <button 
                              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Side Panel */}
      {selectedLead && (
        <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[380px] bg-white border-l border-slate-200 shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-start justify-between p-6 border-b border-slate-100">
            <div>
              <h2 className="font-black text-slate-900 text-lg leading-tight">{selectedLead.businessName}</h2>
              <span className={cn('inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-600')}>
                {selectedLead.niche}
              </span>
            </div>
            <button onClick={closePanel} className="text-slate-400 hover:text-slate-700 transition-colors mt-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Status */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Status</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all',
                      selectedLead.status === s
                        ? `${STATUS_CONFIG[s].color} ring-1 ${STATUS_CONFIG[s].ring} bg-white shadow-sm`
                        : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'
                    )}
                  >
                    {STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Details */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Contact Details</p>
              <div className="space-y-4">
                {selectedLead.email && (
                  <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <Mail className="h-4 w-4 text-slate-400" />
                      </div>
                      <span className="text-sm text-slate-700 font-medium truncate">
                        <span className="text-[10px] text-slate-400 block -mb-1">Email</span>
                        {selectedLead.email}
                      </span>
                    </div>
                    <Button
                      onClick={() => openEmailDialog(selectedLead)}
                      size="sm"
                      className="h-7 px-3 text-[10px] font-bold bg-red-50 hover:bg-red-100 text-red-600 rounded-md shrink-0 border border-red-100"
                    >
                      Send Email
                    </Button>
                  </div>
                )}

                {selectedLead.phone && (
                  <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                        <Phone className="h-4 w-4 text-slate-400" />
                      </div>
                      <span className="text-sm text-slate-700 font-medium">
                        <span className="text-[10px] text-slate-400 block -mb-1">Phone</span>
                        {selectedLead.phone}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="h-7 px-3 text-[10px] font-bold bg-green-50 hover:bg-green-100 text-green-600 rounded-md shrink-0 border border-green-100"
                      onClick={() => {
                        if (!selectedLead.phone) return;
                        const wNumber = selectedLead.phone.replace(/[^0-9]/g, '');
                        window.open(`https://wa.me/${wNumber}`, '_blank');
                      }}
                    >
                      WhatsApp
                    </Button>
                  </div>
                )}

                {selectedLead.website && (
                  <div className="flex items-center gap-3 min-w-0 border-b border-slate-50 pb-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Globe className="h-4 w-4 text-slate-400" />
                    </div>
                    <a
                      href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-red-600 font-medium hover:underline truncate"
                    >
                      <span className="text-[10px] text-slate-400 block -mb-1">Website</span>
                      {selectedLead.website}
                    </a>
                  </div>
                )}

                {selectedLead.address && (
                  <div className="flex items-center gap-3 min-w-0 border-b border-slate-50 pb-3">
                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <MapPin className="h-4 w-4 text-slate-400" />
                    </div>
                    <span className="text-sm text-slate-600 leading-tight">
                      <span className="text-[10px] text-slate-400 block -mb-0.5">Location</span>
                      {selectedLead.address}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Notes</p>
              <div className="relative">
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Add notes about this lead..."
                  className="bg-white border-slate-200 rounded-xl text-sm resize-none min-h-[100px] shadow-sm pb-12 focus-visible:ring-red-500"
                />
                <Button
                  onClick={handleSaveNotes}
                  size="sm"
                  className="absolute bottom-3 right-3 h-7 px-4 text-[10px] font-bold gradient-primary text-white rounded-lg shadow-sm"
                >
                  Save Notes
                </Button>
              </div>
            </div>

            {/* Communication History */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Communication History</p>
              {(selectedLead.communicationHistory || []).length === 0 ? (
                <div className="py-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <Clock className="h-6 w-6 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">No communications yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedLead.communicationHistory.map(entry => (
                    <div key={entry.id} className="flex gap-3 p-4 bg-red-50/50 border border-red-100/50 rounded-2xl">
                      {entry.type.includes('whatsapp') ? (
                        <MessageCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <Mail className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                            entry.type.includes('whatsapp') ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
                          )}>
                            {entry.type === 'email_sent' ? 'Email sent' : entry.type === 'followup_sent' ? 'Follow-up' : 'WhatsApp sent'}
                          </span>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {new Date(entry.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                        <p className="text-xs font-medium text-slate-700 mt-1">{entry.subject || entry.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Send Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto custom-scrollbar bg-white border-none shadow-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6">
          <DialogHeader className="pb-4 border-b border-slate-100">
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white">
                <Mail className="h-5 w-5" />
              </div>
              Send Email
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 font-medium mt-1 ml-13">
              To: {selectedLead?.businessName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Select Dot Skills Email Template</label>
              <select
                value={selectedTemplateId}
                onChange={e => {
                  const tplId = e.target.value;
                  setSelectedTemplateId(tplId);
                  if (selectedLead) {
                    const tpl = DOT_SKILLS_TEMPLATES.find(t => t.id === tplId) || DOT_SKILLS_TEMPLATES[0];
                    setEmailSubject(tpl.getSubject(selectedLead));
                    setEmailBody(tpl.getBody(selectedLead));
                  }
                }}
                className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-red-500 cursor-pointer"
              >
                {DOT_SKILLS_TEMPLATES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">To</label>
              <Input value={selectedLead?.email || ''} disabled className="bg-slate-50 border-slate-200 text-slate-600 h-11 rounded-xl shadow-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Subject</label>
              <Input
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                className="border-slate-200 h-11 rounded-xl shadow-sm focus-visible:ring-red-500"
                placeholder="Email subject..."
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Message</label>
              <Textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                className="border-slate-200 text-sm min-h-[200px] resize-y rounded-xl shadow-sm focus-visible:ring-red-500 p-4"
                placeholder="Email body..."
              />
            </div>
          </div>

          {!smtpConfigs[0] && (
            <div className="mx-4 mb-2 px-4 py-3 bg-amber-50 text-amber-700 text-xs font-bold rounded-xl border border-amber-100 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              No SMTP configured. This will open Gmail and ask you to select an account.
            </div>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between border-t border-slate-100 pt-4 gap-3">
            <Button 
              variant="ghost" 
              onClick={handleRegenerateEmail}
              disabled={isRegenerating}
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 font-bold text-xs"
            >
              {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Regenerate
            </Button>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setIsEmailDialogOpen(false)} className="text-slate-500 hover:text-slate-700 font-bold text-sm">Cancel</Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSendingEmail}
                className="bg-rose-500 hover:bg-rose-600 text-white font-bold h-11 px-8 rounded-xl shadow-xl shadow-rose-500/20"
              >
                {isSendingEmail ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> {!smtpConfigs[0] ? 'Send via Gmail' : 'Send'}</>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Guide Dialog */}
      <Dialog open={isCsvGuideOpen} onOpenChange={setIsCsvGuideOpen}>
        <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-[2rem] overflow-hidden sm:rounded-[2rem]">
          <DialogHeader className="pb-4 border-b border-slate-100 px-2 pt-2">
            <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500">
                <AlertCircle className="h-5 w-5" />
              </div>
              CSV Import Guide
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 px-2 text-sm text-slate-600">
            <p className="leading-relaxed">Your CSV file should have a header row with the following column names. Only <strong className="text-slate-900">BusinessName</strong> is strictly required.</p>
            
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 font-mono text-[11px] leading-loose break-words text-slate-700 font-bold shadow-inner">
              BusinessName, Email, Phone, Website, Address, City, Country, Niche, Status, Notes
            </div>

            <ul className="space-y-2 mt-4 text-xs font-medium text-slate-500">
              <li className="flex gap-2 items-start"><div className="mt-1 h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0"/><span><span className="font-bold text-slate-900">BusinessName:</span> Required. Name of the business.</span></li>
              <li className="flex gap-2 items-start"><div className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0"/><span><span className="font-bold text-slate-900">Email:</span> Contact email address.</span></li>
              <li className="flex gap-2 items-start"><div className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0"/><span><span className="font-bold text-slate-900">Phone:</span> Contact phone number.</span></li>
              <li className="flex gap-2 items-start"><div className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0"/><span><span className="font-bold text-slate-900">Status:</span> <code className="bg-slate-100 px-1.5 py-0.5 rounded-md text-rose-600 border border-slate-200">new</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded-md text-rose-600 border border-slate-200">contacted</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded-md text-rose-600 border border-slate-200">replied</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded-md text-rose-600 border border-slate-200">interested</code>, <code className="bg-slate-100 px-1.5 py-0.5 rounded-md text-rose-600 border border-slate-200">closed</code></span></li>
              <li className="flex gap-2 items-start"><div className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0"/><span><span className="font-bold text-slate-900">Niche:</span> E.g., Plumber, Dentist, etc.</span></li>
            </ul>

            <div className="mt-6 bg-rose-50 text-rose-700 text-xs p-4 rounded-2xl border border-rose-100 font-medium flex gap-3 items-start">
              <Sparkles className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed"><strong>Tip:</strong> The easiest way to get the correct format is to click <strong className="text-rose-800">"Export CSV"</strong> first, add your new data to that file, and then import it back.</p>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-100 pt-4 px-2 pb-2">
            <Button onClick={() => setIsCsvGuideOpen(false)} className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-xl h-12 font-black uppercase tracking-widest shadow-md shadow-rose-500/20">
              Got it, Thanks!
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
