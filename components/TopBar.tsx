'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { Search, Bell, Menu, User, LogOut, Settings as SettingsIcon, X, BarChart, Users, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function TopBar() {
    const pathname = usePathname();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const mobileNavItem = (href: string, label: string, Icon: any) => (
        <Link
            key={href}
            href={href}
            onClick={() => setIsMobileMenuOpen(false)}
            className={cn(
                "flex items-center gap-4 rounded-xl px-4 py-3 font-bold transition-all duration-300 text-sm",
                pathname === href
                    ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                    : "text-slate-600 hover:bg-red-50 hover:text-red-600"
            )}
        >
            <Icon className={cn("h-5 w-5", pathname === href ? "text-white" : "text-slate-400")} />
            {label}
        </Link>
    );

    return (
        <>
            <div className="flex h-16 items-center justify-between bg-white border-b border-slate-200 px-4 md:px-6 relative z-30 shrink-0">
                <div className="flex items-center gap-3 md:gap-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="md:hidden text-slate-700 hover:bg-slate-100 rounded-xl"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <Menu className="h-6 w-6" />
                    </Button>

                    <div className="flex items-center gap-2 md:hidden">
                        <span className="font-black text-slate-900 text-base">Dot Skills</span>
                    </div>

                    <div className="relative w-80 hidden md:block group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                        <Input
                            type="search"
                            placeholder="Quick search..."
                            className="w-full bg-slate-100/50 border-transparent focus:border-red-500/50 focus:bg-white pl-10 h-10 rounded-xl transition-all shadow-sm text-sm"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-6">
                    {/* Status Indicator */}
                    <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100">
                        <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Server Operational</span>
                    </div>

                    {/* Notifications */}
                    <div className="relative">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="relative hover:bg-slate-100 rounded-xl"
                            onClick={() => {
                                setShowNotifications(!showNotifications);
                                setShowProfile(false);
                            }}
                        >
                            <Bell className="h-5 w-5 text-slate-600" />
                            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white" />
                        </Button>

                        {showNotifications && (
                            <Card className="absolute right-0 top-full mt-3 w-80 p-5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl glass border-slate-200">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-bold text-slate-900">Activity</h4>
                                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-widest hover:text-red-700 cursor-pointer transition-colors">Mark all</span>
                                </div>
                                <div className="space-y-5">
                                    <div className="flex gap-4 items-start group cursor-pointer">
                                        <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-500/20">
                                            <Bell className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-1">System operational</p>
                                            <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Just now</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* User Profile */}
                    <div className="relative">
                        <div
                            className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 p-1.5 md:pr-3 rounded-xl transition-all border border-transparent hover:border-slate-200 group"
                            onClick={() => {
                                setShowProfile(!showProfile);
                                setShowNotifications(false);
                            }}
                        >
                            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-white font-bold shadow-lg shadow-red-500/20 transition-transform group-hover:scale-105">
                                DS
                            </div>
                            <div className="hidden md:block">
                                <p className="text-xs font-bold text-slate-900">Dot Skills</p>
                                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Agency Admin</p>
                            </div>
                        </div>

                        {showProfile && (
                            <Card className="absolute right-0 top-full mt-3 w-64 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl glass border-slate-200">
                                <div className="p-4 border-b border-slate-100 mb-2">
                                    <p className="font-bold text-slate-900">Dot Skills Admin</p>
                                    <p className="text-xs text-slate-400 font-medium">dotskills@agency.com</p>
                                </div>
                                <div className="space-y-1">
                                    <Link href="/settings" passHref>
                                        <Button variant="ghost" className="w-full justify-start text-xs font-semibold h-10 rounded-xl hover:bg-slate-50 transition-colors">
                                            <SettingsIcon className="mr-3 h-4 w-4 text-red-500" /> Settings & API Keys
                                        </Button>
                                    </Link>
                                </div>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Navigation Drawer Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-50 flex md:hidden animate-in fade-in duration-300">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                    <div className="relative w-4/5 max-w-sm bg-white h-full shadow-2xl flex flex-col p-6 z-10 animate-in slide-in-from-left duration-300">
                        <div className="flex items-center justify-between pb-6 border-b border-slate-100 mb-6">
                            <div>
                                <h3 className="font-black text-slate-900 text-lg">Dot Skills</h3>
                                <p className="text-xs text-red-500 font-bold uppercase tracking-wider">Marketing Agency</p>
                            </div>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-400 hover:text-slate-700">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <nav className="flex-1 space-y-2 overflow-y-auto">
                            {mobileNavItem('/', 'Dashboard', BarChart)}
                            {mobileNavItem('/leads', 'Lead Finder', Search)}
                            {mobileNavItem('/leads/list', 'Leads', Users)}
                            {mobileNavItem('/followups', 'Follow-ups', Clock)}
                            {mobileNavItem('/settings', 'Settings', SettingsIcon)}
                        </nav>
                    </div>
                </div>
            )}
        </>
    );
}
