export type CatalogTemplate = "dark" | "light" | "bold"

export interface CatalogTheme {
  // Backgrounds
  bg: string
  surface: string
  surface2: string
  // Borders
  border: string
  // Text
  text: string
  textSec: string
  textMuted: string
  // Cards
  cardBg: string
  cardBorder: string
  cardRadius: string
  // Buttons
  btnRadius: string
  // Header
  headerBg: string
  headerBorder: string
  // Categories
  chipActiveBg: string
  chipInactiveBg: string
  chipBorder: string
  // Badge
  badgeRadius: string
  // Section title
  sectionTitleSize: string
  sectionTitleWeight: string
  // Price
  priceSize: string
  // Cart drawer
  drawerBg: string
}

export const CATALOG_THEMES: Record<CatalogTemplate, CatalogTheme> = {
  dark: {
    bg: "#0C0C0E",
    surface: "#141416",
    surface2: "#1A1A1E",
    border: "#2A2A2E",
    text: "#E8E8E8",
    textSec: "#8A8A8F",
    textMuted: "#555559",
    cardBg: "#141416",
    cardBorder: "#2A2A2E",
    cardRadius: "16px",
    btnRadius: "10px",
    headerBg: "#0C0C0Eee",
    headerBorder: "#2A2A2E",
    chipActiveBg: "transparent",
    chipInactiveBg: "#1A1A1E",
    chipBorder: "#2A2A2E",
    badgeRadius: "6px",
    sectionTitleSize: "14px",
    sectionTitleWeight: "600",
    priceSize: "14px",
    drawerBg: "#141416",
  },

  light: {
    bg: "#F4F4F5",
    surface: "#FFFFFF",
    surface2: "#F0F0F2",
    border: "#E2E2E6",
    text: "#18181B",
    textSec: "#52525B",
    textMuted: "#A1A1AA",
    cardBg: "#FFFFFF",
    cardBorder: "#E4E4E7",
    cardRadius: "14px",
    btnRadius: "8px",
    headerBg: "#FFFFFFee",
    headerBorder: "#E4E4E7",
    chipActiveBg: "transparent",
    chipInactiveBg: "#F0F0F2",
    chipBorder: "#E2E2E6",
    badgeRadius: "6px",
    sectionTitleSize: "14px",
    sectionTitleWeight: "600",
    priceSize: "14px",
    drawerBg: "#FFFFFF",
  },

  bold: {
    bg: "#08080A",
    surface: "#101012",
    surface2: "#18181C",
    border: "#323238",
    text: "#F2F2F2",
    textSec: "#9090A0",
    textMuted: "#5A5A6A",
    cardBg: "#101012",
    cardBorder: "var(--accent)",   // borda colorida no card
    cardRadius: "4px",             // cantos retos — estilo agressivo
    btnRadius: "4px",
    headerBg: "#08080Af0",
    headerBorder: "var(--accent)",
    chipActiveBg: "transparent",
    chipInactiveBg: "#18181C",
    chipBorder: "#323238",
    badgeRadius: "2px",
    sectionTitleSize: "16px",
    sectionTitleWeight: "700",
    priceSize: "16px",
    drawerBg: "#101012",
  },
}

export const TEMPLATE_LABELS: Record<CatalogTemplate, { name: string; description: string }> = {
  dark: {
    name: "Dark",
    description: "Fundo escuro, moderno e sofisticado",
  },
  light: {
    name: "Light",
    description: "Fundo claro, limpo e profissional",
  },
  bold: {
    name: "Bold",
    description: "Impactante, bordas coloridas e tipografia marcante",
  },
}

// Fontes disponíveis para seleção
export const CATALOG_FONTS = [
  // Sem serifa — neutras e versáteis
  { value: "Inter", label: "Inter", category: "Sem serifa" },
  { value: "DM Sans", label: "DM Sans", category: "Sem serifa" },
  { value: "Nunito Sans", label: "Nunito Sans", category: "Sem serifa" },
  { value: "Outfit", label: "Outfit", category: "Sem serifa" },
  { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans", category: "Sem serifa" },
  { value: "Poppins", label: "Poppins", category: "Sem serifa" },
  { value: "Raleway", label: "Raleway", category: "Sem serifa" },
  { value: "Rubik", label: "Rubik", category: "Sem serifa" },
  { value: "Sora", label: "Sora", category: "Sem serifa" },
  { value: "Work Sans", label: "Work Sans", category: "Sem serifa" },
  { value: "Manrope", label: "Manrope", category: "Sem serifa" },
  { value: "Figtree", label: "Figtree", category: "Sem serifa" },
  // Com serifa — elegantes e tradicionais
  { value: "Playfair Display", label: "Playfair Display", category: "Com serifa" },
  { value: "Merriweather", label: "Merriweather", category: "Com serifa" },
  { value: "Lora", label: "Lora", category: "Com serifa" },
  { value: "EB Garamond", label: "EB Garamond", category: "Com serifa" },
  { value: "Cormorant Garamond", label: "Cormorant Garamond", category: "Com serifa" },
  { value: "Source Serif 4", label: "Source Serif 4", category: "Com serifa" },
  // Display — marcantes e expressivas
  { value: "Syne", label: "Syne", category: "Display" },
  { value: "Oswald", label: "Oswald", category: "Display" },
  { value: "Bebas Neue", label: "Bebas Neue", category: "Display" },
  { value: "Montserrat", label: "Montserrat", category: "Display" },
  { value: "Exo 2", label: "Exo 2", category: "Display" },
  { value: "Space Grotesk", label: "Space Grotesk", category: "Display" },
  { value: "Clash Display", label: "Clash Display", category: "Display" },
  { value: "Barlow Condensed", label: "Barlow Condensed", category: "Display" },
  { value: "Fjalla One", label: "Fjalla One", category: "Display" },
  // Manuscritas — humanizadas e criativas
  { value: "Pacifico", label: "Pacifico", category: "Manuscrita" },
  { value: "Dancing Script", label: "Dancing Script", category: "Manuscrita" },
  { value: "Caveat", label: "Caveat", category: "Manuscrita" },
  { value: "Kalam", label: "Kalam", category: "Manuscrita" },
  { value: "Satisfy", label: "Satisfy", category: "Manuscrita" },
] as const

export function getFontUrl(fontFamily: string): string {
  const name = fontFamily.replace(/ /g, "+")
  return `https://fonts.googleapis.com/css2?family=${name}:wght@400;500;600;700&display=swap`
}
