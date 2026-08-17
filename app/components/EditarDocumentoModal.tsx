'use client';

import { useState, type FormEvent } from 'react';
import type { DocumentoPDF } from '@/lib/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchJson } from '@/lib/client/api';

interface EditarDocumentoModalProps {
  documento: DocumentoPDF;
  onClose: () => void;
  onUpdated: () => void;
}

const categorias: DocumentoPDF['categoria'][] = [
  'Dados Pessoais',
  'Posse e Exercício',
  'Vida Funcional',
  'Licenças e Afastamentos',
  'Avaliação de Desempenho',
];

export default function EditarDocumentoModal({
  documento,
  onClose,
  onUpdated,
}: EditarDocumentoModalProps) {
  const [titulo, setTitulo] = useState(documento.titulo);
  const [categoria, setCategoria] = useState<DocumentoPDF['categoria']>(documento.categoria);
  const [processoSEI, setProcessoSEI] = useState(documento.processoSEI || '');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const queryClient = useQueryClient();
  const salvarMutation = useMutation({
    mutationFn: async () => {
      await fetchJson(`/api/documentos/${documento.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: titulo.trim(), categoria, processoSEI: processoSEI.trim() }),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['documento', documento.id] });
      onUpdated();
      onClose();
    },
  });

  const salvar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSalvando(true);
    setErro('');
    try {
      await salvarMutation.mutateAsync();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível editar o documento.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md" showCloseButton={!salvando}>
        <DialogHeader>
          <DialogTitle>Editar documento</DialogTitle>
          <DialogDescription>
            Altere as informações de classificação do documento.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tituloDocumento">Título</Label>
            <Input
              id="tituloDocumento"
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoriaDocumento">Categoria</Label>
            <select
              id="categoriaDocumento"
              value={categoria}
              onChange={(event) => setCategoria(event.target.value as DocumentoPDF['categoria'])}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {categorias.map((opcao) => (
                <option key={opcao}>{opcao}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="processoSEI">Processo SEI</Label>
            <Input
              id="processoSEI"
              value={processoSEI}
              onChange={(event) => setProcessoSEI(event.target.value)}
            />
          </div>
          {erro && <p className="text-sm text-status-danger">{erro}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={salvando}>
              Cancelar
            </Button>
            <Button type="submit" disabled={salvando} className="bg-ssp-blue hover:bg-ssp-blueDark">
              {salvando ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
