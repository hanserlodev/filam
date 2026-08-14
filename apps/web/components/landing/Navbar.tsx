"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, ShoppingCart, Phone } from "lucide-react";
import Logo from "./Logo";

const NAV_LINKS = [
  { href: "#inicio", label: "Inicio" },
  { href: "#productos", label: "Productos" },
  { href: "#categorias", label: "Categorías" },
  { href: "#beneficios", label: "Beneficios" },
  { href: "#contacto", label: "Contacto" },
];

interface NavbarProps {
  telefono?: string | null;
}

export default function Navbar({ telefono }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/90 backdrop-blur-xl border-b border-steel-100 shadow-sm"
          : "bg-white"
      }`}
    >
      <div className="container-site flex items-center justify-between h-16 lg:h-[72px]">
        <Logo />

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm font-medium text-steel-600 hover:text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          {telefono && (
            <a
              href={`tel:${telefono.replace(/[^0-9+]/g, "")}`}
              className="flex items-center gap-2 text-sm font-semibold text-steel-700 hover:text-primary-600 transition-colors"
            >
              <span className="w-9 h-9 bg-primary-50 rounded-full flex items-center justify-center">
                <Phone size={16} className="text-primary-600" />
              </span>
              {telefono}
            </a>
          )}
          <Link
            href="/login"
            className="btn-secondary !py-2.5 !px-5 text-sm"
          >
            <ShoppingCart size={16} />
            Ingresar al POS
          </Link>
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden p-2 text-steel-700 hover:bg-steel-100 rounded-lg transition"
          aria-label="Abrir menú"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="lg:hidden border-t border-steel-100 bg-white">
          <nav className="container-site py-4 flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="px-4 py-3 text-sm font-medium text-steel-600 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="mt-2 btn-secondary w-full text-sm"
            >
              <ShoppingCart size={16} />
              Ingresar al POS
            </Link>
            {telefono && (
              <a
                href={`tel:${telefono.replace(/[^0-9+]/g, "")}`}
                className="mt-1 flex items-center justify-center gap-2 text-sm font-semibold text-steel-700"
              >
                <Phone size={16} className="text-primary-600" />
                {telefono}
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
