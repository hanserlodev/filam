import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ProductosController } from "./productos.controller";
import { PrismaService } from "../prisma/prisma.service";
import { createPrismaMock } from "../../test/utils";
import { BarcodeLookupService } from "./barcode-lookup.service";
import { PrecioHistoricoService } from "../inventario/precio-historico.service";
import { UnidadMedida } from "@prisma/client";

describe("ProductosController", () => {
  let controller: ProductosController;
  let prisma: ReturnType<typeof createPrismaMock>;

  const productoBase = {
    id: "prod-1",
    nombre: "Martillo",
    codigo_barras: "123",
    sku: "SKU-1",
    precio: 28.5,
    costo: 18,
    stock: 25,
    unidad_medida: UnidadMedida.unidad,
    stock_minimo: 5,
    activo: true,
    categoria_id: "cat-1",
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    prisma.producto.fields = { stock_minimo: "stock_minimo" };
    const module = await Test.createTestingModule({
      controllers: [ProductosController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        {
          provide: BarcodeLookupService,
          useValue: { buscar: jest.fn() },
        },
        {
          provide: PrecioHistoricoService,
          useValue: { registrar: jest.fn(), costoPromedio: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<ProductosController>(ProductosController);
  });

  describe("listar", () => {
    it("lista todos los productos", async () => {
      prisma.producto.findMany.mockResolvedValue([productoBase]);
      const result = await controller.listar();
      expect(prisma.producto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { nombre: "asc" } })
      );
      expect(result).toHaveLength(1);
    });

    it("busca por query (q)", async () => {
      prisma.producto.findMany.mockResolvedValue([productoBase]);
      await controller.listar("martillo");
      expect(prisma.producto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      );
    });

    it("filtra por categoría", async () => {
      prisma.producto.findMany.mockResolvedValue([productoBase]);
      await controller.listar(undefined, "cat-1");
      expect(prisma.producto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ categoria_id: "cat-1" }) })
      );
    });

    it("filtra por activo", async () => {
      prisma.producto.findMany.mockResolvedValue([productoBase]);
      await controller.listar(undefined, undefined, undefined, "false");
      expect(prisma.producto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ activo: false }) })
      );
    });

    it("filtra stock bajo", async () => {
      prisma.producto.findMany.mockResolvedValue([productoBase]);
      await controller.listar(undefined, undefined, "true");
      expect(prisma.producto.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stock: { lte: "stock_minimo" },
            activo: true,
          }),
        })
      );
    });
  });

  describe("obtener", () => {
    it("obtiene un producto por id", async () => {
      prisma.producto.findUnique.mockResolvedValue(productoBase);
      const result = await controller.obtener("prod-1");
      expect(prisma.producto.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "prod-1" } })
      );
      expect(result.nombre).toBe("Martillo");
    });

    it("lanza NotFound si el producto no existe", async () => {
      prisma.producto.findUnique.mockResolvedValue(null);
      await expect(controller.obtener("prod-1")).rejects.toThrow(NotFoundException);
    });
  });

  describe("crear", () => {
    it("crea un producto con valores por defecto", async () => {
      prisma.producto.create.mockResolvedValue(productoBase);
      await controller.crear({ nombre: "Martillo" } as never, {
        user: { sub: "admin-1" },
      } as never);

      expect(prisma.producto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            nombre: "Martillo",
            precio: 0,
            stock: 0,
            unidad_medida: UnidadMedida.unidad,
            stock_minimo: 5,
            activo: true,
            atributos: {},
          }),
        })
      );
    });

    it("crea un producto con datos completos", async () => {
      prisma.producto.create.mockResolvedValue(productoBase);
      await controller.crear(
        {
          nombre: "Martillo",
          precio: 28.5,
          costo: 18,
          stock: 25,
          unidad_medida: UnidadMedida.unidad,
          stock_minimo: 5,
          categoria_id: "cat-1",
        } as never,
        { user: { sub: "admin-1" } } as never
      );

      expect(prisma.producto.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            precio: 28.5,
            costo: 18,
            stock: 0,
            categoria_id: "cat-1",
          }),
        })
      );
    });
  });

  describe("actualizar", () => {
    it("actualiza campos del producto", async () => {
      prisma.producto.findUnique.mockResolvedValue(productoBase);
      prisma.producto.update.mockResolvedValue({ ...productoBase, precio: 30 });
      await controller.actualizar("prod-1", { precio: 30 } as never, {
        user: { sub: "admin-1" },
      } as never);
      expect(prisma.producto.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "prod-1" },
          data: expect.objectContaining({ precio: 30 }),
        })
      );
    });
  });

  describe("buscarPorCodigo", () => {
    it("devuelve el producto si existe", async () => {
      prisma.producto.findUnique.mockResolvedValue(productoBase);
      const result = await controller.buscarPorCodigo("123");
      expect(result.encontrado).toBe(true);
      expect(result.producto.nombre).toBe("Martillo");
    });

    it("devuelve sugerencia externa si no existe", async () => {
      prisma.producto.findUnique.mockResolvedValue(null);
      const lookup = controller["lookup"] as { buscar: jest.Mock };
      lookup.buscar.mockResolvedValue({
        encontrado: true,
        nombre: "Producto Externo",
        fuente: "openfoodfacts",
      });
      const result = await controller.buscarPorCodigo("9999999999999");
      expect(result.encontrado).toBe(false);
      expect(result.sugerencia.nombre).toBe("Producto Externo");
    });
  });
});
