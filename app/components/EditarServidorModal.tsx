'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import type { Servidor } from '@/lib/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchSession } from '@/lib/client/api';
import { formatarCpf } from '@/lib/cpf';
import { queryKeys, summaryQueryKeys } from '@/lib/client/query-keys';
import { useQuery } from '@tanstack/react-query';

interface EditarServidorModalProps {
  servidor: Servidor;
  modo: 'dados' | 'foto';
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditarServidorModal({
  servidor,
  modo,
  onClose,
  onUpdated,
}: EditarServidorModalProps) {
  const [dados, setDados] = useState(servidor);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [excluindoFoto, setExcluindoFoto] = useState(false);
  const [erro, setErro] = useState('');
  const editandoFoto = modo === 'foto';
  const queryClient = useQueryClient();
  const { data: sessionData } = useQuery({
    queryKey: queryKeys.session,
    queryFn: fetchSession,
  });
  const podeEditarPerfil = sessionData?.user?.role === 'ADMIN';

  const salvarMutation = useMutation({
    mutationFn: async () => {
      if (editandoFoto) {
        if (!foto) throw new Error('Selecione uma imagem para enviar.');
        if (!['image/png', 'image/jpeg'].includes(foto.type)) {
          throw new Error('Envie uma imagem PNG ou JPEG.');
        }
        if (foto.size > 5 * 1024 * 1024) throw new Error('A foto deve ter no máximo 5 MB.');
        const formData = new FormData();
        formData.append('foto', foto);
        const response = await fetch(`/api/servidores/${servidor.id}/foto`, {
          method: 'POST',
          body: formData,
        });
        if (!response.ok) {
          const resposta = await response.json().catch(() => null);
          throw new Error(resposta?.error || 'Não foi possível salvar a foto.');
        }
        return;
      }

      const response = await fetch(`/api/servidores?id=${encodeURIComponent(servidor.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: dados.nome,
          matricula: dados.matricula,
          matriculaCargoEfetivo: dados.matriculaCargoEfetivo,
          cpf: dados.cpf,
          cargoEfetivo: dados.cargoEfetivo,
          cargoOcupado: dados.cargoOcupado,
          lotacao: dados.lotacao,
          status: dados.status,
          ...(podeEditarPerfil ? { role: dados.role } : {}),
          dataIngresso: dados.dataIngresso,
          email: dados.email,
          telefone: dados.telefone,
        }),
      });
      if (!response.ok) {
        const resposta = await response.json().catch(() => null);
        throw new Error(resposta?.error || 'Não foi possível salvar as alterações.');
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['servidores'] });
      await Promise.all(
        summaryQueryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      );
      onUpdated();
      onClose();
    },
    onError: (error) => {
      setErro(error instanceof Error ? error.message : 'Não foi possível salvar as alterações.');
    },
    onSettled: () => {
      setSalvando(false);
    },
  });

  const excluirFoto = async () => {
    if (!window.confirm('Excluir permanentemente a foto deste servidor?')) return;

    setExcluindoFoto(true);
    setErro('');
    try {
      const response = await fetch(`/api/servidores/${servidor.id}/foto`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const resposta = await response.json().catch(() => null);
        throw new Error(resposta?.error || 'Não foi possível excluir a foto.');
      }

      await queryClient.invalidateQueries({ queryKey: ['servidores'] });
      await queryClient.invalidateQueries({ queryKey: queryKeys.servidor(servidor.id) });
      onUpdated();
      onClose();
    } catch (error) {
      setErro(error instanceof Error ? error.message : 'Não foi possível excluir a foto.');
    } finally {
      setExcluindoFoto(false);
    }
  };

  const atualizar = <K extends keyof Servidor>(campo: K, valor: Servidor[K]) => {
    setDados((anterior) => ({ ...anterior, [campo]: valor }));
  };

  const salvar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (salvando || excluindoFoto) return;
    setSalvando(true);
    setErro('');
    try {
      await salvarMutation.mutateAsync();
    } catch {}
  };

  const selecionarFoto = (arquivo: File | null) => {
    setFoto(arquivo);
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoPreview(arquivo ? URL.createObjectURL(arquivo) : null);
  };

  const fotoExibida = fotoPreview || servidor.fotoUrl;
  const processando = salvando || excluindoFoto;

  return (
    <Dialog
      open={true}
      disablePointerDismissal={processando}
      onOpenChange={(open) => {
        if (!open && !processando) onClose();
      }}
    >
      <DialogContent
        className="max-w-xl max-h-[calc(100dvh-2rem)] overflow-y-auto"
        showCloseButton={!processando}
      >
        <DialogHeader>
          <DialogTitle>
            {editandoFoto ? 'Adicionar ou editar foto' : 'Editar dados do servidor'}
          </DialogTitle>
          <DialogDescription>
            {editandoFoto
              ? 'Visualize, substitua ou exclua a foto da pasta funcional.'
              : 'Atualize os dados cadastrais do servidor.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={salvar} className="space-y-4">
          <fieldset disabled={processando} className="space-y-4">
            {editandoFoto ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-muted/30 p-4">
                  <div className="relative h-36 w-36 overflow-hidden rounded-full border-4 border-card bg-muted shadow-sm">
                    {fotoExibida ? (
                      <Image
                        src={fotoExibida}
                        alt={`Foto de ${servidor.nome}`}
                        width={144}
                        height={144}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center px-4 text-center text-xs text-muted-foreground">
                        Nenhuma foto cadastrada
                      </span>
                    )}
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    {fotoPreview ? 'Pré-visualização da nova foto' : 'Foto atual do servidor'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="foto">Escolher nova foto</Label>
                  <Input
                    id="foto"
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(event) => selecionarFoto(event.target.files?.[0] || null)}
                    required={!servidor.fotoUrl}
                    disabled={processando}
                  />
                  <p className="text-xs text-muted-foreground">PNG ou JPEG, até 5 MB.</p>
                </div>
              </div>
            ) : (
              <>
                <Campo
                  id="nome"
                  label="Nome completo"
                  value={dados.nome}
                  onChange={(value) => atualizar('nome', value)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Campo
                    id="matricula"
                    label="Matrícula SSP-DF"
                    value={dados.matricula}
                    onChange={(value) => atualizar('matricula', value)}
                  />
                  <Campo
                    id="matriculaCargoEfetivo"
                    label="Matrícula do cargo efetivo"
                    value={dados.matriculaCargoEfetivo}
                    onChange={(value) => atualizar('matriculaCargoEfetivo', value)}
                  />
                  <Campo
                    id="cpf"
                    label="CPF"
                    value={dados.cpf}
                    onChange={(value) => atualizar('cpf', formatarCpf(value))}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Campo
                    id="cargoOcupado"
                    required={false}
                    label="Cargo SSP-DF"
                    value={dados.cargoOcupado}
                    onChange={(value) => atualizar('cargoOcupado', value)}
                  />
                  <Campo
                    id="cargoEfetivo"
                    label="Cargo efetivo"
                    value={dados.cargoEfetivo}
                    onChange={(value) => atualizar('cargoEfetivo', value)}
                  />
                </div>
                <Campo
                  id="lotacao"
                  label="Lotação"
                  value={dados.lotacao}
                  onChange={(value) => atualizar('lotacao', value)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Campo
                    id="email"
                    label="E-mail institucional"
                    type="email"
                    value={dados.email}
                    onChange={(value) => atualizar('email', value)}
                  />
                  <Campo
                    id="telefone"
                    label="Telefone"
                    type="tel"
                    value={dados.telefone}
                    onChange={(value) => atualizar('telefone', value)}
                  />
                </div>
                <Campo
                  id="dataIngresso"
                  label="Data de admissão"
                  value={dados.dataIngresso}
                  onChange={(value) => atualizar('dataIngresso', value)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Selecao
                    id="status"
                    label="Status"
                    value={dados.status}
                    opcoes={['Ativo', 'Inativo', 'Aposentado']}
                    onChange={(value) => atualizar('status', value as Servidor['status'])}
                  />
                  {podeEditarPerfil ? (
                    <Selecao
                      id="role"
                      label="Perfil"
                      value={dados.role}
                      opcoes={['ADMIN', 'OPERADOR', 'PASTA']}
                      onChange={(value) => atualizar('role', value as Servidor['role'])}
                    />
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="role">Perfil</Label>
                      <Input id="role" value={dados.role} disabled />
                      <p className="text-xs text-muted-foreground">
                        Apenas administradores podem alterar este campo.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
            {erro && (
              <p role="alert" className="text-sm text-status-danger">
                {erro}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={processando}>
                Cancelar
              </Button>
              {editandoFoto && servidor.fotoUrl && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={excluirFoto}
                  disabled={processando}
                >
                  {excluindoFoto ? 'Excluindo…' : 'Excluir foto'}
                </Button>
              )}
              <Button
                type="submit"
                disabled={processando || (editandoFoto && !foto)}
                className="bg-ssp-blue hover:bg-ssp-blueDark"
              >
                {salvando ? 'Salvando…' : 'Salvar alterações'}
              </Button>
            </DialogFooter>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required = true,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
      />
    </div>
  );
}

function Selecao({
  id,
  label,
  value,
  opcoes,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  opcoes: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={(nextValue) => onChange(nextValue ?? '')}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((opcao) => (
            <SelectItem key={opcao} value={opcao}>
              {opcao === 'ADMIN'
                ? 'Administrador'
                : opcao === 'OPERADOR'
                ? 'Operador'
                : opcao === 'PASTA'
                ? 'Somente pasta funcional'
                : opcao}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
