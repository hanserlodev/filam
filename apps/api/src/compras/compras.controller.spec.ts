import { Test } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { ComprasController } from "./compras.controller";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";

describe("ComprasController", () => {
  let controller: ComprasController;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.producto.findUnique.mockResolvedValue({ unidad_medida: "unidad" });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(prisma)
    );
    const module = await Test.createTestingModule({
      controllers: [ComprasController],
      providers: [{ provide: PrismaService, useValue: prisma }],
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

  it("crea la compra, calcula total e incrementa stock y costo", async () => {
    prisma.compra.create.mockResolvedValue({ id: "compra-1", items: [] });
    prisma.producto.update.mockResolvedValue({ id: "p1" });

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
          total: expect.anything(), // 10*5 + 4*3
        }),
      })
    );
    // stock incrementado en ambos productos
    expect(prisma.producto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: { stock: { increment: 10 }, costo: 5 },
      })
    );
    expect(prisma.producto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p2" },
        data: { stock: { increment: 4 }, costo: 3 },
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
});
