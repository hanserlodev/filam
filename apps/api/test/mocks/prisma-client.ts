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
    value: number;

    constructor(value: number | string) {
      this.value = Number(value);
    }

    toNumber() {
      return this.value;
    }

    toString() {
      return String(this.value);
    }

    plus(value: { value: number } | number | string) {
      return new Prisma.Decimal(this.value + Number(value));
    }

    minus(value: { value: number } | number | string) {
      return new Prisma.Decimal(this.value - Number(value));
    }

    mul(value: { value: number } | number | string) {
      return new Prisma.Decimal(this.value * Number(value));
    }

    lt(value: { value: number } | number | string) {
      return this.value < Number(value);
    }

    isInteger() {
      return Number.isInteger(this.value);
    }

    toDecimalPlaces() {
      return new Prisma.Decimal(Math.round(this.value * 100) / 100);
    }
  },
};

export const Decimal = Prisma.Decimal;
