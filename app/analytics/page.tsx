'use client';

import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Trash2, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Mail, BarChart3, ShieldCheck, Activity, Eye, Zap } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EmailLog } from '../../types/index';

export default function AnalyticsPage() {
    const { campaignHistory, clearHistory } = useAppContext();
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Mission Intelligence</h1>
                    <p className="text-slate-500 font-medium mt-1">Deep analysis of past campaign performance and metrics.</p>
                </div>
                {campaignHistory.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearHistory} className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" /> Purge Logs
                    </Button>
                )}
            </header>

            {campaignHistory.length === 0 ? (
                <div className="py-32 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center opacity-40">
                    <BarChart3 className="h-20 w-16 text-slate-300 mb-6 animate-float" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">No Mission Data Detected</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {campaignHistory.map((campaign) => (
                        <Card key={campaign.id} className="glass border-none shadow-xl overflow-hidden group">
                            <CardHeader
                                className="p-8 cursor-pointer hover:bg-slate-50/50 transition-all duration-300"
                                onClick={() => toggleExpand(campaign.id)}
                            >
                                <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-8">
                                    <div className="flex items-center gap-6">
                                        <div className="h-16 w-16 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-2xl shadow-slate-900/20 group-hover:scale-105 transition-transform duration-300">
                                            <Zap className="h-8 w-8 text-indigo-400" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-2xl font-black text-slate-950 tracking-tight">{campaign.name}</CardTitle>
                                            <CardDescription className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                                Executed: {new Date(campaign.createdAt).toLocaleString()}
                                            </CardDescription>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-10">
                                        <div className="grid grid-cols-3 gap-10">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total payload</span>
                                                <span className="text-xl font-black text-slate-950 tabular-nums">{campaign.total}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">Sent Successfully</span>
                                                <span className="text-xl font-black text-emerald-600 tabular-nums">{campaign.sent}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-1">Failed delivery</span>
                                                <span className="text-xl font-black text-red-600 tabular-nums">{campaign.failed}</span>
                                            </div>
                                        </div>
                                        <div className="h-12 w-px bg-slate-100 hidden lg:block" />
                                        <div className={cn("h-10 w-10 rounded-full flex items-center justify-center transition-all duration-300", expandedId === campaign.id ? "bg-indigo-600 text-white rotate-180" : "bg-slate-100 text-slate-400 group-hover:bg-slate-200")}>
                                            <ChevronDown className="h-6 w-6" />
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            {expandedId === campaign.id && (
                                <CardContent className="p-0 border-t border-slate-100 bg-slate-50/30 animate-in slide-in-from-top-4 duration-500">
                                    <div className="max-h-[500px] overflow-y-auto scrollbar-hide">
                                        <table className="w-full text-left">
                                            <thead className="bg-slate-50/80 sticky top-0 z-10">
                                                <tr>
                                                    <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Target Recipient</th>
                                                    <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Deployment State</th>
                                                    <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Transmission High</th>
                                                    <th className="p-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Diagnostic Logs</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {campaign.logs?.map((log: EmailLog) => (
                                                    <tr key={log.id} className="hover:bg-indigo-50/50 transition-colors group">
                                                        <td className="p-6"><span className="text-sm font-bold text-slate-700">{log.email}</span></td>
                                                        <td className="p-6">
                                                            <div className="flex gap-2">
                                                                {log.status === 'sent' && <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-widest flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Transmitted</span>}
                                                                {log.status === 'failed' && <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-widest flex items-center gap-1"><Activity className="h-3 w-3" /> Blocked</span>}
                                                                {log.opened && <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-widest flex items-center gap-1"><Eye className="h-3 w-3" /> Visualized</span>}
                                                            </div>
                                                        </td>
                                                        <td className="p-6"><span className="text-[10px] font-bold text-slate-400 tabular-nums uppercase">{log.sentAt ? new Date(log.sentAt).toLocaleTimeString() : '---'}</span></td>
                                                        <td className="p-6"><span className="text-[10px] font-medium text-slate-500 italic max-w-xs block truncate">{log.error || 'Normal Placement'}</span></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
