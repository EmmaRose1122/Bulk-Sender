'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Trash2, Check, Plus, Server, HardDrive, Shield, Globe, Terminal, Activity, Zap, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { SmtpConfig } from '../../types/index';
import { cn } from '../../lib/utils';

export default function SettingsPage() {
    const { smtpConfigs, addSmtpConfig, removeSmtpConfig, defaultSmtpId, setDefaultSmtpId, securityConfig, updateSecurityConfig: updateLocalSecurity } = useAppContext();
    const [isTesting, setIsTesting] = useState<string | null>(null);
    const [newIp, setNewIp] = useState('');

    useEffect(() => {
        const fetchSecurity = async () => {
            try {
                const res = await fetch('/api/security');
                const data = await res.json();
                if (data.success) {
                    updateLocalSecurity(data.config);
                }
            } catch (error) {
                console.error('Failed to sync security parameters');
            }
        };
        fetchSecurity();
    }, []);

    const updateSecurityConfig = async (config: any) => {
        updateLocalSecurity(config);
        try {
            await fetch('/api/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
        } catch (error) {
            toast.error('Failed to synchronize cloud security');
        }
    };

    const [newConfig, setNewConfig] = useState<Partial<SmtpConfig>>({
        host: '',
        port: 587,
        user: '',
        pass: '',
        fromEmail: '',
        fromName: '',
        secure: false,
        proxy: {
            enabled: false,
            protocol: 'http',
            host: '',
            port: 8080,
            auth: { user: '', pass: '' }
        }
    });

    const handleAddConfig = () => {
        if (!newConfig.host || !newConfig.user || !newConfig.pass) {
            toast.error('Required fields missing');
            return;
        }

        const config: SmtpConfig = {
            id: crypto.randomUUID(),
            host: newConfig.host,
            port: Number(newConfig.port),
            user: newConfig.user,
            pass: newConfig.pass,
            fromEmail: newConfig.fromEmail || newConfig.user,
            fromName: newConfig.fromName || '',
            secure: newConfig.secure || false,
            proxy: newConfig.proxy?.enabled ? {
                enabled: true,
                protocol: newConfig.proxy.protocol,
                host: newConfig.proxy.host,
                port: Number(newConfig.proxy.port),
                auth: (newConfig.proxy.auth?.user && newConfig.proxy.auth?.pass) ? {
                    user: newConfig.proxy.auth.user,
                    pass: newConfig.proxy.auth.pass
                } : undefined
            } : undefined
        };

        addSmtpConfig(config);
        setNewConfig({
            host: '',
            port: 587,
            user: '',
            pass: '',
            fromEmail: '',
            fromName: '',
            secure: false,
            proxy: { enabled: false, protocol: 'http', host: '', port: 8080, auth: { user: '', pass: '' } }
        });
        toast.success('System parameters updated');
    };

    const testConnection = async (config: SmtpConfig) => {
        setIsTesting(config.id);
        try {
            const res = await fetch('/api/test-smtp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config),
            });
            const data = await res.json();
            if (data.success) toast.success('Protocol handshake successful');
            else toast.error(`Handshake failed: ${data.message}`);
        } catch (error) {
            toast.error('System connection error');
        } finally {
            setIsTesting(null);
        }
    };

    return (
        <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-950 tracking-tighter">SMTP & Sending Accounts</h1>
                    <p className="text-slate-500 font-medium mt-1">Connect your custom SMTP servers (Gmail, Outlook, SendGrid, etc).</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{smtpConfigs.length} Relay Configs</span>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Add Section */}
                <div className="xl:col-span-8">
                    <Card className="glass-dark border-none shadow-2xl p-8 rounded-3xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

                        <div className="flex items-center gap-4 mb-10">
                            <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-xl">
                                <Terminal className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Add New SMTP Account</h2>
                                <p className="text-slate-400 text-xs font-medium">Connect a new email sending provider.</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Relay Host</Label>
                                    <Input value={newConfig.host} onChange={(e: any) => setNewConfig({ ...newConfig, host: e.target.value })} placeholder="smtp.provider.com" className="bg-slate-800/50 border-slate-700 h-12 rounded-xl text-white font-medium" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Relay Port</Label>
                                    <Input type="number" value={newConfig.port} onChange={(e: any) => setNewConfig({ ...newConfig, port: Number(e.target.value) })} placeholder="587" className="bg-slate-800/50 border-slate-700 h-12 rounded-xl text-white font-medium" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Authentication User</Label>
                                    <Input value={newConfig.user} onChange={(e: any) => setNewConfig({ ...newConfig, user: e.target.value })} placeholder="service@agency.com" className="bg-slate-800/50 border-slate-700 h-12 rounded-xl text-white font-medium" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Secret Key (Pass)</Label>
                                    <Input type="password" value={newConfig.pass} onChange={(e: any) => setNewConfig({ ...newConfig, pass: e.target.value })} placeholder="••••••••" className="bg-slate-800/50 border-slate-700 h-12 rounded-xl text-white font-medium" />
                                </div>
                            </div>

                            <div className="p-8 border-2 border-dashed border-slate-700 rounded-3xl space-y-6">
                                <div className="flex items-center justify-between pointer-events-none">
                                    <div className="flex items-center gap-3">
                                        <Globe className="h-5 w-5 text-indigo-400" />
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Proxy Tunnel (Optional)</span>
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-slate-700" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-60 hover:opacity-100 transition-opacity">
                                    <div className="space-y-2 col-span-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tunnel Endpoint</Label>
                                        <Input placeholder="proxy.network.io" className="bg-slate-800/30 border-slate-700/50 h-10 rounded-lg text-white text-xs" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tunnel Port</Label>
                                        <Input type="number" placeholder="8080" className="bg-slate-800/30 border-slate-700/50 h-10 rounded-lg text-white text-xs" />
                                    </div>
                                    <div className="flex items-end pt-5">
                                        <Button variant="outline" className="w-full h-10 border-slate-700 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded-lg">Apply Protocol</Button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button onClick={handleAddConfig} className="w-full h-14 rounded-2xl gradient-primary text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.01] transition-all">
                                    <Plus className="mr-2 h-5 w-5" /> Integrate Relay Node
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* List Section */}
                <div className="xl:col-span-4 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl gradient-success flex items-center justify-center text-white shadow-lg">
                            <Activity className="h-5 w-5" />
                        </div>
                        <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase tracking-widest text-xs font-bold text-slate-400">Active Accounts</h2>
                    </div>

                    <div className="space-y-6">
                        {smtpConfigs.map((config) => (
                            <Card key={config.id} className={cn("glass border-none shadow-xl p-6 transition-all duration-300 relative overflow-hidden group", defaultSmtpId === config.id ? "ring-2 ring-indigo-500 shadow-indigo-500/10" : "hover:scale-[1.02]")}>
                                {defaultSmtpId === config.id && (
                                    <div className="absolute top-0 right-0 p-3">
                                        <Zap className="h-4 w-4 text-indigo-600 fill-indigo-600" />
                                    </div>
                                )}
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900">
                                        <Server className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 tracking-tight leading-tight">{config.host}</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{config.user}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Port Vector</p>
                                        <p className="text-xs font-black text-slate-900">{config.port}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tunneling</p>
                                        <p className="text-xs font-black text-slate-900 lowercase">{config.proxy?.enabled ? 'Active' : 'Direct'}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => testConnection(config)}
                                        disabled={isTesting === config.id}
                                        className="flex-1 h-10 rounded-lg border-slate-200 text-slate-900 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-50"
                                    >
                                        {isTesting === config.id ? 'Handshaking...' : 'Test Sync'}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeSmtpConfig(config.id)}
                                        className="h-10 w-10 rounded-lg text-red-500 hover:bg-red-50"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </Card>
                        ))}
                        {smtpConfigs.length === 0 && (
                            <div className="py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center opacity-40">
                                <HardDrive className="h-10 w-10 text-slate-300 mb-4 animate-float" />
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Infrastructure Null</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Security Center */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Security Center</h1>
                    <p className="text-slate-500 font-medium mt-1">Restrict infrastructure access to authorized network segments.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-8">
                    <Card className="glass-dark border-none shadow-2xl p-8 rounded-3xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[80px] rounded-full pointer-events-none" />

                        <div className="flex items-center gap-4 mb-10">
                            <div className="h-12 w-12 rounded-2xl bg-red-500/20 flex items-center justify-center text-red-400 shadow-xl">
                                <Shield className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">Access Control (IP Allowlist)</h2>
                                <p className="text-slate-400 text-xs font-medium">Only allow requests from specific IP addresses or ranges.</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <Input
                                    value={newIp}
                                    onChange={(e) => setNewIp(e.target.value)}
                                    placeholder="e.g. 192.168.1.1 or 1.1.1.0/24"
                                    className="bg-slate-800/50 border-slate-700 h-14 rounded-xl text-white font-medium flex-1"
                                />
                                <Button
                                    onClick={() => {
                                        if (!newIp) return;
                                        updateSecurityConfig({ ipAllowlist: [...securityConfig.ipAllowlist, newIp] });
                                        setNewIp('');
                                        toast.success('Security shield updated');
                                    }}
                                    className="gradient-primary h-14 px-10 rounded-xl text-white font-black uppercase tracking-widest"
                                >
                                    Authorize
                                </Button>
                            </div>

                            <div className="space-y-4">
                                {securityConfig.ipAllowlist.length === 0 ? (
                                    <div className="p-10 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-500">
                                        <Shield className="h-8 w-8 mb-3 opacity-20" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Global Access Enabled (No Restrictions)</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {securityConfig.ipAllowlist.map((ip, index) => (
                                            <div key={index} className="flex items-center justify-between p-4 bg-slate-800/30 border border-slate-700 rounded-xl group/ip">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                                                    <code className="text-sm font-bold text-slate-300">{ip}</code>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        const updated = securityConfig.ipAllowlist.filter((_, i) => i !== index);
                                                        updateSecurityConfig({ ipAllowlist: updated });
                                                        toast.success('Address decommissioned');
                                                    }}
                                                    className="h-8 w-8 text-slate-500 hover:text-red-400 opacity-0 group-hover/ip:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-4">
                                <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] font-medium text-amber-200 uppercase tracking-wider leading-relaxed">
                                    CAUTION: Be sure to include your current IP address to avoid locking yourself out of the transmission engine.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
