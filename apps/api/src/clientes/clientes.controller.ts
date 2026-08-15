import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { RolUsuario } from "@prisma/client";
import { IsOptional, IsString } from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";

class ClienteDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  dni_ruc?: string;

  @IsOptional()
  @IsString()
  telefono?: string;
}

@Controller("clientes")
export class ClientesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(RolUsuario.administrador)
  listar(@Query("q") q?: string, @Query("limit") limit?: string) {
    const limite = Math.min(Math.max(Number(limit) || 100, 1), 500);
    return this.prisma.cliente.findMany({
      where: q
        ? {
            OR: [
              { nombre: { contains: q, mode: "insensitive" } },
              { dni_ruc: { contains: q, mode: "insensitive" } },
              { telefono: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      include: { _count: { select: { ventas: true } } },
      orderBy: { creado_en: "desc" },
      take: limite,
    });
  }

  @Post()
  @Roles(RolUsuario.administrador)
  crear(@Body() dto: ClienteDto) {
    return this.prisma.cliente.create({ data: dto });
  }

  @Patch(":id")
  @Roles(RolUsuario.administrador)
  actualizar(@Param("id", ParseUUIDPipe) id: string, @Body() dto: ClienteDto) {
    return this.prisma.cliente.update({ where: { id }, data: dto });
  }
}