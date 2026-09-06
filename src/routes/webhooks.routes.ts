import { Router } from "express";
import { prisma } from "../db";

export const webhooksRoutes = Router();

const EVENTOS_PAGO = new Set(["PAYMENT_CONFIRMED", "PAYMENT_RECEIVED"]);

// A Asaas permite configurar um token customizado enviado em todo webhook
// (header "asaas-access-token") — validamos contra ele pra garantir que a
// chamada veio de verdade da Asaas e não de qualquer um que descubra a URL.
webhooksRoutes.post("/asaas", async (req, res) => {
  const tokenEsperado = process.env.ASAAS_WEBHOOK_TOKEN;
  if (tokenEsperado && req.headers["asaas-access-token"] !== tokenEsperado) {
    return res.status(401).json({ erro: "Token inválido" });
  }

  const { event, payment } = req.body as { event?: string; payment?: { id: string } };

  if (event && EVENTOS_PAGO.has(event) && payment?.id) {
    await prisma.agendamento.updateMany({
      where: { asaasPaymentId: payment.id },
      data: { statusPagamento: "PAGO" },
    });
  }

  // A Asaas só considera o webhook entregue com 200 — sempre responder OK
  // mesmo se o evento não for um dos que tratamos.
  res.status(200).json({ ok: true });
});
