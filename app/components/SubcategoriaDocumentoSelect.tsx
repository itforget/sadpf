'use client';

import type { Ref } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SUBCATEGORIAS_DOCUMENTO, type CategoriaDocumentoLabel } from '@/lib/documentos';

interface Props {
  categoria: CategoriaDocumentoLabel;
  value?: string;
  onValueChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: Ref<HTMLButtonElement>;
  id?: string;
  erro?: string;
}

export default function SubcategoriaDocumentoSelect({
  categoria,
  value,
  onValueChange,
  onBlur,
  inputRef,
  id = 'subcategoria',
  erro,
}: Props) {
  const opcoes = SUBCATEGORIAS_DOCUMENTO[categoria];
  const aplicavel = opcoes.length > 0;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        Subcategoria {aplicavel && <span className="text-destructive">*</span>}
      </Label>
      <Select
        value={value || null}
        name="subcategoria"
        onValueChange={(opcao) => onValueChange(opcao ?? '')}
        disabled={!aplicavel}
      >
        <SelectTrigger
          id={id}
          ref={inputRef}
          onBlur={onBlur}
          className="w-full min-h-11 sm:min-h-9 data-[size=default]:h-auto [&_span]:whitespace-normal"
          aria-required={aplicavel}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? `${id}-error` : !aplicavel ? `${id}-help` : undefined}
        >
          <SelectValue placeholder={aplicavel ? 'Selecione a subcategoria' : 'Não se aplica'} />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((opcao) => (
            <SelectItem key={opcao} value={opcao}>
              {opcao}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {!aplicavel && (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          O documento de referência não prevê subcategorias para esta categoria.
        </p>
      )}
      {erro && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
