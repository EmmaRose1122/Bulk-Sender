export interface SmtpConfig {
  id: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
  proxy?: {
    enabled: boolean;
    protocol: 'http' | 'https' | 'socks4' | 'socks5';
    host: string;
    port: number;
    auth?: {
      user: string;
      pass: string;
    };
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string; // HTML content
}

export interface Campaign {
  id: string;
  name: string;
  createdAt: number;
  total: number;
  sent: number;
  failed: number;
  status: 'draft' | 'sending' | 'completed' | 'paused';
  logs?: EmailLog[];
}

export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for security, maybe store only if needed for auto-login
  secondaryEmail?: string;
  status?: 'valid' | 'invalid' | 'unchecked';
}

export interface EmailLog {
  id: string;
  email: string;
  status: 'pending' | 'sent' | 'failed';
  error?: string;
  sentAt?: number;
  opened?: boolean;
  openedAt?: number;
  clicked?: boolean;
  clickedAt?: number;
  unsubscribed?: boolean;
  unsubscribedAt?: number;
  ip?: string;
  location?: string;
  userAgent?: string;
}

export interface Domain {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'failed';
  dkim: string;
  spf: string;
  dmarc: string;
  createdAt: number;
}

export interface InboundMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  body: string;
  receivedAt: number;
}

export interface SecurityConfig {
  ipAllowlist: string[];
}

export interface CommunicationEntry {
  id: string;
  type: 'email_sent' | 'email_received' | 'note' | 'followup_sent';
  subject?: string;
  body?: string;
  sentAt: number;
}

export type LeadStatus = 'new' | 'contacted' | 'replied' | 'interested' | 'closed';

export interface Lead {
  id: string;
  businessName: string;
  email: string;
  phone?: string;
  website?: string;
  address?: string;
  niche: string;
  city: string;
  country: string;
  status: LeadStatus;
  notes?: string;
  communicationHistory: CommunicationEntry[];
  createdAt: number;
  lastContactedAt?: number;
}

export type FollowUpStatus = 'pending' | 'approved' | 'sent' | 'skipped';

export interface FollowUp {
  id: string;
  leadId: string;
  leadName: string;
  leadEmail: string;
  subject: string;
  body: string;
  status: FollowUpStatus;
  createdAt: number;
  sentAt?: number;
}

export interface GoogleApiSettings {
  placesApiKey?: string;
  geminiApiKey?: string;
}
