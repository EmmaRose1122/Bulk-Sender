'use client';

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Globe, Plus, Trash2, ShieldCheck, ShieldAlert, CheckCircle2, Copy, ExternalLink, RefreshCw, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Domain } from '../../types/index';
import { cn } from '../../lib/utils';

export default function DomainsPage() {
    const { domains, addDomain, removeDomain, updateDomain } = useAppContext();
    const [newDomain, setNewDomain] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    const handleAdd = () => {
        if (!newDomain || !newDomain.includes('.')) {
            toast.error('Invalid domain format');
            return;
        }

        const domainObj: Domain = {
            id: crypto.randomUUID(),
            name: newDomain.toLowerCase(),
            status: 'pending',
            dkim: `v=DKIM1; k=rsa; p=${Math.random().toString(36).substring(2, 20)}...`,
            spf: `v=spf1 include:_spf.googlesender.com ~all`,
            dmarc: `v=DMARC1; p=quarantine; rua=mailto:dmarc@${newDomain}`,
            createdAt: Date.now(),
        };

        addDomain(domainObj);
        setNewDomain('');
        setIsAdding(false);
        toast.success('Domain provisioned. Awaiting DNS propagation.');
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const verifyDomain = (domain: Domain) => {
        // Simulate verification
        const updated = { ...domain, status: 'active' as const };
        updateDomain(updated);
        toast.success(`${domain.name} verified successfully!`);
    };

    return (
        <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Domain Management</h1>
                    <p className="text-slate-500 font-medium mt-1">Configure and authorize sending domains for maximum reach.</p>
                </div>
                <Button onClick={() => setIsAdding(true)} variant="default" className="gradient-primary h-12 px-6 rounded-xl text-white font-bold shadow-xl shadow-red-500/20">
                    <Plus className="mr-2 h-5 w-5" /> Provision New Domain
                </Button>
            </header>

            {isAdding && (
                <Card className="glass-red border-none shadow-2xl p-8 rounded-3xl animate-in zoom-in-95 duration-300">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400">
                                <Globe className="h-6 w-6" />
                            </div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Register Sending Domain</h2>
                        </div>
                        <div className="grid gap-4">
                            <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Root Domain Name</Label>
                            <div className="flex gap-4">
                                <Input
                                    value={newDomain}
                                    onChange={(e) => setNewDomain(e.target.value)}
                                    placeholder="e.g. agency.com"
                                    className="bg-slate-800/50 border-slate-700 h-14 rounded-2xl text-white font-medium text-lg"
                                />
                                <Button onClick={handleAdd} className="gradient-primary h-14 px-10 rounded-2xl text-white font-black shadow-xl uppercase tracking-widest">Register</Button>
                                <Button onClick={() => setIsAdding(false)} variant="ghost" className="h-14 rounded-2xl text-slate-400 font-bold px-6 border border-slate-700">Cancel</Button>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {domains.length === 0 && !isAdding ? (
                <div className="py-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center opacity-40">
                    <Globe className="h-20 w-16 text-slate-300 mb-6 animate-float" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">No Domains Registered</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-8">
                    {domains.map((domain) => (
                        <Card key={domain.id} className="glass border-none shadow-xl overflow-hidden group">
                            <CardHeader className="p-8 border-b border-slate-100">
                                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
                                    <div className="flex items-center gap-6">
                                        <div className={cn("h-16 w-16 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-transform duration-300 group-hover:scale-105", domain.status === 'active' ? "bg-emerald-500 shadow-emerald-500/20" : "bg-amber-500 shadow-amber-500/20")}>
                                            <Globe className="h-8 w-8" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl font-black text-slate-950 tracking-tight flex items-center gap-3">
                                                {domain.name}
                                                {domain.status === 'active' ? (
                                                    <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest border border-emerald-200">Verified</span>
                                                ) : (
                                                    <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200 flex items-center gap-1">
                                                        <RefreshCw className="h-3 w-3 animate-spin" /> Pending DNS
                                                    </span>
                                                )}
                                            </CardTitle>
                                            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                Managed via Googlesender Infrastructure
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Button variant="ghost" size="sm" onClick={() => removeDomain(domain.id)} className="text-red-500 hover:bg-red-50 font-bold uppercase text-[10px] tracking-widest px-4">
                                            <Trash2 className="mr-2 h-4 w-4" /> Decommission
                                        </Button>
                                        {domain.status !== 'active' && (
                                            <Button onClick={() => verifyDomain(domain)} className="gradient-primary text-white h-10 px-6 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-500/20">
                                                Verify Records
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-8 bg-slate-50/30">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    {/* SPF */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">SPF Record</span>
                                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(domain.spf, 'SPF')} className="h-6 w-6 text-red-500 hover:bg-red-50">
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="p-4 bg-white border border-slate-100 rounded-2xl">
                                            <code className="text-xs font-bold text-red-600 break-all">{domain.spf}</code>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                            <CheckCircle2 className="h-3 w-3" /> Syntax Valid
                                        </div>
                                    </div>

                                    {/* DKIM */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">DKIM Selector</span>
                                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(domain.dkim, 'DKIM')} className="h-6 w-6 text-red-500 hover:bg-red-50">
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="p-4 bg-white border border-slate-100 rounded-2xl">
                                            <code className="text-xs font-bold text-red-600 break-all">{domain.dkim}</code>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                            <CheckCircle2 className="h-3 w-3" /> 2048-bit Secure
                                        </div>
                                    </div>

                                    {/* DMARC */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">DMARC Policy</span>
                                            <Button variant="ghost" size="icon" onClick={() => copyToClipboard(domain.dmarc, 'DMARC')} className="h-6 w-6 text-red-500 hover:bg-red-50">
                                                <Copy className="h-4 w-4" />
                                            </Button>
                                        </div>
                                        <div className="p-4 bg-white border border-slate-100 rounded-2xl">
                                            <code className="text-xs font-bold text-red-600 break-all">{domain.dmarc}</code>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                                            <CheckCircle2 className="h-3 w-3" /> Policy Active
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
            {/* Deliverability Knowledge Base */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                <Card className="border-none shadow-xl bg-slate-900 text-white p-8 rounded-[2rem] overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-10 opacity-10">
                        <ShieldCheck className="h-40 w-40" />
                    </div>
                    <div className="relative z-10 space-y-4">
                        <h3 className="text-2xl font-black tracking-tight">Anti-Spam Knowledge Base</h3>
                        <p className="text-slate-400 font-medium">Follow these rules to ensure your emails bypass the &quot;Junk&quot; folder.</p>

                        <div className="space-y-4 mt-6">
                            <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                                <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
                                <div>
                                    <p className="font-bold text-sm">Authentication is Mandatory</p>
                                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest leading-relaxed">Ensure SPF, DKIM, and DMARC are all &quot;Verified&quot;. Without these, Gmail and Outlook will almost certainly flag your SMTP as spam.</p>
                                </div>
                            </div>
                            <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                                <RefreshCw className="h-6 w-6 text-red-400 shrink-0" />
                                <div>
                                    <p className="font-bold text-sm">Warm-up Your Domain</p>
                                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest leading-relaxed">Don&apos;t send 1,000 emails on day one. Start with 50, then 100, then 200. Rapid spikes in volume trigger &quot;Suspicious Activity&quot; alerts.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-xl border border-slate-100 p-8 rounded-[2rem] bg-red-50/50">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight mb-6">Critical Record Hints</h3>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-red-600 uppercase tracking-widest">SPF (Sender Policy Framework)</Label>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">A list of IP addresses authorized to send on behalf of your domain. You should update your existing SPF record to include your SMTP provider.</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-red-600 uppercase tracking-widest">DKIM (DomainKeys Identified Mail)</Label>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">A digital signature added to your email headers. It proves that the email wasn&apos;t tampered with during transit.</p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-red-600 uppercase tracking-widest">DMARC (Domain-based Message Authentication)</Label>
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">Tells receiving servers what to do if SPF or DKIM fails. Setting this to &quot;p=quarantine&quot; or &quot;p=reject&quot; significantly boosts trust.</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
}
