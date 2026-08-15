import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { RolUsuario, UnidadMedida } from "@prisma/client";
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsUUID,
  IsString,
  Min,
  MinLength,
  MaxLength,
} from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { AuthenticatedRequest } from "../auth/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { BarcodeLookupService } from "./barcode-lookup.service";
import { PrecioHistoricoService } from "../inventario/precio-historico.service";
import { registrarMovimientoInventario } from "../inventario/inventario-movimiento.helper";

class ProductoDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsString()
  codigo_barras?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  precio?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costo?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stock_minimo?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stock_objetivo?: number;

  @IsOptional()
  @IsIn(Object.values(UnidadMedida))
  unidad_medida?: UnidadMedida;

  @IsOptional()
  @IsString()
  imagen_url?: string;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsObject()
  atributos?: Record<string, unknown>;

  @IsOptional()
  @IsUUID()
  categoria_id?: string;
}

class AjustarStockDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  cantidad: number;

  @IsString()
  @MaxLength(300)
  motivo: string;
}

@Controller("productos")
export class ProductosController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lookup: BarcodeLookupService,
    private readonly precioHistorico: PrecioHistoricoService
  ) {}

  @Get()
  async listar(
    @Query("q") q?: string,
    @Query("categoriaId") categoriaId?: string,
    @Query("stockBajo") stockBajo?: string,
    @Query("activo") activo?: string,
    @Req() request?: AuthenticatedRequest
  ) {
    const where: Record<string, unknown> = {};

    if (q) {
      where.OR = [
        { nombre: { contains: q, mode: "insensitive" } },
        { codigo_barras: { contains: q, mode: "insensitive" } },
        { sku: { contains: q, mode: "insensitive" } },
      ];
    }
    if (categoriaId) where.categoria_id = categoriaId;
    if (activo !== undefined) where.activo = activo === "true";
    if (stockBajo === "true") {
      where.stock = { lte: this.prisma.producto.fields.stock_minimo };
      where.activo = where.activo ?? true;
    }

    const productos = await this.prisma.producto.findMany({
      where,
      include: { categoria: true },
      orderBy: { nombre: "asc" },
      take: 500,
    });
    return this.sanitizarLista(productos, request?.user?.role);
  }

  @Get(":id")
  async obtener(
    @Param("id", ParseUUIDPipe) id: string,
    @Req() request?: AuthenticatedRequest
  ) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { categoria: true },
    });
    if (!producto) throw new NotFoundException("Producto no encontrado");
    return this.sanitizar(producto, request?.user?.role);
  }

  /**
   * Mínimo privilegio: un cajero no necesita ver costo, stock objetivo ni
   * datos internos de margen (AUDITORIA.md F2.3).
   */
  private sanitizar(
    producto: Record<string, unknown>,
    rol?: string
  ): Record<string, unknown> {
    if (rol === RolUsuario.administrador) return producto;
    const limpio = { ...producto };
    delete limpio.costo;
    delete limpio.stock_objetivo;
    return limpio;
  }

  private sanitizarLista(
    productos: Array<Record<string, unknown>>,
    rol?: string
  ) {
    return productos.map((p) => this.sanitizar(p, rol));
  }

  /**
   * Busca un producto por código de barras. Si no existe, consulta una fuente
   * externa (Open Food Facts) para prellenar el registro.
   */
  @Get("buscar/:codigo")
  async buscarPorCodigo(
    @Param("codigo") codigo: string,
    @Req() request?: AuthenticatedRequest
  ) {
    const producto = await this.prisma.producto.findUnique({
      where: { codigo_barras: codigo.trim() },
      include: { categoria: true },
    });
    if (producto) {
      return { encontrado: true, producto: this.sanitizar(producto, request?.user?.role) };
    }
    const datos = await this.lookup.buscar(codigo);
    return { encontrado: false, sugerencia: datos };
  }

  @Post()
  @Roles(RolUsuario.administrador)
  async crear(@Body() dto: ProductoDto, @Req() request: AuthenticatedRequest) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();
    if (!dto.nombre) throw new BadRequestException("El nombre es obligatorio");

    let sku = dto.sku;
    if (!sku) {
      sku = await this.generarSku(dto.nombre);
    }

    const producto = await this.prisma.producto.create({
      data: {
        nombre: dto.nombre,
        codigo_barras: dto.codigo_barras,
        sku,
        precio: dto.precio ?? 0,
        costo: dto.costo,
        stock: 0,
        stock_minimo: dto.stock_minimo ?? 5,
        stock_objetivo: dto.stock_objetivo,
        unidad_medida: dto.unidad_medida ?? UnidadMedida.unidad,
        imagen_url: dto.imagen_url,
        activo: dto.activo ?? true,
        atributos: (dto.atributos as Prisma.InputJsonValue) ?? {},
        categoria_id: dto.categoria_id,
      },
      include: { categoria: true },
    });

    await this.precioHistorico.registrar(producto.id, {
      costoAnterior: null,
      costoNuevo: dto.costo ?? null,
      precioAnterior: null,
      precioNuevo: dto.precio ?? null,
      origen: "creacion",
      usuarioId,
    });

    return producto;
  }

  @Patch(":id")
  @Roles(RolUsuario.administrador)
  async actualizar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ProductoDto,
    @Req() request: AuthenticatedRequest
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();

    const actual = await this.prisma.producto.findUnique({ where: { id } });
    if (!actual) throw new NotFoundException("Producto no encontrado");

    const producto = await this.prisma.producto.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        codigo_barras: dto.codigo_barras,
        sku: dto.sku,
        precio: dto.precio,
        costo: dto.costo,
        stock_minimo: dto.stock_minimo,
        stock_objetivo: dto.stock_objetivo,
        unidad_medida: dto.unidad_medida,
        imagen_url: dto.imagen_url,
        activo: dto.activo,
        atributos: dto.atributos as Prisma.InputJsonValue | undefined,
        categoria_id: dto.categoria_id,
      },
      include: { categoria: true },
    });

    await this.precioHistorico.registrar(producto.id, {
      costoAnterior: actual.costo,
      costoNuevo: dto.costo ?? actual.costo,
      precioAnterior: actual.precio,
      precioNuevo: dto.precio ?? actual.precio,
      origen: "edicion",
      usuarioId,
    });

    return producto;
  }

  /**
   * Ajuste de stock directo (merma, rotura, pérdida, conteo) — solo admin, con motivo.
   * No modifica precio ni costo.
   */
  @Post(":id/ajustar-stock")
  @Roles(RolUsuario.administrador)
  async ajustarStock(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AjustarStockDto,
    @Req() request: AuthenticatedRequest
  ) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();

    return this.prisma.$transaction(async (tx) => {
      return registrarMovimientoInventario({
        tx,
        productoId: id,
        tipo: "ajuste_conteo",
        cantidad: -dto.cantidad,
        motivo: dto.motivo,
        usuarioId,
      });
    });
  }

  private async generarSku(nombre: string): Promise<string> {
    const base = nombre
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/g, "-")
      .slice(0, 20);
    let sku = `${base}`;
    let contador = 0;
    for (let i = 0; i < 1000; i += 1) {
      const existente = await this.prisma.producto.findUnique({
        where: { sku },
      });
      if (!existente) return sku;
      contador += 1;
      sku = `${base}-${contador}`;
    }
    return sku;
  }
}
