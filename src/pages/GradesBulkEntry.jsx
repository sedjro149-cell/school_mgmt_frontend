// src/pages/GradeEntry.jsx
import React, {
  useCallback, useEffect, useLayoutEffect,
  useMemo, useRef, useState, memo,
} from "react";
import {
  FaCheck, FaExclamationTriangle, FaMoon, FaSun,
  FaSave, FaSyncAlt, FaTable, FaUserGraduate,
  FaTimes, FaChevronDown, FaClipboardList,
  FaSpinner, FaChartBar, FaLock, FaLockOpen, FaEye,
} from "react-icons/fa";
import { fetchData, postData } from "./api";
import {
  ThemeCtx, useTheme, LIGHT, DARK,
  SECTION_PALETTE, BASE_KEYFRAMES,
} from "./theme";

const COL = SECTION_PALETTE.academic;

const GRADE_FIELDS = [
  { key:"interrogation1", label:"I1", group:"interro" },
  { key:"interrogation2", label:"I2", group:"interro" },
  { key:"interrogation3", label:"I3", group:"interro" },
  { key:"devoir1",        label:"D1", group:"devoir"  },
  { key:"devoir2",        label:"D2", group:"devoir"  },
];
const TERMS = [
  { v:"T1", color:"#3b82f6" },
  { v:"T2", color:"#10b981" },
  { v:"T3", color:"#f59e0b" },
];
const STATUS_META = {
  draft:     { label:"Brouillon",  color:"#6366f1", bg:"#6366f118", Icon: FaLockOpen },
  locked:    { label:"Verrouillé", color:"#f59e0b", bg:"#f59e0b18", Icon: FaLock     },
  published: { label:"Publié",     color:"#10b981", bg:"#10b98118", Icon: FaEye      },
};

