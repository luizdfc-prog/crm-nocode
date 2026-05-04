import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer
      className="px-6 py-12"
      style={{ borderTop: "1px solid #2A2A2E" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Logo size="sm" />
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6 flex-wrap justify-center">
          {[
            { label: "Funcionalidades", href: "#features" },
            { label: "Preços", href: "#pricing" },
            { label: "Entrar", href: "/login" },
            { label: "Criar conta", href: "/signup" },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="landing-link text-xs transition-colors duration-200"
              style={{ color: "#555559" }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Copyright */}
        <p className="text-xs" style={{ color: "#555559" }}>
          © {new Date().getFullYear()} Z4P
        </p>
      </div>
    </footer>
  );
}
