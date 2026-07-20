'use client';

import { useState, useMemo } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import {
  Sparkles, Send, X, Clock, CheckCircle2, Loader2,
  Mail, RefreshCw, ChevronDown, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { FollowUp, CommunicationEntry } from '../../types/index';
import { cn } from '../../lib/utils';
import Link from 'next/link';

export default function FollowUpsPage() {
  const {
    leads, updateLead,
    followUps, addFollowUp, updateFollowUp, removeFollowUp,
    smtpConfigs, googleApiSettings
  } = useAppContext();

  const [isGenerating, setIsGenerating] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Contacted leads with no reply = candidates for follow-up
  const candidateLeads = useMemo(() =>
    leads.filter(l =>
      l.status === 'contacted' &&
      l.email &&
      // Not already in pending follow-ups
      !followUps.find(f => f.leadId === l.id && f.status === 'pending')
    ),
    [leads, followUps]
  );

  const pendingFollowUps = useMemo(() =>
    followUps.filter(f => f.status === 'pending'),
    [followUps]
  );

  const sentFollowUps = useMemo(() =>
    followUps.filter(f => f.status === 'sent').slice(0, 10),
    [followUps]
  );

  const handleGenerate = async () => {
    if (candidateLeads.length === 0) {
      toast.info('No contacted leads without replies found. Contact some leads first.');
      return;
    }

    setIsGenerating(true);
    setNotification(null);

    try {
      const smtp = smtpConfigs[0];
      const res = await fetch('/api/followups/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: candidateLeads,
          senderName: smtp?.fromName || smtp?.user || 'Your Team',
          senderEmail: smtp?.fromEmail || smtp?.user || '',
          geminiApiKey: googleApiSettings?.geminiApiKey,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || 'Generation failed');
        return;
      }

      const generated: FollowUp[] = data.followUps || [];
      for (const fu of generated) addFollowUp(fu);

      setNotification(`Generated ${generated.length} follow-up draft${generated.length !== 1 ? 's' : ''}`);
      setTimeout(() => setNotification(null), 5000);

      toast.success(`Generated ${generated.length} follow-up drafts!`);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAndSend = async (fu: FollowUp) => {
    const smtp = smtpConfigs[0];
    if (!smtp) {
      toast.error('No SMTP account configured. Add one in Settings.');
      return;
    }

    setSendingId(fu.id);
    try {
      const res = await fetch('/api/leads/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: smtp,
          to: fu.leadEmail,
          subject: fu.subject,
          html: fu.body,
          leadId: fu.leadId,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.message || 'Failed to send');
        return;
      }

      // Mark follow-up as sent
      updateFollowUp({ ...fu, status: 'sent', sentAt: Date.now() });

      // Update lead communication history
      const lead = leads.find(l => l.id === fu.leadId);
      if (lead) {
        const entry: CommunicationEntry = {
          id: crypto.randomUUID(),
          type: 'followup_sent',
          subject: fu.subject,
          body: fu.body,
          sentAt: Date.now(),
        };
        updateLead({
          ...lead,
          lastContactedAt: Date.now(),
          communicationHistory: [entry, ...(lead.communicationHistory || [])],
        });
      }

      toast.success(`Follow-up sent to ${fu.leadName}!`);
    } catch {
      toast.error('Network error');
    } finally {
      setSendingId(null);
    }
  };

  const handleSkip = (fu: FollowUp) => {
    updateFollowUp({ ...fu, status: 'skipped' });
    toast.info(`Skipped follow-up for ${fu.leadName}`);
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Follow-ups</h1>
          <p className="text-slate-500 font-medium mt-1">AI-generated follow-up messages for non-responsive leads</p>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="h-12 px-6 rounded-2xl gradient-primary text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.01] transition-all shrink-0"
        >
          {isGenerating ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="mr-2 h-4 w-4" /> Generate Follow-ups</>
          )}
        </Button>
      </header>

      {/* Success Notification */}
      {notification && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-2xl animate-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <p className="text-sm font-bold text-emerald-700">{notification}</p>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-400 hover:text-emerald-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Candidate info */}
      {candidateLeads.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-indigo-400 shrink-0" />
          <p className="text-sm text-indigo-700">
            <strong>{candidateLeads.length} contacted lead{candidateLeads.length !== 1 ? 's' : ''}</strong> with no reply found.
            Click "Generate Follow-ups" to create personalized drafts.
          </p>
        </div>
      )}

      {/* No SMTP warning */}
      {smtpConfigs.length === 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">
            No email account configured.{' '}
            <Link href="/settings" className="font-bold underline">Add an SMTP account in Settings</Link>{' '}
            to send follow-ups.
          </p>
        </div>
      )}

      {/* Pending Approvals */}
      <section>
        <h2 className="text-lg font-black text-slate-800 mb-4">
          Pending Approval ({pendingFollowUps.length})
        </h2>

        {pendingFollowUps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl">
            <Clock className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-slate-400 font-bold text-sm">No pending follow-ups</p>
            <p className="text-xs text-slate-400 mt-1">
              {candidateLeads.length > 0
                ? 'Click "Generate Follow-ups" to create drafts for contacted leads with no reply.'
                : 'Contact some leads first, then generate follow-ups for non-respondents.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingFollowUps.map(fu => {
              const isExpanded = expandedId === fu.id;
              return (
                <Card
                  key={fu.id}
                  className="glass border-none shadow-lg rounded-2xl overflow-hidden transition-all duration-300"
                >
                  <div className="p-5">
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                          <Mail className="h-4 w-4 text-indigo-500" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-black text-slate-900 text-sm">{fu.leadName}</span>
                          <span className="text-slate-400 text-xs font-medium"> · {fu.leadEmail}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          onClick={() => handleApproveAndSend(fu)}
                          disabled={!!sendingId}
                          size="sm"
                          className="h-8 px-4 text-xs font-bold gradient-primary text-white rounded-xl shadow-md shadow-indigo-500/20"
                        >
                          {sendingId === fu.id ? (
                            <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Sending...</>
                          ) : (
                            <><Send className="mr-1.5 h-3 w-3" /> Approve & Send</>
                          )}
                        </Button>

                        <button
                          onClick={() => handleSkip(fu)}
                          className="h-8 px-3 text-xs font-bold text-slate-500 hover:text-red-500 transition-colors"
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Skip</span>
                        </button>
                      </div>
                    </div>

                    {/* Subject */}
                    <p className="text-sm font-bold text-slate-700 mb-2">
                      Subject: {fu.subject}
                    </p>

                    {/* Body Preview */}
                    <div
                      className={cn(
                        'text-xs text-slate-600 leading-relaxed overflow-hidden transition-all duration-300',
                        isExpanded ? 'max-h-none' : 'max-h-12'
                      )}
                      dangerouslySetInnerHTML={{ __html: fu.body }}
                    />

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : fu.id)}
                      className="flex items-center gap-1 mt-2 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                    >
                      {isExpanded ? (
                        <><EyeOff className="h-3 w-3" /> Hide full message</>
                      ) : (
                        <><Eye className="h-3 w-3" /> Show full message</>
                      )}
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Sent Follow-ups History */}
      {sentFollowUps.length > 0 && (
        <section>
          <h2 className="text-lg font-black text-slate-800 mb-4">
            Recently Sent ({sentFollowUps.length})
          </h2>
          <div className="space-y-2">
            {sentFollowUps.map(fu => (
              <div
                key={fu.id}
                className="flex items-center justify-between px-5 py-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{fu.leadName}</p>
                    <p className="text-xs text-slate-500 truncate max-w-[300px]">{fu.subject}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Sent</span>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {fu.sentAt ? new Date(fu.sentAt).toLocaleDateString() : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
