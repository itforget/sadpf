/**
 * Repositório do agregado Servidor.
 *
 * Estes exports mantêm a API existente enquanto o acesso Prisma é extraído
 * gradualmente de `lib/server/db.ts`.
 */
export {
  addServidor,
  deleteServidor,
  getFotoServidorById,
  getServidorById,
  getServidores,
  updateFotoServidor,
  updateServidor,
} from '@/lib/server/db';
