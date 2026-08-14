export interface CatalogoProducto {
  id: string;
  nombre: string;
  precio: number;
  unidad_medida: string;
  disponible: boolean;
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
    email: string | null;
    web: string | null;
    instagram: string | null;
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
