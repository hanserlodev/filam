import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { RolUsuario } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { verificarTokenSupabase } from "./jwt-verify";

interface GoTrueAdminResponse {
  id: string;
  email?: string;
  raw_user_meta_data?: Record<string, unknown>;
}

@Injectable()
export class AuthService {
  private readonly gotrueAdminUrl: string;
  private readonly gotrueUrl: string;
  private readonly serviceRoleKey: string;
  private readonly hmacSecret: string | undefined;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    this.gotrueUrl =
      this.config.get<string>("GOTRUE_URL") || "http://localhost:9999";
    this.gotrueAdminUrl = `${this.gotrueUrl.replace(/\/$/, "")}/admin`;
    this.serviceRoleKey = this.config.get<string>("SERVICE_ROLE_KEY") || "";
    this.hmacSecret = this.config.get<string>("GOTRUE_JWT_SECRET");
  }

  /**
   * Devuelve el usuario autenticado (de la tabla usuarios) desde el token.
   */
  async me(token: string) {
    const payload = await this.verifyToken(token);
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: payload.sub as string },
    });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException("Usuario no encontrado o inactivo");
    }
    return {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
    };
  }

  /**
   * Crea un usuario: primero en GoTrue (auth.users) y luego la fila en usuarios con el mismo UUID.
   */
  async registrarUsuario(
    nombre: string,
    email: string,
    password: string,
    rol: RolUsuario
  ) {
    const existente = await this.prisma.usuario.findUnique({
      where: { email },
    });
    if (existente) {
      throw new ConflictException("Ya existe un usuario con ese email");
    }

    const res = await fetch(`${this.gotrueAdminUrl}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: this.serviceRoleKey,
        Authorization: `Bearer ${this.serviceRoleKey}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre, rol },
      }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as {
        msg?: string;
      } | null;
      throw new BadRequestException(
        `Error creando usuario en GoTrue: ${body?.msg || res.status}`
      );
    }

    const goTrueUser = (await res.json()) as GoTrueAdminResponse;

    try {
      return await this.prisma.usuario.create({
        data: {
          id: goTrueUser.id,
          nombre,
          email,
          rol,
        },
      });
    } catch (error) {
      // Evita dejar una cuenta autenticable sin perfil/rol en el sistema.
      await fetch(`${this.gotrueAdminUrl}/users/${goTrueUser.id}`, {
        method: "DELETE",
        headers: {
          apikey: this.serviceRoleKey,
          Authorization: `Bearer ${this.serviceRoleKey}`,
        },
      }).catch(() => undefined);
      throw error;
    }
  }

  /**
   * Lista usuarios del sistema (tabla usuarios).
   */
  listarUsuarios() {
    return this.prisma.usuario.findMany({
      orderBy: { creado_en: "asc" },
    });
  }

  private async verifyToken(token: string) {
    try {
      return await verificarTokenSupabase(token, this.gotrueUrl, this.hmacSecret);
    } catch {
      throw new UnauthorizedException("Token inválido o expirado");
    }
  }
}
