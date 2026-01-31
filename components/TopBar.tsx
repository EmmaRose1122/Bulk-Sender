'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { Search, Bell, Menu, User, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function TopBar() {
    const pathname = usePathname();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    const getPageTitle = (path: string) => {
        switch (path) {
            case '/': return 'Campaign';
            case '/templates': return 'Templates';
            case '/settings': return 'Settings';
            default: return 'Dashboard';
        }
    };

    return (
        <div className="flex h-16 items-center justify-between glass px-6 relative z-30">
            <div className="flex items-center gap-6">
                <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                </Button>
                <div className="relative w-80 hidden md:block group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <Input
                        type="search"
                        placeholder="Quick search..."
                        className="w-full bg-slate-100/50 border-transparent focus:border-indigo-500/50 focus:bg-white pl-10 h-10 rounded-xl transition-all shadow-sm"
                    />
                </div>
            </div>
            <div className="flex items-center gap-6">
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
                        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-indigo-500 border-2 border-white" />
                    </Button>

                    {showNotifications && (
                        <Card className="absolute right-0 top-full mt-3 w-80 p-5 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl glass border-slate-200">
                            <div className="flex justify-between items-center mb-6">
                                <h4 className="font-bold text-slate-900">Activity</h4>
                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:text-indigo-700 cursor-pointer transition-colors">Mark all</span>
                            </div>
                            <div className="space-y-5">
                                <div className="flex gap-4 items-start group cursor-pointer">
                                    <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/20">
                                        <Bell className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">Campaign "Flash Sale" completed</p>
                                        <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">Just now</p>
                                    </div>
                                </div>
                                <div className="flex gap-4 items-start group cursor-pointer">
                                    <div className="h-10 w-10 rounded-xl gradient-success flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/20">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">New Gmail account added</p>
                                        <p className="text-[10px] font-medium text-slate-400 mt-1 uppercase tracking-wider">1 hr ago</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                {/* User Profile */}
                <div className="relative">
                    <div
                        className="flex items-center gap-3 cursor-pointer hover:bg-slate-100 p-1.5 pr-3 rounded-xl transition-all border border-transparent hover:border-slate-200 group"
                        onClick={() => {
                            setShowProfile(!showProfile);
                            setShowNotifications(false);
                        }}
                    >
                        <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 transition-transform group-hover:scale-105">
                            U
                        </div>
                        <div className="hidden md:block">
                            <p className="text-xs font-bold text-slate-900">Admin User</p>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Enterprise</p>
                        </div>
                    </div>

                    {showProfile && (
                        <Card className="absolute right-0 top-full mt-3 w-64 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-300 rounded-2xl glass border-slate-200">
                            <div className="p-4 border-b border-slate-100 mb-2">
                                <p className="font-bold text-slate-900">Admin Account</p>
                                <p className="text-xs text-slate-400 font-medium">admin@bulksender.com</p>
                            </div>
                            <div className="space-y-1">
                                <Button variant="ghost" className="w-full justify-start text-xs font-semibold h-10 rounded-xl hover:bg-slate-50 transition-colors" onClick={() => toast.info('Profile feature coming soon')}>
                                    <User className="mr-3 h-4 w-4 text-indigo-500" /> Account Settings
                                </Button>
                                <Link href="/settings" passHref>
                                    <Button variant="ghost" className="w-full justify-start text-xs font-semibold h-10 rounded-xl hover:bg-slate-50 transition-colors">
                                        <SettingsIcon className="mr-3 h-4 w-4 text-indigo-500" /> System Preferences
                                    </Button>
                                </Link>
                                <div className="border-t border-slate-100 my-2 mx-2" />
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-xs font-bold h-10 rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    onClick={() => {
                                        toast.success('Securely logged out');
                                        setShowProfile(false);
                                    }}
                                >
                                    <LogOut className="mr-3 h-4 w-4" /> Sign Out
                                </Button>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
