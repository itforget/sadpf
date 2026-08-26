import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { cn } from '@/lib/utils';
import Providers from './providers';
import AppShell from './components/AppShell';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'SADPF | Sistema de Arquivo Digital de Pastas Funcionais',
  description: 'Sistema de gestão documental corporativa da SSP-DF',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={cn('font-sans', geist.variable)}>
      <body
        className={`${inter.variable} font-sans flex h-screen overflow-hidden bg-background text-foreground print:block print:h-auto print:overflow-visible`}
      >
        <Providers>
          <AppShell sidebar={<Sidebar />} topbar={<Topbar />}>
            {children}
          </AppShell>
        </Providers>
      </body>
    </html>
  );
}
