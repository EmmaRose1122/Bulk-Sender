'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { SmtpConfig, EmailTemplate, Campaign, AccountProfile } from '../types/index';

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
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppContextProvider({ children }: { children: React.ReactNode }) {
    const [smtpConfigs, setSmtpConfigs] = useLocalStorage<SmtpConfig[]>('smtp_configs', []);
    const [defaultSmtpId, setDefaultSmtpId] = useLocalStorage<string | null>('default_smtp_id', null);
    const [templates, setTemplates] = useLocalStorage<EmailTemplate[]>('email_templates', []);
    const [campaignHistory, setCampaignHistory] = useLocalStorage<Campaign[]>('campaign_history', []);
    const [accounts, setAccounts] = useLocalStorage<AccountProfile[]>('account_profiles', []);

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
