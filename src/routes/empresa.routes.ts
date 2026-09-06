import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";

export const empresaRoutes = Router();
empresaRoutes.use(requireAuth);

empresaRoutes.get("/", async (req, res) => {
  const empresa = await prisma.empresa.findUnique({ where: { id: req.auth!.empresaId } });
  res.json(empresa);
});

const atualizarSchema = z.object({
  nome: z.string().min(2).optional(),
  corPrimaria: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  logoUrl: z.string().nullable().optional(),
  whatsappNumero: z.string().nullable().optional(),
});

empresaRoutes.patch("/", requireAdmin, async (req, res) => {
  const parsed = atualizarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: parsed.error.issues[0].message });

  const empresa = await prisma.empresa.update({
    where: { id: req.auth!.empresaId },
    data: parsed.data,
  });

  res.json(empresa);
});
