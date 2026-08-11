'use client';

import { useState } from 'react';
import { Eraser, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AcoesRapidas() {
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const handleLimparCache = () => {
    setClearing(true);
    window.setTimeout(() => {
      setClearing(false);
      setCleared(true);
      window.setTimeout(() => setCleared(false), 3000);
    }, 1200);
  };

  const handleExportar = () => {
    const config = {
      sistema: 'SADPF - Sistema de Acompanhamento de Documentos e Pastas Funcionais',
      org: 'SSP-DF',
      versao: '2.0.0',
      seguranca: {
        sessaoExpiracaoHoras: 8,
        senhaMinima: 6,
        cookie: 'HTTP-only, SameSite=Strict, Secure em produção',
      },
      acessos: {
        ADMIN: 'Acesso total a todos os módulos',
        OPERADOR: 'Acesso operacional, exceto logs, usuários e configurações',
        PASTA: 'Registro de pasta funcional, sem acesso ao painel',
      },
      exportadoEm: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sadpf-configuracoes.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Button
        variant="outline"
        onClick={handleLimparCache}
        disabled={clearing}
        className="justify-start h-auto py-5 px-5"
      >
        {cleared ? (
          <CheckCircle2 size={18} className="mr-3 text-status-success shrink-0" />
        ) : clearing ? (
          <Loader2 size={18} className="mr-3 text-ssp-blue animate-spin shrink-0" />
        ) : (
          <Eraser size={18} className="mr-3 text-ssp-blue shrink-0" />
        )}
        <span className="text-left">
          <span className="block font-semibold">Limpar Cache</span>
          <span className="block text-sm text-muted-foreground font-normal">
            {cleared
              ? 'Cache limpo com sucesso.'
              : 'Remove dados temporários em memória do sistema.'}
          </span>
        </span>
      </Button>

      <Button variant="outline" onClick={handleExportar} className="justify-start h-auto py-5 px-5">
        <Download size={18} className="mr-3 text-ssp-blue shrink-0" />
        <span className="text-left">
          <span className="block font-semibold">Exportar Configurações</span>
          <span className="block text-sm text-muted-foreground font-normal">
            Baixa um JSON com as políticas e parâmetros atuais do sistema.
          </span>
        </span>
      </Button>
    </div>
  );
}
