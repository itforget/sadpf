import RedefinirSenhaForm from './redefinir-senha-form';

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return <RedefinirSenhaForm token={token ?? ''} />;
}
