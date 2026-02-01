'use client';

import { useState, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../../components/ui/card';
import { Trash2, Plus, Eye, Save, Mail, MessageSquare, Copy, Edit3, X } from 'lucide-react';
import { toast } from 'sonner';
import { EmailTemplate } from '../../types/index';
import { cn } from '../../lib/utils';

export default function TemplatesPage() {
    const { templates, addTemplate, removeTemplate, updateTemplate } = useAppContext();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
    const [isHtmlMode, setIsHtmlMode] = useState(true);

    const [formData, setFormData] = useState<Partial<EmailTemplate>>({
        name: '',
        subject: '',
        body: '',
    });

    const bodyRef = useRef<HTMLTextAreaElement>(null);

    const insertToken = (token: string, fallback: string) => {
        const textarea = bodyRef.current;
        if (!textarea) {
            // If ref is missing, just append
            setFormData(prev => ({ ...prev, body: (prev.body || '') + `{{${token}|${fallback}}}` }));
            return;
        }

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const insertText = `{{${token}|${fallback}}}`;

        const newText = text.substring(0, start) + insertText + text.substring(end);

        setFormData(prev => ({ ...prev, body: newText }));

        // Restore focus slightly later to ensure state update renders first
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + insertText.length, start + insertText.length);
        }, 0);
    };

    const handleSave = () => {
        if (!formData.name || !formData.subject || !formData.body) {
            toast.error('Please fill in all fields');
            return;
        }

        // ... existing save logic ...
        if (editingId) {
            updateTemplate({
                id: editingId,
                name: formData.name!,
                subject: formData.subject!,
                body: formData.body!,
            });
            toast.success('Blueprint synchronized');
            setEditingId(null);
        } else {
            if (templates.length >= 10) {
                toast.error('Maximum node capacity reached (10)');
                return;
            }
            addTemplate({
                id: crypto.randomUUID(),
                name: formData.name!,
                subject: formData.subject!,
                body: formData.body!,
            });
            toast.success('Blueprint archived');
        }

        setFormData({ name: '', subject: '', body: '' });
    };

    const handleEdit = (template: EmailTemplate) => {
        setEditingId(template.id);
        setFormData(template);
    };

    const handleCancel = () => {
        setEditingId(null);
        setFormData({ name: '', subject: '', body: '' });
    };

    const variableOptions = [
        { label: 'Name', token: 'name', fallback: 'Friend' },
        { label: 'Business', token: 'business_name', fallback: 'Partner' },
        { label: 'Website', token: 'website', fallback: 'your site' },
        { label: 'Email', token: 'email', fallback: 'there' },
    ];

    return (
        <div className="space-y-10 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-950 tracking-tighter">Content Repository</h1>
                    <p className="text-slate-500 font-medium mt-1">Design and manage your high-conversion email blueprints.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{templates.length} / 10 Storage Used</span>
                </div>
            </header>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                {/* Editor Section */}
                <div className="xl:col-span-12">
                    <Card className="glass-dark border-none shadow-2xl p-8 rounded-3xl overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full pointer-events-none" />

                        <div className="flex items-center gap-4 mb-10">
                            <div className="h-12 w-12 rounded-2xl gradient-primary flex items-center justify-center text-white shadow-xl">
                                <Edit3 className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">{editingId ? 'Modify Strategy' : 'Construct Blueprint'}</h2>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    <span className="text-[10px] font-bold text-slate-400 mr-2 uppercase tracking-wide my-auto">Quick Insert:</span>
                                    {variableOptions.map(opt => (
                                        <button
                                            key={opt.token}
                                            onClick={() => insertToken(opt.token, opt.fallback)}
                                            className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-3 py-1 rounded-lg border border-indigo-500/30 hover:bg-indigo-500/40 hover:text-white transition-all cursor-pointer active:scale-95"
                                            title={`Insert {{${opt.token}|${opt.fallback}}}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Internal Alias</Label>
                                    <Input
                                        placeholder="e.g., Q1 Growth Strategy"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-slate-800/50 border-slate-700 h-12 rounded-xl text-white font-medium"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Target Subject Line</Label>
                                    <Input
                                        placeholder="Immediate response requested {{name|Friend}}"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                        className="bg-slate-800/50 border-slate-700 h-12 rounded-xl text-white font-medium"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-10">
                                    <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Electronic Payload (Body)</Label>
                                    <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                                        <Button variant="ghost" size="sm" className={cn("h-8 rounded-lg text-[10px] uppercase font-black tracking-widest px-4", !isHtmlMode ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500")} onClick={() => setIsHtmlMode(false)}>Text</Button>
                                        <Button variant="ghost" size="sm" className={cn("h-8 rounded-lg text-[10px] uppercase font-black tracking-widest px-4", isHtmlMode ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500")} onClick={() => setIsHtmlMode(true)}>HTML</Button>
                                    </div>
                                </div>
                                <textarea
                                    ref={bodyRef}
                                    className="w-full min-h-[120px] bg-slate-800/50 border-2 border-slate-700/50 rounded-2xl p-4 text-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono text-sm"
                                    placeholder={isHtmlMode ? "<h1>Priority Communication...</h1>" : "Dear {{name|Friend}}, ..."}
                                    value={formData.body}
                                    onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                                />
                            </div>

                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            {editingId && (
                                <Button variant="ghost" onClick={handleCancel} className="h-12 px-8 rounded-xl text-slate-400 font-bold hover:text-white transition-colors">Abort Changes</Button>
                            )}
                            <Button onClick={handleSave} className="h-12 px-10 rounded-xl gradient-primary text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-500/20 hover:scale-[1.02] transition-all">
                                <Save className="mr-2 h-4 w-4" /> {editingId ? 'Commit Update' : 'Archive Strategy'}
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* Grid Section */}
                <div className="xl:col-span-12">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest text-xs font-bold text-slate-400">Archived Blueprints</h2>
                        <span className="h-px flex-1 bg-slate-200 mx-6" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {templates.map((template) => (
                            <Card key={template.id} className="group glass border-none shadow-xl p-6 hover:scale-[1.02] transition-all duration-300 cursor-pointer">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-indigo-600 group-hover:gradient-primary group-hover:text-white transition-all duration-300">
                                        <Mail className="h-5 w-5" />
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                        <Button variant="ghost" size="icon" onClick={() => setPreviewTemplate(template)} className="h-8 w-8 hover:bg-slate-200 rounded-lg"><Eye className="h-4 w-4 text-slate-600" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(template)} className="h-8 w-8 hover:bg-slate-200 rounded-lg"><Edit3 className="h-4 w-4 text-slate-600" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => removeTemplate(template.id)} className="h-8 w-8 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                                    </div>
                                </div>
                                <h3 className="font-black text-slate-900 tracking-tight mb-2 group-hover:text-indigo-600 transition-colors">{template.name}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1">{template.subject}</p>
                            </Card>
                        ))}
                        {templates.length === 0 && (
                            <div className="col-span-full py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center opacity-40">
                                <MessageSquare className="h-12 w-12 text-slate-300 mb-4 animate-float" />
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">No Blueprints Detected</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {previewTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                    <Card className="w-full max-w-2xl glass border-none shadow-2xl overflow-hidden rounded-3xl animate-in zoom-in-95 duration-300">
                        <CardHeader className="p-8 border-b border-slate-100 relative">
                            <Button variant="ghost" size="icon" onClick={() => setPreviewTemplate(null)} className="absolute top-4 right-4 h-8 w-8 rounded-full">
                                <X className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="h-10 w-10 rounded-xl gradient-primary flex items-center justify-center text-white">
                                    <Eye className="h-5 w-5" />
                                </div>
                                <div>
                                    <CardTitle className="text-xl font-black text-slate-900 tracking-tight">Visual Preview</CardTitle>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{previewTemplate.name}</p>
                                </div>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Subject Vector</p>
                                <p className="text-sm font-semibold text-slate-900">{previewTemplate.subject}</p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8 max-h-[50vh] overflow-y-auto bg-white">
                            {/* eslint-disable-next-line react/no-danger */}
                            <div className="prose prose-sm max-w-none text-slate-700" dangerouslySetInnerHTML={{ __html: previewTemplate.body }} />
                        </CardContent>
                        <CardFooter className="p-8 border-t border-slate-100 flex justify-end">
                            <Button onClick={() => setPreviewTemplate(null)} className="h-12 px-8 rounded-xl gradient-primary text-white font-black uppercase tracking-widest shadow-xl">Dismiss</Button>
                        </CardFooter>
                    </Card>
                </div>
            )}
        </div>
    );
}
