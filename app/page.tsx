'use client';

import { useAppContext } from '../context/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Users, Mail, MessageCircle, MessageSquare, Eye, Clock, BarChart3, ListFilter, Activity } from 'lucide-react';

export default function DashboardPage() {
    const { leads, followUps } = useAppContext();

    // Calculate metrics
    const totalLeads = leads?.length || 0;
    const emailsSent = followUps?.length || 0; // Simplified for now
    const pendingFollowups = followUps?.filter(f => f.status === 'pending').length || 0;
    
    // Status counts
    const statusCounts = leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // Niche counts
    const nicheCounts = leads.reduce((acc, lead) => {
        const niche = lead.niche || 'Unknown';
        acc[niche] = (acc[niche] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topNiches = Object.entries(nicheCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    const stats = [
        { title: 'Total Leads', value: totalLeads.toString(), icon: <Users className="h-5 w-5 text-red-400" />, bg: 'bg-red-500/10' },
        { title: 'Emails Sent', value: emailsSent.toString(), icon: <Mail className="h-5 w-5 text-emerald-400" />, bg: 'bg-emerald-500/10' },
        { title: 'WhatsApp Sent', value: '0', icon: <MessageCircle className="h-5 w-5 text-green-400" />, bg: 'bg-green-500/10' },
        { title: 'Replies', value: '0', icon: <MessageSquare className="h-5 w-5 text-blue-400" />, bg: 'bg-blue-500/10' },
        { title: 'Email Open Rate', value: '0%', icon: <Eye className="h-5 w-5 text-rose-400" />, bg: 'bg-rose-500/10' },
        { title: 'Pending Follow-ups', value: pendingFollowups.toString(), icon: <Clock className="h-5 w-5 text-amber-400" />, bg: 'bg-amber-500/10' },
    ];

    const pipelineStages = ['New', 'Contacted', 'Replied', 'Interested', 'Closed'];

    return (
        <div className="flex flex-col h-full min-h-0 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700 overflow-hidden flex-1">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Dashboard</h1>
                    <p className="text-slate-500 font-medium mt-1">Overview of your lead generation and outreach campaigns.</p>
                </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {stats.map((stat, i) => (
                    <Card key={i} className="glass border-none shadow-xl rounded-2xl overflow-hidden group hover:scale-[1.02] transition-transform">
                        <CardContent className="p-4">
                            <div className="flex flex-col justify-between items-start gap-2">
                                <div className={`p-2 rounded-xl ${stat.bg} self-end absolute top-4 right-4`}>
                                    {stat.icon}
                                </div>
                                <div className="space-y-1 w-full">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate pr-8">{stat.title}</p>
                                    <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                                </div>
                                <div className={`p-3 rounded-2xl ${stat.bg}`}>
                                    {stat.icon}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0 pb-4">
                {/* Pipeline Chart */}
                <Card className="glass border-none shadow-2xl rounded-3xl p-5 relative overflow-hidden flex flex-col h-full min-h-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 blur-[80px] rounded-full pointer-events-none" />
                    <CardHeader className="p-0 mb-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-lg">
                                <BarChart3 className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black text-slate-900">Lead Pipeline</CardTitle>
                                <p className="text-xs font-medium text-slate-500 mt-1">Distribution across all stages</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 space-y-3 overflow-y-auto custom-scrollbar flex-1 pr-2">
                        {pipelineStages.map(stage => {
                            const count = statusCounts[stage] || 0;
                            const percentage = totalLeads === 0 ? 0 : Math.round((count / totalLeads) * 100);
                            return (
                                <div key={stage} className="space-y-2">
                                    <div className="flex justify-between text-sm font-bold">
                                        <span className="text-slate-700">{stage}</span>
                                        <span className="text-slate-900">{count} <span className="text-slate-400 font-medium">({percentage}%)</span></span>
                                    </div>
                                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full gradient-primary rounded-full"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>

                {/* Top Niches */}
                <Card className="glass border-none shadow-2xl rounded-3xl p-5 relative overflow-hidden flex flex-col h-full min-h-0">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[80px] rounded-full pointer-events-none" />
                    <CardHeader className="p-0 mb-4 shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl gradient-secondary flex items-center justify-center text-white shadow-lg">
                                <ListFilter className="h-5 w-5" />
                            </div>
                            <div>
                                <CardTitle className="text-xl font-black text-slate-900">Top Niches</CardTitle>
                                <p className="text-xs font-medium text-slate-500 mt-1">Most successful categories</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {topNiches.length > 0 ? topNiches.map(([niche, count], i) => (
                            <div key={niche} className="flex items-center justify-between p-4 rounded-2xl bg-white/50 border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-black text-xs">
                                        #{i + 1}
                                    </div>
                                    <span className="font-bold text-slate-800">{niche}</span>
                                </div>
                                <span className="font-black text-slate-900">{count} <span className="text-xs text-slate-500 font-medium ml-1">leads</span></span>
                            </div>
                        )) : (
                            <div className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                                <Activity className="h-8 w-8 mb-2 opacity-50" />
                                <p className="text-sm font-medium">No niche data available</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
