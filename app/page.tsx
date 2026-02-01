'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Trash2, Plus, Eye, Save, Search, Layout, FileCode, CheckCircle2, AlertCircle, ShieldCheck, Shield, MessageSquare, ListTodo, Users, ShieldAlert, BarChart3, Settings, Play, Square, Pause, ChevronDown, Activity, Zap, CheckCircle, XCircle, Clock, Mail, Globe, HelpCircle } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { EmailLog, AccountProfile, EmailTemplate, Domain } from '../types/index';
import { cn } from '../lib/utils';
import { resolveSpintax, generateFingerprint } from '../lib/spintax';
import { analyzeDeliverability, DeliverabilityScore } from '../lib/deliverability';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: string;
  trend?: string;
}

const StatCard = ({ title, value, icon, description, trend }: StatCardProps) => (
  <Card className="p-6 glass border-none relative overflow-hidden group hover:scale-[1.02] transition-all duration-300">
    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
      {icon}
    </div>
    <div className="flex flex-col gap-1">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      <div className="flex items-end gap-2">
        <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
        {trend && <span className="text-[10px] font-bold text-emerald-500 mb-1">{trend}</span>}
      </div>
      <p className="text-[10px] font-medium text-slate-500 mt-1">{description}</p>
    </div>
  </Card>
);

