import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EvidenciasController } from "./evidencias.controller";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    storage: {
      from: jest.fn(() => ({
        createSignedUrl: jest.fn(async () => ({
          data: { signedUrl: "https://signed-url.example/photo.jpg" },
          error: null,
        })),
      })),
    },
  })),
}));

describe("EvidenciasController", () => {
  let controller: EvidenciasController;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module = await Test.createTestingModule({
      controllers: [EvidenciasController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) =>
              key === "SUPABASE_URL"
                ? "https://example.supabase.co"
                : key === "SERVICE_ROLE_KEY"
                ? "service-role"
                : undefined
            ),
          },
        },
      ],
    }).compile();

    controller = module.get<EvidenciasController>(EvidenciasController);
  });

  describe("subirEvidencia", () => {
    it("lanza BadRequest si falta la ruta", async () => {
      await expect(
        controller.subirEvidencia(
          "caja-1",
          { ruta_archivo: "" } as never,
          { user: { sub: "user-1" } } as never
        )
      ).rejects.toThrow(BadRequestException);
    });

    it("lanza BadRequest si la caja está abierta", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "cajero", activo: true });
      prisma.cajaSesion.findUnique.mockResolvedValue({
        id: "caja-1",
        estado: "abierta",
      });
      await expect(
        controller.subirEvidencia(
          "caja-1",
          { ruta_archivo: "user-1/caja-1/foto.jpg" } as never,
          { user: { sub: "user-1" } } as never
        )
      ).rejects.toThrow("debe estar cerrada");
    });

    it("lanza BadRequest si un cajero sube foto de caja ajena", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "cajero", activo: true });
      prisma.cajaSesion.findUnique.mockResolvedValue({
        id: "caja-ajena",
        estado: "cerrada",
        usuario_id: "otro-usuario",
      });
      await expect(
        controller.subirEvidencia(
          "caja-ajena",
          { ruta_archivo: "user-1/caja-ajena/foto.jpg" } as never,
          { user: { sub: "user-1" } } as never
        )
      ).rejects.toThrow("No tienes acceso");
    });

    it("registra la evidencia y guarda historial de reemplazo", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "cajero", activo: true });
      prisma.cajaSesion.findUnique.mockResolvedValue({
        id: "caja-1",
        estado: "cerrada",
        usuario_id: "user-1",
      });
      prisma.cajaEvidencia.findFirst.mockResolvedValue({
        id: "evidencia-previa",
      });
      prisma.cajaEvidencia.create.mockResolvedValue({ id: "evidencia-1" });

      const result = await controller.subirEvidencia(
        "caja-1",
        { ruta_archivo: "user-1/caja-1/foto.jpg", tipo_archivo: "image/jpeg" } as never,
        { user: { sub: "user-1" } } as never
      );

      expect(prisma.cajaEvidencia.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            caja_sesion_id: "caja-1",
            ruta_archivo: "user-1/caja-1/foto.jpg",
            subida_por_id: "user-1",
            reemplaza_id: "evidencia-previa",
          }),
        })
      );
      expect(result).toBeDefined();
    });
  });

  describe("urlFirmada", () => {
    it("genera URL firmada para el dueño o admin", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "cajero", activo: true });
      prisma.cajaEvidencia.findUnique.mockResolvedValue({
        id: "evidencia-1",
        ruta_archivo: "caja-1/foto.jpg",
        cajaSesion: { usuario_id: "user-1" },
      });

      const result = await controller.urlFirmada("evidencia-1", {
        user: { sub: "user-1" },
      } as never);

      expect(result.url).toContain("signed-url");
    });

    it("niega URL firmada a un cajero que no es dueño", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "cajero", activo: true });
      prisma.cajaEvidencia.findUnique.mockResolvedValue({
        id: "evidencia-1",
        ruta_archivo: "caja-1/foto.jpg",
        cajaSesion: { usuario_id: "otro-usuario" },
      });

      await expect(
        controller.urlFirmada("evidencia-1", { user: { sub: "user-1" } } as never)
      ).rejects.toThrow("No tienes acceso");
    });

    it("lanza NotFound si la evidencia no existe", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ rol: "administrador", activo: true });
      prisma.cajaEvidencia.findUnique.mockResolvedValue(null);
      await expect(
        controller.urlFirmada("no-existe", { user: { sub: "admin-1" } } as never)
      ).rejects.toThrow(NotFoundException);
    });
  });
});
