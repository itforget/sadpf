import {
  assinarEletronicamente,
  getAssinaturaEletronica,
} from '@/lib/server/repositories/assinatura';

export type PublicSignatureVerification = {
  token: string;
  documento: { titulo: string };
  servidor: { nome: string; matricula: string };
  assinadoEm: Date | null;
  dataExpiracao: Date;
  status: 'signed' | 'pending' | 'expired' | 'invalid';
};

export async function getSigningRequest(token: string) {
  return getAssinaturaEletronica(token);
}

export async function getPublicVerification(token: string): Promise<PublicSignatureVerification> {
  const assinatura = await getAssinaturaEletronica(token);
  if (!assinatura) {
    return {
      token,
      documento: { titulo: '' },
      servidor: { nome: '', matricula: '' },
      assinadoEm: null,
      dataExpiracao: new Date(0),
      status: 'invalid',
    };
  }
  const status = assinatura.assinadoEm
    ? 'signed'
    : assinatura.dataExpiracao <= new Date()
    ? 'expired'
    : 'pending';
  return {
    token: assinatura.token,
    documento: { titulo: assinatura.documento.titulo },
    servidor: assinatura.servidor,
    assinadoEm: assinatura.assinadoEm,
    dataExpiracao: assinatura.dataExpiracao,
    status,
  };
}

export async function signSignature(token: string, cpf: string, ip: string) {
  return assinarEletronicamente(token, cpf, ip);
}
