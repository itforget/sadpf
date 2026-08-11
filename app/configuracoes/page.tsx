import { promises as fs } from 'fs';
import { join } from 'path';
import Link from 'next/link';
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

import { prisma } from '@/lib/server/prisma';
import { buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import AcoesRapidas from './acoes-rapidas';

async function getStorageStats() {
  const uploadDir = join(process.cwd(), 'public', 'uploads');
  let count = 0;
  let bytes = 0;

  try {
    const entries = await fs.readdir(uploadDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isFile()) {
        const stat = await fs.stat(join(uploadDir, entry.name));
        count += 1;
        bytes += stat.size;
      }
    }
  } catch {}

  return { count, bytes };
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

export const dynamic = 'force-dynamic';

export default async function ConfiguracoesPage() {
  let dbOk = false;
  let servidoresCount = 0;
  let documentosCount = 0;
  let logsCount = 0;
  let storage = { count: 0, bytes: 0 };

  try {
    const results = await Promise.all([
      prisma.servidor.count(),
      prisma.documentoPDF.count(),
      prisma.logAuditoria.count(),
      getStorageStats(),
    ]);
    servidoresCount = results[0];
    documentosCount = results[1];
    logsCount = results[2];
    storage = results[3];
    dbOk = true;
  } catch (error) {
    console.error('[configuracoes] falha ao consultar dados:', error);
  }

  const secretConfigurado = Boolean(process.env.SADPF_SECRET || process.env.NEXTAUTH_SECRET);

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
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Banco de dados (PostgreSQL)</span>
              <Badge
                variant={dbOk ? 'default' : 'destructive'}
                className={dbOk ? 'bg-status-success/15 text-status-success' : ''}
              >
                <Database size={12} className="mr-1" />
                {dbOk ? 'Online' : 'Indisponível'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tempo de atividade</span>
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Clock size={14} className="text-ssp-blue" />
                {formatUptime(process.uptime())}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ambiente</span>
              <span className="font-mono text-xs uppercase font-semibold text-foreground">
                {process.env.NODE_ENV}
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
              Espaço ocupado pelos PDFs das pastas funcionais em uploads locais.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Espaço utilizado</span>
              <span className="font-semibold text-foreground">{formatBytes(storage.bytes)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Arquivos armazenados</span>
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <FileText size={14} className="text-ssp-blue" />
                {storage.count} PDF
                {storage.count === 1 ? '' : 's'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Documentos registrados</span>
              <span className="font-semibold text-foreground">{documentosCount}</span>
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
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Expiração do token</span>
              <span className="font-semibold text-foreground">8 horas</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Cookie da sessão</span>
              <span className="font-mono text-xs font-semibold text-foreground">
                HTTP-only · SameSite=Strict
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Chave de assinatura</span>
              <Badge
                variant={secretConfigurado ? 'default' : 'destructive'}
                className={secretConfigurado ? 'bg-status-success/15 text-status-success' : ''}
              >
                {secretConfigurado ? 'Configurada' : 'Não configurada'}
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
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tamanho mínimo de senha</span>
              <span className="font-semibold text-foreground">6 caracteres</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Perfis de acesso</span>
              <span className="font-semibold text-foreground">Admin · Operador · Pasta</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Registro de auditoria</span>
              <span className="font-semibold text-foreground">{logsCount} eventos</span>
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
          <AcoesRapidas />
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
            Sistema de Acompanhamento de Documentos e Pastas Funcionais da Secretaria de Estado de
            Segurança Pública do Distrito Federal (SSP-DF). Plataforma destinada à digitalização,
            busca e auditoria de pastas funcionais de servidores.
          </p>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Versão do sistema</span>
            <span className="font-mono font-semibold text-foreground">v2.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Órgão responsável</span>
            <span className="font-semibold text-foreground">
              SSP-DF · Coordenação de Gestão de Pessoas
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Cadastros no sistema</span>
            <span className="font-semibold text-foreground">{servidoresCount} servidores</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
