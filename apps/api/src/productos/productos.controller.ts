import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  NotFoundException,
} from "@nestjs/common";
import { RolUsuario, UnidadMedida } from "@prisma/client";
import {
  IsBoolean,
  IsDecimal,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";

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
  stock?: number;

  @IsOptional()
  @IsIn(Object.values(UnidadMedida))
  unidad_medida?: UnidadMedida;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  stock_minimo?: number;

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
  @IsString()
  categoria_id?: string;
}

@Controller("productos")
export class ProductosController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar(
    @Query("q") q?: string,
    @Query("categoriaId") categoriaId?: string,
    @Query("stockBajo") stockBajo?: string,
    @Query("activo") activo?: string
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

    return this.prisma.producto.findMany({
      where,
      include: { categoria: true },
      orderBy: { nombre: "asc" },
    });
  }

  @Get(":id")
  async obtener(@Param("id", ParseUUIDPipe) id: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: { categoria: true },
    });
    if (!producto) throw new NotFoundException("Producto no encontrado");
    return producto;
  }

  @Post()
  @Roles(RolUsuario.administrador)
  crear(@Body() dto: ProductoDto) {
    return this.prisma.producto.create({
      data: {
        nombre: dto.nombre!,
        codigo_barras: dto.codigo_barras,
        sku: dto.sku,
        precio: dto.precio ?? 0,
        costo: dto.costo,
        stock: dto.stock ?? 0,
        unidad_medida: dto.unidad_medida ?? UnidadMedida.unidad,
        stock_minimo: dto.stock_minimo ?? 5,
        imagen_url: dto.imagen_url,
        activo: dto.activo ?? true,
        atributos: (dto.atributos as Prisma.InputJsonValue) ?? {},
        categoria_id: dto.categoria_id,
      },
      include: { categoria: true },
    });
  }

  @Patch(":id")
  @Roles(RolUsuario.administrador)
  actualizar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ProductoDto
  ) {
    return this.prisma.producto.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        codigo_barras: dto.codigo_barras,
        sku: dto.sku,
        precio: dto.precio,
        costo: dto.costo,
        stock: dto.stock,
        unidad_medida: dto.unidad_medida,
        stock_minimo: dto.stock_minimo,
        imagen_url: dto.imagen_url,
        activo: dto.activo,
        atributos: dto.atributos as Prisma.InputJsonValue | undefined,
        categoria_id: dto.categoria_id,
      },
      include: { categoria: true },
    });
  }

  @Delete(":id")
  @Roles(RolUsuario.administrador)
  eliminar(@Param("id", ParseUUIDPipe) id: string) {
    return this.prisma.producto.delete({ where: { id } });
  }
}