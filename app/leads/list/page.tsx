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
  AlertCircle, ChevronDown, Trash2, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { Lead, LeadStatus, CommunicationEntry } from '../../../types/index';
import { cn } from '../../../lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../../components/ui/dialog';

const STATUS_CONFIG: Record<LeadStatus, { label: string; color: string; bg: string; ring: string }> = {
  new:        { label: 'New',        color: 'text-blue-600',   bg: 'bg-blue-50',   ring: 'ring-blue-200'   },
  contacted:  { label: 'Contacted',  color: 'text-amber-600',  bg: 'bg-amber-50',  ring: 'ring-amber-200'  },
  replied:    { label: 'Replied',    color: 'text-emerald-600',bg: 'bg-emerald-50',ring: 'ring-emerald-200' },
  interested: { label: 'Interested', color: 'text-purple-600', bg: 'bg-purple-50', ring: 'ring-purple-200'  },
  closed:     { label: 'Closed',     color: 'text-slate-500',  bg: 'bg-slate-100', ring: 'ring-slate-200'   },
};

export default function LeadsListPage() {
  const { leads, updateLead, removeLead, smtpConfigs } = useAppContext();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'all'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notes, setNotes] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return leads
      .filter(l => {
        const matchSearch =
          l.businessName.toLowerCase().includes(search.toLowerCase()) ||
          l.email.toLowerCase().includes(search.toLowerCase()) ||
          l.city.toLowerCase().includes(search.toLowerCase()) ||
          l.niche.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === 'all' || l.status === filterStatus;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [leads, search, filterStatus]);

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

  const handleSaveNotes = () => {
    if (!selectedLead) return;
    const updated = { ...selectedLead, notes };
    updateLead(updated);
    setSelectedLead(updated);
    toast.success('Notes saved');
  };

  const openEmailDialog = () => {
    if (!selectedLead) return;
    setEmailSubject(`Quick question for ${selectedLead.businessName}`);
    setEmailBody(`<p>Hi there,</p>

<p>I came across <strong>${selectedLead.businessName}</strong> and wanted to reach out about how we could help grow your ${selectedLead.niche} business online.</p>

<p>Would you be open to a quick 15-minute call this week?</p>

<p>Best regards</p>`);
    setIsEmailDialogOpen(true);
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
          html: emailBody,
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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: leads.length };
    for (const l of leads) {
      counts[l.status] = (counts[l.status] || 0) + 1;
    }
    return counts;
  }, [leads]);

  return (
    <div className="flex h-full gap-0 animate-in fade-in duration-500">
      {/* Main Table */}
      <div className={cn('flex-1 min-w-0 space-y-6 pb-20 transition-all duration-300', selectedLead ? 'pr-[380px]' : '')}>
        {/* Header */}
        <header>
          <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Leads</h1>
          <p className="text-slate-500 font-medium mt-1">{leads.length} leads in database</p>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, city, niche..."
              className="pl-9 h-11 rounded-xl border-slate-200"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {(['all', 'new', 'contacted', 'replied', 'interested', 'closed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={cn(
                  'px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                  filterStatus === s
                    ? 'gradient-primary text-white border-transparent shadow-lg shadow-indigo-500/20'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                )}
              >
                {s === 'all' ? 'All' : STATUS_CONFIG[s].label}
                <span className="ml-1.5 opacity-70">({statusCounts[s] || 0})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
            <Building2 className="h-12 w-12 text-slate-300 mb-4 animate-float" />
            <p className="text-slate-400 font-bold">No leads found</p>
            <p className="text-xs text-slate-400 mt-1">Use Lead Finder to discover new businesses</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(lead => {
              const cfg = STATUS_CONFIG[lead.status];
              const isSelected = selectedLead?.id === lead.id;
              return (
                <Card
                  key={lead.id}
                  onClick={() => openPanel(lead)}
                  className={cn(
                    'glass border-none shadow-sm px-5 py-4 rounded-2xl cursor-pointer transition-all duration-200 hover:shadow-md',
                    isSelected && 'ring-2 ring-indigo-500 shadow-indigo-500/10'
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-white shrink-0">
                      <Building2 className="h-4 w-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-sm truncate">{lead.businessName}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{lead.niche} · {lead.city}</p>
                    </div>

                    <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
                      {lead.email ? (
                        <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{lead.email}</span>
                      ) : (
                        <span className="text-slate-300 italic text-xs">No email</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                      <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold', cfg.bg, cfg.color)}>
                        {cfg.label}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteConfirm(lead.id); }}
                        className="text-slate-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Side Panel */}
      {selectedLead && (
        <div className="fixed right-0 top-0 bottom-0 w-[380px] bg-white border-l border-slate-200 shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Panel Header */}
          <div className="flex items-start justify-between p-6 border-b border-slate-100">
            <div>
              <h2 className="font-black text-slate-900 text-base leading-tight">{selectedLead.businessName}</h2>
              <span className={cn('inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold', STATUS_CONFIG[selectedLead.status].bg, STATUS_CONFIG[selectedLead.status].color)}>
                {selectedLead.niche}
              </span>
            </div>
            <button onClick={closePanel} className="text-slate-400 hover:text-slate-700 transition-colors mt-1">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Status */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Status</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS_CONFIG) as LeadStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-xl text-xs font-bold border transition-all',
                      selectedLead.status === s
                        ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} ring-2 ${STATUS_CONFIG[s].ring} border-transparent`
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
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
              <div className="space-y-3 bg-slate-50 rounded-2xl p-4">
                {selectedLead.email ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700 font-medium truncate">{selectedLead.email}</span>
                    </div>
                    <Button
                      onClick={openEmailDialog}
                      size="sm"
                      className="h-7 px-3 text-[10px] font-bold gradient-primary text-white rounded-lg shrink-0"
                    >
                      Send Email
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-300" />
                    <span className="text-xs text-slate-400 italic">No email found</span>
                  </div>
                )}

                {selectedLead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700 font-medium">{selectedLead.phone}</span>
                  </div>
                )}

                {selectedLead.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <a
                      href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 font-medium hover:underline truncate"
                    >
                      {selectedLead.website}
                    </a>
                  </div>
                )}

                {selectedLead.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-xs text-slate-600 leading-relaxed">{selectedLead.address}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Notes</p>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes about this lead..."
                className="bg-slate-50 border-slate-200 rounded-xl text-sm resize-none min-h-[100px]"
              />
              <Button
                onClick={handleSaveNotes}
                size="sm"
                className="mt-2 h-8 px-4 text-xs font-bold gradient-primary text-white rounded-xl"
              >
                Save Notes
              </Button>
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
                    <div key={entry.id} className="flex gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                      <Mail className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-indigo-700 truncate">{entry.subject || 'Email sent'}</p>
                        <p className="text-[10px] text-indigo-400 mt-0.5">
                          {new Date(entry.sentAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                      <span className="text-[9px] font-bold text-indigo-400 bg-indigo-100 px-2 py-0.5 rounded-full h-fit">
                        {entry.type === 'email_sent' ? 'sent' : entry.type === 'followup_sent' ? 'follow-up' : entry.type}
                      </span>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Email to {selectedLead?.businessName}</DialogTitle>
            <DialogDescription>
              Sending via {smtpConfigs[0]?.fromEmail || smtpConfigs[0]?.user || 'your SMTP account'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">To</label>
              <Input value={selectedLead?.email || ''} disabled className="mt-1 bg-slate-50 border-slate-200 text-slate-600" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subject</label>
              <Input
                value={emailSubject}
                onChange={e => setEmailSubject(e.target.value)}
                className="mt-1 border-slate-200"
                placeholder="Email subject..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Message (HTML)</label>
              <Textarea
                value={emailBody}
                onChange={e => setEmailBody(e.target.value)}
                className="mt-1 border-slate-200 font-mono text-xs min-h-[200px] resize-y"
                placeholder="Email body (HTML supported)..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSendEmail}
              disabled={isSendingEmail || !smtpConfigs[0]}
              className="gradient-primary text-white font-bold"
            >
              {isSendingEmail ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="mr-2 h-4 w-4" /> Send Email</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove Lead?</DialogTitle>
            <DialogDescription>This will permanently delete this lead and all communication history.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
