'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Checkbox } from '../../components/ui/checkbox';
import { Trash2, Check, Plus, Server, HardDrive, Shield, Globe, Terminal, Activity, Zap, ShieldAlert, Lock, Key, MapPin, Bot } from 'lucide-react';
import { toast } from 'sonner';
import { SmtpConfig } from '../../types/index';
import { cn } from '../../lib/utils';

export default function SettingsPage() {
    const { smtpConfigs, addSmtpConfig, removeSmtpConfig, defaultSmtpId, setDefaultSmtpId, securityConfig, updateSecurityConfig: updateLocalSecurity, googleApiSettings, updateGoogleApiSettings } = useAppContext();
    const [isTesting, setIsTesting] = useState<string | null>(null);
    const [newIp, setNewIp] = useState('');
    const [placesKey, setPlacesKey] = useState(googleApiSettings.placesApiKey || '');
    const [geminiKey, setGeminiKey] = useState(googleApiSettings.geminiApiKey || '');

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

    const handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const port = Number(e.target.value);
        setNewConfig({
            ...newConfig,
            port,
            secure: port === 465 // Auto-enable SSL for port 465
        });
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
        <div className="flex flex-col h-full min-h-0 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-hidden flex-1 pb-4">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
                <div>
                    <h1 className="text-4xl font-black text-slate-950 tracking-tighter">System Configuration</h1>
                    <p className="text-slate-500 font-medium mt-1">Manage API Keys, SMTP Relays, and Security Policies.</p>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {/* COLUMN 1: API KEYS */}
                <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 h-full">
                    <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl overflow-hidden relative shrink-0">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 blur-[60px] rounded-full pointer-events-none" />
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500">
                            <MapPin className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight">Google Places API</h2>
                            <p className="text-slate-500 text-xs font-medium">Used by Lead Finder to find real businesses</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">API Key</Label>
                        <Input
                            type="password"
                            value={placesKey}
                            onChange={e => setPlacesKey(e.target.value)}
                            placeholder="AIza..."
                            className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 font-medium focus-visible:ring-red-500"
                        />
                        <p className="text-[10px] text-slate-500">Get your key at <a href="https://console.cloud.google.com/" target="_blank" className="text-red-500 font-semibold hover:underline">console.cloud.google.com</a> → Enable Places API</p>
                    </div>
                    <Button
                        onClick={() => {
                            updateGoogleApiSettings({ ...googleApiSettings, placesApiKey: placesKey });
                            toast.success('Google Places API key saved!');
                        }}
                        className="w-full mt-6 h-12 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest shadow-md shadow-red-500/20 transition-all"
                    >
                        <Key className="mr-2 h-4 w-4" /> Save API Key
                    </Button>
                </Card>

                {/* Gemini AI API Key */}
                <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl overflow-hidden relative shrink-0 group hover:border-rose-200 transition-all">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/5 blur-[60px] rounded-full pointer-events-none" />
                    
                    <div className="flex items-center gap-4 mb-5">
                        <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                            <Bot className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 mb-0.5">
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Gemini AI</h2>
                                <span className="text-[9px] font-bold text-rose-600 uppercase tracking-widest bg-rose-100 px-2 py-0.5 rounded-full">Optional</span>
                            </div>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Smart Follow-ups</p>
                        </div>
                    </div>
                    
                    <div className="space-y-5">
                        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                            <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                Integrate Google's AI to auto-generate context-aware email replies. Sounds completely human and boosts response rates.
                            </p>
                            <a href="https://aistudio.google.com/" target="_blank" className="text-[10px] text-rose-500 font-bold hover:underline mt-2 inline-block">→ Get Free API Key</a>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">API Secret Key</Label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Key className="h-4 w-4 text-slate-400" />
                                </div>
                                <Input
                                    type="password"
                                    value={geminiKey}
                                    onChange={e => setGeminiKey(e.target.value)}
                                    placeholder="AIzaSy..."
                                    className="pl-10 bg-white border-slate-200 h-11 rounded-xl text-slate-900 font-medium focus-visible:ring-rose-500 shadow-sm text-sm transition-all"
                                />
                            </div>
                        </div>

                        <Button
                            onClick={async () => {
                                if (!geminiKey) {
                                    toast.error('Please enter an API key first');
                                    return;
                                }
                                setIsTesting('gemini');
                                try {
                                    const res = await fetch('/api/test-gemini', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ apiKey: geminiKey }),
                                    });
                                    const data = await res.json();
                                    if (data.success) {
                                        toast.success('Gemini API Connected Successfully!');
                                        updateGoogleApiSettings({ ...googleApiSettings, geminiApiKey: geminiKey.trim() });
                                    } else {
                                        toast.error(data.message || 'Invalid Gemini API Key');
                                    }
                                } catch (error) {
                                    toast.error('Failed to verify API connection');
                                } finally {
                                    setIsTesting(null);
                                }
                            }}
                            disabled={isTesting === 'gemini'}
                            className="w-full h-11 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase tracking-widest shadow-md shadow-rose-500/20 transition-all text-xs"
                        >
                            {isTesting === 'gemini' ? (
                                <span className="flex items-center gap-2"><div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying...</span>
                            ) : (
                                <span className="flex items-center"><Check className="mr-2 h-4 w-4" /> Connect & Save</span>
                            )}
                        </Button>
                    </div>
                </Card>
                </div>
                <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 h-full">
                    <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl overflow-hidden relative shrink-0 min-h-[400px]">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[80px] rounded-full pointer-events-none" />

                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shadow-sm shrink-0">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-slate-900 tracking-tight">Access Control</h2>
                                <p className="text-slate-500 text-[10px] font-medium">IP Allowlist for security.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex gap-2">
                                <Input
                                    value={newIp}
                                    onChange={(e) => setNewIp(e.target.value)}
                                    placeholder="1.1.1.0/24"
                                    className="bg-slate-50 border-slate-200 h-11 rounded-xl text-slate-900 font-medium flex-1 text-sm focus-visible:ring-red-500"
                                />
                                <Button
                                    onClick={() => {
                                        if (!newIp) return;
                                        updateSecurityConfig({ ipAllowlist: [...securityConfig.ipAllowlist, newIp] });
                                        setNewIp('');
                                        toast.success('Security shield updated');
                                    }}
                                    className="bg-slate-900 hover:bg-slate-800 h-11 px-4 rounded-xl text-white font-black uppercase tracking-widest text-xs shadow-sm transition-all"
                                >
                                    Add
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {securityConfig.ipAllowlist.length === 0 ? (
                                    <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                                        <Shield className="h-6 w-6 mb-2 opacity-30" />
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500 text-center">Global Access Enabled<br/>(No Restrictions)</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {securityConfig.ipAllowlist.map((ip, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl group/ip hover:border-red-200 transition-colors">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-500/50" />
                                                    <code className="text-xs font-bold text-slate-700 truncate">{ip}</code>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        const updated = securityConfig.ipAllowlist.filter((_, i) => i !== index);
                                                        updateSecurityConfig({ ipAllowlist: updated });
                                                        toast.success('Address decommissioned');
                                                    }}
                                                    className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                                <ShieldAlert className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-[9px] font-medium text-red-800 uppercase tracking-wider leading-relaxed">
                                    CAUTION: Be sure to include your current IP address to avoid lockout.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* COLUMN 3: SMTP */}
                <div className="flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2 h-full">
                    <Card className="bg-white border border-slate-200 shadow-sm p-6 rounded-3xl overflow-hidden relative shrink-0">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[80px] rounded-full pointer-events-none" />

                        <div className="flex items-center gap-4 mb-10">
                            <div className="h-12 w-12 rounded-2xl bg-red-50 flex items-center justify-center text-red-500 shadow-sm">
                                <Terminal className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Add New SMTP</h2>
                                <p className="text-slate-500 text-xs font-medium">Connect a new email sending provider.</p>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Relay Host</Label>
                                    <Input value={newConfig.host} onChange={(e: any) => setNewConfig({ ...newConfig, host: e.target.value })} placeholder="smtp.provider.com" className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 font-medium focus-visible:ring-red-500" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Relay Port</Label>
                                    <Input type="number" value={newConfig.port} onChange={handlePortChange} placeholder="587" className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 font-medium focus-visible:ring-red-500" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Encryption</Label>
                                    <div className="flex items-center gap-3 h-12 px-4 rounded-xl bg-slate-50 border border-slate-200">
                                        <Checkbox
                                            id="secure-mode"
                                            checked={newConfig.secure}
                                            onCheckedChange={(checked: any) => setNewConfig({ ...newConfig, secure: checked })}
                                            className="h-5 w-5 border-slate-300 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                        />
                                        <Label htmlFor="secure-mode" className="text-sm font-medium text-slate-700 cursor-pointer flex items-center gap-2">
                                            <Lock className="h-4 w-4 text-emerald-500" /> Use SSL/TLS
                                        </Label>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Auth User</Label>
                                    <Input value={newConfig.user} onChange={(e: any) => setNewConfig({ ...newConfig, user: e.target.value })} placeholder="service@agency.com" className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 font-medium focus-visible:ring-red-500" />
                                </div>
                                <div className="space-y-3">
                                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Secret Key</Label>
                                    <Input type="password" value={newConfig.pass} onChange={(e: any) => setNewConfig({ ...newConfig, pass: e.target.value })} placeholder="••••••••" className="bg-slate-50 border-slate-200 h-12 rounded-xl text-slate-900 font-medium focus-visible:ring-red-500" />
                                </div>
                            </div>

                            <div className="p-8 border-2 border-dashed border-slate-200 bg-slate-50/50 rounded-3xl space-y-6">
                                <div className="flex items-center justify-between pointer-events-none">
                                    <div className="flex items-center gap-3">
                                        <Globe className="h-5 w-5 text-red-500" />
                                        <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">Proxy Tunnel (Optional)</span>
                                    </div>
                                    <div className="h-2 w-2 rounded-full bg-slate-300" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-80 hover:opacity-100 transition-opacity">
                                    <div className="space-y-2 col-span-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tunnel Endpoint</Label>
                                        <Input placeholder="proxy.network.io" className="bg-white border-slate-200 h-10 rounded-lg text-slate-900 text-xs focus-visible:ring-red-500" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tunnel Port</Label>
                                        <Input type="number" placeholder="8080" className="bg-white border-slate-200 h-10 rounded-lg text-slate-900 text-xs focus-visible:ring-red-500" />
                                    </div>
                                    <div className="flex items-end pt-5">
                                        <Button variant="outline" className="w-full h-10 border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 text-[10px] font-bold uppercase tracking-widest rounded-lg">Apply Protocol</Button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <Button onClick={handleAddConfig} className="w-full h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest shadow-md shadow-red-500/20 hover:scale-[1.01] transition-all text-xs">
                                    <Plus className="mr-2 h-4 w-4" /> Add Relay Node
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <div className="flex items-center gap-3 mb-2 px-1">
                        <div className="h-8 w-8 rounded-xl gradient-success flex items-center justify-center text-white shadow-lg shrink-0">
                            <Activity className="h-4 w-4" />
                        </div>
                        <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest">Active Relays</h2>
                    </div>

                    <div className="space-y-4">
                        {smtpConfigs.map((config) => (
                            <Card key={config.id} className={cn("bg-white border border-slate-200 shadow-sm p-6 transition-all duration-300 relative overflow-hidden group rounded-3xl", defaultSmtpId === config.id ? "ring-2 ring-red-500 shadow-red-500/10" : "hover:scale-[1.02]")}>
                                {defaultSmtpId === config.id && (
                                    <div className="absolute top-0 right-0 p-3">
                                        <Zap className="h-4 w-4 text-red-600 fill-red-600" />
                                    </div>
                                )}
                                <div className="flex items-start gap-4 mb-4">
                                    <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-900">
                                        <Server className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-900 tracking-tight leading-tight">{config.host}</h3>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{config.user}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Port Vector</p>
                                        <p className="text-xs font-black text-slate-900">{config.port}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tunneling</p>
                                        <p className="text-xs font-black text-slate-900 lowercase">{config.proxy?.enabled ? 'Active' : 'Direct'}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 flex items-center gap-3">
                                        <div className={cn("h-2 w-2 rounded-full", config.secure ? "bg-emerald-500" : "bg-amber-500")} />
                                        <p className="text-xs font-bold text-slate-700">
                                            {config.secure ? 'SSL/TLS Encrypted' : 'Standard STARTTLS'}
                                        </p>
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
                                        className="h-10 w-10 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50"
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
        </div>
    );
}
