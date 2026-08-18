'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Search, BarChart, Send, ScrollText, UserCog, Settings } from 'lucide-react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';

import { fetchSession } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type MenuItem = {
  name: string;
  href: string;
  icon: typeof Home;
  adminOnly?: boolean;
};

const MENU_ITEMS: MenuItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Servidores', href: '/servidores', icon: Users },
  { name: 'Pesquisa OCR', href: '/pesquisa', icon: Search },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart },
  { name: 'Encaminhamentos', href: '/encaminhamentos', icon: Send },
  { name: 'Logs', href: '/logs', icon: ScrollText, adminOnly: true },
  { name: 'Usuários', href: '/usuarios', icon: UserCog, adminOnly: true },
  { name: 'Configurações', href: '/configuracoes', icon: Settings, adminOnly: true },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  PASTA: 'Pasta',
};

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const pathname = usePathname();
  const { data } = useQuery({
    queryKey: queryKeys.session,
    queryFn: fetchSession,
    enabled:
      pathname !== '/login' && pathname !== '/redefinir-senha' && pathname !== '/privacidade',
  });

  if (pathname === '/login' || pathname === '/redefinir-senha' || pathname === '/privacidade') {
    return null;
  }

  const session = data?.user ?? null;
  const isAdmin = session?.role === 'ADMIN';
  const visibleItems = MENU_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside
      className={`${
        isOpen ? 'w-64' : 'w-20'
      } transition-all duration-300 bg-card border-r border-border flex flex-col z-20 print:hidden`}
    >
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        className="h-16 w-full justify-center gap-3 rounded-none border-b border-border"
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
              <Badge
                variant="outline"
                className="border-ssp-blue/30 bg-ssp-blue/10 text-[10px] text-ssp-blue"
              >
                {ROLE_LABELS[session.role] ?? session.role}
              </Badge>
            )}
          </span>
        )}
      </Button>

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
