import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  ParseUUIDPipe,
  Param,
  UnauthorizedException,
} from "@nestjs/common";
import { RolUsuario, TipoMovimientoInventario } from "@prisma/client";
import {
  IsIn,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { AuthenticatedRequest } from "../auth/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import { registrarMovimientoInventario } from "./inventario-movimiento.helper";

class AjusteInventarioDto {
  @IsUUID()
  producto_id: string;

  @IsIn([
    TipoMovimientoInventario.merma,
    TipoMovimientoInventario.rotura,
    TipoMovimientoInventario.perdida,
    TipoMovimientoInventario.ajuste_conteo,
  ])
  tipo: TipoMovimientoInventario;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  cantidad: number;

  @IsString()
  @MaxLength(300)
  motivo: string;
}

@Controller("inventario")
export class InventarioController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("movimientos")
  @Roles(RolUsuario.administrador)
  listarMovimientos(
    @Query("productoId") productoId?: string,
    @Query("limite") limite?: string
  ) {
    const limit = Math.min(Math.max(Number(limite) || 50, 1), 500);
    return this.prisma.inventarioMovimiento.findMany({
      where: productoId ? { producto_id: productoId } : undefined,
      include: {
        producto: { select: { nombre: true, sku: true, codigo_barras: true } },
        usuario: { select: { nombre: true } },
      },
      orderBy: { creado_en: "desc" },
      take: limit,
    });
  }

  @Get("movimientos/producto/:id")
  @Roles(RolUsuario.administrador)
  movimientosDeProducto(@Param("id", ParseUUIDPipe) id: string) {
    return this.prisma.inventarioMovimiento.findMany({
      where: { producto_id: id },
      include: { usuario: { select: { nombre: true } } },
      orderBy: { creado_en: "desc" },
    });
  }

  @Post("ajustar")
  @Roles(RolUsuario.administrador)
  async ajustar(
    @Body() dto: AjusteInventarioDto,
    @Req() request: AuthenticatedRequest
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();

    return this.prisma.$transaction(async (tx) => {
      return registrarMovimientoInventario({
        tx,
        productoId: dto.producto_id,
        tipo: dto.tipo,
        cantidad: -dto.cantidad,
        motivo: dto.motivo,
        usuarioId,
      });
    });
  }
}
