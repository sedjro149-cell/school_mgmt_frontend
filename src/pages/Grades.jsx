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
<<<<<<< HEAD
  FaEdit, FaTrash, FaSearch, FaBookOpen,
  FaUserGraduate, FaLayerGroup, FaSave,
  FaEraser, FaCheck, FaSyncAlt, FaPlus,
  FaExclamationTriangle, FaExclamationCircle,
  FaMoon, FaSun, FaTimes,
  FaLock, FaLockOpen, FaEye,
  FaHistory, FaChevronDown,
} from "react-icons/fa";
import { fetchData, postData, deleteData } from "./api";
=======
  FaBookOpen, FaCheck, FaChevronDown, FaEdit, FaEye,
  FaGraduationCap, FaLayerGroup, FaLock, FaLockOpen,
  FaMoon, FaSave, FaSun, FaSyncAlt, FaTimes,
  FaExclamationTriangle, FaCheckCircle, FaHistory,
} from "react-icons/fa";
import { fetchData, postData } from "./api";
>>>>>>> 0651b6fcdfb1f0a61f31e86f4b8a8ee474f27232
import {
  ThemeCtx, useTheme, LIGHT, DARK, SECTION_PALETTE, BASE_KEYFRAMES,
} from "./theme";

<<<<<<< HEAD
/* ─── Palette ────────────────────────────────────────────────────────────── */
const COL = SECTION_PALETTE.finance ?? SECTION_PALETTE.tool ?? {
  from: "#10b981", to: "#059669", shadow: "#10b98133",
};

/* ─── Constantes ─────────────────────────────────────────────────────────── */
const TERM_COLORS = {
  T1: { from: "#3b82f6", to: "#06b6d4", shadow: "#3b82f633" },
  T2: { from: "#10b981", to: "#14b8a6", shadow: "#10b98133" },
  T3: { from: "#f59e0b", to: "#f97316", shadow: "#f59e0b33" },
};
const STATUS_META = {
  draft:     { label: "Brouillon",  color: "#6366f1", bg: "#6366f115", Icon: FaLockOpen },
  locked:    { label: "Verrouillé", color: "#f59e0b", bg: "#f59e0b15", Icon: FaLock     },
  published: { label: "Publié",     color: "#10b981", bg: "#10b98115", Icon: FaEye      },
};
const NOTE_FIELDS = [
  { key: "interrogation1", label: "Interro 1", short: "I1", accent: "#6366f1" },
  { key: "interrogation2", label: "Interro 2", short: "I2", accent: "#6366f1" },
  { key: "interrogation3", label: "Interro 3", short: "I3", accent: "#6366f1" },
  { key: "devoir1",        label: "Devoir 1",  short: "D1", accent: "#f97316" },
  { key: "devoir2",        label: "Devoir 2",  short: "D2", accent: "#f97316" },
];
const EMPTY_FORM = {
  id: null, student_id: "", subject_id: "", term: "T1",
  interrogation1: "", interrogation2: "", interrogation3: "",
  devoir1: "", devoir2: "",
};

/* ─── Utilitaires ────────────────────────────────────────────────────────── */
function buildQuery(obj = {}) {
  const p = Object.entries(obj)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return p.length ? `?${p.join("&")}` : "";
}

function studentLabel(s) {
  if (!s) return "—";
  const fn = s.user?.first_name  ?? s.first_name  ?? "";
  const ln = s.user?.last_name   ?? s.last_name   ?? "";
  return `${ln} ${fn}`.trim() || s.username || `Élève #${s.id}`;
}

function gradeColor(n) {
  if (isNaN(n)) return null;
  if (n >= 16) return "#10b981";
  if (n >= 12) return "#3b82f6";
  if (n >= 10) return "#f59e0b";
  return "#ef4444";
}

function handleApiError(err) {
  if ((err?.status ?? err?.statusCode) === 401) {
    try { localStorage.removeItem("access_token"); } catch {}
    window.location.href = "/login";
  }
}

function extractErrorMsg(err) {
  if (!err) return "Erreur inconnue.";
  const body = err?.body;
  if (!body) return err?.message ?? "Erreur serveur.";
  if (typeof body === "string") return body;
  return body.detail
    ?? body.non_field_errors?.[0]
    ?? Object.entries(body)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
        .join(" | ")
    ?? "Erreur inconnue.";
=======
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
>>>>>>> 0651b6fcdfb1f0a61f31e86f4b8a8ee474f27232
}

