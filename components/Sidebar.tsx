'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MessageSquare, ListTodo, BarChart3, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-screen w-64 flex-col glass-dark text-slate-400 border-r border-slate-800/50">
            <div className="flex h-16 items-center px-6 border-b border-slate-800/50">
                <Link href="/" className="flex items-center gap-3 font-extrabold text-white text-xl tracking-tight group">
                    <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300">
                        <span className="text-lg">⚡</span>
                    </div>
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        BulkSender
                    </span>
                </Link>
            </div>
            <nav className="flex-1 overflow-y-auto py-8">
                <ul className="grid gap-1 px-4">
                    <li>
                        <Link
                            href="/"
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 group',
                                pathname === '/'
                                    ? 'gradient-primary text-white shadow-xl shadow-indigo-500/20'
                                    : 'hover:bg-slate-800/50 hover:text-white'
                            )}
                        >
                            <ListTodo className={cn("h-5 w-5 transition-transform group-hover:scale-110", pathname === '/' ? "text-white" : "text-indigo-400")} />
                            Campaign
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="/profiles"
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 group',
                                pathname === '/profiles'
                                    ? 'gradient-primary text-white shadow-xl shadow-indigo-500/20'
                                    : 'hover:bg-slate-800/50 hover:text-white'
                            )}
                        >
                            <Users className={cn("h-5 w-5 transition-transform group-hover:scale-110", pathname === '/profiles' ? "text-white" : "text-indigo-400")} />
                            Gmail Accounts
                        </Link>
                    </li>
                    <li>
                        <Link
                            href="/templates"
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 group',
                                pathname === '/templates'
                                    ? 'gradient-primary text-white shadow-xl shadow-indigo-500/20'
                                    : 'hover:bg-slate-800/50 hover:text-white'
                            )}
                        >
                            <MessageSquare className={cn("h-5 w-5 transition-transform group-hover:scale-110", pathname === '/templates' ? "text-white" : "text-indigo-400")} />
                            Templates
                        </Link>
                    </li>
                </ul>

                <div className="mt-10 px-6 text-[10px] font-bold uppercase text-slate-500 tracking-[0.2em]">
                    Insights
                </div>
                <ul className="grid gap-1 px-4 mt-3">
                    <li>
                        <Link
                            href="/analytics"
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 group',
                                pathname === '/analytics'
                                    ? 'gradient-primary text-white shadow-xl shadow-indigo-500/20'
                                    : 'hover:bg-slate-800/50 hover:text-white'
                            )}
                        >
                            <BarChart3 className={cn("h-5 w-5 transition-transform group-hover:scale-110", pathname === '/analytics' ? "text-white" : "text-indigo-400")} />
                            Reports
                        </Link>
                    </li>
                </ul>
            </nav>
            <div className="p-4 mt-auto border-t border-slate-800/50">
                <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/30">
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-2">Plan Usage</p>
                    <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full w-[65%] gradient-primary rounded-full" />
                    </div>
                    <p className="text-xs text-slate-400 mt-3 font-medium">650 / 1000 emails</p>
                </div>
            </div>
        </div>
    );
}
