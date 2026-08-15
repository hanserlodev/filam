import { Injectable } from "@nestjs/common";

export interface DatosProductoExterno {
  nombre?: string;
  marca?: string;
  presentacion?: string;
  categoria?: string;
  encontrado: boolean;
  fuente: string;
}

@Injectable()
export class BarcodeLookupService {
  /**
   * Busca datos de un producto por su código de barras usando Open Food Facts
   * (API pública, sin key). Si no lo encuentra o la API falla, devuelve
   * encontrado=false para que el admin registre manualmente.
   */
  async buscar(codigoBarras: string): Promise<DatosProductoExterno> {
    const codigo = codigoBarras.trim().replace(/\s+/g, "");
    if (!/^\d{8,14}$/.test(codigo)) {
      return { encontrado: false, fuente: "none" };
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${codigo}.json`,
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      if (!res.ok) return { encontrado: false, fuente: "openfoodfacts" };
      const data = (await res.json()) as {
        status?: number;
        product?: {
          product_name?: string;
          brands?: string;
          quantity?: string;
          categories?: string;
          generic_name?: string;
        };
      };

      if (data.status !== 1 || !data.product) {
        return { encontrado: false, fuente: "openfoodfacts" };
      }

      const p = data.product;
      const nombre =
        p.product_name || p.generic_name || `Producto ${codigoBarras}`;
      return {
        nombre,
        marca: p.brands || undefined,
        presentacion: p.quantity || undefined,
        categoria: p.categories?.split(",")[0]?.trim() || undefined,
        encontrado: true,
        fuente: "openfoodfacts",
      };
    } catch {
      return { encontrado: false, fuente: "openfoodfacts" };
    }
  }
}
