import { createHash } from "node:crypto";
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
  Prisma,
  TipoComprobante,
  UnidadMedida,
} from "@prisma/client";
import {
  IsArray,
  IsIn,
  isISO8601,
  IsNumber,
  IsOptional,
  isUUID,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedRequest } from "../auth/authenticated-request";
import { toDecimal, toMoney } from "../common/decimal";
import { registrarMovimientoInventario } from "../inventario/inventario-movimiento.helper";
import { bloquearCaja } from "../caja/caja-lock.helper";

class VentaItemDto {
  @IsUUID()
  producto_id: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  cantidad: number;
}

class VentaPagoDto {
  @IsIn(Object.values(MetodoPago))
  metodo_pago: MetodoPago;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  monto: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referencia?: string;
}

class CrearVentaDto {
  @IsOptional()
  @IsIn(Object.values(TipoComprobante))
  tipo_comprobante?: TipoComprobante;

  @IsOptional()
  @IsIn(Object.values(FormatoImpresion))
  formato_impresion?: FormatoImpresion;

  @IsOptional()
  @IsUUID()
  cliente_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotency_key?: string;

  // Total final que el cajero acuerda con el cliente (regateo).
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  total_final: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo_descuento?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VentaItemDto)
  items: VentaItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VentaPagoDto)
  pagos: VentaPagoDto[];
}

class AnularVentaDto {
  @IsString()
  @MaxLength(300)
  motivo: string;
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
    @Query("soloActivas") soloActivas?: string,
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
    if (soloActivas === "true") {
      where.anulada = false;
    }
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
        pagos: true,
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
        pagos: true,
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
    if (!dto.pagos || dto.pagos.length === 0) {
      throw new BadRequestException(
        "La venta debe tener al menos un método de pago"
      );
    }
    if (dto.total_final <= 0) {
      throw new BadRequestException("El total final debe ser mayor a cero");
    }
    if (dto.motivo_descuento && dto.motivo_descuento.trim().length < 3) {
      throw new BadRequestException(
        "El motivo del descuento debe tener al menos 3 caracteres"
      );
    }

    // Idempotencia: si ya se registró esta clave, devuelve la venta original.
    // La garantía real la da el índice único + manejo de P2002 dentro de la
    // transacción (F1.5); este check solo evita trabajo innecesario.
    if (dto.idempotency_key) {
      const existente = await this.prisma.venta.findUnique({
        where: { idempotency_key: dto.idempotency_key },
      });
      if (existente) return existente;
    }

    // Hash canónico del payload para detectar reutilización con otro contenido.
    const idempotencyHash = dto.idempotency_key
      ? createHash("sha256")
          .update(
            JSON.stringify({
              items: dto.items.map((i) => [i.producto_id, i.cantidad]),
              pagos: dto.pagos.map((p) => [p.metodo_pago, p.monto]),
              total_final: dto.total_final,
              tipo_comprobante: dto.tipo_comprobante,
              cliente_id: dto.cliente_id,
            })
          )
          .digest("hex")
      : null;

