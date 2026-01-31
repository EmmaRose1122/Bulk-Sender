
'use client';

import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Trash2, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Mail, BarChart3, ShieldCheck, Activity, Eye, Zap, MousePointer, UserMinus, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';
import { EmailLog } from '../../types/index';

// Simple Circular Progress Component
const CircularProgress = ({ value, label, subLabel, color = "indigo" }: { value: number, label: string, subLabel: string, color?: string }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center py-6">
            <div className="relative h-32 w-32 flex items-center justify-center">
                <svg className="h-full w-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r={radius} stroke="#f1f5f9" strokeWidth="8" fill="none" />
                    <circle
                        cx="50" cy="50" r={radius}
                        stroke={color === 'indigo' ? '#6366f1' : color === 'emerald' ? '#10b981' : '#f43f5e'}
                        strokeWidth="8" fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
                    <span className="text-2xl font-black tabular-nums">{value.toFixed(1)}%</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">{subLabel}</span>
                </div>
            </div>
            <div className="text-center mt-2">
                <p className="font-bold text-slate-700">{label}</p>
                <p className="text-sm font-bold text-slate-900 mt-1">Performance: <span className="text-emerald-600">Great</span></p>
            </div>
        </div>
    );
};

// Stat Card Component
const StatCard = ({ icon: Icon, value, label, color }: { icon: any, value: number, label: string, color: string }) => (
    <Card className="border-none shadow-lg hover:shadow-xl transition-shadow">
        <CardContent className="p-6 flex items-center justify-between">
            <div className={`h-12 w-12 rounded-xl ${color} flex items-center justify-center mr-4`}>
                <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="text-right">
                <p className="text-2xl font-black text-slate-900 tabular-nums">{value}</p>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
            </div>
        </CardContent>
    </Card>
);

