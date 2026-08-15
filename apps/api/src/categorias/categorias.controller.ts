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
import { IsBoolean, IsInt, IsOptional, IsString, MinLength } from "class-validator";
import { Roles } from "../auth/roles.decorator";
import { PrismaService } from "../prisma/prisma.service";

class CrearCategoriaDto {
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsInt()
  orden?: number;
}

class ActualizarCategoriaDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  nombre?: string;

  @IsOptional()
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsBoolean()
  activa?: boolean;
}

@Controller("categorias")
export class CategoriasController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  listar() {
    return this.prisma.categoria.findMany({
      orderBy: [{ activa: "desc" }, { orden: "asc" }],
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
    @Body() dto: ActualizarCategoriaDto
  ) {
    return this.prisma.categoria.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        orden: dto.orden,
        activa: dto.activa,
      },
    });
  }

  /**
   * No elimina categorías con productos: las archiva (activa = false).
   * Solo elimina físicamente si no tiene productos.
   */
  @Delete(":id")
  @Roles(RolUsuario.administrador)
  async eliminar(@Param("id", ParseUUIDPipe) id: string) {
    const conProductos = await this.prisma.categoria.count({
      where: { id, productos: { some: {} } },
    });
    if (conProductos > 0) {
      return this.prisma.categoria.update({
        where: { id },
        data: { activa: false },
      });
    }
    return this.prisma.categoria.delete({ where: { id } });
  }
}
