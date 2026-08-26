'use client';

import { useState } from 'react';
import { CheckCircle2, FileText, Printer } from 'lucide-react';
import type { DocumentoPDF } from '@/lib/types';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchJson } from '@/lib/client/api';

interface PrintModalProps {
  documento: DocumentoPDF;
  onClose: () => void;
}

export default function PrintModal({ documento, onClose }: PrintModalProps) {
  const [imprimindo, setImprimindo] = useState(false);
  const [impressoComSucesso, setImpressoComSucesso] = useState(false);
  const logMutation = useMutation({
    mutationFn: async () => {
      await fetchJson(`/api/documentos/${documento.id}/impressao`, {
        method: 'POST',
      });
    },
  });

  const handlePrint = async () => {
    // Abre a guia durante o gesto do usuário, para que o bloqueador de pop-ups não a impeça.
    const janelaDoDocumento = window.open(documento.arquivoUrl, '_blank');
    if (!janelaDoDocumento) {
      alert('O navegador bloqueou a abertura do PDF. Permita pop-ups para imprimir o documento.');
      return;
    }

    setImprimindo(true);
    try {
      await logMutation.mutateAsync();
      setImpressoComSucesso(true);
    } catch (error) {
      console.error('[PrintModal] erro ao registrar log:', error);
    } finally {
      setImprimindo(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Printer size={24} className="text-ssp-blue" />
            <div>
              <DialogTitle>Imprimir documento PDF</DialogTitle>
              <DialogDescription>
                O arquivo selecionado será aberto em uma nova guia para impressão.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText size={18} className="shrink-0 text-ssp-blue" />
            {documento.titulo}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Use o botão de impressão do visualizador de PDF que será aberto.
          </p>
        </div>

        {impressoComSucesso && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-status-success">
            <CheckCircle2 size={16} /> A abertura para impressão foi registrada na trilha de
            auditoria.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={handlePrint}
            disabled={imprimindo}
            className="bg-ssp-blue hover:bg-ssp-blueDark"
          >
            {imprimindo ? 'Abrindo PDF...' : 'Abrir para impressão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
