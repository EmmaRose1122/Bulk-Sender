'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SmtpConfig, EmailTemplate, Campaign, AccountProfile, Domain, InboundMessage, SecurityConfig, Lead, FollowUp, GoogleApiSettings } from '../types/index';

interface ActiveCampaignState {
    id: string;
    selectedSmtpId: string;
    selectedDomainId: string;
    selectedTemplateIds: string[];
    batchSize: number;
    waitTime: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    csvData: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logs: any[];
    progress: { sent: number; failed: number; total: number; current: number };
    fileName: string;
    trackingBaseUrl: string;
    isSending: boolean;
    currentIndex: number;
}

interface AppContextType {
    smtpConfigs: SmtpConfig[];
    addSmtpConfig: (config: SmtpConfig) => void;
    removeSmtpConfig: (id: string) => void;
    updateSmtpConfig: (config: SmtpConfig) => void;
    defaultSmtpId: string | null;
    setDefaultSmtpId: (id: string) => void;

    templates: EmailTemplate[];
    addTemplate: (template: EmailTemplate) => void;
    removeTemplate: (id: string) => void;
    updateTemplate: (template: EmailTemplate) => void;

    campaignHistory: Campaign[];
    addCampaignToHistory: (campaign: Campaign) => void;
    updateCampaignInHistory: (id: string, updates: Partial<Campaign>) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updateCampaignStatus: (trackingData: any) => void;
    clearHistory: () => void;

    accounts: AccountProfile[];
    addAccount: (account: AccountProfile) => void;
    removeAccount: (id: string) => void;
    updateAccount: (account: AccountProfile) => void;

    domains: Domain[];
    addDomain: (domain: Domain) => void;
    removeDomain: (id: string) => void;
    updateDomain: (domain: Domain) => void;

    inboundMessages: InboundMessage[];
    addInboundMessage: (msg: InboundMessage) => void;
    clearInbound: () => void;

    securityConfig: SecurityConfig;
    updateSecurityConfig: (config: SecurityConfig) => void;

    activeCampaign: ActiveCampaignState | null;
    setActiveCampaign: (campaign: ActiveCampaignState | null) => void;
    updateActiveCampaign: (updates: Partial<ActiveCampaignState>) => void;

    leads: Lead[];
    addLead: (lead: Lead) => void;
    addLeads: (leads: Lead[]) => void;
    updateLead: (lead: Lead) => void;
    removeLead: (id: string) => void;

    followUps: FollowUp[];
    addFollowUp: (fu: FollowUp) => void;
    updateFollowUp: (fu: FollowUp) => void;
    removeFollowUp: (id: string) => void;

    googleApiSettings: GoogleApiSettings;
    updateGoogleApiSettings: (settings: GoogleApiSettings) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
    const [smtpConfigs, setSmtpConfigs] = useLocalStorage<SmtpConfig[]>('smtp_configs', []);
    const [defaultSmtpId, setDefaultSmtpId] = useLocalStorage<string | null>('default_smtp_id', null);
    const [templates, setTemplates] = useLocalStorage<EmailTemplate[]>('email_templates', []);
    const [campaignHistory, setCampaignHistory] = useLocalStorage<Campaign[]>('campaign_history', []);
    const [accounts, setAccounts] = useLocalStorage<AccountProfile[]>('account_profiles', []);
    const [domains, setDomains] = useLocalStorage<Domain[]>('domain_profiles', []);
    const [inboundMessages, setInboundMessages] = useLocalStorage<InboundMessage[]>('inbound_hub', []);
    const [securityConfig, setSecurityConfig] = useLocalStorage<SecurityConfig>('security_settings', { ipAllowlist: [] });
    const [activeCampaign, setActiveCampaign] = useLocalStorage<ActiveCampaignState | null>('active_campaign', null);
    const [leads, setLeads] = useLocalStorage<Lead[]>('leads', []);
    const [followUps, setFollowUps] = useLocalStorage<FollowUp[]>('follow_ups', []);
    const [googleApiSettings, setGoogleApiSettings] = useLocalStorage<GoogleApiSettings>('google_api_settings', {});

    // Ensure defaultSmtpId is valid
    useEffect(() => {
        if (defaultSmtpId && !smtpConfigs.find((c: SmtpConfig) => c.id === defaultSmtpId)) {
            setDefaultSmtpId(null);
        }
    }, [smtpConfigs, defaultSmtpId, setDefaultSmtpId]);

    // Auto-sync leads pushed from Python / external APIs into AppContext
    useEffect(() => {
        const syncServerLeads = async () => {
            try {
                const res = await fetch('/api/leads/push');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.leads && Array.isArray(data.leads) && data.leads.length > 0) {
                        setLeads(prev => {
                            const merged = [...prev];
                            let hasNew = false;
                            for (const lead of data.leads) {
                                const exists = merged.find(l => l.businessName === lead.businessName && (l.email === lead.email || l.phone === lead.phone));
                                if (!exists) {
                                    merged.unshift(lead);
                                    hasNew = true;
                                }
                            }
                            return hasNew ? merged : prev;
                        });
                    }
                }
            } catch { }
        };

