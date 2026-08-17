'use client';

import Link from 'next/link';
import {
  AlertTriangle,
  BarChart,
  FileBarChart,
  FileText,
  Plus,
  UploadCloud,
  Users,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { fetchDashboardSummary } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';

const emptyDashboard = {
  servidoresAtivos: 0,
  totalDocumentos: 0,
  totalServidores: 0,
};

export default function DashboardPage() {
  const { data = emptyDashboard } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: fetchDashboardSummary,
  });

  const kpis = [
    {
      title: 'Servidores Ativos',
      value: data.servidoresAtivos.toLocaleString('pt-BR'),
      icon: Users,
      color: 'text-status-success',
      bg: 'bg-status-success/10',
    },
    {
      title: 'Total de Documentos',
      value: data.totalDocumentos.toLocaleString('pt-BR'),
      icon: FileText,
      color: 'text-ssp-blue',
      bg: 'bg-ssp-blue/10',
    },
    {
      title: 'Total de Servidores',
      value: data.totalServidores.toLocaleString('pt-BR'),
      icon: UploadCloud,
      color: 'text-indigo-600',
      bg: 'bg-indigo-100',
    },
    {
      title: 'Pendências OCR',
      value: '0',
      icon: AlertTriangle,
      color: 'text-status-warning',
      bg: 'bg-status-warning/10',
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Painel Gerencial</h1>
          <p className="text-sm text-muted-foreground">
            Visão geral do acervo digitalizado e atividades recentes.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/relatorios" className={buttonVariants({ variant: 'outline' })}>
            <FileBarChart size={16} className="mr-2" /> Relatório Sintético
          </Link>
          <Link
            href="/documentos/novo"
            className={buttonVariants({ className: 'bg-ssp-blue hover:bg-ssp-blueDark' })}
          >
            <Plus size={16} className="mr-2" /> Lote de Upload
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={kpi.color} size={24} aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                  <h3 className="text-2xl font-bold tracking-tight">{kpi.value}</h3>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 flex flex-col h-[400px]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Últimas Inserções</CardTitle>
            <Link
              href="/pesquisa"
              className={buttonVariants({
                variant: 'ghost',
                size: 'sm',
                className: 'text-xs text-ssp-blue',
              })}
            >
              Ir para Pesquisa OCR →
            </Link>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2 p-8">
              <FileText size={40} className="mx-auto opacity-30" />
              <p className="text-sm font-medium">
                Acesse a Pesquisa OCR para localizar documentos e trechos indexados.
              </p>
              <Link
                href="/pesquisa"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'text-ssp-blue',
                })}
              >
                Ir para Pesquisa OCR →
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[400px]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Volume por Lotação</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <BarChart size={40} className="mx-auto opacity-50" />
              <span className="text-sm">
                Espaço reservado para visualização Recharts / Chart.js
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
