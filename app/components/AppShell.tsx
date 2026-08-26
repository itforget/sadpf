'use client';

import { usePathname } from 'next/navigation';

export default function AppShell({
  children,
  sidebar,
  topbar,
}: Readonly<{ children: React.ReactNode; sidebar: React.ReactNode; topbar: React.ReactNode }>) {
  const pathname = usePathname();
  if (pathname.startsWith('/assinar/') || pathname.startsWith('/autenticidade/')) {
    return <main className="min-h-screen w-full overflow-y-auto bg-muted/40">{children}</main>;
  }
  return (
    <>
      {sidebar}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden print:hidden">
        {topbar}
        <main className="flex-1 overflow-y-auto scroll-smooth p-6">{children}</main>
      </div>
    </>
  );
}
