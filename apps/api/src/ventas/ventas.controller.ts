import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { Request } from "express";
import {
  FormatoImpresion,
  MetodoPago,
  TipoComprobante,
} from "@prisma/client";
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedRequest } from "../auth/authenticated-request";

class VentaItemDto {
  @IsUUID()
  producto_id: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  cantidad: number;
}

class CrearVentaDto {
  @IsIn(Object.values(MetodoPago))
  metodo_pago: MetodoPago;

  @IsOptional()
  @IsIn(Object.values(TipoComprobante))
  tipo_comprobante?: TipoComprobante;

  @IsOptional()
  @IsIn(Object.values(FormatoImpresion))
  formato_impresion?: FormatoImpresion;

  @IsOptional()
  @IsUUID()
  cliente_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VentaItemDto)
  items: VentaItemDto[];
}

@Controller("ventas")
export class VentasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar(
    @Query("cajaSesionId") cajaSesionId?: string,
    @Query("fechaInicio") fechaInicio?: string,
    @Query("fechaFin") fechaFin?: string,
    @Query("vendedorId") vendedorId?: string
  ) {
    const where: Record<string, unknown> = {};
    if (cajaSesionId) where.caja_sesion_id = cajaSesionId;
    if (vendedorId) where.vendedor_id = vendedorId;
    if (fechaInicio || fechaFin) {
      where.creado_en = {
        ...(fechaInicio ? { gte: new Date(fechaInicio) } : {}),
        ...(fechaFin ? { lte: new Date(fechaFin) } : {}),
      };
    }

    return this.prisma.venta.findMany({
      where,
      include: {
        items: { include: { producto: { select: { nombre: true } } } },
        vendedor: { select: { nombre: true } },
        cliente: { select: { nombre: true } },
      },
      orderBy: { creado_en: "desc" },
    });
  }

  @Get("detalle/:id")
  obtener(id: string) {
    return this.prisma.venta.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            producto: { select: { nombre: true, unidad_medida: true } },
          },
        },
        vendedor: { select: { nombre: true } },
        cajaSesion: { select: { id: true, abierta_en: true } },
      },
    });
  }

  @Post()
  async crear(@Body() dto: CrearVentaDto, @Req() request: AuthenticatedRequest) {
    const vendedorId = request.user?.sub;
    if (!vendedorId) throw new UnauthorizedException();

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("La venta debe tener al menos un ítem");
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. La venta requiere una caja abierta del vendedor
      const caja = await tx.cajaSesion.findFirst({
        where: { usuario_id: vendedorId, estado: "abierta" },
      });
      if (!caja) {
        throw new BadRequestException(
          "No tienes una caja abierta. Abre tu turno antes de vender."
        );
      }

      // 2. Pre-validar stock y calcular total con precios actuales
      const detalles: Array<{
        producto_id: string;
        cantidad: number;
        precio_unitario: number;
      }> = [];
      let total = 0;

      for (const item of dto.items) {
        const producto = await tx.producto.findUnique({
          where: { id: item.producto_id },
        });
        if (!producto || !producto.activo) {
          throw new BadRequestException("Producto no encontrado o inactivo");
        }
        if (Number(producto.stock) < item.cantidad) {
          throw new BadRequestException(
            `Stock insuficiente para "${producto.nombre}": disponible ${producto.stock}, solicitado ${item.cantidad}`
          );
        }
        const precio = Number(producto.precio);
        total += precio * item.cantidad;
        detalles.push({
          producto_id: item.producto_id,
          cantidad: item.cantidad,
          precio_unitario: precio,
        });
      }

      // 3. Crear venta + items
      const venta = await tx.venta.create({
        data: {
          caja_sesion_id: caja.id,
          vendedor_id: vendedorId,
          cliente_id: dto.cliente_id,
          metodo_pago: dto.metodo_pago,
          tipo_comprobante: dto.tipo_comprobante ?? TipoComprobante.nota_venta,
          formato_impresion: dto.formato_impresion ?? FormatoImpresion.termica,
          total,
          items: {
            create: detalles.map((d) => ({
              producto_id: d.producto_id,
              cantidad: d.cantidad,
              precio_unitario: d.precio_unitario,
            })),
          },
        },
        include: {
          items: {
            include: {
              producto: { select: { nombre: true, unidad_medida: true } },
            },
          },
        },
      });

      // 4. Descontar stock de forma atómica (concurrencia)
      for (const detalle of detalles) {
        const resultado = await tx.producto.updateMany({
          where: {
            id: detalle.producto_id,
            stock: { gte: detalle.cantidad },
          },
          data: { stock: { decrement: detalle.cantidad } },
        });
        if (resultado.count === 0) {
          throw new BadRequestException(
            "El stock cambió durante la venta. Reintenta."
          );
        }
      }

      return venta;
    });
  }
}