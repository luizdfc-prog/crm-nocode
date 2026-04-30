"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
      style={{
        background: scrolled
          ? "rgba(12,12,14,0.92)"
          : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled ? "1px solid #2A2A2E" : "1px solid transparent",
      }}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <span
            className="w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold"
            style={{ background: "#CAFF33", color: "#0C0C0E" }}
          >
            P
          </span>
          <span
            className="font-heading font-bold text-lg tracking-tight"
            style={{ color: "#E8E8E8" }}
          >
            PipeFlow
          </span>
        </Link>

        {/* Links desktop */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "Funcionalidades", href: "#features" },
            { label: "Preços", href: "#pricing" },
          ].map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-medium transition-colors duration-200"
              style={{ color: "#8A8A8F" }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "#E8E8E8")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "#8A8A8F")
              }
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* CTAs desktop */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-200"
            style={{ color: "#8A8A8F" }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.color = "#E8E8E8")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.color = "#8A8A8F")
            }
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold px-5 py-2 rounded-lg transition-all duration-200 hover:opacity-90 active:scale-95"
            style={{
              background: "#CAFF33",
              color: "#0C0C0E",
            }}
          >
            Começar grátis
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="Menu"
        >
          <span
            className="block w-5 h-0.5 transition-all duration-200"
            style={{
              background: "#E8E8E8",
              transform: menuOpen ? "rotate(45deg) translate(4px, 4px)" : "",
            }}
          />
          <span
            className="block w-5 h-0.5 transition-all duration-200"
            style={{
              background: "#E8E8E8",
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            className="block w-5 h-0.5 transition-all duration-200"
            style={{
              background: "#E8E8E8",
              transform: menuOpen ? "rotate(-45deg) translate(4px, -4px)" : "",
            }}
          />
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          className="md:hidden border-t px-6 py-4 flex flex-col gap-4"
          style={{
            background: "rgba(12,12,14,0.97)",
            borderColor: "#2A2A2E",
          }}
        >
          <a
            href="#features"
            className="text-sm font-medium"
            style={{ color: "#8A8A8F" }}
            onClick={() => setMenuOpen(false)}
          >
            Funcionalidades
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium"
            style={{ color: "#8A8A8F" }}
            onClick={() => setMenuOpen(false)}
          >
            Preços
          </a>
          <Link
            href="/login"
            className="text-sm font-medium"
            style={{ color: "#8A8A8F" }}
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="text-sm font-semibold px-5 py-2.5 rounded-lg text-center"
            style={{ background: "#CAFF33", color: "#0C0C0E" }}
          >
            Começar grátis
          </Link>
        </div>
      )}
    </header>
  );
}
