import { Test } from "@nestjs/testing";
import { ReportesController } from "./reportes.controller";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";

describe("ReportesController", () => {
  let controller: ReportesController;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.producto.fields = { stock_minimo: "stock_minimo" };
    const module = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<ReportesController>(ReportesController);
  });

  describe("resumen", () => {
    it("devuelve el resumen con ventas del día, conteos y stock bajo", async () => {
      prisma.venta.findMany.mockResolvedValue([
        { total: 57, metodo_pago: "yape" },
        { total: 28.5, metodo_pago: "efectivo" },
      ]);
      prisma.venta.count.mockResolvedValue(10);
      prisma.producto.count
        .mockResolvedValueOnce(27) // total productos
        .mockResolvedValueOnce(3); // stock bajo
      prisma.cliente.count.mockResolvedValue(5);

      const result = await controller.resumen();

      expect(result.ventas_hoy).toBe(85.5);
      expect(result.cantidad_ventas_hoy).toBe(2);
      expect(result.ventas_por_metodo_hoy).toEqual({
        yape: 57,
        efectivo: 28.5,
      });
      expect(result.total_ventas_historicas).toBe(10);
      expect(result.total_productos).toBe(27);
      expect(result.productos_stock_bajo).toBe(3);
      expect(result.total_clientes).toBe(5);
    });

    it("devuelve ceros si no hay ventas hoy", async () => {
      prisma.venta.findMany.mockResolvedValue([]);
      prisma.venta.count.mockResolvedValue(0);
      prisma.producto.count.mockResolvedValue(0).mockResolvedValue(0);
      prisma.cliente.count.mockResolvedValue(0);

      const result = await controller.resumen();
      expect(result.ventas_hoy).toBe(0);
      expect(result.cantidad_ventas_hoy).toBe(0);
    });
  });

  describe("ventasPorDia", () => {
    it("devuelve ventas por día en el rango", async () => {
      prisma.venta.findMany.mockResolvedValue([
        { total: 100, creado_en: new Date("2026-08-14T10:00:00Z") },
        { total: 50, creado_en: new Date("2026-08-14T15:00:00Z") },
      ]);

      const result = await controller.ventasPorDia("7");

      expect(result).toHaveLength(7);
      const hoy = result[6];
      expect(hoy.total).toBe(150);
      expect(hoy.cantidad).toBe(2);
    });

    it("limita a 90 días máximo", async () => {
      prisma.venta.findMany.mockResolvedValue([]);
      const result = await controller.ventasPorDia("500");
      expect(result.length).toBe(90);
    });
  });

  describe("topProductos", () => {
    it("devuelve top productos con ingreso estimado", async () => {
      prisma.ventaItem.groupBy.mockResolvedValue([
        { producto_id: "p1", _sum: { cantidad: 5 }, _count: 3 },
      ]);
      prisma.producto.findMany.mockResolvedValue([
        { id: "p1", nombre: "Martillo", precio: 28.5 },
      ]);

      const result = await controller.topProductos("10");

      expect(result).toHaveLength(1);
      expect(result[0].nombre).toBe("Martillo");
      expect(result[0].cantidad_vendida).toBe(5);
      expect(result[0].ingreso_estimado).toBe(28.5 * 5);
    });

    it("maneja productos sin nombre (desconocido)", async () => {
      prisma.ventaItem.groupBy.mockResolvedValue([
        { producto_id: "p9", _sum: { cantidad: 1 }, _count: 1 },
      ]);
      prisma.producto.findMany.mockResolvedValue([]);

      const result = await controller.topProductos();
      expect(result[0].nombre).toBe("Desconocido");
    });
  });

  describe("stockBajo", () => {
    it("lista productos con stock bajo", async () => {
      prisma.producto.findMany.mockResolvedValue([{ id: "p1" }]);
      const result = await controller.stockBajo();
      expect(prisma.producto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            activo: true,
            stock: { lte: "stock_minimo" },
          }),
          orderBy: { stock: "asc" },
        })
      );
      expect(result).toHaveLength(1);
    });
  });
});
