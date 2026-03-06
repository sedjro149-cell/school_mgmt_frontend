// src/pages/Grades.jsx
import React, {
  useCallback, useEffect, useMemo, useState,
} from "react";
import {
  FaEdit, FaTrash, FaSearch, FaCalculator,
  FaUserGraduate, FaBookOpen, FaLayerGroup,
  FaSave, FaEraser, FaCheck, FaSyncAlt,
  FaExclamationTriangle, FaMoon, FaSun,
  FaChevronDown, FaTimes, FaPlus,
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";
import {
  ThemeCtx, useTheme, LIGHT, DARK,
  SECTION_PALETTE, avatarGradient, BASE_KEYFRAMES,
} from "./theme";

const COL = SECTION_PALETTE.finance; // emerald → teal

/* ──────────────────────────────────────────────────────────────
   UTILS
────────────────────────────────────────────────────────────── */
function buildQuery(obj = {}) {
  const parts = Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

const studentLabel = (s) => {
  if (!s) return "—";
  if (s.user && (s.user.first_name || s.user.last_name))
    return `${s.user.first_name || ""} ${s.user.last_name || ""}`.trim();
  if (s.first_name || s.last_name)
    return `${s.first_name || ""} ${s.last_name || ""}`.trim();
  return s.username || `Élève #${s.id}`;
};

const TERMS = [
  { v: "T1", label: "1er Trimestre" },
  { v: "T2", label: "2e Trimestre"  },
  { v: "T3", label: "3e Trimestre"  },
];

const TERM_COLORS = {
  T1: { from: "#3b82f6", to: "#06b6d4"  },
  T2: { from: "#10b981", to: "#14b8a6"  },
  T3: { from: "#f59e0b", to: "#f97316"  },
};

/* ──────────────────────────────────────────────────────────────
   ATOMES
────────────────────────────────────────────────────────────── */
const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button onClick={toggle} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position:"relative", width:52, height:28, borderRadius:999,
        border:"none", cursor:"pointer", flexShrink:0, outline:"none", transition:"all .3s",
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
        {dark ? <FaMoon style={{ width:11,height:11,color:"#6366f1" }} />
               : <FaSun  style={{ width:11,height:11,color:COL.from  }} />}
      </div>
    </button>
  );
};

const Toast = ({ msg, onClose }) => {
  useEffect(() => {
    if (msg) { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }
  }, [msg]);
  if (!msg) return null;
  const isErr = msg.type === "error";
  return (
    <div onClick={onClose} style={{
      position:"fixed", bottom:24, right:24, zIndex:300,
      display:"flex", alignItems:"center", gap:10, padding:"13px 18px",
      borderRadius:14, cursor:"pointer", fontWeight:700, fontSize:12, color:"#fff",
      animation:"slideUp .3s cubic-bezier(.34,1.56,.64,1)", maxWidth:360,
      background: isErr ? "linear-gradient(135deg,#ef4444,#dc2626)"
        : `linear-gradient(135deg,${COL.from},${COL.to})`,
      boxShadow: isErr ? "0 8px 24px #ef444444" : `0 8px 24px ${COL.shadow}`,
    }}>
      {isErr
        ? <FaExclamationTriangle style={{ flexShrink:0,width:13,height:13 }} />
        : <FaCheck style={{ flexShrink:0,width:13,height:13 }} />}
      {msg.text}
    </div>
  );
};

/* Styled select */
const Sel = ({ icon: Icon, children, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [f, setF] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      {Icon && (
        <span style={{
          position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
          pointerEvents:"none", zIndex:1,
          color: f ? COL.from : T.textMuted, transition:"color .15s",
        }}>
          <Icon style={{ width:12,height:12 }} />
        </span>
      )}
      <select {...props}
        onFocus={(e) => { setF(true); props.onFocus?.(e); }}
        onBlur={(e)  => { setF(false); props.onBlur?.(e); }}
        style={{
          width:"100%", appearance:"none",
          paddingLeft: Icon ? 30 : 12, paddingRight:12,
          paddingTop:8, paddingBottom:8,
          fontSize:12, borderRadius:10, outline:"none", transition:"all .15s",
          background:T.inputBg, color: props.value ? T.textPrimary : T.textMuted,
          border:`1.5px solid ${f ? COL.from : T.inputBorder}`,
          boxShadow: f ? `0 0 0 3px ${COL.from}22` : "none",
        }}>
        {children}
      </select>
    </div>
  );
};

