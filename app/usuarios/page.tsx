'use client';

import { useEffect, useMemo, useState } from 'react';
import { UserCog, Plus, Search, Pencil, Power, Users, KeyRound } from 'lucide-react';
import type { Servidor } from '@/lib/types';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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
import { usuarioSchema, type UsuarioFormData } from '@/lib/validations/usuario';
import Image from 'next/image';

const usuarioEditSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  email: z.email('Email inválido').optional().or(z.literal('')),
  telefone: z.string().optional(),
  cargoEfetivo: z.string().optional(),
  cargoOcupado: z.string().optional(),
  lotacao: z.string().optional(),
  status: z.enum(['Ativo', 'Inativo'], {
    message: 'Status é obrigatório',
  }),
  role: z.enum(['ADMIN', 'OPERADOR', 'PASTA'], {
    message: 'Função de acesso é obrigatória',
  }),
  senha: z.string().min(12, 'Senha deve ter no mínimo 12 caracteres').optional().or(z.literal('')),
});
type UsuarioEditData = z.infer<typeof usuarioEditSchema>;

const ROLE_LABELS: Record<Servidor['role'], string> = {
  ADMIN: 'Administrador',
  OPERADOR: 'Operador',
  PASTA: 'Pasta',
};

const ROLE_BADGE: Record<Servidor['role'], string> = {
  ADMIN: 'bg-ssp-blue/10 text-ssp-blue border-ssp-blue/30',
  OPERADOR: 'bg-amber-100 text-amber-800 border-amber-300',
  PASTA: 'bg-slate-100 text-slate-600 border-slate-300',
};

