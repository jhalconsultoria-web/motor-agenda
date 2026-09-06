# Como colocar no ar para demonstração

Este guia é pra deixar as três partes (backend, painel do dono, mini-site do
cliente) acessíveis por link, de graça, pra mostrar pra prospects. **Não é**
o setup de produção definitivo — pra isso, ver a seção final.

## Antes de começar

Este projeto roda em SQLite (arquivo local). Nos serviços gratuitos abaixo,
o disco **não é permanente entre deploys** — se você redeploy o backend do
zero (ou trocar de host), o arquivo do banco se perde. Dentro do mesmo
deploy, porém, os dados ficam: o seed só popula os negócios de exemplo na
primeiríssima vez que o banco está vazio, e nunca apaga nada depois disso —
então cadastros reais feitos pela tela de "Criar conta" sobrevivem a
reinícios normais do servidor. Quando tiver cliente pagante de verdade,
mesmo assim vale trocar por um banco Postgres permanente (documentado no
fim deste arquivo), justamente pra não depender do disco do host.

## Passo 1 — Colocar o código no GitHub

1. Crie uma conta em [github.com](https://github.com) se ainda não tiver.
2. Clique em **New repository** (botão verde). Nome sugerido: `motor-agenda`. Deixe **privado** por enquanto. Não marque nenhuma opção de criar README/gitignore (o projeto já tem).
3. Copie a URL que o GitHub mostrar (algo como `https://github.com/seu-usuario/motor-agenda.git`).
4. Me manda essa URL que eu subo o código pra lá.

## Passo 2 — Backend no Render

1. Crie uma conta em [render.com](https://render.com) (dá pra entrar direto com GitHub).
2. **New** → **Web Service** → conecte o repositório `motor-agenda`.
3. Configure:
   - **Root Directory**: deixe em branco (é a raiz do repo)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
4. Em **Environment Variables**, adicione:
   - `DATABASE_URL` = `file:./dev.db`
   - `JWT_SECRET` = qualquer texto longo e aleatório (ex: gere em [1password.com/password-generator](https://1password.com/password-generator))
   - `CORS_ORIGINS` = deixe em branco por enquanto (volta aqui depois do Passo 3)
5. Clique em **Create Web Service**. Espera o build (uns minutos). No final, o Render te dá uma URL tipo `https://motor-agenda.onrender.com` — **guarda essa URL**.
6. Teste: abra `https://motor-agenda.onrender.com/api/health` no navegador — se aparecer `{"ok":true}`, funcionou.

**Sobre o plano free do Render:** ele "dorme" depois de um tempo sem uso, e demora uns 30-50 segundos pra "acordar" na primeira visita depois disso. Avise quem for ver a demo, ou simplesmente acesse o link 1 minuto antes de mostrar pra alguém.

## Passo 3 — Painel do dono e mini-site na Vercel

1. Crie uma conta em [vercel.com](https://vercel.com) (com GitHub).
2. **Add New** → **Project** → escolha o repositório `motor-agenda`.
3. Antes de importar, configure:
   - **Root Directory**: `web`
   - **Environment Variables**: `VITE_API_URL` = a URL do Render do Passo 2 (ex: `https://motor-agenda.onrender.com`)
4. Deploy. Anota a URL que a Vercel gerar (ex: `https://motor-agenda-painel.vercel.app`).
5. Repita o processo criando um **segundo projeto** na Vercel, mesmo repositório, mas:
   - **Root Directory**: `site-cliente`
   - Mesma variável `VITE_API_URL`
6. Anota essa segunda URL também (ex: `https://motor-agenda-cliente.vercel.app`).

## Passo 4 — Fechar o CORS

Volta no Render → seu serviço → Environment → edite `CORS_ORIGINS` com as duas URLs da Vercel separadas por vírgula:

```
https://motor-agenda-painel.vercel.app,https://motor-agenda-cliente.vercel.app
```

Salve — o Render reinicia o serviço sozinho.

## Testando a demo

- **Painel do dono**: `https://motor-agenda-painel.vercel.app` → login `joao@barbeariadojoao.com.br` / `demo123`
- **Mini-site do cliente**: `https://motor-agenda-cliente.vercel.app/barbearia-do-joao`

## Quando for além da demo (cliente pagante de verdade)

Nesse momento, trocar:
1. **Banco de dados**: Postgres permanente (Neon ou Supabase têm plano free) — muda só `provider` em `prisma/schema.prisma` de `sqlite` pra `postgresql`, `DATABASE_URL` no Render, e regenera a migration inicial.
2. **Start command**: tirar o `tsx prisma/seed.ts` do `npm start` (ele existe só pra manter a demo sempre limpa — com cliente de verdade, ninguém quer que o banco reinicie sozinho).
3. **Render**: subir de plano free pro pago (o free dorme, o que não serve pra um sistema que clientes de verdade usam todo dia).
4. **Domínio próprio**: apontar um domínio seu pras URLs da Vercel/Render, em vez de usar os subdomínios gratuitos.
