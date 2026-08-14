import { Test } from "@nestjs/testing";
import { ConfiguracionController } from "./configuracion.controller";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";

describe("ConfiguracionController", () => {
  let controller: ConfiguracionController;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module = await Test.createTestingModule({
      controllers: [ConfiguracionController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<ConfiguracionController>(ConfiguracionController);
  });

  it("obtiene la configuración existente", async () => {
    prisma.configuracion.findFirst.mockResolvedValue({
      id: 1,
      nombre_negocio: "FILAM",
      metodos_pago: ["efectivo", "yape"],
    });
    const result = await controller.obtener();
    expect(result.nombre_negocio).toBe("FILAM");
    expect(prisma.configuracion.findFirst).toHaveBeenCalled();
  });

  it("crea configuración por defecto si no existe", async () => {
    prisma.configuracion.findFirst.mockResolvedValue(null);
    prisma.configuracion.create.mockResolvedValue({
      id: 1,
      metodos_pago: ["efectivo", "yape", "plin"],
    });
    const result = await controller.obtener();
    expect(prisma.configuracion.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ id: 1 }),
      })
    );
    expect(result).toBeDefined();
  });

  it("actualiza solo los campos enviados", async () => {
    prisma.configuracion.upsert.mockResolvedValue({ id: 1 });
    await controller.actualizar({ nombre_negocio: "FILAM PVC" } as never);

    expect(prisma.configuracion.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        update: expect.objectContaining({ nombre_negocio: "FILAM PVC" }),
      })
    );
  });

  it("actualiza campos de contacto", async () => {
    prisma.configuracion.upsert.mockResolvedValue({ id: 1 });
    await controller.actualizar({
      email: "ventas@filamcentroplast.com",
      web: "https://filamcentroplast.com",
      instagram: "@filamcentroplast",
    } as never);

    expect(prisma.configuracion.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          email: "ventas@filamcentroplast.com",
          web: "https://filamcentroplast.com",
          instagram: "@filamcentroplast",
        }),
      })
    );
  });
});
