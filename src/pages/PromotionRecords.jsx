// src/pages/PromotionRecords.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  FaCheck, FaMoon, FaSun, FaExclamationTriangle, FaTimesCircle,
  FaUserGraduate, FaSearch, FaSyncAlt, FaHistory, FaArrowRight,
} from "react-icons/fa";
import { fetchData } from "./api";
import { useTheme, LIGHT, DARK, BASE_KEYFRAMES, SECTION_PALETTE } from "./theme";

const COL = SECTION_PALETTE.promotion;

/* ── helpers ── */
const fmtDate = iso =>
  iso ? new Date(iso).toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

/* ── DarkToggle ── */
const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} style={{
      position: "relative", width: 52, height: 28, borderRadius: 999,
      border: "none", cursor: "pointer", flexShrink: 0, outline: "none", transition: "all .3s",
      background: dark ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
        : `linear-gradient(135deg,${COL.from},${COL.to})`,
    }}>
      <div style={{
        position: "absolute", top: 2, width: 24, height: 24, borderRadius: 999,
        background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all .3s", left: dark ? "calc(100% - 26px)" : 2,
      }}>
        {dark ? <FaMoon style={{ width: 11, height: 11, color: "#6366f1" }} />
               : <FaSun  style={{ width: 11, height: 11, color: COL.from }} />}
      </div>
    </button>
  );
};

