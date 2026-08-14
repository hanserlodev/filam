import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  Res,
  ParseUUIDPipe,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { Response } from "express";
import { MetodoPago, Prisma, RolUsuario } from "@prisma/client";
import { IsNumber, Min } from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { AuthenticatedRequest } from "../auth/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import { toDecimal, toMoney } from "../common/decimal";

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
  async miCajaAbierta(
    @Req() request: AuthenticatedRequest,
    @Res() response?: Response
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();
    const sesion = await this.prisma.cajaSesion.findFirst({
      where: { usuario_id: usuarioId, estado: "abierta" },
      include: { _count: { select: { ventas: true } } },
    });
    return response ? response.status(200).json(sesion) : sesion;
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

    try {
      return await this.prisma.cajaSesion.create({
        data: {
          usuario_id: usuarioId,
          monto_apertura: toMoney(dto.monto_apertura),
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        throw new BadRequestException(
          "Ya tienes una caja abierta. Ciérrala antes de abrir una nueva."
        );
      }
      throw error;
    }
  }

  @Post("cerrar/:id")
  async cerrar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CerrarCajaDto,
    @Req() request: AuthenticatedRequest
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();

    return this.prisma.$transaction(async (tx) => {
      const sesion = await tx.cajaSesion.findUnique({
        where: { id },
        include: {
          ventas: { select: { total: true, metodo_pago: true } },
        },
      });

      if (!sesion) throw new BadRequestException("Sesión de caja no encontrada");
      if (sesion.estado === "cerrada") {
        throw new BadRequestException("Esta caja ya fue cerrada");
      }
      if (sesion.usuario_id !== usuarioId) {
        throw new BadRequestException("Solo el cajero que abrió la caja puede cerrarla");
      }

      // Solo el efectivo modifica el dinero físico de la caja.
      const totalEfectivo = sesion.ventas
        .filter((venta) => venta.metodo_pago === MetodoPago.efectivo)
        .reduce(
          (sum, venta) => sum.plus(toDecimal(venta.total)),
          new Prisma.Decimal(0)
        );
      const montoCalculado = toMoney(
        toDecimal(sesion.monto_apertura).plus(totalEfectivo)
      );
      const diferencia = toMoney(
        montoCalculado.minus(toDecimal(dto.monto_cierre))
      );

      const actualizada = await tx.cajaSesion.updateMany({
        where: { id, usuario_id: usuarioId, estado: "abierta" },
        data: {
          monto_cierre: toMoney(dto.monto_cierre),
          diferencia,
          cerrada_en: new Date(),
          estado: "cerrada",
        },
      });
      if (actualizada.count === 0) {
        throw new BadRequestException("Esta caja ya fue cerrada");
      }

      return tx.cajaSesion.findUnique({
        where: { id },
        include: {
          ventas: { select: { total: true, metodo_pago: true } },
        },
      });
    });
  }
}
