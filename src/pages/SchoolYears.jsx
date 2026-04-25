// src/pages/SchoolYears.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  FaPlus, FaCheck, FaMoon, FaSun, FaExclamationTriangle, FaExclamationCircle,
  FaCalendarAlt, FaBolt, FaLock, FaUnlock, FaChevronRight, FaClock,
  FaSyncAlt, FaSchool,
} from "react-icons/fa";
import { fetchData, postData, patchData } from "./api";
import { useTheme, LIGHT, DARK, BASE_KEYFRAMES, SECTION_PALETTE } from "./theme";

const COL = SECTION_PALETTE.promotion;

/* ── helpers ── */
const fmtDate = iso =>
  iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const yearStatus = (year) => {
  if (year.is_closed)  return { label: "Clôturée",  color: "#ef4444", bg: "#ef444418", Icon: FaLock };
  if (year.is_active)  return { label: "Active",    color: "#10b981", bg: "#10b98118", Icon: FaBolt };
  return                      { label: "Inactive",  color: "#94a3b8", bg: "#94a3b818", Icon: FaClock };
};

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

/* ── Toast ── */
const Toast = ({ msg, onClose }) => {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  const isErr = msg.type === "error";
  return (
    <div onClick={onClose} style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 400,
      display: "flex", alignItems: "center", gap: 10, padding: "13px 18px",
      borderRadius: 14, cursor: "pointer", fontWeight: 700, fontSize: 12, color: "#fff",
      animation: "slideUp .3s cubic-bezier(.34,1.56,.64,1)", maxWidth: 380,
      background: isErr ? "linear-gradient(135deg,#ef4444,#dc2626)"
        : `linear-gradient(135deg,${COL.from},${COL.to})`,
      boxShadow: isErr ? "0 8px 24px #ef444444" : `0 8px 24px ${COL.shadow}`,
    }}>
      {isErr ? <FaExclamationTriangle style={{ flexShrink: 0, width: 13, height: 13 }} />
             : <FaCheck style={{ flexShrink: 0, width: 13, height: 13 }} />}
      {msg.text}
    </div>
  );
};

