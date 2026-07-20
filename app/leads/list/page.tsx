'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';
import {
  X, Mail, Phone, Globe, MapPin, Building2, Search,
  Clock, CheckCircle2, Loader2, Send, StickyNote,
  AlertCircle, ChevronDown, Trash2, Filter, Upload, Download, Sparkles, MessageCircle, Eye
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
  interested: { label: 'Interested', color: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-200'  },
  closed:     { label: 'Closed',     color: 'text-slate-500',  bg: 'bg-slate-100', ring: 'ring-slate-200'   },
};

export default function LeadsListPage() {
  const { leads, updateLead, removeLead, smtpConfigs, googleApiSettings } = useAppContext();

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

  const handleBulkDelete = () => {
    selectedLeadIds.forEach(id => {
      removeLead(id);
      if (selectedLead?.id === id) closePanel();
    });
    toast.success(`Deleted ${selectedLeadIds.size} leads`);
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

  const openEmailDialog = (lead: Lead) => {
    setSelectedLead(lead);
    setEmailSubject(`Quick question for ${lead.businessName}`);
    setEmailBody(`Hi there,

I came across ${lead.businessName} while researching ${lead.niche} businesses in ${lead.city}, and I was impressed by what you've built.

I help businesses like yours design a modern, fast-loading, SEO-optimized website that converts visitors into paying customers.

Would you be open to a quick 10-minute call this week to discuss how I can help ${lead.businessName} grow?

Looking forward to hearing from you.

Best regards,`);
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
      toast.error('No SMTP account configured. Add one in Settings.');
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

  return (
    <div className="flex h-full gap-0 animate-in fade-in duration-500">
      {/* Main Content */}
      <div className={cn('flex-1 min-w-0 space-y-6 pb-20 transition-all duration-300', selectedLead ? 'pr-[380px]' : '')}>
        
        {/* Header with Export/Import */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Leads</h1>
            <p className="text-slate-500 font-medium mt-1">{leads.length} leads in database</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="h-10 rounded-xl border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50">
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button variant="outline" className="h-10 rounded-xl border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50">
              <Upload className="h-4 w-4 mr-2" /> Import CSV
            </Button>
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
          <div className="flex items-center gap-4 bg-indigo-50/50 border border-indigo-100 p-3 rounded-2xl animate-in slide-in-from-top-2">
            <span className="text-sm font-bold text-indigo-900 px-2">{selectedLeadIds.size} selected</span>
            <div className="h-4 w-px bg-indigo-200" />
            <div className="flex items-center gap-2 flex-1">
              <Button size="sm" variant="ghost" onClick={() => handleBulkStatusChange('contacted')} className="text-xs font-bold text-amber-600 hover:bg-amber-100 hover:text-amber-700 bg-amber-50 h-8">Mark Contacted</Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkStatusChange('interested')} className="text-xs font-bold text-purple-600 hover:bg-purple-100 hover:text-purple-700 bg-purple-50 h-8">Mark Interested</Button>
              <Button size="sm" variant="ghost" onClick={() => handleBulkStatusChange('closed')} className="text-xs font-bold text-slate-600 hover:bg-slate-200 hover:text-slate-700 bg-slate-100 h-8">Mark Closed</Button>
            </div>
            <Button size="sm" variant="ghost" onClick={handleBulkDelete} className="text-xs font-bold text-red-500 hover:bg-red-50 hover:text-red-600 h-8">
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        )}

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
            <Building2 className="h-12 w-12 text-slate-300 mb-4 animate-float" />
            <p className="text-slate-400 font-bold">No leads found</p>
            <p className="text-xs text-slate-400 mt-1">Your database is empty. Go to Lead Finder to start scraping real business data.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
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
                          isSelected && "bg-indigo-50/30"
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
                            {lead.website ? <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline inline-flex items-center gap-1" onClick={e => e.stopPropagation()}><Globe className="h-3 w-3"/> Website</a> : lead.niche}
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
                              className="h-8 w-8 rounded-lg text-indigo-500 hover:bg-indigo-50 flex items-center justify-center transition-colors"
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
        <div className="fixed right-0 top-0 bottom-0 w-[380px] bg-white border-l border-slate-200 shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-start justify-between p-6 border-b border-slate-100">
            <div>
              <h2 className="font-black text-slate-900 text-lg leading-tight">{selectedLead.businessName}</h2>
              <span className={cn('inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600')}>
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
                      className="h-7 px-3 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-md shrink-0 border border-indigo-100"
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
                      className="text-sm text-indigo-600 font-medium hover:underline truncate"
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
                  className="bg-white border-slate-200 rounded-xl text-sm resize-none min-h-[100px] shadow-sm pb-12 focus-visible:ring-indigo-500"
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
                    <div key={entry.id} className="flex gap-3 p-4 bg-indigo-50/50 border border-indigo-100/50 rounded-2xl">
                      {entry.type.includes('whatsapp') ? (
                        <MessageCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                      ) : (
                        <Mail className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={cn(
                            "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full",
                            entry.type.includes('whatsapp') ? "bg-green-100 text-green-600" : "bg-indigo-100 text-indigo-500"
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
        <DialogContent className="max-w-2xl bg-white border-none shadow-2xl rounded-3xl">
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
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">To</label>
              <Input value={selectedLead?.email || ''} disabled className="bg-slate-50 border-slate-200 text-slate-600 h-11 rounded-xl shadow-none" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Subject</label>
              <Input
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                className="border-slate-200 h-11 rounded-xl shadow-sm focus-visible:ring-indigo-500"
                placeholder="Email subject..."
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Message</label>
              <Textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                className="border-slate-200 text-sm min-h-[200px] resize-y rounded-xl shadow-sm focus-visible:ring-indigo-500 p-4"
                placeholder="Email body..."
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between border-t border-slate-100 pt-4">
            <Button 
              variant="ghost" 
              onClick={handleRegenerateEmail}
              disabled={isRegenerating}
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-bold text-xs"
            >
              {isRegenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Regenerate
            </Button>
            
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => setIsEmailDialogOpen(false)} className="text-slate-500 hover:text-slate-700 font-bold text-sm">Cancel</Button>
              <Button
                onClick={handleSendEmail}
                disabled={isSendingEmail || !smtpConfigs[0]}
                className="gradient-primary text-white font-bold h-11 px-8 rounded-xl shadow-xl shadow-indigo-500/20"
              >
                {isSendingEmail ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="mr-2 h-4 w-4" /> Send</>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