export default function AnalyticsPage() {
    const { campaignHistory, clearHistory, accounts, updateCampaignStatus } = useAppContext();
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);
    const [stats, setStats] = useState({
        opens: 0,
        clicks: 0,
        bounces: 0,
        unsubscribes: 0,
        totalSent: 0
    });

    const syncData = async () => {
        setSyncing(true);
        try {
            const res = await fetch('/api/reports/sync');
            const { tracking } = await res.json();

            // Update global context with fresh tracking data
            updateCampaignStatus(tracking);
            let totalOpens = 0;
            let totalClicks = 0;
            let totalUnsubs = 0;
            let totalBounces = 0;
            let sentCount = 0;

            campaignHistory.forEach(c => {
                sentCount += c.sent;
                totalBounces += c.failed;
                c.logs?.forEach(log => {
                    const serverData = tracking[log.id];
                    if (serverData) {
                        if (serverData.opened) totalOpens++;
                        if (serverData.clicked) totalClicks++;
                        if (serverData.unsubscribed) totalUnsubs++;
                    } else {
                        // Fallback to local data if sync misses
                        if (log.opened) totalOpens++;
                    }
                });
            });

            setStats({
                opens: totalOpens,
                clicks: totalClicks,
                bounces: totalBounces,
                unsubscribes: totalUnsubs,
                totalSent: sentCount
            });
        } catch (e) {
            console.error(e);
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        syncData();
    }, [campaignHistory]);

    const openRate = stats.totalSent > 0 ? (stats.opens / stats.totalSent) * 100 : 0;

    return (
        <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Mission Intelligence</h1>
                    <p className="text-slate-500 font-medium mt-1">Deep analysis of past campaign performance and metrics.</p>
                </div>
                <Button variant="outline" size="sm" onClick={syncData} disabled={syncing}>
                    {syncing ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                    Sync Data
                </Button>
            </header>

            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Eye} value={stats.opens} label="Total Opens" color="bg-indigo-500" />
                <StatCard icon={MousePointer} value={stats.clicks} label="Total Clicks" color="bg-cyan-400" />
                <StatCard icon={Activity} value={stats.bounces} label="Bounces" color="bg-emerald-400" />
                <StatCard icon={UserMinus} value={stats.unsubscribes} label="Unsubscribes" color="bg-amber-300" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Open Rate Chart */}
                <Card className="border-none shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg font-black text-slate-800 text-center">Open Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <CircularProgress value={openRate} label="Open Rate" subLabel="Opened" />
                    </CardContent>
                </Card>

                {/* Geographic Distribution */}
                <Card className="border-none shadow-lg lg:col-span-2 overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-black text-slate-800">Geographic Distribution</CardTitle>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded">Live Data Active</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="p-8 flex items-center justify-center bg-indigo-50/20">
                                <div className="text-center">
                                    <div className="relative inline-block">
                                        <Globe className="h-32 w-32 text-indigo-500 mb-4 animate-[spin_20s_linear_infinite]" />
                                        <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full -z-10 animate-pulse" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Global Intelligence Network</p>
                                </div>
                            </div>
                            <div className="p-8 space-y-6">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Top Visualizer Locations</h4>
                                <div className="space-y-4">
                                    {Object.entries(
                                        campaignHistory
                                            .flatMap(c => c.logs || [])
                                            .filter(log => log.opened && log.location)
                                            .reduce((acc, log) => {
                                                acc[log.location!] = (acc[log.location!] || 0) + 1;
                                                return acc;
                                            }, {} as Record<string, number>)
                                    )
                                        .sort((a, b) => b[1] - a[1])
                                        .slice(0, 5)
                                        .map(([loc, count], idx) => (
                                            <div key={loc} className="flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                                                        {idx + 1}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">{loc}</span>
                                                </div>
                                                <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{count} <span className="text-[10px] opacity-60">OPENS</span></span>
                                            </div>
                                        ))}
                                    {Object.keys(campaignHistory.flatMap(c => c.logs || []).filter(l => l.opened && l.location)).length === 0 && (
                                        <div className="py-10 text-center text-slate-300 italic text-sm">
                                            Awaiting geo-intelligence data...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Leads Table Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-black text-slate-900">Recent Leads Activity</h2>
                <div className="bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</th>
                                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Activity</th>
                                <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {campaignHistory
                                .flatMap(c => c.logs || [])
                                .sort((a, b) => (b.openedAt || b.sentAt || 0) - (a.openedAt || a.sentAt || 0))
                                .map((log, i) => (
                                    <tr key={log.id || i} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-4 font-bold text-slate-700">
                                            {log.email}
                                            {log.location && (
                                                <span className="block text-[10px] text-emerald-600 flex items-center gap-1 font-bold italic">
                                                    <Globe className="h-2 w-2" /> {log.location}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={cn(
                                                    "w-fit px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter border",
                                                    log.status === 'sent' ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                                                )}>
                                                    {log.status === 'sent' ? 'Delivered' : 'Failed'}
                                                </span>
                                                {log.opened ? (
                                                    <span className="w-fit px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                                                        <Eye className="h-2.5 w-2.5" /> Opened
                                                    </span>
                                                ) : (
                                                    <span className="w-fit px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter bg-slate-50 text-slate-400 border border-slate-200">
                                                        Not Opened
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {log.opened ? (
                                                <div className="space-y-0.5">
                                                    <p className="text-[10px] font-bold text-slate-900 flex items-center gap-1 uppercase">
                                                        <Clock className="h-3 w-3 text-indigo-500" /> {new Date(log.openedAt || 0).toLocaleTimeString()}
                                                    </p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {new Date(log.openedAt || 0).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-black text-slate-200 uppercase tracking-widest">Awaiting...</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-[10px] font-bold text-slate-400 tabular-nums">
                                            {log.sentAt ? new Date(log.sentAt).toLocaleTimeString() : '-'}
                                        </td>
                                    </tr>
                                ))}
                            {campaignHistory.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400 text-sm italic">No data available. Run a campaign to populate intelligence.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
