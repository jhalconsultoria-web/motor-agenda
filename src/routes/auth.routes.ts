import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../db";
import { assinarToken } from "../utils/jwt";

export const authRoutes = Router();

function paraSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function gerarSlugUnico(base: string): Promise<string> {
  const slugBase = paraSlug(base) || "negocio";
  let slug = slugBase;
  let contador = 1;
  while (await prisma.empresa.findUnique({ where: { slug } })) {
    contador++;
    slug = `${slugBase}-${contador}`;
  }
  return slug;
}

async function respostaDeSessao(usuario: { id: string; nome: string; papel: string; empresaId: string }) {
  const empresa = await prisma.empresa.findUnique({ where: { id: usuario.empresaId } });
  const token = assinarToken({
    usuarioId: usuario.id,
    empresaId: usuario.empresaId,
    papel: usuario.papel as "ADMIN" | "PROFISSIONAL",
  });
  return {
    token,
    usuario: { id: usuario.id, nome: usuario.nome, papel: usuario.papel },
    empresa: { id: empresa!.id, nome: empresa!.nome, slug: empresa!.slug, corPrimaria: empresa!.corPrimaria, logoUrl: empresa!.logoUrl },
  };
}

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

  res.json(await respostaDeSessao(usuario));
});

const registrarSchema = z.object({
  nomeEmpresa: z.string().min(2, "Nome do negócio é obrigatório"),
  corPrimaria: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default("#1F8F63"),
  logoUrl: z.string().optional(),
  nomeAdmin: z.string().min(2, "Seu nome é obrigatório"),
  email: z.string().email(),
  senha: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

// Cadastro self-service: dono cria a própria empresa e já sai logado no painel,
// sem precisar de ninguém mexendo no banco manualmente.
authRoutes.post("/registrar", async (req, res) => {
  const parsed = registrarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: parsed.error.issues[0].message });
  const dados = parsed.data;

  const emailExistente = await prisma.usuario.findUnique({ where: { email: dados.email } });
  if (emailExistente) return res.status(409).json({ erro: "Já existe uma conta com esse email" });

  const slug = await gerarSlugUnico(dados.nomeEmpresa);

  const empresa = await prisma.empresa.create({
    data: { nome: dados.nomeEmpresa, slug, corPrimaria: dados.corPrimaria, logoUrl: dados.logoUrl },
  });

  const usuario = await prisma.usuario.create({
    data: {
      empresaId: empresa.id,
      nome: dados.nomeAdmin,
      email: dados.email,
      senhaHash: await bcrypt.hash(dados.senha, 10),
      papel: "ADMIN",
    },
  });

  res.status(201).json(await respostaDeSessao(usuario));
});
