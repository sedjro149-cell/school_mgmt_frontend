// src/pages/Timetable.jsx
import React, {
  useCallback, useEffect, useMemo,
  useRef, useState,
} from "react";
import {
  FaEdit, FaTrash, FaPlus, FaFilePdf,
  FaClock, FaMapMarkerAlt, FaChalkboardTeacher,
  FaCheck, FaSyncAlt, FaTimes, FaExclamationTriangle,
  FaMoon, FaSun, FaGraduationCap, FaCalendarAlt,
  FaBookOpen, FaSearch,
} from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { fetchData, postData, patchData, deleteData } from "./api";
import {
  ThemeCtx, useTheme, LIGHT, DARK,
  SECTION_PALETTE, BASE_KEYFRAMES,
} from "./theme";

const COL = SECTION_PALETTE.academic; // bleu → cyan

/* ──────────────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────────────── */
const WEEKDAYS = [
  { v: 1, label: "Lundi"    },
  { v: 2, label: "Mardi"    },
  { v: 3, label: "Mercredi" },
  { v: 4, label: "Jeudi"    },
  { v: 5, label: "Vendredi" },
  { v: 6, label: "Samedi"   },
];

// Gradient pair per class (cycles if > 8 classes)
const CLASS_GRADIENTS = [
  ["#3b82f6","#06b6d4"],
  ["#8b5cf6","#6366f1"],
  ["#10b981","#14b8a6"],
  ["#f97316","#ef4444"],
  ["#f59e0b","#d97706"],
  ["#db2777","#be185d"],
  ["#0ea5e9","#0284c7"],
  ["#84cc16","#10b981"],
];

const fmtTime = (t) => {
  if (!t) return "";
  const parts = String(t).split(":");
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
};

const timeToMin = (t) => {
  if (!t) return 0;
  const [h, m = "0"] = String(t).split(":");
  return +h * 60 + +m;
};

const teacherName = (t) => {
  if (!t) return "";
  if (t.user && (t.user.first_name || t.user.last_name))
    return `${t.user.first_name || ""} ${t.user.last_name || ""}`.trim();
  if (t.first_name || t.last_name)
    return `${t.first_name || ""} ${t.last_name || ""}`.trim();
  return t.username || `Enseignant #${t.id}`;
};

/* ──────────────────────────────────────────────────────────────────
   ATOMES UI
────────────────────────────────────────────────────────────────── */
const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button onClick={toggle} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        position:"relative", width:52, height:28, borderRadius:999, border:"none",
        cursor:"pointer", flexShrink:0, outline:"none", transition:"all .3s",
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

const Toast = ({ msg, onClose }) => {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  const isErr = msg.type === "error";
  return (
    <div onClick={onClose} style={{
      position:"fixed", bottom:24, right:24, zIndex:300,
      display:"flex", alignItems:"center", gap:10, padding:"13px 18px",
      borderRadius:14, cursor:"pointer", fontWeight:700, fontSize:12,
      color:"#fff", animation:"slideUp .3s cubic-bezier(.34,1.56,.64,1)", maxWidth:340,
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

/* Labeled field */
const FL = ({ children }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <label style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
      letterSpacing:"0.08em", color:T.textMuted, display:"block", marginBottom:5 }}>
      {children}
    </label>
  );
};

/* Styled input for modal */
const MI = (props) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [f, setF] = useState(false);
  return (
    <input {...props}
      onFocus={(e) => { setF(true); props.onFocus?.(e); }}
      onBlur={(e)  => { setF(false); props.onBlur?.(e); }}
      style={{
        width:"100%", boxSizing:"border-box",
        padding:"9px 12px", fontSize:13, borderRadius:10, outline:"none",
        background:T.inputBg, color:T.textPrimary,
        border:`1.5px solid ${f ? COL.from : T.inputBorder}`,
        boxShadow: f ? `0 0 0 3px ${COL.from}22` : "none",
        transition:"all .15s", ...props.style,
      }} />
  );
};

