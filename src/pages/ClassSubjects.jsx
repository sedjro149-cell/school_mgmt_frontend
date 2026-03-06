// src/pages/SubjectsAndClassSubjects.jsx
import React, {
  useCallback, useEffect, useMemo,
  useRef, useState,
} from "react";
import {
  FaEdit, FaTrash, FaPlus, FaSearch,
  FaCheck, FaSyncAlt, FaChevronDown,
  FaLayerGroup, FaClock, FaPercentage,
  FaSave, FaCopy, FaTimes, FaArrowRight,
  FaExclamationTriangle, FaMoon, FaSun,
  FaGraduationCap, FaBookOpen,
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";
import {
  ThemeCtx, useTheme,
  LIGHT, DARK,
  SECTION_PALETTE, BASE_KEYFRAMES,
} from "./theme";

const COL = SECTION_PALETTE.academic; // bleu → cyan

/* ──────────────────────────────────────────────────────────
   Couleurs déterministes pour les matières
────────────────────────────────────────────────────────── */
const DOT_HEX = [
  "#ef4444","#f97316","#f59e0b","#10b981",
  "#14b8a6","#06b6d4","#3b82f6","#6366f1",
  "#8b5cf6","#db2777","#f43f5e",
];
const subjectColor = (id) => DOT_HEX[(id ?? 0) % DOT_HEX.length];

/* ═══════════════════════════════════════════════════════════
   ATOMES
═══════════════════════════════════════════════════════════ */

/* Toggle dark mode */
const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button onClick={toggle} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={dark ? "Mode clair" : "Mode sombre"}
      style={{
        position:"relative", width:52, height:28, borderRadius:999, border:"none",
        cursor:"pointer", flexShrink:0, outline:"none", transition:"all .3s",
        background: dark
          ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
          : `linear-gradient(135deg,${COL.from},${COL.to})`,
        boxShadow: hov ? `0 0 18px ${COL.shadow}` : "0 2px 8px rgba(0,0,0,.2)",
      }}>
      <div style={{
        position:"absolute", top:2, width:24, height:24, borderRadius:999,
        background:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all .3s", left: dark ? "calc(100% - 26px)" : 2,
        boxShadow:"0 2px 6px rgba(0,0,0,.25)",
      }}>
        {dark
          ? <FaMoon  style={{ width:11,height:11,color:"#6366f1" }} />
          : <FaSun   style={{ width:11,height:11,color:COL.from  }} />}
      </div>
    </button>
  );
};

/* Toast */
const Toast = ({ msg, onClose }) => {
  const { dark } = useTheme();
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  const isErr = msg.type === "error";
  const isInfo = msg.type === "info";
  return (
    <div onClick={onClose} style={{
      position:"fixed", bottom:24, right:24, zIndex:300,
      display:"flex", alignItems:"center", gap:10, padding:"14px 20px",
      borderRadius:16, cursor:"pointer", maxWidth:340, fontWeight:700, fontSize:13,
      color:"#fff", animation:"slideUp .3s cubic-bezier(.34,1.56,.64,1)",
      background: isErr ? "linear-gradient(135deg,#ef4444,#dc2626)"
        : isInfo ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
        : `linear-gradient(135deg,${COL.from},${COL.to})`,
      boxShadow: isErr ? "0 8px 24px #ef444444"
        : isInfo ? "0 8px 24px #6366f144"
        : `0 8px 24px ${COL.shadow}`,
    }}>
      {isErr
        ? <FaExclamationTriangle style={{ flexShrink:0,width:14,height:14 }} />
        : <FaCheck style={{ flexShrink:0,width:14,height:14 }} />}
      {msg.text}
    </div>
  );
};

