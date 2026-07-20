'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart, Search, Users, Clock, Settings, LogOut, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

export function Sidebar() {
    const pathname = usePathname();

    const navItem = (href: string, label: string, Icon: any) => (
        <li key={href}>
            <Link
                href={href}
                className={cn(
                    "group flex items-center gap-4 rounded-xl px-4 py-3 font-medium transition-all duration-300",
                    pathname === href
                        ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-white shadow-sm border border-indigo-500/20"
                        : "hover:bg-slate-800/50 hover:text-slate-200"
                )}
            >
                <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", pathname === href ? "text-white" : "text-indigo-400")} />
                {label}
            </Link>
        </li>
    );

    return (
        <div className="flex h-screen w-64 flex-col glass-dark text-slate-400 border-r border-slate-800/50">
            {/* Logo Area */}
            <div className="p-8 pb-4">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 text-white">
                        <Zap className="h-5 w-5 fill-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-1">
                            ZorainTool
                        </h2>
                        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-indigo-400">AI LEADS</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto custom-scrollbar">
                <ul className="grid gap-2">
                    {navItem('/', 'Dashboard', BarChart)}
                    {navItem('/leads', 'Lead Finder', Search)}
                    {navItem('/leads/list', 'Leads', Users)}
                    {navItem('/followups', 'Follow-ups', Clock)}
                    {navItem('/settings', 'Settings', Settings)}
                </ul>
            </nav>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-800/50">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors group rounded-xl hover:bg-slate-800/50">
                    <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-sm tracking-wide">Logout</span>
                </button>
            </div>
        </div>
    );
}
