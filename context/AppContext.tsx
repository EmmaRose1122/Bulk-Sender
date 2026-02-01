'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SmtpConfig, EmailTemplate, Campaign, AccountProfile, Domain, InboundMessage, SecurityConfig } from '../types/index';

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

    // Ensure defaultSmtpId is valid
    useEffect(() => {
        if (defaultSmtpId && !smtpConfigs.find((c: SmtpConfig) => c.id === defaultSmtpId)) {
            setDefaultSmtpId(null);
        }
    }, [smtpConfigs, defaultSmtpId, setDefaultSmtpId]);

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
