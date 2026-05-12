// src/pages/Grades.jsx
/**
 * Gestion des Notes — Saisie et consultation individuelle
 *
 * Architecture :
 *   Année → Classe → Trimestre → Élève → Tableau matières × notes
 *
 * Règles strictes :
 *   • Aucun calcul client (averages = backend au lock)
 *   • bulk_upsert : seuls les champs TOUCHÉS sont envoyés → zéro écrasement
 *   • Années clôturées / trimestres verrouillés → lecture seule automatique
 *   • gradesIndex construit depuis la liste de la classe (pas de fetch par élève)
 */

import React, {
  useState, useEffect, useCallback, useMemo,
} from "react";
import {
  FaBookOpen, FaCheck, FaChevronDown, FaEdit, FaEye,
  FaGraduationCap, FaLayerGroup, FaLock, FaLockOpen,
  FaMoon, FaSave, FaSun, FaSyncAlt, FaTimes,
  FaExclamationTriangle, FaCheckCircle, FaHistory,
} from "react-icons/fa";
import { fetchData, postData } from "./api";
import {
  ThemeCtx, useTheme, LIGHT, DARK, SECTION_PALETTE, BASE_KEYFRAMES,
} from "./theme";

/* ─── Couleurs ───────────────────────────────────────────────────────────── */
const COL = SECTION_PALETTE?.academics ?? SECTION_PALETTE?.tool ?? {
  from: "#6366f1", to: "#8b5cf6", shadow: "#6366f133",
};

/* ─── Constantes ──────────────────────────────────────────────────────────── */
const NOTE_FIELDS = [
  { key: "interrogation1", label: "I₁", color: "#6366f1" },
  { key: "interrogation2", label: "I₂", color: "#6366f1" },
  { key: "interrogation3", label: "I₃", color: "#6366f1" },
  { key: "devoir1",        label: "D₁", color: "#f59e0b" },
  { key: "devoir2",        label: "D₂", color: "#f59e0b" },
];

const STATUS_META = {
  draft:     { label: "Brouillon",  color: "#6366f1", Icon: FaLockOpen },
  locked:    { label: "Verrouillé", color: "#f59e0b", Icon: FaLock     },
  published: { label: "Publié",     color: "#10b981", Icon: FaEye      },
};

/* ─── Utilitaires ────────────────────────────────────────────────────────── */
const gradeKey = (sid, subid) => `${String(sid)}::${String(subid)}`;

const clamp = (n) => Math.min(20, Math.max(0, Number(n)));

const toNum = (raw) => {
  if (raw === "" || raw === null || raw === undefined) return null;
  const n = parseFloat(String(raw).replace(",", "."));
  return Number.isNaN(n) ? null : clamp(n);
};

function gradeColor(v) {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return null;
  if (n >= 16) return "#10b981";
  if (n >= 12) return "#3b82f6";
  if (n >= 10) return "#f59e0b";
  return "#ef4444";
}

function buildQuery(params = {}) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

function handleApiError(err) {
  if ((err?.status ?? err?.statusCode) === 401) {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    } catch {}
    window.location.href = "/login";
  }
}

function extractErrorMsg(err) {
  const body = err?.body;
  if (!body) return "Erreur serveur.";
  if (typeof body === "string") return body;
  return body.detail
    || body.non_field_errors?.[0]
    || Object.entries(body)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join(" | ")
    || "Erreur inconnue.";
}

/* ─── DarkToggle ─────────────────────────────────────────────────────────── */
function DarkToggle() {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle}
      title={dark ? "Mode clair" : "Mode sombre"}
      style={{
        width: 46, height: 25, borderRadius: 13, border: "none",
        cursor: "pointer", position: "relative", flexShrink: 0,
        transition: "background .3s",
        background: dark
          ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
          : `linear-gradient(135deg,${COL.from},${COL.to})`,
      }}>
      <span style={{
        position: "absolute", top: 2.5,
        left: dark ? "calc(100% - 22px)" : 2.5,
        width: 20, height: 20, borderRadius: "50%",
        background: "#fff", display: "flex", alignItems: "center",
        justifyContent: "center", transition: "left .3s",
        boxShadow: "0 1px 4px rgba(0,0,0,.2)",
      }}>
        {dark
          ? <FaMoon style={{ width: 9, height: 9, color: "#6366f1" }} />
          : <FaSun  style={{ width: 9, height: 9, color: COL.from  }} />}
      </span>
    </button>
  );
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
function Toast({ msg, onClose, T }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [msg, onClose]);

  if (!msg) return null;
  const ok  = msg.type === "success";
  const col = ok ? "#10b981" : "#ef4444";
  const Icon = ok ? FaCheckCircle : FaExclamationTriangle;

  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 999,
      display: "flex", alignItems: "flex-start", gap: 10,
      padding: "14px 18px", borderRadius: 14,
      background: T.cardBg, border: `1.5px solid ${col}44`,
      boxShadow: `0 8px 28px ${col}22`,
      animation: "fadeUp .25s ease-out",
      maxWidth: 440,
    }}>
      <Icon style={{ color: col, width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
      <span style={{ fontSize: 13, fontWeight: 600, color: T.textPrimary, flex: 1,
        lineHeight: 1.45 }}>{msg.text}</span>
      <button onClick={onClose} style={{
        background: "none", border: "none", cursor: "pointer",
        color: T.textMuted, flexShrink: 0, padding: 2,
      }}>
        <FaTimes style={{ width: 10, height: 10 }} />
      </button>
    </div>
  );
}

/* ─── Select stylé ───────────────────────────────────────────────────────── */
function Sel({ value, onChange, disabled, children, T, accentColor }) {
  const ac = accentColor || COL.from;
  return (
    <div style={{ position: "relative" }}>
      <select value={value} onChange={onChange} disabled={disabled}
        style={{
          width: "100%", appearance: "none",
          paddingLeft: 12, paddingRight: 28,
          paddingTop: 8, paddingBottom: 8,
          fontSize: 13, fontWeight: 600, borderRadius: 10, outline: "none",
          background: T.inputBg,
          color: value ? T.textPrimary : T.textMuted,
          border: `1.5px solid ${T.inputBorder}`,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.55 : 1,
          transition: "border-color .15s",
        }}
        onFocus={e  => (e.target.style.borderColor = ac)}
        onBlur={e   => (e.target.style.borderColor = T.inputBorder)}>
        {children}
      </select>
      <FaChevronDown style={{
        position: "absolute", right: 9, top: "50%",
        transform: "translateY(-50%)",
        width: 9, height: 9, color: T.textMuted, pointerEvents: "none",
      }} />
    </div>
  );
}

