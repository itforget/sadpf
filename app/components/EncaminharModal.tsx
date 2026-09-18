'use client';

import { useState } from 'react';
import { Send, ShieldAlert, CheckCircle2, Copy, Link as LinkIcon, Mail } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Servidor, DocumentoPDF } from '@/lib/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  encaminhamentoSchema,
  type EncaminhamentoFormData,
} from '@/lib/validations/encaminhamento';
import { fetchJson } from '@/lib/client/api';
import { queryKeys } from '@/lib/client/query-keys';

interface EncaminharModalProps {
  servidor: Servidor;
  documento: DocumentoPDF;
  onClose: () => void;
}

export default function EncaminharModal({ servidor, documento, onClose }: EncaminharModalProps) {
  const [linkGerado, setLinkGerado] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  const queryClient = useQueryClient();
  const { handleSubmit, control, reset } = useForm<EncaminhamentoFormData>({
    resolver: zodResolver(encaminhamentoSchema),
    defaultValues: { validadeDias: '7' },
  });

  const assinaturaMutation = useMutation({
    mutationFn: (data: EncaminhamentoFormData) =>
      fetchJson<{ token: string; emailSent: boolean }>('/api/encaminhamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, servidorId: servidor.id, documentoId: documento.id }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.encaminhamentos });
    },
  });

  const onSubmit = async (data: EncaminhamentoFormData) => {
    if (assinaturaMutation.isPending) return;
    setErro('');
    try {
      const result = await assinaturaMutation.mutateAsync(data);
      setLinkGerado(`${window.location.origin}/assinar/${result.token}`);
      setEmailSent(result.emailSent);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : 'Não foi possível solicitar a assinatura. Tente novamente.'
      );
    }
  };

  const handleClose = () => {
    if (assinaturaMutation.isPending) return;
    reset();
    setLinkGerado('');
    onClose();
  };

  return (
    <Dialog
      open
      disablePointerDismissal={assinaturaMutation.isPending}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-xl" showCloseButton={!assinaturaMutation.isPending}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Send size={24} className="text-ssp-blue" />
            <div>
              <DialogTitle>Solicitar assinatura eletrônica</DialogTitle>
              <DialogDescription>
                O servidor titular receberá um link individual para revisar e assinar o documento.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!linkGerado ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <fieldset disabled={assinaturaMutation.isPending} className="space-y-4">
              <div className="space-y-1 rounded-xl border border-border bg-muted/40 p-4 text-xs">
                <p className="font-semibold text-foreground">Destinatário da assinatura</p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">{servidor.nome}</strong> · Matrícula{' '}
                  {servidor.matricula}
                </p>
                <p className="text-muted-foreground">{servidor.email}</p>
                <p className="pt-2 text-muted-foreground">
                  <strong className="text-foreground">Documento:</strong> {documento.titulo}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="validadeDias">Validade do link</Label>
                <Controller
                  control={control}
                  name="validadeDias"
                  render={({ field }) => (
                    <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger
                        ref={field.ref}
                        onBlur={field.onBlur}
                        id="validadeDias"
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">24 horas</SelectItem>
                        <SelectItem value="7">7 dias</SelectItem>
                        <SelectItem value="15">15 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="flex items-start gap-2.5 rounded-xl border border-status-warning/20 bg-status-warning/10 p-3.5 text-xs text-status-warning">
                <ShieldAlert size={18} className="mt-0.5 shrink-0" />
                <p>
                  Esta é uma assinatura eletrônica interna: o link é individual, expira após o prazo
                  definido e o aceite fica registrado com data, hora e IP.
                </p>
              </div>

              {erro && (
                <p role="alert" className="text-sm text-status-danger">
                  {erro}
                </p>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={assinaturaMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={assinaturaMutation.isPending}
                  className="bg-ssp-blue hover:bg-ssp-blueDark"
                >
                  {assinaturaMutation.isPending ? 'Enviando…' : 'Enviar para assinatura'}
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        ) : (
          <div className="space-y-5 py-4 text-center">
            <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-status-success/10 text-status-success">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Solicitação criada</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {emailSent ? (
                  <>
                    <Mail size={14} className="mr-1 inline" />
                    E-mail enviado para {servidor.email}.
                  </>
                ) : (
                  'O e-mail não pôde ser enviado; copie o link abaixo e encaminhe-o ao servidor.'
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted p-4">
              <LinkIcon size={18} className="shrink-0 text-ssp-blue" />
              <Input
                aria-label="Link individual para assinatura"
                name="linkAssinatura"
                readOnly
                value={linkGerado}
                className="bg-transparent font-mono text-xs"
              />
              <Button
                size="sm"
                onClick={async () => {
                  setErro('');
                  try {
                    await navigator.clipboard.writeText(linkGerado);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2000);
                  } catch {
                    setErro('Não foi possível copiar. Selecione o link e copie-o manualmente.');
                  }
                }}
                className="shrink-0 bg-ssp-blue hover:bg-ssp-blueDark"
              >
                {copiado ? (
                  'Copiado!'
                ) : (
                  <>
                    <Copy size={14} className="mr-1" />
                    Copiar
                  </>
                )}
              </Button>
            </div>
            <p role="status" className="text-sm text-status-success">
              {copiado ? 'Link copiado.' : ''}
            </p>
            {erro && (
              <p role="alert" className="text-sm text-status-danger">
                {erro}
              </p>
            )}
            <Button onClick={handleClose} className="bg-ssp-blue hover:bg-ssp-blueDark">
              Concluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
