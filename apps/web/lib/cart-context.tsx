"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CatalogoProducto } from "@/lib/catalogo-types";

export interface CartItem {
  producto: CatalogoProducto;
  cantidad: number;
}

interface CartContextValue {
  items: CartItem[];
  abierto: boolean;
  abrirCarrito: () => void;
  cerrarCarrito: () => void;
  agregar: (producto: CatalogoProducto) => void;
  cambiarCantidad: (id: string, delta: number) => void;
  eliminar: (id: string) => void;
  vaciar: () => void;
  subtotal: number;
  cantidadItems: number;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "filam_carrito_v1";

export function CartProvider({ children }: { children: ReactNode }) {
  // Inicializador diferido: lee el carrito persistido una sola vez al montar,
  // evitando setState síncrono dentro de un effect (regla react-hooks).
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartItem[];
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      /* carrito corrupto: se ignora */
    }
    return [];
  });
  const [abierto, setAbierto] = useState(false);

  // Persistir en cada cambio.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage no disponible */
    }
  }, [items]);

  function agregar(producto: CatalogoProducto) {
    setItems((prev) => {
      const existente = prev.find((i) => i.producto.id === producto.id);
      if (existente) {
        return prev.map((i) =>
          i.producto.id === producto.id
            ? { ...i, cantidad: i.cantidad + 1 }
            : i
        );
      }
      return [...prev, { producto, cantidad: 1 }];
    });
  }

  function cambiarCantidad(id: string, delta: number) {
    setItems((prev) =>
      prev
        .map((i) =>
          i.producto.id === id
            ? { ...i, cantidad: Math.max(0.1, i.cantidad + delta) }
            : i
        )
        .filter((i) => i.cantidad > 0)
    );
  }

  function eliminar(id: string) {
    setItems((prev) => prev.filter((i) => i.producto.id !== id));
  }

  function vaciar() {
    setItems([]);
  }

  const subtotal = useMemo(
    () =>
      items.reduce((sum, i) => sum + i.producto.precio * i.cantidad, 0),
    [items]
  );

  const cantidadItems = useMemo(
    () => items.reduce((sum, i) => sum + i.cantidad, 0),
    [items]
  );

  return (
    <CartContext.Provider
      value={{
        items,
        abierto,
        abrirCarrito: () => setAbierto(true),
        cerrarCarrito: () => setAbierto(false),
        agregar,
        cambiarCantidad,
        eliminar,
        vaciar,
        subtotal,
        cantidadItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart debe usarse dentro de <CartProvider>");
  }
  return ctx;
}
