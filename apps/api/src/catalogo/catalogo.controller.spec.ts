import { Test } from "@nestjs/testing";
import { CatalogoController } from "./catalogo.controller";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";

describe("CatalogoController", () => {
  let controller: CatalogoController;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module = await Test.createTestingModule({
      controllers: [CatalogoController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<CatalogoController>(CatalogoController);
  });

  it("devuelve catálogo completo con datos del negocio", async () => {
    prisma.configuracion.findFirst.mockResolvedValue({
      nombre_negocio: "FILAM — Tuberías PVC y Ferretería",
      ruc: "20412345678",
      direccion: "Carretera Central KM 10.5",
      telefono: "950 307 510",
      email: "ventas@filamcentroplast.com",
      web: "https://filamcentroplast.com",
      instagram: "@filamcentroplast",
      metodos_pago: ["efectivo", "yape", "plin"],
    });
    prisma.categoria.findMany.mockResolvedValue([
      { id: "c1", nombre: "Tuberías PVC" },
    ]);
    prisma.producto.findMany.mockResolvedValue([
      {
        id: "p1",
        nombre: "Tubo PVC 2\"",
        precio: 24,
        stock: { gt: () => true },
        activo: true,
        categoria_id: "c1",
      },
    ]);

    const result = await controller.catalogo();

    expect(result.negocio).toEqual({
      nombre: "FILAM — Tuberías PVC y Ferretería",
      ruc: "20412345678",
      direccion: "Carretera Central KM 10.5",
      telefono: "950 307 510",
      email: "ventas@filamcentroplast.com",
      web: "https://filamcentroplast.com",
      instagram: "@filamcentroplast",
      metodos_pago: ["efectivo", "yape", "plin"],
    });
    expect(result.categorias).toHaveLength(1);
    expect(result.productos).toHaveLength(1);
    expect(result.total_productos).toBe(1);
  });

  it("usa valores por defecto si no hay configuración", async () => {
    prisma.configuracion.findFirst.mockResolvedValue(null);
    prisma.categoria.findMany.mockResolvedValue([]);
    prisma.producto.findMany.mockResolvedValue([]);

    const result = await controller.catalogo();
    expect(result.negocio.nombre).toBe("Ferretería FILAM");
    expect(result.negocio.metodos_pago).toEqual(["efectivo"]);
    expect(result.total_productos).toBe(0);
  });
});
