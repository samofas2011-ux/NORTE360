"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

type MobileMarketingMenuProps = {
  className: string;
};

export function MobileMarketingMenu({ className }: MobileMarketingMenuProps) {
  const menu = useRef<HTMLDetailsElement>(null);

  function closeMenu() {
    if (menu.current) menu.current.open = false;
  }

  return (
    <details className={className} ref={menu}>
      <summary aria-label="Abrir navegación">
        <span>Menú</span>
        <ChevronDown size={20} aria-hidden="true" />
      </summary>
      <div>
        <a href="#como-funciona" onClick={closeMenu}>Cómo funciona</a>
        <a href="#producto" onClick={closeMenu}>Producto</a>
        <a href="#confianza" onClick={closeMenu}>Confianza</a>
        <a href="#preguntas" onClick={closeMenu}>Preguntas</a>
        <Link href="/create-account" onClick={closeMenu}>Crear cuenta</Link>
        <Link href="/login" onClick={closeMenu}>Iniciar sesión</Link>
      </div>
    </details>
  );
}
