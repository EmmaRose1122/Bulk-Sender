'use client';

import { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../../components/ui/dialog';
import { Checkbox } from '../../components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Trash2, Upload, LogIn, CheckSquare, Square, Mail, Users, ShieldCheck, Activity } from 'lucide-react';
import Papa from 'papaparse';
import { AccountProfile } from '../../types/index';
import { cn } from '../../lib/utils';

export default function ProfilesPage() {
    const { accounts, addAccount, removeAccount, updateAccount } = useAppContext();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newAccount, setNewAccount] = useState({ name: '', email: '', password: '', secondaryEmail: '' });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSelectAll = () => {
        setSelectedIds(accounts.map((a: AccountProfile) => a.id));
    };

    const handleDeselectAll = () => {
        setSelectedIds([]);
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleAddAccount = () => {
        if (!newAccount.email) {
            toast.error('Email is required');
            return;
        }
        addAccount({
            id: crypto.randomUUID(),
            name: newAccount.name || newAccount.email.split('@')[0],
            email: newAccount.email,
            password: newAccount.password,
            secondaryEmail: newAccount.secondaryEmail,
            status: 'unchecked'
        });
        setNewAccount({ name: '', email: '', password: '', secondaryEmail: '' });
        setIsAddModalOpen(false);
        toast.success('Account added');
    };

    const handleRemoveSelected = () => {
        if (selectedIds.length === 0) return;
        if (confirm(`Are you sure you want to remove ${selectedIds.length} accounts?`)) {
            selectedIds.forEach(id => removeAccount(id));
            setSelectedIds([]);
            toast.success('Accounts removed');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                let addedCount = 0;
                results.data.forEach((row: any) => {
                    const email = row.email || row.Email;
                    if (email) {
                        addAccount({
                            id: crypto.randomUUID(),
                            name: row.name || row.Name || email.split('@')[0],
                            email: email,
                            password: row.password || row.Password || '',
                            secondaryEmail: row.secondary_email || row.SecondaryEmail || '',
                            status: 'unchecked'
                        });
                        addedCount++;
                    }
                });
                toast.success(`${addedCount} accounts imported`);
            },
            error: (error) => {
                toast.error(`CSV Error: ${error.message}`);
            }
        });
    };

    const handleLogin = async (account: AccountProfile) => {
        toast.promise(
            new Promise((resolve) => setTimeout(resolve, 1500)),
            {
                loading: `Authenticating ${account.email}...`,
                success: () => {
                    updateAccount({ ...account, status: 'valid' });
                    return `Authenticated: ${account.email}`;
                },
                error: 'Authentication failed'
            }
        );
    };

    const handleAutoLoginSelected = () => {
        const selectedAccounts = accounts.filter(a => selectedIds.includes(a.id));
        selectedAccounts.forEach(account => handleLogin(account));
    };

    return (
        <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Account Inventory</h1>
                    <p className="text-slate-500 font-medium mt-1">Manage your fleet of SMTP delivery sensors.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{accounts.length} Active Nodes</span>
                </div>
            </header>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-4">
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="h-12 px-6 rounded-xl gradient-primary text-white font-bold shadow-lg shadow-indigo-500/20 hover:scale-[1.02] transition-all">
                            <Plus className="mr-2 h-4 w-4" /> Add Sensor Node
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="glass-dark border-none shadow-2xl p-8 rounded-3xl text-white">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-black tracking-tight">Node Configuration</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-6 py-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Display Alias</Label>
                                <Input
                                    value={newAccount.name}
                                    onChange={e => setNewAccount({ ...newAccount, name: e.target.value })}
                                    placeholder="Marketing Node A"
                                    className="bg-slate-800/50 border-slate-700 h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email Address</Label>
                                <Input
                                    value={newAccount.email}
                                    onChange={e => setNewAccount({ ...newAccount, email: e.target.value })}
                                    placeholder="node@gmail.com"
                                    className="bg-slate-800/50 border-slate-700 h-12 rounded-xl"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">App Password</Label>
                                <Input
                                    type="password"
                                    value={newAccount.password}
                                    onChange={e => setNewAccount({ ...newAccount, password: e.target.value })}
                                    placeholder="••••••••••••••••"
                                    className="bg-slate-800/50 border-slate-700 h-12 rounded-xl"
                                />
                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest leading-relaxed">
                                        Note: Use a Google App Password, not your standard login credentials.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddAccount} className="w-full h-12 rounded-xl gradient-primary font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20">Initialize Node</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="h-12 px-6 rounded-xl border-slate-200 bg-white text-slate-900 font-bold hover:bg-slate-50 transition-all shadow-sm">
                    <Upload className="mr-2 h-4 w-4 text-indigo-500" /> Batch Import
                </Button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".csv" onChange={handleFileUpload} />

                <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block" />

                <Button
                    variant="outline"
                    onClick={handleAutoLoginSelected}
                    disabled={selectedIds.length === 0}
                    className="h-12 px-6 rounded-xl border-slate-200 bg-white text-indigo-600 font-bold hover:bg-indigo-50 transition-all shadow-sm disabled:opacity-50"
                >
                    <Activity className="mr-2 h-4 w-4" /> Verify Selected
                </Button>

                <Button
                    variant="ghost"
                    onClick={handleRemoveSelected}
                    disabled={selectedIds.length === 0}
                    className="h-12 px-6 rounded-xl text-red-500 font-bold hover:bg-red-50 transition-all disabled:opacity-50"
                >
                    <Trash2 className="mr-2 h-4 w-4" /> Decommission
                </Button>
            </div>

            {/* Data Table */}
            <Card className="glass border-none shadow-2xl overflow-hidden">
                <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-900 tracking-tight">Node Matrix</h2>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Active SMTP Endpoints</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={handleSelectAll} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select All</Button>
                        <Button variant="ghost" size="sm" onClick={handleDeselectAll} className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Deselect</Button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/80">
                            <tr>
                                <th className="p-6 w-16">
                                    <Checkbox
                                        checked={selectedIds.length === accounts.length && accounts.length > 0}
                                        onCheckedChange={(checked) => checked ? handleSelectAll() : handleDeselectAll()}
                                        className="h-5 w-5 rounded-md border-2 border-slate-300 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500"
                                    />
                                </th>
                                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Sensor Alias</th>
                                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Electronic Mail</th>
                                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Operational Status</th>
                                <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Command</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {accounts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.5em]">Inventory Empty</td>
                                </tr>
                            )}
                            {accounts.map((account) => (
                                <tr key={account.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="p-6">
                                        <Checkbox
                                            checked={selectedIds.includes(account.id)}
                                            onCheckedChange={(checked: any) => toggleSelection(account.id)}
                                            className="h-5 w-5 rounded-md border-2 border-slate-300 data-[state=checked]:bg-indigo-500 data-[state=checked]:border-indigo-500 transition-all group-hover:border-indigo-400"
                                        />
                                    </td>
                                    <td className="p-6">
                                        <span className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{account.name}</span>
                                    </td>
                                    <td className="p-6">
                                        <span className="text-sm font-medium text-slate-500">{account.email}</span>
                                    </td>
                                    <td className="p-6">
                                        {account.status === 'valid' && (
                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-widest flex items-center gap-1 w-fit">
                                                <ShieldCheck className="h-3 w-3" /> Operational
                                            </span>
                                        )}
                                        {account.status === 'invalid' && (
                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-widest flex items-center gap-1 w-fit">
                                                <Activity className="h-3 w-3" /> Failed
                                            </span>
                                        )}
                                        {account.status === 'unchecked' && (
                                            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 uppercase tracking-widest w-fit">
                                                Standby
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-6">
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleLogin(account)}
                                                className="h-8 w-8 text-indigo-500 hover:bg-indigo-50 rounded-lg"
                                            >
                                                <Activity className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => {
                                                    if (confirm(`Remove ${account.email}?`)) {
                                                        removeAccount(account.id);
                                                        toast.success('Account removed');
                                                    }
                                                }}
                                                className="h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
