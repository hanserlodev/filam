import type { CartItem } from "@/lib/cart-context";

export function formatearCantidad(cantidad: number, unidad: string): string {
  const n = Number(cantidad);
  if (unidad === "unidad" || unidad === "caja") {
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
  }
  return `${n.toFixed(2)} ${unidad}`;
}

export interface DatosPedido {
  nombre: string;
  telefono: string;
  modalidad: "recojo" | "delivery";
  direccion: string;
  referencia: string;
}

export interface NegocioWhatsApp {
  nombre: string;
  telefono: string | null;
}

/**
 * Genera el texto del pedido listo para enviar por WhatsApp.
 * Usa el precio referencial del catálogo; el precio final lo confirma
 * el vendedor. Nunca incluye costo, margen ni datos internos.
 */
export function generarMensajePedido(
  items: CartItem[],
  subtotal: number,
  datos: DatosPedido
): string {
  const lineas = items
    .map((item, idx) => {
      const cantidad = formatearCantidad(
        item.cantidad,
        item.producto.unidad_medida
      );
      const importe = item.producto.precio * item.cantidad;
      return `${idx + 1}. ${item.producto.nombre}\n   Cantidad: ${cantidad}\n   Precio referencial: S/ ${item.producto.precio.toFixed(2)}\n   Importe: S/ ${importe.toFixed(2)}`;
    })
    .join("\n");

  const modalidad =
    datos.modalidad === "recojo"
      ? "Recojo en tienda"
      : "Delivery a domicilio";

  const direccion = datos.modalidad === "delivery" ? `\nDirección: ${datos.direccion}\nReferencia: ${datos.referencia || "-"}` : "";

  return [
    "Hola, quiero realizar este pedido:",
    "",
    lineas,
    "",
    `Subtotal referencial: S/ ${subtotal.toFixed(2)}`,
    "",
    `Nombre: ${datos.nombre}`,
    `Teléfono: ${datos.telefono}`,
    `Modalidad: ${modalidad}${direccion}`,
    "",
    "*Precios referenciales sujetos a confirmación de disponibilidad y precio final.*",
  ].join("\n");
}

/**
 * Limpia un número de teléfono a formato internacional para wa.me.
 * Acepta "950 307 510", "+51 950307510", "(051) 950-307-510", etc.
 */
export function normalizarTelefonoWhatsApp(
  telefono: string | null | undefined
): string | null {
  if (!telefono) return null;
  const soloDigitos = telefono.replace(/[^0-9]/g, "");
  if (soloDigitos.length === 9) {
    // Perú sin prefijo: asumimos +51.
    return `51${soloDigitos}`;
  }
  if (soloDigitos.length >= 10 && soloDigitos.length <= 15) {
    return soloDigitos;
  }
  return null;
}

/**
 * Abre WhatsApp con el pedido listo para enviar.
 */
export function abrirWhatsApp(
  negocio: NegocioWhatsApp,
  items: CartItem[],
  subtotal: number,
  datos: DatosPedido
): { ok: boolean; error?: string } {
  const numero = normalizarTelefonoWhatsApp(negocio.telefono);
  if (!numero) {
    return {
      ok: false,
      error: "El negocio aún no ha configurado un número de WhatsApp para pedidos.",
    };
  }
  const mensaje = generarMensajePedido(items, subtotal, datos);
  const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank", "noopener,noreferrer");
  return { ok: true };
}
