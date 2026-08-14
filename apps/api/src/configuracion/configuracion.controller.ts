import { Controller, Get, Put, Body } from "@nestjs/common";
import { RolUsuario } from "@prisma/client";
import { IsArray, IsIn, IsOptional, IsString } from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { FormatoImpresion, MetodoPago, Prisma } from "@prisma/client";

class ConfiguracionDto {
  @IsOptional()
  @IsString()
  nombre_negocio?: string;

  @IsOptional()
  @IsString()
  ruc?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  web?: string;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsIn(Object.values(FormatoImpresion))
  formato_impresion?: FormatoImpresion;

  @IsOptional()
  @IsArray()
  @IsIn(Object.values(MetodoPago), { each: true })
  metodos_pago?: MetodoPago[];

  @IsOptional()
  extras_contratados?: Record<string, unknown>;
}

@Controller("configuracion")
export class ConfiguracionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async obtener() {
    const config = await this.prisma.configuracion.findFirst();
    if (!config) {
      return this.prisma.configuracion.create({
        data: {
          id: 1,
          metodos_pago: [MetodoPago.efectivo, MetodoPago.yape, MetodoPago.plin],
          extras_contratados: {},
        },
      });
    }
    return config;
  }

  @Put()
  @Roles(RolUsuario.administrador)
  actualizar(@Body() dto: ConfiguracionDto) {
    const data: Record<string, unknown> = {};
    if (dto.nombre_negocio !== undefined) data.nombre_negocio = dto.nombre_negocio;
    if (dto.ruc !== undefined) data.ruc = dto.ruc;
    if (dto.direccion !== undefined) data.direccion = dto.direccion;
    if (dto.telefono !== undefined) data.telefono = dto.telefono;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.web !== undefined) data.web = dto.web;
    if (dto.instagram !== undefined) data.instagram = dto.instagram;
    if (dto.formato_impresion !== undefined) data.formato_impresion = dto.formato_impresion;
    if (dto.metodos_pago !== undefined) data.metodos_pago = dto.metodos_pago;
    if (dto.extras_contratados !== undefined)
      data.extras_contratados = dto.extras_contratados as Prisma.InputJsonValue;

    return this.prisma.configuracion.upsert({
      where: { id: 1 },
      update: data,
      create: {
        id: 1,
        metodos_pago: dto.metodos_pago ?? [MetodoPago.efectivo, MetodoPago.yape, MetodoPago.plin],
        extras_contratados: (dto.extras_contratados ?? {}) as Prisma.InputJsonValue,
      },
    });
  }
}