// src/pages/Parents.jsx
import React, { useEffect, useState, useMemo, useCallback, useContext, createContext } from "react";
import {
  FaSearch, FaSyncAlt, FaPlus, FaEdit, FaTrash,
  FaPhone, FaEnvelope, FaUserTie, FaChevronDown,
  FaTimes, FaCheck, FaGraduationCap, FaChevronLeft,
  FaChevronRight, FaMoon, FaSun, FaUsers,
  FaExclamationTriangle, FaAt,
} from "react-icons/fa";
import { fetchData, postData, patchData, deleteData } from "./api";

/* ═══════════════════════════════════════════════════════════
   DESIGN SYSTEM — identique au Dashboard
   (en prod, exporter ThemeCtx + tokens dans src/theme.js)
═══════════════════════════════════════════════════════════ */

export const ThemeCtx = createContext({ dark: false, toggle: () => {} });
export const useTheme = () => useContext(ThemeCtx);

// Couleur de section : Personnel → orange / rouge
const COL = {
  from:    "#f97316",
  to:      "#ef4444",
  mid:     "#fb923c",
  text:    "#f97316",
  lightBg: "#fff7ed",
  darkBg:  "#2a1006",
  shadow:  "#f9731640",
};

const LIGHT = {
  pageBg:        "#f1f3f9",
  cardBg:        "#ffffff",
  cardBorder:    "rgba(0,0,0,0.07)",
  cardShadow:    "0 2px 10px rgba(0,0,0,0.05)",
  cardShadowHov: "0 8px 28px rgba(0,0,0,0.12)",
  headerBg:      "rgba(241,243,249,0.88)",
  divider:       "rgba(0,0,0,0.06)",
  textPrimary:   "#0f172a",
  textSecondary: "#475569",
  textMuted:     "#94a3b8",
  inputBg:       "#f8fafc",
  inputBorder:   "#e2e8f0",
  inputFocus:    "#f97316",
  rowHover:      "#fffbf7",
  expandedBg:    "#fff9f5",
  tableHead:     "#fdf4ef",
  tagBg:         "#fff7ed",
  tagBorder:     "#fed7aa",
  tagText:       "#c2410c",
};

const DARK = {
  pageBg:        "#0d1117",
  cardBg:        "#161b27",
  cardBorder:    "rgba(255,255,255,0.07)",
  cardShadow:    "0 2px 12px rgba(0,0,0,0.4)",
  cardShadowHov: "0 8px 28px rgba(0,0,0,0.6)",
  headerBg:      "rgba(13,17,23,0.9)",
  divider:       "rgba(255,255,255,0.05)",
  textPrimary:   "#e8eaf0",
  textSecondary: "#8892a4",
  textMuted:     "#4e5668",
  inputBg:       "#0d1117",
  inputBorder:   "rgba(255,255,255,0.08)",
  inputFocus:    "#f97316",
  rowHover:      "#1a1f2e",
  expandedBg:    "#111620",
  tableHead:     "#0f1420",
  tagBg:         "#2a1006",
  tagBorder:     "#7c2d12",
  tagText:       "#fb923c",
};

/* ═══════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════ */
const getFullName = (obj) => {
  if (!obj) return "—";
  if (obj.user) {
    const f = obj.user.first_name || obj.user.firstname || "";
    const l = obj.user.last_name  || obj.user.lastname  || "";
    if (f || l) return `${f} ${l}`.trim();
    return obj.user.username || "Utilisateur";
  }
  const f = obj.first_name || obj.firstname || "";
  const l = obj.last_name  || obj.lastname  || "";
  if (f || l) return `${f} ${l}`.trim();
  return obj.username || "—";
};

