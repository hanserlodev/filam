"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  HardHat,
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wallet,
  Truck,
  Users,
  BarChart3,
  Settings,
  Tag,
  LogOut,
  Menu,
  X,
  Receipt,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

const menuItems = [
  { icon: ShoppingCart, label: "POS", href: "/pos" },
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: Receipt, label: "Ventas", href: "/ventas" },
  { icon: Package, label: "Productos", href: "/productos" },
  { icon: Tag, label: "Categorías", href: "/categorias" },
  { icon: Wallet, label: "Caja", href: "/caja" },
  { icon: Truck, label: "Compras", href: "/compras" },
  { icon: Users, label: "Clientes", href: "/clientes" },
  { icon: BarChart3, label: "Reportes", href: "/reportes" },
  { icon: Settings, label: "Configuración", href: "/configuracion" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login");
      } else {
        setUser(data.user);
      }
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-primary-700 to-primary-900 text-white z-50 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-secondary-500 rounded-xl flex items-center justify-center">
              <HardHat size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">FILAM</h1>
              <p className="text-xs text-white/70">Fábrica de Tuberías PVC</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/70 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/pos" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-white text-primary-700 shadow-lg"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="text-xs">
              <p className="text-white/70 mb-1">Conectado como</p>
              <p className="font-semibold truncate max-w-[160px]">
                {user?.email || "..."}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 lg:px-6 py-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-primary-600"
              >
                <Menu size={24} />
              </button>
              <h2 className="text-lg font-bold text-gray-900">
                {menuItems.find(
                  (m) =>
                    pathname === m.href ||
                    (m.href !== "/pos" && pathname?.startsWith(m.href))
                )?.label || "FILAM"}
              </h2>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}