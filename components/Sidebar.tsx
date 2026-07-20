'use client';

import Link from 'next/link';
import Image from 'next/image';
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
                        ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                        : "text-slate-600 hover:bg-red-50 hover:text-red-600"
                )}
            >
                <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", pathname === href ? "text-white" : "text-slate-400 group-hover:text-red-500")} />
                {label}
            </Link>
        </li>
    );

    return (
        <div className="flex h-screen w-64 flex-col bg-transparent text-slate-800 border-r border-slate-200">
            {/* Logo Area */}
            <div className="p-8 pb-4">
                <div className="flex flex-col items-center gap-2 mb-2">
                    <div className="relative h-20 w-32 flex items-center justify-center shrink-0">
                        <Image src="/logo.png" alt="Dot Skills Logo" fill className="object-contain drop-shadow-sm" priority />
                    </div>
                    <div className="text-center mt-2">
                        <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center justify-center gap-1">
                            Dot Skills
                        </h2>
                        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-red-500">Marketing Agency</span>
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
            <div className="p-4 border-t border-slate-200">
                <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-red-600 transition-colors group rounded-xl hover:bg-red-50">
                    <LogOut className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
                    <span className="font-bold text-sm tracking-wide">Logout</span>
                </button>
            </div>
        </div>
    );
}
