import type { Metadata } from 'next';
import { Inter, Geist } from 'next/font/google';
import './globals.css';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { cn } from '@/lib/utils';

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
        <Sidebar />

        <div className="flex flex-col flex-1 min-w-0 overflow-hidden print:hidden">
          <Topbar />

          <main className="flex-1 overflow-y-auto p-6 scroll-smooth">{children}</main>
        </div>
      </body>
    </html>
  );
}
