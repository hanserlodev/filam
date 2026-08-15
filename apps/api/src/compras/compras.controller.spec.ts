import { Test } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { ComprasController } from "./compras.controller";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";
import { PrecioHistoricoService } from "../inventario/precio-historico.service";

describe("ComprasController", () => {
  let controller: ComprasController;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.producto.findUnique.mockResolvedValue({
      id: "p1",
      unidad_medida: "unidad",
      stock: 10,
      costo: 4,
      precio: 8,
    });
    prisma.producto.update.mockResolvedValue({ id: "p1" });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(prisma)
    );
    const module = await Test.createTestingModule({
      controllers: [ComprasController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        {
          provide: PrecioHistoricoService,
          useValue: { registrar: jest.fn(), costoPromedio: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<ComprasController>(ComprasController);
  });

  it("lanza Unauthorized si no hay usuario", async () => {
    await expect(controller.crear({ items: [] } as never, {} as never)).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("lanza BadRequest si no hay items", async () => {
    await expect(
      controller.crear({ items: [] } as never, { user: { sub: "u1" } } as never)
    ).rejects.toThrow(BadRequestException);
  });

  it("crea la compra, registra movimiento e incrementa stock y costo", async () => {
    prisma.compra.create.mockResolvedValue({ id: "compra-1", items: [] });
    prisma.inventarioMovimiento.create.mockResolvedValue({ id: "mov-1" });

    await controller.crear(
      {
        proveedor_nombre: "Distribuidora ABC",
        items: [
          { producto_id: "p1", cantidad: 10, costo_unitario: 5 },
          { producto_id: "p2", cantidad: 4, costo_unitario: 3 },
        ],
      } as never,
      { user: { sub: "u1" } } as never
    );

    expect(prisma.compra.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          proveedor_nombre: "Distribuidora ABC",
          usuario_id: "u1",
          total: expect.anything(),
        }),
      })
    );
    // Se registra movimiento de inventario por cada producto.
    expect(prisma.inventarioMovimiento.create).toHaveBeenCalled();
    // Stock actualizado con costo nuevo.
    expect(prisma.producto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: { costo: expect.anything() },
      })
    );
  });

  it("lista compras con filtro por proveedor", async () => {
    prisma.compra.findMany.mockResolvedValue([{ id: "c1" }]);
    const result = await controller.listar("ABC");
    expect(prisma.compra.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          proveedor_nombre: { contains: "ABC", mode: "insensitive" },
        }),
      })
    );
    expect(result).toHaveLength(1);
  });

  describe("anular", () => {
    it("lanza BadRequest sin motivo", async () => {
      await expect(
        controller.anular("compra-1", { motivo: "" } as never, {
          user: { sub: "u1" },
        } as never)
      ).rejects.toThrow("motivo");
    });

    it("anula la compra y revierte stock con movimiento", async () => {
      prisma.compra.findUnique.mockResolvedValue({
        id: "compra-1",
        estado: "registrada",
        items: [
          { producto_id: "p1", cantidad: { toNumber: () => 10, negated: () => ({ toNumber: () => -10 }) } },
        ],
      });
      prisma.producto.findUnique.mockResolvedValue({
        id: "p1",
        stock: 20,
      });
      prisma.producto.update.mockResolvedValue({ id: "p1" });
      prisma.inventarioMovimiento.create.mockResolvedValue({ id: "mov-1" });
      prisma.compra.update.mockResolvedValue({
        id: "compra-1",
        estado: "anulada",
      });

      const result = await controller.anular(
        "compra-1",
        { motivo: "error de recepción" } as never,
        { user: { sub: "u1" } } as never
      );

      expect(prisma.inventarioMovimiento.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: "devolucion_proveedor",
            compra_id: "compra-1",
          }),
        })
      );
      expect(prisma.compra.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "compra-1" },
          data: expect.objectContaining({ estado: "anulada" }),
        })
      );
      expect(result).toBeDefined();
    });
  });
});
