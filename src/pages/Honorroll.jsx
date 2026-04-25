// src/pages/HonorRoll.jsx
// =============================================================================
//  🏆 Tableau d'Honneur — Scol360
//  Endpoints consommés :
//    GET /api/academics/honor-roll/           → liste plate
//    GET /api/academics/honor-roll/by-class/  → groupé par classe
//    GET /api/academics/honor-roll/by-level/  → groupé par niveau
//    GET /api/academics/honor-roll/stats/     → stats résumées
//    GET /api/academics/school-years/         → sélecteur d'année
//    GET /api/academics/levels/               → dropdown scope=niveau
//    GET /api/academics/school-classes/       → dropdown scope=classe
// =============================================================================

import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  FaMedal, FaTrophy, FaStar, FaMoon, FaSun, FaSyncAlt,
  FaArrowLeft, FaChevronDown, FaChevronUp,
  FaGraduationCap, FaLayerGroup, FaSchool,
  FaExclamationTriangle, FaFilter, FaTable, FaThLarge,
  FaChartBar, FaCog, FaCheck, FaBook,
} from "react-icons/fa";
import { fetchData } from "./api";
import {
  ThemeCtx, useTheme, LIGHT, DARK, BASE_KEYFRAMES,
} from "./theme";

/* ─────────────────────────────────────────────────────────────────
   PALETTE TABLEAU D'HONNEUR  (or / amber — prestige)
───────────────────────────────────────────────────────────────── */
const COL = {
  from:    "#f59e0b",
  to:      "#f97316",
  mid:     "#fbbf24",
  text:    "#d97706",
  lightBg: "#fffbeb",
  darkBg:  "#1c1505",
  shadow:  "#f59e0b44",
};

const MENTION_META = {
  "Excellence": { from: "#f59e0b", to: "#ef4444", icon: "🏆" },
  "Très Bien":  { from: "#6366f1", to: "#8b5cf6", icon: "⭐" },
  "Bien":       { from: "#10b981", to: "#06b6d4", icon: "✨" },
  "":           { from: "#94a3b8", to: "#64748b", icon: ""  },
};

const TERM_COLORS = {
  T1:      { from: "#3b82f6", to: "#06b6d4" },
  T2:      { from: "#10b981", to: "#14b8a6" },
  T3:      { from: "#f59e0b", to: "#f97316" },
  annual:  { from: "#8b5cf6", to: "#ec4899" },
};

/* ─────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────── */
const fmt = (v, decimals = 2) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  return Number.isNaN(n) ? "—" : n.toFixed(decimals).replace(".", ",");
};

const buildQuery = (obj = {}) => {
  const parts = Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
};

const RANK_MEDAL = (rank) => {
  if (rank === 1) return { icon: "🥇", color: "#f59e0b" };
  if (rank === 2) return { icon: "🥈", color: "#94a3b8" };
  if (rank === 3) return { icon: "🥉", color: "#b45309" };
  return null;
};

/* ─────────────────────────────────────────────────────────────────
   DARK TOGGLE
───────────────────────────────────────────────────────────────── */
const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button onClick={toggle}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", width: 52, height: 28, borderRadius: 999,
        border: "none", cursor: "pointer", flexShrink: 0, outline: "none",
        transition: "all .3s",
        background: dark
          ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
          : `linear-gradient(135deg,${COL.from},${COL.to})`,
        boxShadow: hov ? `0 0 18px ${COL.shadow}` : "0 2px 8px rgba(0,0,0,.2)",
      }}>
      <div style={{
        position: "absolute", top: 2, width: 24, height: 24, borderRadius: 999,
        background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all .3s", left: dark ? "calc(100% - 26px)" : 2,
        boxShadow: "0 2px 6px rgba(0,0,0,.25)",
      }}>
        {dark
          ? <FaMoon style={{ width: 11, height: 11, color: "#6366f1" }} />
          : <FaSun  style={{ width: 11, height: 11, color: COL.from  }} />}
      </div>
    </button>
  );
};

