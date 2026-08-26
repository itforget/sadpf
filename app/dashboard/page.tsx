'use client';

import Link from 'next/link';
import { Archive, FileBarChart, FileText, UserCheck, UserMinus, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { buttonVariants } from '@/components/ui/button';
import { fetchDashboardSummary } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';

const emptyDashboard = {
  servidoresAtivos: 0,
  servidoresInativos: 0,
  servidoresAposentados: 0,
  totalPastasFuncionais: 0,
  ultimasInsercoes: [],
  volumePorServidor: [],
};

export default function DashboardPage() {
  const {
    data = emptyDashboard,
    error,
    isError,
  } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboardSummary,
  });

  const kpis = [
    {
      title: 'Servidores ativos',
      value: data.servidoresAtivos,
      icon: UserCheck,
      color: 'text-status-success',
      bg: 'bg-status-success/10',
    },
    {
      title: 'Servidores inativos',
      value: data.servidoresInativos,
      icon: UserMinus,
      color: 'text-status-danger',
      bg: 'bg-status-danger/10',
    },
    {
      title: 'Servidores aposentados',
      value: data.servidoresAposentados,
      icon: Users,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
    },
    {
      title: 'Pastas funcionais',
      value: data.totalPastasFuncionais,
      icon: Archive,
      color: 'text-ssp-blue',
      bg: 'bg-ssp-blue/10',
    },
  ];

  const maiorVolume = data.volumePorServidor[0]?.documentos ?? 1;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Painel Gerencial</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral das pastas funcionais e documentos anexados.
          </p>
        </div>
        <Link href="/relatorios" className={buttonVariants({ variant: 'outline' })}>
          <FileBarChart size={16} className="mr-2" /> Relatório Sintético
        </Link>
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error
              ? error.message
              : 'Não foi possível carregar os indicadores do painel.'}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="transition-shadow hover:shadow-md">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={`rounded-lg p-3 ${kpi.bg}`}>
                  <kpi.icon className={kpi.color} size={24} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <h3 className="text-2xl font-bold tracking-tight">
                    {kpi.value.toLocaleString('pt-BR')}
                  </h3>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Últimas inserções</CardTitle>
            <Link
              href="/pesquisa"
              className={buttonVariants({
                variant: 'ghost',
                size: 'sm',
                className: 'text-xs text-ssp-blue',
              })}
            >
              Ver documentos →
            </Link>
          </CardHeader>
          <CardContent>
            {data.ultimasInsercoes.length ? (
              <div className="divide-y divide-border">
                {data.ultimasInsercoes.map((documento) => (
                  <Link
                    key={documento.id}
                    href={`/servidores/${documento.servidorId}`}
                    className="flex items-center gap-3 py-3 first:pt-1 hover:text-ssp-blue"
                  >
                    <div className="rounded-md bg-ssp-blue/10 p-2 text-ssp-blue">
                      <FileText size={18} aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {documento.titulo}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {documento.servidorNome} · {documento.categoria}
                      </p>
                    </div>
                    <time className="shrink-0 text-xs text-muted-foreground">
                      {documento.dataUpload}
                    </time>
                  </Link>
                ))}
              </div>
            ) : (
              <MensagemVazia texto="Nenhum documento foi anexado até o momento." />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Volume por servidor</CardTitle>
          </CardHeader>
          <CardContent>
            {data.volumePorServidor.length ? (
              <div className="space-y-4">
                {data.volumePorServidor.map((item) => (
                  <Link
                    key={item.servidorId}
                    href={`/servidores/${item.servidorId}`}
                    className="block"
                  >
                    <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium text-foreground">
                        {item.servidorNome}
                      </span>
                      <span className="shrink-0 text-muted-foreground">
                        {item.documentos} docs.
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-ssp-blue"
                        style={{ width: `${Math.max((item.documentos / maiorVolume) * 100, 4)}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <MensagemVazia texto="Nenhum documento para consolidar." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MensagemVazia({ texto }: { texto: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
      <FileText size={36} className="opacity-40" aria-hidden="true" />
      <p className="text-sm">{texto}</p>
    </div>
  );
}