// Génère une couleur avatar déterministe à partir du nom
const AVATAR_GRADIENTS = [
  ["#f97316","#ef4444"],
  ["#6366f1","#8b5cf6"],
  ["#0ea5e9","#06b6d4"],
  ["#10b981","#14b8a6"],
  ["#f59e0b","#f97316"],
  ["#db2777","#f9a8d4"],
  ["#8b5cf6","#6366f1"],
  ["#0d9488","#10b981"],
];
const avatarGradient = (name) =>
  AVATAR_GRADIENTS[((name || "?").charCodeAt(0) || 0) % AVATAR_GRADIENTS.length];

/* ═══════════════════════════════════════════════════════════
   COMPOSANTS ATOMIQUES
═══════════════════════════════════════════════════════════ */

// Avatar coloré avec initiales
const Avatar = ({ name, size = 42 }) => {
  const initials = (name || "?")
    .split(" ")
    .map((n) => (n ? n[0] : ""))
    .join("")
    .substring(0, 2)
    .toUpperCase();
  const [from, to] = avatarGradient(name);
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center font-black select-none"
      style={{
        width: size, height: size,
        borderRadius: size * 0.28,
        background: `linear-gradient(135deg, ${from}, ${to})`,
        boxShadow: `0 4px 12px ${from}55`,
        color: "#fff",
        fontSize: size * 0.34,
      }}
    >
      {initials}
    </div>
  );
};

// Skeleton loader
const SkeletonRow = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div
      className="rounded-2xl p-4 animate-pulse flex items-center gap-4"
      style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}
    >
      <div className="w-11 h-11 rounded-xl flex-shrink-0" style={{ background: T.divider }} />
      <div className="flex-1 space-y-2">
        <div className="h-3 rounded w-1/3" style={{ background: T.divider }} />
        <div className="h-2.5 rounded w-1/4" style={{ background: T.divider }} />
      </div>
      <div className="h-3 w-16 rounded" style={{ background: T.divider }} />
      <div className="h-3 w-12 rounded" style={{ background: T.divider }} />
    </div>
  );
};