/* Input stylé (réutilisable) */
const Input = ({ icon: Icon, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      {Icon && (
        <span style={{
          position:"absolute", left:14, top:"50%", transform:"translateY(-50%)",
          pointerEvents:"none", color: focused ? COL.from : T.textMuted, transition:"color .15s",
        }}>
          <Icon style={{ width:13,height:13 }} />
        </span>
      )}
      <input {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
        style={{
          width:"100%", boxSizing:"border-box",
          paddingLeft: Icon ? 38 : 14, paddingRight:14,
          paddingTop:9, paddingBottom:9,
          fontSize:13, borderRadius:10, outline:"none",
          background:T.inputBg, color:T.textPrimary,
          border:`1.5px solid ${focused ? COL.from : T.inputBorder}`,
          boxShadow: focused ? `0 0 0 3px ${COL.from}22` : "none",
          transition:"all .15s",
          ...props.style,
        }} />
    </div>
  );
};

/* Mini number input (coef / heures) */
const NumberInput = ({ label, icon: Icon, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [focused, setFocused] = useState(false);
  return (
    <div>
      <div style={{
        display:"flex", alignItems:"center", gap:4, marginBottom:5,
        fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.08em",
        color: focused ? COL.from : T.textMuted, transition:"color .15s",
      }}>
        {Icon && <Icon style={{ width:9,height:9 }} />} {label}
      </div>
      <input {...props} type="number"
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
        style={{
          width:"100%", boxSizing:"border-box",
          padding:"7px 10px", fontSize:13, fontWeight:700,
          textAlign:"center", borderRadius:8, outline:"none",
          background:T.inputBg, color:T.textPrimary,
          border:`1.5px solid ${focused ? COL.from : T.inputBorder}`,
          boxShadow: focused ? `0 0 0 3px ${COL.from}22` : "none",
          transition:"all .15s",
        }} />
    </div>
  );
};

/* Toggle switch (active/inactive pour chaque matière) */
const SubjectToggle = ({ active, onChange }) => {
  const [hov, setHov] = useState(false);
  return (
    <button type="button" onClick={onChange}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={active ? "Désassigner de la classe" : "Assigner à la classe"}
      style={{
        position:"relative", width:38, height:20, borderRadius:999,
        border:"none", cursor:"pointer", outline:"none", flexShrink:0,
        transition:"all .25s",
        background: active
          ? `linear-gradient(135deg,${COL.from},${COL.to})`
          : hov ? "rgba(59,130,246,.25)" : "rgba(148,163,184,.3)",
        boxShadow: active ? `0 2px 8px ${COL.shadow}` : "none",
      }}>
      <div style={{
        position:"absolute", top:2, width:16, height:16, borderRadius:999,
        background:"#fff", transition:"all .25s",
        left: active ? "calc(100% - 18px)" : 2,
        boxShadow:"0 1px 4px rgba(0,0,0,.25)",
      }} />
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════
   CLASS SELECTOR (dropdown avec groupes par niveau)
═══════════════════════════════════════════════════════════ */
const ClassSelector = ({ value, onChange, schoolClasses }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const byLevel = useMemo(() => {
    const map = {};
    schoolClasses.forEach((sc) => {
      const lvl = sc.level?.name ?? "—";
      if (!map[lvl]) map[lvl] = [];
      map[lvl].push(sc);
    });
    return map;
  }, [schoolClasses]);

  const selected = schoolClasses.find((sc) => String(sc.id) === String(value));

  return (
    <div ref={ref} style={{ position:"relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{
          width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
          gap:12, padding:"11px 14px", borderRadius:12, border:"none", cursor:"pointer",
          background:T.inputBg, color:T.textPrimary, fontSize:13, fontWeight:600,
          border:`1.5px solid ${open ? COL.from : T.inputBorder}`,
          boxShadow: open ? `0 0 0 3px ${COL.from}22` : "none",
          transition:"all .15s", textAlign:"left",
        }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, minWidth:0, flex:1 }}>
          {selected ? (
            <>
              <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0,
                background:`linear-gradient(135deg,${COL.from},${COL.to})` }} />
              <span style={{ fontWeight:700, color:T.textPrimary, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {selected.name}
              </span>
              <span style={{ fontSize:11, color:T.textMuted, flexShrink:0 }}>
                {selected.level?.name}
              </span>
            </>
          ) : (
            <span style={{ color:T.textMuted, fontStyle:"italic" }}>— Choisir une classe —</span>
          )}
        </div>
        <FaChevronDown style={{
          width:11,height:11, color:T.textMuted, flexShrink:0,
          transform: open ? "rotate(180deg)" : "none", transition:"transform .2s",
        }} />
      </button>

      {open && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", left:0, right:0, zIndex:40,
          background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
          borderRadius:12, overflow:"hidden",
          boxShadow:"0 12px 40px rgba(0,0,0,.2)",
          animation:"dropIn .15s ease-out",
        }}>
          <button onClick={() => { onChange(""); setOpen(false); }}
            style={{
              width:"100%", textAlign:"left", padding:"10px 14px",
              fontSize:13, fontStyle:"italic", color:T.textMuted,
              background:"transparent", border:"none", borderBottom:`1px solid ${T.divider}`,
              cursor:"pointer",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background=T.rowHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background="transparent")}>
            — Aucune sélection —
          </button>

          <div style={{ maxHeight:240, overflowY:"auto" }} className="custom-scrollbar">
            {Object.entries(byLevel).map(([level, classes]) => (
              <div key={level}>
                <div style={{
                  padding:"6px 14px",
                  background:T.tableHead,
                  borderBottom:`1px solid ${T.divider}`,
                  fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em",
                  color:T.textMuted,
                }}>
                  {level}
                </div>
                {classes.map((sc) => {
                  const isSelected = String(sc.id) === String(value);
                  return (
                    <button key={sc.id}
                      onClick={() => { onChange(String(sc.id)); setOpen(false); }}
                      style={{
                        width:"100%", display:"flex", alignItems:"center", gap:10,
                        padding:"10px 14px", border:"none", cursor:"pointer", textAlign:"left",
                        fontSize:13, fontWeight:600,
                        background: isSelected ? `linear-gradient(135deg,${COL.from},${COL.to})` : "transparent",
                        color: isSelected ? "#fff" : T.textPrimary,
                        transition:"background .12s",
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background=T.rowHover; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background="transparent"; }}>
                      <div style={{ width:6, height:6, borderRadius:"50%", flexShrink:0,
                        background: isSelected ? "#fff" : T.textMuted }} />
                      {sc.name}
                      {isSelected && <FaCheck style={{ marginLeft:"auto",width:10,height:10 }} />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   COPY CONFIG MODAL
═══════════════════════════════════════════════════════════ */
const CopyConfigModal = ({ sourceClass, schoolClasses, onClose, onSuccess, setMsg }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [targetIds, setTargetIds] = useState([]);
  const [overwrite, setOverwrite] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);

  const available = useMemo(
    () => schoolClasses.filter((sc) => sc.id !== sourceClass?.id),
    [schoolClasses, sourceClass]
  );

  const byLevel = useMemo(() => {
    const map = {};
    available.forEach((sc) => {
      const lvl = sc.level?.name ?? "—";
      if (!map[lvl]) map[lvl] = [];
      map[lvl].push(sc);
    });
    return map;
  }, [available]);

  const toggle      = (id) => setTargetIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleLevel = (cls) => {
    const ids = cls.map((c) => c.id);
    const allIn = ids.every((id) => targetIds.includes(id));
    setTargetIds((p) => allIn ? p.filter((x) => !ids.includes(x)) : [...new Set([...p, ...ids])]);
  };

  const handleSubmit = async () => {
    if (!targetIds.length) { setMsg({ type:"error", text:"Sélectionnez au moins une classe cible." }); return; }
    setLoading(true);
    try {
      const res = await postData("/academics/copy-class-config/", {
        source_class_id: sourceClass.id,
        target_class_ids: targetIds,
        overwrite,
      });
      setResult(res);
    } catch { setMsg({ type:"error", text:"Erreur lors de la copie." }); }
    finally { setLoading(false); }
  };

  /* ── Shell du modal ── */
  const Shell = ({ children }) => (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      background:"rgba(2,6,23,.72)", backdropFilter:"blur(8px)",
      animation:"fadeIn .18s ease-out",
    }}>
      <div style={{
        position:"relative", width:"100%", maxWidth:520, maxHeight:"90vh",
        display:"flex", flexDirection:"column", overflow:"hidden",
        background:T.cardBg, border:`1px solid ${T.cardBorder}`,
        borderRadius:20, boxShadow:"0 24px 64px rgba(0,0,0,.4)",
        animation:"panelUp .3s cubic-bezier(.34,1.4,.64,1)",
      }}>
        {/* Bande colorée */}
        <div style={{ height:5, flexShrink:0, background:`linear-gradient(90deg,${COL.from},${COL.to})` }} />
        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"16px 24px", flexShrink:0, borderBottom:`1px solid ${T.divider}`,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:36, height:36, borderRadius:10, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 4px 12px ${COL.shadow}`,
            }}>
              <FaCopy style={{ width:14,height:14,color:"#fff" }} />
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:T.textPrimary }}>
                {result ? "Rapport de copie" : "Dupliquer la configuration"}
              </p>
              {!result && <p style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>
                Copier les matières de <strong>{sourceClass?.name}</strong> vers d'autres classes
              </p>}
            </div>
          </div>
          <button onClick={result ? () => { onSuccess(); onClose(); } : onClose}
            style={{
              width:32, height:32, borderRadius:8, border:"none", cursor:"pointer",
              background:"transparent", color:T.textMuted, display:"flex", alignItems:"center", justifyContent:"center",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background="#ef444418"; e.currentTarget.style.color="#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
            <FaTimes style={{ width:13,height:13 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:24 }} className="custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );

  /* ── Écran résultat ── */
  if (result) {
    const { summary, results } = result;
    return (
      <Shell>
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
          {[
            { val: summary.total_created, label:"créé(s)", color:COL.from },
            summary.total_skipped > 0 && { val:summary.total_skipped, label:"ignoré(s)", color:"#f59e0b" },
            summary.total_errors  > 0 && { val:summary.total_errors,  label:"erreur(s)", color:"#ef4444" },
          ].filter(Boolean).map(({ val, label, color }, i) => (
            <span key={i} style={{
              padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:700,
              background:`${color}18`, color, border:`1px solid ${color}44`,
            }}>
              {val} {label}
            </span>
          ))}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {results.map((r) => (
            <div key={r.target_class_id} style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"10px 14px", borderRadius:10, fontSize:13,
              background: r.errors.length ? "#fef2f2" : T.rowHover,
              border:`1px solid ${r.errors.length ? "#fecaca" : T.cardBorder}`,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                {r.errors.length
                  ? <FaExclamationTriangle style={{ color:"#ef4444",width:12,height:12 }} />
                  : <FaCheck style={{ color:COL.from,width:12,height:12 }} />}
                <span style={{ fontWeight:700, color:T.textPrimary }}>{r.target_class_name ?? `#${r.target_class_id}`}</span>
              </div>
              <div style={{ display:"flex", gap:8, fontSize:11 }}>
                {r.created   > 0 && <span style={{ color:COL.from, fontWeight:700 }}>+{r.created} matière(s)</span>}
                {r.skipped   > 0 && <span style={{ color:"#f59e0b" }}>{r.skipped} ignoré(s)</span>}
                {r.errors.length > 0 && <span style={{ color:"#ef4444" }}>{r.errors[0]}</span>}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop:24, display:"flex", justifyContent:"flex-end" }}>
          <button onClick={() => { onSuccess(); onClose(); }}
            style={{
              padding:"10px 24px", borderRadius:12, border:"none", cursor:"pointer",
              fontSize:13, fontWeight:800, color:"#fff",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 4px 14px ${COL.shadow}`,
            }}>
            Fermer
          </button>
        </div>
      </Shell>
    );
  }

  /* ── Écran sélection ── */
  return (
    <Shell>
      {/* Source */}
      <div style={{
        marginBottom:20, padding:"12px 14px", borderRadius:12,
        background: dark ? COL.darkBg : COL.lightBg,
        border:`1px solid ${COL.from}44`,
        display:"flex", alignItems:"center", gap:10,
      }}>
        <div style={{
          width:32, height:32, borderRadius:8,
          background:`linear-gradient(135deg,${COL.from}22,${COL.to}11)`,
          color:COL.from, display:"flex", alignItems:"center", justifyContent:"center",
        }}>
          <FaBookOpen style={{ width:13,height:13 }} />
        </div>
        <div>
          <p style={{ fontSize:10, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", color:COL.text }}>Source</p>
          <p style={{ fontSize:13, fontWeight:800, color:T.textPrimary }}>{sourceClass?.name}</p>
        </div>
        <FaArrowRight style={{ marginLeft:"auto", color:`${COL.from}66`, width:14,height:14 }} />
      </div>

      {/* Header sélection */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
        <p style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>Classes cibles</p>
        <div style={{ display:"flex", gap:8, fontSize:11 }}>
          <button onClick={() => setTargetIds(available.map((c) => c.id))}
            style={{ background:"none", border:"none", cursor:"pointer", color:COL.from, fontWeight:700 }}>
            Tout sélectionner
          </button>
          <span style={{ color:T.textMuted }}>·</span>
          <button onClick={() => setTargetIds([])}
            style={{ background:"none", border:"none", cursor:"pointer", color:T.textMuted, fontWeight:600 }}>
            Effacer
          </button>
        </div>
      </div>

      {/* Liste par niveau */}
      <div style={{ display:"flex", flexDirection:"column", gap:16, marginBottom:20 }}>
        {Object.entries(byLevel).map(([level, classes]) => {
          const allIn  = classes.every((c) => targetIds.includes(c.id));
          const someIn = classes.some((c)  => targetIds.includes(c.id));
          return (
            <div key={level}>
              {/* Level toggle */}
              <button onClick={() => toggleLevel(classes)} style={{
                display:"flex", alignItems:"center", gap:8, width:"100%",
                background:"none", border:"none", cursor:"pointer", marginBottom:8, padding:0,
              }}>
                <div style={{
                  width:16, height:16, borderRadius:4, flexShrink:0, border:"none",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: allIn ? `linear-gradient(135deg,${COL.from},${COL.to})`
                    : someIn ? `${COL.from}44` : T.inputBorder,
                  boxShadow: allIn ? `0 2px 6px ${COL.shadow}` : "none",
                }}>
                  {allIn && <FaCheck style={{ width:9,height:9,color:"#fff" }} />}
                  {!allIn && someIn && <div style={{ width:8,height:2,background:COL.from,borderRadius:2 }} />}
                </div>
                <span style={{ fontSize:10, fontWeight:800, textTransform:"uppercase", letterSpacing:"0.1em", color:T.textMuted }}>
                  {level}
                </span>
                <span style={{ fontSize:11, color:T.textMuted }}>({classes.length})</span>
              </button>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, paddingLeft:24 }}>
                {classes.map((sc) => {
                  const sel = targetIds.includes(sc.id);
                  return (
                    <button key={sc.id} onClick={() => toggle(sc.id)}
                      style={{
                        display:"flex", alignItems:"center", gap:8,
                        padding:"9px 12px", borderRadius:10, border:"none", cursor:"pointer",
                        fontSize:13, fontWeight:600, textAlign:"left", transition:"all .15s",
                        background: sel ? `linear-gradient(135deg,${COL.from},${COL.to})` : T.inputBg,
                        color: sel ? "#fff" : T.textPrimary,
                        border:`1.5px solid ${sel ? "transparent" : T.inputBorder}`,
                        boxShadow: sel ? `0 4px 12px ${COL.shadow}` : "none",
                      }}
                      onMouseEnter={(e) => { if (!sel) { e.currentTarget.style.borderColor=COL.from; e.currentTarget.style.background=dark?COL.darkBg:COL.lightBg; } }}
                      onMouseLeave={(e) => { if (!sel) { e.currentTarget.style.borderColor=T.inputBorder; e.currentTarget.style.background=T.inputBg; } }}>
                      <div style={{ width:14, height:14, borderRadius:4, flexShrink:0,
                        background: sel ? "rgba(255,255,255,.25)" : T.inputBorder,
                        display:"flex", alignItems:"center", justifyContent:"center",
                      }}>
                        {sel && <FaCheck style={{ width:8,height:8,color:"#fff" }} />}
                      </div>
                      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{sc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Option écraser */}
      <div style={{ borderTop:`1px solid ${T.divider}`, paddingTop:16, marginBottom:20 }}>
        <label style={{ display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer" }}>
          <button type="button" onClick={() => setOverwrite((v) => !v)} style={{
            marginTop:1, width:18, height:18, borderRadius:4, border:"none", cursor:"pointer", flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            background: overwrite ? "#f59e0b" : T.inputBorder,
            boxShadow: overwrite ? "0 2px 8px #f59e0b44" : "none",
          }}>
            {overwrite && <FaCheck style={{ width:9,height:9,color:"#fff" }} />}
          </button>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>Écraser la config existante</p>
            <p style={{ fontSize:11, color:T.textMuted, marginTop:3, lineHeight:1.5 }}>
              Si coché, les attributions existantes des classes cibles seront supprimées et remplacées. Sinon, seules les matières manquantes seront ajoutées.
            </p>
          </div>
        </label>
        {overwrite && (
          <div style={{
            marginTop:10, padding:"10px 12px", borderRadius:10, fontSize:11,
            background:"#fffbeb", border:"1px solid #f59e0b44", color:"#92400e",
            display:"flex", gap:8, alignItems:"flex-start",
          }}>
            <FaExclamationTriangle style={{ width:11,height:11,marginTop:1,flexShrink:0,color:"#f59e0b" }} />
            La configuration actuelle des classes sélectionnées sera entièrement remplacée.
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <span style={{ fontSize:12, color:T.textMuted }}>
          <span style={{ fontWeight:800, color:COL.from }}>{targetIds.length}</span> classe{targetIds.length!==1?"s":""} sélectionnée{targetIds.length!==1?"s":""}
        </span>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose}
            style={{
              padding:"9px 18px", borderRadius:10, border:`1.5px solid ${T.cardBorder}`,
              background:T.cardBg, cursor:"pointer", fontSize:13, fontWeight:700, color:T.textSecondary,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background=T.rowHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background=T.cardBg)}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading || !targetIds.length}
            style={{
              padding:"9px 20px", borderRadius:10, border:"none", cursor: loading||!targetIds.length ? "not-allowed" : "pointer",
              fontSize:13, fontWeight:800, color:"#fff",
              display:"flex", alignItems:"center", gap:8,
              background: loading||!targetIds.length
                ? (dark?"#1e293b":"#e2e8f0")
                : `linear-gradient(135deg,${COL.from},${COL.to})`,
              color: loading||!targetIds.length ? T.textMuted : "#fff",
              boxShadow: loading||!targetIds.length ? "none" : `0 4px 14px ${COL.shadow}`,
              opacity: loading||!targetIds.length ? 0.7 : 1,
            }}>
            {loading ? <FaSyncAlt style={{ width:13,height:13 }} className="animate-spin" /> : <FaCopy style={{ width:13,height:13 }} />}
            Copier la configuration
          </button>
        </div>
      </div>
    </Shell>
  );
};

/* ═══════════════════════════════════════════════════════════
   SUBJECT ASSIGNMENT CARD
═══════════════════════════════════════════════════════════ */
const SubjectCard = ({ subject, data, onChange, onDelete, animDelay }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const color = subjectColor(subject.id);
  const active = data?.isActive ?? false;

  return (
    <div style={{
      borderRadius:14, overflow:"hidden", transition:"all .2s",
      background: T.cardBg,
      border:`1.5px solid ${active ? `${color}66` : T.cardBorder}`,
      boxShadow: active ? `0 4px 16px ${color}22` : T.cardShadow,
      animation:`fadeUp .3s ease-out ${animDelay}ms both`,
    }}>
      {/* Bande colorée en haut */}
      <div style={{ height:3, background: active ? `linear-gradient(90deg,${color},${color}aa)` : T.divider, transition:"all .3s" }} />

      {/* Header carte */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 14px",
        background: active ? `${color}09` : "transparent",
        borderBottom:`1px solid ${active ? `${color}22` : T.divider}`,
        transition:"all .3s",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0, flex:1 }}>
          <div style={{
            width:8, height:8, borderRadius:"50%", flexShrink:0,
            background: color, boxShadow: active ? `0 0 6px ${color}88` : "none",
            transition:"box-shadow .3s",
          }} />
          <span style={{
            fontSize:13, fontWeight:800, color:T.textPrimary,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>
            {subject.name}
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
          {active && data?.id && (
            <button type="button" onClick={() => onDelete(data.id)}
              title="Retirer de la classe"
              style={{
                width:24, height:24, borderRadius:6, border:"none",
                background:"transparent", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                color:T.textMuted,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background="#ef444418"; e.currentTarget.style.color="#ef4444"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
              <FaTimes style={{ width:10,height:10 }} />
            </button>
          )}
          <SubjectToggle
            active={active}
            onChange={() => onChange(subject.id, "isActive", !active)}
          />
        </div>
      </div>

      {/* Champs — visibles uniquement si actif */}
      <div style={{
        overflow:"hidden", transition:"all .25s ease-in-out",
        maxHeight: active ? 200 : 0,
        opacity: active ? 1 : 0,
      }}>
        <div style={{ padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
          {/* Coef + Heures */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <NumberInput
              label="Coeff."
              icon={FaPercentage}
              min="1" max="20"
              value={data?.coefficient ?? 1}
              onChange={(e) => onChange(subject.id, "coefficient", e.target.value)}
            />
            <NumberInput
              label="H/sem"
              icon={FaClock}
              min="0" max="40"
              value={data?.hours_per_week ?? 1}
              onChange={(e) => onChange(subject.id, "hours_per_week", e.target.value)}
            />
          </div>

          {/* Facultatif */}
          <label style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
            <button type="button" onClick={() => onChange(subject.id, "is_optional", !(data?.is_optional))}
              style={{
                width:16, height:16, borderRadius:4, border:"none", cursor:"pointer", flexShrink:0,
                display:"flex", alignItems:"center", justifyContent:"center",
                background: data?.is_optional ? color : T.inputBorder,
                boxShadow: data?.is_optional ? `0 2px 6px ${color}44` : "none",
              }}>
              {data?.is_optional && <FaCheck style={{ width:8,height:8,color:"#fff" }} />}
            </button>
            <span style={{ fontSize:11, color:T.textMuted, userSelect:"none" }}>
              Matière facultative
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   PAGE PRINCIPALE (inner)
═══════════════════════════════════════════════════════════ */
const SubjectsAndClassSubjectsInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  /* ── State ── */
  const [subjects,        setSubjects]        = useState([]);
  const [subjectSearch,   setSubjectSearch]   = useState("");
  const [editingSubject,  setEditingSubject]  = useState(null);   // null = new
  const [subjectInput,    setSubjectInput]    = useState("");
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [subjectsSaving,  setSubjectsSaving]  = useState(false);
  const [subjectsOpen,    setSubjectsOpen]    = useState(true);

  const [classSubjects,   setClassSubjects]   = useState([]);
  const [schoolClasses,   setSchoolClasses]   = useState([]);
  const [csLoading,       setCsLoading]       = useState(false);

  const [selectedClass,   setSelectedClass]   = useState("");
  const [formData,        setFormData]        = useState({});
  const [saving,          setSaving]          = useState(false);

  const [copyModalOpen,   setCopyModalOpen]   = useState(false);
  const [msg,             setMsg]             = useState(null);

  /* ── Fetch all ── */
  const fetchAll = useCallback(async () => {
    setSubjectsLoading(true); setCsLoading(true);
    try {
      const [s, cs, sc] = await Promise.all([
        fetchData("/academics/subjects/").catch(() => []),
        fetchData("/academics/class-subjects/").catch(() => []),
        fetchData("/academics/school-classes/").catch(() => []),
      ]);
      setSubjects(s || []);
      setClassSubjects(cs || []);
      setSchoolClasses(Array.isArray(sc) ? sc : []);
    } catch { setMsg({ type:"error", text:"Erreur de chargement." }); }
    finally { setSubjectsLoading(false); setCsLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  /* ── Form sync (classe sélectionnée → formData) ── */
  useEffect(() => {
    if (!selectedClass) { setFormData({}); return; }
    const existing = classSubjects.filter(
      (cs) => cs.school_class && String(cs.school_class.id) === String(selectedClass)
    );
    const map = {};
    subjects.forEach((s) => {
      const found = existing.find((cs) => cs.subject && cs.subject.id === s.id);
      map[s.id] = {
        subject_id:     s.id,
        coefficient:    found?.coefficient    ?? 1,
        hours_per_week: found?.hours_per_week ?? (s.hours_per_week || 1),
        is_optional:    found ? Boolean(found.is_optional) : false,
        id:             found?.id ?? null,
        isActive:       !!found,
        changed:        false,
      };
    });
    setFormData(map);
  }, [selectedClass, subjects, classSubjects]);

  /* ── setField ── */
  const setField = useCallback((subjectId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      [subjectId]: { ...(prev[subjectId] || { subject_id: subjectId }), [field]: value, changed: true },
    }));
  }, []);

  /* ── Subjects CRUD ── */
  const submitSubject = async () => {
    if (!subjectInput.trim()) { setMsg({ type:"error", text:"Nom de la matière requis." }); return; }
    setSubjectsSaving(true);
    try {
      if (editingSubject)
        await putData(`/academics/subjects/${editingSubject.id}/`, { name: subjectInput.trim() });
      else
        await postData("/academics/subjects/", { name: subjectInput.trim() });
      setMsg({ type:"success", text: editingSubject ? "Matière modifiée." : "Matière ajoutée." });
      setEditingSubject(null); setSubjectInput("");
      await fetchAll();
    } catch { setMsg({ type:"error", text:"Erreur lors de l'enregistrement." }); }
    finally { setSubjectsSaving(false); }
  };

  const deleteSubject = async (id) => {
    if (!window.confirm("Supprimer cette matière et toutes ses attributions ?")) return;
    try {
      await deleteData(`/academics/subjects/${id}/`);
      setMsg({ type:"success", text:"Matière supprimée." });
      await fetchAll();
    } catch { setMsg({ type:"error", text:"Impossible de supprimer." }); }
  };

  /* ── Bulk save ── LOGIQUE CORRIGÉE ── */
  const handleSave = async () => {
    if (!selectedClass) { setMsg({ type:"error", text:"Sélectionnez une classe." }); return; }
    setSaving(true);
    const toCreate = [], toUpdate = [], toDelete = [];

    Object.values(formData).forEach((d) => {
      const payload = {
        school_class_id: parseInt(selectedClass, 10),
        subject_id:      parseInt(d.subject_id,  10),
        coefficient:     Number(d.coefficient)    || 1,
        hours_per_week:  Number(d.hours_per_week) || 1,
        is_optional:     Boolean(d.is_optional),
      };
      if (d.isActive && !d.id)            toCreate.push(payload);          // ← nouveau
      else if (d.isActive && d.id && d.changed) toUpdate.push({ id:d.id, payload }); // ← modifié
      else if (!d.isActive && d.id)       toDelete.push(d.id);             // ← désactivé
    });

    if (!toCreate.length && !toUpdate.length && !toDelete.length) {
      setMsg({ type:"info", text:"Aucune modification détectée." });
      setSaving(false); return;
    }
    try {
      await Promise.all([
        ...toCreate.map((p)  => postData("/academics/class-subjects/", p)),
        ...toUpdate.map((u)  => putData(`/academics/class-subjects/${u.id}/`, u.payload)),
        ...toDelete.map((id) => deleteData(`/academics/class-subjects/${id}/`)),
      ]);
      const parts = [];
      if (toCreate.length) parts.push(`${toCreate.length} ajoutée(s)`);
      if (toUpdate.length) parts.push(`${toUpdate.length} mise(s) à jour`);
      if (toDelete.length) parts.push(`${toDelete.length} retirée(s)`);
      setMsg({ type:"success", text:`Configuration enregistrée — ${parts.join(", ")}.` });
      await fetchAll();
    } catch { setMsg({ type:"error", text:"Erreur lors de l'enregistrement." }); }
    finally { setSaving(false); }
  };

  const deleteAssignment = async (id) => {
    try {
      await deleteData(`/academics/class-subjects/${id}/`);
      setMsg({ type:"success", text:"Attribution retirée." });
      await fetchAll();
    } catch { setMsg({ type:"error", text:"Impossible de supprimer." }); }
  };

  /* ── Computed ── */
  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    return q ? subjects.filter((s) => s.name.toLowerCase().includes(q)) : subjects;
  }, [subjects, subjectSearch]);

  const selectedClassObj = schoolClasses.find((sc) => String(sc.id) === String(selectedClass));

  const activeCount   = Object.values(formData).filter((d) => d.isActive).length;
  const pendingCount  = Object.values(formData).filter((d) => {
    if (d.isActive && !d.id) return true;   // nouveau
    if (d.isActive && d.id && d.changed) return true;  // modifié
    if (!d.isActive && d.id) return true;  // à supprimer
    return false;
  }).length;

  /* ── Render ── */
  return (
    <div style={{ minHeight:"100vh", paddingBottom:80, background:T.pageBg, transition:"background .3s",
      fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ══════ HEADER ══════ */}
      <header style={{
        position:"sticky", top:0, zIndex:40,
        background:T.headerBg, backdropFilter:"blur(16px)",
        borderBottom:`1px solid ${T.divider}`, transition:"all .3s",
      }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"14px 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:42, height:42, borderRadius:12, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 6px 20px ${COL.shadow}`,
            }}>
              <FaGraduationCap style={{ width:18,height:18,color:"#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize:18, fontWeight:900, color:T.textPrimary, letterSpacing:"-0.02em" }}>
                Configuration Académique
              </h1>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>
                Matières · Coefficients · Attributions par classe
              </p>
            </div>
          </div>

          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <DarkToggle />
            <button onClick={fetchAll}
              style={{
                display:"flex", alignItems:"center", gap:7, padding:"8px 14px", borderRadius:10,
                border:`1.5px solid ${T.cardBorder}`, background:T.cardBg, cursor:"pointer",
                fontSize:12, fontWeight:700, color:T.textSecondary,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background=T.rowHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background=T.cardBg)}>
              <FaSyncAlt style={{ width:12,height:12 }} className={subjectsLoading||csLoading?"animate-spin":""} />
              Actualiser
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1200, margin:"0 auto", padding:"24px 24px 0" }}>

        {/* ══════ SECTION 1 : MATIÈRES (accordion) ══════ */}
        <section style={{
          borderRadius:18, overflow:"hidden", marginBottom:24,
          background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
          boxShadow:T.cardShadow,
        }}>
          {/* Toggle header */}
          <button
            type="button"
            onClick={() => setSubjectsOpen((v) => !v)}
            style={{
              width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"16px 20px", border:"none", cursor:"pointer", background:"transparent",
              textAlign:"left",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background=T.rowHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background="transparent")}>
            <div style={{ display:"flex", alignItems:"center", gap:12 }}>
              <div style={{
                width:34, height:34, borderRadius:10,
                display:"flex", alignItems:"center", justifyContent:"center",
                background:`linear-gradient(135deg,${COL.from}22,${COL.to}11)`, color:COL.from,
              }}>
                <FaBookOpen style={{ width:14,height:14 }} />
              </div>
              <div>
                <p style={{ fontSize:14, fontWeight:800, color:T.textPrimary }}>Matières générales</p>
                <p style={{ fontSize:11, color:T.textMuted }}>Gérer la liste des matières du programme</p>
              </div>
              <span style={{
                marginLeft:8, padding:"2px 10px", borderRadius:999, fontSize:11, fontWeight:800,
                background: dark ? COL.darkBg : COL.lightBg,
                border:`1px solid ${COL.from}44`, color:COL.text,
              }}>
                {subjects.length}
              </span>
            </div>
            <FaChevronDown style={{
              width:13,height:13, color:T.textMuted, flexShrink:0,
              transform: subjectsOpen ? "rotate(180deg)" : "none", transition:"transform .25s",
            }} />
          </button>

          {/* Corps accordion */}
          <div style={{
            overflow:"hidden", transition:"max-height .35s ease-in-out, opacity .25s",
            maxHeight: subjectsOpen ? 1200 : 0,
            opacity: subjectsOpen ? 1 : 0,
          }}>
            <div style={{ padding:"0 20px 20px", borderTop:`1px solid ${T.divider}` }}>

              {/* Toolbar */}
              <div style={{ display:"flex", gap:12, margin:"16px 0", flexWrap:"wrap" }}>
                <div style={{ flex:1, minWidth:200 }}>
                  <Input icon={FaSearch}
                    placeholder="Filtrer les matières…"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)} />
                </div>
                <div style={{ display:"flex", gap:8, flex:1, minWidth:240 }}>
                  <Input
                    placeholder={editingSubject ? `Renommer « ${editingSubject.name} »…` : "Nom de la nouvelle matière…"}
                    value={subjectInput}
                    onChange={(e) => setSubjectInput(e.target.value)}
                    onKeyDown={(e) => e.key==="Enter" && submitSubject()}
                    style={{ flex:1 }} />
                  <button onClick={submitSubject} disabled={subjectsSaving}
                    style={{
                      display:"flex", alignItems:"center", gap:7,
                      padding:"0 16px", borderRadius:10, border:"none", cursor:"pointer",
                      fontSize:12, fontWeight:800, color:"#fff", flexShrink:0, height:38,
                      background: subjectsSaving ? T.textMuted : `linear-gradient(135deg,${COL.from},${COL.to})`,
                      boxShadow: subjectsSaving ? "none" : `0 4px 12px ${COL.shadow}`,
                    }}>
                    {subjectsSaving
                      ? <FaSyncAlt style={{ width:12,height:12 }} className="animate-spin" />
                      : <FaCheck   style={{ width:12,height:12 }} />}
                    {editingSubject ? "Modifier" : "Ajouter"}
                  </button>
                  {editingSubject && (
                    <button onClick={() => { setEditingSubject(null); setSubjectInput(""); }}
                      style={{
                        padding:"0 12px", borderRadius:10, cursor:"pointer", height:38,
                        border:`1.5px solid ${T.cardBorder}`, background:T.cardBg, color:T.textSecondary,
                        fontSize:12, fontWeight:700,
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background=T.rowHover)}
                      onMouseLeave={(e) => (e.currentTarget.style.background=T.cardBg)}>
                      Annuler
                    </button>
                  )}
                </div>
              </div>

              {/* Grille matières */}
              {subjectsLoading ? (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
                  {[...Array(8)].map((_,i) => (
                    <div key={i} style={{ height:52, borderRadius:12, background:T.rowHover }} className="animate-pulse" />
                  ))}
                </div>
              ) : filteredSubjects.length === 0 ? (
                <div style={{
                  padding:"32px 16px", textAlign:"center", borderRadius:14,
                  border:`2px dashed ${COL.from}44`,
                  background: dark ? COL.darkBg : COL.lightBg,
                  color:T.textMuted, fontSize:13,
                }}>
                  {subjectSearch ? `Aucun résultat pour « ${subjectSearch} »` : "Aucune matière. Créez la première ci-dessus."}
                </div>
              ) : (
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
                  {filteredSubjects.map((s, i) => {
                    const color = subjectColor(s.id);
                    const isEditing = editingSubject?.id === s.id;
                    return (
                      <div key={s.id} className="group"
                        style={{
                          display:"flex", alignItems:"center", justifyContent:"space-between",
                          padding:"10px 12px", borderRadius:12, transition:"all .15s",
                          background: isEditing ? `${color}11` : T.cardBg,
                          border:`1.5px solid ${isEditing ? color+"66" : T.cardBorder}`,
                          boxShadow: isEditing ? `0 0 0 3px ${color}22` : "none",
                          animation:`fadeUp .25s ease-out ${i*20}ms both`,
                          position:"relative",
                        }}
                        onMouseEnter={(e) => { if (!isEditing) { e.currentTarget.style.borderColor=`${color}66`; e.currentTarget.style.background=`${color}08`; } }}
                        onMouseLeave={(e) => { if (!isEditing) { e.currentTarget.style.borderColor=T.cardBorder; e.currentTarget.style.background=T.cardBg; } }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, minWidth:0, flex:1 }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background:color }} />
                          <span style={{ fontSize:12, fontWeight:700, color:T.textPrimary,
                            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            {s.name}
                          </span>
                        </div>
                        <div style={{
                          display:"flex", gap:2, flexShrink:0, marginLeft:6,
                          opacity:0, transition:"opacity .15s",
                        }} className="group-actions">
                          <button onClick={() => { setEditingSubject(s); setSubjectInput(s.name); }}
                            style={{ width:24,height:24,borderRadius:6,border:"none",cursor:"pointer",
                              background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
                              color:T.textMuted }}
                            onMouseEnter={(e) => { e.currentTarget.style.background=`${color}22`; e.currentTarget.style.color=color; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
                            <FaEdit style={{ width:10,height:10 }} />
                          </button>
                          <button onClick={() => deleteSubject(s.id)}
                            style={{ width:24,height:24,borderRadius:6,border:"none",cursor:"pointer",
                              background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
                              color:T.textMuted }}
                            onMouseEnter={(e) => { e.currentTarget.style.background="#ef444418"; e.currentTarget.style.color="#ef4444"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
                            <FaTrash style={{ width:10,height:10 }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ══════ SECTION 2 : ÉDITEUR D'ATTRIBUTION ══════ */}
        <section style={{
          borderRadius:18, overflow:"hidden",
          background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
          boxShadow:T.cardShadow,
        }}>
          {/* Header section */}
          <div style={{ padding:"16px 20px", borderBottom:`1px solid ${T.divider}` }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <div style={{
                  width:34, height:34, borderRadius:10,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:`linear-gradient(135deg,${COL.from}22,${COL.to}11)`, color:COL.from,
                }}>
                  <FaLayerGroup style={{ width:14,height:14 }} />
                </div>
                <div>
                  <p style={{ fontSize:14, fontWeight:800, color:T.textPrimary }}>Attribution par classe</p>
                  <p style={{ fontSize:11, color:T.textMuted }}>
                    Activez les matières à attribuer et définissez leur coefficient
                  </p>
                </div>
              </div>

              {/* Sélecteur de classe + bouton dupliquer */}
              <div style={{ display:"flex", alignItems:"center", gap:10, flex:"1 1 320px", maxWidth:460 }}>
                <div style={{ flex:1 }}>
                  <ClassSelector
                    value={selectedClass}
                    onChange={setSelectedClass}
                    schoolClasses={schoolClasses}
                  />
                </div>
                {selectedClass && (
                  <button onClick={() => setCopyModalOpen(true)}
                    title="Dupliquer cette configuration vers d'autres classes"
                    style={{
                      width:38, height:38, flexShrink:0, borderRadius:10, border:"none",
                      cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
                      background: dark ? COL.darkBg : COL.lightBg,
                      color:COL.from, border:`1.5px solid ${COL.from}44`,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background=`${COL.from}33`)}
                    onMouseLeave={(e) => (e.currentTarget.style.background=dark?COL.darkBg:COL.lightBg)}>
                    <FaCopy style={{ width:13,height:13 }} />
                  </button>
                )}
              </div>
            </div>

            {/* Résumé si classe sélectionnée */}
            {selectedClass && (
              <div style={{
                marginTop:14, padding:"10px 14px", borderRadius:10,
                background: dark ? COL.darkBg : COL.lightBg,
                border:`1px solid ${COL.from}33`,
                display:"flex", alignItems:"center", gap:16, flexWrap:"wrap",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:`linear-gradient(135deg,${COL.from},${COL.to})` }} />
                  <span style={{ fontSize:12, fontWeight:800, color:T.textPrimary }}>{selectedClassObj?.name}</span>
                  <span style={{ fontSize:11, color:T.textMuted }}>{selectedClassObj?.level?.name}</span>
                </div>
                <div style={{ display:"flex", gap:12, marginLeft:"auto" }}>
                  {[
                    { label:`${activeCount} assignée${activeCount>1?"s":""}`, color:COL.from },
                    { label:`${subjects.length - activeCount} inactive${subjects.length-activeCount>1?"s":""}`, color:T.textMuted },
                    pendingCount > 0 && { label:`${pendingCount} modif.`, color:"#f59e0b" },
                  ].filter(Boolean).map(({ label, color }, i) => (
                    <span key={i} style={{ fontSize:11, fontWeight:700, color }}>{label}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Corps */}
          <div style={{ padding:20 }}>
            {!selectedClass ? (
              <div style={{ padding:"60px 16px", textAlign:"center" }}>
                <div style={{
                  width:64, height:64, borderRadius:18, margin:"0 auto 16px",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:`linear-gradient(135deg,${COL.from}22,${COL.to}11)`,
                }}>
                  <FaLayerGroup style={{ width:26,height:26,color:COL.from,opacity:.6 }} />
                </div>
                <p style={{ fontSize:15, fontWeight:800, color:T.textSecondary }}>Sélectionnez une classe</p>
                <p style={{ fontSize:12, color:T.textMuted, marginTop:6, maxWidth:280, margin:"6px auto 0" }}>
                  Choisissez une classe ci-dessus pour configurer ses matières, coefficients et heures.
                </p>
              </div>
            ) : csLoading ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
                {[...Array(subjects.length||6)].map((_,i) => (
                  <div key={i} style={{ height:100, borderRadius:14, background:T.rowHover }} className="animate-pulse" />
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <div style={{
                padding:"40px 16px", textAlign:"center", borderRadius:14,
                border:`2px dashed ${COL.from}44`, background: dark ? COL.darkBg : COL.lightBg,
                color:T.textMuted, fontSize:13,
              }}>
                Aucune matière définie. Créez des matières dans la section ci-dessus.
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12 }}>
                {subjects.map((s, i) => (
                  <SubjectCard
                    key={s.id}
                    subject={s}
                    data={formData[s.id]}
                    onChange={setField}
                    onDelete={deleteAssignment}
                    animDelay={i * 25}
                  />
                ))}
              </div>
            )}

            {/* ── Barre de sauvegarde flottante ── */}
            {selectedClass && pendingCount > 0 && (
              <div style={{
                position:"sticky", bottom:16, marginTop:20,
                padding:"12px 16px", borderRadius:14,
                display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap",
                background:T.cardBg,
                border:`1.5px solid ${COL.from}55`,
                boxShadow:`0 8px 32px ${COL.shadow}, 0 0 0 1px ${COL.from}22`,
                animation:"fadeUp .3s ease-out",
              }}>
                <div style={{ fontSize:13, color:T.textSecondary }}>
                  <span style={{ fontWeight:800, color:COL.from }}>{pendingCount}</span>
                  {" "}modification{pendingCount>1?"s":""} en attente
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => setSelectedClass("")}
                    style={{
                      padding:"8px 16px", borderRadius:10, cursor:"pointer",
                      border:`1.5px solid ${T.cardBorder}`, background:T.cardBg,
                      fontSize:12, fontWeight:700, color:T.textSecondary,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background=T.rowHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background=T.cardBg)}>
                    Fermer
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    style={{
                      display:"flex", alignItems:"center", gap:8,
                      padding:"8px 20px", borderRadius:10, border:"none", cursor:"pointer",
                      fontSize:12, fontWeight:800, color:"#fff",
                      background: saving ? T.textMuted : `linear-gradient(135deg,${COL.from},${COL.to})`,
                      boxShadow: saving ? "none" : `0 4px 14px ${COL.shadow}`,
                    }}>
                    {saving
                      ? <FaSyncAlt style={{ width:12,height:12 }} className="animate-spin" />
                      : <FaSave    style={{ width:12,height:12 }} />}
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* ── Modals ── */}
      {copyModalOpen && (
        <CopyConfigModal
          sourceClass={selectedClassObj}
          schoolClasses={schoolClasses}
          onClose={() => setCopyModalOpen(false)}
          onSuccess={() => { fetchAll(); setMsg({ type:"success", text:"Configuration copiée." }); }}
          setMsg={setMsg}
        />
      )}

      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{BASE_KEYFRAMES}{`
        @keyframes dropIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:none; } }
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .animate-pulse { animation: pulse 1.5s cubic-bezier(0.4,0,0.6,1) infinite; }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.25} }
        .group:hover .group-actions { opacity: 1 !important; }
        .custom-scrollbar::-webkit-scrollbar { width:4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:${COL.from}66; border-radius:10px; }
      `}</style>
    </div>
  );
};

/* ── Root avec ThemeCtx ── */
const SubjectsAndClassSubjects = () => {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("scol360_dark") === "true"; } catch { return false; }
  });
  const toggle = useCallback(() => {
    setDark((v) => { const n=!v; try{localStorage.setItem("scol360_dark",String(n));}catch{} return n; });
  }, []);
  return (
    <ThemeCtx.Provider value={{ dark, toggle }}>
      <SubjectsAndClassSubjectsInner />
    </ThemeCtx.Provider>
  );
};

export default SubjectsAndClassSubjects;