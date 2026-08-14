import { Test } from "@nestjs/testing";
import { ClientesController } from "./clientes.controller";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";

describe("ClientesController", () => {
  let controller: ClientesController;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module = await Test.createTestingModule({
      controllers: [ClientesController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<ClientesController>(ClientesController);
  });

  it("lista clientes", async () => {
    prisma.cliente.findMany.mockResolvedValue([{ id: "cl-1", nombre: "Juan" }]);
    const result = await controller.listar();
    expect(prisma.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { creado_en: "desc" } })
    );
    expect(result).toHaveLength(1);
  });

  it("busca clientes por query", async () => {
    prisma.cliente.findMany.mockResolvedValue([]);
    await controller.listar("Juan");
    expect(prisma.cliente.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      })
    );
  });

  it("crea un cliente", async () => {
    prisma.cliente.create.mockResolvedValue({ id: "cl-1" });
    await controller.crear({ nombre: "Juan", dni_ruc: "12345678" } as never);
    expect(prisma.cliente.create).toHaveBeenCalledWith({
      data: { nombre: "Juan", dni_ruc: "12345678" },
    });
  });

  it("actualiza un cliente", async () => {
    prisma.cliente.update.mockResolvedValue({ id: "cl-1" });
    await controller.actualizar("cl-1", { telefono: "999888777" } as never);
    expect(prisma.cliente.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cl-1" },
        data: { telefono: "999888777" },
      })
    );
  });
});
