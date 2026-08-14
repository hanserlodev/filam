import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/public.decorator";
import { PrismaService } from "../prisma/prisma.service";

@Controller("catalogo")
export class CatalogoController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get()
  async catalogo() {
    const [config, categorias, productosInternos] = await Promise.all([
      this.prisma.configuracion.findFirst(),
      this.prisma.categoria.findMany({
        orderBy: { orden: "asc" },
        select: { id: true, nombre: true },
      }),
      this.prisma.producto.findMany({
        where: { activo: true },
        orderBy: { nombre: "asc" },
        select: {
          id: true,
          nombre: true,
          precio: true,
          unidad_medida: true,
          stock: true,
          atributos: true,
          categoria_id: true,
        },
      }),
    ]);

    const productos = productosInternos.map(({ stock, ...producto }) => ({
      ...producto,
      disponible: stock.gt(0),
    }));

    return {
      negocio: {
        nombre: config?.nombre_negocio || "Ferretería FILAM",
        ruc: config?.ruc || null,
        direccion: config?.direccion || null,
        telefono: config?.telefono || null,
        email: config?.email || null,
        web: config?.web || null,
        instagram: config?.instagram || null,
        metodos_pago: config?.metodos_pago || ["efectivo"],
      },
      categorias,
      productos,
      total_productos: productos.length,
    };
  }
}
