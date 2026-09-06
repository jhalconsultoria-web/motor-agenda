import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";

export const clientesRoutes = Router();
clientesRoutes.use(requireAuth);

const clienteSchema = z.object({
  nome: z.string().min(1),
  telefone: z.string().min(8),
  email: z.string().email().optional(),
});

clientesRoutes.get("/", async (req, res) => {
  const busca = (req.query.busca as string | undefined)?.trim();
  const clientes = await prisma.cliente.findMany({
    where: {
      empresaId: req.auth!.empresaId,
      ...(busca
        ? { OR: [{ nome: { contains: busca } }, { telefone: { contains: busca } }] }
        : {}),
    },
    orderBy: { nome: "asc" },
  });
  res.json(clientes);
});

clientesRoutes.get("/:id", async (req, res) => {
  const cliente = await prisma.cliente.findFirst({
    where: { id: req.params.id, empresaId: req.auth!.empresaId },
    include: {
      agendamentos: { orderBy: { data: "desc" }, include: { servico: true, profissional: true } },
      assinaturas: { include: { plano: true }, where: { status: "ATIVA" } },
    },
  });
  if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado" });
  res.json(cliente);
});

clientesRoutes.post("/", async (req, res) => {
  const parsed = clienteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: parsed.error.issues[0].message });

  const jaExiste = await prisma.cliente.findUnique({
    where: { empresaId_telefone: { empresaId: req.auth!.empresaId, telefone: parsed.data.telefone } },
  });
  if (jaExiste) return res.status(409).json({ erro: "Já existe cliente com esse telefone" });

  const cliente = await prisma.cliente.create({ data: { ...parsed.data, empresaId: req.auth!.empresaId } });
  res.status(201).json(cliente);
});
