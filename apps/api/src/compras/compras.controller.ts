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
import { RolUsuario } from "@prisma/client";
import {
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { Roles } from "../auth/roles.decorator";
import { AuthenticatedRequest } from "../auth/authenticated-request";
import { PrismaService } from "../prisma/prisma.service";

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompraItemDto)
  items: CompraItemDto[];
}

@Controller("compras")
export class ComprasController {
  constructor(private readonly prisma: PrismaService) {}

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

  @Post()
  @Roles(RolUsuario.administrador)
  async crear(@Body() dto: CrearCompraDto, @Req() request: AuthenticatedRequest) {
    const usuarioId = request.user?.sub;
    if (!usuarioId) throw new UnauthorizedException();
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("La compra debe tener al menos un ítem");
    }

    return this.prisma.$transaction(async (tx) => {
      const total = dto.items.reduce(
        (sum, item) => sum + item.cantidad * item.costo_unitario,
        0
      );

      const compra = await tx.compra.create({
        data: {
          proveedor_nombre: dto.proveedor_nombre,
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
              producto: { select: { nombre: true } },
            },
          },
        },
      });

      for (const item of dto.items) {
        await tx.producto.update({
          where: { id: item.producto_id },
          data: {
            stock: { increment: item.cantidad },
            costo: item.costo_unitario,
          },
        });
      }

      return compra;
    });
  }
}