/* ─── DarkToggle ─────────────────────────────────────────────────────────── */
function DarkToggle() {
  const { dark, toggle } = useTheme();
  return (
<<<<<<< HEAD
    <button onClick={toggle} title={dark ? "Mode clair" : "Mode sombre"}
      style={{
        position: "relative", width: 50, height: 26, borderRadius: 999,
        border: "none", cursor: "pointer", flexShrink: 0, outline: "none",
=======
    <button onClick={toggle}
      title={dark ? "Mode clair" : "Mode sombre"}
      style={{
        width: 46, height: 25, borderRadius: 13, border: "none",
        cursor: "pointer", position: "relative", flexShrink: 0,
>>>>>>> 0651b6fcdfb1f0a61f31e86f4b8a8ee474f27232
        transition: "background .3s",
        background: dark
          ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
          : `linear-gradient(135deg,${COL.from},${COL.to})`,
<<<<<<< HEAD
        boxShadow: `0 2px 8px rgba(0,0,0,.2)`,
      }}>
      <span style={{
        position: "absolute", top: 2,
        left: dark ? "calc(100% - 24px)" : 2,
        width: 22, height: 22, borderRadius: "50%",
        background: "#fff", display: "flex", alignItems: "center",
        justifyContent: "center", transition: "left .3s",
        boxShadow: "0 2px 5px rgba(0,0,0,.22)",
      }}>
        {dark
          ? <FaMoon style={{ width: 10, height: 10, color: "#6366f1" }} />
          : <FaSun  style={{ width: 10, height: 10, color: COL.from  }} />}
=======
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
>>>>>>> 0651b6fcdfb1f0a61f31e86f4b8a8ee474f27232
      </span>
    </button>
  );
}

/* ─── Toast ──────────────────────────────────────────────────────────────── */
<<<<<<< HEAD
function Toast({ msg, onClose }) {
=======
function Toast({ msg, onClose, T }) {
>>>>>>> 0651b6fcdfb1f0a61f31e86f4b8a8ee474f27232
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
<<<<<<< HEAD
    <div onClick={onClose} style={{
      position: "fixed", bottom: 24, right: 24, zIndex: 300,
      display: "flex", alignItems: "center", gap: 10,
      padding: "12px 18px", borderRadius: 14,
      cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#fff",
      animation: "slideUp .3s cubic-bezier(.34,1.56,.64,1)", maxWidth: 380,
      background: isErr
        ? "linear-gradient(135deg,#ef4444,#dc2626)"
        : `linear-gradient(135deg,${COL.from},${COL.to})`,
      boxShadow: isErr ? "0 8px 24px #ef444444" : `0 8px 24px ${COL.shadow}`,
    }}>
      {isErr
        ? <FaExclamationTriangle style={{ width: 13, height: 13, flexShrink: 0 }} />
        : <FaCheck               style={{ width: 13, height: 13, flexShrink: 0 }} />}
      {msg.text}
=======
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
>>>>>>> 0651b6fcdfb1f0a61f31e86f4b8a8ee474f27232
    </div>
  );
}

<<<<<<< HEAD
/* ─── ConfirmDialog ──────────────────────────────────────────────────────── */
function ConfirmDialog({ open, onConfirm, onCancel }) {
  const { dark } = useTheme(); const T = dark ? DARK : LIGHT;
=======
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
>>>>>>> 0651b6fcdfb1f0a61f31e86f4b8a8ee474f27232
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
      position: "fixed", inset: 0, zIndex: 250,
      background: "rgba(0,0,0,.55)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 16, animation: "fadeIn .15s ease-out",
    }}>
      <div style={{
        width: "100%", maxWidth: 360, background: T.cardBg, borderRadius: 18,
        border: `1.5px solid ${T.cardBorder}`,
        boxShadow: "0 24px 60px rgba(0,0,0,.3)",
        animation: "panelUp .2s cubic-bezier(.34,1.4,.64,1)", overflow: "hidden",
      }}>
        <div style={{ height: 4, background: "linear-gradient(90deg,#ef4444,#dc2626)" }} />
        <div style={{ padding: "20px 20px 14px" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "#ef444415",
            }}>
              <FaExclamationCircle style={{ width: 14, height: 14, color: "#ef4444" }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 800, color: T.textPrimary }}>
                Supprimer cette note ?
              </p>
              <p style={{ fontSize: 12, color: T.textSecondary, marginTop: 4, lineHeight: 1.5 }}>
                Cette action est irréversible.
              </p>
            </div>
          </div>
        </div>
        <div style={{
          padding: "12px 20px", borderTop: `1px solid ${T.divider}`,
          display: "flex", justifyContent: "flex-end", gap: 8,
        }}>
          <button onClick={onCancel} style={{
            padding: "8px 16px", borderRadius: 9,
            border: `1.5px solid ${T.cardBorder}`, background: "transparent",
            cursor: "pointer", fontSize: 12, fontWeight: 700, color: T.textSecondary,
          }}>Annuler</button>
          <button onClick={onConfirm} style={{
            padding: "8px 18px", borderRadius: 9, border: "none",
            cursor: "pointer", fontSize: 12, fontWeight: 800, color: "#fff",
            background: "linear-gradient(135deg,#ef4444,#dc2626)",
            boxShadow: "0 4px 12px #ef444433",
          }}>Supprimer</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Styled Select ──────────────────────────────────────────────────────── */
function Sel({ icon: Icon, children, value, onChange, disabled, T }) {
  const [foc, setFoc] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      {Icon && (
        <Icon style={{
          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
          width: 12, height: 12, color: foc ? COL.from : T.textMuted,
          pointerEvents: "none", zIndex: 1, transition: "color .15s",
        }} />
      )}
      <select value={value} onChange={onChange} disabled={disabled}
        onFocus={() => setFoc(true)} onBlur={() => setFoc(false)}
        style={{
          width: "100%", appearance: "none",
          paddingLeft: Icon ? 30 : 12, paddingRight: 26, paddingTop: 9, paddingBottom: 9,
          fontSize: 12, fontWeight: 600, borderRadius: 10, outline: "none",
          background: T.inputBg, color: value ? T.textPrimary : T.textMuted,
          border: `1.5px solid ${foc ? COL.from : T.inputBorder}`,
          boxShadow: foc ? `0 0 0 3px ${COL.from}20` : "none",
          cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1,
          transition: "all .15s",
        }}>
        {children}
      </select>
      <FaChevronDown style={{
        position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
        width: 9, height: 9, color: T.textMuted, pointerEvents: "none",
      }} />
    </div>
  );
}

/* ─── Grade Input ────────────────────────────────────────────────────────── */
function GradeInput({ label, accent, value, onChange, disabled }) {
  const { dark } = useTheme(); const T = dark ? DARK : LIGHT;
  const [foc, setFoc] = useState(false);
  const n    = parseFloat(String(value).replace(",", "."));
  const err  = value !== "" && value !== null && !isNaN(n) && (n < 0 || n > 20);
  const col  = !isNaN(n) && value !== "" ? gradeColor(n) : null;
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{
        fontSize: 9, fontWeight: 800, textTransform: "uppercase",
        letterSpacing: ".08em", color: accent || T.textMuted, marginBottom: 4,
      }}>{label}</p>
      <input
        type="text" inputMode="decimal" value={value ?? ""} placeholder="—"
        onChange={onChange} disabled={disabled}
        onFocus={e => { setFoc(true); e.target.select(); }}
        onBlur={() => setFoc(false)}
        style={{
          width: "100%", textAlign: "center", boxSizing: "border-box",
          padding: "8px 4px", fontSize: 15, fontWeight: 800, borderRadius: 9,
          outline: "none", transition: "all .15s",
          background: err ? "#fef2f2" : (foc ? T.cardBg : T.inputBg),
          color: err ? "#ef4444" : (col || T.textPrimary),
          border: `1.5px solid ${err ? "#ef4444" : (foc ? (accent || COL.from) : T.inputBorder)}`,
          boxShadow: foc && !err ? `0 0 0 3px ${(accent || COL.from)}20` : "none",
          cursor: disabled ? "not-allowed" : "text",
          opacity: disabled ? .5 : 1,
        }}
      />
    </div>
  );
}

