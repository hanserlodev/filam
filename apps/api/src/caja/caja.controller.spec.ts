import { Test } from "@nestjs/testing";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { CajaController } from "./caja.controller";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";
import { MetodoPago } from "@prisma/client";

describe("CajaController", () => {
  let controller: CajaController;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) =>
      fn(prisma)
    );
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
            monto_apertura: expect.anything(),
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

  describe("registrarMovimiento", () => {
    it("registra un ingreso en la caja abierta", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue({ id: "caja-1" });
      prisma.venta.findMany.mockResolvedValue([]);
      prisma.cajaMovimiento.findMany.mockResolvedValue([]);
      prisma.cajaMovimiento.create.mockResolvedValue({ id: "mov-1" });

      const result = await controller.registrarMovimiento(
        { tipo: "ingreso", monto: 50, motivo: "devolución de sencillo" } as never,
        { user: { sub: "user-1" } } as never
      );

      expect(prisma.cajaMovimiento.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caja_sesion_id: "caja-1",
            tipo: "ingreso",
            monto: expect.anything(),
            motivo: "devolución de sencillo",
            usuario_id: "user-1",
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it("no permite retirar más de lo que hay en caja", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue({
        id: "caja-1",
        monto_apertura: 100,
      });
      prisma.venta.findMany.mockResolvedValue([]);
      prisma.cajaMovimiento.findMany.mockResolvedValue([]);

      await expect(
        controller.registrarMovimiento(
          { tipo: "retiro", monto: 150, motivo: "gasolina" } as never,
          { user: { sub: "user-1" } } as never
        )
      ).rejects.toThrow("No puedes retirar más");
    });

    it("permite retirar dentro del efectivo esperado", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue({
        id: "caja-1",
        monto_apertura: 100,
      });
      prisma.venta.findMany.mockResolvedValue([]);
      prisma.cajaMovimiento.findMany.mockResolvedValue([]);
      prisma.cajaMovimiento.create.mockResolvedValue({ id: "mov-1" });

      await expect(
        controller.registrarMovimiento(
          { tipo: "retiro", monto: 50, motivo: "gasolina" } as never,
          { user: { sub: "user-1" } } as never
        )
      ).resolves.toBeDefined();
    });

    it("bloquea la fila de caja antes de calcular el efectivo (concurrencia)", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue({
        id: "caja-1",
        monto_apertura: 100,
      });
      prisma.venta.findMany.mockResolvedValue([]);
      prisma.cajaMovimiento.findMany.mockResolvedValue([]);
      prisma.cajaMovimiento.create.mockResolvedValue({ id: "mov-1" });

      await controller.registrarMovimiento(
        { tipo: "retiro", monto: 50, motivo: "gasolina" } as never,
        { user: { sub: "user-1" } } as never
      );

      expect(prisma.$queryRaw).toHaveBeenCalled();
    });

    it("lanza BadRequest si no hay caja abierta", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(null);
      await expect(
        controller.registrarMovimiento(
          { tipo: "ingreso", monto: 10, motivo: "prueba" } as never,
          { user: { sub: "user-1" } } as never
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("cerrar", () => {
    const sesionAbierta = {
      id: "caja-1",
      usuario_id: "user-1",
      estado: "abierta",
      monto_apertura: 200,
      ventas: [
        { total: 57, metodo_pago: MetodoPago.efectivo, anulada: false },
        { total: 28.5, metodo_pago: MetodoPago.yape, anulada: false },
      ],
    };

    function mockResumenCaja() {
      // Venta.findMany se usa en el resumen con pagos incluidos.
      prisma.venta.findMany.mockResolvedValue([
        {
          total: 57,
          metodo_pago: MetodoPago.efectivo,
          anulada: false,
          pagos: [{ metodo_pago: MetodoPago.efectivo, monto: 57 }],
        },
        {
          total: 28.5,
          metodo_pago: MetodoPago.yape,
          anulada: false,
          pagos: [{ metodo_pago: MetodoPago.yape, monto: 28.5 }],
        },
      ]);
      prisma.cajaMovimiento.findMany.mockResolvedValue([]);
      prisma.configuracion.findFirst.mockResolvedValue({
        umbral_diferencia: 10,
      });
    }

    it("cierra la caja calculando la diferencia con desglose", async () => {
      prisma.cajaSesion.findUnique.mockResolvedValue(sesionAbierta);
      mockResumenCaja();
      prisma.cajaSesion.updateMany.mockResolvedValue({ count: 1 });
      prisma.cajaSesion.findUnique.mockResolvedValueOnce(sesionAbierta).mockResolvedValueOnce({
        ...sesionAbierta,
        estado: "cerrada",
        monto_cierre: 257,
        diferencia: 0,
      });

      const result = await controller.cerrar(
        "caja-1",
        { monto_cierre: 257 } as never,
        { user: { sub: "user-1" } } as never
      );

      // efectivo esperado = 200 + 57 efectivo = 257; declarado 257 → diferencia 0
      expect(prisma.cajaSesion.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "caja-1", usuario_id: "user-1", estado: "abierta" },
          data: expect.objectContaining({
            monto_cierre: expect.anything(),
            diferencia: expect.anything(),
            monto_esperado: expect.anything(),
            monto_operativo: expect.anything(),
            estado: "cerrada",
            cerrada_en: expect.any(Date),
          }),
        })
      );
      expect(result).toBeDefined();
    });

    it("persiste monto_esperado como efectivo y monto_operativo como total con digital", async () => {
      prisma.cajaSesion.findUnique.mockResolvedValue(sesionAbierta);
      mockResumenCaja();
      prisma.cajaSesion.updateMany.mockResolvedValue({ count: 1 });
      prisma.cajaSesion.findUnique.mockResolvedValueOnce(sesionAbierta).mockResolvedValueOnce({
        ...sesionAbierta,
        estado: "cerrada",
      });

      await controller.cerrar(
        "caja-1",
        { monto_cierre: 257 } as never,
        { user: { sub: "user-1" } } as never
      );

      const data = prisma.cajaSesion.updateMany.mock.calls[0][0].data;
      // efectivo esperado = 200 + 57 = 257; operativo = 200 + 57 + 28.5 = 285.5
      expect(data.monto_esperado.toString()).toBe("257");
      expect(data.monto_operativo.toString()).toBe("285.5");
    });

    it("exige motivo si la diferencia supera el umbral", async () => {
      prisma.cajaSesion.findUnique.mockResolvedValue(sesionAbierta);
      mockResumenCaja();

      await expect(
        controller.cerrar(
          "caja-1",
          { monto_cierre: 200 } as never,
          { user: { sub: "user-1" } } as never
        )
      ).rejects.toThrow("supera el umbral");
    });

    it("acepta cierre con motivo si la diferencia supera el umbral", async () => {
      prisma.cajaSesion.findUnique.mockResolvedValue(sesionAbierta);
      mockResumenCaja();
      prisma.cajaSesion.updateMany.mockResolvedValue({ count: 1 });
      prisma.cajaSesion.findUnique
        .mockResolvedValueOnce(sesionAbierta)
        .mockResolvedValueOnce({ ...sesionAbierta, estado: "cerrada" });

      await expect(
        controller.cerrar(
          "caja-1",
          { monto_cierre: 200, motivo_diferencia: "faltó vuelto" } as never,
          { user: { sub: "user-1" } } as never
        )
      ).resolves.toBeDefined();
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

    it("lanza BadRequest si la actualización atómica no afecta filas", async () => {
      prisma.cajaSesion.findUnique.mockResolvedValue(sesionAbierta);
      mockResumenCaja();
      prisma.cajaSesion.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        controller.cerrar(
          "caja-1",
          { monto_cierre: 257 } as never,
          { user: { sub: "user-1" } } as never
        )
      ).rejects.toThrow("ya fue cerrada");    });
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

    it("devuelve la caja abierta con resumen", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue({
        id: "c1",
        monto_apertura: 200,
      });
      prisma.venta.findMany.mockResolvedValue([]);
      prisma.cajaMovimiento.findMany.mockResolvedValue([]);
      const result = await controller.miCajaAbierta({
        user: { sub: "user-1" },
      } as never);
      expect(result).toBeTruthy();
    });

    it("devuelve null si no hay caja abierta", async () => {
      prisma.cajaSesion.findFirst.mockResolvedValue(null);
      const result = await controller.miCajaAbierta({
        user: { sub: "user-1" },
      } as never);
      expect(result).toBeNull();
    });
  });
});
