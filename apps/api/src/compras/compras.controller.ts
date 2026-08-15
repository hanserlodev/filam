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
  EstadoCompra,
  Prisma,
  RolUsuario,
  TipoDocumentoCompra,
  UnidadMedida,
} from "@prisma/client";
import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { Roles } from "../auth/roles.decorator";
import { AuthenticatedRequest } from "../auth/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import { toDecimal, toMoney } from "../common/decimal";
import { registrarMovimientoInventario } from "../inventario/inventario-movimiento.helper";
import { PrecioHistoricoService } from "../inventario/precio-historico.service";

class CompraItemDto {
  @IsUUID()
  producto_id: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  cantidad: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo_unitario: number;
}

class CrearCompraDto {
  @IsOptional()
  @IsString()
  proveedor_nombre?: string;

  @IsOptional()
  @IsIn(Object.values(TipoDocumentoCompra))
  documento_tipo?: TipoDocumentoCompra;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  documento_numero?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  nota_recepcion?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompraItemDto)
  items: CompraItemDto[];
}

class ProductoRapidoDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsOptional()
  @IsString()
  codigo_barras?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsIn(Object.values(UnidadMedida))
  unidad_medida?: UnidadMedida;

  @IsOptional()
  @IsUUID()
  categoria_id?: string;
}

class AnularCompraDto {
  @IsString()
  @MaxLength(300)
  motivo: string;
}