/* ─── Input note ──────────────────────────────────────────────────────────── */
function NoteInput({ value, onChange, disabled, T }) {
  const n   = toNum(value);
  const col = n !== null ? gradeColor(n) : null;
  return (
    <input
      type="number" min={0} max={20} step={0.25}
      value={value ?? ""}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      style={{
        width: 58, textAlign: "center", fontSize: 12, fontWeight: 700,
        padding: "5px 3px", borderRadius: 8, outline: "none",
        background: disabled ? T.inputBg : T.cardBg,
        color: col || T.textPrimary,
        border: `1.5px solid ${col ? col + "66" : T.inputBorder}`,
        cursor: disabled ? "not-allowed" : "text",
        opacity: disabled ? 0.5 : 1,
        transition: "border-color .15s, color .15s",
      }}
      onFocus={e  => { if (!disabled) e.target.style.borderColor = COL.from; }}
      onBlur={e   => { e.target.style.borderColor = col ? col + "66" : T.inputBorder; }}
    />
  );
}

/* ─── Cellule lecture ─────────────────────────────────────────────────────── */
function ReadCell({ value, isAvg, T }) {
  const n   = (value !== null && value !== undefined && value !== "")
    ? parseFloat(String(value)) : null;
  const col = n !== null ? gradeColor(n) : null;
  return (
    <span style={{
      fontSize: isAvg ? 13 : 12, fontWeight: isAvg ? 900 : 500,
      color: col || T.textMuted,
      display: "inline-block",
      padding: isAvg ? "2px 9px" : 0,
      borderRadius: isAvg ? 7 : 0,
      background: isAvg && col ? `${col}14` : "transparent",
      minWidth: isAvg ? 50 : 36, textAlign: "center",
    }}>
      {n !== null ? String(n).replace(".", ",") : "—"}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════════════════════ */
function GradesInner() {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  /* ── Années scolaires ── */
  const [allYears,     setAllYears]     = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [loadingYears, setLoadingYears] = useState(true);
  const yearIsClosed = selectedYear?.is_closed ?? false;
  const nbTerms      = selectedYear?.nb_terms  ?? 3;

  /* ── Roster (classes + élèves) ── */
  const [roster,        setRoster]        = useState(null);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const classes = roster?.classes ?? [];

  /* ── Filtres ── */
  const [selectedClass,   setSelectedClass]   = useState("");
  const [selectedTerm,    setSelectedTerm]     = useState("T1");
  const [selectedStudent, setSelectedStudent] = useState("");

  const termOptions = useMemo(
    () => Array.from({ length: nbTerms }, (_, i) => `T${i + 1}`),
    [nbTerms]
  );

  /* ── Données de la classe ── */
  const [classSubjects,   setClassSubjects]   = useState([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  /* ── Notes de la classe ── */
  const [grades,        setGrades]        = useState([]);
  const [loadingGrades, setLoadingGrades] = useState(false);

  /* ── TermStatus ── */
  const [termStatus, setTermStatus] = useState(null);
  const isEditable = !yearIsClosed
    && termStatus?.status !== "locked"
    && termStatus?.status !== "published";

  /* ── Mode édition & éditions en attente ── */
  const [editMode,     setEditMode]     = useState(false);
  const [pendingEdits, setPendingEdits] = useState({});
  // { [subject_id]: { interrogation1: "14", interrogation2: "", ... } }
  // UNIQUEMENT les champs que l'utilisateur a TOUCHÉS

  /* ── Sauvegarde ── */
  const [savingRows, setSavingRows] = useState({});
  const [savingAll,  setSavingAll]  = useState(false);

  /* ── Toast ── */
  const [msg, setMsg] = useState(null);

  /* ── Dérivés ── */
  const students = useMemo(() => {
    if (!selectedClass) return [];
    return classes.find(c => String(c.id) === String(selectedClass))?.students ?? [];
  }, [classes, selectedClass]);

  const currentStudent = useMemo(
    () => students.find(s => String(s.id) === String(selectedStudent)) ?? null,
    [students, selectedStudent]
  );

  // Index des notes : gradeKey(student_id, subject_id) → Grade
  const gradesIndex = useMemo(() => {
    const idx = {};
    grades.forEach(g => {
      const sid   = g.student?.id ?? g.student_id ?? null;
      const subid = g.subject?.id ?? g.subject_id ?? null;
      if (sid != null && subid != null)
        idx[gradeKey(String(sid), String(subid))] = g;
    });
    return idx;
  }, [grades]);

  // Lignes : classSubject × grade pour l'élève courant
  const rows = useMemo(() => {
    if (!currentStudent) return [];
    return classSubjects.map(cs => {
      const subid = cs.subject?.id ?? cs.subject_id;
      return {
        cs,
        subjectId:   subid,
        subjectName: cs.subject?.name ?? `Matière #${subid}`,
        coefficient: cs.coefficient,
        grade: gradesIndex[gradeKey(String(currentStudent.id), String(subid))] ?? null,
      };
    });
  }, [classSubjects, gradesIndex, currentStudent]);

  // Nombre total de champs touchés
  const dirtyCount = useMemo(
    () => Object.values(pendingEdits).reduce((acc, f) => acc + Object.keys(f).length, 0),
    [pendingEdits]
  );

  /* ─────────────────── CHARGEMENTS ─────────────────────────────────────── */

  // 1. Années au montage
  useEffect(() => {
    (async () => {
      setLoadingYears(true);
      try {
        const data = await fetchData("/academics/school-years/");
        const arr  = (Array.isArray(data) ? data : data?.results ?? [])
          .sort((a, b) => b.label.localeCompare(a.label));
        setAllYears(arr);
        const active = arr.find(y => y.is_active && !y.is_closed) ?? arr[0] ?? null;
        setSelectedYear(active);
      } catch (err) { handleApiError(err); }
      finally { setLoadingYears(false); }
    })();
  }, []);

  // 2. Roster quand l'année change
  useEffect(() => {
    if (!selectedYear) { setRoster(null); return; }
    setRoster(null);
    setSelectedClass(""); setSelectedStudent("");
    setGrades([]); setTermStatus(null); setPendingEdits({}); setEditMode(false);
    setLoadingRoster(true);
    fetchData(`/academics/school-years/${selectedYear.id}/roster/`)
      .then(d => setRoster(d))
      .catch(handleApiError)
      .finally(() => setLoadingRoster(false));
  }, [selectedYear?.id]); // eslint-disable-line

  // 3. Matières de la classe
  useEffect(() => {
    if (!selectedClass) { setClassSubjects([]); return; }
    setLoadingSubjects(true);
    fetchData(`/academics/class-subjects/?school_class=${selectedClass}&no_pagination=1`)
      .then(d => {
        const arr = (Array.isArray(d) ? d : d?.results ?? []);
        arr.sort((a, b) =>
          (b.coefficient - a.coefficient) ||
          (a.subject?.name ?? "").localeCompare(b.subject?.name ?? "")
        );
        setClassSubjects(arr);
      })
      .catch(handleApiError)
      .finally(() => setLoadingSubjects(false));
  }, [selectedClass]);

  // 4. Notes de la classe + trimestre
  const fetchGrades = useCallback(async () => {
    if (!selectedClass || !selectedTerm || !selectedYear) { setGrades([]); return; }
    setLoadingGrades(true);
    try {
      const q = buildQuery({
        school_class: selectedClass,
        term:         selectedTerm,
        school_year:  selectedYear.id,
      });
      const d = await fetchData(`/academics/grades/${q}`);
      setGrades(Array.isArray(d) ? d : d?.results ?? []);
    } catch (err) {
      handleApiError(err);
      setGrades([]);
    } finally { setLoadingGrades(false); }
  }, [selectedClass, selectedTerm, selectedYear]);

  useEffect(() => { fetchGrades(); }, [fetchGrades]);

  // 5. TermStatus
  useEffect(() => {
    if (!selectedClass || !selectedTerm || !selectedYear) { setTermStatus(null); return; }
    const q = buildQuery({
      school_class: selectedClass,
      term:         selectedTerm,
      school_year:  selectedYear.id,
    });
    fetchData(`/academics/term-status/${q}`)
      .then(d => {
        const list = Array.isArray(d) ? d : d?.results ?? [];
        setTermStatus(list[0] ?? null);
      })
      .catch(() => setTermStatus(null));
  }, [selectedClass, selectedTerm, selectedYear]);

  // Désactiver édition si plus éditable
  useEffect(() => {
    if (!isEditable) setEditMode(false);
  }, [isEditable]);

  // Reset éditions quand contexte change
  useEffect(() => {
    setPendingEdits({});
    setEditMode(false);
  }, [selectedClass, selectedTerm, selectedStudent, selectedYear?.id]);

  /* ─────────────────── ÉDITIONS ────────────────────────────────────────── */

  const handleFieldChange = useCallback((subjectId, field, value) => {
    setPendingEdits(prev => ({
      ...prev,
      [String(subjectId)]: { ...(prev[String(subjectId)] ?? {}), [field]: value },
    }));
  }, []);

  // Valeur à afficher : édition en cours > valeur du grade backend
  const displayVal = useCallback((subjectId, field, grade) => {
    const sid   = String(subjectId);
    const edits = pendingEdits[sid];
    if (editMode && edits && field in edits) return edits[field];
    return grade?.[field] ?? "";
  }, [editMode, pendingEdits]);

  const hasEdits = useCallback(
    (subjectId) => Object.keys(pendingEdits[String(subjectId)] ?? {}).length > 0,
    [pendingEdits]
  );

  /* ─────────────────── SAUVEGARDE ──────────────────────────────────────── */

  /**
   * buildPayload — même logique que GradesBulkEntry.
   * N'inclut QUE les champs touchés (pendingEdits) dans le payload.
   * Les champs absents du payload ne sont PAS mis à jour par bulk_upsert
   * → aucun écrasement de valeur existante non modifiée.
   */
  const buildPayload = useCallback((subjectId, grade) => {
    const line = {
      ...(grade?.id ? { id: grade.id } : {}),
      student_id: String(currentStudent.id),
      subject_id: Number(subjectId),
      term:       selectedTerm,
    };
    const edits = pendingEdits[String(subjectId)] ?? {};
    NOTE_FIELDS.forEach(({ key }) => {
      if (key in edits) {
        // null envoyé si champ volontairement vidé → backend met à null
        line[key] = toNum(edits[key]);
      }
      // Champs non touchés → absents du payload → inchangés en base
    });
    return line;
  }, [currentStudent, pendingEdits, selectedTerm]);

  const saveRow = useCallback(async (subjectId, grade) => {
    if (!currentStudent) return;
    const edits = pendingEdits[String(subjectId)] ?? {};
    if (!Object.keys(edits).length && !grade?.id) {
      setMsg({ type: "error", text: "Saisissez au moins une note avant d'enregistrer." });
      return;
    }
    if (!Object.keys(edits).length) {
      setMsg({ type: "error", text: "Aucune modification pour cette matière." });
      return;
    }
    setSavingRows(s => ({ ...s, [String(subjectId)]: true }));
    try {
      const payload = buildPayload(subjectId, grade);
      const data    = await postData("/academics/grades/bulk_upsert/", [payload]);
      const result  = (Array.isArray(data?.results) ? data.results : [])[0];
      if (result?.status === "error") {
        const e = result.errors;
        setMsg({ type: "error", text: typeof e === "string" ? e : JSON.stringify(e) });
      } else {
        setMsg({ type: "success", text: `Note ${result?.status === "created" ? "enregistrée" : "mise à jour"}.` });
        setPendingEdits(prev => { const n = { ...prev }; delete n[String(subjectId)]; return n; });
        await fetchGrades();
      }
    } catch (err) {
      handleApiError(err);
      setMsg({ type: "error", text: extractErrorMsg(err) });
    } finally {
      setSavingRows(s => ({ ...s, [String(subjectId)]: false }));
    }
  }, [buildPayload, currentStudent, fetchGrades, pendingEdits]);

  const saveAll = useCallback(async () => {
    if (!currentStudent) return;
    const toSave = Object.keys(pendingEdits)
      .filter(sid => Object.keys(pendingEdits[sid]).length > 0);
    if (!toSave.length) {
      setMsg({ type: "error", text: "Aucune modification à enregistrer." });
      return;
    }
    setSavingAll(true);
    try {
      const batch = toSave.map(sid => {
        const grade = gradesIndex[gradeKey(String(currentStudent.id), sid)] ?? null;
        return buildPayload(sid, grade);
      });
      const data    = await postData("/academics/grades/bulk_upsert/", batch);
      const results = Array.isArray(data?.results) ? data.results : [];
      const errs    = results.filter(r => r.status === "error");
      if (errs.length) {
        setMsg({ type: "error", text: `${errs.length} erreur(s) : ${errs.map(e => JSON.stringify(e.errors)).join(" | ")}` });
      } else {
        const created = results.filter(r => r.status === "created").length;
        const updated = results.filter(r => r.status === "updated").length;
        setMsg({ type: "success", text: `${created + updated} note(s) sauvegardée(s) (${created} créée${created > 1 ? "s" : ""}, ${updated} mise${updated > 1 ? "s" : ""} à jour).` });
        setPendingEdits({});
        await fetchGrades();
      }
    } return (
    <div style={{
      position:"fixed", inset:0, zIndex:250,
      background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:16, animation:"fadeIn .15s ease-out",
    }}>
      <div style={{
        width:"100%", maxWidth:380, background:T.cardBg, borderRadius:18,
        boxShadow:"0 24px 60px rgba(0,0,0,.35)",
        border:`1.5px solid ${T.cardBorder}`,
        animation:"panelUp .2s cubic-bezier(.34,1.4,.64,1)",
        overflow:"hidden",
      }}>
        <div style={{ height:4, background:"linear-gradient(90deg,#ef4444,#dc2626)" }} />
        <div style={{ padding:"20px 20px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{
              width:34, height:34, borderRadius:10, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center", background:"#ef444418",
            }}>
              <FaExclamationCircle style={{ width:15,height:15,color:"#ef4444" }} />
            </div>
            <p style={{ fontSize:14, fontWeight:800, color:T.textPrimary }}>{title}</p>
          </div>
          <p style={{ fontSize:12, color:T.textSecondary, lineHeight:1.6, paddingLeft:44 }}>
            {message}
          </p>
        </div>
        <div style={{
          padding:"12px 20px", borderTop:`1px solid ${T.divider}`,
          display:"flex", justifyContent:"flex-end", gap:8,
        }}>
          <button onClick={onCancel} style={{
            padding:"8px 16px", borderRadius:9, border:`1.5px solid ${T.cardBorder}`,
            background:"transparent", cursor:"pointer", fontSize:12, fontWeight:700,
            color:T.textSecondary, fontFamily:"'Plus Jakarta Sans', sans-serif",
          }}>Annuler</button>
          <button onClick={onConfirm} style={{
            padding:"8px 18px", borderRadius:9, border:"none", cursor:"pointer",
            fontSize:12, fontWeight:800, color:"#fff",
            background:"linear-gradient(135deg,#ef4444,#dc2626)",
            boxShadow:"0 4px 12px #ef444444",
            fontFamily:"'Plus Jakarta Sans', sans-serif",
          }}>Supprimer</button>
        </div>
      </div>
    </div>
  );
};

/* ── LOCK BANNER ── */
const LockBanner = ({ termStatus }) => {
  const { dark } = useTheme();
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
          Trimestre {meta.label.toLowerCase()} — ajouts et modifications désactivés
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

/* ── STYLED SELECT ── */
const Sel = ({ icon: Icon, children, value, onChange, disabled }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      {Icon && (
        <span style={{
          position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
          pointerEvents:"none", zIndex:1,
          color: focused ? COL.from : T.textMuted, transition:"color .15s",
        }}>
          <Icon style={{ width:12,height:12 }} />
        </span>
      )}
      <select value={value} onChange={onChange} disabled={disabled}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width:"100%", appearance:"none",
          paddingLeft: Icon ? 30 : 12, paddingRight:12,
          paddingTop:8, paddingBottom:8,
          fontSize:12, borderRadius:10, outline:"none", transition:"all .15s",
          background:T.inputBg, color: value ? T.textPrimary : T.textMuted,
          border:`1.5px solid ${focused ? COL.from : T.inputBorder}`,
          boxShadow: focused ? `0 0 0 3px ${COL.from}22` : "none",
          fontFamily:"'Plus Jakarta Sans', sans-serif",
          opacity: disabled ? 0.5 : 1, cursor: disabled ? "not-allowed" : "pointer",
        }}>
        {children}
      </select>
    </div>
  );
};

/* ── GRADE INPUT ── */
const GradeInput = ({ label, accent, value, onChange }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [focused, setFocused] = useState(false);
  const hasError = value !== "" && value !== null && value !== undefined
    && (isNaN(parseFloat(value)) || parseFloat(value) < 0 || parseFloat(value) > 20);
  return (
    <div style={{ textAlign:"center" }}>
      <p style={{
        fontSize:9, fontWeight:800, textTransform:"uppercase",
        letterSpacing:"0.08em", color: accent || T.textMuted, marginBottom:4,
      }}>{label}</p>
      <input
        type="text" inputMode="decimal" pattern="[0-9.]*"
        value={value ?? ""} placeholder="—"
        onChange={onChange}
        onWheel={(e) => e.currentTarget.blur()}
        onFocus={(e) => { setFocused(true); e.currentTarget.select(); }}
        onBlur={() => setFocused(false)}
        style={{
          width:"100%", textAlign:"center", boxSizing:"border-box",
          padding:"8px 4px", fontSize:14, fontWeight:700, borderRadius:8, outline:"none",
          background: hasError ? (dark?"rgba(239,68,68,0.12)":"#fef2f2") : T.inputBg,
          color: hasError ? "#ef4444" : T.textPrimary,
          border:`1.5px solid ${hasError?"#ef4444":focused?(accent||COL.from):T.inputBorder}`,
          boxShadow: focused && !hasError ? `0 0 0 3px ${(accent||COL.from)}22` : "none",
          transition:"all .15s", fontFamily:"'Plus Jakarta Sans', sans-serif",
        }}
      />
    </div>
  );
};

/* ── GRADE BADGE ── */
const GradeBadge = ({ label, value, accent }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const num = parseFloat(value);
  const hasVal = !isNaN(num) && value !== "" && value !== null && value !== undefined;
  let bg, color, border;
  if (!hasVal) { bg = T.inputBg; color = T.textMuted; border = T.divider; }
  else if (num < 10) { bg = dark?"rgba(239,68,68,0.12)":"#fef2f2"; color="#ef4444"; border="#fecaca"; }
  else if (num >= 16) { bg = dark?"rgba(16,185,129,0.12)":"#ecfdf5"; color=COL.from; border=`${COL.from}55`; }
  else { bg = T.cardBg; color = T.textPrimary; border = T.cardBorder; }
  return (
    <div style={{ textAlign:"center" }}>
      <p style={{ fontSize:8, fontWeight:800, textTransform:"uppercase",
        letterSpacing:"0.07em", color: accent || T.textMuted, marginBottom:3 }}>{label}</p>
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

/* ── GRADE CARD ── */
const GradeCard = ({ grade, onEdit, onDelete, animDelay, isLocked }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [hov, setHov] = useState(false);
  const avg = parseFloat(grade.average_subject);
  const hasAvg = !isNaN(avg);
  const passing = hasAvg && avg >= 10;
  const termColor = TERM_COLORS[grade.term] || TERM_COLORS.T1;
  const gradientPair = avatarGradient(`${grade.student_firstname||""}${grade.student_lastname||""}`);
  const [avatarFrom, avatarTo] = Array.isArray(gradientPair) ? gradientPair : ["#6366f1","#8b5cf6"];

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
      <div style={{ height:3, background:`linear-gradient(90deg,${termColor.from},${termColor.to})` }} />

      <div style={{ padding:"12px 14px 8px", display:"flex", alignItems:"flex-start", gap:10 }}>
        <div style={{
          width:36, height:36, borderRadius:10, flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:13, fontWeight:900, color:"#fff",
          background:`linear-gradient(135deg,${avatarFrom},${avatarTo})`,
          boxShadow:`0 3px 8px ${avatarFrom}44`,
        }}>
          {((grade.student_firstname || "?")[0] || "?").toUpperCase()}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontSize:13, fontWeight:800, color:T.textPrimary, lineHeight:1.2,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {grade.student_firstname} {grade.student_lastname}
          </p>
          <p style={{ fontSize:10, color:T.textMuted, marginTop:2, fontWeight:600,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {grade.student_class && <span>{grade.student_class} · </span>}
            {grade.subject_name}
          </p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          {isLocked && <FaLock style={{ width:9,height:9,color:"#f59e0b" }} />}
          <span style={{
            flexShrink:0, padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:800,
            background:`linear-gradient(135deg,${termColor.from}22,${termColor.to}11)`,
            color:termColor.from, border:`1px solid ${termColor.from}44`,
          }}>{grade.term}</span>
        </div>
      </div>

      <div style={{
        padding:"10px 14px",
        background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)",
        borderTop:`1px solid ${T.divider}`, borderBottom:`1px solid ${T.divider}`,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, justifyContent:"center" }}>
          <div style={{ display:"flex", gap:5 }}>
            <GradeBadge label="I.1" value={grade.interrogation1} accent="#6366f1" />
            <GradeBadge label="I.2" value={grade.interrogation2} accent="#6366f1" />
            <GradeBadge label="I.3" value={grade.interrogation3} accent="#6366f1" />
          </div>
          <div style={{ width:1, height:44, background:T.divider, flexShrink:0 }} />
          <div style={{ display:"flex", gap:5 }}>
            <GradeBadge label="D.1" value={grade.devoir1} accent="#f97316" />
            <GradeBadge label="D.2" value={grade.devoir2} accent="#f97316" />
          </div>
        </div>
      </div>

      <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
            letterSpacing:"0.07em", color:T.textMuted, marginBottom:2 }}>Moyenne</p>
          <div style={{ display:"flex", alignItems:"baseline", gap:4 }}>
            <span style={{
              fontSize:22, fontWeight:900, lineHeight:1,
              color: !hasAvg ? T.textMuted : passing ? COL.from : "#ef4444",
            }}>
              {hasAvg ? avg.toFixed(2) : "—"}
            </span>
            {hasAvg && <span style={{ fontSize:10, color:T.textMuted }}>/20</span>}
          </div>
        </div>

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
              {passing ? "Validé" : "En dessous du seuil"}
            </p>
          </div>
        )}

        <div style={{
          display:"flex", gap:4,
          opacity: isLocked ? 0.25 : (hov ? 1 : 0.3),
          transition:"opacity .15s",
        }}>
          <button
            onClick={() => onEdit(grade)}
            disabled={isLocked}
            style={{
              width:30, height:30, borderRadius:8, border:"none",
              cursor: isLocked ? "not-allowed" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              background: dark?"#2a1a06":"#fffbeb", color:"#f59e0b", transition:"background .12s",
            }}
            onMouseEnter={(e) => !isLocked && (e.currentTarget.style.background="#f59e0b22")}
            onMouseLeave={(e) => !isLocked && (e.currentTarget.style.background=dark?"#2a1a06":"#fffbeb")}>
            <FaEdit style={{ width:11,height:11 }} />
          </button>
          <button
            onClick={() => onDelete(grade.id)}
            disabled={isLocked}
            style={{
              width:30, height:30, borderRadius:8, border:"none",
              cursor: isLocked ? "not-allowed" : "pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              background: dark?"#2a0a0a":"#fef2f2", color:"#ef4444", transition:"background .12s",
            }}
            onMouseEnter={(e) => !isLocked && (e.currentTarget.style.background="#ef444422")}
            onMouseLeave={(e) => !isLocked && (e.currentTarget.style.background=dark?"#2a0a0a":"#fef2f2")}>
            <FaTrash style={{ width:11,height:11 }} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── PAGE PRINCIPALE ── */
const GradesInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(1200);
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([entry]) => setContainerW(entry.contentRect.width));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);
  const isNarrow = containerW < 860;

  const [classes,         setClasses]         = useState([]);
  const [subjects,        setSubjects]        = useState([]);
  const [students,        setStudents]        = useState([]);
  const [filters,         setFilters]         = useState({ school_class:"", student:"", subject:"", term:"" });

  // Notes existantes de l'élève sélectionné pour la classe + trimestre en cours
  // { [subject_id]: Grade } — mis à jour à chaque changement d'élève/classe/terme
  const [studentGradesMap,  setStudentGradesMap]  = useState({});
  const [loadingStudentGrades, setLoadingStudentGrades] = useState(false);
  const [search,          setSearch]          = useState("");
  const [grades,          setGrades]          = useState([]);
  const [loadingGrades,   setLoadingGrades]   = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingRefs,     setLoadingRefs]     = useState(true);
  const [termStatus,      setTermStatus]      = useState(null);

  const EMPTY_FORM = { id:null, student_id:"", subject_id:"", term:"T1",
    interrogation1:"", interrogation2:"", interrogation3:"", devoir1:"", devoir2:"" };
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);
  const [confirm, setConfirm] = useState({ open:false, id:null });

  const isLocked = termStatus?.status === "locked" || termStatus?.status === "published";
  const hasClassAndTerm = !!filters.school_class && !!filters.term;
  const statusMeta = termStatus ? (STATUS_META[termStatus.status] || STATUS_META.draft) : null;

  /* ── fetchTermStatus ── */
  const fetchTermStatus = useCallback(async (cls, term) => {
    if (!cls || !term) { setTermStatus(null); return; }
    try {
      const data = await fetchData(`/academics/term-status/?school_class=${cls}&term=${term}`);
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      setTermStatus(list.length ? list[0] : null);
    } catch { setTermStatus(null); }
  }, []);

  useEffect(() => {
    fetchTermStatus(filters.school_class, filters.term);
  }, [filters.school_class, filters.term, fetchTermStatus]);

  /* ── Chargement classes + matières ── */
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
      finally  { setLoadingRefs(false); }
    })();
  }, []);

  /* ── Élèves selon classe ── */
  useEffect(() => {
    const cls = filters.school_class;
    setStudents([]);
    setFilters((p) => p.student === "" ? p : { ...p, student:"" });
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
        school_class: f.school_class || undefined,
        student_id:   f.student      || undefined,
        subject:      f.subject      || undefined,
        term:         f.term         || undefined,
        student_name: search.trim()  || undefined,
      });
      const data = await fetchData(`/academics/grades/${q}`);
      setGrades(Array.isArray(data) ? data : (data?.results ?? []));
    } catch (err) {
      if (err?.status === 423) {
        fetchTermStatus(filters.school_class, filters.term);
        setMsg({ type:"error", text:"Ce trimestre est verrouillé." });
      } else {
        setMsg({ type:"error", text:"Erreur lors de la récupération des notes." });
      }
    } finally { setLoadingGrades(false); }
  }, [filters, search, fetchTermStatus]);

  // Fetch déclenché sur changement de classe ET trimestre (garde interne dans fetchGrades)
  useEffect(() => { fetchGrades(); }, [filters.school_class, filters.term]); // eslint-disable-line

  /* ── Charge les notes existantes de l'élève sélectionné ── */
  const fetchStudentGrades = useCallback(async (studentId, classId, term) => {
    if (!studentId || !classId || !term) {
      setStudentGradesMap({});
      return;
    }
    setLoadingStudentGrades(true);
    try {
      const q = buildQuery({ student_id: studentId, school_class: classId, term });
      const data = await fetchData(`/academics/grades/${q}`);
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      const map = {};
      list.forEach(g => {
        const sid = g.subject?.id ?? g.subject_id;
        if (sid != null) map[String(sid)] = g;
      });
      setStudentGradesMap(map);
    } catch {
      setStudentGradesMap({});
    } finally {
      setLoadingStudentGrades(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentGrades(filters.student, filters.school_class, filters.term);
  }, [filters.student, filters.school_class, filters.term, fetchStudentGrades]);

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (isLocked) {
      setMsg({ type:"error", text:"Ce trimestre est verrouillé — modifications impossibles." });
      return;
    }
    if (!form.student_id || !form.subject_id) {
      setMsg({ type:"error", text:"Veuillez sélectionner un élève et une matière." });
      return;
    }
    setSaving(true);

    const toNum = (v) => (v === "" || v === null || v === undefined) ? null : Number(v);

    // Récupérer le grade existant pour cet élève/matière (chargé au préalable)
    const existingGrade = studentGradesMap[String(form.subject_id)] ?? null;

    // Payload bulk_upsert — on fusionne les valeurs existantes avec les nouvelles.
    // Si le formulaire a été pré-rempli, les champs non modifiés conservent leur valeur.
    // Si id est fourni, bulk_upsert met à jour uniquement les champs inclus dans le payload.
    const line = {
      ...(existingGrade?.id ? { id: existingGrade.id } : {}),
      student_id: form.student_id,         // PK entier résolu via slug_field="id"
      subject_id: parseInt(form.subject_id, 10),
      term:       form.term || filters.term || "T1",
      interrogation1: toNum(form.interrogation1),
      interrogation2: toNum(form.interrogation2),
      interrogation3: toNum(form.interrogation3),
      devoir1:        toNum(form.devoir1),
      devoir2:        toNum(form.devoir2),
    };

    try {
      const result = await postData("/academics/grades/bulk_upsert/", [line]);
      const first  = result?.results?.[0];
      if (first?.status === "error") {
        setMsg({ type:"error", text: typeof first.errors === "string"
          ? first.errors
          : JSON.stringify(first.errors) });
      } else {
        const op = first?.status === "created" ? "créée" : "mise à jour";
        setMsg({ type:"success", text:`Note ${op} avec succès.` });
        setForm(EMPTY_FORM);
        // Rafraîchir la carte de l'élève et la liste globale
        await Promise.all([
          fetchStudentGrades(filters.student, filters.school_class, filters.term),
          fetchGrades(),
        ]);
      }
    } catch (err) {
      if (err?.status === 423) {
        fetchTermStatus(filters.school_class, filters.term);
        setMsg({ type:"error", text:"Ce trimestre est verrouillé — opération refusée." });
      } else {
        const body   = err?.body;
        const detail = typeof body === "string"
          ? body
          : body?.detail
            || body?.non_field_errors?.[0]
            || (body ? Object.entries(body).map(([k,v]) =>
                `${k}: ${Array.isArray(v) ? v.join(", ") : v}`
              ).join(" | ") : null)
            || "Erreur lors de l'enregistrement.";
        setMsg({ type:"error", text: detail });
      }
    } finally { setSaving(false); }
  };

  /* ── Edit ── */
  const handleEdit = (g) => {
    if (isLocked) {
      setMsg({ type:"error", text:"Ce trimestre est verrouillé — modification impossible." });
      return;
    }
    setForm({
      id:g.id, student_id:g.student_id, subject_id:g.subject_id, term:g.term||"T1",
      interrogation1:g.interrogation1??"", interrogation2:g.interrogation2??"",
      interrogation3:g.interrogation3??"", devoir1:g.devoir1??"", devoir2:g.devoir2??"",
    });
    if (g.student_class_id && String(filters.school_class) !== String(g.student_class_id))
      setFilters((p) => ({ ...p, school_class: String(g.student_class_id) }));
    window.scrollTo({ top:0, behavior:"smooth" });
  };

  /* ── Delete ── */
  const handleDeleteRequest = (id) => {
    if (isLocked) {
      setMsg({ type:"error", text:"Ce trimestre est verrouillé — suppression impossible." });
      return;
    }
    setConfirm({ open:true, id });
  };
  const handleDeleteConfirm = async () => {
    const id = confirm.id;
    setConfirm({ open:false, id:null });
    try {
      await deleteData(`/academics/grades/${id}/`);
      setMsg({ type:"success", text:"Note supprimée." });
      await fetchGrades();
    } catch (err) {
      if (err?.status === 423) {
        fetchTermStatus(filters.school_class, filters.term);
        setMsg({ type:"error", text:"Ce trimestre est verrouillé." });
      } else {
        setMsg({ type:"error", text:"Impossible de supprimer cette note." });
      }
    }
  };

  const setF = (k, v) => setFilters((p) => ({ ...p, [k]: v }));
  const isEditing = !!form.id;

  const stats = useMemo(() => {
    if (!grades.length) return null;
    const avgs = grades.map((g) => parseFloat(g.average_subject)).filter((n) => !isNaN(n));
    if (!avgs.length) return null;
    const mean    = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    const passing = avgs.filter((n) => n >= 10).length;
    return { mean: mean.toFixed(2), passing, total: avgs.length };
  }, [grades]);

  /* ══ RENDER ══ */
  return (
    <div style={{
      minHeight:"100vh", background:T.pageBg, transition:"background .3s",
      fontFamily:"'Plus Jakarta Sans', sans-serif", paddingBottom:60,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* HEADER */}
      <header style={{
        position:"sticky", top:0, zIndex:40,
        background:T.headerBg, backdropFilter:"blur(16px)",
        borderBottom:`1px solid ${T.divider}`, transition:"all .3s",
      }}>
        <div style={{
          maxWidth:1200, margin:"0 auto", padding:"12px 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap",
        }}>
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
              <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                <p style={{ fontSize:11, color:T.textMuted }}>
                  Saisie, consultation et suivi des évaluations par trimestre
                </p>
                {hasClassAndTerm && statusMeta && (
                  <span style={{
                    display:"inline-flex", alignItems:"center", gap:4,
                    padding:"1px 8px", borderRadius:999, fontSize:9, fontWeight:800,
                    background: statusMeta.bg, color:statusMeta.color,
                    textTransform:"uppercase", letterSpacing:"0.06em",
                  }}>
                    <statusMeta.Icon style={{ width:8,height:8 }} />
                    {statusMeta.label}
                  </span>
                )}
              </div>
            </div>
          </div>
          <DarkToggle />
        </div>
      </header>

      <main ref={containerRef} style={{ maxWidth:1200, margin:"0 auto", padding:"20px 24px 0" }}>

        {/* Lock Banner */}
        {hasClassAndTerm && <LockBanner termStatus={termStatus} />}

        {/* FILTRES */}
        <div style={{
          borderRadius:16, padding:"14px 18px", marginBottom:16,
          background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, boxShadow:T.cardShadow,
        }}>
          <div style={{
            display:"grid",
            gridTemplateColumns: isNarrow ? "1fr 1fr" : "1fr 1fr 1fr 1fr 160px 100px",
            gap:10, alignItems:"end",
          }}>
            {/* Recherche */}
            <div>
              <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>Recherche</p>
              <div style={{ position:"relative" }}>
                <FaSearch style={{
                  position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
                  width:11, height:11, color:T.textMuted, pointerEvents:"none",
                }} />
                <input placeholder="Nom de l'élève…" value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key==="Enter" && fetchGrades()}
                  style={{
                    width:"100%", boxSizing:"border-box",
                    paddingLeft:30, paddingRight:12, paddingTop:8, paddingBottom:8,
                    fontSize:12, borderRadius:10, outline:"none",
                    background:T.inputBg, color:T.textPrimary,
                    border:`1.5px solid ${T.inputBorder}`, transition:"all .15s",
                    fontFamily:"'Plus Jakarta Sans', sans-serif",
                  }}
                  onFocus={(e) => { e.target.style.borderColor=COL.from; e.target.style.boxShadow=`0 0 0 3px ${COL.from}22`; }}
                  onBlur={(e)  => { e.target.style.borderColor=T.inputBorder; e.target.style.boxShadow="none"; }}
                />
              </div>
            </div>
            <div>
              <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>Classe</p>
              <Sel icon={FaLayerGroup} value={filters.school_class}
                onChange={(e) => setF("school_class", e.target.value)}>
                <option value="">Toutes les classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Sel>
            </div>
            <div>
              <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>
                Élève {loadingStudents && (
                  <span style={{ color:COL.from, display:"inline-block", animation:"spin 1s linear infinite" }}>↻</span>
                )}
              </p>
              <Sel icon={FaUserGraduate} value={filters.student}
                onChange={(e) => setF("student", e.target.value)}
                disabled={!filters.school_class && students.length===0}>
                <option value="">
                  {filters.school_class
                    ? (loadingStudents ? "Chargement…" : "Tous les élèves")
                    : "Choisir une classe"}
                </option>
                {students.map((s) => <option key={s.id} value={s.id}>{studentLabel(s)}</option>)}
              </Sel>
            </div>
            <div>
              <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>Matière</p>
              <Sel icon={FaBookOpen} value={filters.subject}
                onChange={(e) => setF("subject", e.target.value)}>
                <option value="">Toutes les matières</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Sel>
            </div>
            <div>
              <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>Trimestre</p>
              <Sel value={filters.term} onChange={(e) => setF("term", e.target.value)}>
                <option value="">Tous</option>
                {TERMS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </Sel>
            </div>
            <button onClick={() => fetchGrades()} style={{
              display:"flex", alignItems:"center", justifyContent:"center", gap:7,
              padding:"9px 14px", borderRadius:10, border:"none", cursor:"pointer",
              fontSize:12, fontWeight:800, color:"#fff",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 4px 12px ${COL.shadow}`,
            }}>
              <FaSearch style={{ width:11,height:11 }} /> Filtrer
            </button>
          </div>
        </div>

        {/* STATS */}
        {stats && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
            {[
              { label:"Notes affichées",  val:grades.length,  sub:"résultats", color:COL.from },
              { label:"Moyenne générale", val:stats.mean,     sub:"sur 20",    color:parseFloat(stats.mean)>=10?COL.from:"#ef4444" },
              { label:"Taux de réussite",
                val:`${Math.round(stats.passing/stats.total*100)}%`,
                sub:`${stats.passing}/${stats.total} élèves`, color:COL.from },
            ].map(({ label, val, sub, color }, i) => (
              <div key={i} style={{
                borderRadius:14, padding:"12px 16px",
                background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, boxShadow:T.cardShadow,
                animation:`fadeUp .3s ease-out ${i*60}ms both`,
              }}>
                <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.08em", color:T.textMuted, marginBottom:4 }}>{label}</p>
                <p style={{ fontSize:22, fontWeight:900, color, lineHeight:1 }}>{val}</p>
                <p style={{ fontSize:10, color:T.textMuted, marginTop:2 }}>{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* LAYOUT FORM + RÉSULTATS */}
        <div style={{
          display:"grid",
          gridTemplateColumns: isNarrow ? "1fr" : "300px 1fr",
          gap:16, alignItems:"start",
        }}>
          {/* FORMULAIRE */}
          <div style={{
            borderRadius:16, overflow:"hidden",
            position: isNarrow ? "relative" : "sticky", top:76,
            background:T.cardBg,
            border:`1.5px solid ${isLocked ? "#f59e0b55" : isEditing ? "#f59e0b88" : T.cardBorder}`,
            boxShadow: isLocked ? "0 4px 20px #f59e0b18" : isEditing ? "0 4px 20px #f59e0b22" : T.cardShadow,
            transition:"border-color .3s, box-shadow .3s",
          }}>
            <div style={{
              height:4, transition:"background .3s",
              background: isLocked
                ? "linear-gradient(90deg,#f59e0b,#f97316)"
                : isEditing
                  ? "linear-gradient(90deg,#f59e0b,#f97316)"
                  : `linear-gradient(90deg,${COL.from},${COL.to})`,
            }} />

            <div style={{
              padding:"12px 16px", borderBottom:`1px solid ${T.divider}`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              background: isLocked
                ? (dark?"rgba(245,158,11,0.06)":"#fffbf0")
                : isEditing ? (dark?"rgba(245,158,11,0.08)":"#fffbeb") : "transparent",
              transition:"background .3s",
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{
                  width:30, height:30, borderRadius:8, flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background: isLocked
                    ? "linear-gradient(135deg,#f59e0b,#f97316)"
                    : isEditing
                      ? "linear-gradient(135deg,#f59e0b,#f97316)"
                      : `linear-gradient(135deg,${COL.from},${COL.to})`,
                  boxShadow: (isLocked || isEditing) ? "0 3px 8px #f59e0b44" : `0 3px 8px ${COL.shadow}`,
                }}>
                  {isLocked ? <FaLock style={{ width:12,height:12,color:"#fff" }} />
                    : isEditing ? <FaEdit style={{ width:12,height:12,color:"#fff" }} />
                    : <FaPlus style={{ width:12,height:12,color:"#fff" }} />}
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:800, color:T.textPrimary }}>
                    {isLocked ? "Trimestre verrouillé" : isEditing ? "Modifier la note" : "Nouvelle saisie"}
                  </p>
                  {/* Badge indiquant que des notes existantes ont été chargées */}
                  {!isLocked && form.id && (
                    <p style={{ fontSize:9, color:"#f59e0b", fontWeight:700, marginTop:1 }}>
                      ✦ Notes existantes pré-chargées — modifiez puis enregistrez
                    </p>
                  )}
                  {!isLocked && !form.id && form.student_id && form.subject_id && loadingStudentGrades && (
                    <p style={{ fontSize:9, color:T.textMuted, marginTop:1 }}>
                      Chargement des notes existantes…
                    </p>
                  )}
                </div>
              </div>
              {isEditing && !isLocked && (
                <button onClick={() => setForm(EMPTY_FORM)} style={{
                  display:"flex", alignItems:"center", gap:5, padding:"4px 9px", borderRadius:7,
                  border:`1px solid #f59e0b44`, background:"transparent",
                  cursor:"pointer", fontSize:10, fontWeight:700, color:"#f59e0b",
                }}>
                  <FaEraser style={{ width:9,height:9 }} /> Annuler
                </button>
              )}
            </div>

            <div style={{
              padding:"14px 16px", display:"flex", flexDirection:"column", gap:12,
              opacity: isLocked ? 0.6 : 1,
              pointerEvents: isLocked ? "none" : "auto",
              transition:"opacity .3s",
            }}>
              <div>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:T.textMuted, marginBottom:4 }}>
                  Classe <span style={{ fontWeight:400, textTransform:"none" }}>(pour filtrer les élèves)</span>
                </p>
                <Sel icon={FaLayerGroup} value={filters.school_class}
                  onChange={(e) => setF("school_class", e.target.value)}>
                  <option value="">— Sélectionner une classe —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Sel>
              </div>
              <div>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:T.textMuted, marginBottom:4 }}>Élève *</p>
                <Sel icon={FaUserGraduate} value={form.student_id}
                  onChange={(e) => {
                    const sid = e.target.value;
                    const existing = sid && form.subject_id
                      ? studentGradesMap[String(form.subject_id)]
                      : null;
                    setForm((p) => ({
                      ...p,
                      student_id: sid,
                      id:              existing?.id ?? null,
                      interrogation1:  existing?.interrogation1 ?? "",
                      interrogation2:  existing?.interrogation2 ?? "",
                      interrogation3:  existing?.interrogation3 ?? "",
                      devoir1:         existing?.devoir1 ?? "",
                      devoir2:         existing?.devoir2 ?? "",
                    }));
                  }}
                  disabled={students.length===0}>
                  <option value="">
                    {filters.school_class
                      ? (loadingStudents ? "Chargement…"
                          : students.length===0 ? "Aucun élève" : "— Sélectionner —")
                      : "Choisissez une classe"}
                  </option>
                  {students.map((s) => <option key={s.id} value={s.id}>{studentLabel(s)}</option>)}
                </Sel>
              </div>
              <div>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:T.textMuted, marginBottom:4 }}>Matière *</p>
                <Sel icon={FaBookOpen} value={form.subject_id}
                  onChange={(e) => {
                    const subId = e.target.value;
                    const existing = subId && form.student_id
                      ? studentGradesMap[String(subId)]
                      : null;
                    setForm((p) => ({
                      ...p,
                      subject_id: subId,
                      id:              existing?.id ?? null,
                      interrogation1:  existing?.interrogation1 ?? "",
                      interrogation2:  existing?.interrogation2 ?? "",
                      interrogation3:  existing?.interrogation3 ?? "",
                      devoir1:         existing?.devoir1 ?? "",
                      devoir2:         existing?.devoir2 ?? "",
                    }));
                  }}>
                  <option value="">— Sélectionner —</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Sel>
              </div>
              <div>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:T.textMuted, marginBottom:6 }}>Trimestre</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                  {TERMS.map(({ v }) => {
                    const tc = TERM_COLORS[v];
                    const active = form.term === v;
                    return (
                      <button key={v} type="button" onClick={() => setForm((p) => ({ ...p, term: v }))}
                        style={{
                          padding:"7px 4px", borderRadius:9, border:"none", cursor:"pointer",
                          fontSize:11, fontWeight:800, transition:"all .15s",
                          background: active ? `linear-gradient(135deg,${tc.from},${tc.to})` : (dark?"rgba(255,255,255,.05)":"#f8fafc"),
                          color: active ? "#fff" : T.textMuted,
                          boxShadow: active ? `0 3px 10px ${tc.from}55` : "none",
                          transform: active ? "translateY(-1px)" : "none",
                        }}>{v}</button>
                    );
                  })}
                </div>
              </div>

              <div style={{ height:1, background:T.divider }} />

              <div>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:"#6366f1", marginBottom:6 }}>
                  Interrogations <span style={{ fontWeight:500, color:T.textMuted }}>(coef. 1)</span>
                </p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
                  {["interrogation1","interrogation2","interrogation3"].map((field, i) => (
                    <GradeInput key={field} label={`Int. ${i+1}`} accent="#6366f1"
                      value={form[field]}
                      onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))} />
                  ))}
                </div>
              </div>

              <div>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:"#f97316", marginBottom:6 }}>
                  Devoirs <span style={{ fontWeight:500, color:T.textMuted }}>(coef. 2)</span>
                </p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {["devoir1","devoir2"].map((field, i) => (
                    <GradeInput key={field} label={`Dev. ${i+1}`} accent="#f97316"
                      value={form[field]}
                      onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))} />
                  ))}
                </div>
              </div>

              {/* Submit */}
              {isLocked ? (
                <div style={{
                  marginTop:4, width:"100%", display:"flex", alignItems:"center",
                  justifyContent:"center", gap:8, padding:"11px 16px",
                  borderRadius:12, fontSize:13, fontWeight:800, color:"#f59e0b",
                  background:"#f59e0b18", border:"1.5px solid #f59e0b33",
                }}>
                  <FaLock style={{ width:13,height:13 }} /> Verrouillé
                </div>
              ) : (
                <button onClick={handleSubmit} disabled={saving} style={{
                  marginTop:4, width:"100%", display:"flex", alignItems:"center",
                  justifyContent:"center", gap:8, padding:"11px 16px",
                  borderRadius:12, border:"none", cursor: saving ? "not-allowed" : "pointer",
                  fontSize:13, fontWeight:800, color:"#fff", transition:"all .2s",
                  background: saving ? T.textMuted : isEditing
                    ? "linear-gradient(135deg,#f59e0b,#f97316)"
                    : `linear-gradient(135deg,${COL.from},${COL.to})`,
                  boxShadow: saving ? "none" : isEditing ? "0 4px 16px #f59e0b44" : `0 4px 16px ${COL.shadow}`,
                }}>
                  {saving
                    ? <FaSyncAlt style={{ width:13,height:13, animation:"spin 1s linear infinite" }} />
                    : <FaSave style={{ width:13,height:13 }} />}
                  {saving ? "Enregistrement…" : isEditing ? "Mettre à jour" : "Enregistrer la note"}
                </button>
              )}
            </div>
          </div>

          {/* RÉSULTATS */}
          <div>
            {loadingGrades ? (
              <div style={{ display:"grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap:12 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{
                    height:160, borderRadius:16,
                    background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
                    animation:"pulse 1.5s ease-in-out infinite",
                  }} />
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
                <p style={{ fontSize:16, fontWeight:800, color:T.textSecondary }}>Aucune note trouvée</p>
                <p style={{ fontSize:12, color:T.textMuted, marginTop:6 }}>
                  Ajustez les filtres ou saisissez une nouvelle note via le formulaire.
                </p>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns: isNarrow ? "1fr" : "1fr 1fr", gap:12 }}>
                {grades.map((g, i) => (
                  <GradeCard key={g.id} grade={g}
                    onEdit={handleEdit}
                    onDelete={handleDeleteRequest}
                    animDelay={i * 30}
                    isLocked={isLocked} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={confirm.open}
        title="Supprimer cette note ?"
        message="Cette action est irréversible. La note sera définitivement supprimée."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirm({ open:false, id:null })}
      />

      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{BASE_KEYFRAMES}{`
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.25} }
      `}</style>
    </div>
  );
};

/* ROOT */
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
