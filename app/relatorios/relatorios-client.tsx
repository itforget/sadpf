'use client';

import {
  BarChart3,
  Users,
  FileText,
  ShieldCheck,
  Layers3,
  Building2,
  Gauge,
  FolderOpen,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import Link from 'next/link';
import QueryError from '@/app/components/QueryError';
import ExportButton from '@/app/components/ExportButton';
import type { RelatoriosSummary } from '@/lib/summary-types';
import { fetchRelatoriosSummary } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';

function formatPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
}

function BarItem({
  label,
  value,
  total,
  subtitle,
  tone = 'bg-ssp-blue',
}: {
  label: string;
  value: number;
  total: number;
  subtitle?: string;
  tone?: string;
}) {
  const width = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-start justify-between gap-3 text-sm">
        <div className="min-w-0">
          <p className="font-semibold text-foreground truncate">{label}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
          {value.toLocaleString('pt-BR')}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function RelatoriosClient({ initialData }: { initialData: RelatoriosSummary }) {
  const {
    data = initialData,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.relatorios,
    queryFn: fetchRelatoriosSummary,
    initialData,
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 size={26} className="text-ssp-blue" /> Relatórios Sintéticos de Gestão de
            Pessoas
          </h1>
          <p className="text-sm text-muted-foreground">
            Consolidado estatístico do acervo digitalizado de pastas funcionais da SSP-DF.
          </p>
        </div>
        <ExportButton />
      </div>

      {isError && <QueryError onRetry={() => refetch()} pending={isFetching} />}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="p-3 bg-ssp-blue/10 text-ssp-blue w-fit rounded-xl">
            <Users size={24} />
          </div>
          <h2 className="text-sm font-semibold text-muted-foreground">
            Cobertura de Digitalização
          </h2>
          <p className="text-3xl font-extrabold text-foreground">{formatPercent(data.cobertura)}</p>
          <p className="text-xs text-status-success font-medium">
            {data.servidoresComPasta} de {data.totalServidores} servidores com pasta digitalizada
          </p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="w-fit rounded-xl bg-ssp-blue/10 p-3 text-ssp-blue">
            <FileText size={24} />
          </div>
          <h2 className="text-sm font-semibold text-muted-foreground">
            Volume de Documentos em PDF
          </h2>
          <p className="text-3xl font-extrabold text-foreground">
            {data.totalDocumentos.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">
            Disponíveis para consulta nas pastas funcionais
          </p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="w-fit rounded-xl bg-status-warning/10 p-3 text-status-warning">
            <Gauge size={24} />
          </div>
          <h2 className="text-sm font-semibold text-muted-foreground">Média por Servidor</h2>
          <p className="text-3xl font-extrabold text-foreground">
            {data.mediaDocsPorServidor.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
          </p>
          <p className="text-xs text-muted-foreground">
            documentos por servidor cadastrado no sistema
          </p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="w-fit rounded-xl bg-status-success/10 p-3 text-status-success">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-sm font-semibold text-muted-foreground">Servidores ativos</h2>
          <p className="text-3xl font-extrabold text-foreground">
            {data.servidoresAtivos.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-status-success font-medium">
            {data.servidoresAtivos} ativos, {data.servidoresInativos} inativos
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="bg-card rounded-2xl border border-border shadow-corporate p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Layers3 size={20} className="text-ssp-blue" />
                Distribuição por Categoria
              </h2>
              <p className="text-sm text-muted-foreground">
                Visão da composição documental do acervo.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              Top: {data.topCategoria}
            </span>
          </div>

          {data.totalDocumentos === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <FileText size={40} className="mx-auto opacity-30" />
              <p className="text-sm font-medium">
                Nenhum documento cadastrado ainda. Anexe documentos nas pastas funcionais para
                visualizar os gráficos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.categoriaResumo.map((item) => (
                <BarItem
                  key={item.categoria}
                  label={item.categoria}
                  value={item.quantidade}
                  total={data.totalDocumentos}
                  subtitle={`${Math.round(
                    (item.quantidade / data.totalDocumentos) * 100
                  )}% do acervo`}
                />
              ))}
            </div>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border shadow-corporate p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                <Building2 size={20} className="text-ssp-blue" />
                Documentos por Lotação
              </h2>
              <p className="text-sm text-muted-foreground">
                Mostra onde o acervo está mais concentrado.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              Top: {data.topLotacao}
            </span>
          </div>

          {data.totalDocumentos === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <FolderOpen size={40} className="mx-auto opacity-30" />
              <p className="text-sm font-medium">Sem dados para consolidar lotações no momento.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.lotacaoResumo.map((item) => (
                <BarItem
                  key={item.lotacao}
                  label={item.lotacao}
                  value={item.quantidade}
                  total={data.totalDocumentos}
                  subtitle={`${Math.round(
                    (item.quantidade / data.totalDocumentos) * 100
                  )}% do acervo`}
                  tone="bg-status-success"
                />
              ))}
            </div>
          )}
        </section>

        <section className="bg-card rounded-2xl border border-border shadow-corporate p-6 space-y-5 xl:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-lg text-foreground flex items-center gap-2">
                <FileText size={20} className="text-ssp-blue" />
                Pastas com Maior Volume
              </h2>
              <p className="text-sm text-muted-foreground">
                Ranking das pastas com mais documentos e páginas indexadas.
              </p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              {data.totalServidoresSemPasta} sem pasta
            </span>
          </div>

          {data.topServidores.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground space-y-2">
              <Users size={40} className="mx-auto opacity-30" />
              <p className="text-sm font-medium">Nenhuma pasta funcional cadastrada ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {data.topServidores.map((item, index) => (
                <div
                  key={item.servidor.id}
                  className="p-4 rounded-xl border border-border bg-muted/20 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/servidores/${item.servidor.id}`}
                        className="block font-semibold text-foreground line-clamp-1 hover:text-ssp-blue"
                      >
                        {index + 1}. {item.servidor.nome}
                      </Link>
                      <p className="text-xs text-muted-foreground font-mono">
                        Mat. {item.servidor.matricula} • {item.servidor.lotacao}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-ssp-blue">
                        {item.quantidade.toLocaleString('pt-BR')} docs
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.paginas.toLocaleString('pt-BR')} páginas
                      </p>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-ssp-blue"
                      style={{
                        width: `${
                          (item.quantidade / Math.max(data.topServidores[0].quantidade, 1)) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="w-fit rounded-xl bg-ssp-blue/10 p-3 text-ssp-blue">
            <ShieldCheck size={24} />
          </div>
          <h2 className="text-sm font-semibold text-muted-foreground">Páginas indexadas</h2>
          <p className="text-3xl font-extrabold text-foreground">
            {data.totalPaginas.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">
            Média de{' '}
            {data.mediaPaginasPorDocumento.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
            páginas por documento
          </p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="w-fit rounded-xl bg-status-warning/10 p-3 text-status-warning">
            <FolderOpen size={24} />
          </div>
          <h2 className="text-sm font-semibold text-muted-foreground">Pastas sem acervo</h2>
          <p className="text-3xl font-extrabold text-foreground">
            {data.totalServidoresSemPasta.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">Servidores ainda sem documentos anexados</p>
        </div>

        <div className="bg-card p-6 rounded-2xl border border-border shadow-corporate space-y-3">
          <div className="w-fit rounded-xl bg-status-success/10 p-3 text-status-success">
            <Users size={24} />
          </div>
          <h2 className="text-sm font-semibold text-muted-foreground">Servidores ativos</h2>
          <p className="text-3xl font-extrabold text-foreground">
            {data.servidoresAtivos.toLocaleString('pt-BR')}
          </p>
          <p className="text-xs text-muted-foreground">
            {data.servidoresInativos.toLocaleString('pt-BR')} inativos no cadastro
          </p>
        </div>
      </div>
    </div>
  );
}
