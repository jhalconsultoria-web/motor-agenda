import { Request, Response, NextFunction } from "express";
import { verificarToken, TokenPayload } from "../utils/jwt";

// Anexa req.auth a partir do JWT. Toda rota protegida usa req.auth.empresaId
// pra escopar queries — não existe caminho de código que esqueça o filtro
// de tenant, porque ele nunca é passado manualmente pelo cliente da API.
declare global {
  namespace Express {
    interface Request {
      auth?: TokenPayload;
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ erro: "Token não informado" });
  }

  try {
    req.auth = verificarToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.auth?.papel !== "ADMIN") {
    return res.status(403).json({ erro: "Apenas administradores podem realizar esta ação" });
  }
  next();
}