    return this.prisma.$transaction(
      async (tx) => {
        const caja = await tx.cajaSesion.findFirst({
          where: { usuario_id: vendedorId, estado: "abierta" },
        });
      if (!caja) {
        throw new BadRequestException(
          "No tienes una caja abierta. Abre tu turno antes de vender."
        );
      }

      // Bloquea la fila de caja: impide que una venta se registre mientras
      // otra transacción está cerrando la caja (F1.3). Serializa con retiros
      // y cierres concurrentes de la misma caja.
      await bloquearCaja(tx, caja.id);

      // Pre-validar stock, precio de lista y costo snapshot.
      const detalles: Array<{
        producto_id: string;
        cantidad: Prisma.Decimal;
        precio_lista: Prisma.Decimal;
        costo_unitario: Prisma.Decimal | null;
      }> = [];
      let subtotal = new Prisma.Decimal(0);
      let bajoCosto = false;

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
        const precioLista = toMoney(producto.precio);
        subtotal = subtotal.plus(precioLista.mul(cantidad));
        const costo = producto.costo != null ? toMoney(producto.costo) : null;
        detalles.push({
          producto_id: item.producto_id,
          cantidad,
          precio_lista: precioLista,
          costo_unitario: costo,
        });
      }

      const subtotalVenta = toMoney(subtotal);
      const totalFinal = toMoney(dto.total_final);
      const descuentoMonto = toMoney(subtotalVenta.minus(totalFinal));

      if (descuentoMonto.lt(0)) {
        throw new BadRequestException(
          "El total final no puede superar el subtotal de los productos"
        );
      }
      if (descuentoMonto.gt(0) && !dto.motivo_descuento) {
        throw new BadRequestException(
          "Indica el motivo del descuento para registrar la venta"
        );
      }

      // Detectar venta bajo costo (total final < costo total de los ítems).
      let costoTotal = new Prisma.Decimal(0);
      for (const detalle of detalles) {
        if (detalle.costo_unitario != null) {
          costoTotal = costoTotal.plus(
            detalle.costo_unitario.mul(detalle.cantidad)
          );
        }
      }
      bajoCosto = totalFinal.lt(toMoney(costoTotal));

      // Validar que los pagos sumen el total final.
      const totalPagos = dto.pagos.reduce(
        (sum, p) => sum.plus(toMoney(p.monto)),
        new Prisma.Decimal(0)
      );
      if (!totalPagos.eq(totalFinal)) {
        throw new BadRequestException(
          `La suma de pagos (S/ ${totalPagos}) no coincide con el total de la venta (S/ ${totalFinal})`
        );
      }

      const metodoPrincipal = dto.pagos[0].metodo_pago;

      // Generar correlativo de boleta/factura (serie + número secuencial).
      const tipoComprobante =
        dto.tipo_comprobante ?? TipoComprobante.nota_venta;
      let serie: string | null = null;
      let numeroCorrelativo: number | null = null;
      let comprobanteRef: string | null = null;

      if (
        tipoComprobante === TipoComprobante.boleta ||
        tipoComprobante === TipoComprobante.factura
      ) {
        serie = tipoComprobante === TipoComprobante.factura ? "F001" : "B001";
        // Secuencia PostgreSQL: nextval() es atómico, elimina la carrera de
        // MAX+1 lógico y garantiza correlativos únicos bajo concurrencia (F1.4).
        // `serie` es un valor controlado (B001/F001), seguro para SQL crudo.
        const fila = await tx.$queryRaw<Array<{ siguiente: number }>>(
          Prisma.raw(`SELECT nextval('correlativo_${serie}')::int AS siguiente`)
        );
        numeroCorrelativo = fila[0]?.siguiente ?? 0;
        comprobanteRef = `${serie}-${String(numeroCorrelativo).padStart(8, "0")}`;
      }

      let venta: Awaited<ReturnType<typeof tx.venta.create>>;
      try {
        venta = await tx.venta.create({
        data: {
          caja_sesion_id: caja.id,
          vendedor_id: vendedorId,
          cliente_id: dto.cliente_id,
          metodo_pago: metodoPrincipal,
          tipo_comprobante: tipoComprobante,
          serie,
          numero_correlativo: numeroCorrelativo,
          comprobante_ref: comprobanteRef,
          formato_impresion: dto.formato_impresion ?? FormatoImpresion.termica,
          subtotal: subtotalVenta,
          descuento_monto: descuentoMonto,
          motivo_descuento: descuentoMonto.gt(0) ? dto.motivo_descuento : null,
          venta_bajo_costo: bajoCosto,
          total: totalFinal,
          idempotency_key: dto.idempotency_key || null,
          idempotency_hash: idempotencyHash,
          items: {
            create: detalles.map((d, idx) => {
              // Factor de descuento aplicado proporcionalmente a cada ítem.
              const importeLista = d.precio_lista.mul(d.cantidad);
              const descuentoItem = subtotalVenta.isZero()
                ? new Prisma.Decimal(0)
                : importeLista.mul(descuentoMonto).div(subtotalVenta);
              const importeFinal = importeLista.minus(descuentoItem);
              let precioFinal = importeFinal.div(d.cantidad);

              // Ajuste de redondeo: el último ítem absorbe la diferencia
              // para que la suma de importes coincida exactamente con el total.
              if (idx === detalles.length - 1) {
                const sumaPrevia = detalles
                  .slice(0, idx)
                  .reduce(
                    (sum, prev, prevIdx) => {
                      const impLista = prev.precio_lista.mul(prev.cantidad);
                      const descPrev = subtotalVenta.isZero()
                        ? new Prisma.Decimal(0)
                        : impLista.mul(descuentoMonto).div(subtotalVenta);
                      return sum.plus(impLista.minus(descPrev));
                    },
                    new Prisma.Decimal(0)
                  );
                const resto = totalFinal.minus(sumaPrevia);
                precioFinal = resto.div(d.cantidad);
              }

              precioFinal = precioFinal.toDecimalPlaces(2);
              return {
                producto_id: d.producto_id,
                cantidad: d.cantidad,
                precio_lista: d.precio_lista,
                descuento_monto: importeLista
                  .minus(precioFinal.mul(d.cantidad))
                  .toDecimalPlaces(2),
                precio_unitario: precioFinal,
                costo_unitario: d.costo_unitario,
              };
            }),
          },
          pagos: {
            create: dto.pagos.map((p) => ({
              metodo_pago: p.metodo_pago,
              monto: toMoney(p.monto),
              referencia: p.referencia,
            })),
          },
        },
        include: {
          items: {
            include: {
              producto: { select: { nombre: true, unidad_medida: true } },
            },
          },
          pagos: true,
        },
        });
      } catch (error) {
        // Conflicto de idempotencia (índice único): otra petición con la misma
        // clave ganó la carrera. Devolvemos la venta original en vez de fallar.
        const esP2002 = (error as { code?: string }).code === "P2002";
        if (esP2002 && dto.idempotency_key) {
          const existente = await tx.venta.findUnique({
            where: { idempotency_key: dto.idempotency_key },
            include: {
              items: {
                include: {
                  producto: { select: { nombre: true, unidad_medida: true } },
                },
              },
              pagos: true,
            },
          });
          if (existente) return existente;
        }
        throw error;
      }

      // Descontar stock con movimiento de inventario (atómico).
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
        const producto = await tx.producto.findUnique({
          where: { id: detalle.producto_id },
          select: { stock: true },
        });
        await tx.inventarioMovimiento.create({
          data: {
            producto_id: detalle.producto_id,
            tipo: "venta",
            cantidad: detalle.cantidad.negated(),
            stock_anterior: toDecimal(producto?.stock ?? 0).plus(detalle.cantidad),
            stock_posterior: toDecimal(producto?.stock ?? 0),
            motivo: "venta",
            usuario_id: vendedorId,
            venta_id: venta.id,
          },
        });
      }

