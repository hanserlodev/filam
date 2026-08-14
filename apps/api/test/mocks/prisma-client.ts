export class PrismaClient {
  $connect = jest.fn();
  $disconnect = jest.fn();
}

export const RolUsuario = {
  cajero: "cajero",
  administrador: "administrador",
} as const;

export const UnidadMedida = {
  unidad: "unidad",
  kg: "kg",
  litro: "litro",
  metro: "metro",
  caja: "caja",
} as const;

export const MetodoPago = {
  efectivo: "efectivo",
  tarjeta: "tarjeta",
  yape: "yape",
  plin: "plin",
} as const;

export const TipoComprobante = {
  nota_venta: "nota_venta",
  boleta: "boleta",
  factura: "factura",
} as const;

export const FormatoImpresion = {
  termica: "termica",
  a4: "a4",
} as const;

export const Prisma = {
  InputJsonValue: Symbol("InputJsonValue"),
  Decimal: class Decimal {
    constructor(value: number | string) {
      this.value = Number(value);
    }
    value: number;
    toNumber() {
      return this.value;
    }
  },
};

export const Decimal = Prisma.Decimal;
