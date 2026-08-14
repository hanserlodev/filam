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
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import {
  FormatoImpresion,
  MetodoPago,
  TipoComprobante,
  UnidadMedida,
  Prisma,
} from "@prisma/client";
import {
  IsArray,
  isISO8601,
  isUUID,
  IsIn,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedRequest } from "../auth/authenticated-request";
import { toDecimal, toMoney } from "../common/decimal";

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
  async listar(
    @Query("cajaSesionId") cajaSesionId?: string,
    @Query("fechaInicio") fechaInicio?: string,
    @Query("fechaFin") fechaFin?: string,
    @Query("vendedorId") vendedorId?: string,
    @Req() request?: AuthenticatedRequest
  ) {
    const usuarioId = request?.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { rol: true, activo: true },
    });
    if (!usuario || !usuario.activo) throw new UnauthorizedException();

    const where: Record<string, unknown> = {};
    if (cajaSesionId) {
      if (!isUUID(cajaSesionId)) {
        throw new BadRequestException("cajaSesionId debe ser un UUID válido");
      }
      where.caja_sesion_id = cajaSesionId;
    }
    if (vendedorId && !isUUID(vendedorId)) {
      throw new BadRequestException("vendedorId debe ser un UUID válido");
    }
    where.vendedor_id = usuario.rol === "administrador" ? vendedorId : usuarioId;
    if (fechaInicio || fechaFin) {
      if (
        (fechaInicio && !isISO8601(fechaInicio)) ||
        (fechaFin && !isISO8601(fechaFin))
      ) {
        throw new BadRequestException("Las fechas deben estar en formato ISO válido");
      }
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
  async obtener(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request: AuthenticatedRequest
  ) {
    const usuario = request.user;
    if (!usuario?.sub) throw new UnauthorizedException();

    const vendedor = await this.prisma.usuario.findUnique({
      where: { id: usuario.sub },
      select: { rol: true, activo: true },
    });
    if (!vendedor || !vendedor.activo) throw new UnauthorizedException();

    const venta = await this.prisma.venta.findFirst({
      where: {
        id,
        ...(vendedor.rol === "administrador"
          ? {}
          : { vendedor_id: usuario.sub }),
      },
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
    if (!venta) throw new NotFoundException("Venta no encontrada");
    return venta;
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
        cantidad: Prisma.Decimal;
        precio_unitario: Prisma.Decimal;
      }> = [];
      let total = new Prisma.Decimal(0);

      for (const item of dto.items) {
        const cantidad = toDecimal(item.cantidad);
        const producto = await tx.producto.findUnique({
          where: { id: item.producto_id },
        });
        if (!producto || !producto.activo) {
          throw new BadRequestException("Producto no encontrado o inactivo");
        }
        if (
          (producto.unidad_medida === UnidadMedida.unidad ||
            producto.unidad_medida === UnidadMedida.caja) &&
          !cantidad.isInteger()
        ) {
          throw new BadRequestException(
            `"${producto.nombre}" solo se vende en cantidades enteras`
          );
        }
        if (toDecimal(producto.stock).lt(cantidad)) {
          throw new BadRequestException(
            `Stock insuficiente para "${producto.nombre}": disponible ${producto.stock}, solicitado ${cantidad}`
          );
        }
        const precio = toMoney(producto.precio);
        total = total.plus(precio.mul(cantidad));
        detalles.push({
          producto_id: item.producto_id,
          cantidad,
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
          total: toMoney(total),
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
