import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AppContextProvider } from '../context/AppContext';
import { Toaster } from 'sonner';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Bulk Email Sender',
  description: 'A simple bulk email sender application',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" suppressHydrationWarning>
      <body className={`${inter.className} bg-slate-50 text-slate-900 h-screen max-h-screen w-screen overflow-hidden flex flex-col`} suppressHydrationWarning>
        <AppContextProvider>
          <div className="flex w-full h-full flex-1 overflow-hidden min-h-0" suppressHydrationWarning>
            <div className="hidden md:block flex-shrink-0 h-full" suppressHydrationWarning>
              <Sidebar />
            </div>
            <div className="flex-1 flex flex-col h-full overflow-hidden min-h-0" suppressHydrationWarning>
              <TopBar />
              <main className="flex-1 overflow-hidden p-4 md:p-8 lg:p-10 relative flex flex-col min-h-0" suppressHydrationWarning>
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/5 blur-[120px] rounded-full pointer-events-none" suppressHydrationWarning />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" suppressHydrationWarning />
                <div className="relative z-10 max-w-7xl mx-auto w-full h-full flex flex-col min-h-0" suppressHydrationWarning>
                  {children}
                </div>
              </main>
            </div>
          </div>
          <Toaster richColors position="top-right" />
        </AppContextProvider>

      </body>
    </html>
  );
}