@Controller("compras")
export class ComprasController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly precioHistorico: PrecioHistoricoService
  ) {}

  @Get()
  @Roles(RolUsuario.administrador)
  listar(@Query("proveedor") proveedor?: string) {
    return this.prisma.compra.findMany({
      where: proveedor
        ? { proveedor_nombre: { contains: proveedor, mode: "insensitive" } }
        : undefined,
      include: {
        items: { include: { producto: { select: { nombre: true } } } },
        usuario: { select: { nombre: true } },
      },
      orderBy: { creado_en: "desc" },
    });
  }

  @Get(":id")
  @Roles(RolUsuario.administrador)
  async obtener(@Param("id", ParseUUIDPipe) id: string) {
    const compra = await this.prisma.compra.findUnique({
      where: { id },
      include: {
        items: {
          include: { producto: { select: { nombre: true, sku: true, codigo_barras: true } } },
        },
        usuario: { select: { nombre: true } },
      },
    });
    if (!compra) throw new NotFoundException("Compra no encontrada");
    return compra;
  }

  /**
   * Crea un producto rápidamente durante la recepción de mercadería.
   * Nace con stock 0; el stock entra por la compra.
   */
  @Post("producto-rapido")
  @Roles(RolUsuario.administrador)
  async crearProductoRapido(
    @Body() dto: ProductoRapidoDto,
    @Req() request: AuthenticatedRequest
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();

    let sku = dto.sku;
    if (!sku) {
      sku = dto.codigo_barras || `SKU-${Date.now().toString(36).toUpperCase()}`;
    }

    const producto = await this.prisma.producto.create({
      data: {
        nombre: dto.nombre,
        codigo_barras: dto.codigo_barras,
        sku,
        precio: dto.precio ?? 0,
        costo: dto.costo,
        stock: 0,
        unidad_medida: dto.unidad_medida ?? UnidadMedida.unidad,
        categoria_id: dto.categoria_id,
      },
      include: { categoria: true },
    });

    await this.precioHistorico.registrar(producto.id, {
      costoAnterior: null,
      costoNuevo: dto.costo ?? null,
      precioAnterior: null,
      precioNuevo: dto.precio ?? null,
      origen: "creacion_rapida",
      usuarioId,
    });

    return producto;
  }

  @Post()
  @Roles(RolUsuario.administrador)
  async crear(@Body() dto: CrearCompraDto, @Req() request: AuthenticatedRequest) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("La compra debe tener al menos un ítem");
    }

    return this.prisma.$transaction(
      async (tx) => {
        for (const item of dto.items) {
          const producto = await tx.producto.findUnique({
            where: { id: item.producto_id },
          });
          if (!producto) {
            throw new BadRequestException("Producto no encontrado");
          }
          if (
            (producto.unidad_medida === UnidadMedida.unidad ||
              producto.unidad_medida === UnidadMedida.caja) &&
            !toDecimal(item.cantidad).isInteger()
          ) {
            throw new BadRequestException(
              "Los productos por unidad o caja requieren cantidades enteras"
            );
          }
        }

        const total = toMoney(
          dto.items.reduce(
            (sum, item) =>
              sum.plus(toDecimal(item.cantidad).mul(toMoney(item.costo_unitario))),
            new Prisma.Decimal(0)
          )
        );

        const compra = await tx.compra.create({
          data: {
            proveedor_nombre: dto.proveedor_nombre,
            documento_tipo: dto.documento_tipo,
            documento_numero: dto.documento_numero,
            nota_recepcion: dto.nota_recepcion,
            usuario_id: usuarioId,
            total,
            items: {
              create: dto.items.map((item) => ({
                producto_id: item.producto_id,
                cantidad: item.cantidad,
                costo_unitario: item.costo_unitario,
              })),
            },
          },
          include: {
            items: {
              include: {
                producto: { select: { nombre: true, sku: true } },
              },
            },
          },
        });

        // Registrar stock con movimiento y actualizar costo + historial.
        for (const item of dto.items) {
          const producto = await tx.producto.findUnique({
            where: { id: item.producto_id },
          });
          await registrarMovimientoInventario({
            tx,
            productoId: item.producto_id,
            tipo: "compra",
            cantidad: item.cantidad,
            motivo: "recepcion de mercaderia",
            usuarioId,
            compraId: compra.id,
          });

          if (producto) {
            await tx.producto.update({
              where: { id: item.producto_id },
              data: { costo: toMoney(item.costo_unitario) },
            });
            await this.precioHistorico.registrar(producto.id, {
              costoAnterior: producto.costo,
              costoNuevo: item.costo_unitario,
              precioAnterior: producto.precio,
              precioNuevo: producto.precio,
              origen: "compra",
              usuarioId,
            });
          }
        }

        return compra;
      },
      { timeout: 20000 }
    );
  }

  /**
   * Anula o devuelve una compra. Resta el stock recibido y registra el
   * movimiento inverso. Cajero y admin pueden hacerlo, con motivo obligatorio.
   */
  @Post(":id/anular")
  async anular(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AnularCompraDto,
    @Req() request: AuthenticatedRequest
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();
    if (!dto.motivo || dto.motivo.trim().length < 3) {
      throw new BadRequestException(
        "Debes indicar un motivo válido para anular la compra"
      );
    }

    return this.prisma.$transaction(
      async (tx) => {
        const compra = await tx.compra.findUnique({
          where: { id },
          include: { items: true },
        });
      if (!compra) throw new NotFoundException("Compra no encontrada");
      if (compra.estado !== EstadoCompra.registrada) {
        throw new BadRequestException("Esta compra ya fue anulada o devuelta");
      }

      // Claim atómico: solo una transacción concurrente puede anular la compra.
      const claim = await tx.compra.updateMany({
        where: { id, estado: EstadoCompra.registrada },
        data: {
          estado: EstadoCompra.anulada,
          anulada_en: new Date(),
          anulada_por_id: usuarioId,
          motivo_anulacion: dto.motivo,
        },
      });
      if (claim.count === 0) {
        throw new BadRequestException("Esta compra ya fue anulada o devuelta");
      }

      for (const item of compra.items) {
        await registrarMovimientoInventario({
          tx,
          productoId: item.producto_id,
          tipo: "devolucion_proveedor",
          cantidad: -item.cantidad.toNumber(),
          motivo: dto.motivo,
          usuarioId,
          compraId: id,
        });
      }

      return tx.compra.findUnique({
        where: { id },
        include: { items: true },
      });
      },
      { timeout: 20000 }
    );
  }
}
