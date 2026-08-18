import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/prisma/generated';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed...');

  const required = [
    'INITIAL_ADMIN_NOME',
    'INITIAL_ADMIN_MATRICULA',
    'INITIAL_ADMIN_CPF',
    'INITIAL_ADMIN_EMAIL',
    'INITIAL_ADMIN_PASSWORD',
  ] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Defina as variáveis de seed: ${missing.join(', ')}`);
  }
  if (process.env.INITIAL_ADMIN_PASSWORD!.length < 12) {
    throw new Error('INITIAL_ADMIN_PASSWORD deve ter no mínimo 12 caracteres.');
  }

  const senhaHash = await bcrypt.hash(process.env.INITIAL_ADMIN_PASSWORD!, 12);
  const matricula = process.env.INITIAL_ADMIN_MATRICULA!;
  const cpf = process.env.INITIAL_ADMIN_CPF!;

  await prisma.servidor.deleteMany({
    where: {
      OR: [{ matricula }, { cpf }],
    },
  });

  const admin = await prisma.servidor.create({
    data: {
      matricula,
      matriculaCargoEfetivo: '',
      nome: process.env.INITIAL_ADMIN_NOME!,
      cpf,
      fotoUrl: null,
      cargoEfetivo: '',
      cargoOcupado: 'Não informado',
      lotacao: 'Não informada',
      status: 'Ativo',
      role: 'ADMIN',
      dataIngresso: new Date().toLocaleDateString('pt-BR'),
      email: process.env.INITIAL_ADMIN_EMAIL!,
      telefone: '',
      senhaHash,
    },
  });

  console.log('✅ Usuário admin criado:', {
    id: admin.id,
    role: admin.role,
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
