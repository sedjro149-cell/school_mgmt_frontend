// src/pages/Levels.jsx
import React, { useEffect, useState } from "react";
import {
  FaEdit, FaTrash, FaPlus, FaSearch, FaMoon, FaSun,
  FaSortNumericUp, FaGraduationCap, FaExclamationCircle, FaCheck,
  FaExclamationTriangle,
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData, patchData } from "./api";
import { useTheme, LIGHT, DARK, BASE_KEYFRAMES, SECTION_PALETTE } from "./theme";

const COL = SECTION_PALETTE.academic;

/* ── DarkToggle ── */
const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button onClick={toggle}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position: "relative", width: 52, height: 28, borderRadius: 999,
        border: "none", cursor: "pointer", flexShrink: 0, outline: "none", transition: "all .3s",
        background: dark ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
          : `linear-gradient(135deg,${COL.from},${COL.to})`,
        boxShadow: hov ? `0 0 18px ${COL.shadow}` : "0 2px 8px rgba(0,0,0,.2)",
      }}>
      <div style={{
        position: "absolute", top: 2, width: 24, height: 24, borderRadius: 999,
        background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all .3s", left: dark ? "calc(100% - 26px)" : 2,
        boxShadow: "0 2px 6px rgba(0,0,0,.25)",
      }}>
        {dark ? <FaMoon style={{ width: 11, height: 11, color: "#6366f1" }} />
               : <FaSun  style={{ width: 11, height: 11, color: COL.from }} />}
      </div>
    </button>
  );
};

/* ── Toast ── */
const Toast = ({ msg, onClose }) => {
  useEffect(() => {
    if (msg) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }
  }, [msg]);
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

