'use client';

import { useState } from 'react';
import { Send, ShieldAlert, CheckCircle2, Copy, Link as LinkIcon } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Servidor, DocumentoPDF } from '@/lib/types';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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

interface EncaminharModalProps {
  servidor: Servidor;
  documento?: DocumentoPDF;
  operador: { nome: string; matricula: string; ip: string };
  onClose: () => void;
}

function generateShareToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export default function EncaminharModal({
  servidor,
  documento,
  operador,
  onClose,
}: EncaminharModalProps) {
  const [enviando, setEnviando] = useState(false);
  const [linkGerado, setLinkGerado] = useState('');
  const [copiado, setCopiado] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    reset,
  } = useForm<EncaminhamentoFormData>({
    resolver: zodResolver(encaminhamentoSchema),
    defaultValues: {
      destinatario: '',
      justificativa: '',
      validadeDias: '7',
      requerSenha: true,
    },
  });

  const validadeDias = useWatch({ control, name: 'validadeDias' });
  const requerSenha = useWatch({ control, name: 'requerSenha' });
  const destinatario = useWatch({ control, name: 'destinatario' });

  const onSubmit = async (data: EncaminhamentoFormData) => {
    setEnviando(true);

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operador: operador.nome,
          operadorMatricula: operador.matricula,
          acao: 'ENCAMINHAMENTO',
          detalhes: `Gerou link seguro de encaminhamento para '${data.destinatario}' referente à pasta de ${servidor.nome} (Mat. ${servidor.matricula}). Motivo: ${data.justificativa}`,
          ip: operador.ip,
        }),
      });
    } catch (err) {
      console.error('[EncaminharModal] erro ao registrar log:', err);
    }

    const token = generateShareToken();
    const generatedUrl = `${window.location.origin}/compartilhado/${token}`;

    setTimeout(() => {
      setEnviando(false);
      setLinkGerado(generatedUrl);
    }, 600);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(linkGerado);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleClose = () => {
    reset();
    setLinkGerado('');
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Send size={24} className="text-ssp-blue" />
            <div>
              <DialogTitle>Encaminhar Pasta / Documento Funcional</DialogTitle>
              <DialogDescription>
                Envio Interno Restrito a Comissões e Órgãos de Controle da SSP-DF
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {!linkGerado ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="bg-muted/40 p-4 rounded-xl border border-border text-xs space-y-1">
              <p className="font-semibold text-foreground">Item a ser encaminhado:</p>
              <p className="text-muted-foreground">
                <strong className="text-foreground">Servidor:</strong> {servidor.nome} (Matrícula:{' '}
                {servidor.matricula})
              </p>
              {documento && (
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Documento:</strong> {documento.titulo} (
                  {documento.categoria})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="destinatario">
                Unidade / Comissão Destinatária <span className="text-destructive">*</span>
              </Label>
              <Input
                id="destinatario"
                {...register('destinatario')}
                placeholder="Ex.: Corregedoria Geral de Segurança Pública - CGP"
                className={errors.destinatario ? 'border-destructive' : ''}
              />
              {errors.destinatario && (
                <p className="text-sm text-destructive">{errors.destinatario.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="justificativa">
                Justificativa / Processo SEI de Referência{' '}
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="justificativa"
                {...register('justificativa')}
                placeholder="Informe o número do processo SEI e o motivo do envio..."
                rows={3}
                className={errors.justificativa ? 'border-destructive' : ''}
              />
              {errors.justificativa && (
                <p className="text-sm text-destructive">{errors.justificativa.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validadeDias">Validade do Acesso</Label>
                <Select
                  value={validadeDias}
                  onValueChange={(value) => {
                    if (value) setValue('validadeDias', value as '1' | '7' | '15' | '30');
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">24 Horas</SelectItem>
                    <SelectItem value="7">7 Dias (Padrão)</SelectItem>
                    <SelectItem value="15">15 Dias</SelectItem>
                    <SelectItem value="30">30 Dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Checkbox
                  id="requerSenha"
                  checked={requerSenha}
                  onCheckedChange={(checked) => setValue('requerSenha', checked as boolean)}
                />
                <Label htmlFor="requerSenha" className="text-xs cursor-pointer">
                  Exigir senha temporária para abertura
                </Label>
              </div>
            </div>

            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2.5">
              <ShieldAlert size={18} className="shrink-0 mt-0.5" />
              <p>
                O link gerado é de acesso temporário, individualizado e auditável. Qualquer consulta
                realizada pelo destinatário será gravada na trilha de auditoria da Gestão de
                Pessoas.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={enviando}
                className="bg-ssp-blue hover:bg-ssp-blueDark"
              >
                {enviando ? 'Gerando Link...' : 'Gerar Link Seguro'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-6 py-4 text-center">
            <div className="w-16 h-16 bg-status-success/10 text-status-success rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-foreground">Link de Encaminhamento Criado!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Encaminhado para: <strong>{destinatario}</strong> (Válido por {validadeDias} dias)
              </p>
            </div>

            <div className="bg-muted p-4 rounded-xl border border-border flex items-center gap-3">
              <LinkIcon size={18} className="text-ssp-blue shrink-0" />
              <Input
                type="text"
                readOnly
                value={linkGerado}
                className="bg-transparent text-xs font-mono"
              />
              <Button
                onClick={handleCopy}
                size="sm"
                className="bg-ssp-blue hover:bg-ssp-blueDark shrink-0"
              >
                {copiado ? (
                  'Copiado!'
                ) : (
                  <>
                    <Copy size={14} className="mr-1" /> Copiar
                  </>
                )}
              </Button>
            </div>

            <div className="flex justify-center pt-2">
              <Button onClick={handleClose} className="bg-ssp-blue hover:bg-ssp-blueDark">
                Concluir
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
