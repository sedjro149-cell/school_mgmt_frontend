// src/theme.js
// ═══════════════════════════════════════════════════════════════════
// SCOL360 — Design System partagé
// Importez ThemeCtx, useTheme, LIGHT, DARK et SECTION_PALETTE
// dans chaque page pour garantir la cohérence visuelle.
// ═══════════════════════════════════════════════════════════════════
import { createContext, useContext } from "react";

/* ── Context dark mode ── */
export const ThemeCtx = createContext({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

/* ── Tokens light / dark ── */
export const LIGHT = {
  pageBg:        "#f1f3f9",
  cardBg:        "#ffffff",
  cardBorder:    "rgba(0,0,0,0.07)",
  cardShadow:    "0 2px 10px rgba(0,0,0,0.05)",
  cardShadowHov: "0 8px 28px rgba(0,0,0,0.12)",
  headerBg:      "rgba(241,243,249,0.88)",
  divider:       "rgba(0,0,0,0.06)",
  textPrimary:   "#0f172a",
  textSecondary: "#475569",
  textMuted:     "#94a3b8",
  inputBg:       "#f8fafc",
  inputBorder:   "#e2e8f0",
  rowHover:      "#f8fafc",
  tableHead:     "#f8fafc",
};

export const DARK = {
  pageBg:        "#0d1117",
  cardBg:        "#161b27",
  cardBorder:    "rgba(255,255,255,0.07)",
  cardShadow:    "0 2px 12px rgba(0,0,0,0.4)",
  cardShadowHov: "0 8px 28px rgba(0,0,0,0.6)",
  headerBg:      "rgba(13,17,23,0.9)",
  divider:       "rgba(255,255,255,0.05)",
  textPrimary:   "#e8eaf0",
  textSecondary: "#8892a4",
  textMuted:     "#4e5668",
  inputBg:       "#0d1117",
  inputBorder:   "rgba(255,255,255,0.08)",
  rowHover:      "#1a1f2e",
  tableHead:     "#0f1420",
};

/* ── Palette par section — utilisée pour les couleurs d'accent ──
   Chaque page importe la constante correspondant à son domaine.
── */
export const SECTION_PALETTE = {
  // Personnel ─ orange → rouge
  personnel: {
    from:    "#f97316",
    to:      "#ef4444",
    mid:     "#fb923c",
    text:    "#f97316",
    lightBg: "#fff7ed",
    darkBg:  "#2a1006",
    shadow:  "#f9731640",
  },
  // Parents — même palette que Personnel
  parents: {
    from:    "#f97316",
    to:      "#ef4444",
    mid:     "#fb923c",
    text:    "#f97316",
    lightBg: "#fff7ed",
    darkBg:  "#2a1006",
    shadow:  "#f9731640",
  },
  // Enseignants ─ ambre → jaune
  teachers: {
    from:    "#f59e0b",
    to:      "#eab308",
    mid:     "#fbbf24",
    text:    "#d97706",
    lightBg: "#fffbeb",
    darkBg:  "#221a05",
    shadow:  "#f59e0b40",
  },
  // Étudiants ─ indigo → violet
  students: {
    from:    "#6366f1",
    to:      "#8b5cf6",
    mid:     "#818cf8",
    text:    "#6366f1",
    lightBg: "#eef2ff",
    darkBg:  "#1a1836",
    shadow:  "#6366f140",
  },
  // Académique ─ bleu → cyan
  academic: {
    from:    "#3b82f6",
    to:      "#06b6d4",
    mid:     "#60a5fa",
    text:    "#3b82f6",
    lightBg: "#eff6ff",
    darkBg:  "#0c1a2e",
    shadow:  "#3b82f640",
  },
  // Finance ─ emerald → teal
  finance: {
    from:    "#10b981",
    to:      "#06b6d4",
    mid:     "#34d399",
    text:    "#10b981",
    lightBg: "#ecfdf5",
    darkBg:  "#051f18",
    shadow:  "#10b98140",
  },
  // Outils ─ ambre → orange
  tool: {
    from:    "#f59e0b",
    to:      "#f97316",
    mid:     "#fbbf24",
    text:    "#f59e0b",
    lightBg: "#fffbeb",
    darkBg:  "#221a05",
    shadow:  "#f59e0b40",
  },
};

/* ── Gradients avatars — identiques dans toutes les pages ── */
export const AVATAR_GRADIENTS = [
  ["#f97316","#ef4444"],
  ["#6366f1","#8b5cf6"],
  ["#0ea5e9","#06b6d4"],
  ["#10b981","#14b8a6"],
  ["#f59e0b","#f97316"],
  ["#db2777","#f9a8d4"],
  ["#8b5cf6","#6366f1"],
  ["#0d9488","#10b981"],
];
export const avatarGradient = (name) =>
  AVATAR_GRADIENTS[((name || "?").charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];

/* ── Keyframes CSS à injecter dans chaque page ── */
export const BASE_KEYFRAMES = `
  @keyframes fadeUp  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
  @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
  @keyframes panelUp { from { opacity:0; transform:scale(.96) translateY(12px); } to { opacity:1; transform:none; } }
  @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:none; } }
`;