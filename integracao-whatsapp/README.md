# IA no WhatsApp — integração via n8n + Evolution

Este workflow conecta o WhatsApp de cada empresa ao Motor de Agenda: quando um
cliente manda mensagem, uma IA responde, consulta a agenda e cria o
agendamento — usando as mesmas rotas públicas (`/api/public/:slug/...`) que
o mini-site usa.

**Importante, com honestidade:** montei este workflow manualmente seguindo o
formato de export do n8n, mas não tenho como testar contra uma instância real
de n8n/Evolution/Claude aqui (são serviços externos, na sua infraestrutura).
Ele deve importar direto, mas se algum nó (principalmente os de IA/LangChain,
que o n8n atualiza com frequência) vier com aviso de versão, clique nele —
o n8n oferece atualizar automaticamente. Se algo não importar, a seção
"Nó por nó" abaixo te dá tudo pra remontar manualmente em poucos minutos.

## Convenção importante

**O nome da instância Evolution de cada empresa deve ser igual ao `slug`
dela no Motor de Agenda** (ex: instância `barbearia-do-joao` para a
Barbearia do João). É assim que o workflow sabe qual empresa é qual, sem
precisar de uma tabela de mapeamento separada — o campo `instance` que a
Evolution manda no webhook já resolve isso.

## Passo a passo

1. **Importe o arquivo** `workflow-whatsapp-ia.json` no n8n (Workflows → Import from File).
2. **Edite as duas constantes** no node "Extrair dados da mensagem" (`BASE_URL` e `EVOLUTION_URL`) pra apontar pro seu backend e sua instância Evolution reais.
3. **Crie as credenciais** que o workflow espera:
   - **Anthropic account** (ou troque o node "Claude" por OpenAI, se preferir) — usada pelo Agente.
   - **Evolution API** (tipo "Header Auth"), com header `apikey` = sua chave da Evolution — usada no node "Responder no WhatsApp".
4. **Ative o webhook** e configure a Evolution API pra apontar o webhook da instância pra URL gerada pelo n8n (`.../webhook/whatsapp-inbound`).
5. Mande uma mensagem de teste pro número conectado e acompanhe a execução na aba "Executions" do n8n.

## Nó por nó (caso precise remontar manualmente)

| Nó | Tipo | Função |
|---|---|---|
| Webhook Evolution | Webhook | Recebe o POST que a Evolution manda a cada mensagem |
| Extrair dados da mensagem | Code | Lê `instance` (→ slug), telefone do remetente, texto da mensagem, e se foi a própria empresa que mandou (`fromMe`) |
| Ignorar mensagens vazias ou da própria empresa | IF | Corta o fluxo se `fromMe` for true ou o texto vier vazio (evita loop e mensagens de mídia sem texto) |
| Agente de agendamento | AI Agent | Recebe o texto, decide o que fazer usando as ferramentas abaixo |
| Claude | Chat Model (sub-node do Agente) | O LLM que o agente usa pra raciocinar |
| Memória da conversa | Buffer Memory (sub-node do Agente) | Mantém contexto por conversa, com chave `slug + telefone` |
| listar_servicos | Tool (HTTP GET) | `/api/public/:slug/servicos` |
| listar_profissionais | Tool (HTTP GET) | `/api/public/:slug/profissionais` |
| ver_horarios_livres | Tool (HTTP GET) | `/api/public/:slug/horarios-disponiveis` — parâmetros preenchidos pela IA |
| criar_agendamento | Tool (HTTP POST) | `/api/public/:slug/agendamentos` — o telefone do cliente vem do dado real extraído da mensagem, não da IA, pra evitar erro |
| Responder no WhatsApp | HTTP Request | Envia a resposta do agente de volta pro cliente via Evolution |

## Limitações desta primeira versão (próximos incrementos)

- Só trata **mensagem de texto**. Áudio precisaria de um passo de transcrição antes do Agente (a própria Evolution ou um node de speech-to-text).
- Não decide sozinho **cancelamento/remarcação** — só criação de agendamento. Dá pra estender com mais uma tool chamando `PATCH /api/agendamentos/:id/status` (essa é uma rota autenticada, então precisaria de um token de serviço, não do fluxo público).
- Risco de banimento de número por uso de API não-oficial (Evolution) continua valendo — o que já conversamos antes sobre volume de mensagens e aquecimento de número se aplica aqui.
