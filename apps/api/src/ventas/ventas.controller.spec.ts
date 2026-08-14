import { Test } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { VentasController } from "./ventas.controller";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";
import { MetodoPago, TipoComprobante, FormatoImpresion, RolUsuario } from "@prisma/client";

describe("VentasController", () => {
  let controller: VentasController;
  let prisma: ReturnType<typeof createPrismaMock>;

  const martillo = {
    id: "prod-1",
    nombre: "Martillo de uña 16oz",
    precio: 28.5,
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
      metodo_pago: MetodoPago.yape,
      items: [{ producto_id: "prod-1", cantidad: 2 }],
    };

    it("crea una venta y descuenta stock", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(cajaAbierta);
      prisma.producto.findUnique.mockResolvedValue(martillo);
      prisma.venta.create.mockResolvedValue({
        id: "venta-1",
        total: 57,
        items: [],
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
          where: expect.objectContaining({ id: "prod-1", stock: { gte: 2 } }),
          data: { stock: { decrement: 2 } },
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
          { metodo_pago: MetodoPago.yape, items: [] } as never,
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

    it("calcula el total correctamente (precio × cantidad)", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(cajaAbierta);
      prisma.producto.findUnique.mockResolvedValue(martillo);
      prisma.producto.updateMany.mockResolvedValue({ count: 1 });
      prisma.venta.create.mockImplementation(async ({ data }) => ({
        id: "venta-1",
        ...data,
      }));

      await controller.crear(
        {
          metodo_pago: MetodoPago.efectivo,
          items: [
            { producto_id: "prod-1", cantidad: 3 },
          ],
        } as never,
        { user: { sub: "vendedor-1" } } as never
      );

      expect(prisma.venta.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ total: 85.5 }),
        })
      );
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

    it("permite ventas de unidades fraccionadas (metros)", async () => {
      const cable = {
        id: "prod-2",
        nombre: "Cable eléctrico 3x2.5mm",
        precio: 4.8,
        stock: 200,
        activo: true,
      };
      prisma.cajaSesion.findFirst.mockResolvedValue(cajaAbierta);
      prisma.producto.findUnique.mockResolvedValue(cable);
      prisma.venta.create.mockResolvedValue({ id: "venta-2" } as never);
      prisma.producto.updateMany.mockResolvedValue({ count: 1 });

      const result = await controller.crear(
        {
          metodo_pago: MetodoPago.efectivo,
          items: [{ producto_id: "prod-2", cantidad: 1.5 }],
        } as never,
        { user: { sub: "vendedor-1" } } as never
      );

      expect(prisma.producto.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ stock: { gte: 1.5 } }),
        })
      );
      expect(result).toBeDefined();
    });

    it("usa tipo_comprobante y formato por defecto si no se envían", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(cajaAbierta);
      prisma.producto.findUnique.mockResolvedValue(martillo);
      prisma.producto.updateMany.mockResolvedValue({ count: 1 });
      prisma.venta.create.mockImplementation(async ({ data }) => ({ id: "v", ...data }));

      await controller.crear(baseDto as never, {
        user: { sub: "vendedor-1" },
      } as never);

      expect(prisma.venta.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo_comprobante: TipoComprobante.nota_venta,
            formato_impresion: FormatoImpresion.termica,
            metodo_pago: MetodoPago.yape,
          }),
        })
      );
    });
  });

  describe("listar", () => {
    it("lista ventas con filtros", async () => {
      prisma.venta.findMany.mockResolvedValue([{ id: "v1" }]);
      await controller.listar("caja-1", "2026-01-01", "2026-12-31", "user-1");
      expect(prisma.venta.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            caja_sesion_id: "caja-1",
            vendedor_id: "user-1",
            creado_en: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });
  });

  describe("obtener", () => {
    it("obtiene detalle de una venta", async () => {
      prisma.venta.findUnique.mockResolvedValue({ id: "v1", items: [] });
      const result = await controller.obtener("v1");
      expect(prisma.venta.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "v1" } })
      );
      expect(result).toEqual({ id: "v1", items: [] });
    });
  });
});
