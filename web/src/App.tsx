import { useState } from "react";
import { lerSessao, limparSessao, salvarSessao } from "./api";
import type { SessaoAtiva } from "./api";
import { Login } from "./pages/Login";
import { Registrar } from "./pages/Registrar";
import { Layout } from "./pages/Layout";
import type { Pagina } from "./pages/Layout";
import { Agenda } from "./pages/Agenda";
import { Servicos } from "./pages/Servicos";
import { Profissionais } from "./pages/Profissionais";
import { Clientes } from "./pages/Clientes";
import { Configuracoes } from "./pages/Configuracoes";

function App() {
  const [sessao, setSessao] = useState<SessaoAtiva | null>(() => lerSessao());
  const [pagina, setPagina] = useState<Pagina>("agenda");
  const [tela, setTela] = useState<"login" | "registrar">("login");

  if (!sessao) {
    return tela === "login" ? (
      <Login onEntrar={setSessao} onCriarConta={() => setTela("registrar")} />
    ) : (
      <Registrar onEntrar={setSessao} onVoltarLogin={() => setTela("login")} />
    );
  }

  function sair() {
    limparSessao();
    setSessao(null);
  }

  function atualizarEmpresa(empresa: SessaoAtiva["empresa"]) {
    const novaSessao = { ...sessao!, empresa };
    salvarSessao(novaSessao);
    setSessao(novaSessao);
  }

  return (
    <Layout sessao={sessao} paginaAtiva={pagina} onNavegar={setPagina} onSair={sair}>
      {pagina === "agenda" && <Agenda cor={sessao.empresa.corPrimaria} />}
      {pagina === "servicos" && <Servicos cor={sessao.empresa.corPrimaria} />}
      {pagina === "profissionais" && <Profissionais />}
      {pagina === "clientes" && <Clientes />}
      {pagina === "configuracoes" && <Configuracoes sessao={sessao} onAtualizarEmpresa={atualizarEmpresa} />}
    </Layout>
  );
}

export default App;
