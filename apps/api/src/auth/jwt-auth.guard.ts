import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "./public.decorator";
import { verificarTokenSupabase } from "./jwt-verify";

export interface AuthUserPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly gotrueUrl: string;
  private readonly hmacSecret: string | undefined;

  constructor(
    private readonly config: ConfigService,
    private readonly reflector: Reflector
  ) {
    this.gotrueUrl = this.config.get<string>("GOTRUE_URL") || "";
    this.hmacSecret = this.config.get<string>("GOTRUE_JWT_SECRET");
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization as string | undefined;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedException("Token de autenticación requerido");
    }

    const token = authHeader.slice(7);

    try {
      const payload = await verificarTokenSupabase(
        token,
        this.gotrueUrl,
        this.hmacSecret
      );
      request.user = {
        sub: payload.sub as string,
        email: payload.email as string,
        role: payload.role as string,
      } as AuthUserPayload;
      return true;
    } catch {
      throw new UnauthorizedException("Token inválido o expirado");
    }
  }
}
