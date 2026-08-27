import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { Prisma, StatusServidor } from '@/prisma/generated';
import { getVerifiedSession, isSameOriginMutation } from '@/lib/server/access';
import {
  getServidores,
  addServidor,
  updateServidor,
  deleteServidor,
  getServidorById,
} from '@/lib/server/repositories/servidor';
import { servidorSchema, servidorUpdateSchema } from '@/lib/validations/servidor';
import { getRequestIp } from '@/lib/server/request-ip';
import { processPendingStorageDeletionTasks } from '@/lib/server/storage-cleanup';

export async function GET(request: Request) {
  try {
    if (!(await getVerifiedSession())) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get('status');
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') as 'ADMIN' | 'OPERADOR' | 'PASTA' | null;

    const status: StatusServidor | 'Todos' | undefined =
      statusParam === StatusServidor.Ativo
        ? StatusServidor.Ativo
        : statusParam === StatusServidor.Inativo
        ? StatusServidor.Inativo
        : statusParam === StatusServidor.Aposentado
        ? StatusServidor.Aposentado
        : statusParam === 'Todos'
        ? 'Todos'
        : undefined;

    const servidores = await getServidores({
      status,
      search,
      role: role ?? undefined,
    });

    return NextResponse.json(servidores);
  } catch (error: unknown) {
    console.error('[GET /api/servidores]', error);
    return NextResponse.json({ error: 'Erro ao consultar servidores.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
    }
    const session = await getVerifiedSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (!['ADMIN', 'OPERADOR'].includes(String(session.role))) {
      return NextResponse.json(
        { error: 'Apenas administradores e operadores podem cadastrar pastas funcionais.' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const validationResult = servidorSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    if (session.role === 'OPERADOR' && data.role !== 'PASTA') {
      return NextResponse.json(
        { error: 'Operadores podem cadastrar somente pastas funcionais.' },
        { status: 403 }
      );
    }

    const senhaHash = data.senha ? await bcrypt.hash(data.senha, 12) : undefined;

    const newServidor = await addServidor({
      matricula: data.matricula,
      matriculaCargoEfetivo: data.matriculaCargoEfetivo,
      nome: data.nome,
      cpf: data.cpf,
      fotoUrl: typeof body.fotoUrl === 'string' ? body.fotoUrl : '',
      cargoEfetivo: data.cargoEfetivo,
      cargoOcupado: data.cargoOcupado || 'Sem cargo comissionado',
      lotacao: data.lotacao,
      status: data.status,
      dataIngresso: data.dataIngresso,
      email: data.email,
      telefone: data.telefone,
      role: data.role,
      senhaHash,
      senhaDefinidaEm: null,
    });

    return NextResponse.json(newServidor, { status: 201 });
  } catch (error: unknown) {
    console.error('[POST /api/servidores]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Já existe uma pasta funcional com esta matrícula, CPF ou e-mail.' },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : 'Erro ao cadastrar servidor.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
    }
    const session = await getVerifiedSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (!['ADMIN', 'OPERADOR'].includes(String(session.role))) {
      return NextResponse.json(
        { error: 'Apenas administradores e operadores podem alterar pastas funcionais.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID do servidor é obrigatório.' }, { status: 400 });
    }

    const body = await request.json();

    const validationResult = servidorUpdateSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.issues[0]?.message || 'Dados inválidos.' },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    const senhaHash =
      typeof data.senha === 'string' && data.senha !== ''
        ? await bcrypt.hash(data.senha, 12)
        : undefined;

    const servidorAtual = await getServidorById(id);
    if (!servidorAtual) {
      return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
    }

    if (session.role !== 'ADMIN' && data.role !== undefined && data.role !== servidorAtual.role) {
      return NextResponse.json(
        { error: 'Somente administradores podem alterar o perfil do servidor.' },
        { status: 403 }
      );
    }

    const updated = await updateServidor(
      id,
      {
        matricula: data.matricula,
        matriculaCargoEfetivo: data.matriculaCargoEfetivo,
        cpf: data.cpf,
        nome: data.nome,
        email: data.email ?? undefined,
        telefone: data.telefone ?? undefined,
        fotoUrl: data.fotoUrl ?? undefined,
        cargoEfetivo: data.cargoEfetivo,
        cargoOcupado: data.cargoOcupado,
        lotacao: data.lotacao,
        status: data.status,
        ...(session.role === 'ADMIN' && data.role !== undefined ? { role: data.role } : {}),
        dataIngresso: data.dataIngresso,
        senhaHash,
      },
      {
        operador: String(session.nome),
        operadorMatricula: String(session.matricula),
        acao: 'ATUALIZACAO',
        detalhes: `Atualizou os dados cadastrais da pasta funcional de ${servidorAtual.nome} (Mat. ${servidorAtual.matricula}).`,
        ip: getRequestIp(request),
      }
    );
    if (!updated) {
      return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('[PUT /api/servidores]', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Já existe uma pasta funcional com esta matrícula, CPF ou e-mail.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Erro ao atualizar servidor.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isSameOriginMutation(request)) {
      return NextResponse.json({ error: 'Origem da requisição inválida.' }, { status: 403 });
    }
    const session = await getVerifiedSession();
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }
    if (session.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Somente administradores podem excluir usuários.' },
        { status: 403 }
      );
    }

    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    const servidor = await getServidorById(id);
    if (!servidor) {
      return NextResponse.json({ error: 'Servidor não encontrado.' }, { status: 404 });
    }

    const deleted = await deleteServidor(id, {
      operador: String(session.nome),
      operadorMatricula: String(session.matricula),
      acao: 'EXCLUSAO',
      detalhes: `Excluiu a pasta funcional de ${servidor.nome} (Mat. ${servidor.matricula}).`,
      ip: getRequestIp(request),
    });
    await processPendingStorageDeletionTasks();
    return NextResponse.json(deleted);
  } catch (error: unknown) {
    console.error('[DELETE /api/servidores]', error);
    return NextResponse.json({ error: 'Erro ao excluir usuário.' }, { status: 500 });
  }
}
