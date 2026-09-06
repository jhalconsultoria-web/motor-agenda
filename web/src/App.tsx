import { useState } from "react";
import { lerSessao, limparSessao } from "./api";
import type { SessaoAtiva } from "./api";
import { Login } from "./pages/Login";
import { Layout } from "./pages/Layout";
import type { Pagina } from "./pages/Layout";
import { Agenda } from "./pages/Agenda";
import { Servicos } from "./pages/Servicos";
import { Profissionais } from "./pages/Profissionais";
import { Clientes } from "./pages/Clientes";

function App() {
  const [sessao, setSessao] = useState<SessaoAtiva | null>(() => lerSessao());
  const [pagina, setPagina] = useState<Pagina>("agenda");

  if (!sessao) {
    return <Login onEntrar={setSessao} />;
  }

  function sair() {
    limparSessao();
    setSessao(null);
  }

  return (
    <Layout sessao={sessao} paginaAtiva={pagina} onNavegar={setPagina} onSair={sair}>
      {pagina === "agenda" && <Agenda cor={sessao.empresa.corPrimaria} />}
      {pagina === "servicos" && <Servicos cor={sessao.empresa.corPrimaria} />}
      {pagina === "profissionais" && <Profissionais />}
      {pagina === "clientes" && <Clientes />}
    </Layout>
  );
}

export default App;
