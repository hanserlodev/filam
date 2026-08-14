import { Test } from "@nestjs/testing";
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";
import { RolUsuario } from "@prisma/client";

jest.mock("jose", () => ({
  createRemoteJWKSet: jest.fn(() => jest.fn()),
  jwtVerify: jest.fn(async () => ({
    payload: { sub: "user-uuid-1", email: "cajero@filam.pe", role: "authenticated" },
  })),
}));

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(() => ({
    sub: "user-uuid-1",
    email: "cajero@filam.pe",
  })),
}));

describe("AuthService", () => {
  let service: AuthService;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                GOTRUE_URL: "https://example.supabase.co/auth/v1",
                SERVICE_ROLE_KEY: "service-role-key",
                GOTRUE_JWT_SECRET: "test-secret",
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe("me", () => {
    it("devuelve el usuario autenticado", async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: "user-uuid-1",
        nombre: "Cajero Demo",
        email: "cajero@filam.pe",
        rol: RolUsuario.cajero,
        activo: true,
      });

      const result = await service.me("valid-token");
      expect(result).toEqual({
        id: "user-uuid-1",
        nombre: "Cajero Demo",
        email: "cajero@filam.pe",
        rol: "cajero",
      });
    });

    it("lanza Unauthorized si el usuario no existe", async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      await expect(service.me("valid-token")).rejects.toThrow(
        UnauthorizedException
      );
    });

    it("lanza Unauthorized si el usuario está inactivo", async () => {
      prisma.usuario.findUnique.mockResolvedValue({
        id: "user-uuid-1",
        nombre: "Inactivo",
        email: "x@filam.pe",
        rol: RolUsuario.cajero,
        activo: false,
      });
      await expect(service.me("valid-token")).rejects.toThrow(
        UnauthorizedException
      );
    });
  });

  describe("registrarUsuario", () => {
    beforeEach(() => {
      global.fetch = jest.fn();
    });

    it("lanza Conflict si el email ya existe", async () => {
      prisma.usuario.findUnique.mockResolvedValue({ id: "x" });
      await expect(
        service.registrarUsuario(
          "Test",
          "test@filam.pe",
          "password123",
          RolUsuario.cajero
        )
      ).rejects.toThrow(ConflictException);
    });

    it("crea el usuario en GoTrue y luego en la tabla usuarios", async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "gotrue-uuid" }),
      });
      prisma.usuario.create.mockResolvedValue({
        id: "gotrue-uuid",
        nombre: "Test",
        email: "test@filam.pe",
        rol: RolUsuario.cajero,
      });

      const result = await service.registrarUsuario(
        "Test",
        "test@filam.pe",
        "password123",
        RolUsuario.cajero
      );

      expect(global.fetch).toHaveBeenCalledWith(
        "https://example.supabase.co/auth/v1/admin/users",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            apikey: "service-role-key",
            Authorization: "Bearer service-role-key",
          }),
        })
      );
      expect(prisma.usuario.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "gotrue-uuid",
            email: "test@filam.pe",
          }),
        })
      );
      expect(result.id).toBe("gotrue-uuid");
    });

    it("lanza BadRequest si GoTrue falla", async () => {
      prisma.usuario.findUnique.mockResolvedValue(null);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ msg: "invalid email" }),
      });

      await expect(
        service.registrarUsuario(
          "Test",
          "test@filam.pe",
          "password123",
          RolUsuario.cajero
        )
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("listarUsuarios", () => {
    it("lista usuarios ordenados", async () => {
      prisma.usuario.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
      const result = await service.listarUsuarios();
      expect(prisma.usuario.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { creado_en: "asc" } })
      );
      expect(result).toHaveLength(2);
    });
  });
});
