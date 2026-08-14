import { Prisma } from "@prisma/client";

export function toDecimal(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return new Prisma.Decimal(value.toString());
}

export function toMoney(value: Prisma.Decimal | number | string): Prisma.Decimal {
  return toDecimal(value).toDecimalPlaces(2);
}
