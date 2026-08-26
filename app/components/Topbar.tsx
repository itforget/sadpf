'use client';

import { LogOut } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';

import { fetchJson, fetchSession } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';
import { Button } from '@/components/ui/button';

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
    enabled:
      pathname !== '/login' && pathname !== '/redefinir-senha' && pathname !== '/privacidade',
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetchJson('/api/auth/session', {
        method: 'DELETE',
      });
    },
  });

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
      <div className="flex items-center gap-2 sm:gap-4 ml-auto">
        <div className="flex h-auto items-center gap-3 rounded-full p-1 pr-2 text-left">
          <div className="w-9 h-9 rounded-full bg-ssp-blue flex items-center justify-center text-white font-semibold text-sm shadow-sm ring-2 ring-background">
            {initials}
          </div>
          <div className="hidden lg:flex flex-col">
            <span className="text-sm font-semibold text-foreground leading-none mb-1">
              {displayName}
            </span>
            <span className="text-xs text-muted-foreground leading-none">{displayRole}</span>
          </div>
        </div>

        <Button
          onClick={handleLogout}
          variant="ghost"
          size="icon"
          className="ml-1 rounded-full text-muted-foreground hover:bg-status-danger/10 hover:text-status-danger"
          aria-label="Sair do sistema"
          title="Sair do sistema"
        >
          <LogOut size={20} />
        </Button>
      </div>
    </header>
  );
}
