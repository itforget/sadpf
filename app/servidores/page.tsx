'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Users, User, Search, Plus, Filter, ChevronRight, UserPlus } from 'lucide-react';
import type { Servidor } from '@/lib/types';
import Image from 'next/image';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

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
import { servidorSchema, type ServidorFormData } from '@/lib/validations/servidor';

export default function ServidoresListPage() {
  const [servidores, setServidores] = useState<Servidor[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ServidorFormData>({
    resolver: zodResolver(servidorSchema),
    defaultValues: {
      nome: '',
      matricula: '',
      cpf: '',
      cargoEfetivo: '',
      cargoOcupado: '',
      lotacao: '',
      status: 'Ativo',
      role: 'PASTA',
      senha: '',
    },
  });

  const status = useWatch({ control, name: 'status' });

  const requestServidores = useCallback(async (): Promise<Servidor[]> => {
    const url = new URL('/api/servidores', window.location.origin);
    if (statusFilter !== 'Todos') url.searchParams.set('status', statusFilter);
    if (searchQuery) url.searchParams.set('search', searchQuery);
    const res = await fetch(url.toString());
    return (await res.json()) as Servidor[];
  }, [statusFilter, searchQuery]);

  const fetchServidores = useCallback(async () => {
    setLoading(true);
    try {
      const data = await requestServidores();
      setServidores(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [requestServidores]);

  useEffect(() => {
    let cancelled = false;
    requestServidores()
      .then((data) => {
        if (!cancelled) {
          setServidores(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestServidores]);

  const onSubmit = async (data: ServidorFormData) => {
    try {
      const res = await fetch('/api/servidores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          role: 'PASTA',
          senha: '',
          fotoUrl: '',
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        reset();
        void fetchServidores();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    reset();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <UserPlus size={24} className="text-ssp-blue" />
              <div>
                <DialogTitle>Criar Nova Pasta Funcional de Servidor</DialogTitle>
                <DialogDescription>
                  Preencha os dados do servidor para criar sua pasta funcional.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  {...register('nome')}
                  placeholder="Ex.: Mariana Alves de Souza"
                  className={errors.nome ? 'border-destructive' : ''}
                />
                {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="matricula">Matrícula SSP-DF *</Label>
                <Input
                  id="matricula"
                  {...register('matricula')}
                  placeholder="Ex.: 987.654-3"
                  className={`font-mono ${errors.matricula ? 'border-destructive' : ''}`}
                />
                {errors.matricula && (
                  <p className="text-sm text-destructive">{errors.matricula.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  {...register('cpf')}
                  placeholder="000.000.000-00"
                  className={`font-mono ${errors.cpf ? 'border-destructive' : ''}`}
                />
                {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status *</Label>
                <Select
                  value={status}
                  onValueChange={(value) => {
                    if (value) setValue('status', value);
                  }}
                >
                  <SelectTrigger className={errors.status ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargoEfetivo">Cargo Efetivo *</Label>
                <Input
                  id="cargoEfetivo"
                  {...register('cargoEfetivo')}
                  className={errors.cargoEfetivo ? 'border-destructive' : ''}
                />
                {errors.cargoEfetivo && (
                  <p className="text-sm text-destructive">{errors.cargoEfetivo.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargoOcupado">Cargo Ocupado no Órgão</Label>
                <Input
                  id="cargoOcupado"
                  {...register('cargoOcupado')}
                  placeholder="Ex.: Chefe de Núcleo (FG-02)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lotacao">Lotação Atual *</Label>
              <Input
                id="lotacao"
                {...register('lotacao')}
                className={errors.lotacao ? 'border-destructive' : ''}
              />
              {errors.lotacao && (
                <p className="text-sm text-destructive">{errors.lotacao.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseModal}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-ssp-blue hover:bg-ssp-blueDark">
                Criar Pasta Funcional
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Pastas Funcionais de Servidores
          </h1>
          <p className="text-sm text-muted-foreground">
            Consulta centralizada do acervo digital de servidores da Secretaria de Segurança Pública
            do DF.
          </p>
        </div>

        <Button onClick={() => setShowAddModal(true)} className="bg-ssp-blue hover:bg-ssp-blueDark">
          <Plus size={18} className="mr-2" /> Nova Pasta Funcional
        </Button>
      </div>

      <div className="bg-card p-4 rounded-xl border border-border shadow-corporate flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            size={18}
          />
          <Input
            type="search"
            placeholder="Buscar por nome, matrícula, CPF ou cargo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={16} className="text-muted-foreground shrink-0" />
          <span className="text-xs font-semibold text-muted-foreground">Status:</span>
          {['Todos', 'Ativo', 'Inativo'].map((st) => (
            <Button
              key={st}
              variant={statusFilter === st ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(st)}
              className={statusFilter === st ? 'bg-ssp-blue hover:bg-ssp-blueDark' : ''}
            >
              {st}
            </Button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-corporate overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <div className="w-8 h-8 border-4 border-ssp-blue border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-sm font-semibold">Carregando acervo de servidores...</p>
          </div>
        ) : servidores.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/60 text-xs font-bold text-muted-foreground uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="px-6 py-4">Servidor</th>
                  <th className="px-6 py-4">Matrícula</th>
                  <th className="px-6 py-4">Cargo Efetivo / Ocupado</th>
                  <th className="px-6 py-4">Lotação Atual</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {servidores.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {s.fotoUrl ? (
                          <Image
                            src={s.fotoUrl}
                            alt={s.nome}
                            width={200}
                            height={200}
                            unoptimized={
                              s.fotoUrl.startsWith('/api/') || s.fotoUrl.startsWith('data:')
                            }
                            className="w-10 h-10 rounded-full object-cover border border-border shadow-sm shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                            <User size={18} />
                          </div>
                        )}
                        <div>
                          <Link
                            href={`/servidores/${s.id}`}
                            className="font-bold text-foreground hover:text-ssp-blue transition-colors"
                          >
                            {s.nome}
                          </Link>
                          <p className="text-xs text-muted-foreground font-mono">CPF: {s.cpf}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-ssp-blue">{s.matricula}</td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-foreground">{s.cargoEfetivo}</p>
                      <p className="text-xs text-muted-foreground">{s.cargoOcupado}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-muted-foreground">{s.lotacao}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          s.role === 'ADMIN'
                            ? 'bg-ssp-blue/10 text-ssp-blue border-ssp-blue/20'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {s.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          s.status === 'Ativo'
                            ? 'bg-status-success/15 text-status-success border-status-success/20'
                            : 'bg-status-danger/15 text-status-danger border-status-danger/20'
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/servidores/${s.id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-ssp-blue hover:text-ssp-blueDark bg-ssp-blue/10 hover:bg-ssp-blue/20 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Abrir Capa <ChevronRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <Users size={48} className="mx-auto opacity-40" />
            <p className="font-semibold text-base">Nenhum servidor encontrado.</p>
            <p className="text-xs">Tente ajustar a busca ou limpar os filtros de status.</p>
          </div>
        )}
      </div>
    </div>
  );
}
