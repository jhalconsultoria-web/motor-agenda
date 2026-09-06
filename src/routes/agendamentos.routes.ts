import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";
import { existeConflito, calcularHoraFim } from "../services/agendaService";
import { buscarOuCriarCreditoDisponivel, consumirCredito } from "../services/creditoService";

export const agendamentosRoutes = Router();
agendamentosRoutes.use(requireAuth);

const criarSchema = z.object({
  clienteId: z.string().min(1),
  profissionalId: z.string().min(1),
  servicoId: z.string().min(1),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  observacoes: z.string().optional(),
});

agendamentosRoutes.get("/", async (req, res) => {
  const { dataInicio, dataFim, profissionalId, status } = req.query as Record<string, string | undefined>;

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      empresaId: req.auth!.empresaId,
      ...(profissionalId ? { profissionalId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(dataInicio || dataFim
        ? { data: { gte: dataInicio ?? "0000-00-00", lte: dataFim ?? "9999-99-99" } }
        : {}),
    },
    include: { cliente: true, profissional: { select: { nome: true } }, servico: true },
    orderBy: [{ data: "asc" }, { horaInicio: "asc" }],
  });

  res.json(agendamentos);
});

agendamentosRoutes.post("/", async (req, res) => {
  const parsed = criarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: parsed.error.issues[0].message });
  const dados = parsed.data;

  const servico = await prisma.servico.findFirst({
    where: { id: dados.servicoId, empresaId: req.auth!.empresaId, ativo: true },
  });
  if (!servico) return res.status(404).json({ erro: "Serviço não encontrado" });

  const horaFim = calcularHoraFim(dados.horaInicio, servico.duracaoMinutos);

  const conflito = await existeConflito({
    empresaId: req.auth!.empresaId,
    profissionalId: dados.profissionalId,
    data: dados.data,
    horaInicio: dados.horaInicio,
    horaFim,
  });
  if (conflito) return res.status(409).json({ erro: "Horário não disponível para este profissional" });

  const credito = await buscarOuCriarCreditoDisponivel(dados.clienteId, dados.servicoId);

  const agendamento = await prisma.agendamento.create({
    data: {
      empresaId: req.auth!.empresaId,
      clienteId: dados.clienteId,
      profissionalId: dados.profissionalId,
      servicoId: dados.servicoId,
      data: dados.data,
      horaInicio: dados.horaInicio,
      horaFim,
      observacoes: dados.observacoes,
      valorCobrado: credito ? 0 : servico.preco,
      origemCredito: Boolean(credito),
    },
  });

  if (credito) await consumirCredito(credito.id);

  res.status(201).json(agendamento);
});

agendamentosRoutes.patch("/:id/status", async (req, res) => {
  const { status } = req.body as { status: string };
  const validos = ["AGENDADO", "CONFIRMADO", "REALIZADO", "CANCELADO", "NAO_COMPARECEU"];
  if (!validos.includes(status)) return res.status(400).json({ erro: "Status inválido" });

  const { count } = await prisma.agendamento.updateMany({
    where: { id: req.params.id, empresaId: req.auth!.empresaId },
    data: { status: status as any },
  });
  if (count === 0) return res.status(404).json({ erro: "Agendamento não encontrado" });

  res.json(await prisma.agendamento.findUnique({ where: { id: req.params.id } }));
});
