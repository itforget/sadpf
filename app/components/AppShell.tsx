'use client';

import { usePathname } from 'next/navigation';

export default function AppShell({
  children,
  sidebar,
  topbar,
}: Readonly<{ children: React.ReactNode; sidebar: React.ReactNode; topbar: React.ReactNode }>) {
  const pathname = usePathname();
  const publicPage =
    ['/login', '/redefinir-senha', '/privacidade'].includes(pathname) ||
    pathname.startsWith('/assinar/') ||
    pathname.startsWith('/autenticidade/');
  return (
    <>
      <a
        href="#conteudo-principal"
        className="sr-only fixed left-4 top-4 z-[100] rounded-md bg-card p-3 text-ssp-blue shadow-md focus:not-sr-only"
      >
        Pular para o conteúdo
      </a>
      {!publicPage && sidebar}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden print:block">
        {!publicPage && topbar}
        <main
          id="conteudo-principal"
          tabIndex={-1}
          className={
            publicPage
              ? 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-background'
              : 'min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6'
          }
        >
          {children}
        </main>
      </div>
    </>
  );
}
