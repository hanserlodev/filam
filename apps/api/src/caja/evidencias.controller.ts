import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  ParseUUIDPipe,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { AuthenticatedRequest } from "../auth/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";

const BUCKET = "evidencias-caja";

class SubirEvidenciaDto {
  @IsString()
  @MaxLength(300)
  ruta_archivo: string;

  @IsString()
  @MaxLength(50)
  tipo_archivo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  tamano_bytes?: number;
}

@Controller("caja")
export class EvidenciasController {
  private readonly storage: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService
  ) {
    const url = this.config.get<string>("SUPABASE_URL");
    const key = this.config.get<string>("SERVICE_ROLE_KEY");
    if (url && key) {
      this.storage = createClient(url, key, {
        auth: { persistSession: false },
      });
    }
  }

  @Post("sesion/:id/evidencia")
  async subirEvidencia(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SubirEvidenciaDto,
    @Req() request: AuthenticatedRequest
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();
    if (!dto.ruta_archivo || dto.ruta_archivo.trim().length < 5) {
      throw new BadRequestException("La ruta del archivo es requerida");
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { rol: true, activo: true },
    });
    if (!usuario || !usuario.activo) throw new UnauthorizedException();

    const sesion = await this.prisma.cajaSesion.findUnique({
      where: { id },
    });
    if (!sesion) throw new NotFoundException("Sesión de caja no encontrada");
    if (sesion.estado === "abierta") {
      throw new BadRequestException(
        "La caja debe estar cerrada para adjuntar la foto del arqueo"
      );
    }
    if (usuario.rol !== "administrador" && sesion.usuario_id !== usuarioId) {
      throw new BadRequestException("No tienes acceso a esta caja");
    }

    const previa = await this.prisma.cajaEvidencia.findFirst({
      where: { caja_sesion_id: id },
      orderBy: { creado_en: "desc" },
    });

    return this.prisma.cajaEvidencia.create({
      data: {
        caja_sesion_id: id,
        ruta_archivo: dto.ruta_archivo,
        tipo_archivo: dto.tipo_archivo,
        tamano_bytes: dto.tamano_bytes,
        subida_por_id: usuarioId,
        reemplaza_id: previa?.id,
      },
    });
  }

  @Get("sesion/:id/evidencias")
  async listarEvidencias(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { rol: true },
    });
    const sesion = await this.prisma.cajaSesion.findUnique({ where: { id } });
    if (!sesion) throw new NotFoundException("Sesión de caja no encontrada");
    if (usuario?.rol !== "administrador" && sesion.usuario_id !== usuarioId) {
      throw new BadRequestException("No tienes acceso a esta caja");
    }
    return this.prisma.cajaEvidencia.findMany({
      where: { caja_sesion_id: id },
      orderBy: { creado_en: "desc" },
    });
  }

  @Get("evidencia/:id/url")
  async urlFirmada(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { rol: true, activo: true },
    });
    if (!usuario || !usuario.activo) throw new UnauthorizedException();

    const evidencia = await this.prisma.cajaEvidencia.findUnique({
      where: { id },
      include: { cajaSesion: true },
    });
    if (!evidencia) throw new NotFoundException("Evidencia no encontrada");
    if (
      usuario.rol !== "administrador" &&
      evidencia.cajaSesion.usuario_id !== usuarioId
    ) {
      throw new BadRequestException("No tienes acceso a esta evidencia");
    }

    const { data, error } = await (this.storage.storage.from(BUCKET) as {
      createSignedUrl: (
        path: string,
        expiresIn: number
      ) => Promise<{ data: { signedUrl: string } | null; error: { message?: string } | null }>;
    }).createSignedUrl(evidencia.ruta_archivo, 3600);
    if (error || !data) {
      throw new BadRequestException(
        `No se pudo generar la URL firmada: ${error?.message || "error"}`
      );
    }
    return { url: data.signedUrl, expiresIn: 3600 };
  }
}
