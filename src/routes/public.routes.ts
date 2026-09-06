import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { existeConflito, getHorariosDisponiveis, calcularHoraFim } from "../services/agendaService";
import { buscarOuCriarCreditoDisponivel, consumirCredito } from "../services/creditoService";
import { criarOuBuscarCliente, criarCobrancaPixAvulsa } from "../services/asaasClient";

export const publicRoutes = Router({ mergeParams: true });

// Toda rota pública é resolvida pelo slug na URL (ex: /api/public/barbearia-do-joao/...),
// nunca por um empresaId vindo do cliente — é isso que permite N mini-sites
// diferentes na frente do mesmo motor sem um vazar dado do outro.
async function resolverEmpresa(slug: string) {
  return prisma.empresa.findUnique({ where: { slug } });
}

publicRoutes.get("/:slug/empresa", async (req, res) => {
  const empresa = await resolverEmpresa(req.params.slug);
  if (!empresa) return res.status(404).json({ erro: "Negócio não encontrado" });
  res.json({ nome: empresa.nome, corPrimaria: empresa.corPrimaria, logoUrl: empresa.logoUrl });
});

publicRoutes.get("/:slug/servicos", async (req, res) => {
  const empresa = await resolverEmpresa(req.params.slug);
  if (!empresa) return res.status(404).json({ erro: "Negócio não encontrado" });

  const servicos = await prisma.servico.findMany({ where: { empresaId: empresa.id, ativo: true } });
  res.json(servicos);
});

publicRoutes.get("/:slug/profissionais", async (req, res) => {
  const empresa = await resolverEmpresa(req.params.slug);
  if (!empresa) return res.status(404).json({ erro: "Negócio não encontrado" });

  const profissionais = await prisma.usuario.findMany({
    where: { empresaId: empresa.id, ativo: true },
    select: { id: true, nome: true, especialidades: true },
  });
  res.json(profissionais);
});

publicRoutes.get("/:slug/horarios-disponiveis", async (req, res) => {
  const empresa = await resolverEmpresa(req.params.slug);
  if (!empresa) return res.status(404).json({ erro: "Negócio não encontrado" });

  const { profissionalId, servicoId, data } = req.query as Record<string, string>;
  if (!profissionalId || !servicoId || !data) {
    return res.status(400).json({ erro: "profissionalId, servicoId e data são obrigatórios" });
  }

  const servico = await prisma.servico.findFirst({ where: { id: servicoId, empresaId: empresa.id } });
  if (!servico) return res.status(404).json({ erro: "Serviço não encontrado" });

  const horarios = await getHorariosDisponiveis({
    empresaId: empresa.id,
    profissionalId,
    data,
    duracaoMinutos: servico.duracaoMinutos,
  });

  res.json({ horarios });
});

const agendarSchema = z.object({
  clienteNome: z.string().min(1),
  clienteTelefone: z.string().min(8),
  profissionalId: z.string().min(1),
  servicoId: z.string().min(1),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
});

publicRoutes.post("/:slug/agendamentos", async (req, res) => {
  const empresa = await resolverEmpresa(req.params.slug);
  if (!empresa) return res.status(404).json({ erro: "Negócio não encontrado" });

  const parsed = agendarSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ erro: parsed.error.issues[0].message });
  const dados = parsed.data;

  const servico = await prisma.servico.findFirst({
    where: { id: dados.servicoId, empresaId: empresa.id, ativo: true },
  });
  if (!servico) return res.status(404).json({ erro: "Serviço não encontrado" });

  const horaFim = calcularHoraFim(dados.horaInicio, servico.duracaoMinutos);
  const conflito = await existeConflito({
    empresaId: empresa.id,
    profissionalId: dados.profissionalId,
    data: dados.data,
    horaInicio: dados.horaInicio,
    horaFim,
  });
  if (conflito) return res.status(409).json({ erro: "Esse horário acabou de ser ocupado, escolha outro" });

  const cliente = await prisma.cliente.upsert({
    where: { empresaId_telefone: { empresaId: empresa.id, telefone: dados.clienteTelefone } },
    update: { nome: dados.clienteNome },
    create: { empresaId: empresa.id, nome: dados.clienteNome, telefone: dados.clienteTelefone },
  });

  const credito = await buscarOuCriarCreditoDisponivel(cliente.id, dados.servicoId);

  let asaasPaymentId: string | undefined;
  let pixCopiaCola: string | undefined;
  if (!credito) {
    try {
      const clienteGateway = await criarOuBuscarCliente({ nome: cliente.nome, telefone: cliente.telefone });
      const cobranca = await criarCobrancaPixAvulsa({
        customerId: clienteGateway.id,
        valor: servico.preco,
        descricao: `${servico.nome} — ${empresa.nome}`,
        vencimento: dados.data,
      });
      asaasPaymentId = cobranca.id;
      pixCopiaCola = cobranca.pixCopiaCola ?? undefined;
    } catch (err) {
      // Não trava o agendamento se a geração do Pix falhar — o negócio ainda
      // pode cobrar manualmente. Fica registrado como pendente.
      console.error("Falha ao gerar cobrança Pix:", (err as Error).message);
    }
  }

  const agendamento = await prisma.agendamento.create({
    data: {
      empresaId: empresa.id,
      clienteId: cliente.id,
      profissionalId: dados.profissionalId,
      servicoId: dados.servicoId,
      data: dados.data,
      horaInicio: dados.horaInicio,
      horaFim,
      valorCobrado: credito ? 0 : servico.preco,
      origemCredito: Boolean(credito),
      statusPagamento: credito ? "NAO_SE_APLICA" : "PENDENTE",
      asaasPaymentId,
      pixCopiaCola,
    },
  });

  if (credito) await consumirCredito(credito.id);

  res.status(201).json({
    agendamento,
    cobranca: credito
      ? { tipo: "credito_assinatura", valor: 0 }
      : { tipo: "avulso", valor: servico.preco, pixCopiaCola: pixCopiaCola ?? null, metodosAceitos: ["PIX", "CARTAO"] },
  });
});