/* ══════════════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════════════ */
const PromotionRecords = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  const [records, setRecords]       = useState([]);
  const [years, setYears]           = useState([]);
  const [selYear, setSelYear]       = useState("");
  const [search, setSearch]         = useState("");
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("all"); // all | promoted | repeating

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [recs, yrs] = await Promise.all([
        fetchData("/academics/promotion-records/"),
        fetchData("/academics/school-years/"),
      ]);
      setRecords(Array.isArray(recs) ? recs : recs?.results ?? []);
      const yrArr = Array.isArray(yrs) ? yrs : yrs?.results ?? [];
      setYears(yrArr.filter(y => y.is_closed));
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* Filtrage */
  const displayed = records.filter(r => {
    const yearMatch = !selYear || r.school_year_label === selYear;
    const promMatch = filter === "all" || (filter === "promoted" ? r.is_promoted : !r.is_promoted);
    const q = search.toLowerCase();
    const nameMatch = !q ||
      (r.student_firstname + " " + r.student_lastname).toLowerCase().includes(q) ||
      (r.student_lastname + " " + r.student_firstname).toLowerCase().includes(q);
    return yearMatch && promMatch && nameMatch;
  });

  const promotedCount  = displayed.filter(r => r.is_promoted).length;
  const repeatingCount = displayed.filter(r => !r.is_promoted).length;

  return (
    <>
      <style>{BASE_KEYFRAMES}</style>
      <div style={{ minHeight: "100vh", background: T.pageBg, fontFamily: "'Plus Jakarta Sans',sans-serif", padding: "28px 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 46, height: 46, borderRadius: 14,
              background: `linear-gradient(135deg,${COL.from},${COL.to})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 6px 20px ${COL.shadow}`,
            }}>
              <FaHistory style={{ color: "#fff", width: 18, height: 18 }} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: T.textPrimary, margin: 0 }}>Journal des promotions</h1>
              <p style={{ fontSize: 12, color: T.textSecondary, margin: 0 }}>
                Audit complet des décisions de passage de fin d'année
              </p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <DarkToggle />
            <button onClick={fetchAll} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "8px 14px",
              borderRadius: 11, border: `1.5px solid ${T.inputBorder}`,
              background: "transparent", color: T.textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              <FaSyncAlt style={{ width: 11, height: 11 }} /> Actualiser
            </button>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20, alignItems: "center" }}>
          {/* Année */}
          <select value={selYear} onChange={e => setSelYear(e.target.value)} style={{
            padding: "8px 12px", borderRadius: 10,
            border: `1.5px solid ${T.inputBorder}`, background: T.inputBg,
            color: T.textPrimary, fontSize: 12, outline: "none", cursor: "pointer",
          }}>
            <option value="">Toutes les années</option>
            {years.map(y => <option key={y.id} value={y.label}>{y.label}</option>)}
          </select>

          {/* Recherche */}
          <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
            <FaSearch style={{
              position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
              color: T.textMuted, width: 11, height: 11,
            }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher un élève…"
              style={{
                width: "100%", padding: "8px 12px 8px 30px", borderRadius: 10,
                border: `1.5px solid ${T.inputBorder}`, background: T.inputBg,
                color: T.textPrimary, fontSize: 12, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {/* Filtre admis/ajourné */}
          <div style={{ display: "flex", borderRadius: 10, overflow: "hidden", border: `1.5px solid ${T.inputBorder}` }}>
            {[["all","Tous"], ["promoted","Admis"], ["repeating","Ajournés"]].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)} style={{
                padding: "7px 14px", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: filter === val ? `linear-gradient(135deg,${COL.from},${COL.to})` : T.inputBg,
                color: filter === val ? "#fff" : T.textSecondary,
              }}>{label}</button>
            ))}
          </div>
        </div>

        {/* Stats rapides */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Admis", value: promotedCount, color: "#10b981" },
            { label: "Ajournés", value: repeatingCount, color: "#ef4444" },
            { label: "Total", value: displayed.length, color: COL.from },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: "10px 16px", borderRadius: 12,
              background: T.cardBg, border: `1px solid ${T.cardBorder}`,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 20, fontWeight: 800, color }}>{value}</span>
              <span style={{ fontSize: 11, color: T.textSecondary }}>{label}</span>
            </div>
          ))}
        </div>

        {/* Tableau */}
        <div style={{
          background: T.cardBg, borderRadius: 18, border: `1px solid ${T.cardBorder}`,
          boxShadow: T.cardShadow, overflow: "hidden",
        }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: T.textMuted, fontSize: 13 }}>Chargement…</div>
          ) : displayed.length === 0 ? (
            <div style={{ padding: 50, textAlign: "center", color: T.textMuted, fontSize: 13 }}>
              Aucun enregistrement de promotion trouvé.
            </div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.tableHead }}>
                  {["Élève", "Année", "Niveau de départ", "Trajet", "Moy. annuelle", "Décision", "Date"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "11px 16px", fontSize: 10,
                      fontWeight: 700, color: T.textSecondary, letterSpacing: ".04em",
                      borderBottom: `1px solid ${T.divider}`,
                    }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(r => (
                  <tr key={r.id}
                    style={{ borderBottom: `1px solid ${T.divider}`, transition: "background .15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <td style={{ padding: "11px 16px" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: T.textPrimary, margin: 0 }}>
                        {r.student_lastname} {r.student_firstname}
                      </p>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                        background: `${COL.from}18`, color: COL.from,
                      }}>{r.school_year_label}</span>
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 12, color: T.textSecondary }}>
                      {r.from_level_name ?? "—"}{r.from_class_name ? ` · ${r.from_class_name}` : ""}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      {r.is_promoted ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                          <span style={{ color: T.textSecondary }}>{r.from_level_name ?? "—"}</span>
                          <FaArrowRight style={{ color: "#10b981", width: 10, height: 10 }} />
                          <span style={{ color: T.textPrimary, fontWeight: 700 }}>
                            {r.to_level_name ?? <em style={{ color: "#ec4899" }}>Diplômé</em>}
                            {r.to_class_name ? ` · ${r.to_class_name}` : ""}
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 700 }}>Redouble</span>
                      )}
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      <span style={{
                        fontSize: 13, fontWeight: 800,
                        color: r.annual_average >= 10 ? "#10b981" : "#ef4444",
                      }}>
                        {r.annual_average !== null ? `${Number(r.annual_average).toFixed(2)}/20` : "—"}
                      </span>
                    </td>
                    <td style={{ padding: "11px 16px" }}>
                      {r.is_promoted ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: "#10b98118", color: "#10b981",
                        }}>
                          <FaUserGraduate style={{ width: 10, height: 10 }} /> Admis
                        </span>
                      ) : (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: "#ef444418", color: "#ef4444",
                        }}>
                          <FaTimesCircle style={{ width: 10, height: 10 }} /> Ajourné
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "11px 16px", fontSize: 11, color: T.textMuted }}>
                      {fmtDate(r.processed_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

export default PromotionRecords;