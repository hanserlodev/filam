import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import { RolUsuario } from "@prisma/client";
import { IsInt, IsString, MinLength } from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";

class CrearCategoriaDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsInt()
  orden?: number;
}

@Controller("categorias")
export class CategoriasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar() {
    return this.prisma.categoria.findMany({
      orderBy: { orden: "asc" },
      include: { _count: { select: { productos: true } } },
    });
  }

  @Post()
  @Roles(RolUsuario.administrador)
  crear(@Body() dto: CrearCategoriaDto) {
    return this.prisma.categoria.create({
      data: { nombre: dto.nombre, orden: dto.orden ?? 0 },
    });
  }

  @Patch(":id")
  @Roles(RolUsuario.administrador)
  actualizar(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: Partial<CrearCategoriaDto>
  ) {
    return this.prisma.categoria.update({
      where: { id },
      data: dto,
    });
  }

  @Delete(":id")
  @Roles(RolUsuario.administrador)
  eliminar(@Param("id", ParseUUIDPipe) id: string) {
    return this.prisma.categoria.delete({ where: { id } });
  }
}