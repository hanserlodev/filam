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
  boleta_propia: "boleta_propia",
} as const;

export const TipoMovimientoCaja = {
  ingreso: "ingreso",
  retiro: "retiro",
} as const;

export const TipoMovimientoInventario = {
  compra: "compra",
  venta: "venta",
  anulacion_venta: "anulacion_venta",
  devolucion_proveedor: "devolucion_proveedor",
  merma: "merma",
  rotura: "rotura",
  perdida: "perdida",
  ajuste_conteo: "ajuste_conteo",
} as const;

export const EstadoCompra = {
  registrada: "registrada",
  anulada: "anulada",
  devuelta: "devuelta",
} as const;

export const TipoDocumentoCompra = {
  factura: "factura",
  boleta: "boleta",
  guia: "guia",
  referencia: "referencia",
} as const;

export const Prisma = {
  InputJsonValue: Symbol("InputJsonValue"),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values,
  }),
  raw: (sql: string) => sql,
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

    div(value: { value: number } | number | string) {
      return new Prisma.Decimal(this.value / Number(value));
    }

    lt(value: { value: number } | number | string) {
      return this.value < Number(value);
    }

    gt(value: { value: number } | number | string) {
      return this.value > Number(value);
    }

    gte(value: { value: number } | number | string) {
      return this.value >= Number(value);
    }

    lte(value: { value: number } | number | string) {
      return this.value <= Number(value);
    }

    eq(value: { value: number } | number | string) {
      return this.value === Number(value);
    }

    isZero() {
      return this.value === 0;
    }

    negated() {
      return new Prisma.Decimal(-this.value);
    }

    abs() {
      return new Prisma.Decimal(Math.abs(this.value));
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
