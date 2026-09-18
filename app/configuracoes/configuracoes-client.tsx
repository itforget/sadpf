'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Settings,
  Server,
  HardDrive,
  KeyRound,
  ShieldCheck,
  Database,
  Clock,
  FileText,
  Info,
} from 'lucide-react';

import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import QueryError from '@/app/components/QueryError';
import { SYSTEM_NAME, SYSTEM_VERSION } from '@/lib/auth-policy';
import AcoesRapidas from './acoes-rapidas';
import type { ConfiguracoesSummary } from '@/lib/summary-types';
import { fetchConfiguracoesSummary } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${units[i]}`;
}

export default function ConfiguracoesClient({
  initialData,
}: {
  initialData: ConfiguracoesSummary;
}) {
  const {
    data = initialData,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: queryKeys.configuracoes,
    queryFn: fetchConfiguracoesSummary,
    initialData,
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Settings size={28} className="text-ssp-blue" /> Configurações do Sistema
          </h1>
          <p className="text-sm text-muted-foreground">
            Informações técnicas, segurança e parâmetros de operação do SADPF.
          </p>
        </div>
        <Link
          href="/dashboard"
          className={buttonVariants({ className: 'bg-ssp-blue hover:bg-ssp-blueDark' })}
        >
          Voltar ao Painel
        </Link>
      </div>

      {isError && <QueryError onRetry={() => refetch()} pending={isFetching} />}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Server size={24} className="text-ssp-blue" />
              <CardTitle>Status do Sistema</CardTitle>
            </div>
            <CardDescription>
              Saúde da infraestrutura e da aplicação no momento atual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Banco de dados (PostgreSQL)</span>
              <Badge
                variant={data.dbOk ? 'default' : 'destructive'}
                className={data.dbOk ? 'bg-status-success/15 text-status-success' : ''}
              >
                <Database size={12} className="mr-1" />
                {data.dbOk ? 'Online' : 'Indisponível'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Tempo de atividade</span>
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Clock size={14} className="text-ssp-blue" />
                {data.uptime}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Ambiente</span>
              <span className="font-mono text-xs uppercase font-semibold text-foreground">
                {data.ambiente}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <HardDrive size={24} className="text-ssp-blue" />
              <CardTitle>Armazenamento de Documentos</CardTitle>
            </div>
            <CardDescription>
              Espaço ocupado pelos PDFs registrados nas pastas funcionais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Espaço utilizado</span>
              <span className="font-semibold text-foreground">
                {data.storage.measured ? formatBytes(data.storage.bytes) : 'Não disponível'}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Arquivos armazenados</span>
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <FileText size={14} className="text-ssp-blue" />
                {data.storage.measured
                  ? `${data.storage.count} PDF${data.storage.count === 1 ? '' : 's'}`
                  : 'Não disponível'}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Documentos registrados</span>
              <span className="font-semibold text-foreground">{data.documentosCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <KeyRound size={24} className="text-ssp-blue" />
              <CardTitle>Sessões e Autenticação</CardTitle>
            </div>
            <CardDescription>Como as sessões JWT são emitidas e protegidas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Expiração do token</span>
              <span className="font-semibold text-foreground">
                {data.authPolicy.sessionDurationHours} horas
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Cookie da sessão</span>
              <span className="font-mono text-xs font-semibold text-foreground">
                HTTP-only · SameSite=Strict
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Chave de assinatura</span>
              <Badge
                variant={data.secretConfigurado ? 'default' : 'destructive'}
                className={data.secretConfigurado ? 'bg-status-success/15 text-status-success' : ''}
              >
                {data.secretConfigurado ? 'Configurada' : 'Não configurada'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ShieldCheck size={24} className="text-ssp-blue" />
              <CardTitle>Segurança e Conformidade</CardTitle>
            </div>
            <CardDescription>Políticas de acesso e proteção de dados pessoais.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Tamanho mínimo de senha</span>
              <span className="font-semibold text-foreground">
                {data.authPolicy.minimumPasswordLength} caracteres
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Perfis de acesso</span>
              <span className="font-semibold text-foreground">Admin · Operador · Pasta</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">Registro de auditoria</span>
              <span className="font-semibold text-foreground">{data.logsCount} eventos</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Ações Rápidas</CardTitle>
          <CardDescription>Ferramentas de manutenção e exportação de parâmetros.</CardDescription>
        </CardHeader>
        <CardContent>
          <AcoesRapidas summary={data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Info size={24} className="text-ssp-blue" />
            <CardTitle>Sobre o SADPF</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            {SYSTEM_NAME} da Secretaria de Estado de Segurança Pública do Distrito Federal (SSP-DF).
            Plataforma destinada à digitalização, busca e auditoria de pastas funcionais de
            servidores.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">Versão do sistema</span>
            <span className="font-mono font-semibold text-foreground">v{SYSTEM_VERSION}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">Órgão responsável</span>
            <span className="font-semibold text-foreground">
              SSP-DF · Coordenação de Gestão de Pessoas
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground">Cadastros no sistema</span>
            <span className="font-semibold text-foreground">{data.servidoresCount} servidores</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
