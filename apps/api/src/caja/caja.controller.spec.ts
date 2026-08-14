import { Test } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { CajaController } from "./caja.controller";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";
import { RolUsuario } from "@prisma/client";

describe("CajaController", () => {
  let controller: CajaController;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module = await Test.createTestingModule({
      controllers: [CajaController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<CajaController>(CajaController);
  });

  describe("abrir", () => {
    it("abre una caja cuando no hay otra abierta", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(null);
      prisma.cajaSesion.create.mockResolvedValue({
        id: "caja-1",
        usuario_id: "user-1",
        monto_apertura: 200,
        estado: "abierta",
      });

      const result = await controller.abrir(
        { monto_apertura: 200 } as never,
        { user: { sub: "user-1" } } as never
      );

      expect(prisma.cajaSesion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            usuario_id: "user-1",
            monto_apertura: 200,
          }),
        })
      );
      expect(result.estado).toBe("abierta");
    });

    it("lanza BadRequest si ya hay una caja abierta", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue({ id: "caja-existente" });

      await expect(
        controller.abrir(
          { monto_apertura: 200 } as never,
          { user: { sub: "user-1" } } as never
        )
      ).rejects.toThrow(BadRequestException);
    });

    it("lanza Unauthorized si no hay usuario autenticado", async () => {
      await expect(
        controller.abrir({ monto_apertura: 200 } as never, {} as never)
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe("cerrar", () => {
    const sesionAbierta = {
      id: "caja-1",
      usuario_id: "user-1",
      estado: "abierta",
      monto_apertura: 200,
      ventas: [{ total: 57 }, { total: 28.5 }],
    };

    it("cierra la caja calculando la diferencia", async () => {
      prisma.cajaSesion.findUnique.mockResolvedValue(sesionAbierta);
      prisma.cajaSesion.update.mockResolvedValue({
        ...sesionAbierta,
        monto_cierre: 285.5,
        diferencia: 0,
        estado: "cerrada",
      });

      const result = await controller.cerrar(
        "caja-1",
        { monto_cierre: 285.5 } as never,
        { user: { sub: "user-1" } } as never
      );

      // total vendido = 85.5; calculado = 200 + 85.5 = 285.5; diferencia = 0
      expect(prisma.cajaSesion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "caja-1" },
          data: expect.objectContaining({
            monto_cierre: 285.5,
            diferencia: 0,
            estado: "cerrada",
            cerrada_en: expect.any(Date),
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it("registra diferencia negativa si falta dinero", async () => {
      prisma.cajaSesion.findUnique.mockResolvedValue(sesionAbierta);
      prisma.cajaSesion.update.mockImplementation(async ({ data }) => ({
        ...sesionAbierta,
        ...data,
      }));

      await controller.cerrar(
        "caja-1",
        { monto_cierre: 280 } as never,
        { user: { sub: "user-1" } } as never
      );

      // 285.5 calculado - 280 cierre = 5.5 de diferencia (sobra / faltante = -? )
      expect(prisma.cajaSesion.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ diferencia: 5.5 }),
        })
      );
    });

    it("lanza BadRequest si la caja no existe", async () => {
      prisma.cajaSesion.findUnique.mockResolvedValue(null);
      await expect(
        controller.cerrar(
          "caja-no-existe",
          { monto_cierre: 100 } as never,
          { user: { sub: "user-1" } } as never
        )
      ).rejects.toThrow(BadRequestException);
    });

    it("lanza BadRequest si la caja ya está cerrada", async () => {
      prisma.cajaSesion.findUnique.mockResolvedValue({
        ...sesionAbierta,
        estado: "cerrada",
      });
      await expect(
        controller.cerrar(
          "caja-1",
          { monto_cierre: 100 } as never,
          { user: { sub: "user-1" } } as never
        )
      ).rejects.toThrow(BadRequestException);
    });

    it("lanza BadRequest si otro usuario intenta cerrar la caja", async () => {
      prisma.cajaSesion.findUnique.mockResolvedValue({
        ...sesionAbierta,
        usuario_id: "otro-usuario",
      });
      await expect(
        controller.cerrar(
          "caja-1",
          { monto_cierre: 100 } as never,
          { user: { sub: "user-1" } } as never
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("mis-sesiones y abierta", () => {
    it("lista mis sesiones", async () => {
      prisma.cajaSesion.findMany.mockResolvedValue([{ id: "c1" }]);
      const result = await controller.listarMisSesiones({
        user: { sub: "user-1" },
      } as never);
      expect(prisma.cajaSesion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usuario_id: "user-1" } })
      );
      expect(result).toHaveLength(1);
    });

    it("lanza Unauthorized en mis-sesiones sin usuario", () => {
      expect(() => controller.listarMisSesiones({} as never)).toThrow(
        UnauthorizedException
      );
    });

    it("devuelve la caja abierta del usuario", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue({ id: "c1" });
      const result = await controller.miCajaAbierta({
        user: { sub: "user-1" },
      } as never);
      expect(result).toEqual({ id: "c1" });
    });

    it("devuelve null si no hay caja abierta", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(null);
      const result = await controller.miCajaAbierta({
        user: { sub: "user-1" },
      } as never);
      expect(result).toBeNull();
    });

    it("lista sesiones como administrador", async () => {
      prisma.cajaSesion.findMany.mockResolvedValue([{ id: "c1" }]);
      const result = await controller.listarSesiones("user-1", "abierta");
      expect(prisma.cajaSesion.findMany).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });
});
