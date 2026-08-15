import { PrismaClient } from "@prisma/client";

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

export function createPrismaMock<T = unknown>(overrides: DeepPartial<T> = {}) {
  const mock = {
    usuario: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    categoria: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    producto: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      fields: {},
    },
    cajaSesion: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    venta: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    ventaItem: {
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    ventaPago: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    cajaMovimiento: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    cajaEvidencia: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    compra: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    compraItem: {
      findMany: jest.fn(),
    },
    cliente: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    configuracion: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
    inventarioMovimiento: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    precioHistorico: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(async (fn: (tx: unknown) => unknown) => fn(mock)),
    $disconnect: jest.fn(),
  };

  return Object.assign(mock, overrides) as unknown as PrismaClient;
}
