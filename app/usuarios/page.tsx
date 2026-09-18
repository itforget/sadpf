'use client';

import { useState } from 'react';
import { UserCog, Search, Pencil, Power, Trash2, Users, KeyRound } from 'lucide-react';
import type { Servidor } from '@/lib/types';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchJson, fetchServidoresPage, type ServidoresFilters } from '@/lib/client/api';
import Pagination from '@/app/components/Pagination';
import { parsePage } from '@/lib/pagination';
import { useUrlFilters } from '@/lib/client/use-url-filters';
import { useDebouncedValue } from '@/lib/client/use-debounced-value';
import { queryKeys, summaryQueryKeys } from '@/lib/client/query-keys';

import { usuarioOperacionalSchema, type UsuarioOperacionalData } from '@/lib/validations/servidor';

const ROLE_LABELS: Record<Servidor['role'], string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  PASTA: 'Pasta',
};

const ROLE_BADGE: Record<Servidor['role'], string> = {
  ADMIN: 'bg-ssp-blue/10 text-ssp-blue border-ssp-blue/30',
  OPERADOR: 'bg-status-warning/10 text-status-warning border-status-warning/30',
  PASTA: 'bg-muted text-muted-foreground border-border',
};

const ROLE_FILTERS = ['Todos', 'ADMIN', 'OPERADOR', 'PASTA'] as const;

