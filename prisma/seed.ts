import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/prisma/generated';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed...');

  const senhaHash = await bcrypt.hash('123456Senha!', 10);

  await prisma.servidor.deleteMany({
    where: {
      OR: [
        { matricula: { in: ['000001-1', '000002-2'] } },
        { cpf: { in: ['12345678900', '12345678901'] } },
      ],
    },
  });

  const admin = await prisma.servidor.upsert({
    where: { matricula: '000001-1' },
    update: {
      cpf: '12345678900',
      nome: 'Administrador do Sistema',
      cargoEfetivo: 'Administrador',
      cargoOcupado: 'Administrador do Sistema',
      lotacao: 'Diretoria de Tecnologia - DITEC',
      status: 'Ativo',
      role: 'ADMIN',
      email: 'admin@sadpf.local',
      telefone: '(61) 99999-9999',
      senhaHash,
    },
    create: {
      matricula: '000001-1',
      nome: 'Administrador do Sistema',
      cpf: '12345678900',
      fotoUrl: null,
      cargoEfetivo: 'Administrador',
      cargoOcupado: 'Administrador do Sistema',
      lotacao: 'Diretoria de Tecnologia - DITEC',
      status: 'Ativo',
      role: 'ADMIN',
      dataIngresso: new Date().toLocaleDateString('pt-BR'),
      email: 'admin@sadpf.local',
      telefone: '(61) 99999-9999',
      senhaHash,
    },
  });

  console.log('✅ Usuário admin criado:', {
    id: admin.id,
    nome: admin.nome,
    cpf: admin.cpf,
    matricula: admin.matricula,
    role: admin.role,
  });

  const operador = await prisma.servidor.upsert({
    where: { matricula: '000002-2' },
    update: {
      cpf: '12345678901',
      nome: 'Operador de Teste',
      cargoEfetivo: 'Técnico Administrativo',
      cargoOcupado: 'Operador do Sistema',
      lotacao: 'Coordenação de Gestão de Pessoas - COGEP',
      status: 'Ativo',
      role: 'OPERADOR',
      email: 'operador@sadpf.local',
      telefone: '(61) 98888-8888',
      senhaHash,
    },
    create: {
      matricula: '000002-2',
      nome: 'Operador de Teste',
      cpf: '12345678901',
      fotoUrl: null,
      cargoEfetivo: 'Técnico Administrativo',
      cargoOcupado: 'Operador do Sistema',
      lotacao: 'Coordenação de Gestão de Pessoas - COGEP',
      status: 'Ativo',
      role: 'OPERADOR',
      dataIngresso: new Date().toLocaleDateString('pt-BR'),
      email: 'operador@sadpf.local',
      telefone: '(61) 98888-8888',
      senhaHash,
    },
  });

  console.log('✅ Usuário operador criado:', {
    id: operador.id,
    nome: operador.nome,
    cpf: operador.cpf,
    matricula: operador.matricula,
    role: operador.role,
  });

  console.log('🌱 Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
