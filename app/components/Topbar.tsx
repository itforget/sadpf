'use client';

import { useState } from 'react';
import { Search, Bell, LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';

import { fetchJson, fetchSession } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador do RH',
  PASTA: 'Pasta',
};

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data } = useQuery({
    queryKey: queryKeys.session,
    queryFn: fetchSession,
    enabled: pathname !== '/login' && pathname !== '/redefinir-senha' && pathname !== '/privacidade',
  });

  const [quickQuery, setQuickQuery] = useState('');
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetchJson('/api/auth/session', {
        method: 'DELETE',
      });
    },
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickQuery.trim()) {
      router.push(`/pesquisa?q=${encodeURIComponent(quickQuery.trim())}`);
    }
  };

  if (pathname === '/login' || pathname === '/redefinir-senha' || pathname === '/privacidade') {
    return null;
  }

  const session = data?.user ?? null;
  const displayName = session?.nome || 'Usuário';
  const displayRole = session ? ROLE_LABELS[session.role] ?? session.role : 'Operador do RH';
  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'RH';

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await logoutMutation.mutateAsync();
    } catch (err) {
      console.error('[Topbar] erro ao encerrar sessão:', err);
    }
    router.replace('/login');
  };

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 sm:px-6 z-10 shrink-0 print:hidden">
      <div className="flex-1 max-w-md hidden md:flex items-center">
        <form className="relative w-full" onSubmit={handleSearchSubmit}>
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <input
            type="search"
            value={quickQuery}
            onChange={(e) => setQuickQuery(e.target.value)}
            placeholder="Pesquisa rápida (Nome, CPF ou Matrícula)..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-ssp-blue focus:border-transparent transition-all shadow-sm placeholder:text-muted-foreground"
            aria-label="Pesquisa global rápida"
          />
        </form>
      </div>

      <div className="md:hidden flex items-center">
        <button className="p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors">
          <Search size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        <button
          className="relative p-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ssp-blue"
          aria-label="Abrir notificações"
        >
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-status-danger rounded-full ring-2 ring-card animate-pulse"></span>
        </button>

        <div className="hidden sm:block h-8 w-px bg-border mx-1"></div>

        <button
          className="flex items-center gap-3 p-1 pr-2 rounded-full hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-ssp-blue text-left"
          aria-label="Menu do usuário"
        >
          <div className="w-9 h-9 rounded-full bg-ssp-blue flex items-center justify-center text-white font-semibold text-sm shadow-sm ring-2 ring-background">
            {initials}
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-none mb-1">
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground leading-none">{displayRole}</span>
          </div>
        </button>

        <button
          onClick={handleLogout}
          className="ml-1 p-2 text-muted-foreground hover:bg-status-danger/10 hover:text-status-danger rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-status-danger"
          aria-label="Sair do sistema"
          title="Sair do sistema"
        >
          <LogOut size={20} />
        </button>
      </div>
    </header>
  );
}
