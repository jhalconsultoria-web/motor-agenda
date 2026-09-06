import { prisma } from "../db";

function paraMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function paraHora(minutos: number): string {
  const h = Math.floor(minutos / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutos % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export async function existeConflito(params: {
  empresaId: string;
  profissionalId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  ignorarAgendamentoId?: string;
}): Promise<boolean> {
  const agendamentosDoDia = await prisma.agendamento.findMany({
    where: {
      empresaId: params.empresaId,
      profissionalId: params.profissionalId,
      data: params.data,
      status: { notIn: ["CANCELADO", "NAO_COMPARECEU"] },
      ...(params.ignorarAgendamentoId ? { id: { not: params.ignorarAgendamentoId } } : {}),
    },
    select: { horaInicio: true, horaFim: true },
  });

  const inicioNovo = paraMinutos(params.horaInicio);
  const fimNovo = paraMinutos(params.horaFim);

  return agendamentosDoDia.some((a) => {
    const inicioExistente = paraMinutos(a.horaInicio);
    const fimExistente = paraMinutos(a.horaFim);
    return inicioNovo < fimExistente && fimNovo > inicioExistente;
  });
}

const DIA_SEMANA_MASK = ["0", "1", "2", "3", "4", "5", "6"];

export async function getHorariosDisponiveis(params: {
  empresaId: string;
  profissionalId: string;
  data: string; // YYYY-MM-DD
  duracaoMinutos: number;
  intervaloMinutos?: number;
}): Promise<string[]> {
  const profissional = await prisma.usuario.findFirst({
    where: { id: params.profissionalId, empresaId: params.empresaId, ativo: true },
  });
  if (!profissional) return [];

  const diaSemana = DIA_SEMANA_MASK[new Date(params.data + "T12:00:00").getDay()];
  if (!profissional.diasTrabalho.split(",").includes(diaSemana)) return [];

  const passo = params.intervaloMinutos ?? 15;
  const inicioExpediente = paraMinutos(profissional.horarioInicio);
  const fimExpediente = paraMinutos(profissional.horarioFim);

  const agendamentosDoDia = await prisma.agendamento.findMany({
    where: {
      empresaId: params.empresaId,
      profissionalId: params.profissionalId,
      data: params.data,
      status: { notIn: ["CANCELADO", "NAO_COMPARECEU"] },
    },
    select: { horaInicio: true, horaFim: true },
  });

  const ocupados = agendamentosDoDia.map((a) => ({
    inicio: paraMinutos(a.horaInicio),
    fim: paraMinutos(a.horaFim),
  }));

  const livres: string[] = [];
  for (let candidato = inicioExpediente; candidato + params.duracaoMinutos <= fimExpediente; candidato += passo) {
    const fimCandidato = candidato + params.duracaoMinutos;
    const conflita = ocupados.some((o) => candidato < o.fim && fimCandidato > o.inicio);
    if (!conflita) livres.push(paraHora(candidato));
  }

  return livres;
}

export function calcularHoraFim(horaInicio: string, duracaoMinutos: number): string {
  return paraHora(paraMinutos(horaInicio) + duracaoMinutos);
}
