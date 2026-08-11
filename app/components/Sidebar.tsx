'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Users,
  FolderOpen,
  FileText,
  Search,
  BarChart,
  Send,
  Printer,
  ScrollText,
  UserCog,
  Settings,
  Shield,
} from 'lucide-react';
import Image from 'next/image';

type MenuItem = {
  name: string;
  href: string;
  icon: typeof Home;
  adminOnly?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Servidores', href: '/servidores', icon: Users },
  { name: 'Documentos', href: '/documentos', icon: FileText },
  { name: 'Pesquisa OCR', href: '/pesquisa', icon: Search },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart },
  { name: 'Encaminhamentos', href: '/encaminhamentos', icon: Send },
  { name: 'Impressões', href: '/impressoes', icon: Printer },
  { name: 'Logs', href: '/logs', icon: ScrollText, adminOnly: true },
  { name: 'Usuários', href: '/usuarios', icon: UserCog, adminOnly: true },
  { name: 'Configurações', href: '/configuracoes', icon: Settings, adminOnly: true },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  PASTA: 'Pasta',
};

interface SessionUser {
  nome: string;
  matricula: string;
  role: string;
}

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const [session, setSession] = useState<SessionUser | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/login') return;
    let cancelled = false;
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.user) setSession(data.user);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (pathname === '/login') return null;

  const isAdmin = session?.role === 'ADMIN';
  const visibleItems = MENU_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } transition-all duration-300 bg-card border-r border-border flex flex-col z-20 print:hidden`}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-16 flex items-center justify-center border-b border-border gap-3 hover:bg-slate-50 transition-colors w-full focus:outline-none"
        aria-label="Alternar menu lateral"
      >
        <Image
          src="/logo-sspdf.png"
          alt="Logo SSP-DF"
          width={40}
          height={40}
          className="h-auto w-auto"
        />
        {isOpen && (
          <span className="flex items-center gap-2 whitespace-nowrap">
            <span className="font-bold text-lg text-ssp-blueDark">SADPF</span>
            {session && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-ssp-blue bg-ssp-blue/10 border border-ssp-blue/30 rounded-full px-2 py-0.5">
                {ROLE_LABELS[session.role] ?? session.role}
              </span>
            )}
          </span>
        )}
      </button>

      <nav className="flex-1 overflow-y-auto py-4 px-2 custom-scrollbar">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${
                    isActive
                      ? 'bg-ssp-blue text-white shadow-md'
                      : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
                  }`}
                  title={!isOpen ? item.name : undefined}
                >
                  <item.icon size={20} className="shrink-0" />
                  {isOpen && <span className="text-sm font-medium truncate">{item.name}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
