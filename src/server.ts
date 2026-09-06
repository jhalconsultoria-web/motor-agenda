import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRoutes } from "./routes/auth.routes";
import { servicosRoutes } from "./routes/servicos.routes";
import { profissionaisRoutes } from "./routes/profissionais.routes";
import { clientesRoutes } from "./routes/clientes.routes";
import { agendamentosRoutes } from "./routes/agendamentos.routes";
import { planosRoutes } from "./routes/planos.routes";
import { publicRoutes } from "./routes/public.routes";
import { webhooksRoutes } from "./routes/webhooks.routes";

const app = express();

// Sem CORS_ORIGINS definido, libera geral — cômodo pra rodar local.
// Em produção, defina com os domínios reais do painel e do mini-site,
// separados por vírgula.
const origensPermitidas = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim());
app.use(cors(origensPermitidas ? { origin: origensPermitidas } : {}));
app.use(express.json());

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/auth", authRoutes);
app.use("/api/servicos", servicosRoutes);
app.use("/api/profissionais", profissionaisRoutes);
app.use("/api/clientes", clientesRoutes);
app.use("/api/agendamentos", agendamentosRoutes);
app.use("/api/planos", planosRoutes);
app.use("/api/public", publicRoutes);
app.use("/api/webhooks", webhooksRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ erro: "Erro interno do servidor" });
});

const port = Number(process.env.PORT) || 3333;
app.listen(port, () => console.log(`Motor de agenda rodando em http://localhost:${port}`));
