import { prisma } from "../db";

function calcularCicloReferencia(inicioEm: Date, cicloDias: number, agora: Date): string {
  const diasDesdeInicio = Math.floor((agora.getTime() - inicioEm.getTime()) / 86_400_000);
  const cicloIndex = Math.max(0, Math.floor(diasDesdeInicio / cicloDias));
  return `ciclo-${cicloIndex}`;
}

// Se o cliente tem assinatura ativa que cobre esse serviço, retorna o crédito
// do ciclo atual (criando-o se for a primeira vez que o ciclo é usado).
// Retorna null se o cliente deve pagar avulso.
export async function buscarOuCriarCreditoDisponivel(clienteId: string, servicoId: string) {
  const assinatura = await prisma.assinaturaCliente.findFirst({
    where: {
      clienteId,
      status: "ATIVA",
      plano: { itens: { some: { servicoId } } },
    },
    include: { plano: { include: { itens: true } } },
  });

  if (!assinatura) return null;

  const itemPlano = assinatura.plano.itens.find((i) => i.servicoId === servicoId)!;
  const cicloReferencia = calcularCicloReferencia(assinatura.inicioEm, assinatura.plano.cicloDias, new Date());

  const credito = await prisma.creditoAssinatura.upsert({
    where: {
      assinaturaClienteId_servicoId_cicloReferencia: {
        assinaturaClienteId: assinatura.id,
        servicoId,
        cicloReferencia,
      },
    },
    update: {},
    create: {
      assinaturaClienteId: assinatura.id,
      servicoId,
      cicloReferencia,
      quantidadeTotal: itemPlano.quantidadePorCiclo,
    },
  });

  if (credito.quantidadeUsada >= credito.quantidadeTotal) return null;

  return credito;
}

export async function consumirCredito(creditoId: string) {
  await prisma.creditoAssinatura.update({
    where: { id: creditoId },
    data: { quantidadeUsada: { increment: 1 } },
  });
}