/* ── Modale création ── */
const CreateYearModal = ({ open, onClose, onCreated }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [label, setLabel]           = useState("");
  const [nbTerms, setNbTerms]       = useState(3);
  const [passAvg, setPassAvg]       = useState("10.00");
  const [startDate, setStartDate]   = useState("");
  const [endDate, setEndDate]       = useState("");
  const [saving, setSaving]         = useState(false);
  const [err, setErr]               = useState("");

  useEffect(() => {
    if (open) { setLabel(""); setNbTerms(3); setPassAvg("10.00"); setStartDate(""); setEndDate(""); setErr(""); }
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSubmit = async () => {
    if (!/^\d{4}-\d{4}$/.test(label.trim())) { setErr("Format attendu : AAAA-AAAA (ex : 2025-2026)."); return; }
    setSaving(true);
    try {
      await postData("/academics/school-years/", {
        label: label.trim(),
        nb_terms: nbTerms,
        passing_average: passAvg,
        start_date: startDate || null,
        end_date: endDate || null,
      });
      onCreated("Année scolaire créée avec succès.");
      onClose();
    } catch (e) {
      setErr(e?.message || "Erreur lors de la création.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  const inp = {
    width: "100%", padding: "9px 12px", borderRadius: 10,
    border: `1.5px solid ${T.inputBorder}`, background: T.inputBg,
    color: T.textPrimary, fontSize: 13, outline: "none", boxSizing: "border-box",
  };
  const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: T.textSecondary, marginBottom: 6 };
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 16, animation: "fadeIn .15s ease-out",
    }}>
      <div style={{
        width: "100%", maxWidth: 480, background: T.cardBg, borderRadius: 20,
        boxShadow: "0 24px 60px rgba(0,0,0,.35)", border: `1.5px solid ${T.cardBorder}`,
        animation: "panelUp .2s cubic-bezier(.34,1.4,.64,1)", overflow: "hidden",
      }}>
        <div style={{ height: 4, background: `linear-gradient(90deg,${COL.from},${COL.to})` }} />
        <div style={{ padding: "22px 22px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, display: "flex", alignItems: "center",
              justifyContent: "center", background: `${COL.from}18`,
            }}>
              <FaCalendarAlt style={{ width: 15, height: 15, color: COL.from }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>Nouvelle année scolaire</p>
          </div>

          <label style={lbl}>LIBELLÉ * <span style={{ fontWeight: 400, color: T.textMuted }}>(format AAAA-AAAA)</span></label>
          <input value={label} onChange={e => setLabel(e.target.value)} placeholder="ex : 2025-2026" style={{ ...inp, marginBottom: 14 }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            <div>
              <label style={lbl}>NB TRIMESTRES</label>
              <select value={nbTerms} onChange={e => setNbTerms(Number(e.target.value))} style={{ ...inp }}>
                <option value={2}>2 trimestres</option>
                <option value={3}>3 trimestres</option>
              </select>
            </div>
            <div>
              <label style={lbl}>MOYENNE DE PASSAGE</label>
              <input type="number" min="0" max="20" step="0.5" value={passAvg}
                onChange={e => setPassAvg(e.target.value)} style={{ ...inp }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
            <div>
              <label style={lbl}>DATE DE DÉBUT</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inp }} />
            </div>
            <div>
              <label style={lbl}>DATE DE FIN</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={{ ...inp }} />
            </div>
          </div>

          {err && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "#ef444418", marginBottom: 14 }}>
              <FaExclamationCircle style={{ color: "#ef4444", width: 12, height: 12, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: "#ef4444" }}>{err}</p>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={onClose} style={{
              padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${T.inputBorder}`,
              background: "transparent", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Annuler</button>
            <button onClick={handleSubmit} disabled={saving} style={{
              padding: "9px 20px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg,${COL.from},${COL.to})`,
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            }}>{saving ? "Création…" : "Créer l'année"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Modale confirmation activation ── */
const ActivateConfirm = ({ year, onConfirm, onCancel }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  if (!year) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}>
      <div style={{
        width: "100%", maxWidth: 420, background: T.cardBg, borderRadius: 18,
        boxShadow: "0 24px 60px rgba(0,0,0,.35)", border: `1.5px solid ${T.cardBorder}`,
        overflow: "hidden", animation: "panelUp .2s cubic-bezier(.34,1.4,.64,1)",
      }}>
        <div style={{ height: 4, background: `linear-gradient(90deg,${COL.from},${COL.to})` }} />
        <div style={{ padding: "20px 20px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: `${COL.from}18` }}>
              <FaBolt style={{ width: 14, height: 14, color: COL.from }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>Activer cette année</p>
          </div>
          <p style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.65, paddingLeft: 44 }}>
            Activer <strong style={{ color: T.textPrimary }}>«{year.label}»</strong> désactivera l'année actuellement active.
            Tous les nouveaux enregistrements (notes, bulletins, frais…) seront associés à cette année.
          </p>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
            <button onClick={onCancel} style={{
              padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${T.inputBorder}`,
              background: "transparent", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer",
            }}>Annuler</button>
            <button onClick={onConfirm} style={{
              padding: "8px 18px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg,${COL.from},${COL.to})`,
              color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}>Activer</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════════════ */
const SchoolYears = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  const [years, setYears]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modalOpen, setModalOpen]   = useState(false);
  const [activating, setActivating] = useState(null);
  const [toast, setToast]           = useState(null);

  const showToast = (text, type = "success") => setToast({ text, type });

  const fetchYears = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData("/academics/school-years/");
      setYears(Array.isArray(data) ? data : data?.results ?? []);
    } catch {
      showToast("Erreur lors du chargement des années scolaires.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchYears(); }, [fetchYears]);

  const handleActivate = async () => {
    if (!activating) return;
    try {
      await postData(`/academics/school-years/${activating.id}/activate/`, {});
      showToast(`Année ${activating.label} activée.`);
      await fetchYears();
    } catch (e) {
      showToast(e?.message || "Erreur lors de l'activation.", "error");
    } finally {
      setActivating(null);
    }
  };

  const activeYear = years.find(y => y.is_active);

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
              <FaSchool style={{ color: "#fff", width: 20, height: 20 }} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: T.textPrimary, margin: 0 }}>Années scolaires</h1>
              <p style={{ fontSize: 12, color: T.textSecondary, margin: 0 }}>
                {activeYear ? `Année active : ${activeYear.label}` : "Aucune année active"}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <DarkToggle />
            <button onClick={() => fetchYears()} style={{
              display: "flex", alignItems: "center", gap: 7, padding: "8px 14px",
              borderRadius: 11, border: `1.5px solid ${T.inputBorder}`,
              background: "transparent", color: T.textSecondary, fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
              <FaSyncAlt style={{ width: 11, height: 11 }} /> Actualiser
            </button>
            <button onClick={() => setModalOpen(true)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 16px",
              borderRadius: 12, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff",
              background: `linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow: `0 4px 16px ${COL.shadow}`,
            }}>
              <FaPlus style={{ width: 11, height: 11 }} /> Nouvelle année
            </button>
          </div>
        </div>

        {/* Bannière année active */}
        {activeYear && (
          <div style={{
            padding: "14px 20px", borderRadius: 14, marginBottom: 24,
            background: `linear-gradient(135deg,${COL.from}18,${COL.to}10)`,
            border: `1px solid ${COL.from}30`,
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 10,
                background: `linear-gradient(135deg,${COL.from},${COL.to})`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <FaBolt style={{ color: "#fff", width: 13, height: 13 }} />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 800, color: T.textPrimary, margin: 0 }}>
                  {activeYear.label} — Année active
                </p>
                <p style={{ fontSize: 11, color: T.textSecondary, margin: 0 }}>
                  {activeYear.nb_terms} trimestre{activeYear.nb_terms > 1 ? "s" : ""} · Moyenne de passage : {activeYear.passing_average}/20
                  {activeYear.start_date ? ` · Du ${fmtDate(activeYear.start_date)} au ${fmtDate(activeYear.end_date)}` : ""}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {activeYear.terms?.map(t => (
                <span key={t} style={{
                  padding: "3px 10px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                  background: `${COL.from}20`, color: COL.from,
                }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* Liste */}
        {loading ? (
          <div style={{ padding: 60, textAlign: "center", color: T.textMuted, fontSize: 13 }}>Chargement…</div>
        ) : years.length === 0 ? (
          <div style={{
            padding: 60, textAlign: "center", color: T.textMuted, fontSize: 13,
            background: T.cardBg, borderRadius: 18, border: `1px solid ${T.cardBorder}`,
          }}>Aucune année scolaire enregistrée. Créez-en une pour démarrer.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {years.map(year => {
              const st = yearStatus(year);
              return (
                <div key={year.id} style={{
                  background: T.cardBg, borderRadius: 16, border: `1px solid ${T.cardBorder}`,
                  boxShadow: T.cardShadow, padding: "18px 20px",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                  transition: "box-shadow .2s",
                  ...(year.is_active ? { borderColor: `${COL.from}40`, boxShadow: `0 4px 20px ${COL.shadow}` } : {}),
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
                    {/* Icône statut */}
                    <div style={{
                      width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: st.bg,
                    }}>
                      <st.Icon style={{ width: 16, height: 16, color: st.color }} />
                    </div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                        <p style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary, margin: 0 }}>{year.label}</p>
                        <span style={{
                          padding: "2px 9px", borderRadius: 8, fontSize: 11, fontWeight: 700,
                          background: st.bg, color: st.color,
                        }}>{st.label}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12, color: T.textSecondary }}>
                        <span>{year.nb_terms} trimestre{year.nb_terms > 1 ? "s" : ""}</span>
                        <span>Seuil : {year.passing_average}/20</span>
                        {year.start_date && <span>Du {fmtDate(year.start_date)} au {fmtDate(year.end_date)}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    {year.terms?.map(t => (
                      <span key={t} style={{
                        padding: "2px 8px", borderRadius: 7, fontSize: 10, fontWeight: 700,
                        background: `${T.textMuted}18`, color: T.textSecondary,
                      }}>{t}</span>
                    ))}
                    {!year.is_active && !year.is_closed && (
                      <button onClick={() => setActivating(year)} style={{
                        display: "flex", alignItems: "center", gap: 7, padding: "7px 14px",
                        borderRadius: 10, border: `1.5px solid ${COL.from}40`,
                        background: `${COL.from}10`, color: COL.from,
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}>
                        <FaBolt style={{ width: 11, height: 11 }} /> Activer
                      </button>
                    )}
                    {year.is_active && !year.is_closed && (
                      <a href="/academics/year-end-promotion" style={{
                        display: "flex", alignItems: "center", gap: 7, padding: "7px 14px",
                        borderRadius: 10, border: "none",
                        background: `linear-gradient(135deg,${COL.from},${COL.to})`,
                        color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer",
                        textDecoration: "none",
                      }}>
                        Fin d'année <FaChevronRight style={{ width: 10, height: 10 }} />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <CreateYearModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={async (msg) => { await fetchYears(); showToast(msg); }} />
        <ActivateConfirm year={activating} onConfirm={handleActivate} onCancel={() => setActivating(null)} />
        <Toast msg={toast} onClose={() => setToast(null)} />
      </div>
    </>
  );
};

export default SchoolYears;