import { Resend } from 'resend';

type PasswordSetupEmail = {
  recipient: string;
  recipientName: string;
  resetUrl: string;
};

type SignatureRequestEmail = {
  recipient: string;
  recipientName: string;
  documentTitle: string;
  signatureUrl: string;
  expiresAt: Date;
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character];
  });
}

export async function sendPasswordSetupEmail({
  recipient,
  recipientName,
  resetUrl,
}: PasswordSetupEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error('O serviço de e-mail não está configurado.');
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [recipient],
    subject: 'SADPF — defina sua senha de acesso',
    html: `
      <p>Olá, ${escapeHtml(recipientName)}.</p>
      <p>Para acessar o SADPF pela primeira vez, defina sua senha no link abaixo.</p>
      <p><a href="${resetUrl}">Definir minha senha</a></p>
      <p>Este link expira em 15 minutos e só pode ser usado uma vez.</p>
      <p>Se você não solicitou este acesso, ignore esta mensagem.</p>
    `,
  });

  if (error) {
    console.error('[email] Falha ao enviar mensagem:', error);
    throw new Error('Não foi possível enviar o e-mail de primeiro acesso.');
  }
}

export async function sendSignatureRequestEmail({
  recipient,
  recipientName,
  documentTitle,
  signatureUrl,
  expiresAt,
}: SignatureRequestEmail): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    throw new Error('O serviço de e-mail não está configurado.');
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from,
    to: [recipient],
    subject: 'SADPF — assinatura eletrônica solicitada',
    html: `
      <p>Olá, ${escapeHtml(recipientName)}.</p>
      <p>Há uma solicitação de assinatura eletrônica interna para o documento <strong>${escapeHtml(
        documentTitle
      )}</strong>.</p>
      <p><a href="${signatureUrl}">Revisar e assinar o documento</a></p>
      <p>Este link é pessoal, expira em ${expiresAt.toLocaleString(
        'pt-BR'
      )} e pode ser usado uma única vez.</p>
      <p>Se você não reconhece esta solicitação, ignore esta mensagem.</p>
    `,
  });

  if (error) {
    console.error('[email] Falha ao enviar solicitação de assinatura:', error);
    throw new Error('Não foi possível enviar a solicitação de assinatura por e-mail.');
  }
}
