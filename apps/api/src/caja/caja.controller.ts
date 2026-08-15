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
import {
  MetodoPago,
  Prisma,
  RolUsuario,
  TipoMovimientoCaja,
} from "@prisma/client";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
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

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo_diferencia?: string;
}

class MovimientoDto {
  @IsIn(Object.values(TipoMovimientoCaja))
  tipo: TipoMovimientoCaja;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto: number;

  @IsString()
  @MaxLength(300)
  motivo: string;
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
        evidencias: { orderBy: { creado_en: "desc" } },
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
      include: {
        _count: { select: { ventas: true } },
        evidencias: { orderBy: { creado_en: "desc" } },
      },
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
      include: {
        _count: { select: { ventas: true } },
        movimientos: { orderBy: { creado_en: "asc" } },
        evidencias: { orderBy: { creado_en: "desc" } },
      },
    });
    const respuesta = sesion
      ? {
          ...sesion,
          resumen: sesion
            ? await this.calcularResumen(sesion.id, sesion.monto_apertura)
            : null,
        }
      : null;
    return response ? response.status(200).json(respuesta) : respuesta;
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

  @Get(":id/resumen")
  async resumenDeCaja(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();
    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { rol: true },
    });
    const sesion = await this.prisma.cajaSesion.findUnique({
      where: { id },
    });
    if (!sesion) throw new BadRequestException("Sesión de caja no encontrada");
    if (usuario?.rol !== "administrador" && sesion.usuario_id !== usuarioId) {
      throw new BadRequestException("No tienes acceso a esta caja");
    }
    return this.calcularResumen(sesion.id, sesion.monto_apertura);
  }

  @Post("movimiento")
  async registrarMovimiento(
    @Body() dto: MovimientoDto,
    @Req() request: AuthenticatedRequest
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();

    return this.prisma.$transaction(async (tx) => {
      const caja = await tx.cajaSesion.findFirst({
        where: { usuario_id: usuarioId, estado: "abierta" },
      });
      if (!caja) {
        throw new BadRequestException(
          "No tienes una caja abierta para registrar movimientos"
        );
      }

      if (dto.tipo === TipoMovimientoCaja.retiro) {
        const resumen = await this.calcularResumenTx(tx, caja.id, caja.monto_apertura);
        const efectivoEsperado = toDecimal(resumen.efectivo_esperado);
        if (toDecimal(dto.monto).gt(efectivoEsperado)) {
          throw new BadRequestException(
            `No puedes retirar más de S/ ${efectivoEsperado} que hay en caja`
          );
        }
      }

      return tx.cajaMovimiento.create({
        data: {
          caja_sesion_id: caja.id,
          tipo: dto.tipo,
          monto: toMoney(dto.monto),
          motivo: dto.motivo,
          usuario_id: usuarioId,
        },
      });
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

    return this.prisma.$transaction(async (tx) => {
      const sesion = await tx.cajaSesion.findUnique({
        where: { id },
        include: {
          ventas: { select: { total: true, metodo_pago: true, anulada: true } },
        },
      });

      if (!sesion) throw new BadRequestException("Sesión de caja no encontrada");
      if (sesion.estado === "cerrada") {
        throw new BadRequestException("Esta caja ya fue cerrada");
      }
      if (sesion.usuario_id !== usuarioId) {
        throw new BadRequestException("Solo el cajero que abrió la caja puede cerrarla");
      }

      const resumen = await this.calcularResumenTx(tx, sesion.id, sesion.monto_apertura);
      const efectivoEsperado = toMoney(resumen.efectivo_esperado as Prisma.Decimal);
      const montoEsperado = toMoney(resumen.monto_esperado as Prisma.Decimal);
      const diferencia = toMoney(
        efectivoEsperado.minus(toDecimal(dto.monto_cierre))
      );

      // Umbral configurable: si la diferencia supera el umbral, motivo obligatorio.
      const config = await tx.configuracion.findFirst();
      const umbral = config?.umbral_diferencia
        ? toDecimal(config.umbral_diferencia)
        : new Prisma.Decimal(10);
      const absDiferencia = diferencia.abs();

      if (absDiferencia.gt(umbral)) {
        if (!dto.motivo_diferencia || dto.motivo_diferencia.trim().length < 3) {
          throw new BadRequestException(
            `La diferencia de S/ ${diferencia} supera el umbral permitido. Indica el motivo.`
          );
        }
      }

      const actualizada = await tx.cajaSesion.updateMany({
        where: { id, usuario_id: usuarioId, estado: "abierta" },
        data: {
          monto_cierre: toMoney(dto.monto_cierre),
          diferencia,
          total_efectivo: resumen.total_efectivo,
          total_digital: resumen.total_digital,
          total_ingresos: resumen.total_ingresos,
          total_retiros: resumen.total_retiros,
          monto_esperado: efectivoEsperado,
          monto_operativo: montoEsperado,
          motivo_diferencia: dto.motivo_diferencia,
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
          ventas: {
            select: { total: true, metodo_pago: true, anulada: true },
          },
          movimientos: { orderBy: { creado_en: "asc" } },
          evidencias: { orderBy: { creado_en: "desc" } },
        },
      });
    });
  }

  private async calcularResumen(cajaId: string, montoApertura: Prisma.Decimal) {
    return this.calcularResumenTx(this.prisma, cajaId, montoApertura);
  }

  private async calcularResumenTx(
    tx: Prisma.TransactionClient,
    cajaId: string,
    montoApertura: Prisma.Decimal
  ) {
    const [ventas, movimientos] = await Promise.all([
      tx.venta.findMany({
        where: { caja_sesion_id: cajaId, anulada: false },
        select: { total: true, metodo_pago: true, pagos: { select: { metodo_pago: true, monto: true } } },
      }),
      tx.cajaMovimiento.findMany({
        where: { caja_sesion_id: cajaId },
        select: { tipo: true, monto: true },
      }),
    ]);

    let totalEfectivo = new Prisma.Decimal(0);
    let totalDigital = new Prisma.Decimal(0);

    for (const venta of ventas) {
      // Usa el desglose real de pagos si existe; si no, el método principal.
      if (venta.pagos && venta.pagos.length > 0) {
        for (const pago of venta.pagos) {
          if (pago.metodo_pago === MetodoPago.efectivo) {
            totalEfectivo = totalEfectivo.plus(toDecimal(pago.monto));
          } else {
            totalDigital = totalDigital.plus(toDecimal(pago.monto));
          }
        }
      } else {
        if (venta.metodo_pago === MetodoPago.efectivo) {
          totalEfectivo = totalEfectivo.plus(toDecimal(venta.total));
        } else {
          totalDigital = totalDigital.plus(toDecimal(venta.total));
        }
      }
    }

    let totalIngresos = new Prisma.Decimal(0);
    let totalRetiros = new Prisma.Decimal(0);
    for (const mov of movimientos) {
      if (mov.tipo === TipoMovimientoCaja.ingreso) {
        totalIngresos = totalIngresos.plus(toDecimal(mov.monto));
      } else {
        totalRetiros = totalRetiros.plus(toDecimal(mov.monto));
      }
    }

    const efectivoEsperado = toMoney(
      toDecimal(montoApertura)
        .plus(totalEfectivo)
        .plus(totalIngresos)
        .minus(totalRetiros)
    );
    const montoEsperado = toMoney(
      toDecimal(montoApertura)
        .plus(totalEfectivo)
        .plus(totalDigital)
        .plus(totalIngresos)
        .minus(totalRetiros)
    );

    return {
      total_efectivo: totalEfectivo,
      total_digital: totalDigital,
      total_ingresos: totalIngresos,
      total_retiros: totalRetiros,
      efectivo_esperado: efectivoEsperado,
      monto_esperado: montoEsperado,
    };
  }
}
