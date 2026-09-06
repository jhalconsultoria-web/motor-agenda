import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { assinarToken } from "../utils/jwt";

export const authRoutes = Router();

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

authRoutes.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ erro: "Email e senha são obrigatórios" });
  }

  const { email, senha } = parsed.data;
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario || !usuario.ativo || !(await bcrypt.compare(senha, usuario.senhaHash))) {
    return res.status(401).json({ erro: "Email ou senha incorretos" });
  }

  const token = assinarToken({
    usuarioId: usuario.id,
    empresaId: usuario.empresaId,
    papel: usuario.papel as "ADMIN" | "PROFISSIONAL",
  });

  const empresa = await prisma.empresa.findUnique({ where: { id: usuario.empresaId } });

  res.json({
    token,
    usuario: { id: usuario.id, nome: usuario.nome, papel: usuario.papel },
    empresa: { id: empresa!.id, nome: empresa!.nome, slug: empresa!.slug, corPrimaria: empresa!.corPrimaria },
  });
});
