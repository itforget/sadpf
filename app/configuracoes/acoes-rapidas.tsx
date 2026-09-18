'use client';

import { useState } from 'react';
import { Download, RefreshCw, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/lib/client/query-keys';
import type { ConfiguracoesSummary } from '@/lib/summary-types';
import { SYSTEM_NAME, SYSTEM_VERSION } from '@/lib/auth-policy';

export default function AcoesRapidas({ summary }: { summary: ConfiguracoesSummary }) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const refresh = async () => {
    setRefreshing(true);
    setFeedback('');
    try {
      await queryClient.refetchQueries(
        { queryKey: queryKeys.configuracoes, type: 'active' },
        { throwOnError: true }
      );
      setFeedback('Dados desta tela atualizados.');
    } catch {
      setFeedback('Não foi possível atualizar. Verifique sua conexão e tente novamente.');
    } finally {
      setRefreshing(false);
    }
  };
  const exportConfig = () => {
    const config = {
      sistema: `SADPF — ${SYSTEM_NAME}`,
      org: 'SSP-DF',
      versao: SYSTEM_VERSION,
      seguranca: {
        sessaoExpiracaoHoras: summary.authPolicy.sessionDurationHours,
        senhaMinima: summary.authPolicy.minimumPasswordLength,
        cookie: `HTTP-only, SameSite=${summary.authPolicy.cookieSameSite}, Secure em produção`,
      },
      acessos: {
        ADMIN: 'Acesso total a todos os módulos',
        OPERADOR: 'Acesso operacional, exceto trilha de auditoria, usuários e configurações',
        PASTA: 'Registro de pasta funcional, sem acesso ao painel',
      },
      ambiente: summary.ambiente,
      documentos: summary.documentosCount,
      servidores: summary.servidoresCount,
      exportadoEm: new Date().toISOString(),
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sadpf-configuracoes.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Button
          variant="outline"
          onClick={refresh}
          disabled={refreshing}
          className="h-auto justify-start whitespace-normal px-4 py-4"
        >
          {refreshing ? (
            <Loader2 aria-hidden="true" className="animate-spin" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
          <span className="min-w-0 text-left">
            <span className="block font-semibold">Atualizar dados</span>
            <span className="block text-sm font-normal text-muted-foreground">
              Consulta novamente os indicadores desta tela.
            </span>
          </span>
        </Button>
        <Button
          variant="outline"
          onClick={exportConfig}
          className="h-auto justify-start whitespace-normal px-4 py-4"
        >
          <Download aria-hidden="true" />
          <span className="min-w-0 text-left">
            <span className="block font-semibold">Exportar configurações</span>
            <span className="block text-sm font-normal text-muted-foreground">
              Baixa os parâmetros e indicadores exibidos em JSON.
            </span>
          </span>
        </Button>
      </div>
      <p role="status" className="text-sm text-muted-foreground">
        {feedback}
      </p>
    </div>
  );
}
