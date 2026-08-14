import { Test } from "@nestjs/testing";
import { CategoriasController } from "./categorias.controller";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";

describe("CategoriasController", () => {
  let controller: CategoriasController;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module = await Test.createTestingModule({
      controllers: [CategoriasController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<CategoriasController>(CategoriasController);
  });

  it("lista categorías ordenadas por orden", async () => {
    prisma.categoria.findMany.mockResolvedValue([{ id: "c1", nombre: "Tubos" }]);
    const result = await controller.listar();
    expect(prisma.categoria.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { orden: "asc" } })
    );
    expect(result).toHaveLength(1);
  });

  it("crea una categoría con orden por defecto 0", async () => {
    prisma.categoria.create.mockResolvedValue({ id: "c1", nombre: "Tubos" });
    await controller.crear({ nombre: "Tubos" } as never);
    expect(prisma.categoria.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nombre: "Tubos", orden: 0 }) })
    );
  });

  it("crea una categoría con orden explícito", async () => {
    prisma.categoria.create.mockResolvedValue({ id: "c1" });
    await controller.crear({ nombre: "Tubos", orden: 7 } as never);
    expect(prisma.categoria.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orden: 7 }) })
    );
  });

  it("actualiza una categoría", async () => {
    prisma.categoria.update.mockResolvedValue({ id: "c1", nombre: "Nuevo" });
    await controller.actualizar("c1", { nombre: "Nuevo" } as never);
    expect(prisma.categoria.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "c1" }, data: { nombre: "Nuevo" } })
    );
  });

  it("elimina una categoría", async () => {
    prisma.categoria.delete.mockResolvedValue({ id: "c1" });
    await controller.eliminar("c1");
    expect(prisma.categoria.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
  });
});
