# VISO TV Admin v7.1 - Produção Vercel

Esta versão substitui o servidor Express local por Vercel Functions.

## O que mudou
- Frontend estático na raiz (`index.html` + `assets/`).
- API server-side em `api/`.
- Segredos do R2 ficam somente em Environment Variables da Vercel.
- Upload continua direto do navegador para o R2 com URL pré-assinada.
- Criação de usuários passa por `/api/users-create` e exige o token do admin principal.
- Não existe mais `server/server.js` nem necessidade de `npm start` em produção.

## Variáveis de ambiente na Vercel
Configure em Project > Settings > Environment Variables:

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT`
- `R2_BUCKET`
- `R2_PUBLIC_URL`
- `FIREBASE_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_MAIN_ADMIN`

Nunca prefixe segredos com `NEXT_PUBLIC_`.

## Deploy recomendado
1. Crie um repositório Git e envie esta pasta.
2. Importe o repositório no Vercel.
3. Adicione as Environment Variables.
4. Faça o primeiro deploy.
5. Copie a URL de produção, por exemplo `https://viso-tv-admin.vercel.app`.
6. No Cloudflare R2 > `viso-tv-media` > CORS, adicione essa origem exata.

Exemplo em `r2-cors-policy.production.example.json`.

## Teste depois do deploy
- Login Firebase
- Dashboard
- `/api/health`
- Upload de imagem
- Upload de MP4
- Criação de playlist
- Drag & drop
- Última Hora
- Criação de usuário pelo admin principal

## Desenvolvimento local com Vercel CLI
Use `vercel dev` para executar o frontend e as Functions localmente. O Live Server não executa `/api/*`.

## Firestore
Publique `firestore.rules` caso ainda não tenha publicado a versão da V7.