/* ─────────────────────────────────────────────────────────────────
   MINI SELECT
───────────────────────────────────────────────────────────────── */
const Select = ({ value, onChange, options, placeholder = "Sélectionner…", disabled = false }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        style={{
          appearance: "none", padding: "8px 32px 8px 12px", borderRadius: 10,
          border: `1px solid ${T.inputBorder}`, background: T.inputBg,
          color: value ? T.textPrimary : T.textMuted, fontSize: 13, fontWeight: 500,
          cursor: disabled ? "not-allowed" : "pointer", outline: "none",
          opacity: disabled ? 0.5 : 1, minWidth: 160,
        }}>
        <option value="">{placeholder}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <FaChevronDown style={{
        position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
        width: 10, height: 10, color: T.textMuted, pointerEvents: "none",
      }} />
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   TAB BAR
───────────────────────────────────────────────────────────────── */
const TabBar = ({ tabs, value, onChange, colFn }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div style={{ display: "flex", gap: 4, background: T.cardBg, padding: 4, borderRadius: 12, border: `1px solid ${T.cardBorder}` }}>
      {tabs.map(tab => {
        const isActive = tab.value === value;
        const col = colFn ? colFn(tab.value) : COL;
        return (
          <button key={tab.value} onClick={() => onChange(tab.value)}
            style={{
              padding: "7px 14px", borderRadius: 9, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 12, transition: "all .2s", outline: "none",
              background: isActive ? `linear-gradient(135deg,${col.from},${col.to})` : "transparent",
              color: isActive ? "#fff" : T.textMuted,
              boxShadow: isActive ? `0 3px 10px ${col.from}55` : "none",
            }}>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   MENTION BADGE
───────────────────────────────────────────────────────────────── */
const MentionBadge = ({ mention }) => {
  if (!mention) return <span style={{ color: "#94a3b8", fontSize: 12 }}>—</span>;
  const m = MENTION_META[mention] || MENTION_META[""];
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700,
      background: `linear-gradient(135deg,${m.from},${m.to})`,
      color: "#fff", boxShadow: `0 2px 8px ${m.from}55`,
    }}>
      {m.icon} {mention}
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────
   AVERAGE CHIP
───────────────────────────────────────────────────────────────── */
const AvgChip = ({ avg }) => {
  const n = Number(avg);
  const col = n >= 18 ? { from: "#f59e0b", to: "#ef4444" }
    : n >= 16 ? { from: "#6366f1", to: "#8b5cf6" }
    : n >= 14 ? { from: "#10b981", to: "#06b6d4" }
    : { from: "#94a3b8", to: "#64748b" };
  return (
    <span style={{
      display: "inline-block", padding: "3px 12px", borderRadius: 999,
      fontWeight: 900, fontSize: 14, letterSpacing: "-0.02em",
      background: `linear-gradient(135deg,${col.from},${col.to})`,
      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
    }}>
      {fmt(avg)}/20
    </span>
  );
};

/* ─────────────────────────────────────────────────────────────────
   STAT CARD (mention breakdown + total)
───────────────────────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, col }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div style={{
      background: T.cardBg, borderRadius: 14,
      border: `1px solid ${T.cardBorder}`,
      boxShadow: T.cardShadow, padding: "16px 20px",
      display: "flex", alignItems: "center", gap: 12, flex: "1 1 140px",
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 12,
        background: `linear-gradient(135deg,${col.from},${col.to})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16, boxShadow: `0 4px 12px ${col.from}44`, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: 22, fontWeight: 900, color: T.textPrimary, lineHeight: 1 }}>{value}</p>
        <p style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>{label}</p>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   ENTRY ROW (liste plate)
───────────────────────────────────────────────────────────────── */
const EntryRow = ({ entry, showClass, showLevel, idx }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [expanded, setExpanded] = useState(false);
  const medal = RANK_MEDAL(entry.rank);

  return (
    <>
      <tr
        onClick={() => entry.subjects?.length > 0 && setExpanded(v => !v)}
        style={{
          background: idx % 2 === 0 ? "transparent" : dark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.012)",
          cursor: entry.subjects?.length > 0 ? "pointer" : "default",
          transition: "background .15s",
        }}
        onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
        onMouseLeave={e => e.currentTarget.style.background = idx % 2 === 0 ? "transparent" : dark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.012)"}
      >
        {/* Rang */}
        <td style={{ padding: "12px 16px", textAlign: "center", width: 60 }}>
          {medal
            ? <span style={{ fontSize: 18 }}>{medal.icon}</span>
            : <span style={{ fontSize: 13, fontWeight: 700, color: T.textMuted }}>#{entry.rank}</span>
          }
        </td>
        {/* Élève */}
        <td style={{ padding: "12px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: `linear-gradient(135deg,${COL.from},${COL.to})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: "#fff",
              boxShadow: `0 3px 8px ${COL.shadow}`,
            }}>
              {(entry.last_name?.[0] || "?").toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
                {entry.last_name} {entry.first_name}
              </p>
              {showClass && (
                <p style={{ fontSize: 11, color: T.textMuted, marginTop: 1 }}>{entry.class_name}</p>
              )}
            </div>
          </div>
        </td>
        {/* Classe */}
        {showClass && (
          <td style={{ padding: "12px 8px" }}>
            <span style={{
              fontSize: 11, fontWeight: 600, color: T.textSecondary,
              background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
              padding: "3px 8px", borderRadius: 6,
            }}>
              {entry.class_name}
            </span>
          </td>
        )}
        {/* Niveau */}
        {showLevel && (
          <td style={{ padding: "12px 8px" }}>
            <span style={{ fontSize: 11, color: T.textSecondary }}>{entry.level_name}</span>
          </td>
        )}
        {/* Moyenne */}
        <td style={{ padding: "12px 8px" }}>
          <AvgChip avg={entry.average} />
        </td>
        {/* Rang classe */}
        <td style={{ padding: "12px 8px", textAlign: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.textMuted }}>
            {entry.rank_in_class}e
          </span>
        </td>
        {/* Mention */}
        <td style={{ padding: "12px 8px" }}>
          <MentionBadge mention={entry.mention} />
        </td>
        {/* Expand */}
        {entry.subjects?.length > 0 && (
          <td style={{ padding: "12px 16px", textAlign: "center", width: 36 }}>
            {expanded
              ? <FaChevronUp  style={{ width: 10, height: 10, color: COL.from }} />
              : <FaChevronDown style={{ width: 10, height: 10, color: T.textMuted }} />}
          </td>
        )}
      </tr>

      {/* Détail matières */}
      {expanded && entry.subjects?.length > 0 && (
        <tr>
          <td colSpan={10} style={{ padding: 0 }}>
            <div style={{
              margin: "0 16px 12px", borderRadius: 10,
              background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              border: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"}`,
              overflow: "hidden",
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMuted }}>Matière</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: T.textMuted }}>Coef.</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: T.textMuted }}>Moyenne</th>
                    <th style={{ padding: "8px 12px", textAlign: "left",   fontSize: 11, fontWeight: 700, color: T.textMuted }}>Niveau</th>
                  </tr>
                </thead>
                <tbody>
                  {entry.subjects.map((s, si) => {
                    const avg = Number(s.average_subject);
                    const barW = Math.min(100, (avg / 20) * 100);
                    const barCol = avg >= 16 ? "#10b981" : avg >= 14 ? "#3b82f6" : avg >= 10 ? "#f59e0b" : "#ef4444";
                    return (
                      <tr key={si} style={{ borderTop: `1px solid ${dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
                        <td style={{ padding: "8px 12px", fontSize: 12, color: T.textPrimary, fontWeight: 500 }}>{s.subject_name}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontSize: 12, color: T.textMuted }}>{s.coefficient}</td>
                        <td style={{ padding: "8px 12px", textAlign: "center", fontSize: 13, fontWeight: 800, color: barCol }}>
                          {fmt(s.average_subject)}
                        </td>
                        <td style={{ padding: "8px 12px", minWidth: 100 }}>
                          <div style={{ height: 4, borderRadius: 99, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
                            <div style={{ height: 4, borderRadius: 99, width: `${barW}%`, background: barCol, transition: "width .4s" }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────
   FLAT LIST VIEW
───────────────────────────────────────────────────────────────── */
const FlatList = ({ entries, scope }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  if (!entries.length) return (
    <div style={{ textAlign: "center", padding: "60px 24px", color: T.textMuted, fontSize: 14 }}>
      Aucun élève au tableau d'honneur pour les critères sélectionnés.
    </div>
  );
  const showClass = scope !== "class";
  const showLevel = scope === "year";

  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 580 }}>
        <thead>
          <tr style={{ background: T.tableHead, borderBottom: `1px solid ${T.divider}` }}>
            <th style={{ padding: "10px 16px", textAlign: "center", fontSize: 11, fontWeight: 700, color: T.textMuted, width: 60 }}>Rang</th>
            <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMuted }}>Élève</th>
            {showClass && <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMuted }}>Classe</th>}
            {showLevel && <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMuted }}>Niveau</th>}
            <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMuted }}>Moyenne</th>
            <th style={{ padding: "10px 8px", textAlign: "center", fontSize: 11, fontWeight: 700, color: T.textMuted }}>Rang/Classe</th>
            <th style={{ padding: "10px 8px", textAlign: "left", fontSize: 11, fontWeight: 700, color: T.textMuted }}>Mention</th>
            <th style={{ width: 36 }} />
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <EntryRow key={e.student_id} entry={e} showClass={showClass} showLevel={showLevel} idx={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   BY-CLASS VIEW
───────────────────────────────────────────────────────────────── */
const ByClassView = ({ data }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const groups = data?.classes || [];
  if (!groups.length) return (
    <div style={{ textAlign: "center", padding: "60px 24px", color: T.textMuted, fontSize: 14 }}>
      Aucun résultat.
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {groups.map(grp => (
        <div key={grp.class_id} style={{
          background: T.cardBg, borderRadius: 16, overflow: "hidden",
          border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow,
        }}>
          {/* En-tête classe */}
          <div style={{
            padding: "14px 20px", display: "flex", alignItems: "center", gap: 12,
            background: `linear-gradient(135deg,${COL.from}12,${COL.to}08)`,
            borderBottom: `1px solid ${T.divider}`,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: `linear-gradient(135deg,${COL.from},${COL.to})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 4px 12px ${COL.shadow}`,
            }}>
              <FaSchool style={{ width: 14, height: 14, color: "#fff" }} />
            </div>
            <div>
              <p style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>{grp.class_name}</p>
              <p style={{ fontSize: 11, color: T.textMuted }}>{grp.level_name} · {grp.count} élève{grp.count > 1 ? "s" : ""}</p>
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
              {["Excellence", "Très Bien", "Bien"].map(m => {
                const cnt = grp.entries.filter(e => e.mention === m).length;
                if (!cnt) return null;
                const mm = MENTION_META[m];
                return (
                  <span key={m} style={{
                    fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                    background: `linear-gradient(135deg,${mm.from},${mm.to})`,
                    color: "#fff", boxShadow: `0 2px 6px ${mm.from}44`,
                  }}>
                    {mm.icon} {cnt}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: T.tableHead, borderBottom: `1px solid ${T.divider}` }}>
                <th style={{ padding: "8px 16px", textAlign: "center", fontSize: 10, fontWeight: 700, color: T.textMuted, width: 50 }}>Rang</th>
                <th style={{ padding: "8px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textMuted }}>Élève</th>
                <th style={{ padding: "8px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textMuted }}>Moyenne</th>
                <th style={{ padding: "8px 8px", textAlign: "left", fontSize: 10, fontWeight: 700, color: T.textMuted }}>Mention</th>
                <th style={{ width: 36 }} />
              </tr>
            </thead>
            <tbody>
              {grp.entries.map((e, i) => (
                <EntryRow key={e.student_id} entry={e} showClass={false} showLevel={false} idx={i} />
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   BY-LEVEL VIEW
───────────────────────────────────────────────────────────────── */
const LEVEL_COLORS = [
  { from: "#3b82f6", to: "#06b6d4" },
  { from: "#10b981", to: "#14b8a6" },
  { from: "#8b5cf6", to: "#ec4899" },
  { from: "#f59e0b", to: "#f97316" },
  { from: "#6366f1", to: "#3b82f6" },
];
const ByLevelView = ({ data }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const groups = data?.levels || [];
  if (!groups.length) return (
    <div style={{ textAlign: "center", padding: "60px 24px", color: T.textMuted, fontSize: 14 }}>
      Aucun résultat.
    </div>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {groups.map((grp, gi) => {
        const lc = LEVEL_COLORS[gi % LEVEL_COLORS.length];
        return (
          <div key={grp.level_id}>
            {/* Titre niveau */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{
                width: 10, height: 10, borderRadius: 3,
                background: `linear-gradient(135deg,${lc.from},${lc.to})`,
                boxShadow: `0 0 10px ${lc.from}88`,
              }} />
              <h3 style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>{grp.level_name}</h3>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                background: `linear-gradient(135deg,${lc.from},${lc.to})`,
                color: "#fff",
              }}>
                {grp.count} élève{grp.count > 1 ? "s" : ""}
              </span>
              <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${lc.from}44,transparent)` }} />
            </div>

            {/* Grid cartes */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
              {grp.entries.map((e, ei) => {
                const medal = RANK_MEDAL(e.rank);
                return (
                  <div key={e.student_id} style={{
                    background: T.cardBg, borderRadius: 14,
                    border: `1px solid ${T.cardBorder}`, boxShadow: T.cardShadow,
                    padding: "16px", display: "flex", alignItems: "center", gap: 12,
                    animation: `fadeUp .3s ${ei * 0.04}s both`,
                  }}>
                    {/* Avatar */}
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: 12,
                        background: `linear-gradient(135deg,${lc.from},${lc.to})`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 800, color: "#fff",
                        boxShadow: `0 4px 12px ${lc.from}44`,
                      }}>
                        {(e.last_name?.[0] || "?").toUpperCase()}
                      </div>
                      {medal && (
                        <span style={{ position: "absolute", top: -6, right: -6, fontSize: 14 }}>{medal.icon}</span>
                      )}
                    </div>
                    {/* Infos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {e.last_name} {e.first_name}
                      </p>
                      <p style={{ fontSize: 10, color: T.textMuted }}>{e.class_name} · #{e.rank_in_class}</p>
                    </div>
                    {/* Moyenne */}
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <p style={{
                        fontSize: 16, fontWeight: 900,
                        background: `linear-gradient(135deg,${lc.from},${lc.to})`,
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                      }}>
                        {fmt(e.average)}
                      </p>
                      <MentionBadge mention={e.mention} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   INNER PAGE
───────────────────────────────────────────────────────────────── */
const HonorRollInner = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  /* ── État filtres ── */
  const [schoolYears, setSchoolYears]   = useState([]);
  const [levels, setLevels]             = useState([]);
  const [classes, setClasses]           = useState([]);
  const [selectedYear, setSelectedYear] = useState("");
  const [term, setTerm]                 = useState("T1");
  const [scope, setScope]               = useState("year"); // class | level | year
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [honorThreshold, setHonorThreshold] = useState("");
  const [minSubjectAvg, setMinSubjectAvg]   = useState("");
  const [publishedOnly, setPublishedOnly]   = useState(true);
  const [viewMode, setViewMode]   = useState("flat"); // flat | by-class | by-level
  const [showAdvanced, setShowAdvanced] = useState(false);

  /* ── Données ── */
  const [loading, setLoading]   = useState(false);
  const [flatData, setFlatData] = useState(null);
  const [byClassData, setByClassData] = useState(null);
  const [byLevelData, setByLevelData] = useState(null);
  const [stats, setStats]       = useState(null);
  const [error, setError]       = useState(null);

  /* ── Active year threshold ── */
  const [activeYearMeta, setActiveYearMeta] = useState(null);

  /* ── Load reference data ── */
  useEffect(() => {
    fetchData("/academics/school-years/").then(d => {
      const arr = Array.isArray(d) ? d : d?.results ?? [];
      setSchoolYears(arr);
      const active = arr.find(y => y.is_active && !y.is_closed);
      if (active) {
        setSelectedYear(String(active.id));
        setActiveYearMeta(active);
      }
    }).catch(() => {});
    fetchData("/academics/levels/").then(d => setLevels(Array.isArray(d) ? d : d?.results ?? [])).catch(() => {});
    fetchData("/academics/school-classes/").then(d => setClasses(Array.isArray(d) ? d : d?.results ?? [])).catch(() => {});
  }, []);

  /* ── Sync year meta on change ── */
  useEffect(() => {
    const y = schoolYears.find(x => String(x.id) === selectedYear);
    setActiveYearMeta(y || null);
  }, [selectedYear, schoolYears]);

  /* ── Build query ── */
  const buildParams = useCallback(() => {
    const p = { term, school_year: selectedYear };
    if (scope === "class"  && selectedClass) p.school_class = selectedClass;
    if (scope === "level"  && selectedLevel) p.level        = selectedLevel;
    if (honorThreshold)   p.honor_threshold       = honorThreshold;
    if (minSubjectAvg)    p.min_subject_average    = minSubjectAvg;
    if (!publishedOnly)   p.published_only         = "false";
    return p;
  }, [term, selectedYear, scope, selectedClass, selectedLevel, honorThreshold, minSubjectAvg, publishedOnly]);

  /* ── Fetch all views in parallel ── */
  const doFetch = useCallback(async () => {
    const params = buildParams();
    const qs = buildQuery(params);
    if (!selectedYear) return;

    setLoading(true);
    setError(null);
    try {
      const [flat, byClass, byLevel, st] = await Promise.all([
        fetchData(`/academics/honor-roll/${qs}`),
        fetchData(`/academics/honor-roll/by-class/${qs}`),
        fetchData(`/academics/honor-roll/by-level/${qs}`),
        fetchData(`/academics/honor-roll/stats/${qs}`),
      ]);
      setFlatData(flat);
      setByClassData(byClass);
      setByLevelData(byLevel);
      setStats(st);
    } catch (e) {
      setError(e?.body?.detail || e?.message || "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  }, [buildParams, selectedYear]);

  useEffect(() => {
    if (selectedYear) doFetch();
  }, [doFetch, selectedYear]);

  /* ── Scope options ── */
  const scopeTabs = [
    { value: "year",  label: "🏫 École" },
    { value: "level", label: "📚 Niveau" },
    { value: "class", label: "🚪 Classe" },
  ];

  const termTabs = [
    { value: "T1",     label: "Trimestre 1" },
    { value: "T2",     label: "Trimestre 2" },
    { value: "T3",     label: "Trimestre 3" },
    { value: "annual", label: "Annuel" },
  ];

  const viewTabs = [
    { value: "flat",     label: <><FaTable style={{ width: 10, height: 10, marginRight: 5 }} />Liste</> },
    { value: "by-class", label: <><FaSchool style={{ width: 10, height: 10, marginRight: 5 }} />Par classe</> },
    { value: "by-level", label: <><FaLayerGroup style={{ width: 10, height: 10, marginRight: 5 }} />Par niveau</> },
  ];

  const currentEntries = flatData?.entries || [];
  const totalCount     = stats?.count ?? flatData?.count ?? 0;

  /* ── Classe filteredClasses selon scope/level ── */
  const filteredClasses = selectedLevel
    ? classes.filter(c => String(c.level?.id ?? c.level) === selectedLevel)
    : classes;

  return (
    <div style={{
      minHeight: "100vh", background: T.pageBg, fontFamily: "'Plus Jakarta Sans',sans-serif",
    }}>
      <style>{BASE_KEYFRAMES}</style>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ══ HEADER ═════════════════════════════════════════════════ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: T.headerBg, backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${T.divider}`,
        padding: "14px 32px", display: "flex", alignItems: "center", gap: 16,
      }}>
        <button onClick={() => navigate(-1)} style={{
          width: 34, height: 34, borderRadius: 10, border: `1px solid ${T.cardBorder}`,
          background: T.cardBg, cursor: "pointer", display: "flex",
          alignItems: "center", justifyContent: "center", outline: "none",
          color: T.textMuted, flexShrink: 0, boxShadow: T.cardShadow,
        }}>
          <FaArrowLeft style={{ width: 12, height: 12 }} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg,${COL.from},${COL.to})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: `0 4px 14px ${COL.shadow}`,
          }}>
            <FaTrophy style={{ width: 16, height: 16, color: "#fff" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 900, color: T.textPrimary, lineHeight: 1 }}>
              Tableau d'honneur
            </h1>
            {flatData && (
              <p style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                {flatData.school_year_label} ·{" "}
                {flatData.term === "annual" ? "Annuel" : `Trimestre ${flatData.term.slice(1)}`} ·{" "}
                Seuil {flatData.honor_threshold}/20
              </p>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Sélecteur année */}
          <Select
            value={selectedYear}
            onChange={setSelectedYear}
            placeholder="Année scolaire"
            options={schoolYears.map(y => ({ value: String(y.id), label: y.label + (y.is_active ? " ★" : "") }))}
          />
          <DarkToggle />
          <button onClick={doFetch} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 10,
            border: `1px solid ${T.cardBorder}`, background: T.cardBg, cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: T.textSecondary, outline: "none",
            boxShadow: T.cardShadow,
          }}>
            <FaSyncAlt style={{ width: 11, height: 11, ...(loading ? { animation: "spin 1s linear infinite" } : {}) }} />
            Actualiser
          </button>
        </div>
      </header>

      <main style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>

        {/* ══ FILTRES ════════════════════════════════════════════════ */}
        <div style={{
          background: T.cardBg, borderRadius: 18, border: `1px solid ${T.cardBorder}`,
          boxShadow: T.cardShadow, padding: "20px 24px", marginBottom: 24,
          animation: "fadeUp .3s both",
        }}>
          {/* Ligne 1 : Scope + Term */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Périmètre</p>
              <TabBar
                tabs={scopeTabs}
                value={scope}
                onChange={v => { setScope(v); setSelectedClass(""); setSelectedLevel(""); }}
                colFn={() => COL}
              />
            </div>

            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Période</p>
              <TabBar
                tabs={termTabs.filter(t => {
                  if (activeYearMeta?.nb_terms === 2 && t.value === "T3") return false;
                  return true;
                })}
                value={term}
                onChange={setTerm}
                colFn={v => TERM_COLORS[v] || COL}
              />
            </div>
          </div>

          {/* Ligne 2 : Sélecteurs conditionnels */}
          {(scope === "level" || scope === "class") && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", marginBottom: 16 }}>
              {scope === "level" && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Niveau</p>
                  <Select
                    value={selectedLevel}
                    onChange={v => { setSelectedLevel(v); setSelectedClass(""); }}
                    placeholder="Tous les niveaux"
                    options={levels.map(l => ({ value: String(l.id), label: l.name }))}
                  />
                </div>
              )}
              {scope === "class" && (
                <>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Filtrer par niveau</p>
                    <Select
                      value={selectedLevel}
                      onChange={v => { setSelectedLevel(v); setSelectedClass(""); }}
                      placeholder="Tous"
                      options={levels.map(l => ({ value: String(l.id), label: l.name }))}
                    />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Classe</p>
                    <Select
                      value={selectedClass}
                      onChange={setSelectedClass}
                      placeholder="Toutes les classes"
                      options={filteredClasses.map(c => ({ value: String(c.id), label: c.name + (c.level_name ? ` (${c.level_name})` : "") }))}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Ligne 3 : Options avancées */}
          <div>
            <button
              onClick={() => setShowAdvanced(v => !v)}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, outline: "none" }}
            >
              <FaFilter style={{ width: 10, height: 10, color: T.textMuted }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: T.textMuted }}>Options avancées</span>
              {showAdvanced
                ? <FaChevronUp style={{ width: 8, height: 8, color: T.textMuted }} />
                : <FaChevronDown style={{ width: 8, height: 8, color: T.textMuted }} />}
            </button>

            {showAdvanced && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.divider}` }}>
                {/* Seuil honor */}
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>
                    Seuil honneur
                    {activeYearMeta?.honor_threshold && !honorThreshold
                      ? ` (défaut : ${activeYearMeta.honor_threshold}/20)` : ""}
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="number" min="0" max="20" step="0.5"
                      value={honorThreshold}
                      onChange={e => setHonorThreshold(e.target.value)}
                      placeholder={activeYearMeta?.honor_threshold ?? "14"}
                      style={{
                        width: 80, padding: "8px 12px", borderRadius: 10,
                        border: `1px solid ${honorThreshold ? COL.from : T.inputBorder}`,
                        background: T.inputBg, color: T.textPrimary, fontSize: 13,
                        fontWeight: 600, outline: "none",
                      }}
                    />
                    <span style={{ fontSize: 12, color: T.textMuted }}>/20</span>
                    {honorThreshold && (
                      <button onClick={() => setHonorThreshold("")} style={{
                        background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 11,
                      }}>
                        Réinitialiser
                      </button>
                    )}
                  </div>
                </div>

                {/* Plancher matière */}
                {term !== "annual" && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>
                      Plancher par matière
                      {activeYearMeta?.min_subject_average && !minSubjectAvg
                        ? ` (défaut : ${activeYearMeta.min_subject_average}/20)` : " (optionnel)"}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="number" min="0" max="20" step="0.5"
                        value={minSubjectAvg}
                        onChange={e => setMinSubjectAvg(e.target.value)}
                        placeholder={activeYearMeta?.min_subject_average ?? "8"}
                        style={{
                          width: 80, padding: "8px 12px", borderRadius: 10,
                          border: `1px solid ${minSubjectAvg ? COL.from : T.inputBorder}`,
                          background: T.inputBg, color: T.textPrimary, fontSize: 13,
                          fontWeight: 600, outline: "none",
                        }}
                      />
                      <span style={{ fontSize: 12, color: T.textMuted }}>/20</span>
                      {minSubjectAvg && (
                        <button onClick={() => setMinSubjectAvg("")} style={{
                          background: "none", border: "none", cursor: "pointer", color: T.textMuted, fontSize: 11,
                        }}>✕</button>
                      )}
                    </div>
                  </div>
                )}

                {/* Published only */}
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".08em" }}>Données</p>
                  <button
                    onClick={() => setPublishedOnly(v => !v)}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 10,
                      border: `1px solid ${publishedOnly ? COL.from + "55" : T.inputBorder}`,
                      background: publishedOnly ? (dark ? COL.darkBg : COL.lightBg) : T.inputBg,
                      cursor: "pointer", outline: "none", fontSize: 12, fontWeight: 600,
                      color: publishedOnly ? COL.text : T.textMuted,
                    }}>
                    {publishedOnly ? <FaCheck style={{ width: 10, height: 10 }} /> : null}
                    {publishedOnly ? "Publiés uniquement" : "Publiés + verrouillés"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bouton appliquer */}
          <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
            <button onClick={doFetch} style={{
              padding: "9px 22px", borderRadius: 10, border: "none", cursor: "pointer",
              background: `linear-gradient(135deg,${COL.from},${COL.to})`,
              color: "#fff", fontWeight: 700, fontSize: 13,
              boxShadow: `0 4px 16px ${COL.shadow}`, outline: "none",
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Chargement…" : "Appliquer"}
            </button>
          </div>
        </div>

        {/* ══ ERREUR ══════════════════════════════════════════════════ */}
        {error && (
          <div style={{
            padding: "14px 20px", borderRadius: 14, marginBottom: 20,
            background: "#ef444418", border: "1px solid #ef444433",
            display: "flex", alignItems: "center", gap: 10,
          }}>
            <FaExclamationTriangle style={{ color: "#ef4444", flexShrink: 0, width: 14, height: 14 }} />
            <p style={{ fontSize: 13, color: "#ef4444", fontWeight: 600 }}>{error}</p>
          </div>
        )}

        {/* ══ STATS ═══════════════════════════════════════════════════ */}
        {stats && !error && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24,
            animation: "fadeUp .35s .05s both",
          }}>
            <StatCard icon="🏆" label="Au tableau d'honneur" value={totalCount}
              col={{ from: COL.from, to: COL.to }} />
            {stats.mention_breakdown?.Excellence > 0 && (
              <StatCard icon="🏆" label="Excellence (≥18)" value={stats.mention_breakdown.Excellence}
                col={MENTION_META.Excellence} />
            )}
            {stats.mention_breakdown?.["Très Bien"] > 0 && (
              <StatCard icon="⭐" label="Très Bien (≥16)" value={stats.mention_breakdown["Très Bien"]}
                col={MENTION_META["Très Bien"]} />
            )}
            {stats.mention_breakdown?.Bien > 0 && (
              <StatCard icon="✨" label="Bien (≥14)" value={stats.mention_breakdown.Bien}
                col={MENTION_META["Bien"]} />
            )}
          </div>
        )}

        {/* ══ TABLEAU ═════════════════════════════════════════════════ */}
        {!error && (
          <div style={{
            background: T.cardBg, borderRadius: 18, border: `1px solid ${T.cardBorder}`,
            boxShadow: T.cardShadow, overflow: "hidden",
            animation: "fadeUp .4s .1s both",
          }}>
            {/* Toolbar */}
            <div style={{
              padding: "16px 24px", borderBottom: `1px solid ${T.divider}`,
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
            }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
                  {totalCount > 0
                    ? `${totalCount} élève${totalCount > 1 ? "s" : ""} au tableau d'honneur`
                    : loading ? "Chargement…" : "Tableau d'honneur"}
                </h2>
                {flatData && (
                  <p style={{ fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                    Seuil : {flatData.honor_threshold}/20
                    {flatData.min_subject_average ? ` · Plancher matière : ${flatData.min_subject_average}/20` : ""}
                  </p>
                )}
              </div>

              {/* View mode */}
              <div style={{ display: "flex", gap: 4, background: T.pageBg, padding: 4, borderRadius: 10 }}>
                {viewTabs.map(vt => (
                  <button key={vt.value} onClick={() => setViewMode(vt.value)} style={{
                    padding: "6px 12px", borderRadius: 7, border: "none", cursor: "pointer",
                    background: viewMode === vt.value ? `linear-gradient(135deg,${COL.from},${COL.to})` : "transparent",
                    color: viewMode === vt.value ? "#fff" : T.textMuted,
                    fontWeight: 700, fontSize: 11, outline: "none",
                    boxShadow: viewMode === vt.value ? `0 2px 8px ${COL.shadow}` : "none",
                    display: "flex", alignItems: "center",
                  }}>
                    {vt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: viewMode !== "flat" ? "20px" : 0 }}>
              {loading ? (
                <div style={{ textAlign: "center", padding: "60px 24px", color: T.textMuted }}>
                  <FaSyncAlt style={{ width: 24, height: 24, marginBottom: 12, animation: "spin 1s linear infinite" }} />
                  <p style={{ fontSize: 14 }}>Calcul du tableau d'honneur…</p>
                </div>
              ) : viewMode === "flat" ? (
                <FlatList entries={currentEntries} scope={scope} />
              ) : viewMode === "by-class" ? (
                <ByClassView data={byClassData} />
              ) : (
                <ByLevelView data={byLevelData} />
              )}
            </div>
          </div>
        )}

        {/* ══ LÉGENDE ══════════════════════════════════════════════════ */}
        {!loading && totalCount === 0 && !error && (
          <div style={{ textAlign: "center", padding: "20px", color: T.textMuted, fontSize: 12, marginTop: 8 }}>
            💡 Le tableau d'honneur n'est disponible que pour les trimestres publiés.
            Vérifiez que les trimestres sont bien publiés dans la gestion des trimestres.
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────
   ROOT — ThemeCtx + persistance
───────────────────────────────────────────────────────────────── */
const HonorRoll = () => {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("scol360_dark") === "true"; } catch { return false; }
  });
  const toggle = () => setDark(v => {
    const next = !v;
    try { localStorage.setItem("scol360_dark", String(next)); } catch {}
    return next;
  });
  return (
    <ThemeCtx.Provider value={{ dark, toggle }}>
      <HonorRollInner />
    </ThemeCtx.Provider>
  );
};

export default HonorRoll;