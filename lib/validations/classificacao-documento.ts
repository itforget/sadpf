import { z } from 'zod';
import { CATEGORIAS_DOCUMENTO, SUBCATEGORIAS_DOCUMENTO } from '@/lib/documentos';

export const classificacaoDocumentoSchema = z
  .object({
    categoria: z.enum(CATEGORIAS_DOCUMENTO, { message: 'Categoria inválida.' }),
    subcategoria: z.string().trim().max(255).optional(),
  })
  .superRefine(({ categoria, subcategoria }, ctx) => {
    const opcoes = SUBCATEGORIAS_DOCUMENTO[categoria];
    if (opcoes.length > 0 && !subcategoria) {
      ctx.addIssue({
        code: 'custom',
        path: ['subcategoria'],
        message: 'Selecione a subcategoria do documento.',
      });
    } else if (subcategoria && !opcoes.includes(subcategoria)) {
      ctx.addIssue({
        code: 'custom',
        path: ['subcategoria'],
        message: 'Subcategoria inválida para a categoria selecionada.',
      });
    }
  });