/* Styled select for modal */
const MS = ({ children, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [f, setF] = useState(false);
  return (
    <select {...props}
      onFocus={(e) => { setF(true); props.onFocus?.(e); }}
      onBlur={(e)  => { setF(false); props.onBlur?.(e); }}
      style={{
        width:"100%", padding:"9px 12px", fontSize:13, borderRadius:10, outline:"none",
        background:T.inputBg, color:T.textPrimary,
        border:`1.5px solid ${f ? COL.from : T.inputBorder}`,
        boxShadow: f ? `0 0 0 3px ${COL.from}22` : "none",
        appearance:"none", transition:"all .15s",
      }}>
      {children}
    </select>
  );
};

/* ──────────────────────────────────────────────────────────────────
   ENTRY CHIP — une case dans la grille
────────────────────────────────────────────────────────────────── */
const EntryChip = ({ entry, gradient, onEdit, onDelete }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [hov, setHov] = useState(false);
  const [from, to] = gradient;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderLeft: `3px solid ${from}`,
        borderRadius: "0 7px 7px 0",
        padding: "5px 7px",
        position: "relative",
        transition: "all .15s",
        background: hov
          ? (dark ? `${from}28` : `${from}14`)
          : (dark ? `${from}18` : `${from}0c`),
        border: `1px solid ${hov ? from+"55" : from+"28"}`,
        borderLeft: `3px solid ${from}`,
      }}>
      {/* Subject */}
      <p style={{
        fontSize: 11, fontWeight: 800, lineHeight: 1.2,
        color: dark ? `${from}ee` : from,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        maxWidth: 120,
      }}>
        {entry.subject_name || "—"}
      </p>
      {/* Teacher */}
      <p style={{
        fontSize: 10, color: T.textSecondary, marginTop: 1,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120,
        display: "flex", alignItems: "center", gap: 3,
      }}>
        <FaChalkboardTeacher style={{ width:8,height:8,flexShrink:0,color:T.textMuted }} />
        {entry.teacher_name || "—"}
      </p>
      {/* Room */}
      {entry.room && (
        <p style={{
          fontSize: 9, color: T.textMuted, marginTop: 2,
          display: "flex", alignItems: "center", gap: 3,
        }}>
          <FaMapMarkerAlt style={{ width:7,height:7,flexShrink:0 }} />
          {entry.room}
        </p>
      )}
      {/* Hover actions */}
      {hov && (
        <div style={{
          position: "absolute", top: 4, right: 4,
          display: "flex", gap: 2,
          animation: "fadeIn .1s ease-out",
        }}>
          <button onClick={(e) => { e.stopPropagation(); onEdit(entry); }}
            style={{
              width: 20, height: 20, borderRadius: 5, border: "none",
              background: dark ? "#1e293b" : "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,.2)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: from,
            }}>
            <FaEdit style={{ width: 9, height: 9 }} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
            style={{
              width: 20, height: 20, borderRadius: 5, border: "none",
              background: dark ? "#1e293b" : "#fff",
              boxShadow: "0 1px 4px rgba(0,0,0,.2)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              color: "#ef4444",
            }}>
            <FaTrash style={{ width: 9, height: 9 }} />
          </button>
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   MODAL ADD / EDIT
────────────────────────────────────────────────────────────────── */
const EntryModal = ({
  form, setForm, onClose, onSubmit, saving,
  classes, subjects, teachers, timeSlots,
}) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  // Slots disponibles pour le jour sélectionné
  const slotsForDay = useMemo(
    () => timeSlots.filter((s) => String(s.day) === String(form.weekday))
          .slice().sort((a,b) => timeToMin(a.start_time) - timeToMin(b.start_time)),
    [timeSlots, form.weekday]
  );

  const applySlot = (slotId) => {
    const s = timeSlots.find((x) => String(x.id) === String(slotId));
    if (s) setForm((prev) => ({ ...prev, starts_at: fmtTime(s.start_time), ends_at: fmtTime(s.end_time) }));
  };

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      display:"flex", alignItems:"center", justifyContent:"center", padding:16,
      background:"rgba(2,6,23,.75)", backdropFilter:"blur(8px)",
      animation:"fadeIn .18s ease-out",
    }}>
      <div style={{
        width:"100%", maxWidth:520, maxHeight:"92vh",
        display:"flex", flexDirection:"column", overflow:"hidden",
        background:T.cardBg, border:`1px solid ${T.cardBorder}`,
        borderRadius:20, boxShadow:"0 24px 64px rgba(0,0,0,.45)",
        animation:"panelUp .3s cubic-bezier(.34,1.4,.64,1)",
      }}>
        {/* Bande */}
        <div style={{ height:5, flexShrink:0, background:`linear-gradient(90deg,${COL.from},${COL.to})` }} />

        {/* Header */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"14px 20px", borderBottom:`1px solid ${T.divider}`, flexShrink:0,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:34, height:34, borderRadius:10, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 4px 12px ${COL.shadow}`,
            }}>
              <FaCalendarAlt style={{ width:14,height:14,color:"#fff" }} />
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:T.textPrimary }}>
                {form.id ? "Modifier le cours" : "Ajouter un cours"}
              </p>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>
                {form.id ? `Édition #${form.id}` : "Nouvelle entrée dans l'emploi du temps"}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            style={{ width:30,height:30,borderRadius:8,border:"none",cursor:"pointer",
              background:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
              color:T.textMuted }}
            onMouseEnter={(e) => { e.currentTarget.style.background="#ef444418"; e.currentTarget.style.color="#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
            <FaTimes style={{ width:13,height:13 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:"auto", padding:20, display:"flex", flexDirection:"column", gap:14 }}
          className="custom-scrollbar">

          {/* Classe */}
          <div>
            <FL>Classe *</FL>
            <MS value={form.school_class} onChange={(e) => setForm((p) => ({ ...p, school_class: e.target.value }))}>
              <option value="">— Sélectionner une classe —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.level?.name ? `(${c.level.name})` : ""}</option>)}
            </MS>
          </div>

          {/* Matière */}
          <div>
            <FL>Matière *</FL>
            <MS value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}>
              <option value="">— Sélectionner une matière —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </MS>
          </div>

          {/* Enseignant */}
          <div>
            <FL>Enseignant</FL>
            <MS value={form.teacher || ""} onChange={(e) => setForm((p) => ({ ...p, teacher: e.target.value }))}>
              <option value="">— Sélectionner un enseignant —</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{teacherName(t)}{t.subject?.name ? ` · ${t.subject.name}` : ""}</option>)}
            </MS>
          </div>

          {/* Jour */}
          <div>
            <FL>Jour *</FL>
            <MS value={form.weekday}
              onChange={(e) => setForm((p) => ({ ...p, weekday: e.target.value, starts_at:"", ends_at:"" }))}>
              <option value="">— Sélectionner un jour —</option>
              {WEEKDAYS.map((d) => <option key={d.v} value={d.v}>{d.label}</option>)}
            </MS>
          </div>

          {/* Créneau horaire */}
          {form.weekday && slotsForDay.length > 0 && (
            <div>
              <FL>Créneau prédéfini <span style={{ fontWeight:400,textTransform:"none",letterSpacing:0,fontSize:10 }}>(remplit les horaires)</span></FL>
              <MS value="" onChange={(e) => applySlot(e.target.value)}>
                <option value="">— Choisir un créneau —</option>
                {slotsForDay.map((s) => (
                  <option key={s.id} value={s.id}>
                    {fmtTime(s.start_time)} → {fmtTime(s.end_time)}
                  </option>
                ))}
              </MS>
            </div>
          )}

          {/* Horaires manuels */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <FL>Début *</FL>
              <MI type="time" value={form.starts_at}
                onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))} />
            </div>
            <div>
              <FL>Fin *</FL>
              <MI type="time" value={form.ends_at}
                onChange={(e) => setForm((p) => ({ ...p, ends_at: e.target.value }))} />
            </div>
          </div>

          {/* Salle */}
          <div>
            <FL>Salle</FL>
            <MI placeholder="ex : Salle 12, Labo B…"
              value={form.room || ""}
              onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display:"flex", justifyContent:"flex-end", gap:10,
          padding:"14px 20px", borderTop:`1px solid ${T.divider}`, flexShrink:0,
        }}>
          <button onClick={onClose}
            style={{ padding:"9px 18px", borderRadius:10, border:`1.5px solid ${T.cardBorder}`,
              background:"transparent", cursor:"pointer", fontSize:12, fontWeight:700, color:T.textSecondary }}
            onMouseEnter={(e) => (e.currentTarget.style.background=T.rowHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background="transparent")}>
            Annuler
          </button>
          <button onClick={onSubmit} disabled={saving}
            style={{
              display:"flex", alignItems:"center", gap:8,
              padding:"9px 22px", borderRadius:10, border:"none", cursor:"pointer",
              fontSize:12, fontWeight:800, color:"#fff",
              background: saving ? T.textMuted : `linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow: saving ? "none" : `0 4px 14px ${COL.shadow}`,
            }}>
            {saving
              ? <FaSyncAlt style={{ width:12,height:12 }} className="animate-spin" />
              : <FaCheck   style={{ width:12,height:12 }} />}
            {saving ? "Enregistrement…" : form.id ? "Sauvegarder" : "Créer le cours"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   PAGE PRINCIPALE (inner)
────────────────────────────────────────────────────────────────── */
const TimetableInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  /* ── State ── */
  const [classes,      setClasses]      = useState([]);
  const [subjects,     setSubjects]     = useState([]);
  const [teachers,     setTeachers]     = useState([]);
  const [timeSlots,    setTimeSlots]    = useState([]);
  const [entriesMap,   setEntriesMap]   = useState({});   // { [classId]: Entry[] }
  const [selectedCls,  setSelectedCls]  = useState([]);   // classId[]
  const [loading,      setLoading]      = useState(true);
  const [savingModal,  setSavingModal]  = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [form,         setForm]         = useState(null);
  const [searchText,   setSearchText]   = useState("");
  const [msg,          setMsg]          = useState(null);

  /* ── Refs pour éviter les race conditions sur le cache ── */
  const fetchingRef = useRef(new Set());   // classIds en cours de fetch
  const cachedRef   = useRef(new Set());   // classIds déjà cachés
  const pdfRef      = useRef(null);

  /* ── Color map : classId → gradient pair ── */
  const classGradient = useCallback((classId) => {
    const idx = classes.findIndex((c) => c.id === classId);
    return CLASS_GRADIENTS[(idx >= 0 ? idx : classId) % CLASS_GRADIENTS.length];
  }, [classes]);

  /* ── Fetch initial (classes, subjects, teachers, time-slots) ── */
  const fetchInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [cls, sub, tea, slots] = await Promise.all([
        fetchData("/academics/school-classes/").catch(() => []),
        fetchData("/academics/subjects/").catch(() => []),
        fetchData("/core/admin/teachers/?no_pagination=1").catch(() => []),
        fetchData("/academics/time-slots/").catch(() => []),
      ]);
      setClasses(Array.isArray(cls) ? cls : (cls?.results ?? []));
      setSubjects(Array.isArray(sub) ? sub : (sub?.results ?? []));
      setTeachers(Array.isArray(tea) ? tea : (tea?.results ?? []));
      const sorted = (Array.isArray(slots) ? slots : (slots?.results ?? []))
        .slice()
        .sort((a, b) => (a.day - b.day) || timeToMin(a.start_time) - timeToMin(b.start_time));
      setTimeSlots(sorted);
    } catch { setMsg({ type:"error", text:"Erreur de chargement initial." }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  /* ── Fetch entries pour une classe (avec cache via refs) ── */
  const fetchClassEntries = useCallback(async (classId, force = false) => {
    if (!classId) return;
    if (fetchingRef.current.has(classId)) return;    // déjà en cours
    if (!force && cachedRef.current.has(classId)) return; // déjà en cache

    fetchingRef.current.add(classId);
    try {
      const data = await fetchData(`/academics/timetable/?school_class=${classId}`);
      const entries = Array.isArray(data) ? data : (data?.results ?? []);
      setEntriesMap((prev) => ({ ...prev, [classId]: entries }));
      cachedRef.current.add(classId);
    } catch { setMsg({ type:"error", text:"Erreur de chargement de l'emploi du temps." }); }
    finally { fetchingRef.current.delete(classId); }
  }, []);

  /* ── Rafraîchit les classes sélectionnées (force re-fetch) ── */
  const refreshSelected = useCallback(async () => {
    const ids = [...selectedCls];
    if (!ids.length) return;
    // Invalider le cache pour ces classes
    ids.forEach((id) => cachedRef.current.delete(id));
    await Promise.all(ids.map((id) => fetchClassEntries(id, true)));
  }, [selectedCls, fetchClassEntries]);

  /* ── Toggle classe sélectionnée (max 4) ── */
  const toggleClass = useCallback((id) => {
    setSelectedCls((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      const next = prev.length >= 4 ? [...prev.slice(-3), id] : [...prev, id];
      fetchClassEntries(id);
      return next;
    });
  }, [fetchClassEntries]);

  /* ── Computed: entrées combinées des classes sélectionnées ── */
  const combinedEntries = useMemo(() => {
    let arr = [];
    selectedCls.forEach((id) => {
      const list = entriesMap[id];
      if (Array.isArray(list)) arr = arr.concat(list);
    });
    return arr;
  }, [entriesMap, selectedCls]);

  /* ── Filtrage par recherche ── */
  const displayedEntries = useMemo(() => {
    if (!searchText.trim()) return combinedEntries;
    const q = searchText.toLowerCase();
    return combinedEntries.filter((e) =>
      `${e.subject_name || ""} ${e.teacher_name || ""} ${e.school_class_name || ""} ${e.room || ""}`
        .toLowerCase().includes(q)
    );
  }, [combinedEntries, searchText]);

  /* ── Time labels depuis time-slots (pour les lignes de la grille) ── */
  const timeLabels = useMemo(() => {
    const seen = new Set();
    const arr = [];
    timeSlots.forEach((s) => {
      const lbl = `${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}`;
      if (!seen.has(lbl)) { seen.add(lbl); arr.push({ lbl, start: s.start_time }); }
    });
    return arr
      .sort((a, b) => timeToMin(a.start) - timeToMin(b.start))
      .map((x) => x.lbl);
  }, [timeSlots]);

  /* ── Grille : grid[weekday][timeLabel] = Entry[] ── */
  const grid = useMemo(() => {
    const g = {};
    WEEKDAYS.forEach((d) => {
      g[d.v] = {};
      timeLabels.forEach((tl) => (g[d.v][tl] = []));
    });
    displayedEntries.forEach((e) => {
      const lbl = `${fmtTime(e.starts_at)} – ${fmtTime(e.ends_at)}`;
      const wd = parseInt(e.weekday);
      if (g[wd] && g[wd][lbl] !== undefined) g[wd][lbl].push(e);
    });
    return g;
  }, [displayedEntries, timeLabels]);

  /* ── Classes visibles dans la légende ── */
  const legendClasses = useMemo(() => {
    const present = new Set(displayedEntries.map((e) => e.school_class));
    return selectedCls
      .filter((id) => present.has(id))
      .map((id) => classes.find((c) => c.id === id))
      .filter(Boolean);
  }, [displayedEntries, selectedCls, classes]);

  /* ── Handlers ── */
  const openAdd = () => {
    setForm({ id:null, school_class:"", subject:"", teacher:"", weekday:"", starts_at:"", ends_at:"", room:"" });
    setShowModal(true);
  };

  const openEdit = (entry) => {
    setForm({
      id:           entry.id,
      school_class: entry.school_class,
      subject:      entry.subject,
      teacher:      entry.teacher || "",
      weekday:      entry.weekday,
      starts_at:    fmtTime(entry.starts_at),
      ends_at:      fmtTime(entry.ends_at),
      room:         entry.room || "",
    });
    setShowModal(true);
  };

  const submitForm = async () => {
    const { id, ...payload } = form;
    // Validation minimale
    if (!payload.school_class || !payload.subject || !payload.weekday || !payload.starts_at || !payload.ends_at) {
      setMsg({ type:"error", text:"Veuillez remplir tous les champs obligatoires (*)." });
      return;
    }
    setSavingModal(true);
    try {
      if (id) await patchData(`/academics/timetable/${id}/`, payload);
      else    await postData("/academics/timetable/", payload);
      setMsg({ type:"success", text: id ? "Cours mis à jour." : "Cours ajouté." });
      setShowModal(false);
      await refreshSelected();
    } catch { setMsg({ type:"error", text:"Erreur lors de l'enregistrement." }); }
    finally { setSavingModal(false); }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm("Supprimer ce cours de l'emploi du temps ?")) return;
    try {
      await deleteData(`/academics/timetable/${id}/`);
      setMsg({ type:"success", text:"Cours supprimé." });
      await refreshSelected();
    } catch { setMsg({ type:"error", text:"Erreur lors de la suppression." }); }
  };

  const exportPDF = async () => {
    if (!pdfRef.current) return;
    try {
      const canvas = await html2canvas(pdfRef.current, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const w = 277, h = (w * canvas.height) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, w, Math.min(h, 190));
      pdf.save("emploi-du-temps.pdf");
      setMsg({ type:"success", text:"PDF exporté avec succès." });
    } catch { setMsg({ type:"error", text:"Erreur lors de l'export PDF." }); }
  };

  /* ── Rendu d'une cellule ── */
  const renderCell = (day, tl) => {
    const entries = grid[day]?.[tl] ?? [];
    if (!entries.length) {
      return (
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"center",
          height:"100%", minHeight:60,
        }}>
          <div style={{ width:18, height:1, background:T.divider, borderRadius:2 }} />
        </div>
      );
    }
    // Groupe par classe (au cas où plusieurs classes partagent le même créneau)
    const byClass = {};
    entries.forEach((e) => {
      if (!byClass[e.school_class]) byClass[e.school_class] = [];
      byClass[e.school_class].push(e);
    });
    const orderedIds = selectedCls.filter((id) => byClass[id]);
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:4, padding:"4px 2px" }}>
        {orderedIds.map((cid) => {
          const e = byClass[cid][0];
          return (
            <EntryChip
              key={cid}
              entry={e}
              gradient={classGradient(cid)}
              onEdit={openEdit}
              onDelete={deleteEntry}
            />
          );
        })}
      </div>
    );
  };

  /* ── Dimensions grille ── */
  const TIME_COL = 88;
  const DAY_COL  = 148;
  const gridCols = `${TIME_COL}px repeat(6, ${DAY_COL}px)`;
  const gridMinW = TIME_COL + 6 * DAY_COL;

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
        <div style={{ maxWidth:1400, margin:"0 auto", padding:"12px 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          {/* Title */}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:40, height:40, borderRadius:12, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 6px 18px ${COL.shadow}`,
            }}>
              <FaCalendarAlt style={{ width:17,height:17,color:"#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize:17, fontWeight:900, color:T.textPrimary, letterSpacing:"-0.02em" }}>
                Emplois du temps
              </h1>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>
                Sélectionnez jusqu'à 4 classes pour superposer leurs grilles
              </p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <DarkToggle />

            {/* Search */}
            <div style={{ position:"relative" }}>
              <FaSearch style={{
                position:"absolute", left:10, top:"50%", transform:"translateY(-50%)",
                width:11, height:11, color:T.textMuted, pointerEvents:"none",
              }} />
              <input
                placeholder="Rechercher…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  paddingLeft:30, paddingRight:12, paddingTop:8, paddingBottom:8,
                  borderRadius:10, border:`1.5px solid ${T.inputBorder}`,
                  background:T.inputBg, color:T.textPrimary, fontSize:12,
                  outline:"none", width:160,
                }}
                onFocus={(e) => (e.target.style.borderColor=COL.from)}
                onBlur={(e)  => (e.target.style.borderColor=T.inputBorder)} />
            </div>

            <button onClick={fetchInitial}
              style={{
                display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:10,
                border:`1.5px solid ${T.cardBorder}`, background:T.cardBg, cursor:"pointer",
                fontSize:12, fontWeight:700, color:T.textSecondary,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background=T.rowHover)}
              onMouseLeave={(e) => (e.currentTarget.style.background=T.cardBg)}>
              <FaSyncAlt style={{ width:11,height:11 }} className={loading?"animate-spin":""} />
              Actualiser
            </button>

            <button onClick={exportPDF}
              style={{
                display:"flex", alignItems:"center", gap:6, padding:"8px 12px", borderRadius:10,
                border:"none", cursor:"pointer",
                fontSize:12, fontWeight:700, color:"#fff",
                background:"linear-gradient(135deg,#ef4444,#dc2626)",
                boxShadow:"0 3px 10px #ef444444",
              }}>
              <FaFilePdf style={{ width:11,height:11 }} />
              PDF
            </button>

            <button onClick={openAdd}
              style={{
                display:"flex", alignItems:"center", gap:6, padding:"8px 14px", borderRadius:10,
                border:"none", cursor:"pointer",
                fontSize:12, fontWeight:800, color:"#fff",
                background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                boxShadow:`0 3px 12px ${COL.shadow}`,
              }}>
              <FaPlus style={{ width:11,height:11 }} />
              Ajouter un cours
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1400, margin:"0 auto", padding:"20px 24px 0" }}>

        {/* ══ SÉLECTEUR DE CLASSES ══ */}
        <div style={{
          borderRadius:16, padding:"14px 18px", marginBottom:16,
          background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
          boxShadow:T.cardShadow,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <p style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
              letterSpacing:"0.08em", color:T.textMuted, flexShrink:0 }}>
              Classes
            </p>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, flex:1 }}>
              {loading && !classes.length
                ? <p style={{ fontSize:12, color:T.textMuted, fontStyle:"italic" }}>Chargement…</p>
                : classes.map((cls, idx) => {
                    const active = selectedCls.includes(cls.id);
                    const [from, to] = CLASS_GRADIENTS[idx % CLASS_GRADIENTS.length];
                    return (
                      <button key={cls.id} onClick={() => toggleClass(cls.id)}
                        style={{
                          display:"flex", alignItems:"center", gap:6,
                          padding:"5px 12px", borderRadius:999, border:"none",
                          cursor:"pointer", fontSize:11, fontWeight:700,
                          transition:"all .15s",
                          background: active
                            ? `linear-gradient(135deg,${from},${to})`
                            : (dark ? "rgba(255,255,255,0.06)" : "#f1f5f9"),
                          color: active ? "#fff" : T.textSecondary,
                          boxShadow: active ? `0 3px 10px ${from}55` : "none",
                          transform: active ? "translateY(-1px)" : "none",
                        }}>
                        {active && (
                          <div style={{ width:6, height:6, borderRadius:"50%", background:"rgba(255,255,255,.7)" }} />
                        )}
                        {cls.name}
                        {cls.level?.name && (
                          <span style={{ opacity:.7, fontWeight:500 }}>{cls.level.name}</span>
                        )}
                      </button>
                    );
                  })}
            </div>
            {selectedCls.length > 0 && (
              <button onClick={() => setSelectedCls([])}
                style={{
                  padding:"5px 10px", borderRadius:8,
                  border:`1px solid ${T.cardBorder}`, background:"transparent",
                  cursor:"pointer", fontSize:10, fontWeight:700, color:T.textMuted,
                  flexShrink:0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color="#ef4444", e.currentTarget.style.borderColor="#ef444444")}
                onMouseLeave={(e) => (e.currentTarget.style.color=T.textMuted, e.currentTarget.style.borderColor=T.cardBorder)}>
                Tout désélectionner
              </button>
            )}
          </div>

          {/* Chips classes actives */}
          {selectedCls.length > 0 && (
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:10, flexWrap:"wrap" }}>
              <p style={{ fontSize:10, color:T.textMuted, fontWeight:600 }}>Affichées :</p>
              {selectedCls.map((id) => {
                const cls = classes.find((c) => c.id === id);
                const idx = classes.findIndex((c) => c.id === id);
                const [from, to] = CLASS_GRADIENTS[idx % CLASS_GRADIENTS.length];
                return cls ? (
                  <span key={id} style={{
                    display:"inline-flex", alignItems:"center", gap:5,
                    padding:"3px 10px", borderRadius:999, fontSize:10, fontWeight:700,
                    background:`${from}18`, color:from, border:`1px solid ${from}44`,
                  }}>
                    <div style={{ width:6,height:6,borderRadius:"50%",background:`linear-gradient(135deg,${from},${to})` }} />
                    {cls.name}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </div>

        {/* ══ GRILLE ══ */}
        <div style={{
          borderRadius:16, overflow:"hidden",
          background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
          boxShadow:T.cardShadow, marginBottom:16,
        }}>
          {loading ? (
            <div style={{ padding:"60px 24px", display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", gap:14 }}>
              <FaSyncAlt style={{ width:28,height:28,color:COL.from }} className="animate-spin" />
              <p style={{ fontSize:13, color:T.textMuted }}>Chargement…</p>
            </div>
          ) : selectedCls.length === 0 ? (
            <div style={{ padding:"70px 24px", display:"flex", flexDirection:"column",
              alignItems:"center", justifyContent:"center", gap:12, textAlign:"center" }}>
              <div style={{
                width:68, height:68, borderRadius:20,
                display:"flex", alignItems:"center", justifyContent:"center",
                background:`linear-gradient(135deg,${COL.from}22,${COL.to}11)`,
              }}>
                <FaCalendarAlt style={{ width:28,height:28,color:COL.from,opacity:.6 }} />
              </div>
              <p style={{ fontSize:16, fontWeight:800, color:T.textSecondary }}>
                Aucune classe sélectionnée
              </p>
              <p style={{ fontSize:12, color:T.textMuted, maxWidth:280, lineHeight:1.6 }}>
                Cliquez sur une ou plusieurs classes ci-dessus pour afficher leur emploi du temps.
              </p>
            </div>
          ) : timeLabels.length === 0 ? (
            <div style={{ padding:"48px 24px", textAlign:"center" }}>
              <p style={{ fontSize:13, color:T.textMuted, fontStyle:"italic" }}>
                Aucun créneau horaire défini. Ajoutez des créneaux depuis l'administration.
              </p>
            </div>
          ) : (
            <div style={{ overflowX:"auto" }} ref={pdfRef}>
              <div style={{ minWidth: gridMinW }}>

                {/* ── En-tête jours ── */}
                <div style={{
                  display:"grid", gridTemplateColumns: gridCols,
                  background:T.tableHead, borderBottom:`2px solid ${T.divider}`,
                }}>
                  <div style={{ padding:"10px 12px" }}>
                    <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                      letterSpacing:"0.1em", color:T.textMuted }}>
                      Horaire
                    </p>
                  </div>
                  {WEEKDAYS.map((d) => {
                    // Compter les cours ce jour
                    const count = displayedEntries.filter((e) => parseInt(e.weekday) === d.v).length;
                    return (
                      <div key={d.v} style={{
                        padding:"10px 12px",
                        borderLeft:`1px solid ${T.divider}`,
                        display:"flex", alignItems:"center", justifyContent:"space-between",
                      }}>
                        <p style={{ fontSize:12, fontWeight:800, color:T.textPrimary }}>{d.label}</p>
                        {count > 0 && (
                          <span style={{
                            fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:999,
                            background: dark ? COL.darkBg : COL.lightBg,
                            color:COL.text, border:`1px solid ${COL.from}44`,
                          }}>
                            {count}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* ── Lignes horaires ── */}
                {timeLabels.map((tl, idx) => {
                  const isEven = idx % 2 === 0;
                  return (
                    <div key={tl} style={{
                      display:"grid", gridTemplateColumns: gridCols,
                      borderBottom: idx < timeLabels.length - 1 ? `1px solid ${T.divider}` : "none",
                      background: isEven
                        ? T.cardBg
                        : (dark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.012)"),
                      minHeight: 72,
                    }}>
                      {/* Colonne heure */}
                      <div style={{
                        padding:"8px 10px",
                        display:"flex", flexDirection:"column", justifyContent:"center",
                        borderRight:`1px solid ${T.divider}`,
                      }}>
                        {tl.split("–").map((part, i) => (
                          <p key={i} style={{
                            fontSize: i===0 ? 12 : 10,
                            fontWeight: i===0 ? 800 : 500,
                            color: i===0 ? COL.from : T.textMuted,
                            lineHeight:1.3,
                          }}>
                            {i===0 ? part.trim() : `— ${part.trim()}`}
                          </p>
                        ))}
                      </div>

                      {/* Colonnes jours */}
                      {WEEKDAYS.map((d) => (
                        <div key={d.v} style={{
                          padding:"4px 6px",
                          borderLeft:`1px solid ${T.divider}`,
                        }}>
                          {renderCell(d.v, tl)}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ══ LÉGENDE ══ */}
        {legendClasses.length > 0 && (
          <div style={{
            borderRadius:14, padding:"12px 18px", marginBottom:16,
            background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
            boxShadow:T.cardShadow,
            display:"flex", alignItems:"center", gap:16, flexWrap:"wrap",
          }}>
            <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
              letterSpacing:"0.08em", color:T.textMuted, flexShrink:0 }}>
              Légende
            </p>
            {legendClasses.map((cls) => {
              const idx = classes.findIndex((c) => c.id === cls.id);
              const [from, to] = CLASS_GRADIENTS[idx % CLASS_GRADIENTS.length];
              const count = displayedEntries.filter((e) => e.school_class === cls.id).length;
              return (
                <div key={cls.id} style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{
                    width:14, height:14, borderRadius:4, flexShrink:0,
                    background:`linear-gradient(135deg,${from},${to})`,
                    boxShadow:`0 2px 6px ${from}44`,
                  }} />
                  <span style={{ fontSize:12, fontWeight:700, color:T.textPrimary }}>{cls.name}</span>
                  <span style={{ fontSize:10, color:T.textMuted }}>
                    {cls.level?.name} · {count} cours
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ══ MODAL ══ */}
      {showModal && form && (
        <EntryModal
          form={form} setForm={setForm}
          onClose={() => setShowModal(false)}
          onSubmit={submitForm}
          saving={savingModal}
          classes={classes}
          subjects={subjects}
          teachers={teachers}
          timeSlots={timeSlots}
        />
      )}

      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{BASE_KEYFRAMES}{`
        .animate-spin  { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .custom-scrollbar::-webkit-scrollbar { width:4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:${COL.from}66; border-radius:10px; }
      `}</style>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────────
   ROOT (avec ThemeCtx.Provider)
────────────────────────────────────────────────────────────────── */
const Timetable = () => {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("scol360_dark") === "true"; } catch { return false; }
  });
  const toggle = useCallback(() => {
    setDark((v) => { const n=!v; try{localStorage.setItem("scol360_dark",String(n));}catch{} return n; });
  }, []);
  return (
    <ThemeCtx.Provider value={{ dark, toggle }}>
      <TimetableInner />
    </ThemeCtx.Provider>
  );
};

export default Timetable;