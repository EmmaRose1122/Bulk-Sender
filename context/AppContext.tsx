'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SmtpConfig, EmailTemplate, Campaign, AccountProfile, Domain, InboundMessage, SecurityConfig } from '../types/index';

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