        syncServerLeads();
        const interval = setInterval(syncServerLeads, 4000);
        return () => clearInterval(interval);
    }, []);

    const addSmtpConfig = (config: SmtpConfig) => {
        setSmtpConfigs([...smtpConfigs, config]);
        if (smtpConfigs.length === 0) {
            setDefaultSmtpId(config.id);
        }
    };

    const removeSmtpConfig = (id: string) => {
        setSmtpConfigs(smtpConfigs.filter((c: SmtpConfig) => c.id !== id));
        if (defaultSmtpId === id) {
            setDefaultSmtpId(null);
        }
    };

    const updateSmtpConfig = (config: SmtpConfig) => {
        setSmtpConfigs(smtpConfigs.map((c: SmtpConfig) => (c.id === config.id ? config : c)));
    };

    const addTemplate = (template: EmailTemplate) => {
        setTemplates([...templates, template]);
    };

    const removeTemplate = (id: string) => {
        setTemplates(templates.filter((t: EmailTemplate) => t.id !== id));
    };

    const updateTemplate = (template: EmailTemplate) => {
        setTemplates(templates.map((t: EmailTemplate) => (t.id === template.id ? template : t)));
    };

    const addCampaignToHistory = (campaign: Campaign) => {
        setCampaignHistory(prev => [campaign, ...prev]);
    };

    const updateCampaignInHistory = (id: string, updates: Partial<Campaign>) => {
        setCampaignHistory(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateCampaignStatus = (trackingData: any) => {
        setCampaignHistory((current: Campaign[]) => {
            return current.map(campaign => {
                if (!campaign.logs) return campaign;

                let hasChanges = false;
                const updatedLogs = campaign.logs.map(log => {
                    const serverData = trackingData[log.id];
                    if (serverData && (!log.opened || !log.location)) {
                        hasChanges = true;
                        return {
                            ...log,
                            opened: true,
                            openedAt: serverData.openedAt || log.openedAt,
                            location: serverData.locationString || log.location,
                            ip: serverData.ip || log.ip,
                            userAgent: serverData.userAgent || log.userAgent
                        };
                    }
                    return log;
                });

                return hasChanges ? { ...campaign, logs: updatedLogs } : campaign;
            });
        });
    };

    const clearHistory = () => {
        setCampaignHistory([]);
    };

    const addAccount = (account: AccountProfile) => {
        setAccounts((prev: AccountProfile[]) => [...prev, account]);
    };

    const removeAccount = (id: string) => {
        setAccounts((prev: AccountProfile[]) => prev.filter((a: AccountProfile) => a.id !== id));
    };

    const updateAccount = (account: AccountProfile) => {
        setAccounts((prev: AccountProfile[]) => prev.map((a: AccountProfile) => (a.id === account.id ? account : a)));
    };

    const addDomain = (domain: Domain) => {
        setDomains(prev => [...prev, domain]);
    };

    const removeDomain = (id: string) => {
        setDomains(prev => prev.filter(d => d.id !== id));
    };

    const updateDomain = (domain: Domain) => {
        setDomains(prev => prev.map(d => d.id === domain.id ? domain : d));
    };

    const addInboundMessage = (msg: InboundMessage) => {
        setInboundMessages(prev => [msg, ...prev]);
    };

    const clearInbound = () => {
        setInboundMessages([]);
    };

    const updateSecurityConfig = (config: SecurityConfig) => {
        setSecurityConfig(config);
    };

    const updateActiveCampaign = (updates: Partial<ActiveCampaignState>) => {
        setActiveCampaign(prev => prev ? { ...prev, ...updates } : null);
    };

    const addLead = (lead: Lead) => {
        setLeads(prev => {
            const exists = prev.find(l => l.businessName === lead.businessName && (l.email === lead.email || l.phone === lead.phone));
            if (exists) return prev;
            return [lead, ...prev];
        });
    };

    const addLeads = (newLeads: Lead[]) => {
        setLeads(prev => {
            const merged = [...prev];
            for (const lead of newLeads) {
                const exists = merged.find(l => l.businessName === lead.businessName && (l.email === lead.email || l.phone === lead.phone));
                if (!exists) merged.unshift(lead);
            }
            return merged;
        });
    };

    const updateLead = (lead: Lead) => {
        setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
    };

    const removeLead = (id: string) => {
        setLeads(prev => prev.filter(l => l.id !== id));
    };

    const addFollowUp = (fu: FollowUp) => {
        setFollowUps(prev => [fu, ...prev]);
    };

    const updateFollowUp = (fu: FollowUp) => {
        setFollowUps(prev => prev.map(f => f.id === fu.id ? fu : f));
    };

    const removeFollowUp = (id: string) => {
        setFollowUps(prev => prev.filter(f => f.id !== id));
    };

    const updateGoogleApiSettings = (settings: GoogleApiSettings) => {
        setGoogleApiSettings(settings);
    };

    return (
        <AppContext.Provider
            value={{
                smtpConfigs,
                addSmtpConfig,
                removeSmtpConfig,
                updateSmtpConfig,
                defaultSmtpId,
                setDefaultSmtpId,
                templates,
                addTemplate,
                removeTemplate,
                updateTemplate,
                campaignHistory,
                addCampaignToHistory,
                updateCampaignInHistory,
                updateCampaignStatus,
                clearHistory,
                accounts,
                addAccount,
                removeAccount,
                updateAccount,
                domains,
                addDomain,
                removeDomain,
                updateDomain,
                inboundMessages,
                addInboundMessage,
                clearInbound,
                securityConfig,
                updateSecurityConfig,
                activeCampaign,
                setActiveCampaign,
                updateActiveCampaign,
                leads,
                addLead,
                addLeads,
                updateLead,
                removeLead,
                followUps,
                addFollowUp,
                updateFollowUp,
                removeFollowUp,
                googleApiSettings,
                updateGoogleApiSettings,
            }}
        >
            {children}
        </AppContext.Provider>
    );
}

export function useAppContext() {
    const context = useContext(AppContext);
    if (context === undefined) {
        throw new Error('useAppContext must be used within an AppContextProvider');
    }
    return context;
}
