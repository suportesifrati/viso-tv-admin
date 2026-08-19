# VISO TV Admin v7.2 - Vercel

Versao de producao preparada para Vercel.

## Estrutura

- `index.html` + `assets/`: frontend
- `api/`: Vercel Functions
- `dist/`: gerado automaticamente pelo Vite durante o deploy
- `vercel.json`: build explicito para evitar que a Vercel trate a raiz como um servidor Node

## Deploy na Vercel

### Configuracao do projeto

No projeto da Vercel use:

- Framework Preset: `Vite`
- Root Directory: pasta que contem este `package.json`
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

Nao configure `server.js`, `app.js` ou outro entrypoint na raiz.

### Environment Variables

Cadastre em Settings > Environment Variables:

- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT`
- `R2_BUCKET`
- `R2_PUBLIC_URL`
- `FIREBASE_API_KEY`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_MAIN_ADMIN`

Valores nao secretos ja usados no projeto:

- R2_ENDPOINT: `https://2c5a560f4e2c2320108dd2482cb218f3.r2.cloudflarestorage.com`
- R2_BUCKET: `viso-tv-media`
- R2_PUBLIC_URL: `https://pub-3c0b730d19464c528451d032d07ff91e.r2.dev`
- FIREBASE_PROJECT_ID: `viso-hotel-tv`
- FIREBASE_MAIN_ADMIN: `ti@sifracontabilidade.com`

Nao publique o `R2_SECRET_ACCESS_KEY`.

## Cloudflare R2 CORS

Depois do primeiro deploy, adicione a URL final da Vercel em `AllowedOrigins` do bucket.

Exemplo:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "https://SEU-PROJETO.vercel.app"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD", "DELETE"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

## Teste apos deploy

Abra:

`https://SEU-PROJETO.vercel.app/api/health`

Resposta esperada:

```json
{
  "ok": true,
  "storage": "Cloudflare R2",
  "bucket": "viso-tv-media",
  "environment": "production"
}
```

Depois teste login, upload R2, criacao de playlist, Ultima Hora e usuarios.
