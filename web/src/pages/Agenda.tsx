import { useEffect, useState } from "react";
import { api } from "../api";

interface Agendamento {
  id: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  status: string;
  valorCobrado: number | null;
  origemCredito: boolean;
  cliente: { nome: string; telefone: string };
  profissional: { nome: string };
  servico: { nome: string };
}

const STATUS_ESTILO: Record<string, string> = {
  AGENDADO: "bg-stone-100 text-stone-700",
  CONFIRMADO: "bg-blue-100 text-blue-700",
  REALIZADO: "bg-green-100 text-green-700",
  CANCELADO: "bg-red-100 text-red-700",
  NAO_COMPARECEU: "bg-orange-100 text-orange-700",
};

export function Agenda({ cor }: { cor: string }) {
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const hoje = new Date().toISOString().slice(0, 10);

  async function carregar() {
    setCarregando(true);
    const dados = await api.agendamentos.listar({ dataInicio: hoje, dataFim: hoje });
    setAgendamentos(dados);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function mudarStatus(id: string, status: string) {
    await api.agendamentos.atualizarStatus(id, status);
    carregar();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Agenda de hoje</h1>
          <p className="text-sm text-stone-500">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}</p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-semibold text-stone-900">{agendamentos.length}</span>
          <p className="text-xs text-stone-500">agendamentos</p>
        </div>
      </div>

      {carregando ? (
        <p className="text-sm text-stone-400">Carregando...</p>
      ) : agendamentos.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 p-10 text-center text-stone-400 text-sm">
          Nenhum agendamento para hoje.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-medium px-5 py-3">Horário</th>
                <th className="text-left font-medium px-5 py-3">Cliente</th>
                <th className="text-left font-medium px-5 py-3">Serviço</th>
                <th className="text-left font-medium px-5 py-3">Profissional</th>
                <th className="text-left font-medium px-5 py-3">Valor</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {agendamentos.map((a) => (
                <tr key={a.id} className="border-t border-stone-100">
                  <td className="px-5 py-3 font-medium text-stone-800 tabular-nums">
                    {a.horaInicio}–{a.horaFim}
                  </td>
                  <td className="px-5 py-3 text-stone-700">{a.cliente.nome}</td>
                  <td className="px-5 py-3 text-stone-700">{a.servico.nome}</td>
                  <td className="px-5 py-3 text-stone-500">{a.profissional.nome}</td>
                  <td className="px-5 py-3 tabular-nums text-stone-700">
                    {a.origemCredito ? (
                      <span className="text-xs" style={{ color: cor }}>crédito do plano</span>
                    ) : (
                      `R$ ${a.valorCobrado?.toFixed(2).replace(".", ",")}`
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_ESTILO[a.status]}`}>
                      {a.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right space-x-2 whitespace-nowrap">
                    {a.status === "AGENDADO" && (
                      <>
                        <button onClick={() => mudarStatus(a.id, "REALIZADO")} className="text-xs text-green-700 hover:underline">
                          concluir
                        </button>
                        <button onClick={() => mudarStatus(a.id, "CANCELADO")} className="text-xs text-red-600 hover:underline">
                          cancelar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