// Toggle dark mode
const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={dark ? "Mode clair" : "Mode sombre"}
      className="relative w-13 h-7 rounded-full focus:outline-none transition-all duration-300 flex-shrink-0"
      style={{
        width: 52,
        background: dark
          ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
          : `linear-gradient(135deg, ${COL.from}, ${COL.to})`,
        boxShadow: hov
          ? dark ? "0 0 18px #6366f199" : `0 0 18px ${COL.shadow}`
          : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <div
        className="absolute top-0.5 w-6 h-6 rounded-full bg-white flex items-center justify-center transition-all duration-300"
        style={{ left: dark ? "calc(100% - 26px)" : "2px", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}
      >
        {dark
          ? <FaMoon  className="w-3 h-3" style={{ color: "#6366f1" }} />
          : <FaSun   className="w-3 h-3" style={{ color: COL.from }} />
        }
      </div>
    </button>
  );
};

// Bouton icône générique
const IconBtn = ({ onClick, title, icon: Icon, hoverColor = COL.from, hoverBg }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 focus:outline-none"
      style={{
        color: hov ? hoverColor : T.textMuted,
        background: hov ? (hoverBg || hoverColor + "18") : "transparent",
      }}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════
   MODAL
═══════════════════════════════════════════════════════════ */
const Modal = ({ isOpen, onClose, title, isEdit, children }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(2,6,23,.7)", backdropFilter: "blur(8px)", animation: "fadeIn .18s ease-out" }}
    >
      <div
        className="w-full max-w-lg flex flex-col overflow-hidden"
        style={{
          background: T.cardBg,
          borderRadius: 20,
          boxShadow: "0 24px 64px rgba(0,0,0,.35)",
          border: `1px solid ${T.cardBorder}`,
          maxHeight: "90vh",
          animation: "panelUp .28s cubic-bezier(.34,1.4,.64,1)",
        }}
      >
        {/* Barre colorée */}
        <div
          className="h-1.5 w-full flex-shrink-0"
          style={{ background: `linear-gradient(90deg, ${COL.from}, ${COL.to})` }}
        />

        {/* Header modal */}
        <div
          className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: `1px solid ${T.divider}` }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${COL.from}, ${COL.to})`, boxShadow: `0 4px 12px ${COL.shadow}` }}
            >
              <FaUserTie className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black" style={{ color: T.textPrimary }}>{title}</h3>
              <p className="text-xs" style={{ color: T.textMuted }}>
                {isEdit ? "Modifier les informations du parent" : "Créer un nouveau compte parent"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-150 focus:outline-none"
            style={{ color: T.textMuted }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#ef444418"; e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.textMuted; }}
          >
            <FaTimes className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// Champ de formulaire
const FormField = ({ label, required, sublabel, error, children }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: T.textSecondary }}>{label}</label>
        {required && <span className="text-[10px] font-bold" style={{ color: COL.from }}>*</span>}
        {sublabel && <span className="text-[10px] italic" style={{ color: T.textMuted }}>{sublabel}</span>}
      </div>
      {children}
      {error && (
        <p className="mt-1 text-[11px] flex items-center gap-1 font-medium" style={{ color: "#ef4444" }}>
          <FaExclamationTriangle className="w-2.5 h-2.5" />{error}
        </p>
      )}
    </div>
  );
};

const TextInput = ({ icon: Icon, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      {Icon && (
        <span
          className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-150"
          style={{ color: focused ? COL.from : T.textMuted }}
        >
          <Icon className="w-3.5 h-3.5" />
        </span>
      )}
      <input
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
        className="w-full py-2.5 text-sm rounded-xl outline-none transition-all duration-150 placeholder:opacity-40"
        style={{
          paddingLeft:  Icon ? "2.5rem" : "1rem",
          paddingRight: "1rem",
          background:   T.inputBg,
          border:       `1.5px solid ${focused ? COL.from : T.inputBorder}`,
          boxShadow:    focused ? `0 0 0 3px ${COL.from}22` : "none",
          color:        T.textPrimary,
        }}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   PARENT ROW CARD — expandable
═══════════════════════════════════════════════════════════ */
const ParentRow = ({ parent, isExpanded, onToggle, onEdit, onDelete }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const fullName = getFullName(parent);
  const children = parent.students || parent.children || [];
  const [hov, setHov] = useState(false);

  return (
    <div
      className="overflow-hidden transition-all duration-300"
      style={{
        background: T.cardBg,
        border: `1.5px solid ${isExpanded ? COL.from + "66" : hov ? COL.from + "33" : T.cardBorder}`,
        borderRadius: 16,
        boxShadow: isExpanded
          ? `0 8px 28px ${COL.shadow}, 0 0 0 1px ${COL.from}22`
          : hov ? T.cardShadowHov : T.cardShadow,
        transform: hov && !isExpanded ? "translateY(-1px)" : "translateY(0)",
        transition: "border-color .2s, box-shadow .2s, transform .2s",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* ── Main row ── */}
      <div
        className="px-5 py-4 grid gap-4 items-center cursor-pointer"
        style={{
          gridTemplateColumns: "1fr 1fr auto auto auto",
          background: isExpanded ? (dark ? `${COL.from}08` : `${COL.from}06`) : "transparent",
        }}
        onClick={onToggle}
      >
        {/* Identité */}
        <div className="flex items-center gap-3 min-w-0">
          <Avatar name={fullName} size={42} />
          <div className="min-w-0">
            <p className="text-sm font-black truncate" style={{ color: T.textPrimary }}>{fullName}</p>
            <p className="text-xs font-mono truncate mt-0.5" style={{ color: T.textMuted }}>
              #{parent.id} · {parent.user?.username || "—"}
            </p>
          </div>
        </div>

        {/* Contact */}
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs truncate" style={{ color: T.textSecondary }}>
            <FaPhone className="w-2.5 h-2.5 flex-shrink-0" style={{ color: COL.mid }} />
            {parent.phone || "—"}
          </div>
          <div className="flex items-center gap-1.5 text-xs truncate" style={{ color: T.textSecondary }}>
            <FaEnvelope className="w-2.5 h-2.5 flex-shrink-0" style={{ color: COL.mid }} />
            <span className="truncate">{parent.user?.email || "—"}</span>
          </div>
        </div>

        {/* Badge enfants */}
        <div className="flex justify-center">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black"
            style={{
              background: children.length > 0
                ? `linear-gradient(135deg, ${COL.from}22, ${COL.to}11)`
                : T.divider,
              color: children.length > 0 ? COL.text : T.textMuted,
              border: `1px solid ${children.length > 0 ? COL.from + "44" : T.cardBorder}`,
            }}
          >
            <FaGraduationCap className="w-3 h-3" />
            {children.length}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <IconBtn onClick={() => onEdit(parent)}   title="Modifier"   icon={FaEdit}  hoverColor="#f97316" />
          <IconBtn onClick={() => onDelete(parent.id)} title="Supprimer" icon={FaTrash} hoverColor="#ef4444" />
        </div>

        {/* Chevron */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
          style={{
            background: isExpanded ? `linear-gradient(135deg, ${COL.from}, ${COL.to})` : T.divider,
            boxShadow: isExpanded ? `0 4px 12px ${COL.shadow}` : "none",
            transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <FaChevronDown
            className="w-3 h-3"
            style={{ color: isExpanded ? "#fff" : T.textMuted }}
          />
        </div>
      </div>

      {/* ── Expanded panel : liste des enfants ── */}
      <div
        style={{
          maxHeight: isExpanded ? `${Math.max(children.length, 1) * 56 + 100}px` : "0px",
          opacity: isExpanded ? 1 : 0,
          overflow: "hidden",
          transition: "max-height .35s cubic-bezier(.4,0,.2,1), opacity .25s ease",
        }}
      >
        <div
          className="px-5 pb-5 pt-3"
          style={{ borderTop: `1px solid ${T.divider}`, background: T.expandedBg }}
        >
          {/* Titre section */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{
                background: `linear-gradient(135deg, ${COL.from}, ${COL.to})`,
                boxShadow: `0 0 8px ${COL.shadow}`,
              }}
            />
            <p className="text-xs font-black uppercase tracking-widest" style={{ color: T.textSecondary }}>
              Enfants associés
            </p>
            <span
              className="text-xs font-black px-1.5 py-0.5 rounded-md"
              style={{ background: dark ? COL.darkBg : COL.lightBg, color: COL.text }}
            >
              {children.length}
            </span>
            <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${COL.from}44, transparent)` }} />
          </div>

          {children.length > 0 ? (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: `1px solid ${T.cardBorder}` }}
            >
              <table className="w-full text-left text-sm">
                <thead>
                  <tr style={{ background: T.tableHead }}>
                    {["ID", "Prénom", "Nom", "Identifiant", "Classe"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest"
                        style={{ color: T.textMuted }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {children.map((child, idx) => {
                    const cFirst = child.user?.first_name || child.firstname || "—";
                    const cLast  = child.user?.last_name  || child.lastname  || "—";
                    return (
                      <tr
                        key={child.id}
                        style={{
                          background: idx % 2 === 0 ? T.cardBg : T.expandedBg,
                          borderTop: `1px solid ${T.divider}`,
                          transition: "background .15s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = T.rowHover)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? T.cardBg : T.expandedBg)}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs" style={{ color: T.textMuted }}>
                          {child.id}
                        </td>
                        <td className="px-4 py-2.5 font-semibold" style={{ color: T.textSecondary }}>{cFirst}</td>
                        <td className="px-4 py-2.5 font-black"     style={{ color: T.textPrimary  }}>{cLast}</td>
                        <td className="px-4 py-2.5 text-xs font-mono" style={{ color: T.textMuted }}>
                          {child.user?.username || child.username || "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="px-2.5 py-1 rounded-lg text-xs font-black"
                            style={{
                              background: dark ? COL.darkBg : COL.lightBg,
                              color: COL.text,
                              border: `1px solid ${COL.from}44`,
                            }}
                          >
                            {child.school_class?.name || "—"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="flex flex-col items-center justify-center py-6 rounded-xl gap-2"
              style={{
                border: `1.5px dashed ${COL.from}44`,
                background: dark ? COL.darkBg : COL.lightBg,
              }}
            >
              <FaGraduationCap className="w-5 h-5" style={{ color: COL.from, opacity: 0.5 }} />
              <p className="text-xs italic" style={{ color: T.textMuted }}>Aucun enfant associé à ce compte parent.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   PAGINATION
═══════════════════════════════════════════════════════════ */
const Pagination = ({ page, totalPages, onPrev, onNext, onFirst, onLast, pageInfoText }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  const PagBtn = ({ onClick, disabled, children, active }) => {
    const [hov, setHov] = useState(false);
    return (
      <button
        onClick={onClick}
        disabled={disabled}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        className="min-w-[36px] h-9 px-3 rounded-xl text-sm font-bold flex items-center justify-center transition-all duration-150 focus:outline-none disabled:opacity-40"
        style={{
          background: active
            ? `linear-gradient(135deg, ${COL.from}, ${COL.to})`
            : hov ? (dark ? "rgba(255,255,255,0.07)" : COL.lightBg) : T.cardBg,
          color: active ? "#fff" : hov ? COL.text : T.textSecondary,
          border: `1.5px solid ${active ? "transparent" : T.cardBorder}`,
          boxShadow: active ? `0 4px 12px ${COL.shadow}` : "none",
        }}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="flex items-center justify-between mt-6 flex-wrap gap-3">
      <p className="text-xs" style={{ color: T.textMuted }}>{pageInfoText}</p>
      <div className="flex items-center gap-1.5">
        <PagBtn onClick={onFirst} disabled={page <= 1}>«</PagBtn>
        <PagBtn onClick={onPrev}  disabled={page <= 1}><FaChevronLeft className="w-3 h-3" /></PagBtn>
        <PagBtn active>
          <span style={{ color: "#fff" }}>{page} / {totalPages}</span>
        </PagBtn>
        <PagBtn onClick={onNext}  disabled={page >= totalPages}><FaChevronRight className="w-3 h-3" /></PagBtn>
        <PagBtn onClick={onLast}  disabled={page >= totalPages}>»</PagBtn>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL — ParentsInner
═══════════════════════════════════════════════════════════ */
const ParentsInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  /* ── State données ── */
  const [parents,  setParents]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  /* ── State UI ── */
  const [query,          setQuery]          = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expandedId,     setExpandedId]     = useState(null);
  const [showModal,      setShowModal]      = useState(false);
  const [currentParent,  setCurrentParent]  = useState(null);

  /* ── Pagination ── */
  const [page,      setPage]      = useState(1);
  const [pageSize,  setPageSize]  = useState(10);
  const [count,     setCount]     = useState(0);

  /* ── Formulaire ── */
  const [formData,   setFormData]   = useState({ username:"", email:"", firstName:"", lastName:"", phone:"", password:"" });
  const [formErrors, setFormErrors] = useState({});

  /* ── URL builder ── */
  const buildEndpoint = useCallback((p = 1, q = "", ps = pageSize) => {
    const base = `/core/admin/parents/?page=${p}&page_size=${ps}`;
    return q ? `${base}&search=${encodeURIComponent(q)}` : base;
  }, [pageSize]);

  /* ── Debounce recherche ── */
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(query.trim()); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  /* ── Fetch ── */
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchData(buildEndpoint(page, debouncedQuery, pageSize))
      .then((data) => {
        if (!mounted) return;
        if (data && typeof data === "object" && Array.isArray(data.results)) {
          setParents(data.results);
          setCount(data.count ?? 0);
        } else if (Array.isArray(data)) {
          setParents(data);
          setCount(data.length);
        } else {
          setParents([]); setCount(0);
        }
      })
      .catch((err) => {
        console.error("[Parents] fetch error:", err);
        if (mounted) { setParents([]); setCount(0); }
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [page, pageSize, debouncedQuery, buildEndpoint]);

  /* ── Actions ── */
  const toggleExpand = useCallback((id) => setExpandedId((prev) => (prev === id ? null : id)), []);

  const openModal = useCallback((p = null) => {
    setCurrentParent(p);
    setFormData({
      username:  p?.user?.username  ?? p?.username  ?? "",
      email:     p?.user?.email     ?? p?.email     ?? "",
      firstName: p?.user?.first_name ?? p?.first_name ?? "",
      lastName:  p?.user?.last_name  ?? p?.last_name  ?? "",
      phone:     p?.phone ?? "",
      password:  "",
    });
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    setFormErrors({});
    if (!formData.firstName || !formData.lastName)
      return setFormErrors({ global: "Nom et Prénom sont requis." });
    setSaving(true);
    try {
      const userPayload = { email: formData.email, first_name: formData.firstName, last_name: formData.lastName };
      if (formData.password) userPayload.password = formData.password;
      if (currentParent) {
        await patchData(`/core/admin/parents/${currentParent.id}/`, { user: userPayload, phone: formData.phone || null });
      } else {
        const payload = {
          user: { ...userPayload, username: formData.username || `${formData.firstName}.${formData.lastName}`.toLowerCase() },
          phone: formData.phone || null,
        };
        await postData("/core/admin/parents/", payload);
        setPage(1);
      }
      setTimeout(() => setPage((p) => p), 150);
      setShowModal(false);
    } catch (err) {
      console.error("Erreur save parent:", err);
      setFormErrors({ global: "Erreur lors de l'enregistrement. Vérifiez les champs." });
    } finally {
      setSaving(false);
    }
  }, [currentParent, formData]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Supprimer ce parent ?")) return;
    try {
      await deleteData(`/core/admin/parents/${id}/`);
      const isLast = parents.length === 1 && page > 1;
      setPage(isLast ? page - 1 : page);
      setTimeout(() => setPage((p) => p), 100);
    } catch (err) {
      console.error("Erreur suppression:", err);
      alert("Erreur lors de la suppression.");
    }
  }, [parents.length, page]);

  const handleRefresh = useCallback(() => { setQuery(""); setDebouncedQuery(""); setPage(1); }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((count || 0) / pageSize)), [count, pageSize]);
  const pageInfoText = `${Math.min((page - 1) * pageSize + 1, count || 0)} – ${Math.min(page * pageSize, count || 0)} sur ${count || 0} parents`;

  /* ── Stats rapides ── */
  const statsCards = [
    { label: "Total",          value: count,                         icon: FaUsers    },
    { label: "Avec enfants",   value: parents.filter((p) => (p.students || p.children || []).length > 0).length, icon: FaGraduationCap },
    { label: "Cette page",     value: parents.length,                icon: FaUserTie  },
  ];

  return (
    <div
      className="min-h-screen pb-20 transition-colors duration-300"
      style={{ background: T.pageBg, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ══════════════════════════════
          HEADER STICKY
      ══════════════════════════════ */}
      <header
        className="sticky top-0 z-40 transition-colors duration-300"
        style={{
          background: T.headerBg,
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${T.divider}`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">

            {/* Titre */}
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${COL.from}, ${COL.to})`,
                  boxShadow: `0 6px 20px ${COL.shadow}`,
                }}
              >
                <FaUserTie className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight" style={{ color: T.textPrimary }}>
                  Parents & Tuteurs
                </h1>
                <p className="text-xs" style={{ color: T.textMuted }}>
                  Gestion des comptes parentaux
                </p>
              </div>
            </div>

            {/* Actions header */}
            <div className="flex items-center gap-2.5">
              <DarkToggle />

              {/* Sélecteur page size */}
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="h-9 px-2 rounded-xl text-xs font-bold outline-none focus:outline-none transition-all duration-150"
                style={{
                  background: T.cardBg,
                  border: `1.5px solid ${T.cardBorder}`,
                  color: T.textSecondary,
                }}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>

              {/* Rafraîchir */}
              <button
                onClick={handleRefresh}
                className="h-9 w-9 rounded-xl flex items-center justify-center transition-all duration-150 focus:outline-none"
                style={{ background: T.cardBg, border: `1.5px solid ${T.cardBorder}`, color: T.textSecondary }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = COL.from; e.currentTarget.style.color = COL.from; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = T.cardBorder; e.currentTarget.style.color = T.textSecondary; }}
              >
                <FaSyncAlt className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>

              {/* Nouveau parent */}
              <button
                onClick={() => openModal()}
                className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-black text-white transition-all duration-150 focus:outline-none active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${COL.from}, ${COL.to})`,
                  boxShadow: `0 4px 14px ${COL.shadow}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 6px 20px ${COL.shadow}`)}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = `0 4px 14px ${COL.shadow}`)}
              >
                <FaPlus className="w-3 h-3" />
                Nouveau parent
              </button>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="mt-4 relative max-w-2xl">
            <FaSearch
              className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
              style={{ color: T.textMuted }}
            />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              placeholder="Rechercher par nom, email, téléphone…"
              className="w-full py-2.5 pl-11 pr-4 text-sm rounded-xl outline-none transition-all duration-150 placeholder:opacity-50"
              style={{
                background: T.inputBg,
                border: `1.5px solid ${T.inputBorder}`,
                color: T.textPrimary,
              }}
              onFocus={(e)  => (e.currentTarget.style.borderColor = COL.from)}
              onBlur={(e)   => (e.currentTarget.style.borderColor = T.inputBorder)}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-all"
                style={{ background: T.divider, color: T.textMuted }}
              >
                <FaTimes className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ══════════════════════════════
          MAIN
      ══════════════════════════════ */}
      <main className="max-w-7xl mx-auto px-6 py-6">

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {statsCards.map((s, i) => (
            <div
              key={i}
              className="rounded-2xl p-4 flex items-center gap-4"
              style={{
                background: T.cardBg,
                border: `1.5px solid ${T.cardBorder}`,
                boxShadow: T.cardShadow,
              }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: `linear-gradient(135deg, ${COL.from}22, ${COL.to}11)`,
                  color: COL.from,
                }}
              >
                <s.icon className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ color: T.textPrimary }}>{s.value ?? "—"}</p>
                <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Colonne headers (desktop) ── */}
        <div
          className="hidden md:grid gap-4 px-5 py-2 mb-2"
          style={{ gridTemplateColumns: "1fr 1fr auto auto auto", color: T.textMuted }}
        >
          {["Parent", "Contact", "Enfants", "Actions", ""].map((h, i) => (
            <p key={i} className="text-[10px] font-black uppercase tracking-widest"
              style={{ textAlign: i >= 2 ? "center" : "left" }}
            >{h}</p>
          ))}
        </div>

        {/* ── Liste ── */}
        <div className="space-y-3">
          {loading ? (
            [...Array(pageSize > 5 ? 5 : pageSize)].map((_, i) => <SkeletonRow key={i} />)
          ) : parents.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 rounded-2xl gap-3"
              style={{ border: `2px dashed ${COL.from}44`, background: dark ? COL.darkBg : COL.lightBg }}
            >
              <FaUserTie className="w-10 h-10" style={{ color: COL.from, opacity: 0.4 }} />
              <p className="font-black" style={{ color: T.textSecondary }}>
                {query ? "Aucun résultat pour cette recherche" : "Aucun parent enregistré"}
              </p>
              {!query && (
                <button
                  onClick={() => openModal()}
                  className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white transition-all active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${COL.from}, ${COL.to})`, boxShadow: `0 4px 12px ${COL.shadow}` }}
                >
                  <FaPlus className="w-3 h-3" /> Créer le premier parent
                </button>
              )}
            </div>
          ) : (
            parents.map((parent, idx) => (
              <div key={parent.id} style={{ animation: `fadeUp .3s ease-out ${idx * 30}ms both` }}>
                <ParentRow
                  parent={parent}
                  isExpanded={expandedId === parent.id}
                  onToggle={() => toggleExpand(parent.id)}
                  onEdit={openModal}
                  onDelete={handleDelete}
                />
              </div>
            ))
          )}
        </div>

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <Pagination
            page={page}
            totalPages={totalPages}
            pageInfoText={pageInfoText}
            onPrev={()  => setPage((p) => Math.max(1, p - 1))}
            onNext={()  => setPage((p) => Math.min(totalPages, p + 1))}
            onFirst={() => setPage(1)}
            onLast={()  => setPage(totalPages)}
          />
        )}
      </main>

      {/* ══════════════════════════════
          MODAL FORM
      ══════════════════════════════ */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={currentParent ? "Modifier le parent" : "Nouveau parent"}
        isEdit={!!currentParent}
      >
        <div className="space-y-4">
          {formErrors.global && (
            <div
              className="flex items-start gap-2.5 p-3.5 rounded-xl text-sm"
              style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}
            >
              <FaExclamationTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              {formErrors.global}
            </div>
          )}

          {!currentParent && (
            <FormField label="Identifiant">
              <TextInput
                icon={FaAt}
                placeholder="Auto-généré si vide"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              />
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Prénom" required>
              <TextInput
                placeholder="ex : Ama"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </FormField>
            <FormField label="Nom" required>
              <TextInput
                placeholder="ex : Koffi"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </FormField>
          </div>

          <FormField label="Email">
            <TextInput
              icon={FaEnvelope}
              type="email"
              placeholder="parent@ecole.bj"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </FormField>

          <FormField label="Téléphone">
            <TextInput
              icon={FaPhone}
              placeholder="+229 97 00 00 00"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </FormField>

          <FormField
            label="Mot de passe"
            sublabel={currentParent ? "(laisser vide pour conserver)" : ""}
            required={!currentParent}
          >
            <TextInput
              type="password"
              placeholder={currentParent ? "••••••  (inchangé si vide)" : "Minimum 6 caractères"}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </FormField>

          {/* Footer boutons */}
          <div
            className="flex justify-end gap-3 pt-5 mt-2"
            style={{ borderTop: `1px solid ${dark ? DARK.divider : LIGHT.divider}` }}
          >
            <button
              onClick={() => setShowModal(false)}
              className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 focus:outline-none"
              style={{ color: dark ? DARK.textSecondary : LIGHT.textSecondary }}
              onMouseEnter={(e) => (e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black text-white transition-all duration-150 focus:outline-none active:scale-95 disabled:opacity-60"
              style={{
                background: `linear-gradient(135deg, ${COL.from}, ${COL.to})`,
                boxShadow: `0 4px 16px ${COL.shadow}`,
              }}
            >
              {saving
                ? <FaSyncAlt className="w-3.5 h-3.5 animate-spin" />
                : <FaCheck className="w-3.5 h-3.5" />
              }
              {saving ? "Enregistrement…" : currentParent ? "Sauvegarder" : "Créer le parent"}
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes panelUp { from { opacity:0; transform:scale(.96) translateY(12px); } to { opacity:1; transform:none; } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #f9731666; border-radius: 10px; }
      `}</style>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   ROOT — ThemeCtx + persistance localStorage
═══════════════════════════════════════════════════════════ */
const Parents = () => {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("scol360_dark") === "true"; } catch { return false; }
  });
  const toggle = useCallback(() => {
    setDark((v) => {
      const next = !v;
      try { localStorage.setItem("scol360_dark", String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <ThemeCtx.Provider value={{ dark, toggle }}>
      <ParentsInner />
    </ThemeCtx.Provider>
  );
};

export default Parents;