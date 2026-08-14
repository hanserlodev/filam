import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import { RolUsuario } from "@prisma/client";
import { IsNumber, Min } from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { AuthenticatedRequest } from "../auth/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";

class AbrirCajaDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monto_apertura: number;
}

class CerrarCajaDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  monto_cierre: number;
}

@Controller("caja")
export class CajaController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("sesiones")
  @Roles(RolUsuario.administrador)
  listarSesiones(
    @Query("usuarioId") usuarioId?: string,
    @Query("estado") estado?: string
  ) {
    return this.prisma.cajaSesion.findMany({
      where: {
        usuario_id: usuarioId || undefined,
        estado: (estado as "abierta" | "cerrada") || undefined,
      },
      include: {
        usuario: { select: { nombre: true, email: true } },
        _count: { select: { ventas: true } },
      },
      orderBy: { abierta_en: "desc" },
    });
  }

  @Get("mis-sesiones")
  listarMisSesiones(@Req() request: AuthenticatedRequest) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();
    return this.prisma.cajaSesion.findMany({
      where: { usuario_id: usuarioId },
      include: { _count: { select: { ventas: true } } },
      orderBy: { abierta_en: "desc" },
    });
  }

  @Get("abierta")
  async miCajaAbierta(@Req() request: AuthenticatedRequest) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();
    const sesion = await this.prisma.cajaSesion.findFirst({
      where: { usuario_id: usuarioId, estado: "abierta" },
      include: { _count: { select: { ventas: true } } },
    });
    return sesion || null;
  }

  @Post("abrir")
  async abrir(@Body() dto: AbrirCajaDto, @Req() request: AuthenticatedRequest) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();

    const yaAbierta = await this.prisma.cajaSesion.findFirst({
      where: { usuario_id: usuarioId, estado: "abierta" },
    });
    if (yaAbierta) {
      throw new BadRequestException(
        "Ya tienes una caja abierta. Ciérrala antes de abrir una nueva."
      );
    }

    return this.prisma.cajaSesion.create({
      data: {
        usuario_id: usuarioId,
        monto_apertura: dto.monto_apertura,
      },
    });
  }

  @Post("cerrar/:id")
  async cerrar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CerrarCajaDto,
    @Req() request: AuthenticatedRequest
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();

    const sesion = await this.prisma.cajaSesion.findUnique({
      where: { id },
      include: {
        ventas: { select: { total: true } },
      },
    });

    if (!sesion) throw new BadRequestException("Sesión de caja no encontrada");
    if (sesion.estado === "cerrada") {
      throw new BadRequestException("Esta caja ya fue cerrada");
    }
    if (sesion.usuario_id !== usuarioId) {
      throw new BadRequestException("Solo el cajero que abrió la caja puede cerrarla");
    }

    const totalVendido = sesion.ventas.reduce(
      (sum, v) => sum + Number(v.total),
      0
    );
    const montoCalculado = Number(sesion.monto_apertura) + totalVendido;
    const diferencia = montoCalculado - dto.monto_cierre;

    return this.prisma.cajaSesion.update({
      where: { id },
      data: {
        monto_cierre: dto.monto_cierre,
        diferencia,
        cerrada_en: new Date(),
        estado: "cerrada",
      },
      include: {
        ventas: { select: { total: true, metodo_pago: true } },
      },
    });
  }
}
