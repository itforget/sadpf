# Subcategorias documentais — SSP-DF

## Escopo

Implementa o campo **Subcategoria** no anexo e na edição de PDFs, respeitando a categoria selecionada. A fonte é o documento `2 Classificacao_Documentos_Arquivo_Digital_SSPDF_atualizada.docx` fornecido pelo responsável pelo projeto. O arquivo original não é publicado no repositório.

O catálogo em `lib/documentos.ts` reproduz a grafia do original, inclusive pontuação e eventuais erros de digitação. A fixture de teste foi extraída dos parágrafos do DOCX para comparação integral:

- Documentos Pessoais: 15 subcategorias.
- Publicações: 25 subcategorias.
- Certidões/Declarações: 8 subcategorias.
- Processos: 18 subcategorias.
- Outros: sem subitens na referência.
- Pasta Física Digitalizada e Posse Eletrônica: categorias existentes preservadas, sem subitens inventados.

Total: 66 subcategorias. O campo é obrigatório nos novos anexos e edições das quatro categorias com subitens. A troca de categoria limpa a subcategoria anterior. O servidor rejeita combinações incompatíveis no upload multipart, preparação/confirmacão do upload direto e PATCH.

A subcategoria é persistida e exibida nos cartões da pasta e no detalhe do PDF, e participa da busca por texto da pasta. PDFs antigos permanecem acessíveis, sem classificação artificial ou alteração dos arquivos. A edição de um documento antigo em categoria com subitens exige escolher uma subcategoria antes de salvar.

## Aplicação e segurança

1. Fazer backup do banco e preservar o artefato anterior conforme o procedimento da instalação.
2. **Aplicar a migração antes de iniciar o código novo.** A migração `20261109120000_add_documento_subcategoria` apenas acrescenta uma coluna TEXT opcional a `documentos_pdf`, sem reescrever PDFs ou atribuir valores aos registros existentes.
3. Se a instalação usa histórico Prisma íntegro, executar `npx prisma migrate deploy`. Se ela usa `db push` ou tem histórico divergente, revisar/baselinar o histórico antes; não executar `migrate reset` em produção. A alteração SQL isolada está no arquivo da migração e deve ser aplicada uma única vez por quem administra o banco.
4. Gerar o Prisma Client e executar o build/deploy pelo fluxo existente.
5. Verificar um anexo novo, sua leitura após recarregar, edição e compatibilidade de um PDF anterior usando conta autorizada e documento de teste sem dados pessoais.

**Rollback:** retornar ao commit anterior da aplicação e manter a coluna opcional. Isso preserva as classificações já gravadas e é compatível com o código antigo. Não apagar a coluna nem os arquivos para reverter a aplicação.

## Testes reproduzíveis

```sh
npm ci
npm run prisma:generate
npm test
npm run lint
npm run type-check
npm run build
```

Integração: usar exclusivamente um PostgreSQL descartável em `localhost`/`127.0.0.1`, com nome terminado em `_test`. Os scripts recusam outros destinos. Nunca apontar estes testes para a instalação da SSP-DF.

```sh
# DATABASE_URL deve apontar ao banco descartável; aplicar o schema nesse banco.
npm run test:integration

# Com o servidor local já em execução em http://localhost:3097:
node --import tsx tests/subcategorias.http.ts
```

O teste HTTP cria uma pessoa fictícia, autentica de verdade, envia um PDF gerado para o teste, compara o download byte a byte, verifica edição/readback, recusa de classificação incompatível e anexo legado. Remove seus documentos/usuário ao terminar. `SADPF_TEST_STATE` é uma opção de diagnóstico local para reter a sessão fictícia durante a inspeção no navegador; o arquivo contém cookie de teste e não deve ser versionado.

Com `STORAGE_PROVIDER=local`, a preparação de upload direto é bloqueada pelo comportamento existente do sistema (409); o teste registra isso explicitamente. Os schemas de assinatura/confirmação são testados, mas **a integração com um serviço Supabase real não é comprovada por esses testes locais**. Nenhuma credencial, banco, pessoa, PDF ou instalação de produção é usado.