      return venta;
      },
      { timeout: 20000 }
    );
  }

  @Post("anular/:id")
  async anular(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AnularVentaDto,
    @Req() request: AuthenticatedRequest
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();
    if (!dto.motivo || dto.motivo.trim().length < 3) {
      throw new BadRequestException(
        "Debes indicar un motivo válido para anular la venta"
      );
    }

    const usuario = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: { rol: true, activo: true },
    });
    if (!usuario || !usuario.activo) throw new UnauthorizedException();

    return this.prisma.$transaction(async (tx) => {
      const venta = await tx.venta.findFirst({
        where: { id },
        include: { items: true },
      });
      if (!venta) throw new NotFoundException("Venta no encontrada");

      if (usuario.rol === "cajero") {
        const caja = await tx.cajaSesion.findFirst({
          where: { usuario_id: usuarioId, estado: "abierta" },
        });
        if (!caja || caja.id !== venta.caja_sesion_id) {
          throw new BadRequestException(
            "Solo puedes anular ventas de tu caja abierta actual"
          );
        }
        if (venta.vendedor_id !== usuarioId) {
          throw new BadRequestException(
            "Solo puedes anular tus propias ventas"
          );
        }
      }

      // Claim atómico: solo una transacción concurrente puede marcar la venta
      // como anulada. Si ya lo estaba (count 0), aborta antes de revertir stock.
      const claim = await tx.venta.updateMany({
        where: { id, anulada: false },
        data: {
          anulada: true,
          anulada_en: new Date(),
          anulada_por_id: usuarioId,
          motivo_anulacion: dto.motivo,
        },
      });
      if (claim.count === 0) {
        throw new BadRequestException("Esta venta ya fue anulada");
      }

      // Revertir stock con movimiento.
      for (const item of venta.items) {
        await registrarMovimientoInventario({
          tx,
          productoId: item.producto_id,
          tipo: "anulacion_venta",
          cantidad: item.cantidad.toNumber(),
          motivo: dto.motivo,
          usuarioId,
          ventaId: id,
        });
      }

      return tx.venta.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              producto: { select: { nombre: true, unidad_medida: true } },
            },
          },
          pagos: true,
        },
      });
      },
      { timeout: 20000 }
    );
  }
}
