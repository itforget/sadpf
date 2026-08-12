import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/prisma/generated';
import bcrypt from 'bcryptjs';

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando seed...');

  const senhaHash = await bcrypt.hash('123456Senha!', 10);

  // Remove o usuário admin caso já exista
  await prisma.servidor.deleteMany({
    where: {
      OR: [{ matricula: '1.706.719-7' }, { cpf: '12345678900' }],
    },
  });

  // Cria apenas o usuário administrador
  const admin = await prisma.servidor.create({
    data: {
      matricula: '1.706.719-7',
      nome: 'Ítalo Cordeiro de Souza',
      cpf: '12345678900',
      fotoUrl: null,
      cargoEfetivo: '',
      cargoOcupado: 'Assessor',
      lotacao: 'GRF - Gerencia de Registros Financeiros',
      status: 'Ativo',
      role: 'ADMIN',
      dataIngresso: new Date().toLocaleDateString('pt-BR'),
      email: 'italo.souza@ssp.df.gov.br',
      telefone: '(61) 988811354',
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
