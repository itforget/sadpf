'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, BarChart, Send, ScrollText, UserCog, Settings, Menu } from 'lucide-react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { fetchSession } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const MENU_ITEMS = [
  { name: 'Painel gerencial', href: '/dashboard', icon: Home, adminOnly: false },
  { name: 'Servidores', href: '/servidores', icon: Users, adminOnly: false },
  { name: 'Relatórios', href: '/relatorios', icon: BarChart, adminOnly: false },
  { name: 'Encaminhamentos', href: '/encaminhamentos', icon: Send, adminOnly: false },
  { name: 'Trilha de auditoria', href: '/logs', icon: ScrollText, adminOnly: true },
  { name: 'Usuários', href: '/usuarios', icon: UserCog, adminOnly: true },
  { name: 'Configurações', href: '/configuracoes', icon: Settings, adminOnly: true },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador do RH',
  PASTA: 'Pasta',
};

export default function Sidebar({ mobile = false }: { mobile?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const publicPage = ['/login', '/redefinir-senha', '/privacidade'].includes(pathname);
  const { data } = useQuery({
    queryKey: queryKeys.session,
    queryFn: fetchSession,
    enabled: !publicPage,
  });
  if (publicPage) return null;
  const session = data?.user;
  const showLabels = mobile || expanded;
  const navigation = (
    <nav
      id={mobile ? 'mobile-navigation' : 'desktop-navigation'}
      aria-label="Navegação principal"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-4"
    >
      <ul className="space-y-1">
        {MENU_ITEMS.filter((item) => !item.adminOnly || session?.role === 'ADMIN').map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-label={item.name}
              aria-current={pathname.startsWith(item.href) ? 'page' : undefined}
              onClick={() => setDrawerOpen(false)}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                pathname.startsWith(item.href)
                  ? 'bg-ssp-blue text-white'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
              title={showLabels ? undefined : item.name}
            >
              <item.icon aria-hidden="true" size={20} className="shrink-0" />
              {showLabels && <span className="truncate">{item.name}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
  if (mobile)
    return (
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="size-11 md:hidden"
              aria-label="Abrir menu de navegação"
            />
          }
        >
          <Menu aria-hidden="true" />
        </DialogTrigger>
        <DialogContent className="inset-y-0 left-0 top-0 flex h-dvh max-h-dvh w-[min(20rem,calc(100%-2rem))] max-w-none translate-x-0 translate-y-0 flex-col rounded-none sm:max-w-none">
          <DialogHeader className="pr-8">
            <DialogTitle>Menu do SADPF</DialogTitle>
            <DialogDescription>
              Navegue pelas pastas funcionais e ferramentas do sistema.
            </DialogDescription>
          </DialogHeader>
          {navigation}
        </DialogContent>
      </Dialog>
    );
  return (
    <aside
      className={cn(
        'z-20 hidden shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 md:flex print:hidden',
        expanded ? 'w-64' : 'w-20'
      )}
    >
      <Button
        onClick={() => setExpanded((value) => !value)}
        variant="ghost"
        className="h-16 w-full justify-center gap-2 rounded-none border-b border-border px-2"
        aria-label={expanded ? 'Recolher menu lateral' : 'Expandir menu lateral'}
        aria-expanded={expanded}
        aria-controls="desktop-navigation"
      >
        <Image
          src="/logo-sspdf.png"
          alt="Logo SSP-DF"
          width={40}
          height={40}
          className="h-10 w-10 shrink-0 object-contain"
        />
        {expanded && (
          <span className="flex min-w-0 flex-col items-start gap-1">
            <span className="text-lg font-bold text-ssp-blueDark">SADPF</span>
            {session && (
              <Badge variant="outline" className="text-xs text-ssp-blue">
                {ROLE_LABELS[session.role]}
              </Badge>
            )}
          </span>
        )}
      </Button>
      {navigation}
    </aside>
  );
}
