'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, ListTodo, BarChart3, Users, Globe, Mail, Settings, Search, UserCheck, Clock } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAppContext } from '../context/AppContext';

export function Sidebar() {
    const pathname = usePathname();
    const { followUps } = useAppContext();
    const pendingFollowUps = followUps.filter(f => f.status === 'pending').length;

    const navItem = (href: string, label: string, Icon: any, badge?: number) => (
        <li key={href}>
            <Link
                href={href}
                className={cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 group',
                    pathname === href
                        ? 'gradient-primary text-white shadow-xl shadow-indigo-500/20'
                        : 'hover:bg-slate-800/50 hover:text-white'
                )}
            >
                <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", pathname === href ? "text-white" : "text-indigo-400")} />
                {label}
                {badge != null && badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white px-1">
                        {badge}
                    </span>
                )}
            </Link>
        </li>
    );

    return (
        <div className="flex h-screen w-64 flex-col glass-dark text-slate-400 border-r border-slate-800/50">
            <div className="flex h-16 items-center px-6 border-b border-slate-800/50">
                <Link href="/" className="flex items-center gap-3 font-extrabold text-white text-xl tracking-tight group">
                    <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                        <span className="text-lg" role="img" aria-label="lightning">⚡</span>
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        BulkSender
                    </span>
                </Link>
            </div>

            <nav className="flex-1 overflow-y-auto py-6">
                {/* Campaigns */}
                <div className="px-6 text-[10px] font-bold uppercase text-slate-500 tracking-[0.2em] mb-3">Campaigns</div>
                <ul className="grid gap-1 px-4 mb-6">
                    {navItem('/', 'Campaign', ListTodo)}
                    {navItem('/profiles', 'Gmail Accounts', Users)}
                    {navItem('/templates', 'Templates', MessageSquare)}
                    {navItem('/settings', 'SMTP Settings', Settings)}
                </ul>

                {/* Lead CRM */}
                <div className="px-6 text-[10px] font-bold uppercase text-slate-500 tracking-[0.2em] mb-3">Lead CRM</div>
                <ul className="grid gap-1 px-4 mb-6">
                    {navItem('/leads', 'Lead Finder', Search)}
                    {navItem('/leads/list', 'Leads', UserCheck)}
                    {navItem('/followups', 'Follow-ups', Clock, pendingFollowUps)}
                </ul>

                {/* Insights */}
                <div className="px-6 text-[10px] font-bold uppercase text-slate-500 tracking-[0.2em] mb-3">Insights</div>
                <ul className="grid gap-1 px-4">
                    {navItem('/analytics', 'Reports', BarChart3)}
                    {navItem('/domains', 'Domains', Globe)}
                    {navItem('/inbound', 'Inbound Hub', Mail)}
                </ul>
            </nav>

            <div className="p-4 mt-auto border-t border-slate-800/50">
                <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/30">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Plan Usage</p>
                    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full w-[0%] gradient-primary rounded-full" />
                    </div>
                    <p className="text-xs text-slate-400 mt-3 font-medium">0 / 1000 emails</p>
                </div>
            </div>
        </div>
    );
}


