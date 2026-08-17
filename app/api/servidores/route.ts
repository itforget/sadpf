import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { StatusServidor } from '@/prisma/generated';
import { getSessionToken, getSessionFromToken } from '@/lib/server/auth';
import { getServidores, addServidor, updateServidor, getServidorById } from '@/lib/server/db';
import { servidorSchema, servidorUpdateSchema } from '@/lib/validations/servidor';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const statusParam = searchParams.get('status');
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') as 'ADMIN' | 'OPERADOR' | 'PASTA' | null;

    const status: StatusServidor | 'Todos' | undefined =
      statusParam === StatusServidor.Ativo
        ? StatusServidor.Ativo
        : statusParam === StatusServidor.Inativo
        ? StatusServidor.Inativo
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
    const token = await getSessionToken();
    const session = getSessionFromToken(token);
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
      nome: data.nome,
      cpf: data.cpf,
      fotoUrl: typeof body.fotoUrl === 'string' ? body.fotoUrl : '',
      cargoEfetivo: data.cargoEfetivo,
      cargoOcupado: data.cargoOcupado || 'Sem cargo comissionado',
      lotacao: data.lotacao,
      status: data.status,
      dataIngresso: new Date().toLocaleDateString('pt-BR'),
      email: data.email || '',
      telefone: data.telefone || '',
      role: data.role,
      senhaHash,
      senhaDefinidaEm: null,
    });

    return NextResponse.json(newServidor, { status: 201 });
  } catch (error: unknown) {
    console.error('[POST /api/servidores]', error);
    const message = error instanceof Error ? error.message : 'Erro ao cadastrar servidor.';

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const token = await getSessionToken();
    const session = getSessionFromToken(token);
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

    const updated = await updateServidor(id, {
      matricula: data.matricula,
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
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('[PUT /api/servidores]', error);
    return NextResponse.json({ error: 'Erro ao atualizar servidor.' }, { status: 500 });
  }
}