/* Input centré pour les notes */
const GradeInput = ({ label, sublabel, accent, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [f, setF] = useState(false);
  return (
    <div style={{ textAlign:"center" }}>
      <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
        letterSpacing:"0.08em", color: accent || T.textMuted, marginBottom:4 }}>
        {label}
      </p>
      {sublabel && (
        <p style={{ fontSize:8, color:T.textMuted, marginBottom:3 }}>{sublabel}</p>
      )}
      <input {...props} type="number" step="0.01" min="0" max="20"
        onFocus={(e) => { setF(true); props.onFocus?.(e); }}
        onBlur={(e)  => { setF(false); props.onBlur?.(e); }}
        style={{
          width:"100%", textAlign:"center", boxSizing:"border-box",
          padding:"8px 4px", fontSize:14, fontWeight:700, borderRadius:8, outline:"none",
          background:T.inputBg, color:T.textPrimary,
          border:`1.5px solid ${f ? (accent || COL.from) : T.inputBorder}`,
          boxShadow: f ? `0 0 0 3px ${(accent || COL.from)}22` : "none",
          transition:"all .15s",
        }} />
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   GRADE BADGE (dans les cartes résultats)
────────────────────────────────────────────────────────────── */
const GradeBadge = ({ label, value, accent }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const num = parseFloat(value);
  const hasVal = !isNaN(num);

  let bg, color, border;
  if (!hasVal) {
    bg = T.inputBg; color = T.textMuted; border = T.divider;
  } else if (num < 10) {
    bg = dark ? "#2a0a0a" : "#fef2f2"; color = "#ef4444"; border = "#fecaca";
  } else if (num >= 16) {
    bg = dark ? COL.darkBg : COL.lightBg; color = COL.from; border = `${COL.from}55`;
  } else {
    bg = T.cardBg; color = T.textPrimary; border = T.cardBorder;
  }

  return (
    <div style={{ textAlign:"center" }}>
      <p style={{ fontSize:8, fontWeight:800, textTransform:"uppercase",
        letterSpacing:"0.07em", color: accent || T.textMuted, marginBottom:3 }}>
        {label}
      </p>
      <div style={{
        width:38, height:34, display:"flex", alignItems:"center", justifyContent:"center",
        borderRadius:8, background:bg, border:`1.5px solid ${border}`,
        fontSize:13, fontWeight:800, color, transition:"all .15s",
      }}>
        {hasVal ? num : "—"}
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   GRADE CARD
────────────────────────────────────────────────────────────── */
const GradeCard = ({ grade, onEdit, onDelete, animDelay }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [hov, setHov] = useState(false);

  const avg = parseFloat(grade.average_subject);
  const hasAvg = !isNaN(avg);
  const passing = hasAvg && avg >= 10;
  const termColor = TERM_COLORS[grade.term] || TERM_COLORS.T1;

  const [avatarFrom] = avatarGradient(`${grade.student_firstname}${grade.student_lastname}`);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius:16, overflow:"hidden", transition:"all .2s",
        background:T.cardBg,
        border:`1.5px solid ${hov ? COL.from+"55" : T.cardBorder}`,
        boxShadow: hov ? T.cardShadowHov : T.cardShadow,
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        animation:`fadeUp .3s ease-out ${animDelay}ms both`,
        display:"flex", flexDirection:"column",
      }}>
      {/* Bande trimestre */}
      <div style={{
        height:3,
        background:`linear-gradient(90deg,${termColor.from},${termColor.to})`,
      }} />

      {/* Header: élève + trimestre badge */}
      <div style={{ padding:"12px 14px 8px", display:"flex", alignItems:"flex-start", gap:10 }}>
        {/* Avatar */}
        <div style={{
          width:36, height:36, borderRadius:10, flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:13, fontWeight:900, color:"#fff",
          background:`linear-gradient(135deg,${avatarFrom},${avatarGradient(`${grade.student_lastname}`)[1]})`,
          boxShadow:`0 3px 8px ${avatarFrom}44`,
        }}>
          {(grade.student_firstname || "?")[0].toUpperCase()}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          <p style={{
            fontSize:13, fontWeight:800, color:T.textPrimary, lineHeight:1.2,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>
            {grade.student_firstname} {grade.student_lastname}
          </p>
          <p style={{
            fontSize:10, color:T.textMuted, marginTop:2, fontWeight:600,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
          }}>
            {grade.student_class && <span>{grade.student_class} · </span>}
            {grade.subject_name}
          </p>
        </div>

        {/* Badge trimestre */}
        <span style={{
          flexShrink:0, padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:800,
          background:`linear-gradient(135deg,${termColor.from}22,${termColor.to}11)`,
          color: termColor.from,
          border:`1px solid ${termColor.from}44`,
        }}>
          {grade.term}
        </span>
      </div>

      {/* Corps : notes */}
      <div style={{
        padding:"10px 14px",
        background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
        borderTop:`1px solid ${T.divider}`,
        borderBottom:`1px solid ${T.divider}`,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
          {/* Interrogations */}
          <div style={{ display:"flex", gap:5 }}>
            <GradeBadge label="I.1" value={grade.interrogation1} accent="#6366f1" />
            <GradeBadge label="I.2" value={grade.interrogation2} accent="#6366f1" />
            <GradeBadge label="I.3" value={grade.interrogation3} accent="#6366f1" />
          </div>
          {/* Séparateur */}
          <div style={{ width:1, height:44, background:T.divider, flexShrink:0 }} />
          {/* Devoirs */}
          <div style={{ display:"flex", gap:5 }}>
            <GradeBadge label="D.1" value={grade.devoir1} accent="#f97316" />
            <GradeBadge label="D.2" value={grade.devoir2} accent="#f97316" />
          </div>
        </div>
      </div>

      {/* Footer: moyenne + actions */}
      <div style={{
        padding:"10px 14px",
        display:"flex", alignItems:"center", justifyContent:"space-between",
      }}>
        <div>
          <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
            letterSpacing:"0.07em", color:T.textMuted, marginBottom:2 }}>
            Moyenne
          </p>
          <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
            <span style={{
              fontSize:22, fontWeight:900, lineHeight:1,
              color: !hasAvg ? T.textMuted : passing ? COL.from : "#ef4444",
            }}>
              {hasAvg ? avg.toFixed(2) : "—"}
            </span>
            {hasAvg && (
              <span style={{ fontSize:10, color:T.textMuted }}>/20</span>
            )}
          </div>
        </div>

        {/* Barre moyenne visuelle */}
        {hasAvg && (
          <div style={{ flex:1, margin:"0 16px" }}>
            <div style={{
              height:6, borderRadius:999, overflow:"hidden",
              background: dark ? "rgba(255,255,255,0.06)" : "#f1f5f9",
            }}>
              <div style={{
                width:`${Math.min(100, avg / 20 * 100)}%`,
                height:"100%", borderRadius:999, transition:"width .4s ease-out",
                background: passing
                  ? `linear-gradient(90deg,${COL.from},${COL.to})`
                  : "linear-gradient(90deg,#ef4444,#f97316)",
              }} />
            </div>
            <p style={{ fontSize:9, color:T.textMuted, marginTop:3, textAlign:"center" }}>
              {passing ? "✓ Validé" : "✗ En dessous du seuil"}
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{
          display:"flex", gap:4,
          opacity: hov ? 1 : 0.3, transition:"opacity .15s",
        }}>
          <button onClick={() => onEdit(grade)}
            style={{
              width:30, height:30, borderRadius:8, border:"none", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              background: dark ? "#2a1a06" : "#fffbeb", color:"#f59e0b",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background="#f59e0b22")}
            onMouseLeave={(e) => (e.currentTarget.style.background=dark?"#2a1a06":"#fffbeb")}>
            <FaEdit style={{ width:11,height:11 }} />
          </button>
          <button onClick={() => onDelete(grade.id)}
            style={{
              width:30, height:30, borderRadius:8, border:"none", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              background: dark ? "#2a0a0a" : "#fef2f2", color:"#ef4444",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background="#ef444422")}
            onMouseLeave={(e) => (e.currentTarget.style.background=dark?"#2a0a0a":"#fef2f2")}>
            <FaTrash style={{ width:11,height:11 }} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   PAGE PRINCIPALE (inner)
────────────────────────────────────────────────────────────── */
const GradesInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  /* ── Référentiels ── */
  const [classes,  setClasses]  = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);

  /* ── Filtres ── */
  const [filters, setFilters] = useState({
    school_class: "", student: "", subject: "", term: "",
  });
  const [search, setSearch] = useState("");

  /* ── Données notes ── */
  const [grades,        setGrades]        = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingRefs, setLoadingRefs]     = useState(true);

  /* ── Form ── */
  const EMPTY_FORM = {
    id: null, student_id:"", subject_id:"", term:"T1",
    interrogation1:"", interrogation2:"", interrogation3:"",
    devoir1:"", devoir2:"",
  };
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);

  /* ── Chargement initial ── */
  useEffect(() => {
    (async () => {
      setLoadingRefs(true);
      try {
        const [cls, sub] = await Promise.all([
          fetchData("/academics/school-classes/").catch(() => []),
          fetchData("/academics/subjects/").catch(() => []),
        ]);
        setClasses(Array.isArray(cls) ? cls : (cls?.results ?? []));
        setSubjects(Array.isArray(sub) ? sub : (sub?.results ?? []));
      } catch { setMsg({ type:"error", text:"Impossible de charger les données." }); }
      finally { setLoadingRefs(false); }
    })();
  }, []);

  /* ── Élèves selon classe filtre ── */
  useEffect(() => {
    const cls = filters.school_class;
    setStudents([]);
    setFilters((p) => ({ ...p, student: "" }));
    if (!cls) return;
    let active = true;
    setLoadingStudents(true);
    fetchData(`/core/admin/students/by-class/${cls}/`)
      .then((d) => { if (active) setStudents(Array.isArray(d) ? d : (d?.results ?? [])); })
      .catch(() => {})
      .finally(() => { if (active) setLoadingStudents(false); });
    return () => { active = false; };
  }, [filters.school_class]);

  /* ── Fetch notes ── */
  const fetchGrades = useCallback(async (overrideFilters) => {
    setLoadingGrades(true);
    try {
      const f = overrideFilters ?? filters;
      const q = buildQuery({
        school_class:  f.school_class || undefined,
        student_id:    f.student      || undefined,
        subject:       f.subject      || undefined,
        term:          f.term         || undefined,
        student_name:  search.trim()  || undefined,
      });
      const data = await fetchData(`/academics/grades/${q}`);
      setGrades(Array.isArray(data) ? data : (data?.results ?? []));
    } catch { setMsg({ type:"error", text:"Erreur lors de la récupération des notes." }); }
    finally { setLoadingGrades(false); }
  }, [filters, search]);

  /* ── Chargement initial des notes ── */
  useEffect(() => { fetchGrades(); }, []); // eslint-disable-line

  /* ── Synchroniser form.student_id quand les étudiants chargent ── */
  useEffect(() => {
    if (filters.student) setForm((p) => ({ ...p, student_id: filters.student }));
  }, [filters.student]);

  /* ── Submit form ── */
  const handleSubmit = async () => {
    if (!form.student_id || !form.subject_id) {
      setMsg({ type:"error", text:"Veuillez sélectionner un élève et une matière." }); return;
    }
    setSaving(true);
    const payload = {
      student_ref: form.student_id,
      subject_ref: form.subject_id,
      term: form.term || "T1",
      interrogation1: form.interrogation1 === "" ? null : form.interrogation1,
      interrogation2: form.interrogation2 === "" ? null : form.interrogation2,
      interrogation3: form.interrogation3 === "" ? null : form.interrogation3,
      devoir1: form.devoir1 === "" ? null : form.devoir1,
      devoir2: form.devoir2 === "" ? null : form.devoir2,
    };
    try {
      if (form.id) await putData(`/academics/grades/${form.id}/`, payload);
      else         await postData("/academics/grades/", payload);
      setMsg({ type:"success", text: form.id ? "Note mise à jour." : "Note créée." });
      setForm(EMPTY_FORM);
      await fetchGrades();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setMsg({ type:"error", text: detail || "Erreur lors de l'enregistrement." });
    } finally { setSaving(false); }
  };

  /* ── Edit ── */
  const handleEdit = (g) => {
    setForm({
      id: g.id, student_id: g.student_id, subject_id: g.subject_id,
      term: g.term || "T1",
      interrogation1: g.interrogation1 ?? "",
      interrogation2: g.interrogation2 ?? "",
      interrogation3: g.interrogation3 ?? "",
      devoir1: g.devoir1 ?? "",
      devoir2: g.devoir2 ?? "",
    });
    // Sync classe filtre si besoin
    if (g.student_class_id && String(filters.school_class) !== String(g.student_class_id)) {
      setFilters((p) => ({ ...p, school_class: String(g.student_class_id) }));
    }
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  /* ── Delete ── */
  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette note ?")) return;
    try {
      await deleteData(`/academics/grades/${id}/`);
      setMsg({ type:"success", text:"Note supprimée." });
      await fetchGrades();
    } catch { setMsg({ type:"error", text:"Impossible de supprimer." }); }
  };

  /* ── Helpers UI ── */
  const setF = (k, v) => setFilters((p) => ({ ...p, [k]: v }));

  const isEditing = !!form.id;

  /* ── Stats rapides ── */
  const stats = useMemo(() => {
    if (!grades.length) return null;
    const avgs = grades.map((g) => parseFloat(g.average_subject)).filter((n) => !isNaN(n));
    if (!avgs.length) return null;
    const mean = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    const passing = avgs.filter((n) => n >= 10).length;
    return { mean: mean.toFixed(2), passing, total: avgs.length };
  }, [grades]);

  /* ══════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════ */
  return (
    <div style={{ minHeight:"100vh", background:T.pageBg, transition:"background .3s",
      fontFamily:"'Plus Jakarta Sans', sans-serif", paddingBottom:60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ══ HEADER ══ */}
      <header style={{
        position:"sticky", top:0, zIndex:40,
        background:T.headerBg, backdropFilter:"blur(16px)",
        borderBottom:`1px solid ${T.divider}`, transition:"all .3s",
      }}>
        <div style={{ maxWidth:1200, margin:"0 auto", padding:"12px 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:40, height:40, borderRadius:12, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 6px 18px ${COL.shadow}`,
            }}>
              <FaCalculator style={{ width:16,height:16,color:"#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize:17, fontWeight:900, color:T.textPrimary, letterSpacing:"-0.02em" }}>
                Gestion des Notes
              </h1>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>
                Saisie, consultation et suivi des évaluations par trimestre
              </p>
            </div>
          </div>
          <DarkToggle />
        </div>
      </header>

      <main style={{ maxWidth:1200, margin:"0 auto", padding:"20px 24px 0" }}>

        {/* ══ BARRE DE FILTRES ══ */}
        <div style={{
          borderRadius:16, padding:"14px 18px", marginBottom:16,
          background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
          boxShadow:T.cardShadow,
        }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr 160px 100px", gap:10, alignItems:"end",
            "@media(max-width:900px)": { gridTemplateColumns:"1fr 1fr" } }}>

            {/* Recherche */}
            <div>
              <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>
                Recherche
              </p>
              <div style={{ position:"relative" }}>
                <FaSearch style={{ position:"absolute",left:10,top:"50%",
                  transform:"translateY(-50%)", width:11,height:11,
                  color:T.textMuted, pointerEvents:"none" }} />
                <input
                  placeholder="Nom de l'élève…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key==="Enter" && fetchGrades()}
                  style={{
                    width:"100%", boxSizing:"border-box",
                    paddingLeft:30, paddingRight:12, paddingTop:8, paddingBottom:8,
                    fontSize:12, borderRadius:10, outline:"none",
                    background:T.inputBg, color:T.textPrimary,
                    border:`1.5px solid ${T.inputBorder}`, transition:"all .15s",
                  }}
                  onFocus={(e) => (e.target.style.borderColor=COL.from)}
                  onBlur={(e)  => (e.target.style.borderColor=T.inputBorder)} />
              </div>
            </div>

            {/* Classe */}
            <div>
              <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>
                Classe
              </p>
              <Sel icon={FaLayerGroup} value={filters.school_class}
                onChange={(e) => setF("school_class", e.target.value)}>
                <option value="">Toutes les classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Sel>
            </div>

            {/* Élève */}
            <div>
              <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>
                Élève {loadingStudents && <span style={{ color:COL.from }}>…</span>}
              </p>
              <Sel icon={FaUserGraduate} value={filters.student}
                onChange={(e) => setF("student", e.target.value)}
                disabled={!filters.school_class && students.length === 0}>
                <option value="">
                  {filters.school_class
                    ? (loadingStudents ? "Chargement…" : "Tous les élèves")
                    : "Choisir une classe"}
                </option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{studentLabel(s)}</option>
                ))}
              </Sel>
            </div>

            {/* Matière */}
            <div>
              <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>
                Matière
              </p>
              <Sel icon={FaBookOpen} value={filters.subject}
                onChange={(e) => setF("subject", e.target.value)}>
                <option value="">Toutes les matières</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Sel>
            </div>

            {/* Trimestre */}
            <div>
              <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>
                Trimestre
              </p>
              <Sel value={filters.term} onChange={(e) => setF("term", e.target.value)}>
                <option value="">Tous</option>
                {TERMS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </Sel>
            </div>

            {/* Bouton filtrer */}
            <button onClick={() => fetchGrades()}
              style={{
                display:"flex", alignItems:"center", justifyContent:"center", gap:7,
                padding:"9px 14px", borderRadius:10, border:"none", cursor:"pointer",
                fontSize:12, fontWeight:800, color:"#fff",
                background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                boxShadow:`0 4px 12px ${COL.shadow}`,
              }}>
              <FaSearch style={{ width:11,height:11 }} />
              Filtrer
            </button>
          </div>
        </div>

        {/* ══ STATS RAPIDES ══ */}
        {stats && (
          <div style={{
            display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16,
          }}>
            {[
              { label:"Notes affichées", val: grades.length, sub:"résultats",    color:COL.from },
              { label:"Moyenne générale", val: stats.mean,   sub:"sur 20",        color: parseFloat(stats.mean)>=10 ? COL.from : "#ef4444" },
              { label:"Taux de réussite", val:`${Math.round(stats.passing/stats.total*100)}%`, sub:`${stats.passing}/${stats.total} élèves`, color:COL.from },
            ].map(({ label, val, sub, color }, i) => (
              <div key={i} style={{
                borderRadius:14, padding:"12px 16px",
                background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
                boxShadow:T.cardShadow,
                animation:`fadeUp .3s ease-out ${i*60}ms both`,
              }}>
                <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.08em", color:T.textMuted, marginBottom:4 }}>
                  {label}
                </p>
                <p style={{ fontSize:22, fontWeight:900, color, lineHeight:1 }}>{val}</p>
                <p style={{ fontSize:10, color:T.textMuted, marginTop:2 }}>{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* ══ LAYOUT : FORM + RÉSULTATS ══ */}
        <div style={{ display:"grid", gridTemplateColumns:"300px 1fr", gap:16, alignItems:"start" }}>

          {/* ── FORMULAIRE (gauche, sticky) ── */}
          <div style={{
            borderRadius:16, overflow:"hidden", position:"sticky", top:76,
            background:T.cardBg, border:`1.5px solid ${isEditing ? "#f59e0b88" : T.cardBorder}`,
            boxShadow: isEditing ? "0 4px 20px #f59e0b22" : T.cardShadow,
            transition:"border-color .3s, box-shadow .3s",
          }}>
            {/* Bande */}
            <div style={{
              height:4,
              background: isEditing
                ? "linear-gradient(90deg,#f59e0b,#f97316)"
                : `linear-gradient(90deg,${COL.from},${COL.to})`,
              transition:"background .3s",
            }} />

            {/* Header form */}
            <div style={{
              padding:"12px 16px",
              borderBottom:`1px solid ${T.divider}`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              background: isEditing
                ? (dark ? "rgba(245,158,11,0.08)" : "#fffbeb")
                : "transparent",
              transition:"background .3s",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{
                  width:30, height:30, borderRadius:8, flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: isEditing
                    ? "linear-gradient(135deg,#f59e0b,#f97316)"
                    : `linear-gradient(135deg,${COL.from},${COL.to})`,
                  boxShadow: isEditing ? "0 3px 8px #f59e0b44" : `0 3px 8px ${COL.shadow}`,
                }}>
                  {isEditing
                    ? <FaEdit  style={{ width:12,height:12,color:"#fff" }} />
                    : <FaPlus  style={{ width:12,height:12,color:"#fff" }} />}
                </div>
                <p style={{ fontSize:13, fontWeight:800, color:T.textPrimary }}>
                  {isEditing ? "Modifier la note" : "Nouvelle saisie"}
                </p>
              </div>
              {isEditing && (
                <button onClick={() => setForm(EMPTY_FORM)}
                  style={{
                    display:"flex", alignItems:"center", gap:5, padding:"4px 9px",
                    borderRadius:7, border:`1px solid #f59e0b44`, background:"transparent",
                    cursor:"pointer", fontSize:10, fontWeight:700, color:"#f59e0b",
                  }}>
                  <FaEraser style={{ width:9,height:9 }} /> Annuler
                </button>
              )}
            </div>

            {/* Corps form */}
            <div style={{ padding:"14px 16px", display:"flex", flexDirection:"column", gap:12 }}>

              {/* Classe (pour peupler les élèves) */}
              <div>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:T.textMuted, marginBottom:4 }}>
                  Classe <span style={{ fontWeight:400,textTransform:"none",letterSpacing:0 }}>(pour filtrer les élèves)</span>
                </p>
                <Sel icon={FaLayerGroup} value={filters.school_class}
                  onChange={(e) => setF("school_class", e.target.value)}>
                  <option value="">— Sélectionner une classe —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Sel>
              </div>

              {/* Élève */}
              <div>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:T.textMuted, marginBottom:4 }}>
                  Élève *
                </p>
                <Sel icon={FaUserGraduate} value={form.student_id}
                  onChange={(e) => setForm((p) => ({ ...p, student_id: e.target.value }))}
                  disabled={students.length === 0}>
                  <option value="">
                    {filters.school_class
                      ? (loadingStudents ? "Chargement…" : (students.length===0 ? "Aucun élève" : "— Sélectionner —"))
                      : "Choisissez une classe"}
                  </option>
                  {students.map((s) => <option key={s.id} value={s.id}>{studentLabel(s)}</option>)}
                </Sel>
              </div>

              {/* Matière */}
              <div>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:T.textMuted, marginBottom:4 }}>
                  Matière *
                </p>
                <Sel icon={FaBookOpen} value={form.subject_id}
                  onChange={(e) => setForm((p) => ({ ...p, subject_id: e.target.value }))}>
                  <option value="">— Sélectionner —</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Sel>
              </div>

              {/* Trimestre */}
              <div>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:T.textMuted, marginBottom:6 }}>
                  Trimestre
                </p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                  {TERMS.map(({ v, label }) => {
                    const tc = TERM_COLORS[v];
                    const active = form.term === v;
                    return (
                      <button key={v} type="button" onClick={() => setForm((p) => ({ ...p, term: v }))}
                        style={{
                          padding:"7px 4px", borderRadius:9, border:"none", cursor:"pointer",
                          fontSize:11, fontWeight:800, transition:"all .15s",
                          background: active
                            ? `linear-gradient(135deg,${tc.from},${tc.to})`
                            : (dark ? "rgba(255,255,255,.05)" : "#f8fafc"),
                          color: active ? "#fff" : T.textMuted,
                          boxShadow: active ? `0 3px 10px ${tc.from}55` : "none",
                          transform: active ? "translateY(-1px)" : "none",
                        }}>
                        {v}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Séparateur */}
              <div style={{ height:1, background:T.divider }} />

              {/* Interrogations */}
              <div>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:"#6366f1", marginBottom:6 }}>
                  Interrogations <span style={{ fontWeight:500,color:T.textMuted }}>(coef. 1)</span>
                </p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                  {["interrogation1","interrogation2","interrogation3"].map((f, i) => (
                    <GradeInput key={f} label={`Int. ${i+1}`} accent="#6366f1"
                      placeholder="—"
                      value={form[f]}
                      onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} />
                  ))}
                </div>
              </div>

              {/* Devoirs */}
              <div>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:"#f97316", marginBottom:6 }}>
                  Devoirs <span style={{ fontWeight:500,color:T.textMuted }}>(coef. 2)</span>
                </p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {["devoir1","devoir2"].map((f, i) => (
                    <GradeInput key={f} label={`Dev. ${i+1}`} accent="#f97316"
                      placeholder="—"
                      value={form[f]}
                      onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} />
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button onClick={handleSubmit} disabled={saving}
                style={{
                  marginTop:4, width:"100%", display:"flex", alignItems:"center",
                  justifyContent:"center", gap:8, padding:"11px 16px",
                  borderRadius:12, border:"none", cursor: saving ? "not-allowed" : "pointer",
                  fontSize:13, fontWeight:800, color:"#fff", transition:"all .2s",
                  background: saving ? T.textMuted
                    : isEditing
                      ? "linear-gradient(135deg,#f59e0b,#f97316)"
                      : `linear-gradient(135deg,${COL.from},${COL.to})`,
                  boxShadow: saving ? "none"
                    : isEditing ? "0 4px 16px #f59e0b44"
                    : `0 4px 16px ${COL.shadow}`,
                }}>
                {saving
                  ? <FaSyncAlt style={{ width:13,height:13 }} className="animate-spin" />
                  : <FaSave    style={{ width:13,height:13 }} />}
                {saving ? "Enregistrement…"
                  : isEditing ? "Mettre à jour" : "Enregistrer la note"}
              </button>
            </div>
          </div>

          {/* ── RÉSULTATS (droite) ── */}
          <div>
            {loadingGrades ? (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[...Array(4)].map((_,i) => (
                  <div key={i} style={{ height:160, borderRadius:16, background:T.cardBg }}
                    className="animate-pulse" />
                ))}
              </div>
            ) : grades.length === 0 ? (
              <div style={{
                borderRadius:16, padding:"60px 24px", textAlign:"center",
                background:T.cardBg, border:`2px dashed ${COL.from}44`,
                animation:"fadeUp .3s ease-out",
              }}>
                <div style={{
                  width:64, height:64, borderRadius:20, margin:"0 auto 16px",
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:`linear-gradient(135deg,${COL.from}22,${COL.to}11)`,
                }}>
                  <FaBookOpen style={{ width:26,height:26,color:COL.from,opacity:.5 }} />
                </div>
                <p style={{ fontSize:16, fontWeight:800, color:T.textSecondary }}>
                  Aucune note trouvée
                </p>
                <p style={{ fontSize:12, color:T.textMuted, marginTop:6, maxWidth:280, margin:"6px auto 0" }}>
                  Ajustez les filtres ou saisissez une nouvelle note via le formulaire.
                </p>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {grades.map((g, i) => (
                  <GradeCard key={g.id} grade={g}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    animDelay={i * 30} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{BASE_KEYFRAMES}{`
        .animate-spin  { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .animate-pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.25} }
      `}</style>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   ROOT (avec ThemeCtx)
────────────────────────────────────────────────────────────── */
const Grades = () => {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("scol360_dark") === "true"; } catch { return false; }
  });
  const toggle = useCallback(() => {
    setDark((v) => {
      const n = !v;
      try { localStorage.setItem("scol360_dark", String(n)); } catch {}
      return n;
    });
  }, []);
  return (
    <ThemeCtx.Provider value={{ dark, toggle }}>
      <GradesInner />
    </ThemeCtx.Provider>
  );
};

export default Grades;