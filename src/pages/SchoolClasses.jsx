// src/pages/LevelsAndClasses.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaEdit, FaTrash, FaPlus, FaSearch, FaUsers,
  FaChalkboardTeacher, FaTimes, FaEye, FaLayerGroup,
  FaGraduationCap, FaChevronLeft, FaChevronRight,
  FaCheck, FaExclamationTriangle, FaIdBadge,
  FaMoon, FaSun, FaSyncAlt,
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";
import {
  ThemeCtx, useTheme,
  LIGHT, DARK,
  SECTION_PALETTE, avatarGradient,
  BASE_KEYFRAMES,
} from "./theme";

/* ── Palettes utilisées ──────────────────────────────────────────
   Page principale  → academic  (bleu → cyan)
   Niveau (levels)  → academic
   Enseignants dans le détail → teachers (ambre)
   Étudiants dans le détail  → students (indigo)
─────────────────────────────────────────────────────────────── */
const COL       = SECTION_PALETTE.academic;
const COL_TEACH = SECTION_PALETTE.teachers;
const COL_STU   = SECTION_PALETTE.students;

/* ═══════════════════════════════════════════════════════════════
   ATOMES
═══════════════════════════════════════════════════════════════ */

/* Mini-avatar avec initiale */
const MiniAvatar = ({ name, palette = COL }) => {
  const [from, to] = avatarGradient(name);
  return (
    <div
      className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-white text-xs select-none"
      style={{
        background: `linear-gradient(135deg,${from},${to})`,
        boxShadow: `0 3px 8px ${from}44`,
      }}
    >
      {(name || "?")[0].toUpperCase()}
    </div>
  );
};

/* Toggle dark mode */
const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button onClick={toggle} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={dark ? "Mode clair" : "Mode sombre"}
      className="relative rounded-full focus:outline-none transition-all duration-300 flex-shrink-0"
      style={{
        width: 52, height: 28,
        background: dark
          ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
          : `linear-gradient(135deg,${COL.from},${COL.to})`,
        boxShadow: hov ? (dark ? "0 0 18px #6366f199" : `0 0 18px ${COL.shadow}`) : "0 2px 8px rgba(0,0,0,.2)",
      }}>
      <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white flex items-center justify-center transition-all duration-300"
        style={{ left: dark ? "calc(100% - 26px)" : "2px", boxShadow: "0 2px 6px rgba(0,0,0,.25)" }}>
        {dark ? <FaMoon style={{ width:12,height:12,color:"#6366f1" }} />
               : <FaSun  style={{ width:12,height:12,color:COL.from  }} />}
      </div>
    </button>
  );
};

/* Toast */
const Toast = ({ msg, onClose }) => {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); } }, [msg, onClose]);
  if (!msg) return null;
  const isErr = msg.type === "error";
  return (
    <div onClick={onClose}
      className="fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl cursor-pointer text-white text-sm font-bold max-w-sm"
      style={{
        background: isErr ? "linear-gradient(135deg,#ef4444,#dc2626)" : `linear-gradient(135deg,${COL.from},${COL.to})`,
        animation: "slideUp .3s cubic-bezier(.34,1.56,.64,1)",
      }}>
      {isErr ? <FaExclamationTriangle style={{ width:14,height:14,flexShrink:0 }} />
             : <FaCheck style={{ width:14,height:14,flexShrink:0 }} />}
      {msg.text}
    </div>
  );
};

