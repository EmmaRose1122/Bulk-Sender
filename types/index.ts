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
}
