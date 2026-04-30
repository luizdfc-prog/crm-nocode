import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="px-6 py-12"
      style={{ borderTop: "1px solid #2A2A2E" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
            style={{ background: "#CAFF33", color: "#0C0C0E" }}
          >
            P
          </span>
          <span
            className="font-heading font-bold text-base tracking-tight"
            style={{ color: "#E8E8E8" }}
          >
            PipeFlow
          </span>
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
          © {new Date().getFullYear()} PipeFlow
        </p>
      </div>
    </footer>
  );
}
