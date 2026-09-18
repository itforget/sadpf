'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, TriangleAlert } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { fetchJson, fetchSession } from '@/lib/client/api';
import { queryKeys, summaryQueryKeys } from '@/lib/client/query-keys';
import type { Servidor, ServidorComDocumentos } from '@/lib/types';
import { alertaSchema, MAX_ALERTA_LENGTH, type AlertaFormData } from '@/lib/validations/alerta';

export default function AlertaServidor({ servidor }: { servidor: Servidor }) {
  const [editando, setEditando] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const { data: session } = useQuery({ queryKey: queryKeys.session, queryFn: fetchSession });
  const podeEditar =
    session?.authenticated && session.user && ['ADMIN', 'OPERADOR'].includes(session.user.role);

  return (
    <Card className="gap-4 border-status-warning/30">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TriangleAlert size={20} className="text-status-warning" aria-hidden="true" />
            Alerta
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Informações incorretas ou pendências no cadastro do servidor.
          </p>
        </div>
        {podeEditar && !editando && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="print:hidden"
            onClick={() => {
              setMensagem('');
              setEditando(true);
            }}
          >
            <Pencil size={16} aria-hidden="true" />
            {servidor.alerta ? 'Editar alerta' : 'Adicionar alerta'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editando && podeEditar ? (
          <EditorAlerta
            servidor={servidor}
            onCancelar={() => setEditando(false)}
            onSalvo={(alerta) => {
              setEditando(false);
              setMensagem(alerta ? 'Alerta salvo.' : 'Alerta removido.');
            }}
          />
        ) : servidor.alerta ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {servidor.alerta}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhum alerta registrado para este servidor.
          </p>
        )}
        <p role="status" className="mt-2 text-sm text-status-success">
          {mensagem}
        </p>
      </CardContent>
    </Card>
  );
}

function EditorAlerta({
  servidor,
  onCancelar,
  onSalvo,
}: {
  servidor: Servidor;
  onCancelar: () => void;
  onSalvo: (alerta: string) => void;
}) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<AlertaFormData>({
    resolver: zodResolver(alertaSchema),
    defaultValues: { alerta: servidor.alerta },
  });
  const salvar = useMutation({
    mutationFn: (data: AlertaFormData) =>
      fetchJson<Servidor>(`/api/servidores/${servidor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
    onSuccess: async (atualizado) => {
      queryClient.setQueriesData<ServidorComDocumentos>({ queryKey: ['servidor'] }, (anterior) =>
        anterior?.servidor.id === atualizado.id ? { ...anterior, servidor: atualizado } : anterior
      );
      onSalvo(atualizado.alerta);
      await Promise.all(
        [['servidor'], ['servidores'], queryKeys.logs, ...summaryQueryKeys].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey })
        )
      );
    },
  });
  const campoId = `alerta-${servidor.id}`;

  return (
    <form onSubmit={handleSubmit((data) => salvar.mutate(data))} aria-busy={salvar.isPending}>
      <fieldset disabled={salvar.isPending} className="space-y-3">
        <label htmlFor={campoId} className="block text-sm font-medium">
          Alerta cadastral
        </label>
        <Textarea
          {...register('alerta')}
          id={campoId}
          autoFocus
          rows={4}
          maxLength={MAX_ALERTA_LENGTH}
          className="min-h-28 resize-y"
          placeholder="Ex.: conferir a data de admissão com o documento de posse."
          aria-invalid={Boolean(errors.alerta)}
          aria-describedby={`${campoId}-ajuda${errors.alerta ? ` ${campoId}-erro` : ''}`}
        />
        <p id={`${campoId}-ajuda`} className="text-xs text-muted-foreground">
          Até 5.000 caracteres. Para remover o alerta, apague o texto e salve.
        </p>
        {errors.alerta && (
          <p id={`${campoId}-erro`} role="alert" className="text-sm text-status-danger">
            {errors.alerta.message}
          </p>
        )}
        {salvar.isError && (
          <Alert variant="destructive">
            <AlertDescription>{salvar.error.message}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={!isDirty || salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar alerta'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
