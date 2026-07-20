'use client';

import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Mail, Search, Trash2, ChevronRight, Inbox, Clock, User, MessageSquare, Zap, RefreshCcw } from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { InboundMessage } from '../../types/index';

export default function InboundHubPage() {
    const { inboundMessages: localMessages, addInboundMessage, clearInbound: clearLocal } = useAppContext();
    const [serverMessages, setServerMessages] = useState<InboundMessage[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMsgId, setSelectedMsgId] = useState<string | null>(null);

    const fetchMessages = async () => {
        try {
            const res = await fetch('/api/inbound/list');
            const data = await res.json();
            if (data.success) {
                setServerMessages(data.messages);
            }
        } catch (error) {
            console.error('Failed to sync transmissions');
        }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 10000); // Sync every 10s
        return () => clearInterval(interval);
    }, []);

    const allMessages = [...serverMessages];

    const filteredMessages = allMessages.filter(msg =>
        msg.from.toLowerCase().includes(searchTerm.toLowerCase()) ||
        msg.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedMsg = allMessages.find(m => m.id === selectedMsgId);

    const clearInbound = async () => {
        // Clear local simulation
        clearLocal();
        setServerMessages([]);
        toast.success('Inbox neutralized');
    };

    return (
        <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Inbound Hub</h1>
                    <p className="text-slate-500 font-medium mt-1">Real-time intelligence on incoming responses and routing.</p>
                </div>
                {allMessages.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearInbound} className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:bg-red-50">
                        <Trash2 className="mr-2 h-4 w-4" /> Clear Inbox
                    </Button>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Message List */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search Intelligence..."
                            className="w-full h-14 pl-12 pr-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-700 font-medium focus:border-red-500 focus:ring-4 focus:ring-red-500/5 outline-none transition-all shadow-sm"
                        />
                    </div>

                    <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 scrollbar-hide">
                        {filteredMessages.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center opacity-30 grayscale">
                                <Inbox className="h-16 w-16 text-slate-300 mb-4" />
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Awaiting Transmissions</p>
                            </div>
                        ) : (
                            filteredMessages.map((msg) => (
                                <div
                                    key={msg.id}
                                    onClick={() => setSelectedMsgId(msg.id)}
                                    className={cn(
                                        "p-6 rounded-2xl cursor-pointer transition-all duration-300 border-2",
                                        selectedMsgId === msg.id
                                            ? "bg-red-600 border-red-600 shadow-xl shadow-red-500/20 text-white"
                                            : "bg-white border-slate-100 hover:border-red-200 hover:shadow-lg text-slate-600"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={cn("text-[10px] font-black uppercase tracking-widest", selectedMsgId === msg.id ? "text-red-200" : "text-slate-400")}>
                                            {new Date(msg.receivedAt).toLocaleTimeString()}
                                        </span>
                                        <div className={cn("h-2 w-2 rounded-full", selectedMsgId === msg.id ? "bg-white" : "bg-red-500 animate-pulse")} />
                                    </div>
                                    <h3 className="font-bold text-sm truncate mb-1">{msg.subject}</h3>
                                    <p className={cn("text-xs truncate opacity-70", selectedMsgId === msg.id ? "text-red-50" : "text-slate-500")}>
                                        From: {msg.from}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Message Detail */}
                <div className="lg:col-span-8">
                    {selectedMsg ? (
                        <Card className="glass border-none shadow-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 h-full">
                            <CardHeader className="p-10 border-b border-slate-100">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-lg">
                                                <Zap className="h-5 w-5" />
                                            </div>
                                            <span className="text-[10px] font-black text-red-500 uppercase tracking-[0.3em]">Direct Transmission</span>
                                        </div>
                                        <CardTitle className="text-3xl font-black text-slate-950 tracking-tight leading-tight">
                                            {selectedMsg.subject}
                                        </CardTitle>
                                        <div className="flex flex-wrap items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <User className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Origin</span>
                                                    <span className="text-sm font-bold text-slate-700">{selectedMsg.from}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <Clock className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Intercepted</span>
                                                    <span className="text-sm font-bold text-slate-700">{new Date(selectedMsg.receivedAt).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedMsgId(null)} className="rounded-full hover:bg-slate-100">
                                        <RefreshCcw className="h-5 w-5 text-slate-400" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-10 bg-slate-50/30 min-h-[400px]">
                                <div className="bg-white rounded-[2rem] p-10 border border-slate-100 shadow-sm">
                                    <div className="prose prose-slate max-w-none text-slate-700 font-medium">
                                        {selectedMsg.body.split('\n').map((line, i) => (
                                            <p key={i}>{line}</p>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                            <div className="p-10 border-t border-slate-100 bg-white">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 text-slate-400">
                                        <MessageSquare className="h-5 w-5" />
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tactical Response Required</span>
                                    </div>
                                    <Button className="gradient-primary h-12 px-8 rounded-xl text-white font-bold shadow-xl shadow-red-500/20">
                                        Draft Counter-Message
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[3rem] opacity-40">
                            <Inbox className="h-20 w-16 text-slate-300 mb-6 animate-pulse" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Select Transmission for Analysis</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
