import { Request } from "express";

export interface AuthUser {
  sub: string;
  email?: string;
  role?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}
