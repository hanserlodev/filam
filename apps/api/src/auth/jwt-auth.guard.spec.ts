import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";
import { verificarTokenSupabase } from "./jwt-verify";

jest.mock("./jwt-verify", () => ({
  verificarTokenSupabase: jest.fn(),
}));

const verifyMock = verificarTokenSupabase as jest.MockedFunction<
  typeof verificarTokenSupabase
>;

function contextFor(request: Record<string, unknown>) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let prisma: ReturnType<typeof createPrismaMock>;
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(() => {
    prisma = createPrismaMock();
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    guard = new JwtAuthGuard(
      { get: jest.fn((key: string) => (key === "GOTRUE_URL" ? "https://auth.test/auth/v1" : "secret")) } as unknown as ConfigService,
      reflector as unknown as Reflector,
      prisma as unknown as PrismaService
    );
    verifyMock.mockResolvedValue({
      sub: "user-1",
      email: "token@example.com",
      role: "authenticated",
    });
  });

  it("permite rutas públicas sin token", async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    await expect(guard.canActivate(contextFor({ headers: {} }))).resolves.toBe(true);
    expect(verifyMock).not.toHaveBeenCalled();
  });

  it("rechaza si falta Authorization", async () => {
    await expect(guard.canActivate(contextFor({ headers: {} }))).rejects.toThrow(
      UnauthorizedException
    );
  });

  it("rechaza esquemas distintos de Bearer", async () => {
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: "Basic abc" } }))
    ).rejects.toThrow(UnauthorizedException);
  });

  it("consulta el perfil y coloca el rol de BD en request.user", async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      email: "db@example.com",
      rol: "administrador",
      activo: true,
    });
    const request = { headers: { authorization: "Bearer token" } } as Record<
      string,
      unknown
    >;

    await expect(guard.canActivate(contextFor(request))).resolves.toBe(true);
    expect(request.user).toEqual({
      sub: "user-1",
      email: "db@example.com",
      role: "administrador",
    });
  });

  it("rechaza un usuario inexistente", async () => {
    prisma.usuario.findUnique.mockResolvedValue(null);
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: "Bearer token" } }))
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rechaza un usuario inactivo", async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      email: "inactive@example.com",
      rol: "cajero",
      activo: false,
    });
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: "Bearer token" } }))
    ).rejects.toThrow(UnauthorizedException);
  });

  it("rechaza tokens sin sub", async () => {
    verifyMock.mockResolvedValue({ email: "without-sub@example.com" });
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: "Bearer token" } }))
    ).rejects.toThrow(UnauthorizedException);
  });

  it("convierte un fallo de firma en 401", async () => {
    verifyMock.mockRejectedValue(new Error("invalid signature"));
    await expect(
      guard.canActivate(contextFor({ headers: { authorization: "Bearer token" } }))
    ).rejects.toThrow(UnauthorizedException);
  });
});
