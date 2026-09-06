import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const profissionaisRoutes = Router();
profissionaisRoutes.use(requireAuth);

const profissionalSchema = z.object({
  nome: z.string().min(1),
  email: z.string().email(),
  senha: z.string().min(6),
  papel: z.enum(["ADMIN", "PROFISSIONAL"]).default("PROFISSIONAL"),
  especialidades: z.string().optional(),
  horarioInicio: z.string().default("08:00"),
  horarioFim: z.string().default("18:00"),
  diasTrabalho: z.string().default("1,2,3,4,5,6"),
});

profissionaisRoutes.get("/", async (req, res) => {
  const profissionais = await prisma.usuario.findMany({
    where: { empresaId: req.auth!.empresaId },
    select: {
      id: true,
      nome: true,
      email: true,
      papel: true,
      especialidades: true,
      horarioInicio: true,
      horarioFim: true,
      diasTrabalho: true,
      ativo: true,
    },
    orderBy: { nome: "asc" },
  });
  res.json(profissionais);
});

profissionaisRoutes.post("/", requireAdmin, async (req, res) => {
  const parsed = profissionalSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: parsed.error.issues[0].message });

  const jaExiste = await prisma.usuario.findUnique({ where: { email: parsed.data.email } });
  if (jaExiste) return res.status(409).json({ erro: "Email já cadastrado no sistema" });

  const { senha, ...dados } = parsed.data;
  const usuario = await prisma.usuario.create({
    data: { ...dados, senhaHash: await bcrypt.hash(senha, 10), empresaId: req.auth!.empresaId },
  });

  res.status(201).json({ id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel });
});

profissionaisRoutes.patch("/:id/ativo", requireAdmin, async (req, res) => {
  const { ativo } = req.body as { ativo: boolean };
  const { count } = await prisma.usuario.updateMany({
    where: { id: req.params.id, empresaId: req.auth!.empresaId },
    data: { ativo: Boolean(ativo) },
  });
  if (count === 0) return res.status(404).json({ erro: "Profissional não encontrado" });
  res.status(204).send();
});
