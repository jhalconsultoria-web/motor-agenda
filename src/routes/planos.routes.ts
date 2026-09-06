import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { criarOuBuscarCliente, criarAssinaturaRecorrente, asaasEmModoSimulado } from "../services/asaasClient";

export const planosRoutes = Router();
planosRoutes.use(requireAuth);

const planoSchema = z.object({
  nome: z.string().min(1),
  precoMensal: z.number().nonnegative(),
  cicloDias: z.number().int().positive().default(30),
  itens: z.array(z.object({ servicoId: z.string(), quantidadePorCiclo: z.number().int().positive() })).min(1),
});

planosRoutes.get("/", async (req, res) => {
  const planos = await prisma.planoAssinatura.findMany({
    where: { empresaId: req.auth!.empresaId },
    include: { itens: { include: { servico: true } } },
  });
  res.json(planos);
});

planosRoutes.post("/", requireAdmin, async (req, res) => {
  const parsed = planoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: parsed.error.issues[0].message });
  const { itens, ...dadosPlano } = parsed.data;

  const plano = await prisma.planoAssinatura.create({
    data: {
      ...dadosPlano,
      empresaId: req.auth!.empresaId,
      itens: { create: itens },
    },
    include: { itens: true },
  });

  res.status(201).json(plano);
});

const assinarSchema = z.object({
  clienteId: z.string().min(1),
  planoId: z.string().min(1),
  metodoPagamento: z.enum(["CARTAO", "PIX"]),
  cpfCnpj: z.string().min(11, "CPF/CNPJ é obrigatório para cobrança recorrente"),
});

planosRoutes.post("/assinar", async (req, res) => {
  const parsed = assinarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: parsed.error.issues[0].message });
  const { clienteId, planoId, metodoPagamento, cpfCnpj } = parsed.data;

  const plano = await prisma.planoAssinatura.findFirst({
    where: { id: planoId, empresaId: req.auth!.empresaId, ativo: true },
  });
  if (!plano) return res.status(404).json({ erro: "Plano não encontrado" });

  const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, empresaId: req.auth!.empresaId } });
  if (!cliente) return res.status(404).json({ erro: "Cliente não encontrado" });

  await prisma.cliente.update({ where: { id: clienteId }, data: { cpfCnpj } });

  const proximaCobrancaEm = new Date();
  proximaCobrancaEm.setDate(proximaCobrancaEm.getDate() + plano.cicloDias);

  let asaasCustomerId: string | undefined;
  let asaasSubscriptionId: string | undefined;
  try {
    const clienteGateway = await criarOuBuscarCliente({ nome: cliente.nome, cpfCnpj, telefone: cliente.telefone });
    const assinaturaGateway = await criarAssinaturaRecorrente({
      customerId: clienteGateway.id,
      valor: plano.precoMensal,
      cicloDias: plano.cicloDias,
      billingType: metodoPagamento === "PIX" ? "PIX" : "CREDIT_CARD",
      proximoVencimento: proximaCobrancaEm.toISOString().slice(0, 10),
      descricao: `Assinatura ${plano.nome}`,
    });
    asaasCustomerId = clienteGateway.id;
    asaasSubscriptionId = assinaturaGateway.id;
  } catch (err) {
    return res.status(502).json({ erro: `Não foi possível criar a cobrança recorrente: ${(err as Error).message}` });
  }

  const assinatura = await prisma.assinaturaCliente.create({
    data: {
      empresaId: req.auth!.empresaId,
      clienteId,
      planoId,
      metodoPagamento,
      proximaCobrancaEm,
      asaasCustomerId,
      asaasSubscriptionId,
    },
  });

  res.status(201).json({ ...assinatura, modoSimulado: asaasEmModoSimulado });
});
