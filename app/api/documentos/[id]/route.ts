import { NextRequest, NextResponse } from 'next/server';
import { getSessionFromToken, getSessionToken } from '@/lib/server/auth';
import { addLog, deleteDocumento, getDocumentoById, updateDocumento } from '@/lib/server/db';
import { getStorage } from '@/lib/storage';
import { z } from 'zod';
import { getRequestIp } from '@/lib/server/request-ip';

const documentoUpdateSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório'),
  categoria: z.enum([
    'Dados Pessoais',
    'Posse e Exercício',
    'Vida Funcional',
    'Licenças e Afastamentos',
    'Avaliação de Desempenho',
  ]),
  processoSEI: z.string().trim().optional(),
});

async function getSession(request: NextRequest) {
  const session = getSessionFromToken(await getSessionToken(request));
  return session && ['ADMIN', 'OPERADOR'].includes(String(session.role)) ? session : null;
}

export async function PATCH(request: NextRequest, context: RouteContext<'/api/documentos/[id]'>) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });

  try {
    const { id } = await context.params;
    const dados = documentoUpdateSchema.safeParse(await request.json());
    if (!dados.success) {
      return NextResponse.json(
        { error: dados.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const documento = await updateDocumento(id, dados.data);
    if (!documento) {
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });
    }
    await addLog({
      operador: String(session.nome),
      operadorMatricula: String(session.matricula),
      acao: 'CONSULTA',
      detalhes: `Editou os dados do documento '${documento.titulo}'.`,
      ip: getRequestIp(request),
    });
    return NextResponse.json(documento);
  } catch (error) {
    console.error('[PATCH /api/documentos/[id]]', error);
    return NextResponse.json({ error: 'Não foi possível editar o documento.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext<'/api/documentos/[id]'>) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });

  try {
    const { id } = await context.params;
    const existente = await getDocumentoById(id);
    if (!existente)
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });

    const documento = await deleteDocumento(id);
    if (documento) {
      await getStorage(documento.storageBackend ?? 'local').delete(
        documento.storageKey ?? documento.arquivoUrl
      );
    }
    await addLog({
      operador: String(session.nome),
      operadorMatricula: String(session.matricula),
      acao: 'CONSULTA',
      detalhes: `Excluiu o documento '${existente.titulo}'.`,
      ip: getRequestIp(request),
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[DELETE /api/documentos/[id]]', error);
    return NextResponse.json({ error: 'Não foi possível excluir o documento.' }, { status: 500 });
  }
}
