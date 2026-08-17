'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

import { fetchBlob } from '@/lib/client/api';

export default function ExportButton() {
  const [erro, setErro] = useState('');
  const exportMutation = useMutation({
    mutationFn: async () => {
      const blob = await fetchBlob('/api/relatorios/exportar', {
        method: 'GET',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio-sintetico-${new Date()
        .toLocaleDateString('pt-BR')
        .replace(/\//g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });

  const handleExportar = async () => {
    setErro('');

    try {
      await exportMutation.mutateAsync();
    } catch (err: unknown) {
      console.error('[ExportButton]', err);
      const message = err instanceof Error ? err.message : 'Erro ao exportar relatório.';
      setErro(message);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleExportar}
        disabled={exportMutation.isPending}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-ssp-blue hover:bg-ssp-blueDark text-white font-semibold text-sm rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {exportMutation.isPending ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <Download size={18} />
        )}
        {exportMutation.isPending ? 'Gerando Relatório...' : 'Exportar Relatório Sintético (PDF)'}
      </button>
      {erro && <p className="text-xs text-status-danger font-medium">{erro}</p>}
    </div>
  );
}