/* ─── Grade Badge (lecture) ──────────────────────────────────────────────── */
function GradeBadge({ label, value, accent, T }) {
  const n = parseFloat(value);
  const v = !isNaN(n) && value !== "" && value !== null && value !== undefined;
  const col = v ? gradeColor(n) : null;
  return (
    <div style={{ textAlign: "center", minWidth: 36 }}>
      <p style={{
        fontSize: 8, fontWeight: 800, textTransform: "uppercase",
        letterSpacing: ".07em", color: accent || T.textMuted, marginBottom: 3,
      }}>{label}</p>
      <div style={{
        height: 32, display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 8, fontSize: 13, fontWeight: 800,
        background: v ? (col ? `${col}14` : T.cardBg) : T.inputBg,
        color: v ? (col || T.textPrimary) : T.textMuted,
        border: `1.5px solid ${v ? (col ? `${col}44` : T.cardBorder) : T.divider}`,
        padding: "0 6px",
      }}>
        {v ? n : "—"}
      </div>
    </div>
  );
}

/* ─── Grade Card ─────────────────────────────────────────────────────────── */
function GradeCard({ grade, onEdit, onDelete, animDelay, isLocked, T, dark }) {
  const [hov, setHov] = useState(false);
  const avg     = parseFloat(grade.average_subject);
  const hasAvg  = !isNaN(avg);
  const passing = hasAvg && avg >= 10;
  const tc      = TERM_COLORS[grade.term] ?? TERM_COLORS.T1;
  const gp      = avatarGradient(`${grade.student_firstname ?? ""}${grade.student_lastname ?? ""}`);
  const [af, at] = Array.isArray(gp) ? gp : [COL.from, COL.to];

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 16, overflow: "hidden",
        background: T.cardBg,
        border: `1.5px solid ${hov ? `${COL.from}66` : T.cardBorder}`,
        boxShadow: hov ? T.cardShadowHov : T.cardShadow,
        transform: hov ? "translateY(-2px)" : "translateY(0)",
        transition: "all .2s",
        animation: `fadeUp .3s ease-out ${animDelay ?? 0}ms both`,
        display: "flex", flexDirection: "column",
      }}>
      <div style={{ height: 3, background: `linear-gradient(90deg,${tc.from},${tc.to})` }} />

      {/* Header carte */}
      <div style={{ padding: "12px 14px 10px", display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 900, color: "#fff",
          background: `linear-gradient(135deg,${af},${at})`,
          boxShadow: `0 3px 8px ${af}44`,
        }}>
          {((grade.student_firstname || "?")[0] || "?").toUpperCase()}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            fontSize: 13, fontWeight: 800, color: T.textPrimary,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {grade.student_lastname} {grade.student_firstname}
          </p>
          <p style={{
            fontSize: 10, color: T.textMuted, marginTop: 1, fontWeight: 500,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {grade.subject_name}
            {grade.student_class && (
              <span style={{ opacity: .7 }}> · {grade.student_class}</span>
            )}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          {isLocked && <FaLock style={{ width: 8, height: 8, color: "#f59e0b" }} />}
          <span style={{
            padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 800,
            background: `${tc.from}18`, color: tc.from,
            border: `1px solid ${tc.from}33`,
          }}>{grade.term}</span>
        </div>
      </div>

      {/* Notes */}
      <div style={{
        padding: "10px 14px",
        background: dark ? "rgba(255,255,255,.025)" : "rgba(0,0,0,.018)",
        borderTop: `1px solid ${T.divider}`, borderBottom: `1px solid ${T.divider}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <div style={{ display: "flex", gap: 4 }}>
            {["interrogation1", "interrogation2", "interrogation3"].map((f, i) => (
              <GradeBadge key={f} label={`I${i + 1}`} value={grade[f]} accent="#6366f1" T={T} />
            ))}
          </div>
          <div style={{ width: 1, height: 40, background: T.divider, flexShrink: 0 }} />
          <div style={{ display: "flex", gap: 4 }}>
            {["devoir1", "devoir2"].map((f, i) => (
              <GradeBadge key={f} label={`D${i + 1}`} value={grade[f]} accent="#f97316" T={T} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer : moyenne + actions */}
      <div style={{
        padding: "10px 14px", display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 10,
      }}>
        <div>
          <p style={{
            fontSize: 9, fontWeight: 800, textTransform: "uppercase",
            letterSpacing: ".07em", color: T.textMuted, marginBottom: 2,
          }}>Moyenne mat.</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
            <span style={{
              fontSize: 22, fontWeight: 900, lineHeight: 1,
              color: !hasAvg ? T.textMuted : passing ? COL.from : "#ef4444",
            }}>
              {hasAvg ? avg.toFixed(2) : "—"}
            </span>
            {hasAvg && <span style={{ fontSize: 10, color: T.textMuted }}>/20</span>}
          </div>
        </div>

        {hasAvg && (
          <div style={{ flex: 1, maxWidth: 100 }}>
            <div style={{
              height: 5, borderRadius: 999, overflow: "hidden",
              background: dark ? "rgba(255,255,255,.07)" : "#f1f5f9",
            }}>
              <div style={{
                width: `${Math.min(100, avg / 20 * 100)}%`, height: "100%",
                borderRadius: 999, transition: "width .4s ease-out",
                background: passing
                  ? `linear-gradient(90deg,${COL.from},${COL.to})`
                  : "linear-gradient(90deg,#ef4444,#f97316)",
              }} />
            </div>
            <p style={{ fontSize: 9, color: T.textMuted, marginTop: 3, textAlign: "center" }}>
              {passing ? "✓ Validé" : "✗ Insuffisant"}
            </p>
          </div>
        )}

        <div style={{
          display: "flex", gap: 4,
          opacity: isLocked ? .2 : (hov ? 1 : .35),
          transition: "opacity .15s",
        }}>
          <button onClick={() => onEdit(grade)} disabled={isLocked} title="Modifier"
            style={{
              width: 30, height: 30, borderRadius: 8, border: "none",
              cursor: isLocked ? "not-allowed" : "pointer",
              background: dark ? "#2a1a06" : "#fffbeb", color: "#f59e0b",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <FaEdit style={{ width: 11, height: 11 }} />
          </button>
          <button onClick={() => onDelete(grade.id)} disabled={isLocked} title="Supprimer"
            style={{
              width: 30, height: 30, borderRadius: 8, border: "none",
              cursor: isLocked ? "not-allowed" : "pointer",
              background: dark ? "#2a0a0a" : "#fef2f2", color: "#ef4444",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
            <FaTrash style={{ width: 11, height: 11 }} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════════════════════ */
function GradesInner() {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  const containerRef = useRef(null);
  const [cw, setCw] = useState(1200);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setCw(e.contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);
  const narrow = cw < 860;

  /* ── Années ── */
  const [allYears,     setAllYears]     = useState([]);
  const [selectedYear, setSelectedYear] = useState(null);
  const [loadingYears, setLoadingYears] = useState(true);
  const yearIsClosed = selectedYear?.is_closed ?? false;

  /* ── Données de référence ── */
  const [classes,        setClasses]        = useState([]);
  const [subjects,       setSubjects]       = useState([]);
  const [students,       setStudents]       = useState([]);
  const [loadingStudents,setLoadingStudents] = useState(false);
  const [loadingRefs,    setLoadingRefs]    = useState(true);

  /* ── Filtres (query params envoyés tels quels au backend) ── */
  const [filters, setFilters] = useState({
    school_class: "", student: "", subject: "", term: "",
  });
  const [search, setSearch] = useState("");
  const setF = (k, v) => setFilters(p => ({ ...p, [k]: v }));

  /* ── Notes ── */
  const [grades,       setGrades]       = useState([]);
  const [loadingGrades,setLoadingGrades] = useState(false);

  /* ── TermStatus ── */
  const [termStatus, setTermStatus] = useState(null);
  const isLocked = termStatus?.status === "locked" || termStatus?.status === "published";
  const statusMeta = termStatus ? (STATUS_META[termStatus.status] ?? STATUS_META.draft) : null;

  /* ── Formulaire ── */
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [panelMode, setPanelMode] = useState("read"); // "read" | "edit"
  const [saving,    setSaving]    = useState(false);
  const [confirm,   setConfirm]   = useState({ open: false, id: null });
  const [msg,       setMsg]       = useState(null);
  const isEditing = !!form.id;

  // Grade existant correspondant aux sélections du panneau
  const currentGrade = useMemo(() => {
    if (!form.student_id || !form.subject_id || !form.term) return null;
    return grades.find(g =>
      String(g.student_id)  === String(form.student_id) &&
      String(g.subject_id)  === String(form.subject_id) &&
      g.term                === form.term
    ) ?? null;
  }, [grades, form.student_id, form.subject_id, form.term]);

  // Quand currentGrade change → pré-remplir le formulaire + passer en lecture
  useEffect(() => {
    if (!currentGrade) return;
    setForm(prev => ({
      ...prev,
      id:             currentGrade.id,
      interrogation1: currentGrade.interrogation1 ?? "",
      interrogation2: currentGrade.interrogation2 ?? "",
      interrogation3: currentGrade.interrogation3 ?? "",
      devoir1:        currentGrade.devoir1        ?? "",
      devoir2:        currentGrade.devoir2        ?? "",
    }));
    setPanelMode("read");
  }, [currentGrade?.id]); // eslint-disable-line

  // Si on change élève/matière/trimestre → reset mode
  useEffect(() => {
    setPanelMode("read");
  }, [form.student_id, form.subject_id, form.term]);

  /* ── Stats ── */
  const stats = useMemo(() => {
    const avgs = grades.map(g => parseFloat(g.average_subject)).filter(n => !isNaN(n));
    if (!avgs.length) return null;
    const mean    = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    const passing = avgs.filter(n => n >= 10).length;
    return { mean: mean.toFixed(2), passing, total: avgs.length };
  }, [grades]);

  /* ─────────────────────── CHARGEMENTS ─────────────────────────────────── */

  // 1. Années au montage
  useEffect(() => {
    (async () => {
      setLoadingYears(true);
      try {
        const d   = await fetchData("/academics/school-years/");
        const arr = (Array.isArray(d) ? d : d?.results ?? [])
          .sort((a, b) => b.label.localeCompare(a.label));
        setAllYears(arr);
        setSelectedYear(arr.find(y => y.is_active && !y.is_closed) ?? arr[0] ?? null);
      } catch (e) { handleApiError(e); }
      finally { setLoadingYears(false); }
    })();
  }, []);

  // 2. Classes + matières au montage
  useEffect(() => {
    setLoadingRefs(true);
    Promise.all([
      fetchData("/academics/school-classes/").catch(() => []),
      fetchData("/academics/subjects/").catch(() => []),
    ]).then(([cls, sub]) => {
      setClasses(Array.isArray(cls) ? cls : cls?.results ?? []);
      setSubjects(Array.isArray(sub) ? sub : sub?.results ?? []);
    }).finally(() => setLoadingRefs(false));
  }, []);

  // 3. Élèves quand la classe change
  useEffect(() => {
    const cls = filters.school_class;
    setStudents([]);
    setFilters(p => p.student ? { ...p, student: "" } : p);
    if (!cls) return;
    let alive = true;
    setLoadingStudents(true);
    fetchData(`/core/admin/students/by-class/${cls}/`)
      .then(d => { if (alive) setStudents(Array.isArray(d) ? d : d?.results ?? []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoadingStudents(false); });
    return () => { alive = false; };
  }, [filters.school_class]);

  // 4. TermStatus quand classe + trimestre changent
  const fetchTermStatus = useCallback(async (cls, term, yearId) => {
    if (!cls || !term) { setTermStatus(null); return; }
    try {
      const q = buildQuery({ school_class: cls, term, school_year: yearId });
      const d = await fetchData(`/academics/term-status/${q}`);
      const l = Array.isArray(d) ? d : d?.results ?? [];
      setTermStatus(l[0] ?? null);
    } catch { setTermStatus(null); }
  }, []);

  useEffect(() => {
    fetchTermStatus(filters.school_class, filters.term, selectedYear?.id);
  }, [filters.school_class, filters.term, selectedYear, fetchTermStatus]);

  // 5. Fetch notes (déclenché manuellement via bouton "Filtrer" ou à chaque fetch)
  const fetchGrades = useCallback(async () => {
    // Garde : exiger au moins classe OU élève pour éviter un fetch de masse
    if (!filters.school_class && !filters.student && !search.trim()) {
      setGrades([]); return;
    }
    setLoadingGrades(true);
    try {
      const q = buildQuery({
        school_class: filters.school_class  || undefined,
        student_id:   filters.student       || undefined,
        subject:      filters.subject       || undefined,
        term:         filters.term          || undefined,
        student_name: search.trim()         || undefined,
        school_year:  selectedYear?.id      || undefined,
      });
      const d = await fetchData(`/academics/grades/${q}`);
      setGrades(Array.isArray(d) ? d : d?.results ?? []);
    } catch (err) {
      handleApiError(err);
      if (err?.status === 423) fetchTermStatus(filters.school_class, filters.term, selectedYear?.id);
      setMsg({ type: "error", text: extractErrorMsg(err) });
    } finally { setLoadingGrades(false); }
  }, [filters, search, selectedYear, fetchTermStatus]);

  // Sync student_id dans le formulaire quand le filtre élève change
  useEffect(() => {
    if (filters.student) setForm(p => ({ ...p, student_id: filters.student }));
  }, [filters.student]);

  /* ─────────────────────── SOUMISSION ──────────────────────────────────── */

  const handleSubmit = async () => {
    if (isLocked || yearIsClosed) {
      setMsg({ type: "error", text: "Trimestre verrouillé ou année clôturée." });
      return;
    }
    if (!form.student_id || !form.subject_id) {
      setMsg({ type: "error", text: "Sélectionnez un élève et une matière." });
      return;
    }

    const toNum = v => (v === "" || v === null || v === undefined) ? null : Number(v);

    // Construire le payload bulk_upsert.
    // N'inclure QUE les champs de note NON vides :
    //   - Évite d'écraser les valeurs existantes par null
    //   - Permet de ne mettre à jour qu'un seul champ à la fois
    const line = {
      ...(form.id ? { id: form.id } : {}),
      student_id: String(form.student_id),
      subject_id: Number(form.subject_id),
      term:       form.term || "T1",
    };
    let hasAtLeastOne = false;
    NOTE_FIELDS.forEach(({ key }) => {
      const raw = form[key];
      if (raw !== "" && raw !== null && raw !== undefined) {
        const n = toNum(raw);
        if (n !== null) { line[key] = n; hasAtLeastOne = true; }
      }
    });

    if (!hasAtLeastOne && !form.id) {
      setMsg({ type: "error", text: "Saisissez au moins une note." });
      return;
    }

    setSaving(true);
    try {
      const data   = await postData("/academics/grades/bulk_upsert/", [line]);
      const result = (Array.isArray(data?.results) ? data.results : [])[0];

      if (result?.status === "error") {
        const e = result.errors;
        setMsg({ type: "error", text: typeof e === "string" ? e : JSON.stringify(e) });
      } else {
        const op = result?.status === "created" ? "enregistrée" : "mise à jour";
        setMsg({ type: "success", text: `Note ${op}.` });
        setForm(EMPTY_FORM);
        await fetchGrades();
      }
    } catch (err) {
      handleApiError(err);
      if (err?.status === 423) fetchTermStatus(filters.school_class, filters.term, selectedYear?.id);
      setMsg({ type: "error", text: extractErrorMsg(err) });
    } finally { setSaving(false); }
  };

  /* ─────────────────────── EDIT / DELETE ───────────────────────────────── */

  const handleEdit = g => {
    if (isLocked || yearIsClosed) {
      setMsg({ type: "error", text: "Modification impossible — trimestre verrouillé ou année clôturée." });
      return;
    }
    setForm({
      id:             g.id,
      student_id:     g.student_id,
      subject_id:     g.subject_id,
      term:           g.term ?? "T1",
      interrogation1: g.interrogation1 ?? "",
      interrogation2: g.interrogation2 ?? "",
      interrogation3: g.interrogation3 ?? "",
      devoir1:        g.devoir1        ?? "",
      devoir2:        g.devoir2        ?? "",
    });
    setPanelMode("edit");
    if (g.student_class_id && String(filters.school_class) !== String(g.student_class_id))
      setF("school_class", String(g.student_class_id));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteRequest = id => {
    if (isLocked || yearIsClosed) {
      setMsg({ type: "error", text: "Suppression impossible." }); return;
    }
    setConfirm({ open: true, id });
  };

  const handleDeleteConfirm = async () => {
    const id = confirm.id;
    setConfirm({ open: false, id: null });
    try {
      await deleteData(`/academics/grades/${id}/`);
      setMsg({ type: "success", text: "Note supprimée." });
      await fetchGrades();
    } catch (err) {
      handleApiError(err);
      setMsg({ type: "error", text: extractErrorMsg(err) });
    }
  };

  /* ─────────────────────── RENDU ─────────────────────────────────────────── */
  return (
    <div style={{
      minHeight: "100vh", background: T.pageBg, paddingBottom: 60,
      fontFamily: "'Plus Jakarta Sans', sans-serif", transition: "background .3s",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ═══ HEADER ═══ */}
      <header style={{
        position: "sticky", top: 0, zIndex: 40,
        background: T.headerBg, backdropFilter: "blur(16px)",
        borderBottom: `1px solid ${T.divider}`,
      }}>
        <div style={{
          maxWidth: 1280, margin: "0 auto", padding: "11px 24px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, flexWrap: "wrap",
        }}>
          {/* Titre */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: `linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow: `0 5px 16px ${COL.shadow}`,
            }}>
              <FaBookOpen style={{ width: 14, height: 14, color: "#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize: 16, fontWeight: 900, color: T.textPrimary, margin: 0 }}>
                Gestion des Notes
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <p style={{ fontSize: 10, color: T.textMuted, margin: 0 }}>
                  Saisie et consultation des évaluations
                </p>
                {statusMeta && filters.school_class && filters.term && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 3,
                    padding: "1px 7px", borderRadius: 999, fontSize: 9, fontWeight: 800,
                    background: statusMeta.bg, color: statusMeta.color,
                    textTransform: "uppercase", letterSpacing: ".06em",
                  }}>
                    <statusMeta.Icon style={{ width: 7, height: 7 }} />
                    {statusMeta.label}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Droite : sélecteur d'année + dark toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {!loadingYears && allYears.length > 0 && (
              <div style={{ position: "relative", minWidth: 128 }}>
                <select
                  value={selectedYear?.id ?? ""}
                  onChange={e => {
                    const yr = allYears.find(y => String(y.id) === e.target.value) ?? null;
                    setSelectedYear(yr);
                    setGrades([]); setForm(EMPTY_FORM); setTermStatus(null);
                  }}
                  style={{
                    appearance: "none", width: "100%",
                    paddingLeft: 10, paddingRight: 24, paddingTop: 6, paddingBottom: 6,
                    fontSize: 11, fontWeight: 700, borderRadius: 9, outline: "none",
                    cursor: "pointer",
                    background: yearIsClosed ? "#fef9f0" : `${COL.from}14`,
                    color: yearIsClosed ? "#b45309" : COL.from,
                    border: `1.5px solid ${yearIsClosed ? "#f59e0b44" : `${COL.from}40`}`,
                  }}>
                  {allYears.map(yr => (
                    <option key={yr.id} value={yr.id}>
                      {yr.label}{yr.is_active && !yr.is_closed ? " ✦" : yr.is_closed ? " ⊘" : ""}
                    </option>
                  ))}
                </select>
                <FaChevronDown style={{
                  position: "absolute", right: 7, top: "50%", transform: "translateY(-50%)",
                  width: 8, height: 8, pointerEvents: "none",
                  color: yearIsClosed ? "#b45309" : COL.from,
                }} />
              </div>
            )}
            <DarkToggle />
          </div>
        </div>
      </header>

      <main ref={containerRef} style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 24px 0" }}>

        {/* Bannière année clôturée */}
        {yearIsClosed && (
          <div style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "10px 16px", borderRadius: 11, marginBottom: 14,
            background: "#fef9f0", border: "1.5px solid #f59e0b33",
          }}>
            <FaHistory style={{ width: 13, height: 13, color: "#b45309", flexShrink: 0 }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: "#b45309" }}>
              {selectedYear?.label} — année clôturée. Consultation uniquement.
            </p>
          </div>
        )}

        {/* Bannière verrouillage */}
        {!yearIsClosed && termStatus && termStatus.status !== "draft" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 9,
            padding: "10px 16px", borderRadius: 11, marginBottom: 14,
            background: statusMeta.bg, border: `1.5px solid ${statusMeta.color}33`,
          }}>
            <statusMeta.Icon style={{ width: 13, height: 13, color: statusMeta.color, flexShrink: 0 }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: statusMeta.color }}>
              Trimestre {statusMeta.label.toLowerCase()} — saisie désactivée.
            </p>
          </div>
        )}

        {/* ═══ FILTRES ═══ */}
        <div style={{
          borderRadius: 16, padding: "14px 18px", marginBottom: 16,
          background: T.cardBg, border: `1.5px solid ${T.cardBorder}`,
          boxShadow: T.cardShadow,
        }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: narrow ? "1fr 1fr" : "1fr 1fr 1fr 1fr 140px 90px",
            gap: 10, alignItems: "end",
          }}>
            {/* Recherche */}
            <div>
              <p style={{
                fontSize: 9, fontWeight: 800, textTransform: "uppercase",
                letterSpacing: ".08em", color: T.textMuted, marginBottom: 5,
              }}>Recherche</p>
              <div style={{ position: "relative" }}>
                <FaSearch style={{
                  position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
                  width: 11, height: 11, color: T.textMuted, pointerEvents: "none",
                }} />
                <input placeholder="Nom de l'élève…" value={search}
                  onChange={e => setSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && fetchGrades()}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    paddingLeft: 30, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                    fontSize: 12, fontWeight: 500, borderRadius: 10, outline: "none",
                    background: T.inputBg, color: T.textPrimary,
                    border: `1.5px solid ${T.inputBorder}`, transition: "all .15s",
                  }}
                  onFocus={e => { e.target.style.borderColor = COL.from; e.target.style.boxShadow = `0 0 0 3px ${COL.from}20`; }}
                  onBlur={e  => { e.target.style.borderColor = T.inputBorder; e.target.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Classe */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: T.textMuted, marginBottom: 5 }}>Classe</p>
              <Sel icon={FaLayerGroup} value={filters.school_class} T={T}
                onChange={e => setF("school_class", e.target.value)}>
                <option value="">Toutes les classes</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Sel>
            </div>

            {/* Élève */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: T.textMuted, marginBottom: 5 }}>
                Élève{loadingStudents && <span style={{ color: COL.from, marginLeft: 4 }}>↻</span>}
              </p>
              <Sel icon={FaUserGraduate} value={filters.student} T={T}
                disabled={!filters.school_class && !students.length}
                onChange={e => setF("student", e.target.value)}>
                <option value="">
                  {filters.school_class
                    ? (loadingStudents ? "Chargement…" : "Tous les élèves")
                    : "Choisir une classe"}
                </option>
                {students.map(s => <option key={s.id} value={s.id}>{studentLabel(s)}</option>)}
              </Sel>
            </div>

            {/* Matière */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: T.textMuted, marginBottom: 5 }}>Matière</p>
              <Sel icon={FaBookOpen} value={filters.subject} T={T}
                onChange={e => setF("subject", e.target.value)}>
                <option value="">Toutes les matières</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Sel>
            </div>

            {/* Trimestre */}
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: T.textMuted, marginBottom: 5 }}>Trimestre</p>
              <Sel value={filters.term} T={T} onChange={e => setF("term", e.target.value)}>
                <option value="">Tous</option>
                {["T1","T2","T3"].map(t => <option key={t} value={t}>{t}</option>)}
              </Sel>
            </div>

            {/* Bouton filtrer */}
            <button onClick={fetchGrades} disabled={loadingGrades}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "9px 14px", borderRadius: 10, border: "none",
                cursor: loadingGrades ? "not-allowed" : "pointer",
                fontSize: 12, fontWeight: 800, color: "#fff",
                background: loadingGrades ? T.textMuted : `linear-gradient(135deg,${COL.from},${COL.to})`,
                boxShadow: loadingGrades ? "none" : `0 4px 12px ${COL.shadow}`,
                transition: "all .2s",
              }}>
              {loadingGrades
                ? <FaSyncAlt style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />
                : <FaSearch  style={{ width: 11, height: 11 }} />}
              {loadingGrades ? "…" : "Filtrer"}
            </button>
          </div>
        </div>

        {/* ═══ STATS ═══ */}
        {stats && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3,1fr)",
            gap: 10, marginBottom: 16,
          }}>
            {[
              { label: "Notes affichées",  val: grades.length,          sub: "résultats",       col: COL.from },
              { label: "Moyenne générale", val: stats.mean,             sub: "sur 20",           col: parseFloat(stats.mean) >= 10 ? COL.from : "#ef4444" },
              { label: "Taux de réussite", val: `${Math.round(stats.passing / stats.total * 100)}%`, sub: `${stats.passing}/${stats.total} élèves`, col: COL.from },
            ].map(({ label, val, sub, col }, i) => (
              <div key={i} style={{
                borderRadius: 14, padding: "12px 16px",
                background: T.cardBg, border: `1.5px solid ${T.cardBorder}`,
                boxShadow: T.cardShadow,
                animation: `fadeUp .3s ease-out ${i * 60}ms both`,
              }}>
                <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em", color: T.textMuted, marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: col, lineHeight: 1 }}>{val}</p>
                <p style={{ fontSize: 10, color: T.textMuted, marginTop: 2 }}>{sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* ═══ LAYOUT FORMULAIRE + RÉSULTATS ═══ */}
        <div style={{
          display: "grid",
          gridTemplateColumns: narrow ? "1fr" : "290px 1fr",
          gap: 16, alignItems: "start",
        }}>

          {/* ─── PANNEAU SAISIE / LECTURE ─── */}
          {(() => {
            const panelIsLocked = isLocked || yearIsClosed;
            const allSelected   = !!(form.student_id && form.subject_id && form.term);
            const hasGrade      = !!currentGrade;
            const inRead        = panelMode === "read";

            const accentBar = panelIsLocked
              ? "linear-gradient(90deg,#f59e0b,#f97316)"
              : inRead && hasGrade
                ? `linear-gradient(90deg,${COL.from},${COL.to})`
                : "linear-gradient(90deg,#6366f1,#8b5cf6)";

            return (
              <div style={{
                borderRadius: 16, overflow: "hidden",
                position: narrow ? "relative" : "sticky", top: 72,
                background: T.cardBg,
                border: `1.5px solid ${panelIsLocked ? "#f59e0b55" : T.cardBorder}`,
                boxShadow: T.cardShadow,
                transition: "all .25s",
              }}>
                <div style={{ height: 4, background: accentBar }} />

                {/* ── En-tête ── */}
                <div style={{
                  padding: "12px 16px", borderBottom: `1px solid ${T.divider}`,
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: panelIsLocked
                        ? "linear-gradient(135deg,#f59e0b,#f97316)"
                        : inRead
                          ? `linear-gradient(135deg,${COL.from},${COL.to})`
                          : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      boxShadow: panelIsLocked ? "0 3px 8px #f59e0b44"
                        : inRead ? `0 3px 8px ${COL.shadow}` : "0 3px 8px #6366f144",
                    }}>
                      {panelIsLocked
                        ? <FaLock  style={{ width: 11, height: 11, color: "#fff" }} />
                        : inRead
                          ? <FaEye   style={{ width: 11, height: 11, color: "#fff" }} />
                          : <FaEdit  style={{ width: 11, height: 11, color: "#fff" }} />}
                    </div>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 800, color: T.textPrimary, margin: 0 }}>
                        {panelIsLocked ? "Lecture seule" : inRead ? "Aperçu des notes" : "Saisie / Modification"}
                      </p>
                      {allSelected && hasGrade && (
                        <p style={{ fontSize: 9, color: COL.from, fontWeight: 700, margin: 0, marginTop: 1 }}>
                          ✦ Note existante chargée
                        </p>
                      )}
                      {allSelected && !hasGrade && (
                        <p style={{ fontSize: 9, color: "#6366f1", fontWeight: 700, margin: 0, marginTop: 1 }}>
                          + Nouvelle note
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bouton bascule lecture ↔ édition */}
                  {allSelected && !panelIsLocked && (
                    <button
                      onClick={() => setPanelMode(m => m === "read" ? "edit" : "read")}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        padding: "5px 11px", borderRadius: 8, border: "none",
                        cursor: "pointer", fontSize: 10, fontWeight: 800,
                        transition: "all .15s",
                        background: inRead
                          ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                          : (dark ? "rgba(255,255,255,.07)" : "#f8fafc"),
                        color: inRead ? "#fff" : T.textSecondary,
                        boxShadow: inRead ? "0 3px 10px #6366f144" : "none",
                      }}>
                      {inRead
                        ? <><FaEdit style={{ width: 9, height: 9 }} /> Éditer</>
                        : <><FaEye  style={{ width: 9, height: 9 }} /> Lecture</>}
                    </button>
                  )}
                </div>

                {/* ── Sélecteurs (toujours visibles) ── */}
                <div style={{ padding: "14px 16px 0", display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: T.textMuted, marginBottom: 4 }}>
                      Classe <span style={{ fontWeight: 400, textTransform: "none" }}>(filtre élèves)</span>
                    </p>
                    <Sel icon={FaLayerGroup} value={filters.school_class} T={T}
                      onChange={e => setF("school_class", e.target.value)}>
                      <option value="">— Choisir —</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </Sel>
                  </div>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: T.textMuted, marginBottom: 4 }}>Élève *</p>
                    <Sel icon={FaUserGraduate} value={form.student_id} T={T}
                      disabled={students.length === 0}
                      onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}>
                      <option value="">
                        {filters.school_class
                          ? (loadingStudents ? "Chargement…" : students.length === 0 ? "Aucun élève" : "— Sélectionner —")
                          : "Choisissez une classe"}
                      </option>
                      {students.map(s => <option key={s.id} value={s.id}>{studentLabel(s)}</option>)}
                    </Sel>
                  </div>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: T.textMuted, marginBottom: 4 }}>Matière *</p>
                    <Sel icon={FaBookOpen} value={form.subject_id} T={T}
                      onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))}>
                      <option value="">— Sélectionner —</option>
                      {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </Sel>
                  </div>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: T.textMuted, marginBottom: 6 }}>Trimestre</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                      {["T1","T2","T3"].map(t => {
                        const tc = TERM_COLORS[t]; const active = form.term === t;
                        return (
                          <button key={t} type="button" onClick={() => setForm(p => ({ ...p, term: t }))}
                            style={{
                              padding: "7px 4px", borderRadius: 9, border: "none",
                              cursor: "pointer", fontSize: 11, fontWeight: 800, transition: "all .15s",
                              background: active ? `linear-gradient(135deg,${tc.from},${tc.to})` : (dark ? "rgba(255,255,255,.06)" : "#f8fafc"),
                              color: active ? "#fff" : T.textMuted,
                              boxShadow: active ? `0 3px 10px ${tc.from}55` : "none",
                              transform: active ? "translateY(-1px)" : "none",
                            }}>{t}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* ── Zone notes : lecture ou édition ── */}
                {allSelected && (
                  <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ height: 1, background: T.divider }} />

                    {/* MODE LECTURE */}
                    {inRead && (
                      <>
                        {/* Interrogations */}
                        <div>
                          <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "#6366f1", marginBottom: 8 }}>
                            Interrogations
                          </p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                            {["interrogation1","interrogation2","interrogation3"].map((f, i) => (
                              <GradeBadge key={f} label={`Int. ${i+1}`} accent="#6366f1"
                                value={currentGrade?.[f] ?? ""} T={T} />
                            ))}
                          </div>
                        </div>
                        {/* Devoirs */}
                        <div>
                          <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "#f97316", marginBottom: 8 }}>
                            Devoirs
                          </p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            {["devoir1","devoir2"].map((f, i) => (
                              <GradeBadge key={f} label={`Dev. ${i+1}`} accent="#f97316"
                                value={currentGrade?.[f] ?? ""} T={T} />
                            ))}
                          </div>
                        </div>
                        {/* Moyennes calculées */}
                        {currentGrade?.average_subject != null && (
                          <>
                            <div style={{ height: 1, background: T.divider }} />
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                              {[
                                { label: "Moy. Interros", val: currentGrade.average_interro, accent: "#6366f1" },
                                { label: "Moy. Matière",  val: currentGrade.average_subject, accent: COL.from  },
                              ].map(({ label, val, accent }) => {
                                const n   = parseFloat(val);
                                const col = !isNaN(n) ? gradeColor(n) : null;
                                return (
                                  <div key={label} style={{ textAlign: "center" }}>
                                    <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: accent, marginBottom: 4 }}>{label}</p>
                                    <div style={{
                                      padding: "8px 4px", borderRadius: 10, fontSize: 20, fontWeight: 900,
                                      color: col || T.textMuted, lineHeight: 1,
                                      background: col ? `${col}12` : T.inputBg,
                                      border: `1.5px solid ${col ? `${col}33` : T.divider}`,
                                    }}>
                                      {!isNaN(n) ? n.toFixed(2) : "—"}
                                      {!isNaN(n) && <span style={{ fontSize: 11, fontWeight: 500, color: T.textMuted }}>/20</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}
                        {!hasGrade && (
                          <div style={{
                            padding: "16px 12px", borderRadius: 12, textAlign: "center",
                            background: dark ? "rgba(99,102,241,.07)" : "#f5f3ff",
                            border: "1.5px dashed #6366f133",
                          }}>
                            <p style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", marginBottom: 4 }}>
                              Aucune note enregistrée
                            </p>
                            <p style={{ fontSize: 10, color: T.textMuted }}>
                              Cliquez sur <strong>Éditer</strong> pour saisir.
                            </p>
                          </div>
                        )}
                        {/* Bouton Éditer (mode lecture, non verrouillé) */}
                        {!panelIsLocked && (
                          <button onClick={() => setPanelMode("edit")}
                            style={{
                              width: "100%", padding: "10px 16px", borderRadius: 12, border: "none",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                              cursor: "pointer", fontSize: 12, fontWeight: 800, color: "#fff",
                              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                              boxShadow: "0 4px 14px #6366f144",
                            }}>
                            <FaEdit style={{ width: 11, height: 11 }} />
                            {hasGrade ? "Modifier les notes" : "Saisir les notes"}
                          </button>
                        )}
                      </>
                    )}

                    {/* MODE ÉDITION */}
                    {!inRead && (
                      <>
                        <div>
                          <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "#6366f1", marginBottom: 6 }}>
                            Interrogations <span style={{ color: T.textMuted, fontWeight: 500 }}>(coef. 1)</span>
                          </p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                            {["interrogation1","interrogation2","interrogation3"].map((f, i) => (
                              <GradeInput key={f} label={`Int. ${i+1}`} accent="#6366f1"
                                value={form[f]}
                                onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                            ))}
                          </div>
                        </div>
                        <div>
                          <p style={{ fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".07em", color: "#f97316", marginBottom: 6 }}>
                            Devoirs <span style={{ color: T.textMuted, fontWeight: 500 }}>(coef. 2)</span>
                          </p>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                            {["devoir1","devoir2"].map((f, i) => (
                              <GradeInput key={f} label={`Dev. ${i+1}`} accent="#f97316"
                                value={form[f]}
                                onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} />
                            ))}
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                          <button onClick={() => setPanelMode("read")}
                            style={{
                              padding: "10px 8px", borderRadius: 10, fontSize: 11, fontWeight: 800,
                              border: `1.5px solid ${T.cardBorder}`, background: T.inputBg,
                              color: T.textSecondary, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                            }}>
                            <FaEraser style={{ width: 10, height: 10 }} /> Annuler
                          </button>
                          <button onClick={handleSubmit} disabled={saving}
                            style={{
                              padding: "10px 8px", borderRadius: 10, border: "none",
                              cursor: saving ? "not-allowed" : "pointer",
                              fontSize: 11, fontWeight: 800, color: "#fff",
                              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                              background: saving ? T.textMuted : `linear-gradient(135deg,${COL.from},${COL.to})`,
                              boxShadow: saving ? "none" : `0 4px 14px ${COL.shadow}`,
                              opacity: saving ? .7 : 1,
                            }}>
                            {saving
                              ? <FaSyncAlt style={{ width: 10, height: 10, animation: "spin 1s linear infinite" }} />
                              : <FaSave    style={{ width: 10, height: 10 }} />}
                            {saving ? "Enreg…" : hasGrade ? "Mettre à jour" : "Enregistrer"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Invitation si sélections incomplètes */}
                {!allSelected && (
                  <div style={{ padding: "20px 16px", textAlign: "center" }}>
                    <p style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.6 }}>
                      Sélectionnez un <strong>élève</strong>, une <strong>matière</strong> et un <strong>trimestre</strong> pour voir les notes existantes.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}


          {/* ─── RÉSULTATS ─── */}
          <div>
            {loadingGrades ? (
              <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 12 }}>
                {[...Array(4)].map((_, i) => (
                  <div key={i} style={{
                    height: 166, borderRadius: 16,
                    background: T.cardBg, border: `1.5px solid ${T.cardBorder}`,
                    animation: "pulse 1.6s ease-in-out infinite",
                  }} />
                ))}
              </div>
            ) : grades.length === 0 ? (
              <div style={{
                borderRadius: 18, padding: "60px 24px", textAlign: "center",
                background: T.cardBg, border: `2px dashed ${COL.from}33`,
                animation: "fadeUp .3s ease-out",
              }}>
                <div style={{
                  width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${COL.from}14`,
                }}>
                  <FaBookOpen style={{ width: 26, height: 26, color: COL.from, opacity: .45 }} />
                </div>
                <p style={{ fontSize: 16, fontWeight: 800, color: T.textSecondary }}>
                  Aucune note trouvée
                </p>
                <p style={{ fontSize: 12, color: T.textMuted, marginTop: 6, lineHeight: 1.6 }}>
                  Choisissez une classe et un élève, puis cliquez sur <strong>Filtrer</strong>.<br />
                  Ou utilisez le formulaire pour saisir une nouvelle note.
                </p>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 12 }}>
                {grades.map((g, i) => (
                  <GradeCard key={g.id} grade={g}
                    onEdit={handleEdit} onDelete={handleDeleteRequest}
                    animDelay={i * 25} isLocked={isLocked || yearIsClosed}
                    T={T} dark={dark} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={confirm.open}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setConfirm({ open: false, id: null })}
      />
      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{BASE_KEYFRAMES}{`
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.25} }
      `}</style>
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────────────────────── */
export default function Grades() {
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
<<<<<<< HEAD
}
=======
};

export default Grades;
