import { NextResponse } from 'next/server';

const ENC_CAMINHAMENTOS = [
  {
    id: 'enc-1',
    dataHora: '29/07/2026 10:15',
    destinatario: 'Corregedoria Geral de Segurança Pública - CGP',
    servidor: 'Carlos Mendes da Silva (Mat. 123.456-7)',
    validade: '05/08/2026 (7 Dias)',
    status: 'Ativo',
    justificativa: 'Instrução do Processo Disciplinar SEI 00050-000123/2026',
  },
  {
    id: 'enc-2',
    dataHora: '20/07/2026 14:00',
    destinatario: 'Junta Médica Oficial do DF - JMO',
    servidor: 'Ana Paula Souza (Mat. 234.567-8)',
    validade: '27/07/2026 (Expirado)',
    status: 'Expirado',
    justificativa: 'Averbação de Licença para Tratamento de Saúde',
  },
];

export async function GET() {
  return NextResponse.json(ENC_CAMINHAMENTOS);
}
