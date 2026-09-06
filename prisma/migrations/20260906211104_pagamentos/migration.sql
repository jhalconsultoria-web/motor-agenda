-- AlterTable
ALTER TABLE "AssinaturaCliente" ADD COLUMN "asaasCustomerId" TEXT;
ALTER TABLE "AssinaturaCliente" ADD COLUMN "asaasSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN "cpfCnpj" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Agendamento" (
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
    "statusPagamento" TEXT NOT NULL DEFAULT 'NAO_SE_APLICA',
    "asaasPaymentId" TEXT,
    "pixCopiaCola" TEXT,
    "observacoes" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Agendamento_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agendamento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agendamento_profissionalId_fkey" FOREIGN KEY ("profissionalId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Agendamento_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Agendamento" ("clienteId", "criadoEm", "data", "empresaId", "horaFim", "horaInicio", "id", "observacoes", "origemCredito", "profissionalId", "servicoId", "status", "valorCobrado") SELECT "clienteId", "criadoEm", "data", "empresaId", "horaFim", "horaInicio", "id", "observacoes", "origemCredito", "profissionalId", "servicoId", "status", "valorCobrado" FROM "Agendamento";
DROP TABLE "Agendamento";
ALTER TABLE "new_Agendamento" RENAME TO "Agendamento";
CREATE INDEX "Agendamento_empresaId_profissionalId_data_idx" ON "Agendamento"("empresaId", "profissionalId", "data");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