/* Input stylé */
const StyledInput = ({ icon: Icon, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      {Icon && (
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-150"
          style={{ color: focused ? COL.from : T.textMuted }}>
          <Icon style={{ width:13,height:13 }} />
        </span>
      )}
      <input {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
        className="w-full py-2.5 text-sm rounded-xl outline-none transition-all duration-150 placeholder:opacity-40"
        style={{
          paddingLeft: Icon ? "2.5rem" : "1rem", paddingRight: "1rem",
          background: T.inputBg,
          border: `1.5px solid ${focused ? COL.from : T.inputBorder}`,
          boxShadow: focused ? `0 0 0 3px ${COL.from}22` : "none",
          color: T.textPrimary,
        }} />
    </div>
  );
};

const StyledSelect = ({ children, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [focused, setFocused] = useState(false);
  return (
    <select {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
      className="w-full appearance-none px-4 py-2.5 text-sm rounded-xl outline-none transition-all duration-150"
      style={{
        background: T.inputBg,
        border: `1.5px solid ${focused ? COL.from : T.inputBorder}`,
        boxShadow: focused ? `0 0 0 3px ${COL.from}22` : "none",
        color: T.textPrimary,
      }}>
      {children}
    </select>
  );
};

/* Label de champ */
const FieldLabel = ({ children, required }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div className="flex items-baseline gap-1.5 mb-1.5">
      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textSecondary }}>{children}</label>
      {required && <span className="text-[10px] font-bold" style={{ color: COL.from }}>*</span>}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MODAL GÉNÉRIQUE
═══════════════════════════════════════════════════════════════ */
const Modal = ({ isOpen, onClose, title, subtitle, icon: Icon, wide, children }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2,6,23,.72)", backdropFilter: "blur(8px)", animation: "fadeIn .18s ease-out" }}>
      <div className={`relative w-full flex flex-col overflow-hidden ${wide ? "max-w-5xl h-[88vh]" : "max-w-md"}`}
        style={{
          background: T.cardBg, border: `1px solid ${T.cardBorder}`,
          borderRadius: 20, boxShadow: "0 24px 64px rgba(0,0,0,.4)",
          maxHeight: wide ? "88vh" : "92vh",
          animation: "panelUp .3s cubic-bezier(.34,1.4,.64,1)",
        }}>
        {/* Bande de couleur */}
        <div className="h-1.5 flex-shrink-0"
          style={{ background: `linear-gradient(90deg,${COL.from},${COL.to})` }} />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${T.divider}` }}>
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: `linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow: `0 4px 12px ${COL.shadow}` }}>
                <Icon style={{ width:16,height:16,color:"#fff" }} />
              </div>
            )}
            <div>
              <h3 className="text-base font-black" style={{ color: T.textPrimary }}>{title}</h3>
              {subtitle && <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all focus:outline-none"
            style={{ color: T.textMuted }}
            onMouseEnter={(e) => { e.currentTarget.style.background="#ef444418"; e.currentTarget.style.color="#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
            <FaTimes style={{ width:14,height:14 }} />
          </button>
        </div>

        {/* Body */}
        <div className={`flex-1 overflow-y-auto custom-scrollbar ${wide ? "p-6" : "p-6"}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

/* Footer de modal avec boutons */
const ModalFooter = ({ onCancel, onSave, saving, saveLabel }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div className="flex justify-end gap-3 pt-5 mt-2"
      style={{ borderTop: `1px solid ${T.divider}` }}>
      <button onClick={onCancel}
        className="px-5 py-2.5 text-sm font-bold rounded-xl transition-all focus:outline-none"
        style={{ color: T.textSecondary }}
        onMouseEnter={(e) => (e.currentTarget.style.background=dark?"rgba(255,255,255,0.06)":"#f1f5f9")}
        onMouseLeave={(e) => (e.currentTarget.style.background="transparent")}>
        Annuler
      </button>
      <button onClick={onSave} disabled={saving}
        className="flex items-center gap-2 px-6 py-2.5 text-sm font-black text-white rounded-xl transition-all focus:outline-none active:scale-95 disabled:opacity-60"
        style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 4px 16px ${COL.shadow}` }}>
        {saving ? <FaSyncAlt style={{ width:13,height:13 }} className="animate-spin" />
                : <FaCheck   style={{ width:13,height:13 }} />}
        {saving ? "Enregistrement…" : saveLabel || "Enregistrer"}
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   LEVEL CARD
═══════════════════════════════════════════════════════════════ */
const LevelCard = ({ level, classCount, onEdit, onDelete, style: animStyle }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [hov, setHov] = useState(false);
  const [from] = avatarGradient(level.name);

  return (
    <div
      className="group relative rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: T.cardBg,
        border: `1.5px solid ${hov ? COL.from + "66" : T.cardBorder}`,
        boxShadow: hov ? T.cardShadowHov : T.cardShadow,
        transform: hov ? "translateY(-3px)" : "translateY(0)",
        ...animStyle,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Barre colorée gauche */}
      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl transition-all duration-300"
        style={{ background: `linear-gradient(180deg,${COL.from},${COL.to})`, opacity: hov ? 1 : 0.5 }} />

      <div className="p-5 pl-6">
        {/* Top row */}
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300"
            style={{
              background: `linear-gradient(135deg,${COL.from}22,${COL.to}11)`,
              color: COL.from,
              transform: hov ? "scale(1.1) rotate(-4deg)" : "scale(1)",
            }}>
            <FaLayerGroup style={{ width:18,height:18 }} />
          </div>
          <span className="text-[10px] font-mono" style={{ color: T.textMuted }}>#{level.id}</span>
        </div>

        {/* Nom */}
        <h3 className="text-lg font-black mb-1 truncate" style={{ color: T.textPrimary }}>{level.name}</h3>
        <p className="text-xs" style={{ color: T.textMuted }}>
          {classCount} classe{classCount !== 1 ? "s" : ""}
        </p>

        {/* Actions — glissent depuis le bas au hover */}
        <div
          className="flex gap-2 mt-4 transition-all duration-200"
          style={{ opacity: hov ? 1 : 0, transform: hov ? "translateY(0)" : "translateY(6px)" }}>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(level); }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black transition-all focus:outline-none"
            style={{ background: dark ? COL.darkBg : COL.lightBg, color: COL.text, border: `1px solid ${COL.from}44` }}
            onMouseEnter={(e) => (e.currentTarget.style.background=`${COL.from}33`)}
            onMouseLeave={(e) => (e.currentTarget.style.background=dark?COL.darkBg:COL.lightBg)}>
            <FaEdit style={{ width:11,height:11 }} /> Modifier
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(level.id); }}
            className="w-9 flex items-center justify-center rounded-xl text-xs transition-all focus:outline-none"
            style={{ background: dark ? "#2a0a0a" : "#fef2f2", color:"#ef4444", border:"1px solid #fecaca" }}
            onMouseEnter={(e) => (e.currentTarget.style.background="#ef444422")}
            onMouseLeave={(e) => (e.currentTarget.style.background=dark?"#2a0a0a":"#fef2f2")}>
            <FaTrash style={{ width:11,height:11 }} />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   CLASS ROW
