'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Upload, Play, Pause, CheckCircle, XCircle, Clock, Mail, AlertTriangle, Server, Layers, FileText, Activity, Users, ListTodo, MessageSquare, BarChart3, ShieldCheck, ShieldAlert, Shield, Eye } from 'lucide-react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { EmailLog, AccountProfile, EmailTemplate } from '../types/index';
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
  const { smtpConfigs, defaultSmtpId, templates, addCampaignToHistory, accounts } = useAppContext();

  // Campaign Configuration
  const [selectedSmtpId, setSelectedSmtpId] = useState<string>(defaultSmtpId || '');
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
  const [manualInputText, setManualInputText] = useState('');
  const [trackingBaseUrl, setTrackingBaseUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTrackingBaseUrl(window.location.origin);
    }
  }, []);

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

          setLogs(prev => prev.map(log => {
            if (trackingData[log.id] && !log.opened) {
              return {
                ...log,
                opened: true,
                openedAt: trackingData[log.id].openedAt
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
    const currentLogs = logsRef.current;

    if (stopRef.current || startIndex >= currentLogs.length) {
      setIsSending(false);
      addCampaignToHistory({
        id: crypto.randomUUID(),
        name: fileName || `Campaign ${new Date().toLocaleDateString()}`,
        createdAt: Date.now(),
        total: progress.total,
        sent: progress.sent,
        failed: progress.failed,
        status: stopRef.current ? 'paused' : 'completed',
        logs: currentLogs,
      });
      toast.success(stopRef.current ? 'Campaign stopped' : 'Campaign finished!');
      return;
    }

    const endIndex = Math.min(startIndex + batchSize, currentLogs.length);
    const batch = currentLogs.slice(startIndex, endIndex);
    const account = accounts.find((a: AccountProfile) => a.id === selectedSmtpId);
    const smtpRelay = smtpConfigs.find((s: any) => s.id === selectedSmtpId);

    if (!account && !smtpRelay) {
      toast.error('Source account configuration not found.');
      setIsSending(false);
      return;
    }

    const currentSmtp = smtpRelay ? {
      host: smtpRelay.host,
      port: smtpRelay.port,
      secure: smtpRelay.secure,
      user: smtpRelay.user,
      pass: smtpRelay.pass,
      fromEmail: smtpRelay.fromEmail || smtpRelay.user,
      fromName: smtpRelay.fromName || '',
      proxy: smtpRelay.proxy
    } : {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: account!.email,
      pass: account!.password || '',
      fromEmail: account!.email,
      fromName: account!.name,
    };

    const promises = batch.map(async (log, batchIndex) => {
      const globalIndex = startIndex + batchIndex;
      const rowData = csvData[globalIndex];
      const templateId = selectedTemplateIds[globalIndex % selectedTemplateIds.length];
      const currentTemplate = templates.find((t: EmailTemplate) => t.id === templateId);

      if (!currentTemplate) return false;

      let subject = currentTemplate.subject;
      let body = currentTemplate.body;

      Object.keys(rowData).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const value = rowData[key];
        subject = subject.replace(regex, value);
        body = body.replace(regex, value);
      });

      subject = resolveSpintax(subject);
      body = resolveSpintax(body) + generateFingerprint();

      try {
        const res = await fetch('/api/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            smtpConfig: currentSmtp,
            to: log.email,
            subject,
            html: body,
            trackingId: log.id,
            baseUrl: trackingBaseUrl,
          }),
        });

        const data = await res.json();
        setLogs(prev => {
          const newLogs = [...prev];
          newLogs[globalIndex] = {
            ...newLogs[globalIndex],
            status: data.success ? 'sent' : 'failed',
            error: data.success ? undefined : data.message,
            sentAt: Date.now(),
          };
          return newLogs;
        });
        return data.success;
      } catch (error) {
        setLogs(prev => {
          const newLogs = [...prev];
          newLogs[globalIndex] = { ...newLogs[globalIndex], status: 'failed', error: 'Network error' };
          return newLogs;
        });
        return false;
      }
    });

    const results = await Promise.all(promises);
    const sentCount = results.filter(Boolean).length;
    setProgress(prev => ({
      ...prev,
      sent: prev.sent + sentCount,
      failed: prev.failed + (results.length - sentCount),
      current: endIndex,
    }));

    if (endIndex < currentLogs.length) {
      const jitteredWait = waitTime * (0.8 + Math.random() * 0.4);
      setTimeout(() => processBatch(endIndex), jitteredWait * 1000);
    } else {
      setIsSending(false);
      toast.success('Campaign finished!');
    }
  };

  const startCampaign = () => {
    if (!selectedSmtpId) { toast.error('Select an account'); return; }
    if (selectedTemplateIds.length === 0) { toast.error('Select templates'); return; }
    if (logs.length === 0) { toast.error('Upload recipients'); return; }
    stopRef.current = false;
    setIsSending(true);
    processBatch(0);
  };

  const stopCampaign = () => {
    stopRef.current = true;
    setIsSending(false);
    toast.info('Campaign stopping...');
  };

  return (
    <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Campaign Control</h1>
          <p className="text-slate-500 font-medium mt-1">Design and deploy your high-impact email sequences.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">System Ready</span>
        </div>
      </header>

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

            <div className="flex items-center gap-4 mb-10">
              <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-xl shadow-indigo-500/20">
                <ListTodo className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">Campaign Blueprint</h2>
                <p className="text-slate-400 text-xs font-medium">Configure target audience and delivery parameters.</p>
              </div>
            </div>

            <div className="space-y-8">
              {/* Account Selection */}
              <div className="space-y-4">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Source Account</Label>
                <select
                  className="w-full h-12 bg-slate-800/30 border-2 border-slate-700/50 rounded-xl px-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                  value={selectedSmtpId}
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
                {accounts.length === 0 && smtpConfigs.length === 0 && (
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-400/10 border border-amber-400/20 rounded-lg p-3">
                    ⚠️ No accounts or relays detected. Configure infrastructure first.
                  </p>
                )}
              </div>

              {/* CSV Upload */}
              <div className="space-y-4">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Target Audience</Label>
                <div className="flex flex-wrap gap-4">
                  <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" ref={fileInputRef} />
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="h-12 px-6 rounded-xl border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700 transition-all font-bold">
                    <Users className="mr-2 h-4 w-4 text-indigo-400" /> Upload CSV
                  </Button>
                  <Button onClick={() => setIsManualInputOpen(true)} variant="outline" className="h-12 px-6 rounded-xl border-slate-700 bg-slate-800/50 text-white hover:bg-slate-700 transition-all font-bold">
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
                    className="w-full h-40 bg-slate-800/30 border-2 border-slate-700/50 rounded-2xl p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                    value={selectedTemplateIds}
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
                  <Input value={trackingBaseUrl} onChange={(e: any) => setTrackingBaseUrl(e.target.value)} className="bg-slate-800/30 border-2 border-slate-700/50 text-slate-200 h-12 rounded-xl" placeholder="https://..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Batch</Label>
                    <Input type="number" value={batchSize} onChange={(e: any) => setBatchSize(Number(e.target.value))} className="bg-slate-800/30 border-2 border-slate-700/50 text-slate-200 h-12 rounded-xl" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-bold text-slate-300 uppercase tracking-widest">Wait (s)</Label>
                    <Input type="number" value={waitTime} onChange={(e: any) => setWaitTime(Number(e.target.value))} className="bg-slate-800/30 border-2 border-slate-700/50 text-slate-200 h-12 rounded-xl" />
                  </div>
                </div>
              </div>

              <div className="pt-10 flex gap-4">
                {!isSending ? (
                  <Button className="flex-1 h-14 gradient-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all" onClick={startCampaign} disabled={logs.length === 0}>
                    <Play className="mr-2 h-5 w-5" /> Launch Operation
                  </Button>
                ) : (
                  <Button variant="destructive" className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-red-500/20" onClick={stopCampaign}>
                    <Pause className="mr-2 h-5 w-5" /> Abort Sequence
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
                      <td className="p-6"><span className="text-[10px] font-bold text-slate-400 tabular-nums">{log.sentAt ? new Date(log.sentAt).toLocaleTimeString() : '---'}</span></td>
                      <td className="p-6"><span className="text-[10px] font-medium text-slate-500 italic truncate block max-w-xs">{log.error || 'Normal Placement'}</span></td>
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
    </div>
  );
}