export default function CampaignPage() {
  const { accounts, templates, addCampaignToHistory, updateCampaignInHistory, smtpConfigs, domains, updateCampaignStatus, activeCampaign, setActiveCampaign, updateActiveCampaign } = useAppContext();

  // Campaign Configuration
  const [selectedSmtpId, setSelectedSmtpId] = useState<string>('');
  const [selectedDomainId, setSelectedDomainId] = useState<string>('');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [batchSize, setBatchSize] = useState<number>(10);
  const [waitTime, setWaitTime] = useState<number>(5); // Seconds

  // Data & State
  const [csvData, setCsvData] = useState<any[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const logsRef = useRef<EmailLog[]>([]);

  useEffect(() => {
    logsRef.current = logs;
  }, [logs]);

  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0, current: 0 });
  const [fileName, setFileName] = useState<string>('');
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [manualInputText, setManualInputText] = useState('');
  const [trackingBaseUrl, setTrackingBaseUrl] = useState<string>('');
  const [currentCampaignId, setCurrentCampaignId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Restore campaign state on mount
  useEffect(() => {
    if (activeCampaign) {
      setSelectedSmtpId(activeCampaign.selectedSmtpId);
      setSelectedDomainId(activeCampaign.selectedDomainId);
      setSelectedTemplateIds(activeCampaign.selectedTemplateIds);
      setBatchSize(activeCampaign.batchSize);
      setWaitTime(activeCampaign.waitTime);
      setCsvData(activeCampaign.csvData);
      setLogs(activeCampaign.logs);
      setProgress(activeCampaign.progress);
      setFileName(activeCampaign.fileName);
      setTrackingBaseUrl(activeCampaign.trackingBaseUrl);
      setCurrentCampaignId(activeCampaign.id);
      setIsSending(activeCampaign.isSending);

      // Resume campaign if it was sending
      if (activeCampaign.isSending) {
        stopRef.current = false;
        setIsEditMode(false);
        toast.info('Resuming campaign...');
        processBatch(activeCampaign.currentIndex);
      } else {
        // Campaign is paused, enable edit mode
        setIsEditMode(true);
      }
    } else if (typeof window !== 'undefined') {
      setTrackingBaseUrl(window.location.origin);
    }
  }, []); // Run only on mount

  useEffect(() => {
    if (typeof window !== 'undefined' && !trackingBaseUrl) {
      setTrackingBaseUrl(window.location.origin);
    }
  }, [trackingBaseUrl]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef(false);

  // Deliverability Analysis
  const [delivScore, setDelivScore] = useState<DeliverabilityScore | null>(null);

  useEffect(() => {
    if (selectedTemplateIds.length > 0) {
      const template = templates.find((t: EmailTemplate) => t.id === selectedTemplateIds[0]);
      if (template) {
        setDelivScore(analyzeDeliverability(template.subject, template.body));
      }
    } else {
      setDelivScore(null);
    }
  }, [selectedTemplateIds, templates]);

  // Open Tracking Polling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSending || logs.some(l => l.status === 'sent' && !l.opened)) {
      interval = setInterval(async () => {
        try {
          const res = await fetch('/api/campaign-status');
          const trackingData = await res.json();

          // Update context so analytics/history stays updated
          updateCampaignStatus(trackingData);

          setLogs(prev => prev.map(log => {
            if (trackingData[log.id] && !log.opened) {
              return {
                ...log,
                opened: true,
                openedAt: trackingData[log.id].openedAt,
                location: trackingData[log.id].locationString
              };
            }
            return log;
          }));
        } catch (error) {
          console.error('Polling Error:', error);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isSending, logs]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newLogs: EmailLog[] = results.data.map((row: any) => ({
          id: crypto.randomUUID(),
          email: row.email || row.Email || '',
          status: 'pending',
        }));
        setLogs(newLogs);
        logsRef.current = newLogs;
        setProgress({ sent: 0, failed: 0, total: results.data.length, current: 0 });
      },
      error: (error) => {
        toast.error(`CSV Error: ${error.message}`);
      }
    });
  };

  const handleManualSubmit = () => {
    if (!manualInputText.trim()) {
      setIsManualInputOpen(false);
      return;
    }

    const lines = manualInputText.split('\n');
    const parsedData: any[] = [];
    let addedCount = 0;

    lines.forEach(line => {
      const email = line.trim();
      if (email && email.includes('@')) {
        parsedData.push({ email });
        addedCount++;
      }
    });

    if (addedCount > 0) {
      const newLogs: EmailLog[] = parsedData.map((row: any) => ({
        id: crypto.randomUUID(),
        email: row.email,
        status: 'pending',
      }));

      setCsvData(prev => [...prev, ...parsedData]);
      setLogs(prev => {
        const updated = [...prev, ...newLogs];
        logsRef.current = updated;
        return updated;
      });

      setProgress(prev => ({ ...prev, total: prev.total + addedCount }));
      toast.success(`Added ${addedCount} emails`);
      setManualInputText('');
      setIsManualInputOpen(false);
    } else {
      toast.error('No valid emails found');
    }
  };

  const processBatch = async (startIndex: number) => {
    const endIndex = Math.min(startIndex + batchSize, logs.length);
    const batch = logs.slice(startIndex, endIndex);

    const currentSmtp = smtpConfigs.find(s => s.id === selectedSmtpId) || (accounts.find(a => a.id === selectedSmtpId) ? {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: accounts.find(a => a.id === selectedSmtpId)!.email,
      pass: accounts.find(a => a.id === selectedSmtpId)!.password || '',
      fromEmail: accounts.find(a => a.id === selectedSmtpId)!.email,
      fromName: accounts.find(a => a.id === selectedSmtpId)!.name,
    } : null);

    if (!currentSmtp) {
      toast.error('Transmission vector lost. Neutralizing campaign.');
      setIsSending(false);
      setActiveCampaign(null);
      return;
    }

    const currentLogs = [...logs];

    // Parallel Multi-Threading for Enterprise Scaling
    const sendPromises = batch.map(async (recipientLog, batchIndex) => {
      const globalIndex = startIndex + batchIndex;
      const rowData = csvData[globalIndex];
      const templateId = selectedTemplateIds[globalIndex % selectedTemplateIds.length];
      const currentTemplate = templates.find((t: EmailTemplate) => t.id === templateId);

      if (!currentTemplate) {
        return { success: false, email: recipientLog.email, error: 'Template missing', id: recipientLog.id };
      }

      const replaceVariables = (text: string, data: any) => {
        return text.replace(/\{\{([^}]+)\}\}/g, (match, p1) => {
          const [key, fallback] = p1.split('|').map((s: string) => s.trim());
          const csvKey = Object.keys(data).find(k => k.toLowerCase() === key.toLowerCase());
          const value = csvKey ? data[csvKey] : undefined;
          return (value !== undefined && value !== '') ? value : (fallback || match);
        });
      };

      const subject = resolveSpintax(replaceVariables(currentTemplate.subject, rowData));
      const trackingUrl = (target: string) => `${trackingBaseUrl || 'http://localhost:3000'}/api/click?target=${encodeURIComponent(target)}&id=${recipientLog.id}`;

      let processedBody = resolveSpintax(replaceVariables(currentTemplate.body, rowData));

      // Link Injection Logic
      processedBody = processedBody.replace(/href=["']([^"']+)["']/g, (match, url) => {
        if (url.startsWith('http')) {
          return `href="${trackingUrl(url)}"`;
        }
        return match;
      });

      // Unsubscribe Footer Injection
      const unsubscribeLink = `${trackingBaseUrl || 'http://localhost:3000'}/api/unsubscribe?id=${recipientLog.id}`;
      const footerHtml = `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 12px; color: #aaa;">
          <a href="${unsubscribeLink}" style="color: #aaa; text-decoration: none;">Unsubscribe</a>
      </div>
      `;

      let body = processedBody;
      const extras = footerHtml + generateFingerprint();

      if (body.includes('</body>')) {
        body = body.replace('</body>', `${extras}</body>`);
      } else {
        body += extras;
      }

      try {
        const res = await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            smtpConfig: currentSmtp,
            to: recipientLog.email,
            subject,
            html: body,
            trackingId: recipientLog.id,
            baseUrl: trackingBaseUrl
          }),
        });

        const data = await res.json();
        return { success: data.success, email: recipientLog.email, error: data.message, id: recipientLog.id };
      } catch (err: any) {
        return { success: false, email: recipientLog.email, error: err.message, id: recipientLog.id };
      }
    });

    const results = await Promise.all(sendPromises);

    let batchSent = 0;
    let batchFailed = 0;

    results.forEach((res, idx) => {
      const globalIndex = startIndex + idx;
      currentLogs[globalIndex] = {
        ...currentLogs[globalIndex],
        status: res.success ? 'sent' : 'failed',
        error: res.success ? undefined : res.error,
        sentAt: Date.now(),
      };
      if (res.success) batchSent++;
      else batchFailed++;
    });

    setLogs(currentLogs);
    const newProgress = {
      ...progress,
      sent: progress.sent + batchSent,
      failed: progress.failed + batchFailed,
      current: endIndex,
    };
    setProgress(newProgress);

    // Persist batch progress to history immediately
    if (currentCampaignId) {
      updateCampaignInHistory(currentCampaignId, {
        sent: progress.sent + batchSent,
        failed: progress.failed + batchFailed,
        logs: currentLogs
      });
    }

    // Save current state to activeCampaign
    updateActiveCampaign({
      logs: currentLogs,
      progress: newProgress,
      currentIndex: endIndex,
    });

    if (endIndex < currentLogs.length && !stopRef.current) {
      const jitter = (Math.random() * 0.4) + 0.8;
      setTimeout(() => processBatch(endIndex), waitTime * jitter * 1000);
    } else if (!stopRef.current) {
      const finalizeCampaign = (isStopped: boolean) => {
        setIsSending(false);
        if (currentCampaignId) {
          updateCampaignInHistory(currentCampaignId, {
            sent: progress.sent + batchSent,
            failed: progress.failed + batchFailed,
            status: isStopped ? 'paused' : 'completed',
            logs: currentLogs,
          });
        }
        // Clear active campaign when done
        setActiveCampaign(null);
        toast.success(isStopped ? 'Campaign stopped' : 'Campaign finished!');
      };
      finalizeCampaign(false);
    }
  };

  const startCampaign = () => {
    if (!selectedSmtpId) { toast.error('Select an account'); return; }
    if (selectedTemplateIds.length === 0) { toast.error('Select templates'); return; }
    if (logs.length === 0) { toast.error('Upload recipients'); return; }

    const campaignId = crypto.randomUUID();
    setCurrentCampaignId(campaignId);
    stopRef.current = false;
    setIsSending(true);

    // Initial save to history
    addCampaignToHistory({
      id: campaignId,
      name: fileName || `Campaign ${new Date().toLocaleDateString()}`,
      createdAt: Date.now(),
      total: logs.length,
      sent: 0,
      failed: 0,
      status: 'sending',
      logs: logs
    });

    // Save to activeCampaign for persistence
    setActiveCampaign({
      id: campaignId,
      selectedSmtpId,
      selectedDomainId,
      selectedTemplateIds,
      batchSize,
      waitTime,
      csvData,
      logs,
      progress: { sent: 0, failed: 0, total: logs.length, current: 0 },
      fileName,
      trackingBaseUrl,
      isSending: true,
      currentIndex: 0,
    });

    processBatch(0);
  };

  const stopCampaign = () => {
    stopRef.current = true;
    setIsSending(false);
    setIsEditMode(true);

    // Update active campaign to stopped state
    if (activeCampaign) {
      updateActiveCampaign({ isSending: false });
    }

    // Update history
    if (currentCampaignId) {
      updateCampaignInHistory(currentCampaignId, {
        status: 'paused',
      });
    }

    toast.info('Campaign paused - You can now edit settings');
  };

  const resumeCampaign = () => {
    if (!selectedSmtpId) { toast.error('Select an account'); return; }
    if (selectedTemplateIds.length === 0) { toast.error('Select templates'); return; }
    if (logs.length === 0) { toast.error('No recipients found'); return; }

    stopRef.current = false;
    setIsSending(true);
    setIsEditMode(false);

    // Update active campaign with new settings
    if (activeCampaign) {
      updateActiveCampaign({
        selectedSmtpId,
        selectedDomainId,
        selectedTemplateIds,
        batchSize,
        waitTime,
        csvData,
        logs,
        trackingBaseUrl,
        isSending: true,
      });
    }

    // Update history
    if (currentCampaignId) {
      updateCampaignInHistory(currentCampaignId, {
        status: 'sending',
        total: logs.length,
      });
    }

    toast.success('Resuming campaign with updated settings...');
    processBatch(progress.current);
  };

  const clearCampaign = () => {
    setActiveCampaign(null);
    setCurrentCampaignId(null);
    setIsSending(false);
    setIsEditMode(false);
    setLogs([]);
    setCsvData([]);
    setProgress({ sent: 0, failed: 0, total: 0, current: 0 });
    setFileName('');
    setSelectedSmtpId('');
    setSelectedDomainId('');
    setSelectedTemplateIds([]);
    toast.success('Campaign cleared - Ready for new campaign');
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Campaign Control</h1>
          <p className="text-slate-500 font-medium mt-1">Design and deploy your high-impact email sequences.</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {trackingBaseUrl.includes('localhost') && (
            <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
              <ShieldAlert className="h-3 w-3 text-amber-500" />
              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Tracking disabled on Localhost</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Ready</span>
          </div>
        </div>
      </header>

      {/* Campaign Status Banner */}
      {activeCampaign && isSending && (
        <Card className="p-4 bg-indigo-500/10 border-indigo-500/20 border-2 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-500 flex items-center justify-center text-white">
              <Activity className="h-5 w-5 animate-pulse" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-black text-indigo-700">Campaign Running</h3>
              <p className="text-xs text-indigo-600 font-medium">Continuing from where it left off. ({progress.current}/{progress.total} processed)</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={stopCampaign}
              className="border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/10"
            >
              <Pause className="mr-1 h-3 w-3" /> Pause
            </Button>
          </div>
        </Card>
      )}

      {/* Paused Campaign Banner - Edit Mode */}
      {activeCampaign && !isSending && isEditMode && (
        <Card className="p-6 bg-amber-500/10 border-amber-500/20 border-2 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500 flex items-center justify-center text-white">
              <Settings className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-black text-amber-700 flex items-center gap-2">
                Campaign Paused - Edit Mode Active
                <span className="text-xs font-bold px-2 py-0.5 bg-amber-500/20 rounded-full">EDITABLE</span>
              </h3>
              <p className="text-xs text-amber-600 font-medium mt-1">
                Progress: {progress.current}/{progress.total} emails processed • {progress.sent} sent • {progress.failed} failed
              </p>
              <p className="text-[10px] text-amber-600/80 font-medium mt-1">
                You can modify account, templates, batch size, or add/remove recipients below. Click Resume when ready to continue.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resumeCampaign}
                className="border-emerald-500/30 text-emerald-700 hover:bg-emerald-500/10 font-bold"
              >
                <Play className="mr-1 h-3 w-3" /> Resume
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCampaign}
                className="border-red-500/30 text-red-600 hover:bg-red-500/10 font-bold"
              >
                <Trash2 className="mr-1 h-3 w-3" /> Clear
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Potential Reach"
          value={csvData.length.toString()}
          icon={<Users className="h-12 w-12" />}
          description="Total validated recipients"
          trend="+12%"
        />
        <StatCard
          title="Active Profiles"
          value={accounts.length.toString()}
          icon={<ListTodo className="h-12 w-12" />}
          description="SMTP accounts available"
        />
        <StatCard
          title="Templates"
          value={templates.length.toString()}
          icon={<MessageSquare className="h-12 w-12" />}
          description="Pre-configured responses"
        />
        <StatCard
          title="Success Rate"
          value="98.2%"
          icon={<BarChart3 className="h-12 w-12" />}
          description="Average inbox placement"
          trend="OPTIMIZED"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Left: Campaign Setup */}
        <div className="xl:col-span-8 space-y-8">
          <Card className="p-8 glass-dark border-none shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                  <ListTodo className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tight">Campaign Blueprint</h2>
                  <p className="text-slate-400 text-xs font-medium">Configure target audience and delivery parameters.</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsHelpOpen(true)} className="text-slate-500 hover:text-indigo-400 hover:bg-slate-800/50 rounded-xl">
                <HelpCircle className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-8">
              {/* Account Selection */}
              <div className="space-y-4">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Source Account</Label>
                <select
                  className="w-full h-12 bg-slate-800/30 border-2 border-slate-700/50 rounded-xl px-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                  value={selectedSmtpId}
                  disabled={isSending}
                  onChange={(e) => setSelectedSmtpId(e.target.value)}
                >
                  <option value="" className="bg-slate-900">Select Transmission Vector</option>
                  {accounts.length > 0 && (
                    <optgroup label="Direct Profiles" className="bg-slate-900 text-indigo-400 font-bold uppercase text-[10px]">
                      {accounts.map((a: AccountProfile) => (
                        <option key={a.id} value={a.id} className="bg-slate-900 text-slate-200">{a.name} ({a.email})</option>
                      ))}
                    </optgroup>
                  )}
                  {smtpConfigs.length > 0 && (
                    <optgroup label="Relay Nodes (Custom SMTP)" className="bg-slate-900 text-emerald-400 font-bold uppercase text-[10px]">
                      {smtpConfigs.map((s: any) => (
                        <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">{s.host} ({s.user})</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* Domain Selection */}
              <div className="space-y-4">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Authorized Domain Vector</Label>
                <select
                  className="w-full h-12 bg-slate-800/30 border-2 border-slate-700/50 rounded-xl px-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                  value={selectedDomainId}
                  disabled={isSending}
                  onChange={(e) => setSelectedDomainId(e.target.value)}
                >
                  <option value="" className="bg-slate-900">Default (Direct Tunnel)</option>
                  {domains.map((d: Domain) => (
                    <option key={d.id} value={d.id} className="bg-slate-900 text-slate-200">{d.name} ({d.status === 'active' ? 'Authorized' : 'Pending'})</option>
                  ))}
                </select>
                {domains.length === 0 && (
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-1">
                    No authorized domains. Using direct server identity.
                  </p>
                )}
              </div>

              {/* CSV Upload */}
              <div className="space-y-4">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Target Audience</Label>
                <div className="flex flex-wrap gap-4">
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" ref={fileInputRef} />
                  <Button onClick={() => fileInputRef.current?.click()} disabled={isSending} variant="outline" className="h-12 px-6 rounded-xl border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                    <Users className="mr-2 h-4 w-4 text-indigo-400" /> Upload CSV
                  </Button>
                  <Button onClick={() => setIsManualInputOpen(true)} disabled={isSending} variant="outline" className="h-12 px-6 rounded-xl border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                    <MessageSquare className="mr-2 h-4 w-4 text-indigo-400" /> Manual
                  </Button>
                  {csvData.length > 0 && (
                    <div className="flex items-center gap-2 px-4 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                      <ShieldCheck className="h-4 w-4" /> <span className="text-sm font-bold">{csvData.length} Recipients</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Template Selection */}
              <div className="space-y-4">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Message Sequence</Label>
                <div className="relative">
                  <select
                    multiple
                    className="w-full h-40 bg-slate-800/30 border-2 border-slate-700/50 rounded-2xl p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
                    value={selectedTemplateIds}
                    disabled={isSending}
                    onChange={(e) => setSelectedTemplateIds(Array.from(e.target.selectedOptions, o => o.value))}
                  >
                    {templates.map((t: EmailTemplate) => (
                      <option key={t.id} value={t.id} className="p-3 rounded-lg hover:bg-indigo-500/20 mb-1">📄 {t.name} ({t.subject})</option>
                    ))}
                  </select>
                  <div className="absolute bottom-4 right-4 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 text-[10px] font-bold text-slate-400 uppercase">
                    {selectedTemplateIds.length} Selected
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest border border-slate-700/50 rounded-md px-2 py-1 bg-slate-800/30">Available Tokens:</span>
                  {['name', 'business_name', 'website'].map(token => (
                    <code key={token} className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                      {"{{"}{token}{"|fallback}"}
                    </code>
                  ))}
                  <div className="w-full flex items-center gap-2 mt-2 px-3 py-2 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                    <AlertCircle className="h-3 w-3 text-indigo-400" />
                    <p className="text-[10px] text-slate-400 font-medium italic">Case-insensitive. Use | for optional fallbacks.</p>
                  </div>
                </div>
              </div>

              {delivScore && (
                <div className={cn("p-6 rounded-2xl border-2 flex flex-col gap-3 transition-all", delivScore.risk === 'Low' ? "bg-emerald-500/5 border-emerald-500/20" : delivScore.risk === 'Medium' ? "bg-amber-500/5 border-amber-500/20" : "bg-red-500/5 border-red-500/20")}>
                  <div className="flex items-center justify-between">
                    <span className={cn("text-xs font-black uppercase tracking-widest flex items-center gap-2", delivScore.risk === 'Low' ? "text-emerald-400" : delivScore.risk === 'Medium' ? "text-amber-400" : "text-red-400")}>
                      {delivScore.risk === 'Low' ? <ShieldCheck className="h-4 w-4" /> : delivScore.risk === 'Medium' ? <Shield className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                      Intelligence: {delivScore.risk} Risk Placement
                    </span>
                    <span className="text-xl font-black text-white">{delivScore.score}%</span>
                  </div>
                  {delivScore.suggestions.length > 0 && (
                    <ul className="text-[10px] font-bold space-y-1 list-none text-slate-400 uppercase tracking-wider">
                      {delivScore.suggestions.map((s: string, i: number) => <li key={i} className="flex gap-2 items-center"><div className="h-1 w-1 rounded-full bg-slate-600" /> {s}</li>)}
                    </ul>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <Label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Tracking Base URL</Label>
                  <Input value={trackingBaseUrl} disabled={isSending} onChange={(e: any) => setTrackingBaseUrl(e.target.value)} className="bg-slate-800/30 border-2 border-slate-700/50 text-slate-200 h-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed" placeholder="https://..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Batch</Label>
                    <Input type="number" value={batchSize} disabled={isSending} onChange={(e: any) => setBatchSize(Number(e.target.value))} className="bg-slate-800/30 border-2 border-slate-700/50 text-slate-200 h-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Wait (s)</Label>
                    <Input type="number" value={waitTime} disabled={isSending} onChange={(e: any) => setWaitTime(Number(e.target.value))} className="bg-slate-800/30 border-2 border-slate-700/50 text-slate-200 h-12 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed" />
                  </div>
                </div>
              </div>

              <div className="pt-10 flex gap-4">
                {isEditMode && activeCampaign ? (
                  // Paused campaign - show Resume and Clear
                  <>
                    <Button
                      className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-emerald-500/20 hover:scale-[1.02] transition-all"
                      onClick={resumeCampaign}
                      disabled={logs.length === 0}
                    >
                      <Play className="mr-2 h-5 w-5" /> Resume Campaign
                    </Button>
                    <Button
                      variant="outline"
                      className="h-14 px-8 border-2 border-red-500/30 text-red-600 hover:bg-red-500/10 font-black uppercase tracking-widest rounded-2xl"
                      onClick={clearCampaign}
                    >
                      <Trash2 className="mr-2 h-5 w-5" /> Clear & Start Fresh
                    </Button>
                  </>
                ) : !isSending ? (
                  // New campaign - show Launch
                  <Button
                    className="flex-1 h-14 gradient-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all"
                    onClick={startCampaign}
                    disabled={logs.length === 0}
                  >
                    <Play className="mr-2 h-5 w-5" /> Launch Operation
                  </Button>
                ) : (
                  // Running campaign - show Pause
                  <Button
                    variant="destructive"
                    className="flex-1 h-14 bg-amber-600 hover:bg-amber-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-amber-500/20"
                    onClick={stopCampaign}
                  >
                    <Pause className="mr-2 h-5 w-5" /> Pause Campaign
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Live Activity */}
        <div className="xl:col-span-12 space-y-8">
          <Card className="glass border-none shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl gradient-success flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 tracking-tight">Mission Intelligence</h2>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Real-time Deployment Stream</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Recipient</th>
                    <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Status</th>
                    <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Time</th>
                    <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Analytics</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="p-6"><span className="text-sm font-bold text-slate-700">{log.email}</span></td>
                      <td className="p-6 text-[10px] font-bold uppercase tracking-widest">
                        <div className="flex gap-2">
                          {log.status === 'sent' && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200">Transmitted</span>}
                          {log.status === 'failed' && <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full border border-red-200">Blocked</span>}
                          {log.status === 'pending' && <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full border border-slate-200">In Queue</span>}
                          {log.opened && <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full border border-indigo-200 flex items-center gap-1"><Eye className="h-3 w-3" /> Visualized</span>}
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span className="text-[10px] font-bold text-slate-600 tabular-nums">
                              {log.sentAt ? new Date(log.sentAt).toLocaleTimeString() : '---'}
                            </span>
                          </div>
                          {log.opened && (
                            <div className="flex items-center gap-1.5">
                              <Eye className="h-3 w-3 text-indigo-500" />
                              <span className="text-[10px] font-black text-indigo-600 tabular-nums uppercase">
                                {new Date(log.openedAt || 0).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="text-[10px] font-medium text-slate-500 italic truncate block max-w-xs">
                          {log.location ? (
                            <span className="text-emerald-600 font-bold not-italic flex items-center gap-1">
                              <Globe className="h-3 w-3" /> {log.location}
                            </span>
                          ) : (
                            log.error || 'Normal Placement'
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr><td colSpan={4} className="p-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Awaiting Instruction</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={isManualInputOpen} onOpenChange={setIsManualInputOpen}>
        <DialogContent className="glass-dark border-none shadow-2xl p-8 max-w-2xl rounded-3xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black text-white tracking-tight">Direct Entry Protocol</DialogTitle>
            <DialogDescription className="text-slate-400">Manual injection of recipient email addresses.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Recipient Array (One per line)</Label>
            <Textarea
              placeholder="operator1@agency.com&#10;operator2@agency.com"
              className="min-h-[300px] bg-slate-800/50 border-2 border-slate-700/50 text-white rounded-2xl p-6 focus:ring-2 focus:ring-indigo-500"
              value={manualInputText}
              onChange={(e: any) => setManualInputText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button onClick={handleManualSubmit} className="h-12 px-10 gradient-primary text-white font-black uppercase tracking-widest rounded-xl">Commit Array</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent className="glass-dark border-none shadow-2xl p-8 max-w-2xl rounded-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
                <Settings className="h-4 w-4 text-white" />
              </div>
              Campaign Control Features
            </DialogTitle>
            <DialogDescription className="text-slate-400">Advanced workflow controls for managing active campaigns.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 text-slate-300">
            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><Pause className="h-4 w-4 text-amber-500" /> Pause & Edit</h3>
              <p className="text-sm leading-relaxed">Click "Pause Campaign" at any time. Sending stops immediately, preserving progress. The interface enters <strong>Edit Mode</strong>, unlocking all settings.</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><Play className="h-4 w-4 text-emerald-500" /> Dynamic Adjustments</h3>
              <p className="text-sm leading-relaxed">While paused, you can safely:</p>
              <ul className="text-sm space-y-1 list-disc pl-5 text-slate-400">
                <li>Switch SMTP Accounts (e.g. if daily limit reached)</li>
                <li>Change Templates (A/B testing mid-stream)</li>
                <li>Add/Remove Recipients (Upload new CSV)</li>
                <li>Adjust Speed (Batch Size & Wait Time)</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-white flex items-center gap-2"><Zap className="h-4 w-4 text-indigo-500" /> Resume</h3>
              <p className="text-sm leading-relaxed">Click "Resume Campaign" to continue exactly where you left off, applying your <strong>new settings</strong> to the remaining recipients.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsHelpOpen(false)} className="h-10 px-6 gradient-primary text-white font-bold rounded-xl">Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
