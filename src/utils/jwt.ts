import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET!;

export interface TokenPayload {
  usuarioId: string;
  empresaId: string;
  papel: "ADMIN" | "PROFISSIONAL";
}

export function assinarToken(payload: TokenPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: "12h" });
}

export function verificarToken(token: string): TokenPayload {
  return jwt.verify(token, SECRET) as TokenPayload;
}
