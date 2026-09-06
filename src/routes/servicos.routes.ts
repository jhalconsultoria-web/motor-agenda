import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const servicosRoutes = Router();
servicosRoutes.use(requireAuth);

const servicoSchema = z.object({
  nome: z.string().min(1),
  categoria: z.string().default("Geral"),
  duracaoMinutos: z.number().int().positive(),
  preco: z.number().nonnegative(),
});

servicosRoutes.get("/", async (req, res) => {
  const servicos = await prisma.servico.findMany({
    where: { empresaId: req.auth!.empresaId },
    orderBy: { nome: "asc" },
  });
  res.json(servicos);
});

servicosRoutes.post("/", requireAdmin, async (req, res) => {
  const parsed = servicoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: parsed.error.issues[0].message });

  const servico = await prisma.servico.create({
    data: { ...parsed.data, empresaId: req.auth!.empresaId },
  });
  res.status(201).json(servico);
});

servicosRoutes.put("/:id", requireAdmin, async (req, res) => {
  const parsed = servicoSchema.partial().safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: parsed.error.issues[0].message });

  const { count } = await prisma.servico.updateMany({
    where: { id: req.params.id, empresaId: req.auth!.empresaId },
    data: parsed.data,
  });
  if (count === 0) return res.status(404).json({ erro: "Serviço não encontrado" });

  res.json(await prisma.servico.findUnique({ where: { id: req.params.id } }));
});

servicosRoutes.patch("/:id/ativo", requireAdmin, async (req, res) => {
  const { ativo } = req.body as { ativo: boolean };
  const { count } = await prisma.servico.updateMany({
    where: { id: req.params.id, empresaId: req.auth!.empresaId },
    data: { ativo: Boolean(ativo) },
  });
  if (count === 0) return res.status(404).json({ erro: "Serviço não encontrado" });
  res.status(204).send();
});