const ROLE_FILTERS = ['Todos', 'ADMIN', 'OPERADOR', 'PASTA'] as const;

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Servidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('Todos');
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<Servidor | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null
  );

  const createForm = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: {
      nome: '',
      matricula: '',
      cpf: '',
      email: '',
      status: 'Ativo',
      role: 'OPERADOR',
    },
  });

  const editForm = useForm<UsuarioEditData>({
    resolver: zodResolver(usuarioEditSchema),
  });

  const createStatus = useWatch({ control: createForm.control, name: 'status' });
  const createRole = useWatch({ control: createForm.control, name: 'role' });
  const editStatus = useWatch({ control: editForm.control, name: 'status' });
  const editRole = useWatch({ control: editForm.control, name: 'role' });

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/servidores');
      const data = await res.json();
      setUsuarios(data);
    } catch (error) {
      console.error(error);
      setFeedback({ kind: 'error', message: 'Erro ao carregar usuários.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    fetch('/api/servidores')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setUsuarios(data);
          setLoading(false);
        }
      })
      .catch((error) => {
        console.error(error);
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsuarios = useMemo(() => {
    return usuarios.filter((user) => {
      const fitsRole = roleFilter === 'Todos' || user.role === roleFilter;
      const matchesText =
        !searchQuery ||
        user.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.matricula.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      return fitsRole && matchesText;
    });
  }, [usuarios, roleFilter, searchQuery]);

  const counts = useMemo(
    () => ({
      total: usuarios.length,
      admin: usuarios.filter((u) => u.role === 'ADMIN').length,
      operador: usuarios.filter((u) => u.role === 'OPERADOR').length,
      pasta: usuarios.filter((u) => u.role === 'PASTA').length,
    }),
    [usuarios]
  );

  const showFeedback = (kind: 'success' | 'error', message: string) => {
    setFeedback({ kind, message });
    window.setTimeout(() => setFeedback(null), 5000);
  };

  const onSubmitCreate = async (data: UsuarioFormData) => {
    try {
      const res = await fetch('/api/servidores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          cargoEfetivo: 'Sem cargo registrado',
          cargoOcupado: 'Sem cargo comissionado',
          lotacao: 'Não informada',
        }),
      });

      if (!res.ok) {
        const responseData = await res.json();
        throw new Error(responseData?.error || 'Falha ao criar usuário.');
      }

      showFeedback('success', `Usuário ${data.nome} criado com sucesso.`);
      setShowCreate(false);
      createForm.reset();
      void loadUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao criar usuário.';
      showFeedback('error', message);
    }
  };

  const handleCloseCreate = () => {
    setShowCreate(false);
    createForm.reset();
    setFeedback(null);
  };

  const openEdit = (user: Servidor) => {
    setEditingUser(user);
    editForm.reset({
      nome: user.nome,
      email: user.email || '',
      telefone: user.telefone || '',
      cargoEfetivo: user.cargoEfetivo || '',
      cargoOcupado: user.cargoOcupado || '',
      lotacao: user.lotacao || '',
      status: user.status,
      role: user.role,
      senha: '',
    });
    setFeedback(null);
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
    editForm.reset();
    setFeedback(null);
  };

  const onSubmitEdit = async (data: UsuarioEditData) => {
    if (!editingUser) return;
    try {
      const res = await fetch(`/api/servidores?id=${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData?.error || 'Falha ao atualizar usuário.');
      }

      showFeedback('success', `Dados de ${data.nome} atualizados com sucesso.`);
      setEditingUser(null);
      editForm.reset();
      void loadUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao atualizar usuário.';
      showFeedback('error', message);
    }
  };

  const toggleStatus = async (user: Servidor) => {
    const nextStatus = user.status === 'Ativo' ? 'Inativo' : 'Ativo';
    setBusyId(user.id);
    try {
      const res = await fetch(`/api/servidores?id=${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const responseData = await res.json();
      if (!res.ok) {
        throw new Error(responseData?.error || 'Falha ao alterar o status.');
      }

      showFeedback(
        'success',
        `${user.nome} ${nextStatus === 'Ativo' ? 'reativado' : 'desativado'} com sucesso.`
      );
      void loadUsers();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro inesperado ao alterar o status.';
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

        <Button onClick={() => setShowCreate(true)} className="bg-ssp-blue hover:bg-ssp-blueDark">
          <Plus size={16} className="mr-2" /> Novo Usuário
        </Button>
      </div>

      {feedback && (
        <Alert variant={feedback.kind === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{feedback.message}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
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
            <p className="text-3xl font-bold text-amber-600">{counts.operador}</p>
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
            <p className="text-3xl font-bold text-slate-500">{counts.pasta}</p>
            <p className="text-xs text-muted-foreground mt-2">Registros sem acesso ao painel.</p>
          </CardContent>
        </Card>
      </div>

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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, matrícula ou email..."
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {ROLE_FILTERS.map((option) => (
                <Button
                  key={option}
                  variant={roleFilter === option ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRoleFilter(option)}
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
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="p-8 text-center text-muted-foreground">
                    Carregando usuários...
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
                    <TableCell className="font-mono text-ssp-blue">{user.matricula}</TableCell>
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
                          disabled={busyId === user.id}
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

      <Dialog open={showCreate} onOpenChange={handleCloseCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Image
                src="/logo-sspdf.png"
                alt="Logo SSP-DF"
                width={120}
                height={120}
                className="mb-6 h-auto w-auto"
              />
              <div>
                <DialogTitle>Criar novo usuário</DialogTitle>
                <DialogDescription>
                  Defina o perfil de acesso. O usuário receberá um link para criar a senha no
                  primeiro acesso.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input
                  id="nome"
                  {...createForm.register('nome')}
                  className={createForm.formState.errors.nome ? 'border-destructive' : ''}
                />
                {createForm.formState.errors.nome && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.nome.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula</Label>
                <Input
                  id="matricula"
                  {...createForm.register('matricula')}
                  className={`font-mono ${
                    createForm.formState.errors.matricula ? 'border-destructive' : ''
                  }`}
                />
                {createForm.formState.errors.matricula && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.matricula.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  {...createForm.register('cpf')}
                  className={`font-mono ${
                    createForm.formState.errors.cpf ? 'border-destructive' : ''
                  }`}
                />
                {createForm.formState.errors.cpf && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.cpf.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...createForm.register('email')}
                  className={createForm.formState.errors.email ? 'border-destructive' : ''}
                />
                {createForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {createForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Perfil de acesso</Label>
                <Select
                  value={createRole}
                  onValueChange={(value) => {
                    if (value) createForm.setValue('role', value as Servidor['role']);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="OPERADOR">Operador</SelectItem>
                    <SelectItem value="PASTA">Pasta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={createStatus}
                  onValueChange={(value) => {
                    if (value) createForm.setValue('status', value as 'Ativo' | 'Inativo');
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseCreate}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-ssp-blue hover:bg-ssp-blueDark">
                Criar Usuário
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingUser)} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <UserCog size={24} className="text-ssp-blue" />
              <div>
                <DialogTitle>Editar usuário</DialogTitle>
                <DialogDescription>
                  Atualize os dados, o perfil de acesso ou redefina a senha de {editingUser?.nome}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nome">Nome completo</Label>
                <Input
                  id="edit-nome"
                  {...editForm.register('nome')}
                  className={editForm.formState.errors.nome ? 'border-destructive' : ''}
                />
                {editForm.formState.errors.nome && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.nome.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  {...editForm.register('email')}
                  className={editForm.formState.errors.email ? 'border-destructive' : ''}
                />
                {editForm.formState.errors.email && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-telefone">Telefone</Label>
                <Input id="edit-telefone" {...editForm.register('telefone')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cargo">Cargo efetivo</Label>
                <Input id="edit-cargo" {...editForm.register('cargoEfetivo')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-cargoOcupado">Cargo ocupado</Label>
                <Input id="edit-cargoOcupado" {...editForm.register('cargoOcupado')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-lotacao">Lotação</Label>
                <Input id="edit-lotacao" {...editForm.register('lotacao')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">Perfil de acesso</Label>
                <Select
                  value={editRole}
                  onValueChange={(value) => {
                    if (value) editForm.setValue('role', value as Servidor['role']);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="OPERADOR">Operador</SelectItem>
                    <SelectItem value="PASTA">Pasta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(value) => {
                    if (value) editForm.setValue('status', value as 'Ativo' | 'Inativo');
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
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
                />
                {editForm.formState.errors.senha && (
                  <p className="text-sm text-destructive">
                    {editForm.formState.errors.senha.message}
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseEdit}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-ssp-blue hover:bg-ssp-blueDark">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
