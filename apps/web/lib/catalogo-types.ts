export interface CatalogoProducto {
  id: string;
  nombre: string;
  sku: string | null;
  codigo_barras: string | null;
  precio: number;
  unidad_medida: string;
  stock: number;
  stock_minimo: number;
  atributos: Record<string, unknown> | null;
  categoria_id: string;
}

export interface Categoria {
  id: string;
  nombre: string;
}

export interface Catalogo {
  negocio: {
    nombre: string;
    ruc: string | null;
    direccion: string | null;
    telefono: string | null;
    metodos_pago: string[];
  };
  categorias: Categoria[];
  productos: CatalogoProducto[];
  total_productos: number;
}

export const CATEGORIA_ICONS: Record<string, string> = {
  Herramientas: "🔧",
  "Insumos eléctricos": "⚡",
  "Materiales de construcción": "🏗️",
  "Ferretería general": "🛠️",
  Fijaciones: "🔩",
  Pinturas: "🎨",
};
