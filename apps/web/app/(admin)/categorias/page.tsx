"use client";

import { useEffect, useState } from "react";
import { Plus, Tag, Trash2, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { api } from "@/lib/api";
import { useAccessToken } from "@/lib/use-access-token";

interface Categoria {
  id: string;
  nombre: string;
  orden: number;
  activa: boolean;
  _count?: { productos: number };
}

export default function CategoriasPage() {
  const { token } = useAccessToken();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Categoria | null>(null);
  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    api
      .get<Categoria[]>("/categorias", token)
      .then(setCategorias)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  function abrirNueva() {
    setEditing(null);
    setNombre("");
    setOrden("0");
    setShowModal(true);
  }

  function abrirEditar(c: Categoria) {
    setEditing(c);
    setNombre(c.nombre);
    setOrden(String(c.orden));
    setShowModal(true);
  }

  async function guardar() {
    if (!nombre.trim()) return;
    setSaving(true);
    setError("");
    try {
      if (editing) {
        await api.patch(`/categorias/${editing.id}`, { nombre, orden: Number(orden) || 0 }, token);
      } else {
        await api.post("/categorias", { nombre, orden: Number(orden) || 0 }, token);
      }
      setShowModal(false);
      const lista = await api.get<Categoria[]>("/categorias", token);
      setCategorias(lista);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function eliminarCategoria(c: Categoria) {
    if (c._count?.productos) {
      const ok = confirm(
        `La categoría tiene ${c._count.productos} productos. Se archivará (no se borra).`
      );
      if (!ok) return;
    } else if (!confirm("¿Eliminar esta categoría?")) {
      return;
    }
    setError("");
    try {
      await api.del(`/categorias/${c.id}`, token);
      const lista = await api.get<Categoria[]>("/categorias", token);
      setCategorias(lista);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function alternarActiva(c: Categoria) {
    setError("");
    try {
      await api.patch(`/categorias/${c.id}`, { activa: !c.activa }, token);
      const lista = await api.get<Categoria[]>("/categorias", token);
      setCategorias(lista);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
          <p className="text-gray-500">
            {categorias.filter((c) => c.activa !== false).length} activas · {categorias.length} total
          </p>
        </div>
        <button onClick={abrirNueva} className="btn-primary flex items-center space-x-2">
          <Plus size={20} />
          <span>Nueva categoría</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando categorías...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categorias.map((c) => (
            <div
              key={c.id}
              className={`card p-5 flex items-center justify-between ${
                c.activa === false ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 bg-primary-50 rounded-xl flex items-center justify-center">
                  <Tag size={22} className="text-primary-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{c.nombre}</p>
                  <p className="text-xs text-gray-400">
                    {c._count?.productos ?? 0} productos · orden {c.orden}
                    {c.activa === false && " · archivada"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => alternarActiva(c)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                  title={c.activa ? "Archivar" : "Restaurar"}
                >
                  {c.activa ? <Archive size={18} /> : <ArchiveRestore size={18} />}
                </button>
                <button
                  onClick={() => abrirEditar(c)}
                  className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                  title="Editar"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => eliminarCategoria(c)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Eliminar/Archivar"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              {editing ? "Editar categoría" : "Nueva categoría"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                <input
                  className="input-field"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej. Herramientas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Orden (para el POS)
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowModal(false)} className="btn-outline">
                  Cancelar
                </button>
                <button onClick={guardar} disabled={saving} className="btn-primary">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
