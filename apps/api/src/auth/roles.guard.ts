import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolUsuario } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { sub: string } | undefined;

    if (!user?.sub) {
      throw new UnauthorizedException("Usuario no autenticado");
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: user.sub },
      select: { rol: true, activo: true },
    });

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException("Usuario no encontrado o inactivo");
    }

    if (!requiredRoles.includes(usuario.rol)) {
      throw new ForbiddenException("No tiene permisos para esta operación");
    }
    return true;
  }
}