export default function UsuariosPage() {
  const { params, updateFilters } = useUrlFilters();
  const searchQuery = params.get('search') ?? '';
  const rawRole = params.get('role');
  const roleFilter =
    rawRole === 'ADMIN' || rawRole === 'OPERADOR' || rawRole === 'PASTA' ? rawRole : 'Todos';
  const filters: ServidoresFilters & { page: number } = {
    search: useDebouncedValue(searchQuery),
    role: roleFilter === 'Todos' ? undefined : roleFilter,
    page: parsePage(params.get('page')),
  };
  const [editingUser, setEditingUser] = useState<Servidor | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null
  );
  const queryClient = useQueryClient();

  const editForm = useForm<UsuarioOperacionalData>({
    resolver: zodResolver(usuarioOperacionalSchema),
  });

  const {
    data: result,
    isFetching,
    isPlaceholderData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.servidoresPage(filters),
    queryFn: () => fetchServidoresPage(filters),
    placeholderData: keepPreviousData,
  });

  const invalidateUsuarios = async () => {
    await queryClient.invalidateQueries({ queryKey: ['servidores'] });
    await Promise.all(
      summaryQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
    );
    await refetch();
  };

  const editMutation = useMutation({
    mutationFn: async (data: UsuarioOperacionalData) => {
      if (!editingUser) throw new Error('Usuário não encontrado.');
      await fetchJson(`/api/usuarios/${editingUser.id}/operacional`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      user,
      nextStatus,
    }: {
      user: Servidor;
      nextStatus: Servidor['status'];
    }) => {
      await fetchJson(`/api/servidores?id=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (user: Servidor) => {
      await fetchJson(`/api/servidores?id=${user.id}`, { method: 'DELETE' });
    },
  });

  const filteredUsuarios = result?.items ?? [];
  const counts = result?.counts ?? { total: 0, admin: 0, operador: 0, pasta: 0 };

  const showFeedback = (kind: 'success' | 'error', message: string) => {
    setFeedback({ kind, message });
    window.setTimeout(() => setFeedback(null), 5000);
  };

  const openEdit = (user: Servidor) => {
    setEditingUser(user);
    editForm.reset({
      status: user.status,
      role: user.role,
      senha: '',
      confirmarSenha: '',
    });
    setFeedback(null);
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
    editForm.reset();
    setFeedback(null);
  };

  const onSubmitEdit = async (data: UsuarioOperacionalData) => {
    if (!editingUser || editMutation.isPending) return;
    try {
      await editMutation.mutateAsync(data);
      showFeedback('success', `Acesso de ${editingUser.nome} atualizado com sucesso.`);
      setEditingUser(null);
      editForm.reset();
      await invalidateUsuarios();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao atualizar usuário.';
      showFeedback('error', message);
    }
  };

  const toggleStatus = async (user: Servidor) => {
    const nextStatus = user.status === 'Ativo' ? 'Inativo' : 'Ativo';
    if (
      nextStatus === 'Inativo' &&
      !window.confirm(
        `Desativar o acesso de ${user.nome}? O usuário não poderá acessar o sistema enquanto estiver inativo.`
      )
    )
      return;
    setBusyId(user.id);
    try {
      await toggleMutation.mutateAsync({ user, nextStatus });
      showFeedback(
        'success',
        `${user.nome} ${nextStatus === 'Ativo' ? 'reativado' : 'desativado'} com sucesso.`
      );
      await invalidateUsuarios();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao alterar o status.';
      showFeedback('error', message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (user: Servidor) => {
    if (!window.confirm(`Excluir permanentemente o usuário ${user.nome}?`)) return;

    setBusyId(user.id);
    try {
      await deleteMutation.mutateAsync(user);
      showFeedback('success', `Usuário ${user.nome} excluído com sucesso.`);
      await invalidateUsuarios();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao excluir usuário.';
      showFeedback('error', message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <UserCog size={28} className="text-ssp-blue" /> Gestão de Usuários
          </h1>
          <p className="text-sm text-muted-foreground">
            Controle total de contas, perfis de acesso e status dos usuários do SADPF.
          </p>
        </div>
      </div>

      {feedback && (
        <Alert variant={feedback.kind === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Total de usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-foreground">{counts.total}</p>
              <p className="text-xs text-muted-foreground mt-2">Contas cadastradas no sistema.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Administradores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-ssp-blue">{counts.admin}</p>
              <p className="text-xs text-muted-foreground mt-2">Acesso total a todos os módulos.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Operadores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-status-warning">{counts.operador}</p>
              <p className="text-xs text-muted-foreground mt-2">Acesso operacional, sem gestão.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Pastas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-muted-foreground">{counts.pasta}</p>
              <p className="text-xs text-muted-foreground mt-2">Registros sem acesso ao painel.</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-full md:max-w-sm">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                size={18}
              />
              <Input
                type="search"
                aria-label="Buscar usuários por nome, matrícula ou e-mail"
                name="search"
                value={searchQuery}
                onChange={(e) => updateFilters({ search: e.target.value, page: null })}
                placeholder="Buscar por nome, matrícula ou email…"
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {ROLE_FILTERS.map((option) => (
                <Button
                  key={option}
                  variant={roleFilter === option ? 'default' : 'outline'}
                  size="sm"
                  aria-pressed={roleFilter === option}
                  onClick={() =>
                    updateFilters({ role: option === 'Todos' ? null : option, page: null }, true)
                  }
                  className={roleFilter === option ? 'bg-ssp-blue hover:bg-ssp-blueDark' : ''}
                >
                  {option === 'Todos' ? 'Todos' : ROLE_LABELS[option]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Matrícula</TableHead>
                <TableHead>Perfil de Acesso</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                    Carregando usuários…
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-6">
                    <Alert variant="destructive">
                      <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                        <span>
                          {error instanceof Error
                            ? error.message
                            : 'Não foi possível carregar os usuários.'}
                        </span>
                        <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>
                          Tentar novamente
                        </Button>
                      </AlertDescription>
                    </Alert>
                  </TableCell>
                </TableRow>
              ) : filteredUsuarios.length > 0 ? (
                filteredUsuarios.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-ssp-blue/10 border border-ssp-blue/20 flex items-center justify-center text-ssp-blue font-semibold text-sm shrink-0">
                          {user.nome
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((p) => p[0]?.toUpperCase() ?? '')
                            .join('') || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{user.nome}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email || 'email não informado'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-ssp-blue whitespace-nowrap">
                      {user.matricula}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={ROLE_BADGE[user.role]}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={user.status === 'Ativo' ? 'default' : 'destructive'}
                        className={
                          user.status === 'Ativo' ? 'bg-status-success/15 text-status-success' : ''
                        }
                      >
                        {user.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(user)}
                          title="Editar usuário"
                          aria-label={`Editar ${user.nome}`}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId !== null}
                          onClick={() => toggleStatus(user)}
                          title={user.status === 'Ativo' ? 'Desativar acesso' : 'Reativar acesso'}
                          aria-label={`${user.status === 'Ativo' ? 'Desativar' : 'Reativar'} ${
                            user.nome
                          }`}
                          className={
                            user.status === 'Ativo'
                              ? 'text-status-danger hover:text-status-danger'
                              : 'text-status-success hover:text-status-success'
                          }
                        >
                          <Power size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId !== null}
                          onClick={() => deleteUser(user)}
                          title="Excluir usuário"
                          aria-label={`Excluir ${user.nome}`}
                          className="text-status-danger hover:text-status-danger"
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <Users size={32} className="text-muted-foreground/50" />
                      <p>Nenhum usuário encontrado com os filtros atuais.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {result && !isError && (
        <Pagination
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          pending={isFetching || isPlaceholderData}
          onPageChange={(page) => updateFilters({ page: String(page) }, true)}
        />
      )}
      <Dialog
        open={Boolean(editingUser)}
        disablePointerDismissal={editMutation.isPending}
        onOpenChange={(open) => {
          if (!open && !editMutation.isPending) handleCloseEdit();
        }}
      >
        <DialogContent className="max-w-2xl" showCloseButton={!editMutation.isPending}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <UserCog size={24} className="text-ssp-blue" />
              <div>
                <DialogTitle>Editar usuário</DialogTitle>
                <DialogDescription>
                  Altere somente os controles de acesso de {editingUser?.nome}. Os dados pessoais
                  permanecem disponíveis na pasta funcional.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
            <fieldset disabled={editMutation.isPending} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Perfil de acesso</Label>
                  <Controller
                    control={editForm.control}
                    name="role"
                    render={({ field }) => (
                      <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          aria-invalid={!!editForm.formState.errors.role}
                          aria-describedby={
                            editForm.formState.errors.role ? 'edit-role-error' : undefined
                          }
                          ref={field.ref}
                          onBlur={field.onBlur}
                          id="edit-role"
                          className="w-full"
                        >
                          <SelectValue placeholder="Selecione o perfil" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ADMIN">Administrador</SelectItem>
                          <SelectItem value="OPERADOR">Operador</SelectItem>
                          <SelectItem value="PASTA">Pasta</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {editForm.formState.errors.role && (
                    <p id="edit-role-error" role="alert" className="text-sm text-destructive">
                      {editForm.formState.errors.role.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Controller
                    control={editForm.control}
                    name="status"
                    render={({ field }) => (
                      <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          aria-invalid={!!editForm.formState.errors.status}
                          aria-describedby={
                            editForm.formState.errors.status ? 'edit-status-error' : undefined
                          }
                          ref={field.ref}
                          onBlur={field.onBlur}
                          id="edit-status"
                          className="w-full"
                        >
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Inativo">Inativo</SelectItem>
                          <SelectItem value="Aposentado">Aposentado</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {editForm.formState.errors.status && (
                    <p id="edit-status-error" role="alert" className="text-sm text-destructive">
                      {editForm.formState.errors.status.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-senha" className="flex items-center gap-2">
                    <KeyRound size={14} /> Nova senha (opcional)
                  </Label>
                  <Input
                    id="edit-senha"
                    type="password"
                    placeholder="Deixe em branco para manter a senha atual"
                    {...editForm.register('senha')}
                    className={editForm.formState.errors.senha ? 'border-destructive' : ''}
                    aria-invalid={!!editForm.formState.errors.senha}
                    aria-describedby={
                      editForm.formState.errors.senha ? 'edit-senha-error' : undefined
                    }
                    autoComplete="new-password"
                  />
                  {editForm.formState.errors.senha && (
                    <p id="edit-senha-error" role="alert" className="text-sm text-destructive">
                      {editForm.formState.errors.senha.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-confirmarSenha">Repita a nova senha</Label>
                  <Input
                    id="edit-confirmarSenha"
                    type="password"
                    placeholder="Repita a nova senha para confirmar"
                    {...editForm.register('confirmarSenha')}
                    className={editForm.formState.errors.confirmarSenha ? 'border-destructive' : ''}
                    aria-invalid={!!editForm.formState.errors.confirmarSenha}
                    aria-describedby={
                      editForm.formState.errors.confirmarSenha
                        ? 'edit-confirmarSenha-error'
                        : undefined
                    }
                    autoComplete="new-password"
                  />
                  {editForm.formState.errors.confirmarSenha && (
                    <p
                      id="edit-confirmarSenha-error"
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {editForm.formState.errors.confirmarSenha.message}
                    </p>
                  )}
                </div>
              </div>

              {feedback?.kind === 'error' && (
                <Alert variant="destructive">
                  <AlertDescription>{feedback.message}</AlertDescription>
                </Alert>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEdit}
                  disabled={editMutation.isPending}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={editMutation.isPending}
                  className="bg-ssp-blue hover:bg-ssp-blueDark"
                >
                  {editMutation.isPending ? 'Salvando…' : 'Salvar alterações'}
                </Button>
              </DialogFooter>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
