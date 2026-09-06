# Motor de Agenda

Motor de agendamento multi-tenant: um único backend serve vários negócios
(barbearia, petshop, etc.), cada um isolado por `empresaId`, cada um com
sua própria marca, serviços, profissionais e clientes.

## Rodando local

```bash
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Backend sobe em `http://localhost:3333`.

### Painel do dono (frontend)

```bash
cd web
npm install
npm run dev
```

Sobe em `http://localhost:5173`. Precisa do backend rodando junto.

### Mini-site do cliente final

```bash
cd site-cliente
npm install
npm run dev
```

Sobe em `http://localhost:5174/<slug-da-empresa>` (ex: `/barbearia-do-joao` ou `/amigo-fiel`).
Em produção cada empresa teria seu próprio subdomínio/link; aqui o slug na URL faz esse papel.

## Contas de teste (criadas pelo seed)

| Empresa | Email | Senha |
|---|---|---|
| Barbearia do João | joao@barbeariadojoao.com.br | demo123 |
| Petshop Amigo Fiel | marcia@amigofiel.com.br | demo123 |

## Rotas principais

**Autenticadas (dono/profissional, `Authorization: Bearer <token>`)**
- `POST /api/auth/login`
- `GET/POST/PUT /api/servicos`, `PATCH /api/servicos/:id/ativo`
- `GET/POST /api/profissionais`, `PATCH /api/profissionais/:id/ativo`
- `GET/POST /api/clientes`, `GET /api/clientes/:id`
- `GET/POST /api/agendamentos`, `PATCH /api/agendamentos/:id/status`
- `GET/POST /api/planos`, `POST /api/planos/assinar`

**Públicas (cliente final, sem login, resolvidas pelo slug da empresa)**
- `GET /api/public/:slug/empresa`
- `GET /api/public/:slug/servicos`
- `GET /api/public/:slug/profissionais`
- `GET /api/public/:slug/horarios-disponiveis?profissionalId=&servicoId=&data=`
- `POST /api/public/:slug/agendamentos`

## O que já funciona

- Isolamento real entre empresas (toda query filtra por `empresaId` vindo do token, nunca do cliente)
- Verificação de conflito de horário por profissional
- Cálculo de horários livres a partir do expediente de cada profissional
- Assinatura do cliente final: se ele tem plano ativo cobrindo o serviço, o agendamento consome crédito em vez de cobrar avulso
- Cobrança real via Asaas: Pix avulso na hora do agendamento, assinatura recorrente (Pix Automático ou cartão) ao assinar um plano, e webhook que marca pagamento como confirmado
- Suíte de smoke test (`npm run smoke`, com o servidor rodando) validando isolamento, conflito, consumo de crédito e cobrança

## Integração com WhatsApp

Workflow de n8n + Evolution API + IA em [integracao-whatsapp/](integracao-whatsapp/) —
importável, com guia de configuração nó por nó.

## Pagamento (Asaas)

Sem `ASAAS_API_KEY` no `.env`, o motor roda em **modo simulado**: gera
código Pix e assinatura com formato idêntico ao real, mas sem cobrar
ninguém — é assim que testei e validei o fluxo inteiro aqui. Pra cobrar de
verdade:

1. Crie uma conta na Asaas (tem sandbox gratuito pra testar antes de produção)
2. Preencha no `.env`: `ASAAS_API_KEY`, `ASAAS_BASE_URL` (sandbox ou produção) e `ASAAS_WEBHOOK_TOKEN` (um token seu, qualquer string)
3. Configure em Asaas → Integrações → Webhooks a URL `https://<seu-backend>/api/webhooks/asaas` com o mesmo token no header `asaas-access-token`

Rotas:
- `POST /api/planos/assinar` agora exige `cpfCnpj` no corpo e retorna `modoSimulado: true/false`
- `POST /api/public/:slug/agendamentos` (avulso, sem crédito) já devolve `cobranca.pixCopiaCola` pronto pra mostrar/copiar
- `POST /api/webhooks/asaas` recebe a confirmação e marca `Agendamento.statusPagamento = "PAGO"`

**Limitação conhecida:** cobrança avulsa via Pix hoje cria o cliente na Asaas
sem CPF (só nome e telefone). Se a conta Asaas em uso exigir CPF mesmo para
Pix avulso, isso vai dar erro — nesse caso, o formulário do mini-site/WhatsApp
precisa coletar o CPF antes de chegar nessa chamada.

## O que falta (próximos passos, fora do escopo deste motor)

- Troca de SQLite por Postgres em produção (só mudar `provider` e `DATABASE_URL` no `.env`/`schema.prisma`)
- Cobrança recorrente real precisa de um job periódico (cron) verificando `AssinaturaCliente.proximaCobrancaEm` — hoje a recorrência em si é feita pela Asaas (ela cobra sozinha nos ciclos), mas nada aqui ainda reage a uma cobrança que falhou (inadimplência)
