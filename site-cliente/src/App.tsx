import { useEffect, useState } from "react";
import { api } from "./api";
import type { Empresa, Servico, Profissional } from "./api";

type Passo = "servico" | "profissional" | "horario" | "dados" | "confirmacao";

const ORDEM: Passo[] = ["servico", "profissional", "horario", "dados", "confirmacao"];

function slugDaUrl(): string {
  const partes = window.location.pathname.split("/").filter(Boolean);
  return partes[0] || "barbearia-do-joao";
}

function proximosDias(qtd: number): { valor: string; label: string }[] {
  const dias = [];
  for (let i = 0; i < qtd; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dias.push({
      valor: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }),
    });
  }
  return dias;
}

export default function App() {
  const slug = slugDaUrl();
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [erroInicial, setErroInicial] = useState<string | null>(null);

  const [passo, setPasso] = useState<Passo>("servico");
  const [servico, setServico] = useState<Servico | null>(null);
  const [profissional, setProfissional] = useState<Profissional | null>(null);
  const [data, setData] = useState(proximosDias(1)[0].valor);
  const [horarios, setHorarios] = useState<string[]>([]);
  const [horario, setHorario] = useState<string | null>(null);
  const [carregandoHorarios, setCarregandoHorarios] = useState(false);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ tipo: string; valor: number; pixCopiaCola?: string | null } | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    Promise.all([api.empresa(slug), api.servicos(slug), api.profissionais(slug)])
      .then(([e, s, p]) => {
        setEmpresa(e);
        setServicos(s);
        setProfissionais(p);
      })
      .catch(() => setErroInicial("Não encontramos esse negócio. Confira o link e tente de novo."));
  }, [slug]);

  useEffect(() => {
    if (passo !== "horario" || !profissional || !servico) return;
    setCarregandoHorarios(true);
    setHorario(null);
    api
      .horariosDisponiveis(slug, profissional.id, servico.id, data)
      .then((r) => setHorarios(r.horarios))
      .finally(() => setCarregandoHorarios(false));
  }, [passo, profissional, servico, data, slug]);

  async function confirmar() {
    if (!servico || !profissional || !horario) return;
    setEnviando(true);
    setErro(null);
    try {
      const r = await api.agendar(slug, {
        clienteNome: nome,
        clienteTelefone: telefone,
        profissionalId: profissional.id,
        servicoId: servico.id,
        data,
        horaInicio: horario,
      });
      setResultado(r.cobranca);
      setPasso("confirmacao");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível agendar. Tente outro horário.");
    } finally {
      setEnviando(false);
    }
  }

  if (erroInicial) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-stone-500 text-sm text-center">{erroInicial}</p>
      </div>
    );
  }

  if (!empresa) {
    return <div className="min-h-screen" />;
  }

  const cor = empresa.corPrimaria;
  const indicePasso = ORDEM.indexOf(passo);

  return (
    <div className="min-h-screen flex justify-center py-8 px-4">
      <div className="w-full max-w-md">
        <header className="flex items-center gap-3 mb-6">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold shrink-0"
            style={{ background: cor }}
          >
            {empresa.nome.slice(0, 1)}
          </div>
          <div>
            <p className="font-semibold text-stone-900 leading-tight">{empresa.nome}</p>
            <p className="text-xs text-stone-500">Agendamento online</p>
          </div>
        </header>

        {passo !== "confirmacao" && (
          <div className="flex gap-1.5 mb-6">
            {ORDEM.slice(0, 4).map((p, i) => (
              <div
                key={p}
                className="h-1 flex-1 rounded-full"
                style={{ background: i <= indicePasso ? cor : "#e7e5e4" }}
              />
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          {passo === "servico" && (
            <div>
              <h2 className="font-semibold text-stone-900 mb-4">Escolha o serviço</h2>
              <div className="space-y-2">
                {servicos.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setServico(s);
                      setPasso("profissional");
                    }}
                    className="w-full flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-left hover:border-stone-400 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-stone-900">{s.nome}</p>
                      <p className="text-xs text-stone-500">{s.duracaoMinutos} min</p>
                    </div>
                    <p className="font-medium tabular-nums text-stone-900">R$ {s.preco.toFixed(2).replace(".", ",")}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {passo === "profissional" && (
            <div>
              <BotaoVoltar onClick={() => setPasso("servico")} />
              <h2 className="font-semibold text-stone-900 mb-4">Escolha o profissional</h2>
              <div className="space-y-2">
                {profissionais.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setProfissional(p);
                      setPasso("horario");
                    }}
                    className="w-full flex items-center gap-3 rounded-xl border border-stone-200 px-4 py-3 text-left hover:border-stone-400 transition-colors"
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0"
                      style={{ background: cor }}
                    >
                      {p.nome.slice(0, 1)}
                    </div>
                    <div>
                      <p className="font-medium text-stone-900">{p.nome}</p>
                      {p.especialidades && <p className="text-xs text-stone-500">{p.especialidades}</p>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {passo === "horario" && (
            <div>
              <BotaoVoltar onClick={() => setPasso("profissional")} />
              <h2 className="font-semibold text-stone-900 mb-4">Escolha data e horário</h2>

              <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
                {proximosDias(7).map((d) => (
                  <button
                    key={d.valor}
                    onClick={() => setData(d.valor)}
                    className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium border capitalize"
                    style={
                      data === d.valor
                        ? { background: cor, borderColor: cor, color: "white" }
                        : { borderColor: "#e7e5e4", color: "#57534e" }
                    }
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              {carregandoHorarios ? (
                <p className="text-sm text-stone-400 text-center py-6">Buscando horários...</p>
              ) : horarios.length === 0 ? (
                <p className="text-sm text-stone-400 text-center py-6">Sem horários livres nesse dia. Tente outra data.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 mb-5">
                  {horarios.map((h) => (
                    <button
                      key={h}
                      onClick={() => setHorario(h)}
                      className="rounded-lg py-2 text-sm font-medium border tabular-nums"
                      style={
                        horario === h
                          ? { background: cor, borderColor: cor, color: "white" }
                          : { borderColor: "#e7e5e4", color: "#292524" }
                      }
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}

              <button
                disabled={!horario}
                onClick={() => setPasso("dados")}
                className="w-full rounded-xl py-3 text-sm font-medium text-white disabled:opacity-40"
                style={{ background: cor }}
              >
                Continuar
              </button>
            </div>
          )}

          {passo === "dados" && (
            <div>
              <BotaoVoltar onClick={() => setPasso("horario")} />
              <h2 className="font-semibold text-stone-900 mb-1">Seus dados</h2>
              <p className="text-xs text-stone-500 mb-4">
                {servico?.nome} · {new Date(data + "T12:00:00").toLocaleDateString("pt-BR")} às {horario}
              </p>

              <label className="block text-xs font-medium text-stone-600 mb-1">Nome</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full mb-3 rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
                placeholder="Seu nome"
              />

              <label className="block text-xs font-medium text-stone-600 mb-1">WhatsApp</label>
              <input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full mb-4 rounded-lg border border-stone-300 px-3 py-2.5 text-sm"
                placeholder="(11) 99999-0000"
              />

              {erro && <p className="text-sm text-red-600 mb-3">{erro}</p>}

              <button
                disabled={!nome || !telefone || enviando}
                onClick={confirmar}
                className="w-full rounded-xl py-3 text-sm font-medium text-white disabled:opacity-40"
                style={{ background: cor }}
              >
                {enviando ? "Agendando..." : "Confirmar agendamento"}
              </button>
            </div>
          )}

          {passo === "confirmacao" && resultado && (
            <div className="text-center py-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl mx-auto mb-4"
                style={{ background: cor }}
              >
                ✓
              </div>
              <h2 className="font-semibold text-stone-900 text-lg mb-1">Agendado com sucesso!</h2>
              <p className="text-sm text-stone-500 mb-5">
                {servico?.nome} com {profissional?.nome}
                <br />
                {new Date(data + "T12:00:00").toLocaleDateString("pt-BR")} às {horario}
              </p>

              <div className="rounded-xl bg-stone-50 border border-stone-200 p-4 text-left text-sm">
                {resultado.tipo === "credito_assinatura" ? (
                  <p>
                    <span className="font-medium text-stone-900">Coberto pela sua assinatura</span> — nada a pagar agora.
                  </p>
                ) : (
                  <div>
                    <p className="font-medium text-stone-900 mb-2">
                      Valor: R$ {resultado.valor.toFixed(2).replace(".", ",")}
                    </p>
                    {resultado.pixCopiaCola ? (
                      <>
                        <p className="text-stone-500 text-xs mb-2">Pague agora com Pix copia e cola:</p>
                        <div className="flex gap-2">
                          <code className="flex-1 text-[11px] bg-white border border-stone-200 rounded-lg px-2 py-2 truncate">
                            {resultado.pixCopiaCola}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(resultado.pixCopiaCola!);
                              setCopiado(true);
                            }}
                            className="shrink-0 text-xs font-medium text-white rounded-lg px-3"
                            style={{ background: cor }}
                          >
                            {copiado ? "copiado!" : "copiar"}
                          </button>
                        </div>
                      </>
                    ) : (
                      <p className="text-stone-500 text-xs">Pague no local via Pix ou cartão.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BotaoVoltar({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-xs text-stone-400 hover:text-stone-700 mb-3">
      ← voltar
    </button>
  );
}
