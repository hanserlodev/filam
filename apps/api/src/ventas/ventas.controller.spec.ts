import { Test } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { VentasController } from "./ventas.controller";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";
import { MetodoPago, TipoComprobante, FormatoImpresion } from "@prisma/client";

describe("VentasController", () => {
  let controller: VentasController;
  let prisma: ReturnType<typeof createPrismaMock>;

  const martillo = {
    id: "prod-1",
    nombre: "Martillo de uña 16oz",
    precio: 28.5,
    costo: 18,
    stock: 25,
    activo: true,
  };

  const cajaAbierta = {
    id: "caja-1",
    usuario_id: "vendedor-1",
    estado: "abierta",
    monto_apertura: 200,
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(prisma)
    );

    const module = await Test.createTestingModule({
      controllers: [VentasController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<VentasController>(VentasController);
  });

  describe("crear", () => {
    const baseDto = {
      pagos: [{ metodo_pago: MetodoPago.yape, monto: 57 }],
      total_final: 57,
      items: [{ producto_id: "prod-1", cantidad: 2 }],
    };

    it("crea una venta y descuenta stock", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(cajaAbierta);
      prisma.producto.findUnique.mockResolvedValue(martillo);
      prisma.venta.create.mockResolvedValue({
        id: "venta-1",
        total: 57,
        items: [],
        pagos: [],
        metodo_pago: MetodoPago.yape,
        tipo_comprobante: TipoComprobante.nota_venta,
        formato_impresion: FormatoImpresion.termica,
        creado_en: new Date(),
      });
      prisma.producto.updateMany.mockResolvedValue({ count: 1 });

      const result = await controller.crear(
        baseDto as never,
        { user: { sub: "vendedor-1" } } as never
      );

      expect(prisma.cajaSesion.findFirst).toHaveBeenCalled();
      expect(prisma.venta.create).toHaveBeenCalled();
      expect(prisma.producto.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: "prod-1", stock: { gte: expect.anything() } }),
          data: { stock: { decrement: expect.anything() } },
        })
      );
      expect(result).toBeDefined();
    });

    it("lanza Unauthorized si no hay vendedor en el token", async () => {
      await expect(controller.crear(baseDto as never, {} as never)).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("lanza BadRequest si no hay items", async () => {
      await expect(
        controller.crear(
          { pagos: [{ metodo_pago: MetodoPago.yape, monto: 57 }], items: [] } as never,
          { user: { sub: "vendedor-1" } } as never
        )
      ).rejects.toThrow(BadRequestException);
    });

    it("lanza BadRequest si no hay pagos", async () => {
      await expect(
        controller.crear(
          { pagos: [], items: [{ producto_id: "prod-1", cantidad: 2 }] } as never,
          { user: { sub: "vendedor-1" } } as never
        )
      ).rejects.toThrow(BadRequestException);
    });

    it("lanza BadRequest si no hay caja abierta", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(null);
      await expect(
        controller.crear(baseDto as never, { user: { sub: "vendedor-1" } } as never)
      ).rejects.toThrow(BadRequestException);
    });

    it("lanza BadRequest si el producto no existe o está inactivo", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(cajaAbierta);
      prisma.producto.findUnique.mockResolvedValue(null);

      await expect(
        controller.crear(baseDto as never, { user: { sub: "vendedor-1" } } as never)
      ).rejects.toThrow(BadRequestException);
    });

    it("lanza BadRequest si el stock es insuficiente", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(cajaAbierta);
      prisma.producto.findUnique.mockResolvedValue({ ...martillo, stock: 1 });

      await expect(
        controller.crear(baseDto as never, { user: { sub: "vendedor-1" } } as never)
      ).rejects.toThrow(BadRequestException);
    });

    it("lanza BadRequest si la suma de pagos no coincide con el total", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(cajaAbierta);
      prisma.producto.findUnique.mockResolvedValue(martillo);

      await expect(
        controller.crear(
          {
            pagos: [{ metodo_pago: MetodoPago.yape, monto: 50 }],
            total_final: 57,
            items: [{ producto_id: "prod-1", cantidad: 2 }],
          } as never,
          { user: { sub: "vendedor-1" } } as never
        )
      ).rejects.toThrow("no coincide con el total");
    });

    it("acepta pagos mixtos (efectivo + yape) si suman el total", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(cajaAbierta);
      prisma.producto.findUnique.mockResolvedValue(martillo);
      prisma.venta.create.mockImplementation(async ({ data }) => ({
        id: "venta-mixta",
        ...data,
      }));
      prisma.producto.updateMany.mockResolvedValue({ count: 1 });

      await controller.crear(
        {
          pagos: [
            { metodo_pago: MetodoPago.efectivo, monto: 20 },
            { metodo_pago: MetodoPago.yape, monto: 37 },
          ],
          total_final: 57,
          items: [{ producto_id: "prod-1", cantidad: 2 }],
        } as never,
        { user: { sub: "vendedor-1" } } as never
      );

      expect(prisma.venta.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            total: expect.anything(),
            pagos: {
              create: expect.arrayContaining([
                expect.objectContaining({ metodo_pago: MetodoPago.efectivo, monto: expect.anything() }),
                expect.objectContaining({ metodo_pago: MetodoPago.yape, monto: expect.anything() }),
              ]),
            },
          }),
        })
      );
    });

    it("permite ventas de unidades fraccionadas (metros)", async () => {
      const cable = {
        id: "prod-2",
        nombre: "Cable eléctrico 3x2.5mm",
        precio: 4.8,
        costo: 3,
        stock: 200,
        activo: true,
      };
      prisma.cajaSesion.findFirst.mockResolvedValue(cajaAbierta);
      prisma.producto.findUnique.mockResolvedValue(cable);
      prisma.venta.create.mockResolvedValue({ id: "venta-2" } as never);
      prisma.producto.updateMany.mockResolvedValue({ count: 1 });

      const result = await controller.crear(
        {
          pagos: [{ metodo_pago: MetodoPago.efectivo, monto: 7.2 }],
          total_final: 7.2,
          items: [{ producto_id: "prod-2", cantidad: 1.5 }],
        } as never,
        { user: { sub: "vendedor-1" } } as never
      );

      expect(prisma.producto.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ stock: { gte: expect.anything() } }),
        })
      );
      expect(result).toBeDefined();
    });

    it("lanza BadRequest si el stock cambió durante la venta (updateMany count 0)", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(cajaAbierta);
      prisma.producto.findUnique.mockResolvedValue(martillo);
      prisma.venta.create.mockResolvedValue({ id: "venta-1" } as never);
      prisma.producto.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        controller.crear(baseDto as never, { user: { sub: "vendedor-1" } } as never)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("listar", () => {
    it("lista ventas con filtros", async () => {
      prisma.venta.findMany.mockResolvedValue([{ id: "v1" }]);
      prisma.usuario.findUnique.mockResolvedValue({ rol: "administrador", activo: true });
      await controller.listar(
        "00000000-0000-4000-8000-000000000001",
        "2026-01-01",
        "2026-12-31",
        "00000000-0000-4000-8000-000000000002",
        undefined,
        { user: { sub: "admin-1" } } as never
      );
      expect(prisma.venta.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            caja_sesion_id: "00000000-0000-4000-8000-000000000001",
            vendedor_id: "00000000-0000-4000-8000-000000000002",
            creado_en: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it("restringe al cajero sus propias ventas", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "cajero", activo: true });
      prisma.venta.findMany.mockResolvedValue([]);

      await controller.listar(undefined, undefined, undefined, "00000000-0000-4000-8000-000000000003", undefined, {
        user: { sub: "cajero-1" },
      } as never);

      expect(prisma.venta.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ vendedor_id: "cajero-1" }),
        })
      );
    });

    it("filtra solo ventas activas si se pide", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "administrador", activo: true });
      prisma.venta.findMany.mockResolvedValue([]);
      await controller.listar(undefined, undefined, undefined, undefined, "true", {
        user: { sub: "admin-1" },
      } as never);
      expect(prisma.venta.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ anulada: false }),
        })
      );
    });
  });

  describe("obtener", () => {
    it("obtiene detalle de una venta", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "administrador", activo: true });
      prisma.venta.findFirst.mockResolvedValue({ id: "v1", items: [] });
      const result = await controller.obtener("v1", { user: { sub: "admin-1" } } as never);
      expect(prisma.venta.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "v1" } })
      );
      expect(result).toEqual({ id: "v1", items: [] });
    });

    it("no permite al cajero consultar una venta ajena", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "cajero", activo: true });
      prisma.venta.findFirst.mockResolvedValue(null);

      await expect(
        controller.obtener("v1", { user: { sub: "cajero-1" } } as never)
      ).rejects.toThrow("Venta no encontrada");
    });
  });

  describe("anular", () => {
    const ventaConItems = {
      id: "venta-1",
      caja_sesion_id: "caja-1",
      vendedor_id: "vendedor-1",
      anulada: false,
      items: [{ producto_id: "prod-1", cantidad: 2 }],
    };

    it("lanza BadRequest si no hay motivo", async () => {
      await expect(
        controller.anular("venta-1", { motivo: "" } as never, {
          user: { sub: "vendedor-1" },
        } as never)
      ).rejects.toThrow("motivo");
    });

    it("lanza BadRequest si la venta ya está anulada", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "administrador", activo: true });
      prisma.venta.findFirst.mockResolvedValue({ ...ventaConItems, anulada: true });
      await expect(
        controller.anular("venta-1", { motivo: "cliente se arrepintió" } as never, {
          user: { sub: "admin-1" },
        } as never)
      ).rejects.toThrow("ya fue anulada");
    });

    it("el administrador puede anular cualquier venta y revierte stock", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "administrador", activo: true });
      prisma.venta.findFirst.mockResolvedValue({
        ...ventaConItems,
        items: [{ producto_id: "prod-1", cantidad: { toNumber: () => 2, negated: () => ({ toNumber: () => -2 }) } }],
      });
      prisma.producto.findUnique.mockResolvedValue({ id: "prod-1", stock: 23 });
      prisma.producto.update.mockResolvedValue({ id: "prod-1" });
      prisma.venta.update.mockResolvedValue({ ...ventaConItems, anulada: true });
      prisma.inventarioMovimiento.create.mockResolvedValue({ id: "mov-1" });

      await controller.anular("venta-1", { motivo: "error de cobro" } as never, {
        user: { sub: "admin-1" },
      } as never);

      expect(prisma.producto.update).toHaveBeenCalled();
      expect(prisma.inventarioMovimiento.create).toHaveBeenCalled();
      expect(prisma.venta.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "venta-1" },
          data: expect.objectContaining({
            anulada: true,
            anulada_por_id: "admin-1",
            motivo_anulacion: "error de cobro",
          }),
        })
      );
    });

    it("el cajero solo puede anular ventas de su caja abierta actual", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "cajero", activo: true });
      prisma.venta.findFirst.mockResolvedValue(ventaConItems);
      prisma.cajaSesion.findFirst.mockResolvedValue({ id: "otra-caja" });

      await expect(
        controller.anular("venta-1", { motivo: "error" } as never, {
          user: { sub: "vendedor-1" },
        } as never)
      ).rejects.toThrow("caja abierta actual");
    });

    it("el cajero no puede anular ventas ajenas", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "cajero", activo: true });
      prisma.venta.findFirst.mockResolvedValue({
        ...ventaConItems,
        vendedor_id: "otro-vendedor",
      });
      prisma.cajaSesion.findFirst.mockResolvedValue(cajaAbierta);

      await expect(
        controller.anular("venta-1", { motivo: "error" } as never, {
          user: { sub: "vendedor-1" },
        } as never)
      ).rejects.toThrow("tus propias ventas");
    });

    it("lanza NotFound si la venta no existe", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "administrador", activo: true });
      prisma.venta.findFirst.mockResolvedValue(null);
      await expect(
        controller.anular("no-existe", { motivo: "error" } as never, {
          user: { sub: "admin-1" },
        } as never)
      ).rejects.toThrow("Venta no encontrada");
    });
  });
});