/* ── UTILS ── */
const gradeKey = (sid, subjId) => `${String(sid)}::${String(subjId)}`;
const clampGrade = (v) => {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(20, Math.round(n * 100) / 100));
};
const fmtVal = (n) => (n == null ? "" : String(n));
const calcAvg = (nums) => {
  const vals = (nums || []).filter(x => x != null && x !== "");
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + Number(b), 0) / vals.length * 100) / 100;
};
const calcWeightedAvg = (i1, i2, i3, d1, d2) => {
  const moyI = calcAvg([i1, i2, i3]);
  const parts = [];
  if (moyI != null) parts.push(moyI);
  if (d1   != null) parts.push(Number(d1));
  if (d2   != null) parts.push(Number(d2));
  if (!parts.length) return null;
  return Math.round(parts.reduce((a, b) => a + b, 0) / 3 * 100) / 100;
};
const buildQuery = (obj = {}) => {
  const parts = Object.entries(obj)
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join("&")}` : "";
};
const buildPayload = (g, termArg) => {
  const line = {
    ...(g.id ? { id: g.id } : {}),
    student_id: String(g.student_id),
    subject_id: Number(g.subject_id),
    term:        g.term || termArg,
  };
  GRADE_FIELDS.forEach(({ key }) => {
    const v = g[key];
    if (v !== null && v !== undefined) line[key] = clampGrade(v);
  });
  return line;
};
const colorForGrade = (v) => {
  if (v == null) return null;
  if (v >= 16) return "#10b981";
  if (v >= 10) return "#3b82f6";
  if (v >= 8)  return "#f59e0b";
  return "#ef4444";
};

/* ── DARK TOGGLE ── */
const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button onClick={toggle}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position:"relative", width:52, height:28, borderRadius:999,
        border:"none", cursor:"pointer", flexShrink:0, outline:"none", transition:"all .3s",
        background: dark ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
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

/* ── TOAST ── */
const Toast = ({ msg, onClose }) => {
  useEffect(() => {
    if (msg) { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }
  }, [msg]);
  if (!msg) return null;
  const isErr = msg.type === "error";
  return (
    <div onClick={onClose} style={{
      position:"fixed", bottom:24, right:24, zIndex:350,
      display:"flex", alignItems:"center", gap:10, padding:"13px 18px",
      borderRadius:14, cursor:"pointer", fontWeight:700, fontSize:12, color:"#fff",
      animation:"slideUp .3s cubic-bezier(.34,1.56,.64,1)", maxWidth:380,
      background: isErr ? "linear-gradient(135deg,#ef4444,#dc2626)"
        : `linear-gradient(135deg,${COL.from},${COL.to})`,
      boxShadow: isErr ? "0 8px 24px #ef444444" : `0 8px 24px ${COL.shadow}`,
    }}>
      {isErr ? <FaExclamationTriangle style={{ flexShrink:0,width:13,height:13 }} />
             : <FaCheck style={{ flexShrink:0,width:13,height:13 }} />}
      {msg.text}
    </div>
  );
};

/* ── LOCK BANNER ── */
const LockBanner = ({ termStatus, onNavigate }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  if (!termStatus || termStatus.status === "draft") return null;
  const meta = STATUS_META[termStatus.status] || STATUS_META.locked;
  const { Icon } = meta;
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10,
      padding:"11px 16px", borderRadius:11, marginBottom:14,
      background: meta.bg, border:`1.5px solid ${meta.color}33`,
    }}>
      <Icon style={{ width:15, height:15, color:meta.color, flexShrink:0 }} />
      <div style={{ flex:1 }}>
        <p style={{ fontSize:12, fontWeight:800, color:meta.color }}>
          Grille {meta.label.toLowerCase()} — saisie désactivée
        </p>
        <p style={{ fontSize:10, color:meta.color, opacity:0.8, marginTop:2 }}>
          {termStatus.locked_by_name ? `Verrouillé par ${termStatus.locked_by_name}` : ""}
          {termStatus.locked_at ? ` · ${new Date(termStatus.locked_at).toLocaleDateString("fr-FR")}` : ""}
          {" · "}Pour modifier, déverrouillez dans <strong>Gestion Trimestres</strong>.
        </p>
      </div>
    </div>
  );
};

/* ── RESULT MODAL ── */
const ResultModal = ({ open, onClose, results }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;

  const counts = { created:0, updated:0, error:0 };
  (results || []).forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++; });

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:16, animation:"fadeIn .18s ease-out",
    }}>
      <div style={{
        width:"100%", maxWidth:700, maxHeight:"82vh",
        display:"flex", flexDirection:"column",
        background:T.cardBg, borderRadius:18, overflow:"hidden",
        boxShadow:"0 32px 80px rgba(0,0,0,.35)",
        animation:"panelUp .22s cubic-bezier(.34,1.4,.64,1)",
        border:`1.5px solid ${T.cardBorder}`,
      }}>
        <div style={{ height:4, background:`linear-gradient(90deg,${COL.from},${COL.to})`, flexShrink:0 }} />
        <div style={{
          display:"flex", alignItems:"center", gap:10, padding:"14px 18px",
          borderBottom:`1px solid ${T.divider}`, flexShrink:0,
        }}>
          <div style={{
            width:32, height:32, borderRadius:9,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:`linear-gradient(135deg,${COL.from},${COL.to})`,
            boxShadow:`0 4px 12px ${COL.shadow}`,
          }}>
            <FaClipboardList style={{ width:13,height:13,color:"#fff" }} />
          </div>
          <div style={{ flex:1 }}>
            <p style={{ fontSize:14, fontWeight:800, color:T.textPrimary }}>Rapport de sauvegarde</p>
            <p style={{ fontSize:10, color:T.textMuted, marginTop:1 }}>
              {counts.created} créé{counts.created!==1?"s":""} · {counts.updated} mis à jour · {counts.error} erreur{counts.error!==1?"s":""}
            </p>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {[
              { label:"Créés",   val:counts.created, color:"#10b981" },
              { label:"Maj",     val:counts.updated, color:`${COL.from}` },
              { label:"Erreurs", val:counts.error,   color:"#ef4444" },
            ].map(({ label, val, color }) => (
              <div key={label} style={{
                textAlign:"center", padding:"4px 10px", borderRadius:8,
                background:`${color}15`, border:`1px solid ${color}33`,
              }}>
                <p style={{ fontSize:14, fontWeight:900, color, lineHeight:1 }}>{val}</p>
                <p style={{ fontSize:8, fontWeight:700, color, textTransform:"uppercase",
                  letterSpacing:"0.06em", marginTop:2 }}>{label}</p>
              </div>
            ))}
          </div>
          <button onClick={onClose}
            style={{
              width:28, height:28, borderRadius:7, border:"none", cursor:"pointer",
              background:"transparent", color:T.textMuted,
              display:"flex", alignItems:"center", justifyContent:"center",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background="#ef444422"; e.currentTarget.style.color="#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
            <FaTimes style={{ width:11,height:11 }} />
          </button>
        </div>
        <div style={{
          flex:1, overflowY:"auto",
          scrollbarWidth:"thin", scrollbarColor:`${COL.from} transparent`,
        }}>
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 1fr 100px 1fr",
            padding:"8px 16px", position:"sticky", top:0, zIndex:10,
            background:T.tableHead, borderBottom:`1px solid ${T.divider}`,
          }}>
            {["Élève","Matière","État","Détail"].map((h, i) => (
              <p key={i} style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted }}>{h}</p>
            ))}
          </div>
          {(!results || results.length === 0) ? (
            <div style={{ padding:"32px 16px", textAlign:"center" }}>
              <p style={{ fontSize:12, color:T.textMuted, fontStyle:"italic" }}>Aucune opération effectuée.</p>
            </div>
          ) : results.map((r, i) => {
            const isErr = r.status === "error";
            const isNew = r.status === "created";
            const color = isErr ? "#ef4444" : isNew ? "#10b981" : COL.from;
            const label = isErr ? "Erreur" : isNew ? "Créé" : "Mis à jour";
            return (
              <div key={i} style={{
                display:"grid", gridTemplateColumns:"1fr 1fr 100px 1fr",
                padding:"10px 16px", borderBottom:`1px solid ${T.divider}`,
                background: i%2===0 ? "transparent" : (dark?"rgba(255,255,255,0.015)":"rgba(0,0,0,0.01)"),
              }}>
                <p style={{ fontSize:11, fontWeight:600, color:T.textPrimary }}>
                  {r.student_label || `ID ${r.student_id}`}
                </p>
                <p style={{ fontSize:11, color:T.textSecondary }}>
                  {r.subject_label || `ID ${r.subject_id}`}
                </p>
                <div>
                  <span style={{
                    display:"inline-block", padding:"2px 9px", borderRadius:999,
                    fontSize:9, fontWeight:800, textTransform:"uppercase",
                    background:`${color}18`, color, border:`1px solid ${color}33`,
                  }}>{label}</span>
                </div>
                <p style={{ fontSize:10, color:T.textMuted, overflow:"hidden",
                  textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {r.message || (r.errors ? JSON.stringify(r.errors) : "—")}
                </p>
              </div>
            );
          })}
        </div>
        <div style={{
          padding:"12px 18px", borderTop:`1px solid ${T.divider}`,
          display:"flex", justifyContent:"flex-end", flexShrink:0,
        }}>
          <button onClick={onClose} style={{
            padding:"9px 24px", borderRadius:10, border:"none", cursor:"pointer",
            fontSize:12, fontWeight:800, color:"#fff",
            background:`linear-gradient(135deg,${COL.from},${COL.to})`,
            boxShadow:`0 4px 12px ${COL.shadow}`,
          }}>Fermer</button>
        </div>
      </div>
    </div>
  );
};

/* ── GRADE CELL ── */
const GradeCell = memo(function GradeCell({
  studentId, subjectId,
  gradeData, errors, isDirty, isSaving, isLocked,
  onFieldChange, onCellBlur,
}) {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  const g    = gradeData || {};
  const errs = errors    || {};
  const hasErrors = Object.keys(errs).length > 0;

  const avgI   = calcAvg([g.interrogation1, g.interrogation2, g.interrogation3]);
  const avgD   = calcAvg([g.devoir1, g.devoir2]);
  const avgTot = calcWeightedAvg(
    g.interrogation1, g.interrogation2, g.interrogation3,
    g.devoir1, g.devoir2,
  );
  const avgColor = colorForGrade(avgTot);

  const handleContainerBlur = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      onCellBlur(studentId, subjectId);
    }
  };

  return (
    <div
      onBlur={handleContainerBlur}
      style={{
        padding:"8px", borderRadius:11, transition:"all .15s", position:"relative",
        background: isLocked
          ? (dark?"rgba(245,158,11,0.04)":"rgba(245,158,11,0.02)")
          : hasErrors
            ? (dark?"rgba(239,68,68,0.08)":"rgba(239,68,68,0.04)")
            : isDirty
              ? (dark?"rgba(245,158,11,0.08)":"rgba(245,158,11,0.04)")
              : "transparent",
        border:`1.5px solid ${
          isLocked ? "#f59e0b22" : hasErrors ? "#ef444444" : isDirty ? "#f59e0b44" : T.cardBorder
        }`,
        minWidth:220,
        opacity: isLocked ? 0.72 : 1,
        cursor: isLocked ? "not-allowed" : "auto",
      }}>

      {/* Status dot / lock icon */}
      <div style={{
        position:"absolute", top:7, right:7,
        display:"flex", alignItems:"center", gap:3,
      }}>
        {isLocked ? (
          <FaLock style={{ width:8, height:8, color:"#f59e0b", opacity:0.7 }} />
        ) : isSaving ? (
          <FaSyncAlt style={{ width:8,height:8,color:COL.from, animation:"spin 1s linear infinite" }} />
        ) : (
          <div style={{
            width:5, height:5, borderRadius:999,
            background: hasErrors ? "#ef4444" : isDirty ? "#f59e0b" : "#10b98166",
            opacity: isDirty || hasErrors ? 1 : 0.3,
            transition:"all .2s",
          }} title={hasErrors?"Erreur saisie":isDirty?"Non sauvegardé":"À jour"} />
        )}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:3, marginBottom:3 }}>
        {GRADE_FIELDS.map(({ key, label, group }) => (
          <p key={key} style={{
            fontSize:8, fontWeight:800, textAlign:"center", textTransform:"uppercase",
            letterSpacing:"0.05em",
            color: group==="interro" ? (isLocked?"#f59e0b":COL.from) : (isLocked?"#f59e0b":"#f97316"),
          }}>{label}</p>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:3 }}>
        {GRADE_FIELDS.map(({ key, group }) => {
          const hasErr = !!errs[key];
          const ac = group === "interro" ? COL.from : "#f97316";
          return (
            <input
              key={key}
              type="text"
              inputMode="decimal"
              pattern="[0-9.]*"
              value={fmtVal(g[key])}
              placeholder="—"
              disabled={isLocked}
              onWheel={(e) => e.currentTarget.blur()}
              onChange={(e) => onFieldChange(studentId, subjectId, key, e.target.value)}
              onFocus={(e) => {
                if (isLocked) return;
                e.currentTarget.style.borderColor = hasErr ? "#ef4444" : ac;
                e.currentTarget.style.boxShadow   = `0 0 0 3px ${hasErr?"#ef444422":ac+"22"}`;
                e.currentTarget.select();
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = hasErr ? "#ef444455" : T.inputBorder;
                e.currentTarget.style.boxShadow   = "none";
              }}
              style={{
                width:"100%", boxSizing:"border-box",
                textAlign:"center", fontSize:12, fontWeight:700,
                padding:"6px 2px", borderRadius:7, outline:"none", transition:"all .15s",
                background: isLocked
                  ? (dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.025)")
                  : hasErr
                    ? (dark?"rgba(239,68,68,0.15)":"rgba(239,68,68,0.07)")
                    : T.inputBg,
                color: isLocked ? T.textMuted : hasErr ? "#ef4444" : T.textPrimary,
                border:`1.5px solid ${isLocked?"transparent":hasErr?"#ef444455":T.inputBorder}`,
                fontFamily:"'Plus Jakarta Sans', sans-serif",
                cursor: isLocked ? "not-allowed" : "text",
              }}
            />
          );
        })}
      </div>

      {/* Moyennes */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        marginTop:6, paddingTop:5, borderTop:`1px solid ${T.divider}`, gap:4,
      }}>
        <div style={{ display:"flex", gap:6 }}>
          {avgI !== null && (
            <span style={{ fontSize:9, fontWeight:700, color:T.textMuted,
              display:"flex", alignItems:"center", gap:2 }}>
              <span style={{ color:isLocked?"#f59e0b":COL.from, fontSize:8 }}>I̅</span>
              <span style={{ color:colorForGrade(avgI)||T.textSecondary, fontWeight:800 }}>{avgI}</span>
            </span>
          )}
          {avgD !== null && (
            <span style={{ fontSize:9, fontWeight:700, color:T.textMuted,
              display:"flex", alignItems:"center", gap:2 }}>
              <span style={{ color:isLocked?"#f59e0b":"#f97316", fontSize:8 }}>D̅</span>
              <span style={{ color:colorForGrade(avgD)||T.textSecondary, fontWeight:800 }}>{avgD}</span>
            </span>
          )}
        </div>
        {avgTot !== null && (
          <div style={{
            padding:"2px 9px", borderRadius:999, fontSize:10, fontWeight:900,
            background: avgColor ? `${avgColor}18` : T.inputBg,
            color: avgColor || T.textMuted,
            border:`1px solid ${avgColor ? avgColor+"33" : T.cardBorder}`,
          }}>{avgTot}</div>
        )}
      </div>

      {hasErrors && !isLocked && (
        <div style={{
          marginTop:5, display:"flex", alignItems:"center", gap:4,
          padding:"3px 7px", borderRadius:6,
          background:"#ef444415", border:"1px solid #ef444433",
        }}>
          <FaExclamationTriangle style={{ width:8,height:8,color:"#ef4444",flexShrink:0 }} />
          <p style={{ fontSize:9, color:"#ef4444", fontWeight:700 }}>
            {Object.values(errs)[0]}
          </p>
        </div>
      )}
    </div>
  );
});

/* ── COMPOSANT PRINCIPAL ── */
const GradesInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  const [classes,    setClasses]    = useState([]);
  const [students,   setStudents]   = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [subNote,    setSubNote]    = useState(null);
  const [termStatus, setTermStatus] = useState(null);

  const [classId, setClassId] = useState("");
  const [term,    setTerm]    = useState("T1");

  const [gradesMap,  setGradesMap]  = useState({});
  const [cellErrors, setCellErrors] = useState({});
  const [dirtyMap,   setDirtyMap]   = useState({});
  const [savingMap,  setSavingMap]  = useState({});

  const gradesMapRef  = useRef(gradesMap);
  const cellErrorsRef = useRef(cellErrors);
  const dirtySetRef   = useRef(new Set());
  const termRef       = useRef(term);
  const classIdRef    = useRef(classId);
  useEffect(() => { gradesMapRef.current  = gradesMap;  }, [gradesMap]);
  useEffect(() => { cellErrorsRef.current = cellErrors; }, [cellErrors]);
  useEffect(() => { termRef.current       = term;       }, [term]);
  useEffect(() => { classIdRef.current    = classId;    }, [classId]);

  const isLocked = termStatus?.status === "locked" || termStatus?.status === "published";
  const isLockedRef = useRef(isLocked);
  useEffect(() => { isLockedRef.current = isLocked; }, [isLocked]);

  const [msg,         setMsg]         = useState(null);
  const [resultOpen,  setResultOpen]  = useState(false);
  const [saveResults, setSaveResults] = useState([]);
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);
  const pendingCount = Object.keys(dirtyMap).length;

  const toast = (type, text) => setMsg({ type, text });

  useLayoutEffect(() => {
    const measure = () => {
      if (headerRef.current) setHeaderH(headerRef.current.getBoundingClientRect().height);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchData("/academics/school-classes/");
        setClasses(Array.isArray(data) ? data : data?.results ?? []);
      } catch { toast("error", "Impossible de charger les classes."); }
    })();
  }, []);

  /* ── fetchTermStatus ── */
  const fetchTermStatus = useCallback(async (cls, termArg) => {
    if (!cls || !termArg) { setTermStatus(null); return; }
    try {
      const data = await fetchData(`/academics/term-status/?school_class=${cls}&term=${termArg}`);
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      setTermStatus(list.length ? list[0] : null);
    } catch { setTermStatus(null); }
  }, []);

  const reloadClass = useCallback(async (cId, termArg) => {
    if (!cId) return;
    classIdRef.current = cId;
    setLoading(true); setSubNote(null);
    setStudents([]); setSubjects([]); setGradesMap({});
    setCellErrors({}); setDirtyMap({}); setTermStatus(null);
    dirtySetRef.current.clear();

    // Fetch term status in parallel (non-blocking)
    fetchTermStatus(cId, termArg);

    try {
      const stData = await fetchData(`/core/admin/students/by-class/${cId}/`);
      setStudents(Array.isArray(stData) ? stData : []);

      let normalizedSubs = [];
      try {
        const subRes = await fetchData(`/academics/class-subjects/by-class/${cId}/`);
        const raw = Array.isArray(subRes) ? subRes : [];
        if (!raw.length) {
          setSubNote("Aucune matière configurée pour cette classe.");
        } else {
          normalizedSubs = raw.map(s => {
            const subObj = s.subject || null;
            const subject_id = subObj?.id ?? s.subject_id ?? null;
            return {
              id:          s.id,
              displayName: s.name?.trim() || subObj?.name || s.subject_name || `Matière #${s.id}`,
              subject_id,
              raw:         s,
            };
          });
          setSubjects(normalizedSubs);
        }
      } catch { setSubNote("Impossible de charger les matières."); }

      try {
        const q = buildQuery({ school_class: cId, term: termArg });
        const gres = await fetchData(`/academics/grades/${q}`);
        const newMap = {};
        (gres || []).forEach(g => {
          const sid   = g.student_id  ?? g.student?.id  ?? null;
          const subid = g.subject_id  ?? g.subject?.id  ?? null;
          if (!sid || !subid) return;
          const key = gradeKey(String(sid), String(subid));
          newMap[key] = {
            ...g,
            student_id:    String(sid),
            subject_id:    String(subid),
            interrogation1: g.interrogation1 != null ? Number(g.interrogation1) : null,
            interrogation2: g.interrogation2 != null ? Number(g.interrogation2) : null,
            interrogation3: g.interrogation3 != null ? Number(g.interrogation3) : null,
            devoir1:        g.devoir1        != null ? Number(g.devoir1)        : null,
            devoir2:        g.devoir2        != null ? Number(g.devoir2)        : null,
          };
        });
        setGradesMap(newMap);
        gradesMapRef.current = newMap;
      } catch { toast("error", "Erreur lors du chargement des notes."); }

    } catch { toast("error", "Impossible de charger les données de la classe."); }
    finally  { setLoading(false); }
  }, [fetchTermStatus]);

  useEffect(() => { reloadClass(classId, term); }, [classId, term, reloadClass]);

  const handleFieldChange = useCallback((studentId, subjectId, field, raw) => {
    if (isLockedRef.current) return;
    const key    = gradeKey(String(studentId), String(subjectId));
    const parsed = raw === "" ? null : parseFloat(raw);

    let err = null;
    if (raw !== "" && raw !== null) {
      if (Number.isNaN(parsed))           err = "Valeur numérique requise";
      else if (parsed < 0 || parsed > 20) err = "La note doit être entre 0 et 20";
    }

    setGradesMap(prev => {
      const existing = prev[key] || {
        id: null, student_id: String(studentId),
        subject_id: String(subjectId), term: termRef.current,
      };
      const updated = { ...existing, [field]: parsed, term: termRef.current };
      gradesMapRef.current = { ...gradesMapRef.current, [key]: updated };
      return gradesMapRef.current;
    });

    setCellErrors(prev => {
      const copy = { ...prev };
      const cellErr = copy[key] ? { ...copy[key] } : {};
      if (err) cellErr[field] = err; else delete cellErr[field];
      const newCell = { ...copy, [key]: cellErr };
      if (!Object.keys(cellErr).length) delete newCell[key];
      cellErrorsRef.current = newCell;
      return newCell;
    });

    dirtySetRef.current.add(key);
    setDirtyMap(d => ({ ...d, [key]: true }));
  }, []);

  const saveSingleGrade = useCallback(async (key) => {
    if (isLockedRef.current) return;
    const g = gradesMapRef.current[key];
    if (!g) return;
    const hasErr = cellErrorsRef.current[key] &&
      Object.keys(cellErrorsRef.current[key]).length > 0;
    if (hasErr) return;

    setSavingMap(s => ({ ...s, [key]: true }));
    try {
      const payload = buildPayload(g, termRef.current);
      const data = await postData("/academics/grades/bulk_upsert/", [payload]);
      const r    = (Array.isArray(data?.results) ? data.results : [])[0];

      // Backend might return locked status
      if (r?.locked) {
        fetchTermStatus(classIdRef.current, termRef.current);
        toast("error", "Cette grille vient d'être verrouillée.");
        return;
      }

      if (r && r.status !== "error") {
        if (r.id) {
          setGradesMap(prev => {
            const updated = { ...prev, [key]: { ...prev[key], id: r.id } };
            gradesMapRef.current = updated;
            return updated;
          });
        }
        dirtySetRef.current.delete(key);
        setDirtyMap(d => { const c = { ...d }; delete c[key]; return c; });
      } else if (r?.status === "error") {
        if (r.status_code === 423 || r.locked) {
          fetchTermStatus(classIdRef.current, termRef.current);
          toast("error", "Grille verrouillée — sauvegarde impossible.");
        } else {
          setCellErrors(prev => {
            const updated = { ...prev, [key]: r.errors || { server: "Erreur serveur" } };
            cellErrorsRef.current = updated;
            return updated;
          });
          toast("error", "Erreur serveur sur une cellule.");
        }
      }
    } catch (err) {
      if (err?.status === 423) {
        fetchTermStatus(classIdRef.current, termRef.current);
        toast("error", "Grille verrouillée par un administrateur.");
      } else {
        toast("error", "Erreur de connexion lors de la sauvegarde.");
      }
    } finally {
      setSavingMap(s => { const c = { ...s }; delete c[key]; return c; });
    }
  }, [fetchTermStatus]);

  const handleCellBlur = useCallback((studentId, subjectId) => {
    if (isLockedRef.current) return;
    const key = gradeKey(String(studentId), String(subjectId));
    if (dirtySetRef.current.has(key)) {
      const hasErr = cellErrorsRef.current[key] &&
        Object.keys(cellErrorsRef.current[key]).length > 0;
      if (!hasErr) saveSingleGrade(key);
    }
  }, [saveSingleGrade]);

  const handleSaveAll = useCallback(async () => {
    if (isLockedRef.current) {
      toast("error", "La grille est verrouillée — sauvegarde impossible.");
      return;
    }
    const payload = [];
    const localErrors = [];

    students.forEach(stu => {
      subjects.forEach(sub => {
        const subjId = sub.subject_id != null ? sub.subject_id : sub.id;
        const key    = gradeKey(String(stu.id), String(subjId));

        const hasErr = cellErrorsRef.current[key] &&
          Object.keys(cellErrorsRef.current[key]).length > 0;
        if (hasErr) {
          localErrors.push({
            student_label: `${stu.user?.first_name ?? ""} ${stu.user?.last_name ?? ""}`.trim(),
            subject_label: sub.displayName,
            status: "error",
            message: "Erreur de validation locale — corrigez avant de sauvegarder.",
          });
          return;
        }
        if (!dirtySetRef.current.has(key)) return;
        const g = gradesMapRef.current[key];
        if (!g) return;
        const hasData = GRADE_FIELDS.some(f => g[f.key] != null);
        if (!hasData && !g.id) return;
        payload.push(buildPayload(g, termRef.current));
      });
    });

    if (!payload.length && !localErrors.length) {
      toast("info", "Aucune modification en attente.");
      return;
    }
    if (!payload.length) { setSaveResults(localErrors); setResultOpen(true); return; }

    setLoading(true);
    try {
      const data = await postData("/academics/grades/bulk_upsert/", payload);
      const results = Array.isArray(data?.results) ? data.results : [];

      setGradesMap(prev => {
        const copy = { ...prev };
        results.forEach(r => {
          if (r.status !== "error" && r.student_id && r.subject_id) {
            const k = gradeKey(String(r.student_id), String(r.subject_id));
            if (copy[k]) copy[k] = { ...copy[k], id: r.id || copy[k].id };
            dirtySetRef.current.delete(k);
          }
        });
        gradesMapRef.current = copy;
        return copy;
      });
      setDirtyMap({});

      setSaveResults([...localErrors, ...results]);
      setResultOpen(true);
      const created = data?.created ?? 0;
      const updated = data?.updated ?? 0;
      toast("success", `${created} créé${created!==1?"s":""}, ${updated} mis à jour.`);
    } catch (err) {
      if (err?.status === 423) {
        fetchTermStatus(classIdRef.current, termRef.current);
        toast("error", "Grille verrouillée — sauvegarde bloquée.");
      } else {
        toast("error", "Erreur lors de la sauvegarde globale.");
      }
    } finally { setLoading(false); }
  }, [students, subjects, fetchTermStatus]);

  /* ── Moyennes de classe par matière ── */
  const classAverages = useMemo(() => {
    const map = {};
    subjects.forEach(sub => {
      const subjId = sub.subject_id != null ? sub.subject_id : sub.id;
      const vals = students
        .map(stu => {
          const key = gradeKey(String(stu.id), String(subjId));
          const g   = gradesMap[key];
          if (!g) return null;
          return calcWeightedAvg(
            g.interrogation1, g.interrogation2, g.interrogation3,
            g.devoir1, g.devoir2,
          );
        })
        .filter(v => v != null);
      map[sub.id] = vals.length ? calcAvg(vals) : null;
    });
    return map;
  }, [gradesMap, students, subjects]);

  /* ── Status meta for current term ── */
  const statusMeta = termStatus ? (STATUS_META[termStatus.status] || STATUS_META.draft) : null;
  const headerGradient = isLocked
    ? "linear-gradient(135deg,#f59e0b,#f97316)"
    : `linear-gradient(135deg,${COL.from},${COL.to})`;
  const headerShadow = isLocked ? "0 6px 16px #f59e0b44" : `0 6px 16px ${COL.shadow}`;

  /* ══ RENDER ══ */
  return (
    <div style={{
      minHeight:"100vh", background:T.pageBg, transition:"background .3s",
      fontFamily:"'Plus Jakarta Sans', sans-serif", paddingBottom:80,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ═══ HEADER STICKY ═══ */}
      <div ref={headerRef} style={{
        position:"sticky", top:0, zIndex:50,
        background:T.headerBg, backdropFilter:"blur(18px)",
        borderBottom:`1px solid ${T.divider}`, transition:"all .3s",
      }}>
        <div style={{
          maxWidth:1600, margin:"0 auto", padding:"10px 20px",
          display:"flex", alignItems:"center", gap:12, flexWrap:"wrap",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:200 }}>
            <div style={{
              width:38, height:38, borderRadius:11, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background: headerGradient, boxShadow: headerShadow,
              transition:"all .3s",
            }}>
              {isLocked
                ? <FaLock  style={{ width:14,height:14,color:"#fff" }} />
                : <FaTable style={{ width:14,height:14,color:"#fff" }} />}
            </div>
            <div>
              <h1 style={{ fontSize:15, fontWeight:900, color:T.textPrimary, letterSpacing:"-0.02em" }}>
                Saisie des Notes
              </h1>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:1 }}>
                {statusMeta ? (
                  <span style={{
                    padding:"1px 7px", borderRadius:999, fontSize:9, fontWeight:800,
                    background: statusMeta.bg, color:statusMeta.color,
                    textTransform:"uppercase", letterSpacing:"0.06em",
                  }}>
                    {statusMeta.label}
                  </span>
                ) : (
                  <span style={{
                    padding:"1px 7px", borderRadius:999, fontSize:9, fontWeight:800,
                    background:`${COL.from}18`, color:COL.from,
                    textTransform:"uppercase", letterSpacing:"0.06em",
                  }}>
                    Grille interactive
                  </span>
                )}
                {pendingCount > 0 && !isLocked && (
                  <span style={{
                    padding:"1px 7px", borderRadius:999, fontSize:9, fontWeight:800,
                    background:"#f59e0b18", color:"#f59e0b",
                    animation:"pulse 2s ease-in-out infinite",
                  }}>
                    {pendingCount} modif{pendingCount>1?"s":""} en attente
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Classe select */}
          <div style={{ position:"relative" }}>
            <FaUserGraduate style={{
              position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
              width:11,height:11, color:T.textMuted, pointerEvents:"none", zIndex:1,
            }} />
            <select
              value={classId}
              onChange={e => setClassId(e.target.value)}
              style={{
                appearance:"none", paddingLeft:30, paddingRight:28,
                paddingTop:9, paddingBottom:9, fontSize:12, borderRadius:10,
                outline:"none", transition:"all .15s", minWidth:200,
                background:T.inputBg, color:classId?T.textPrimary:T.textMuted,
                border:`1.5px solid ${T.inputBorder}`, cursor:"pointer",
                fontFamily:"'Plus Jakarta Sans', sans-serif",
              }}
              onFocus={(e)  => { e.target.style.borderColor=COL.from; e.target.style.boxShadow=`0 0 0 3px ${COL.from}22`; }}
              onBlur={(e)   => { e.target.style.borderColor=T.inputBorder; e.target.style.boxShadow="none"; }}>
              <option value="">— Choisir une classe —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <FaChevronDown style={{
              position:"absolute", right:9, top:"50%", transform:"translateY(-50%)",
              width:8,height:8, color:T.textMuted, pointerEvents:"none",
            }} />
          </div>

          {/* Term buttons */}
          <div style={{
            display:"flex", background:T.inputBg, borderRadius:10, padding:3,
            border:`1.5px solid ${T.inputBorder}`,
          }}>
            {TERMS.map(({ v, color }) => {
              const active = term === v;
              return (
                <button key={v} onClick={() => setTerm(v)}
                  style={{
                    padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer",
                    fontSize:11, fontWeight:800, transition:"all .15s",
                    background: active ? color : "transparent",
                    color:      active ? "#fff" : T.textMuted,
                    boxShadow:  active ? `0 2px 8px ${color}44` : "none",
                    transform:  active ? "scale(1.04)" : "scale(1)",
                  }}>
                  {v}
                </button>
              );
            })}
          </div>

          <div style={{ width:1, height:28, background:T.divider }} />

          <button onClick={() => reloadClass(classId, term)} disabled={!classId || loading}
            style={{
              width:34, height:34, borderRadius:9, border:`1.5px solid ${T.cardBorder}`,
              background:"transparent", cursor:classId?"pointer":"not-allowed",
              display:"flex", alignItems:"center", justifyContent:"center",
              color:T.textMuted, transition:"all .15s", opacity:!classId?0.4:1,
            }}
            onMouseEnter={(e) => classId && (e.currentTarget.style.borderColor=COL.from, e.currentTarget.style.color=COL.from)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor=T.cardBorder, e.currentTarget.style.color=T.textMuted)}
            title="Recharger les données">
            <FaSyncAlt style={{ width:12,height:12 }} />
          </button>

          {/* Save All / Locked button */}
          {isLocked ? (
            <div style={{
              display:"flex", alignItems:"center", gap:7,
              padding:"9px 18px", borderRadius:10,
              fontSize:12, fontWeight:800, color:"#f59e0b",
              background:"#f59e0b18", border:"1.5px solid #f59e0b44",
            }}>
              <FaLock style={{ width:11,height:11 }} />
              Verrouillé
            </div>
          ) : (
            <button onClick={handleSaveAll}
              disabled={pendingCount === 0 || loading}
              style={{
                display:"flex", alignItems:"center", gap:7,
                padding:"9px 18px", borderRadius:10, border:"none", cursor:"pointer",
                fontSize:12, fontWeight:800, color:"#fff", transition:"all .2s",
                background: pendingCount === 0
                  ? T.textMuted
                  : `linear-gradient(135deg,${COL.from},${COL.to})`,
                boxShadow: pendingCount === 0 ? "none" : `0 4px 14px ${COL.shadow}`,
                opacity: pendingCount === 0 ? 0.5 : 1,
              }}>
              <FaSave style={{ width:11,height:11 }} />
              Sauvegarder tout
              {pendingCount > 0 && (
                <span style={{
                  background:"rgba(255,255,255,0.25)", borderRadius:999,
                  padding:"1px 7px", fontSize:10, fontWeight:900,
                }}>{pendingCount}</span>
              )}
            </button>
          )}

          <DarkToggle />
        </div>
      </div>

      {/* ═══ CONTENU ═══ */}
      <div style={{ maxWidth:1600, margin:"0 auto", padding:"16px 20px 0" }}>

        {/* Lock Banner */}
        <LockBanner termStatus={termStatus} />

        {subNote && (
          <div style={{
            display:"flex", alignItems:"center", gap:10,
            padding:"11px 16px", borderRadius:11, marginBottom:14,
            background:"#f59e0b10", border:"1.5px solid #f59e0b33",
          }}>
            <FaExclamationTriangle style={{ width:13,height:13,color:"#f59e0b",flexShrink:0 }} />
            <p style={{ fontSize:12, fontWeight:600, color:"#b45309" }}>{subNote}</p>
          </div>
        )}

        {!classId ? (
          <div style={{
            padding:"80px 24px", textAlign:"center",
            border:`2px dashed ${T.cardBorder}`, borderRadius:20, background:T.cardBg,
          }}>
            <div style={{
              width:64, height:64, borderRadius:18, margin:"0 auto 16px",
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`${COL.from}15`,
            }}>
              <FaTable style={{ width:26,height:26,color:COL.from,opacity:.5 }} />
            </div>
            <p style={{ fontSize:15, fontWeight:800, color:T.textPrimary }}>Sélectionnez une classe</p>
            <p style={{ fontSize:12, color:T.textMuted, marginTop:6 }}>
              Choisissez une classe dans la barre d'outils pour commencer la saisie des notes.
            </p>
          </div>

        ) : loading ? (
          <div style={{
            padding:"80px 24px", textAlign:"center",
            border:`2px dashed ${T.cardBorder}`, borderRadius:20, background:T.cardBg,
          }}>
            <FaSyncAlt style={{
              width:28,height:28,color:COL.from,margin:"0 auto 14px",
              animation:"spin 1s linear infinite", display:"block",
            }} />
            <p style={{ fontSize:12, color:T.textMuted, animation:"pulse 1.5s ease-in-out infinite" }}>
              Chargement de la grille…
            </p>
          </div>

        ) : students.length === 0 || subjects.length === 0 ? (
          <div style={{
            padding:"60px 24px", textAlign:"center",
            border:`2px dashed ${T.cardBorder}`, borderRadius:20, background:T.cardBg,
          }}>
            <FaExclamationTriangle style={{ width:22,height:22,color:"#f59e0b",margin:"0 auto 12px",display:"block" }} />
            <p style={{ fontSize:13, fontWeight:700, color:T.textSecondary }}>
              {students.length === 0 ? "Aucun élève inscrit dans cette classe"
               : "Aucune matière configurée pour cette classe"}
            </p>
          </div>

        ) : (
          <div style={{
            borderRadius:16, overflow:"hidden",
            background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
            boxShadow:T.cardShadow,
          }}>
            <div style={{
              display:"flex", alignItems:"center", justifyContent:"space-between",
              padding:"8px 16px", background:T.tableHead,
              borderBottom:`1px solid ${T.divider}`,
            }}>
              <div style={{ display:"flex", gap:16 }}>
                {[
                  { label:`${students.length} élève${students.length>1?"s":""}` },
                  { label:`${subjects.length} matière${subjects.length>1?"s":""}` },
                  { label:`Trimestre ${term}`, color:TERMS.find(t=>t.v===term)?.color },
                ].map(({ label, color }, i) => (
                  <p key={i} style={{
                    fontSize:10, fontWeight:700, color:color||T.textMuted,
                    textTransform:"uppercase", letterSpacing:"0.07em",
                  }}>{label}</p>
                ))}
              </div>
              {isLocked && (
                <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                  <FaLock style={{ width:9,height:9,color:"#f59e0b" }} />
                  <p style={{ fontSize:10, fontWeight:700, color:"#f59e0b" }}>
                    Saisie désactivée · {statusMeta?.label}
                  </p>
                </div>
              )}
              {!isLocked && pendingCount > 0 && (
                <p style={{
                  fontSize:10, fontWeight:700, color:"#f59e0b",
                  animation:"pulse 2s ease-in-out infinite",
                }}>
                  {pendingCount} cellule{pendingCount>1?"s":""} non sauvegardée{pendingCount>1?"s":""}
                </p>
              )}
            </div>

            <div style={{
              overflowX:"auto", overflowY:"auto",
              maxHeight:`calc(100vh - ${headerH + 120}px)`,
              scrollbarWidth:"thin", scrollbarColor:`${COL.from} transparent`,
            }}>
              <table style={{ borderCollapse:"collapse", minWidth:"max-content", width:"100%" }}>
                <thead>
                  <tr>
                    <th style={{
                      position:"sticky", left:0, top:0, zIndex:40,
                      background:T.tableHead, padding:0,
                      borderBottom:`2px solid ${T.divider}`,
                      borderRight:`1px solid ${T.divider}`,
                      minWidth:220, width:220,
                    }}>
                      <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{
                          width:26, height:26, borderRadius:7,
                          display:"flex", alignItems:"center", justifyContent:"center",
                          background:`${COL.from}18`,
                        }}>
                          <FaUserGraduate style={{ width:11,height:11,color:COL.from }} />
                        </div>
                        <div>
                          <p style={{ fontSize:11, fontWeight:800, color:T.textPrimary }}>Élève</p>
                          <p style={{ fontSize:9, color:T.textMuted }}>Nom & Prénom</p>
                        </div>
                      </div>
                    </th>
                    {subjects.map(sub => (
                      <th key={sub.id} style={{
                        position:"sticky", top:0, zIndex:30,
                        background:T.tableHead, padding:"10px 8px",
                        borderBottom:`2px solid ${T.divider}`,
                        borderRight:`1px solid ${T.divider}`,
                        minWidth:240, textAlign:"left", verticalAlign:"bottom",
                      }}>
                        <div style={{ display:"flex", alignItems:"flex-start", gap:6 }}>
                          <div style={{
                            width:3, height:"100%", minHeight:30, borderRadius:999, flexShrink:0,
                            background: isLocked
                              ? "linear-gradient(180deg,#f59e0b,#f97316)"
                              : `linear-gradient(180deg,${COL.from},${COL.to})`,
                            marginTop:2,
                          }} />
                          <div style={{ flex:1 }}>
                            <p style={{
                              fontSize:11, fontWeight:800, color:T.textPrimary,
                              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                              maxWidth:200,
                            }} title={sub.displayName}>{sub.displayName}</p>
                            {classAverages[sub.id] != null && (
                              <div style={{
                                display:"inline-flex", alignItems:"center", gap:4,
                                marginTop:3, padding:"1px 7px", borderRadius:999,
                                background:`${colorForGrade(classAverages[sub.id])||COL.from}18`,
                              }}>
                                <FaChartBar style={{ width:7,height:7,color:colorForGrade(classAverages[sub.id])||COL.from }} />
                                <span style={{
                                  fontSize:9, fontWeight:800,
                                  color:colorForGrade(classAverages[sub.id])||COL.from,
                                }}>
                                  Moy. {classAverages[sub.id]}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((stu, idx) => {
                    const studentName = `${stu.user?.first_name ?? ""} ${stu.user?.last_name ?? ""}`.trim() || `Élève #${stu.id}`;
                    const initials    = (stu.user?.first_name?.[0] ?? "?") + (stu.user?.last_name?.[0] ?? "");
                    const rowBg       = idx % 2 === 0 ? "transparent"
                      : (dark ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.012)");
                    return (
                      <tr key={stu.id} style={{ background:rowBg }}>
                        <td style={{
                          position:"sticky", left:0, zIndex:20,
                          background: dark
                            ? (idx%2===0?"#1e1e2e":"#1b1b2b")
                            : (idx%2===0?"#ffffff":"#fafafa"),
                          padding:"8px 14px",
                          borderBottom:`1px solid ${T.divider}`,
                          borderRight:`1px solid ${T.divider}`,
                          boxShadow:"4px 0 8px -4px rgba(0,0,0,0.08)",
                        }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <div style={{
                              width:32, height:32, borderRadius:9, flexShrink:0,
                              display:"flex", alignItems:"center", justifyContent:"center",
                              background: isLocked
                                ? "linear-gradient(135deg,#f59e0b,#f97316)"
                                : `linear-gradient(135deg,${COL.from},${COL.to})`,
                              fontSize:11, fontWeight:800, color:"#fff",
                              boxShadow: isLocked ? "0 2px 6px #f59e0b44" : `0 2px 6px ${COL.shadow}`,
                              transition:"all .3s",
                            }}>
                              {initials.toUpperCase()}
                            </div>
                            <div style={{ minWidth:0 }}>
                              <p style={{
                                fontSize:12, fontWeight:700, color:T.textPrimary,
                                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                                maxWidth:150,
                              }} title={studentName}>{studentName}</p>
                              <p style={{ fontSize:9, color:T.textMuted, fontFamily:"monospace" }}>
                                #{stu.id}
                              </p>
                            </div>
                          </div>
                        </td>
                        {subjects.map(sub => {
                          const subjId = sub.subject_id != null ? sub.subject_id : sub.id;
                          const key    = gradeKey(String(stu.id), String(subjId));
                          return (
                            <td key={sub.id} style={{
                              padding:"6px 6px",
                              borderBottom:`1px solid ${T.divider}`,
                              borderRight:`1px solid ${T.divider}`,
                              verticalAlign:"top",
                            }}>
                              <GradeCell
                                studentId={stu.id}
                                subjectId={subjId}
                                gradeData={gradesMap[key]}
                                errors={cellErrors[key]}
                                isDirty={!!dirtyMap[key]}
                                isSaving={!!savingMap[key]}
                                isLocked={isLocked}
                                onFieldChange={handleFieldChange}
                                onCellBlur={handleCellBlur}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <ResultModal open={resultOpen} onClose={() => setResultOpen(false)} results={saveResults} />
      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{BASE_KEYFRAMES}{`
        .animate-spin { animation: spin 1s linear infinite; }
        @keyframes spin    { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse   { 0%,100%{opacity:.6} 50%{opacity:1} }
      `}</style>
    </div>
  );
};

/* ── ROOT ── */
const GradeEntry = () => {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("scol360_dark") === "true"; } catch { return false; }
  });
  const toggle = useCallback(() => {
    setDark(v => {
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

export default GradeEntry;