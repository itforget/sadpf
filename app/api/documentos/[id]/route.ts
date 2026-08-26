import { NextRequest, NextResponse } from 'next/server';
import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';
import { addLog, deleteDocumento, getDocumentoById, updateDocumento } from '@/lib/server/db';
import { processPendingStorageDeletionTasks } from '@/lib/server/storage-cleanup';
import { z } from 'zod';
import { getRequestIp } from '@/lib/server/request-ip';
import { CATEGORIAS_DOCUMENTO } from '@/lib/documentos';

const documentoUpdateSchema = z.object({
  titulo: z.string().trim().min(1, 'Título é obrigatório'),
  categoria: z.enum(CATEGORIAS_DOCUMENTO),
  processoSEI: z.string().trim().optional(),
});

async function getSession(request: NextRequest) {
  const session = await getVerifiedSession(request);
  return session && ['ADMIN', 'OPERADOR'].includes(String(session.role)) ? session : null;
}

export async function PATCH(request: NextRequest, context: RouteContext<'/api/documentos/[id]'>) {
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
  }
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
      acao: 'ATUALIZACAO',
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
  if (!isSameOriginMutation(request)) {
    return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
  }
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 403 });

  try {
    const { id } = await context.params;
    const existente = await getDocumentoById(id);
    if (!existente)
      return NextResponse.json({ error: 'Documento não encontrado.' }, { status: 404 });

    const documento = await deleteDocumento(id);
    if (documento) {
      await processPendingStorageDeletionTasks();
    }
    await addLog({
      operador: String(session.nome),
      operadorMatricula: String(session.matricula),
      acao: 'EXCLUSAO',
      detalhes: `Excluiu o documento '${existente.titulo}'.`,
      ip: getRequestIp(request),
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[DELETE /api/documentos/[id]]', error);
    return NextResponse.json({ error: 'Não foi possível excluir o documento.' }, { status: 500 });
  }
}
