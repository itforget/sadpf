'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

export default function ExportButton() {
  const [baixando, setBaixando] = useState(false);
  const [erro, setErro] = useState('');

  const handleExportar = async () => {
    if (baixando) return;

    setBaixando(true);
    setErro('');

    try {
      const response = await fetch('/api/relatorios/exportar', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Não foi possível gerar o relatório.');
      }

      const blob = await response.blob();
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
    } catch (err: unknown) {
      console.error('[ExportButton]', err);
      const message = err instanceof Error ? err.message : 'Erro ao exportar relatório.';
      setErro(message);
    } finally {
      setBaixando(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleExportar}
        disabled={baixando}
        className="inline-flex items-center gap-2 px-4 py-2.5 bg-ssp-blue hover:bg-ssp-blueDark text-white font-semibold text-sm rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {baixando ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
        {baixando ? 'Gerando Relatório...' : 'Exportar Relatório Sintético (PDF)'}
      </button>
      {erro && <p className="text-xs text-status-danger font-medium">{erro}</p>}
    </div>
  );
}
