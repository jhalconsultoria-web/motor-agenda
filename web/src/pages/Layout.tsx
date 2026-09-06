import type { SessaoAtiva } from "../api";

type Pagina = "agenda" | "servicos" | "profissionais" | "clientes" | "configuracoes";

const ITENS: { id: Pagina; label: string }[] = [
  { id: "agenda", label: "Agenda" },
  { id: "servicos", label: "Serviços" },
  { id: "profissionais", label: "Profissionais" },
  { id: "clientes", label: "Clientes" },
  { id: "configuracoes", label: "Configurações" },
];

export function Layout({
  sessao,
  paginaAtiva,
  onNavegar,
  onSair,
  children,
}: {
  sessao: SessaoAtiva;
  paginaAtiva: Pagina;
  onNavegar: (p: Pagina) => void;
  onSair: () => void;
  children: React.ReactNode;
}) {
  const cor = sessao.empresa.corPrimaria;

  return (
    <div className="min-h-screen bg-stone-100 flex">
      <aside className="w-60 bg-white border-r border-stone-200 flex flex-col">
        <div className="px-5 py-5 border-b border-stone-100">
          <div className="flex items-center gap-2 mb-0.5">
            {sessao.empresa.logoUrl ? (
              <img src={sessao.empresa.logoUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: cor }} />
            )}
            <span className="font-semibold text-stone-900 text-sm truncate">{sessao.empresa.nome}</span>
          </div>
          <span className="text-xs text-stone-400">{sessao.usuario.nome}</span>
        </div>

        <nav className="flex-1 py-3">
          {ITENS.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavegar(item.id)}
              className={`w-full text-left px-5 py-2.5 text-sm font-medium transition-colors ${
                paginaAtiva === item.id
                  ? "text-stone-900 border-r-2"
                  : "text-stone-500 hover:text-stone-800 hover:bg-stone-50"
              }`}
              style={paginaAtiva === item.id ? { borderColor: cor, background: `${cor}14` } : {}}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button onClick={onSair} className="m-3 text-sm text-stone-400 hover:text-stone-700 text-left px-2 py-2">
          Sair
        </button>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}

export type { Pagina };