═══════════════════════════════════════════════════════════════ */
const ClassRow = ({ cls, onView, onEdit, onDelete, isLast }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [hov, setHov] = useState(false);

  return (
    <div
      className="grid items-center px-6 py-4 transition-all duration-150"
      style={{
        gridTemplateColumns: "1fr 180px 110px",
        background: hov ? T.rowHover : T.cardBg,
        borderBottom: isLast ? "none" : `1px solid ${T.divider}`,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Nom classe */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-xs text-white"
          style={{
            background: `linear-gradient(135deg,${COL.from},${COL.to})`,
            boxShadow: hov ? `0 4px 12px ${COL.shadow}` : "none",
            transition: "box-shadow .2s",
          }}>
          {(cls.name || "?")[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-black text-sm truncate" style={{ color: T.textPrimary }}>{cls.name}</p>
          <p className="text-[11px] font-mono mt-0.5" style={{ color: T.textMuted }}>ID #{cls.id}</p>
        </div>
      </div>

      {/* Badge niveau */}
      <div>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black"
          style={{
            background: dark ? COL.darkBg : COL.lightBg,
            border: `1px solid ${COL.from}44`,
            color: COL.text,
          }}>
          <FaLayerGroup style={{ width:9,height:9 }} />
          {cls.level?.name || "—"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-1"
        style={{ opacity: hov ? 1 : 0, transform: hov ? "translateX(0)" : "translateX(4px)", transition: "all .15s" }}>
        {[
          { icon: FaEye,   col: COL.from,   bg: dark?COL.darkBg:COL.lightBg, action: () => onView(cls)   },
          { icon: FaEdit,  col: COL.mid,    bg: dark?COL.darkBg:COL.lightBg, action: () => onEdit(cls)   },
          { icon: FaTrash, col: "#ef4444",  bg: dark?"#2a0a0a":"#fef2f2",    action: () => onDelete(cls.id) },
        ].map(({ icon: Icon, col, bg, action }, i) => (
          <button key={i} onClick={action}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all focus:outline-none"
            style={{ color: T.textMuted }}
            onMouseEnter={(e) => { e.currentTarget.style.background=bg+"cc"; e.currentTarget.style.color=col; }}
            onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
            <Icon style={{ width:13,height:13 }} />
          </button>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════════ */
const LevelsAndClassesInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  /* ── State tabs ── */
  const [tab, setTab] = useState("levels");

  /* ── Toast ── */
  const [msg, setMsg] = useState(null);

  /* ── Levels ── */
  const [levels,        setLevels]        = useState([]);
  const [levelsSearch,  setLevelsSearch]  = useState("");
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [levelModal,    setLevelModal]    = useState(false);
  const [levelTarget,   setLevelTarget]   = useState(null);
  const [levelName,     setLevelName]     = useState("");
  const [levelSaving,   setLevelSaving]   = useState(false);

  /* ── Classes ── */
  const [classes,        setClasses]        = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classSearch,    setClassSearch]    = useState("");
  const [levelFilter,    setLevelFilter]    = useState("");
  const [classModal,     setClassModal]     = useState(false);
  const [classTarget,    setClassTarget]    = useState(null);
  const [classNameInput, setClassNameInput] = useState("");
  const [classLevelId,   setClassLevelId]   = useState("");
  const [classSaving,    setClassSaving]    = useState(false);

  /* ── Pagination ── */
  const [classPage,     setClassPage]     = useState(1);
  const [classPageSize] = useState(12);

  /* ── View details ── */
  const [viewModal,     setViewModal]     = useState(false);
  const [viewTarget,    setViewTarget]    = useState(null);
  const [detailStudents,setDetailStudents]= useState([]);
  const [detailTeachers,setDetailTeachers]= useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  /* ── Fetchers ── */
  const fetchLevels = useCallback(async () => {
    setLevelsLoading(true);
    try {
      const d = await fetchData("/academics/levels/");
      setLevels(Array.isArray(d) ? d : (d?.results ?? []));
    } catch { setMsg({ type:"error", text:"Impossible de charger les niveaux." }); }
    finally { setLevelsLoading(false); }
  }, []);

  const fetchClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const d = await fetchData("/academics/school-classes/");
      setClasses(Array.isArray(d) ? d : (d?.results ?? []));
    } catch { setMsg({ type:"error", text:"Impossible de charger les classes." }); }
    finally { setClassesLoading(false); }
  }, []);

  useEffect(() => { fetchLevels();  }, [fetchLevels]);
  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  /* ── Computed ── */
  const filteredLevels = useMemo(() => {
    const q = levelsSearch.trim().toLowerCase();
    return q ? levels.filter((l) => (l.name||"").toLowerCase().includes(q)) : levels;
  }, [levels, levelsSearch]);

  const classCountByLevel = useMemo(() => {
    const map = {};
    classes.forEach((c) => { const id = c.level?.id; if (id) map[id] = (map[id]||0)+1; });
    return map;
  }, [classes]);

  const visibleClasses = useMemo(() =>
    classes
      .filter((c) => (!levelFilter || String(c.level?.id)===String(levelFilter)))
      .filter((c) => (!classSearch || (c.name||"").toLowerCase().includes(classSearch.toLowerCase()))),
    [classes, levelFilter, classSearch]
  );

  const classTotalPages = Math.max(1, Math.ceil(visibleClasses.length / classPageSize));
  const currentPageClasses = useMemo(() => {
    const start = (classPage-1)*classPageSize;
    return visibleClasses.slice(start, start+classPageSize);
  }, [visibleClasses, classPage, classPageSize]);

  useEffect(() => { if (classPage > classTotalPages) setClassPage(1); }, [classTotalPages]);

  /* ── Levels CRUD ── */
  const openLevelModal = (lvl = null) => {
    setLevelTarget(lvl); setLevelName(lvl ? lvl.name : ""); setLevelModal(true);
  };

  const submitLevel = async () => {
    if (!levelName.trim()) return setMsg({ type:"error", text:"Nom du niveau requis." });
    setLevelSaving(true);
    try {
      if (levelTarget) { await putData(`/academics/levels/${levelTarget.id}/`, { name:levelName.trim() }); setMsg({ type:"success", text:"Niveau mis à jour." }); }
      else             { await postData("/academics/levels/", { name:levelName.trim() }); setMsg({ type:"success", text:"Niveau créé." }); }
      await fetchLevels();
      setLevelModal(false);
    } catch { setMsg({ type:"error", text:"Erreur lors de l'enregistrement." }); }
    finally { setLevelSaving(false); }
  };

  const deleteLevel = async (id) => {
    if (!window.confirm("Supprimer ce niveau ? Les classes liées pourraient être affectées.")) return;
    try { await deleteData(`/academics/levels/${id}/`); setMsg({ type:"success", text:"Niveau supprimé." }); fetchLevels(); }
    catch { setMsg({ type:"error", text:"Impossible de supprimer ce niveau." }); }
  };

  /* ── Classes CRUD ── */
  const openClassModal = (cls = null) => {
    setClassTarget(cls);
    setClassNameInput(cls ? cls.name : "");
    setClassLevelId(cls ? (cls.level?.id ?? "") : (levels.length > 0 ? levels[0].id : ""));
    setClassModal(true);
  };

  const submitClass = async () => {
    if (!classNameInput.trim() || !classLevelId) return setMsg({ type:"error", text:"Nom et niveau requis." });
    setClassSaving(true);
    try {
      const payload = { name:classNameInput.trim(), level_id:classLevelId };
      if (classTarget) { await putData(`/academics/school-classes/${classTarget.id}/`, payload); setMsg({ type:"success", text:"Classe mise à jour." }); }
      else             { await postData("/academics/school-classes/", payload); setMsg({ type:"success", text:"Classe créée." }); }
      await fetchClasses();
      setClassModal(false);
    } catch { setMsg({ type:"error", text:"Erreur lors de l'enregistrement." }); }
    finally { setClassSaving(false); }
  };

  const deleteClass = async (id) => {
    if (!window.confirm("Supprimer définitivement cette classe ?")) return;
    try { await deleteData(`/academics/school-classes/${id}/`); setMsg({ type:"success", text:"Classe supprimée." }); fetchClasses(); }
    catch { setMsg({ type:"error", text:"Erreur lors de la suppression." }); }
  };

  /* ── View détails ── */
  const openViewDetails = async (cls) => {
    setViewTarget(cls); setViewModal(true);
    setLoadingDetail(true); setDetailStudents([]); setDetailTeachers([]);
    try {
      const [s, t] = await Promise.all([
        fetchData(`/core/admin/students/by-class/${cls.id}/`),
        fetchData(`/core/admin/teachers/by-class/${cls.id}/`),
      ]);
      setDetailStudents(Array.isArray(s) ? s : []);
      setDetailTeachers(Array.isArray(t) ? t : []);
    } catch { setMsg({ type:"error", text:"Erreur chargement détails." }); }
    finally { setLoadingDetail(false); }
  };

  const personName = (p) => {
    if (!p) return "Inconnu";
    if (p.user && (p.user.first_name||p.user.last_name)) return `${p.user.first_name||""} ${p.user.last_name||""}`.trim();
    if (p.first_name||p.last_name) return `${p.first_name||""} ${p.last_name||""}`.trim();
    return p.username || "Utilisateur";
  };

  /* ── Helpers UI ── */
  const isLoading = tab === "levels" ? levelsLoading : classesLoading;

  return (
    <div className="min-h-screen pb-20 transition-colors duration-300"
      style={{ background:T.pageBg, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ═══════════════ HEADER ═══════════════ */}
      <header className="sticky top-0 z-40 transition-colors duration-300"
        style={{ background:T.headerBg, backdropFilter:"blur(16px)", borderBottom:`1px solid ${T.divider}` }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">

            {/* Titre */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 6px 20px ${COL.shadow}` }}>
                <FaGraduationCap style={{ width:20,height:20,color:"#fff" }} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight" style={{ color:T.textPrimary }}>Structure de l'école</h1>
                <p className="text-xs" style={{ color:T.textMuted }}>Niveaux & Classes</p>
              </div>
            </div>

            {/* Tabs + actions */}
            <div className="flex items-center gap-3 flex-wrap">
              <DarkToggle />

              {/* Tab switcher */}
              <div className="flex items-center gap-1 p-1 rounded-xl"
                style={{ background:T.divider, border:`1px solid ${T.cardBorder}` }}>
                {[
                  { key:"levels",  label:"Niveaux",  icon:FaLayerGroup       },
                  { key:"classes", label:"Classes",  icon:FaChalkboardTeacher },
                ].map(({ key, label, icon:Icon }) => {
                  const active = tab === key;
                  return (
                    <button key={key} onClick={() => setTab(key)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200 focus:outline-none"
                      style={{
                        background: active ? T.cardBg : "transparent",
                        color:      active ? COL.from : T.textMuted,
                        boxShadow:  active ? T.cardShadow : "none",
                      }}>
                      <Icon style={{ width:13,height:13 }} />
                      {label}
                      {/* Compteur */}
                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full"
                        style={{
                          background: active ? `linear-gradient(135deg,${COL.from}22,${COL.to}11)` : T.divider,
                          color:      active ? COL.text : T.textMuted,
                        }}>
                        {key==="levels" ? levels.length : classes.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Bouton nouveau */}
              <button
                onClick={() => tab==="levels" ? openLevelModal() : openClassModal()}
                className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-black text-white transition-all focus:outline-none active:scale-95"
                style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 4px 14px ${COL.shadow}` }}>
                <FaPlus style={{ width:12,height:12 }} />
                {tab==="levels" ? "Nouveau niveau" : "Nouvelle classe"}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════ MAIN ═══════════════ */}
      <main className="max-w-7xl mx-auto px-6 py-6">

        {/* ── Barre de recherche/filtre ── */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {/* Recherche */}
          <div className="relative flex-1" style={{ minWidth:220 }}>
            <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ width:13,height:13,color:T.textMuted }} />
            <input
              placeholder={tab==="levels" ? "Rechercher un niveau…" : "Rechercher une classe…"}
              value={tab==="levels" ? levelsSearch : classSearch}
              onChange={(e) => {
                if (tab==="levels") setLevelsSearch(e.target.value);
                else { setClassSearch(e.target.value); setClassPage(1); }
              }}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all placeholder:opacity-50"
              style={{ background:T.inputBg, border:`1.5px solid ${T.inputBorder}`, color:T.textPrimary }}
              onFocus={(e) => (e.currentTarget.style.borderColor=COL.from)}
              onBlur={(e)  => (e.currentTarget.style.borderColor=T.inputBorder)} />
          </div>

          {/* Filtre niveau (tab classes seulement) */}
          {tab==="classes" && (
            <select value={levelFilter} onChange={(e) => { setLevelFilter(e.target.value); setClassPage(1); }}
              className="px-4 py-2.5 text-sm rounded-xl outline-none transition-all"
              style={{
                background:T.inputBg, border:`1.5px solid ${T.inputBorder}`,
                color:levelFilter?T.textPrimary:T.textMuted, minWidth:180,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor=COL.from)}
              onBlur={(e)  => (e.currentTarget.style.borderColor=T.inputBorder)}>
              <option value="">Tous les niveaux</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          )}

          {/* Compteur résultats */}
          <div className="flex items-center gap-2 px-4 rounded-xl text-sm font-bold"
            style={{ background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, color:T.textMuted }}>
            <span style={{ color:COL.from, fontVariantNumeric:"tabular-nums" }}>
              {tab==="levels" ? filteredLevels.length : visibleClasses.length}
            </span>
            {tab==="levels" ? "niveau(x)" : "classe(s)"}
          </div>
        </div>

        {/* ───────── TAB NIVEAUX ───────── */}
        {tab === "levels" && (
          <>
            {levelsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-2xl animate-pulse h-40"
                    style={{ background:T.cardBg, border:`1px solid ${T.cardBorder}` }} />
                ))}
              </div>
            ) : filteredLevels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 rounded-2xl gap-3"
                style={{ border:`2px dashed ${COL.from}44`, background:dark?COL.darkBg:COL.lightBg }}>
                <FaLayerGroup style={{ width:40,height:40,color:COL.from,opacity:0.4 }} />
                <p className="font-black" style={{ color:T.textSecondary }}>
                  {levelsSearch ? "Aucun niveau trouvé" : "Aucun niveau créé"}
                </p>
                {!levelsSearch && (
                  <button onClick={() => openLevelModal()}
                    className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white transition-all active:scale-95"
                    style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 4px 12px ${COL.shadow}` }}>
                    <FaPlus style={{ width:12,height:12 }} /> Créer le premier niveau
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredLevels.map((lvl, i) => (
                  <LevelCard key={lvl.id} level={lvl}
                    classCount={classCountByLevel[lvl.id] ?? 0}
                    onEdit={openLevelModal} onDelete={deleteLevel}
                    style={{ animation:`fadeUp .3s ease-out ${i*35}ms both` }} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ───────── TAB CLASSES ───────── */}
        {tab === "classes" && (
          <div className="rounded-2xl overflow-hidden"
            style={{ background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, boxShadow:T.cardShadow }}>

            {/* Header tableau */}
            <div className="grid px-6 py-3.5"
              style={{ gridTemplateColumns:"1fr 180px 110px", background:T.tableHead, borderBottom:`1px solid ${T.divider}` }}>
              {["Classe","Niveau","Actions"].map((h,i) => (
                <p key={i} className="text-[10px] font-black uppercase tracking-widest"
                  style={{ color:T.textMuted, textAlign:i===2?"right":"left" }}>{h}</p>
              ))}
            </div>

            {/* Contenu */}
            {classesLoading ? (
              <div className="py-16 flex flex-col items-center gap-4" style={{ color:T.textMuted }}>
                <FaSyncAlt style={{ width:26,height:26 }} className="animate-spin" />
                <p className="text-sm">Chargement…</p>
              </div>
            ) : currentPageClasses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <FaChalkboardTeacher style={{ width:36,height:36,color:COL.from,opacity:0.35 }} />
                <p className="font-black" style={{ color:T.textSecondary }}>
                  {classSearch||levelFilter ? "Aucune classe pour ces filtres" : "Aucune classe créée"}
                </p>
                {!classSearch && !levelFilter && (
                  <button onClick={() => openClassModal()}
                    className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white transition-all active:scale-95"
                    style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 4px 12px ${COL.shadow}` }}>
                    <FaPlus style={{ width:12,height:12 }} /> Créer la première classe
                  </button>
                )}
              </div>
            ) : (
              currentPageClasses.map((cls, idx) => (
                <ClassRow key={cls.id} cls={cls}
                  onView={openViewDetails}
                  onEdit={openClassModal}
                  onDelete={deleteClass}
                  isLast={idx === currentPageClasses.length-1} />
              ))
            )}

            {/* Footer pagination */}
            {classTotalPages > 1 && (
              <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
                style={{ borderTop:`1px solid ${T.divider}`, background:T.tableHead }}>
                <p className="text-xs" style={{ color:T.textMuted }}>
                  {(classPage-1)*classPageSize+1}–{Math.min(classPage*classPageSize,visibleClasses.length)} sur {visibleClasses.length}
                </p>
                <div className="flex items-center gap-1.5">
                  {[
                    { icon:FaChevronLeft,  act:()=>setClassPage((p)=>p-1), dis:classPage<=1 },
                    { icon:FaChevronRight, act:()=>setClassPage((p)=>p+1), dis:classPage>=classTotalPages },
                  ].map(({ icon:Icon, act, dis }, i) => (
                    <button key={i} onClick={act} disabled={dis}
                      className="w-9 h-9 rounded-xl flex items-center justify-center transition-all focus:outline-none disabled:opacity-40"
                      style={{ background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, color:T.textSecondary }}
                      onMouseEnter={(e) => !dis && (e.currentTarget.style.borderColor=COL.from, e.currentTarget.style.color=COL.from)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor=T.cardBorder, e.currentTarget.style.color=T.textSecondary)}>
                      <Icon style={{ width:12,height:12 }} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ═══════════════ MODALS ═══════════════ */}

      {/* ── Modal Niveau ── */}
      <Modal isOpen={levelModal} onClose={() => setLevelModal(false)}
        title={levelTarget ? "Modifier le niveau" : "Nouveau niveau"}
        subtitle={levelTarget ? `Édition de « ${levelTarget.name} »` : "Créer un nouveau niveau scolaire"}
        icon={FaLayerGroup}>
        <div className="space-y-4">
          <div>
            <FieldLabel required>Nom du niveau</FieldLabel>
            <StyledInput
              placeholder="ex : Terminale, 3ème, CP…"
              value={levelName}
              onChange={(e) => setLevelName(e.target.value)}
              onKeyDown={(e) => e.key==="Enter" && submitLevel()}
              autoFocus />
          </div>
          <ModalFooter
            onCancel={() => setLevelModal(false)}
            onSave={submitLevel}
            saving={levelSaving}
            saveLabel={levelTarget ? "Sauvegarder" : "Créer le niveau"} />
        </div>
      </Modal>

      {/* ── Modal Classe ── */}
      <Modal isOpen={classModal} onClose={() => setClassModal(false)}
        title={classTarget ? "Modifier la classe" : "Nouvelle classe"}
        subtitle={classTarget ? `Édition de « ${classTarget.name} »` : "Associer à un niveau existant"}
        icon={FaChalkboardTeacher}>
        <div className="space-y-4">
          <div>
            <FieldLabel required>Nom de la classe</FieldLabel>
            <StyledInput
              placeholder="ex : Tle D, 6ème A, CP1…"
              value={classNameInput}
              onChange={(e) => setClassNameInput(e.target.value)}
              autoFocus />
          </div>
          <div>
            <FieldLabel required>Niveau associé</FieldLabel>
            <StyledSelect value={classLevelId} onChange={(e) => setClassLevelId(e.target.value)}>
              <option value="" disabled>— Choisir un niveau —</option>
              {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </StyledSelect>
          </div>
          <ModalFooter
            onCancel={() => setClassModal(false)}
            onSave={submitClass}
            saving={classSaving}
            saveLabel={classTarget ? "Sauvegarder" : "Créer la classe"} />
        </div>
      </Modal>

      {/* ── Modal Détails classe ── */}
      <Modal isOpen={viewModal} onClose={() => setViewModal(false)}
        title={viewTarget?.name ?? "Détails"}
        subtitle={`Niveau : ${viewTarget?.level?.name ?? "—"}`}
        icon={FaEye}
        wide>
        {loadingDetail ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4" style={{ color:T.textMuted }}>
            <FaSyncAlt style={{ width:28,height:28 }} className="animate-spin" />
            <p className="text-sm font-medium">Chargement des données…</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">

            {/* ── Colonne Enseignants ── */}
            <div className="flex flex-col gap-4">
              {/* Section header */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background:`linear-gradient(135deg,${COL_TEACH.from}22,${COL_TEACH.to}11)`, color:COL_TEACH.from }}>
                  <FaChalkboardTeacher style={{ width:16,height:16 }} />
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color:T.textPrimary }}>Enseignants</p>
                  <p className="text-xs" style={{ color:T.textMuted }}>{detailTeachers.length} assigné{detailTeachers.length!==1?"s":""}</p>
                </div>
                <span className="ml-auto text-xs font-black px-2.5 py-1 rounded-full"
                  style={{ background:dark?COL_TEACH.darkBg:COL_TEACH.lightBg, color:COL_TEACH.text, border:`1px solid ${COL_TEACH.from}44` }}>
                  {detailTeachers.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar" style={{ maxHeight:360 }}>
                {detailTeachers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 rounded-xl gap-2"
                    style={{ border:`2px dashed ${COL_TEACH.from}33`, background:dark?COL_TEACH.darkBg:COL_TEACH.lightBg }}>
                    <FaChalkboardTeacher style={{ width:28,height:28,color:COL_TEACH.from,opacity:0.4 }} />
                    <p className="text-xs italic" style={{ color:T.textMuted }}>Aucun enseignant assigné.</p>
                  </div>
                ) : detailTeachers.map((t, i) => {
                  const name = personName(t);
                  return (
                    <div key={t.id}
                      className="flex items-center gap-3 p-3.5 rounded-xl transition-all duration-150"
                      style={{ background:T.cardBg, border:`1px solid ${T.cardBorder}` }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor=`${COL_TEACH.from}44`, e.currentTarget.style.background=dark?COL_TEACH.darkBg:COL_TEACH.lightBg)}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor=T.cardBorder, e.currentTarget.style.background=T.cardBg)}>
                      <MiniAvatar name={name} />
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-sm truncate" style={{ color:T.textPrimary }}>{name}</p>
                        <p className="text-xs truncate mt-0.5" style={{ color:T.textMuted }}>{t.subject?.name || "Matière inconnue"}</p>
                      </div>
                      {t.subject && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md flex-shrink-0"
                          style={{ background:dark?COL_TEACH.darkBg:COL_TEACH.lightBg, color:COL_TEACH.text, border:`1px solid ${COL_TEACH.from}33` }}>
                          {t.subject.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Colonne Étudiants ── */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background:`linear-gradient(135deg,${COL_STU.from}22,${COL_STU.to}11)`, color:COL_STU.from }}>
                  <FaUsers style={{ width:16,height:16 }} />
                </div>
                <div>
                  <p className="text-sm font-black" style={{ color:T.textPrimary }}>Élèves inscrits</p>
                  <p className="text-xs" style={{ color:T.textMuted }}>{detailStudents.length} élève{detailStudents.length!==1?"s":""}</p>
                </div>
                <span className="ml-auto text-xs font-black px-2.5 py-1 rounded-full"
                  style={{ background:dark?COL_STU.darkBg:COL_STU.lightBg, color:COL_STU.text, border:`1px solid ${COL_STU.from}44` }}>
                  {detailStudents.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar" style={{ maxHeight:360 }}>
                {detailStudents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 rounded-xl gap-2"
                    style={{ border:`2px dashed ${COL_STU.from}33`, background:dark?COL_STU.darkBg:COL_STU.lightBg }}>
                    <FaUsers style={{ width:28,height:28,color:COL_STU.from,opacity:0.4 }} />
                    <p className="text-xs italic" style={{ color:T.textMuted }}>Aucun élève inscrit.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {detailStudents.map((s) => {
                      const name = personName(s);
                      return (
                        <div key={s.id}
                          className="flex items-center gap-3 p-3.5 rounded-xl transition-all duration-150"
                          style={{ background:T.cardBg, border:`1px solid ${T.cardBorder}` }}
                          onMouseEnter={(e) => (e.currentTarget.style.borderColor=`${COL_STU.from}44`, e.currentTarget.style.background=dark?COL_STU.darkBg:COL_STU.lightBg)}
                          onMouseLeave={(e) => (e.currentTarget.style.borderColor=T.cardBorder, e.currentTarget.style.background=T.cardBg)}>
                          <MiniAvatar name={name} />
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-sm truncate" style={{ color:T.textPrimary }}>{name}</p>
                            <p className="text-[10px] font-mono flex items-center gap-1 mt-0.5" style={{ color:T.textMuted }}>
                              <FaIdBadge style={{ width:9,height:9 }} />
                              {s.registration_number || `#${s.id}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </Modal>

      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{BASE_KEYFRAMES}{`
        .custom-scrollbar::-webkit-scrollbar { width:4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:${COL.from}66; border-radius:10px; }
      `}</style>
    </div>
  );
};

/* ── Root avec ThemeCtx ── */
const LevelsAndClasses = () => {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("scol360_dark")==="true"; } catch { return false; } });
  const toggle = useCallback(() => { setDark((v) => { const n=!v; try{localStorage.setItem("scol360_dark",String(n));}catch{} return n; }); }, []);
  return <ThemeCtx.Provider value={{ dark, toggle }}><LevelsAndClassesInner /></ThemeCtx.Provider>;
};

export default LevelsAndClasses;