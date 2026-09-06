-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "corPrimaria" TEXT NOT NULL DEFAULT '#C4870F',
    "logoUrl" TEXT,
    "whatsappNumero" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" TEXT NOT NULL DEFAULT 'PROFISSIONAL',
    "especialidades" TEXT,
    "horarioInicio" TEXT NOT NULL DEFAULT '08:00',
    "horarioFim" TEXT NOT NULL DEFAULT '18:00',
    "diasTrabalho" TEXT NOT NULL DEFAULT '1,2,3,4,5,6',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Usuario_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'Geral',
    "duracaoMinutos" INTEGER NOT NULL,
    "preco" REAL NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Servico_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Cliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "profissionalId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "horaInicio" TEXT NOT NULL,
    "horaFim" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AGENDADO',
    "valorCobrado" REAL,
    "origemCredito" BOOLEAN NOT NULL DEFAULT false,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Agendamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agendamento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agendamento_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanoAssinatura" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "precoMensal" REAL NOT NULL,
    "cicloDias" INTEGER NOT NULL DEFAULT 30,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PlanoAssinatura_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlanoServico" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "planoId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "quantidadePorCiclo" INTEGER NOT NULL,
    CONSTRAINT "PlanoServico_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoAssinatura" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PlanoServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AssinaturaCliente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "planoId" TEXT NOT NULL,
    "metodoPagamento" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ATIVA',
    "inicioEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "proximaCobrancaEm" DATETIME NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssinaturaCliente_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssinaturaCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "AssinaturaCliente_planoId_fkey" FOREIGN KEY ("planoId") REFERENCES "PlanoAssinatura" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CreditoAssinatura" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "assinaturaClienteId" TEXT NOT NULL,
    "servicoId" TEXT NOT NULL,
    "cicloReferencia" TEXT NOT NULL,
    "quantidadeTotal" INTEGER NOT NULL,
    "quantidadeUsada" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "CreditoAssinatura_assinaturaClienteId_fkey" FOREIGN KEY ("assinaturaClienteId") REFERENCES "AssinaturaCliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_slug_key" ON "Empresa"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_empresaId_telefone_key" ON "Cliente"("empresaId", "telefone");

-- CreateIndex
CREATE INDEX "Agendamento_empresaId_profissionalId_data_idx" ON "Agendamento"("empresaId", "profissionalId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "PlanoServico_planoId_servicoId_key" ON "PlanoServico"("planoId", "servicoId");

-- CreateIndex
CREATE UNIQUE INDEX "CreditoAssinatura_assinaturaClienteId_servicoId_cicloReferencia_key" ON "CreditoAssinatura"("assinaturaClienteId", "servicoId", "cicloReferencia");