/* ── Modal création/édition ── */
const LevelModal = ({ open, level, onClose, onSaved }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [name, setName]     = useState("");
  const [order, setOrder]   = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  useEffect(() => {
    if (open) {
      setName(level ? level.name : "");
      setOrder(level ? String(level.order ?? "") : "");
      setErr("");
    }
  }, [open, level]);

  const handleSubmit = async () => {
    if (!name.trim()) { setErr("Le nom du niveau est requis."); return; }
    const orderVal = order !== "" ? parseInt(order, 10) : 0;
    if (order !== "" && (isNaN(orderVal) || orderVal < 0)) {
      setErr("L'ordre doit être un entier positif."); return;
    }
    setSaving(true);
    try {
      const payload = { name: name.trim(), order: orderVal };
      if (level) {
        await patchData(`/academics/levels/${level.id}/`, payload);
      } else {
        await postData("/academics/levels/", payload);
      }
      onSaved(level ? "Niveau modifié avec succès." : "Niveau ajouté avec succès.");
      onClose();
    } catch (e) {
      setErr(e?.message || "Erreur lors de l'opération.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.55)",
      backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
      justifyContent: "center", padding: 16, animation: "fadeIn .15s ease-out",
    }}>
      <div style={{
        width: "100%", maxWidth: 440, background: T.cardBg, borderRadius: 20,
        boxShadow: "0 24px 60px rgba(0,0,0,.35)",
        border: `1.5px solid ${T.cardBorder}`,
        animation: "panelUp .2s cubic-bezier(.34,1.4,.64,1)", overflow: "hidden",
      }}>
        <div style={{ height: 4, background: `linear-gradient(90deg,${COL.from},${COL.to})` }} />
        <div style={{ padding: "22px 22px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `${COL.from}18`,
            }}>
              <FaGraduationCap style={{ width: 16, height: 16, color: COL.from }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 800, color: T.textPrimary }}>
              {level ? "Modifier le niveau" : "Nouveau niveau"}
            </p>
          </div>

          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
            NOM DU NIVEAU *
          </label>
          <input
            value={name} onChange={e => setName(e.target.value)}
            placeholder="ex : 6ème, 5ème, Terminale…"
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 10,
              border: `1.5px solid ${T.inputBorder}`, background: T.inputBg,
              color: T.textPrimary, fontSize: 13, outline: "none",
              boxSizing: "border-box", marginBottom: 14,
            }}
          />

          <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: T.textSecondary, marginBottom: 6 }}>
            ORDRE HIÉRARCHIQUE
            <span style={{ fontWeight: 400, color: T.textMuted, marginLeft: 6 }}>
              (1 = premier niveau, N = niveau terminal)
            </span>
          </label>
          <div style={{ position: "relative", marginBottom: 18 }}>
            <FaSortNumericUp style={{
              position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
              color: T.textMuted, width: 12, height: 12,
            }} />
            <input
              type="number" min="0" value={order}
              onChange={e => setOrder(e.target.value)}
              placeholder="ex : 1"
              style={{
                width: "100%", padding: "9px 12px 9px 30px", borderRadius: 10,
                border: `1.5px solid ${T.inputBorder}`, background: T.inputBg,
                color: T.textPrimary, fontSize: 13, outline: "none", boxSizing: "border-box",
              }}
            />
          </div>

          {err && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
              borderRadius: 10, background: "#ef444418", marginBottom: 14,
            }}>
              <FaExclamationCircle style={{ color: "#ef4444", width: 12, height: 12, flexShrink: 0 }} />
              <p style={{ fontSize: 12, color: "#ef4444" }}>{err}</p>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <button onClick={onClose} style={{
              padding: "9px 18px", borderRadius: 10, border: `1.5px solid ${T.inputBorder}`,
              background: "transparent", color: T.textSecondary, fontSize: 13,
              fontWeight: 600, cursor: "pointer",
            }}>Annuler</button>
            <button onClick={handleSubmit} disabled={saving} style={{
              padding: "9px 20px", borderRadius: 10, border: "none",
              background: `linear-gradient(135deg,${COL.from},${COL.to})`,
              color: "#fff", fontSize: 13, fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
            }}>{saving ? "Enregistrement…" : level ? "Modifier" : "Ajouter"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════════════ */
const Levels = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  const [levels, setLevels]             = useState([]);
  const [filtered, setFiltered]         = useState([]);
  const [search, setSearch]             = useState("");
  const [loading, setLoading]           = useState(true);
  const [modalOpen, setModalOpen]       = useState(false);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [toast, setToast]               = useState(null);
  const [delConfirm, setDelConfirm]     = useState(null);

  const showToast = (text, type = "success") => setToast({ text, type });

  const fetchLevels = async () => {
    setLoading(true);
    try {
      const data = await fetchData("/academics/levels/");
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      setLevels(arr);
      setFiltered(arr);
    } catch {
      showToast("Erreur lors du chargement des niveaux.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLevels(); }, []);

  const handleSearch = (val) => {
    setSearch(val);
    const q = val.toLowerCase();
    setFiltered(levels.filter(l => (l.name || "").toLowerCase().includes(q)));
  };

  const openModal = (level = null) => { setCurrentLevel(level); setModalOpen(true); };

  const handleSaved = async (msg) => {
    await fetchLevels();
    showToast(msg);
  };

  const handleDelete = async (level) => {
    try {
      await deleteData(`/academics/levels/${level.id}/`);
      showToast("Niveau supprimé.");
      await fetchLevels();
    } catch (e) {
      showToast(e?.message || "Erreur lors de la suppression.", "error");
    } finally {
      setDelConfirm(null);
    }
  };

  // is_terminal vient maintenant du serializer backend (plus de calcul client)
  const orderBadgeStyle = (level) => {
    const order = level.order ?? 0;
    const isTerminal = level.is_terminal ?? false;
    if (isTerminal) return { bg: "#ec489918", color: "#ec4899", label: `#${order} · Terminal` };
    const colors = ["#3b82f6","#10b981","#f59e0b","#8b5cf6","#06b6d4"];
    const c = order > 0 ? colors[(order - 1) % colors.length] : null;
    return c
      ? { bg: `${c}18`, color: c, label: `#${order}` }
      : { bg: `${T.textMuted}18`, color: T.textMuted, label: "—" };
  };

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
              <FaGraduationCap style={{ color: "#fff", width: 20, height: 20 }} />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: T.textPrimary, margin: 0 }}>Niveaux scolaires</h1>
              <p style={{ fontSize: 12, color: T.textSecondary, margin: 0 }}>
                {levels.length} niveau{levels.length !== 1 ? "x" : ""} enregistré{levels.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <DarkToggle />
            <button onClick={() => openModal()} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "9px 16px",
              borderRadius: 12, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff",
              background: `linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow: `0 4px 16px ${COL.shadow}`,
            }}>
              <FaPlus style={{ width: 11, height: 11 }} /> Nouveau niveau
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <div style={{ position: "relative", maxWidth: 320, marginBottom: 20 }}>
          <FaSearch style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            color: T.textMuted, width: 12, height: 12,
          }} />
          <input
            value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Rechercher un niveau…"
            style={{
              width: "100%", padding: "9px 12px 9px 32px", borderRadius: 11,
              border: `1.5px solid ${T.inputBorder}`, background: T.inputBg,
              color: T.textPrimary, fontSize: 13, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Tableau */}
        <div style={{
          background: T.cardBg, borderRadius: 18, border: `1px solid ${T.cardBorder}`,
          boxShadow: T.cardShadow, overflow: "hidden",
        }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: "center", color: T.textMuted, fontSize: 13 }}>Chargement…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: T.textMuted, fontSize: 13 }}>Aucun niveau trouvé.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: T.tableHead }}>
                  {["Ordre", "Nom du niveau", "Actions"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "11px 18px", fontSize: 11,
                      fontWeight: 700, color: T.textSecondary, letterSpacing: ".04em",
                      borderBottom: `1px solid ${T.divider}`,
                    }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((level) => {
                  const badge = orderBadgeStyle(level);
                  return (
                    <tr key={level.id} style={{ borderBottom: `1px solid ${T.divider}`, transition: "background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.rowHover}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "12px 18px" }}>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 5,
                          padding: "3px 10px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                          background: badge.bg, color: badge.color,
                        }}>
                          <FaSortNumericUp style={{ width: 10, height: 10 }} />
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 18px", fontSize: 13, fontWeight: 700, color: T.textPrimary }}>
                        {level.name}
                      </td>
                      <td style={{ padding: "12px 18px" }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => openModal(level)} style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "6px 13px",
                            borderRadius: 9, border: `1.5px solid ${T.inputBorder}`,
                            background: "transparent", color: T.textSecondary,
                            fontSize: 12, fontWeight: 600, cursor: "pointer",
                          }}>
                            <FaEdit style={{ width: 11, height: 11 }} /> Modifier
                          </button>
                          <button onClick={() => setDelConfirm(level)} style={{
                            display: "flex", alignItems: "center", gap: 6, padding: "6px 13px",
                            borderRadius: 9, border: "1.5px solid #ef444430",
                            background: "#ef444410", color: "#ef4444",
                            fontSize: 12, fontWeight: 600, cursor: "pointer",
                          }}>
                            <FaTrash style={{ width: 11, height: 11 }} /> Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Note explicative */}
        <div style={{
          marginTop: 16, padding: "10px 14px", borderRadius: 12,
          background: `${COL.from}10`, border: `1px solid ${COL.from}30`,
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <FaSortNumericUp style={{ color: COL.from, width: 13, height: 13, flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: T.textSecondary, margin: 0, lineHeight: 1.6 }}>
            Le champ <strong style={{ color: T.textPrimary }}>Ordre</strong> est utilisé par le système de promotion de fin d'année.
            Définissez-le sur chaque niveau — <strong>1</strong> = premier niveau scolaire,{" "}
            <strong>N</strong> = niveau terminal. Le niveau avec l'ordre le plus élevé est détecté automatiquement comme terminal.
          </p>
        </div>

        {/* Confirm suppression */}
        {delConfirm && (
          <div style={{
            position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
            justifyContent: "center", padding: 16,
          }}>
            <div style={{
              width: "100%", maxWidth: 400, background: T.cardBg, borderRadius: 18,
              boxShadow: "0 24px 60px rgba(0,0,0,.35)",
              border: `1.5px solid ${T.cardBorder}`, overflow: "hidden",
              animation: "panelUp .2s cubic-bezier(.34,1.4,.64,1)",
            }}>
              <div style={{ height: 4, background: "linear-gradient(90deg,#ef4444,#dc2626)" }} />
              <div style={{ padding: "20px 20px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: "#ef444418" }}>
                    <FaExclamationCircle style={{ width: 15, height: 15, color: "#ef4444" }} />
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>Supprimer le niveau</p>
                </div>
                <p style={{ fontSize: 12, color: T.textSecondary, lineHeight: 1.65, paddingLeft: 44 }}>
                  Supprimer <strong style={{ color: T.textPrimary }}>«{delConfirm.name}»</strong> ? Cette action est irréversible.
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
                  <button onClick={() => setDelConfirm(null)} style={{
                    padding: "8px 16px", borderRadius: 10, border: `1.5px solid ${T.inputBorder}`,
                    background: "transparent", color: T.textSecondary, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  }}>Annuler</button>
                  <button onClick={() => handleDelete(delConfirm)} style={{
                    padding: "8px 18px", borderRadius: 10, border: "none",
                    background: "linear-gradient(135deg,#ef4444,#dc2626)",
                    color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>Supprimer</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <LevelModal open={modalOpen} level={currentLevel} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
        <Toast msg={toast} onClose={() => setToast(null)} />
      </div>
    </>
  );
};

export default Levels;