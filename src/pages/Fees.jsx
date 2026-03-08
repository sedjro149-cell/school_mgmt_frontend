// src/pages/StudentsWithFees.jsx
import React, {
  useCallback, useEffect, useRef, useState,
} from "react";
import {
  FaMoneyBillWave, FaUserGraduate, FaLayerGroup, FaSearch,
  FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaSyncAlt,
  FaWallet, FaReceipt, FaHistory, FaUniversity, FaMobileAlt,
  FaCoins, FaChevronDown, FaExclamationTriangle, FaMoon, FaSun,
  FaCalendarAlt, FaTag, FaShieldAlt, FaArrowRight,
} from "react-icons/fa";
import { fetchData, postData, patchData, deleteData } from "./api";
import {
  ThemeCtx, useTheme, LIGHT, DARK,
  SECTION_PALETTE, avatarGradient, BASE_KEYFRAMES,
} from "./theme";

const COL = SECTION_PALETTE.finance;

/* ──────────────────────────────────────────────────────────────
   UTILS
────────────────────────────────────────────────────────────── */
const formatCurrency = (v) => {
  if (v == null || v === "") return "0 FCFA";
  const n = Number(v);
  if (Number.isNaN(n)) return "0 FCFA";
  return n.toLocaleString("fr-FR", { minimumFractionDigits:0, maximumFractionDigits:0 }) + " FCFA";
};

const sName = (s) => {
  const fn = s?.user?.first_name || s?.firstname || "";
  const ln = s?.user?.last_name  || s?.lastname  || "";
  return `${fn} ${ln}`.trim() || s?.user?.username || `#${s?.id}`;
};

/* ──────────────────────────────────────────────────────────────
   DARK TOGGLE
────────────────────────────────────────────────────────────── */
const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button onClick={toggle}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
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

/* ──────────────────────────────────────────────────────────────
   TOAST
────────────────────────────────────────────────────────────── */
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

/* ──────────────────────────────────────────────────────────────
   MODAL
────────────────────────────────────────────────────────────── */
const Modal = ({ isOpen, onClose, title, accentColor, icon: Icon, children, width = 520, zIndex = 100 }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const ac = accentColor || COL.from;

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position:"fixed", inset:0, zIndex,
        background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:"16px", animation:"fadeIn .18s ease-out",
      }}>
      <div style={{
        width:"100%", maxWidth:width, maxHeight:"90vh",
        display:"flex", flexDirection:"column",
        background:T.cardBg, borderRadius:18, overflow:"hidden",
        boxShadow:"0 32px 80px rgba(0,0,0,.35)",
        animation:"panelUp .22s cubic-bezier(.34,1.4,.64,1)",
        border:`1.5px solid ${T.cardBorder}`,
      }}>
        <div style={{ height:4, background:`linear-gradient(90deg,${ac},${COL.to})`, flexShrink:0 }} />
        <div style={{
          display:"flex", alignItems:"center", gap:10, padding:"14px 18px",
          borderBottom:`1px solid ${T.divider}`, flexShrink:0,
          background: dark ? "rgba(255,255,255,0.02)" : `${ac}06`,
        }}>
          {Icon && (
            <div style={{
              width:32, height:32, borderRadius:9, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${ac},${COL.to})`,
              boxShadow:`0 4px 12px ${ac}44`,
            }}>
              <Icon style={{ width:13,height:13,color:"#fff" }} />
            </div>
          )}
          <h3 style={{ flex:1, fontSize:14, fontWeight:800, color:T.textPrimary }}>
            {title}
          </h3>
          <button onClick={onClose}
            style={{
              width:28, height:28, borderRadius:7, border:"none", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              background:"transparent", color:T.textMuted, transition:"all .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background="#ef444422"; e.currentTarget.style.color="#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
            <FaTimes style={{ width:11,height:11 }} />
          </button>
        </div>
        <div style={{
          flex:1, overflowY:"auto", padding:"18px",
          scrollbarWidth:"thin", scrollbarColor:`${COL.from} transparent`,
        }}>
          {children}
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   CONFIRM DIALOG
────────────────────────────────────────────────────────────── */
const ConfirmDialog = ({ open, message, onConfirm, onCancel, zIndex = 300 }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  if (!open) return null;
  return (
    <div style={{
      position:"fixed", inset:0, zIndex,
      background:"rgba(0,0,0,0.6)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:16, animation:"fadeIn .15s ease-out",
    }}>
      <div style={{
        width:"100%", maxWidth:360, borderRadius:16, overflow:"hidden",
        background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
        boxShadow:"0 24px 60px rgba(0,0,0,.3)",
        animation:"panelUp .2s cubic-bezier(.34,1.4,.64,1)",
      }}>
        <div style={{ height:3, background:"linear-gradient(90deg,#ef4444,#f97316)" }} />
        <div style={{ padding:"20px 20px 16px" }}>
          <div style={{
            width:40, height:40, borderRadius:12, margin:"0 0 12px",
            display:"flex", alignItems:"center", justifyContent:"center",
            background:"#ef444422",
          }}>
            <FaExclamationTriangle style={{ width:16,height:16,color:"#ef4444" }} />
          </div>
          <p style={{ fontSize:13, fontWeight:700, color:T.textPrimary, lineHeight:1.5 }}>
            {message}
          </p>
        </div>
        <div style={{
          display:"flex", gap:8, padding:"12px 20px 16px",
          borderTop:`1px solid ${T.divider}`,
        }}>
          <button onClick={onCancel}
            style={{
              flex:1, padding:"8px 14px", borderRadius:9,
              border:`1.5px solid ${T.cardBorder}`, background:"transparent",
              cursor:"pointer", fontSize:12, fontWeight:700, color:T.textSecondary,
            }}>
            Annuler
          </button>
          <button onClick={onConfirm}
            style={{
              flex:1, padding:"8px 14px", borderRadius:9, border:"none",
              background:"linear-gradient(135deg,#ef4444,#dc2626)",
              cursor:"pointer", fontSize:12, fontWeight:700, color:"#fff",
              boxShadow:"0 4px 12px #ef444455",
            }}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   STYLED SELECT
────────────────────────────────────────────────────────────── */
const Sel = ({ label, icon: Icon, children, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [f, setF] = useState(false);
  return (
    <div>
      {label && (
        <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
          letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>
          {label}
        </p>
      )}
      <div style={{ position:"relative" }}>
        {Icon && (
          <span style={{
            position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
            pointerEvents:"none", zIndex:1,
            color: f ? COL.from : T.textMuted, transition:"color .15s",
          }}>
            <Icon style={{ width:11,height:11 }} />
          </span>
        )}
        <select {...props}
          onFocus={(e) => { setF(true); props.onFocus?.(e); }}
          onBlur={(e)  => { setF(false); props.onBlur?.(e);  }}
          style={{
            width:"100%", appearance:"none",
            paddingLeft: Icon ? 30 : 12, paddingRight:26,
            paddingTop:9, paddingBottom:9,
            fontSize:12, borderRadius:10, outline:"none", transition:"all .15s",
            background:T.inputBg, color: props.value ? T.textPrimary : T.textMuted,
            border:`1.5px solid ${f ? COL.from : T.inputBorder}`,
            boxShadow: f ? `0 0 0 3px ${COL.from}22` : "none",
            cursor: props.disabled ? "not-allowed" : "pointer",
            opacity: props.disabled ? 0.5 : 1,
          }}>
          {children}
        </select>
        <FaChevronDown style={{
          position:"absolute", right:9, top:"50%", transform:"translateY(-50%)",
          width:8,height:8, color:T.textMuted, pointerEvents:"none",
        }} />
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   STYLED INPUT
────────────────────────────────────────────────────────────── */
const Input = ({ label, icon: Icon, accent, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [f, setF] = useState(false);
  const ac = accent || COL.from;
  return (
    <div>
      {label && (
        <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
          letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>
          {label}
        </p>
      )}
      <div style={{ position:"relative" }}>
        {Icon && (
          <span style={{
            position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
            pointerEvents:"none", color: f ? ac : T.textMuted, transition:"color .15s",
          }}>
            <Icon style={{ width:11,height:11 }} />
          </span>
        )}
        <input {...props}
          onFocus={(e) => { setF(true); props.onFocus?.(e); }}
          onBlur={(e)  => { setF(false); props.onBlur?.(e);  }}
          style={{
            width:"100%", boxSizing:"border-box",
            paddingLeft: Icon ? 30 : 12, paddingRight:12,
            paddingTop:9, paddingBottom:9,
            fontSize:12, borderRadius:10, outline:"none", transition:"all .15s",
            background:T.inputBg, color:T.textPrimary,
            border:`1.5px solid ${f ? ac : T.inputBorder}`,
            boxShadow: f ? `0 0 0 3px ${ac}22` : "none",
          }}
        />
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   STUDENT CARD
────────────────────────────────────────────────────────────── */
const StudentCard = ({ student, onOpenFees, animDelay }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [hov, setHov] = useState(false);
  const name = sName(student);
  const [gradFrom, gradTo] = avatarGradient(name);
  const initial = name[0]?.toUpperCase() || "?";
  const email = student.user?.email || "";
  const className = student.school_class?.name || "";

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius:14, overflow:"hidden", cursor:"default",
        background:T.cardBg,
        border:`1.5px solid ${hov ? COL.from+"66" : T.cardBorder}`,
        boxShadow: hov ? T.cardShadowHov : T.cardShadow,
        transform: hov ? "translateY(-2px)" : "none",
        transition:"all .2s",
        animation:`fadeUp .3s ease-out ${animDelay}ms both`,
        display:"flex", flexDirection:"column",
      }}>
      <div style={{ height:3, background:`linear-gradient(90deg,${gradFrom},${gradTo})` }} />
      <div style={{ padding:"14px 14px 12px", display:"flex", alignItems:"flex-start", gap:10 }}>
        <div style={{
          width:40, height:40, borderRadius:11, flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:15, fontWeight:900, color:"#fff",
          background:`linear-gradient(135deg,${gradFrom},${gradTo})`,
          boxShadow:`0 4px 10px ${gradFrom}44`,
          transition:"transform .2s",
          transform: hov ? "scale(1.08)" : "scale(1)",
        }}>
          {initial}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{
            fontSize:13, fontWeight:800, color:T.textPrimary,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", lineHeight:1.2,
          }}>
            {name}
          </p>
          {email && (
            <p style={{
              fontSize:10, color:T.textMuted, marginTop:2,
              overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
            }}>
              {email}
            </p>
          )}
          {className && (
            <span style={{
              display:"inline-block", marginTop:5, padding:"2px 8px",
              borderRadius:999, fontSize:10, fontWeight:700,
              background:`${gradFrom}18`, color:gradFrom, border:`1px solid ${gradFrom}33`,
            }}>
              {className}
            </span>
          )}
        </div>
      </div>
      <div style={{
        padding:"10px 14px", borderTop:`1px solid ${T.divider}`,
        background: hov ? (dark ? `${COL.from}10` : `${COL.from}07`) : "transparent",
        transition:"background .2s",
      }}>
        <button onClick={() => onOpenFees(student)}
          style={{
            width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:7,
            padding:"8px 12px", borderRadius:9, border:"none", cursor:"pointer",
            fontSize:11, fontWeight:800, transition:"all .15s",
            color: hov ? "#fff" : COL.from,
            background: hov
              ? `linear-gradient(135deg,${COL.from},${COL.to})`
              : (dark ? `${COL.from}18` : `${COL.from}11`),
            boxShadow: hov ? `0 4px 12px ${COL.shadow}` : "none",
          }}>
          <FaWallet style={{ width:11,height:11 }} />
          Dossier Financier
          <FaArrowRight style={{ width:9,height:9, marginLeft:"auto" }} />
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   STAT MINI CARD
────────────────────────────────────────────────────────────── */
const StatCard = ({ label, value, sub, color, icon: Icon, pct }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div style={{
      borderRadius:12, padding:"12px 14px",
      background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, boxShadow:T.cardShadow,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
        <div style={{
          width:28, height:28, borderRadius:8, flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          background:`${color}22`,
        }}>
          <Icon style={{ width:11,height:11,color }} />
        </div>
        <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
          letterSpacing:"0.08em", color:T.textMuted }}>
          {label}
        </p>
      </div>
      <p style={{ fontSize:18, fontWeight:900, color, lineHeight:1, marginBottom:4 }}>{value}</p>
      {sub && <p style={{ fontSize:10, color:T.textMuted }}>{sub}</p>}
      {pct !== undefined && (
        <div style={{ marginTop:8 }}>
          <div style={{ height:5, borderRadius:999, background:dark?"rgba(255,255,255,0.06)":"#f1f5f9" }}>
            <div style={{
              height:"100%", borderRadius:999,
              width:`${Math.min(100, pct)}%`,
              background:`linear-gradient(90deg,${color},${color}99)`,
              transition:"width .6s ease-out",
            }} />
          </div>
          <p style={{ fontSize:9, color:T.textMuted, marginTop:3 }}>{pct.toFixed(1)}% recouvré</p>
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   STATUS BADGE
────────────────────────────────────────────────────────────── */
const StatusBadge = ({ paid, overdue }) => {
  let bg, color, label;
  if (paid)        { bg="#10b98122"; color="#10b981"; label="PAYÉ"; }
  else if (overdue){ bg="#ef444422"; color="#ef4444"; label="EN RETARD"; }
  else             { bg="#f59e0b22"; color="#f59e0b"; label="IMPAYÉ"; }
  return (
    <span style={{
      padding:"3px 9px", borderRadius:999, fontSize:9, fontWeight:800,
      background:bg, color, border:`1px solid ${color}44`, letterSpacing:"0.05em",
    }}>
      {label}
    </span>
  );
};

/* ──────────────────────────────────────────────────────────────
   PAGE PRINCIPALE (inner)
────────────────────────────────────────────────────────────── */
const StudentsWithFeesInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  /* ── Référentiels ── */
  const [classes,  setClasses]  = useState([]);
  const [levels,   setLevels]   = useState([]); // ✅ FIX : niveaux séparés des classes
  const [feeTypes, setFeeTypes] = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  /* ── Liste étudiants ── */
  const [classStudents,   setClassStudents]   = useState([]);
  const [students,        setStudents]        = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [filterClassId,   setFilterClassId]   = useState("");
  const [filterStudentId, setFilterStudentId] = useState("");
  const [searchQ,         setSearchQ]         = useState("");
  const searchRef = useRef(null);

  /* ── Modal fees ── */
  const [feesOpen,        setFeesOpen]        = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [fees,            setFees]            = useState([]);
  const [loadingFees,     setLoadingFees]     = useState(false);
  const [feesShowAll,     setFeesShowAll]     = useState(true);
  const [feeForm, setFeeForm] = useState({ id:null, fee_type_id:"", amount:"", due_date:"" });

  /* ── Modal paiements ── */
  const [paymentsOpen,    setPaymentsOpen]    = useState(false);
  const [selectedFee,     setSelectedFee]     = useState(null);
  const [payments,        setPayments]        = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount:"", method:"CASH", reference:"", note:"" });

  /* ── Modal types frais ── */
  const [feeTypeOpen,    setFeeTypeOpen]    = useState(false);
  const [currentFeeType, setCurrentFeeType] = useState({ id:null, name:"", description:"", is_active:true });
  const [amountOpen,     setAmountOpen]     = useState(false);
  const [currentAmount,  setCurrentAmount]  = useState({ id:null, fee_type:null, level:"", amount:"", is_active:true });

  /* ── FeeTypes expandés (sidebar) ── */
  const [expandedFT, setExpandedFT] = useState(new Set());

  /* ── Confirm dialog ── */
  const [confirm, setConfirm] = useState({ open:false, message:"", onConfirm:null });

  /* ── Saving / Toast ── */
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState(null);
  const toast = (type, text) => setMsg({ type, text });

  /* ══ FETCHERS ══ */
  const fetchLookups = useCallback(async () => {
    try {
      // ✅ FIX : on charge aussi les niveaux (Level) séparément des classes
      const [cls, ft, lvl] = await Promise.all([
        fetchData("/academics/school-classes/"),
        fetchData("/fees/fee-types/"),
        fetchData("/academics/levels/"),
      ]);
      // Normalise : gère tableau direct OU réponse paginée { results: [...] }
      const toArray = (d) => {
        if (!d) return [];
        if (Array.isArray(d)) return d;
        if (Array.isArray(d.results)) return d.results;
        return [];
      };
      setClasses(toArray(cls));
      setFeeTypes(toArray(ft).map((f) => ({ ...f, amounts: f.amounts || f.amount_set || [] })));
      setLevels(toArray(lvl));
    } catch { toast("error", "Erreur chargement données."); }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const d = await fetchData("/fees/statistics/?validated=1");
      setStats(d || null);
    } catch { /* silencieux */ } finally { setLoadingStats(false); }
  }, []);

  useEffect(() => { fetchLookups(); fetchStats(); }, [fetchLookups, fetchStats]);

  /* ── Élèves par classe ── */
  useEffect(() => {
    let active = true;
    if (!filterClassId) { setClassStudents([]); setStudents([]); setFilterStudentId(""); return; }
    setLoadingStudents(true);
    fetchData(`/core/admin/students/by-class/${filterClassId}/`)
      .then((d) => { if (active) { const arr = d || []; setClassStudents(arr); setStudents(arr); }})
      .catch(() => toast("error", "Erreur chargement élèves."))
      .finally(() => { if (active) setLoadingStudents(false); });
    return () => { active = false; };
  }, [filterClassId]);

  /* ── Filtre/recherche local ── */
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      const q = searchQ.trim().toLowerCase();
      let list = classStudents;
      if (filterStudentId) list = list.filter((s) => String(s.id) === String(filterStudentId));
      if (q) list = list.filter((s) => sName(s).toLowerCase().includes(q) || (s.user?.username || "").toLowerCase().includes(q));
      setStudents(list);
    }, 200);
    return () => clearTimeout(searchRef.current);
  }, [searchQ, classStudents, filterStudentId]);

  /* ── Frais ── */
  const fetchFees = useCallback(async (studentId, unpaidOnly = false) => {
    setLoadingFees(true);
    try {
      const params = new URLSearchParams({ student: String(studentId) });
      if (unpaidOnly) params.set("paid", "0");
      const raw = await fetchData(`/fees/fees/?${params}`);
      setFees((raw || []).map((f) => {
        const paid = Number(f.total_paid ?? f.paid_amount ?? 0);
        const amount = Number(f.amount || 0);
        // ✅ FIX : total_remaining vient de l'API (annoté) ; fallback seulement si absent
        const remaining = f.total_remaining != null
          ? Math.max(0, Number(f.total_remaining))
          : Math.max(0, amount - paid);
        return { ...f, total_paid: paid, total_remaining: remaining };
      }));
    } catch { toast("error", "Impossible de charger les frais."); }
    finally { setLoadingFees(false); }
  }, []);

  const openFeesForStudent = async (student) => {
    setSelectedStudent(student);
    setFeeForm({ id:null, fee_type_id:"", amount:"", due_date:"" });
    setFees([]);
    setFeesShowAll(true);
    setFeesOpen(true);
    await fetchFees(student.id, false);
  };

  const submitFee = async () => {
    if (!selectedStudent) return;
    if (!feeForm.fee_type_id) return toast("error", "Veuillez choisir un type de frais.");
    setSaving(true);
    try {
      if (feeForm.id) {
        // PATCH : on modifie seulement montant et échéance
        // ✅ FIX : ne pas envoyer fee_type ni student en modification
        const payload = {
          amount:   feeForm.amount   || undefined,
          due_date: feeForm.due_date || null,
        };
        await patchData(`/fees/fees/${feeForm.id}/`, payload);
      } else {
        // POST : création
        // ✅ FIX 1 : utiliser student_id (champ write-only du serializer)
        // ✅ FIX 2 : utiliser fee_type (nom exact du champ serializer, pas fee_type_id)
        const payload = {
          student_id:  selectedStudent.id,
          fee_type:    feeForm.fee_type_id,
          amount:      feeForm.amount   || undefined,
          due_date:    feeForm.due_date || null,
        };
        await postData("/fees/fees/", payload);
      }
      toast("success", feeForm.id ? "Frais modifié." : "Frais attribué.");
      setFeeForm({ id:null, fee_type_id:"", amount:"", due_date:"" });
      await fetchFees(selectedStudent.id, !feesShowAll);
      fetchStats();
    } catch (err) {
      // Afficher le détail de l'erreur backend si disponible
      const detail = err?.response?.data?.detail
        || (typeof err?.response?.data === "object" ? JSON.stringify(err.response.data) : null)
        || "Erreur lors de l'enregistrement.";
      toast("error", detail);
    }
    finally { setSaving(false); }
  };

  const deleteFee = (feeId) => {
    setConfirm({
      open: true,
      message: "Supprimer ce frais ? Cette action est irréversible.",
      onConfirm: async () => {
        setConfirm({ open:false });
        try {
          await deleteData(`/fees/fees/${feeId}/`);
          toast("success", "Frais supprimé.");
          if (selectedStudent) await fetchFees(selectedStudent.id, !feesShowAll);
          fetchStats();
        } catch { toast("error", "Impossible de supprimer ce frais."); }
      },
    });
  };

  /* ── Paiements ── */
  const fetchPayments = async (feeId) => {
    setLoadingPayments(true);
    try {
      const res = await fetchData(`/fees/payments/?fee=${feeId}`);
      setPayments((res || []).map((p) => ({
        ...p,
        payment_date: p.paid_at ?? p.validated_at ?? p.payment_date ?? p.created_at,
        validated: typeof p.validated === "boolean" ? p.validated : !!p.validated,
      })));
    } catch { toast("error", "Erreur chargement paiements."); }
    finally { setLoadingPayments(false); }
  };

  const openPaymentsForFee = async (fee) => {
    setSelectedFee(fee);
    const remaining = Math.max(0, fee.total_remaining ?? 0);
    setPaymentForm({ amount: remaining > 0 ? String(remaining) : "", method:"CASH", reference:"", note:"" });
    setPayments([]);
    setPaymentsOpen(true);
    await fetchPayments(fee.id);
  };

  const submitPayment = async () => {
    if (!selectedFee) return toast("error", "Aucun frais sélectionné.");
    if (!paymentForm.amount) return toast("error", "Le montant est requis.");
    setSaving(true);
    try {
      await postData("/fees/payments/", {
        fee:       selectedFee.id,
        amount:    paymentForm.amount,
        method:    paymentForm.method || "CASH",
        reference: paymentForm.reference || "",
        note:      paymentForm.note || "",
      });
      toast("success", "Paiement enregistré !");
      await fetchPayments(selectedFee.id);
      if (selectedStudent) await fetchFees(selectedStudent.id, !feesShowAll);
      setPaymentForm({ amount:"", method:"CASH", reference:"", note:"" });
      fetchStats();
    } catch { toast("error", "Erreur lors du paiement."); }
    finally { setSaving(false); }
  };

  /* ── Fee Types config ── */
  const submitFeeType = async () => {
    if (!currentFeeType.name.trim()) return toast("error", "Le nom est requis.");
    setSaving(true);
    try {
      if (currentFeeType.id) await patchData(`/fees/fee-types/${currentFeeType.id}/`, currentFeeType);
      else                   await postData("/fees/fee-types/", currentFeeType);
      toast("success", currentFeeType.id ? "Type modifié." : "Type créé.");
      setFeeTypeOpen(false);
      await fetchLookups();
    } catch { toast("error", "Erreur enregistrement type."); }
    finally { setSaving(false); }
  };

  const submitAmount = async () => {
    // ✅ FIX : level est l'ID d'un Level, pas d'une classe
    if (!currentAmount.amount || !currentAmount.level) return toast("error", "Niveau et montant requis.");
    setSaving(true);
    try {
      // Payload pour FeeTypeAmountSerializer : { fee_type, level, amount, is_active }
      const payload = {
        fee_type:  currentAmount.fee_type,
        level:     currentAmount.level,   // ID du Level (pas SchoolClass)
        amount:    currentAmount.amount,
        is_active: currentAmount.is_active,
      };
      if (currentAmount.id) await patchData(`/fees/fee-type-amounts/${currentAmount.id}/`, payload);
      else                  await postData("/fees/fee-type-amounts/", payload);
      toast("success", currentAmount.id ? "Montant mis à jour." : "Montant ajouté.");
      setAmountOpen(false);
      await fetchLookups();
    } catch (err) {
      const detail = err?.response?.data?.detail
        || (typeof err?.response?.data === "object" ? JSON.stringify(err.response.data) : null)
        || "Erreur enregistrement montant.";
      toast("error", detail);
    }
    finally { setSaving(false); }
  };

  /* ── Stats calcul ── */
  const expected  = stats ? Number(stats.global?.total_expected ?? stats.global?.total_due ?? 0) : 0;
  const totalPaid = stats ? Number(stats.global?.total_paid ?? 0) : 0;
  const remaining = Math.max(0, expected - totalPaid);
  const pct       = expected > 0 ? (totalPaid / expected) * 100 : 0;

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div style={{ minHeight:"100vh", background:T.pageBg, transition:"background .3s",
      fontFamily:"'Plus Jakarta Sans', sans-serif", paddingBottom:60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ═══ HEADER ═══ */}
      <header style={{
        position:"sticky", top:0, zIndex:40,
        background:T.headerBg, backdropFilter:"blur(16px)",
        borderBottom:`1px solid ${T.divider}`, transition:"all .3s",
      }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"11px 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:40, height:40, borderRadius:12, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 6px 18px ${COL.shadow}`,
            }}>
              <FaMoneyBillWave style={{ width:16,height:16,color:"#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize:16, fontWeight:900, color:T.textPrimary, letterSpacing:"-0.02em" }}>
                Comptabilité
              </h1>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>
                Suivi des frais et paiements par élève
              </p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={() => { fetchLookups(); fetchStats(); }}
              style={{
                width:34, height:34, borderRadius:9, border:`1.5px solid ${T.cardBorder}`,
                background:"transparent", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                color:T.textMuted, transition:"all .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor=COL.from; e.currentTarget.style.color=COL.from; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor=T.cardBorder; e.currentTarget.style.color=T.textMuted; }}>
              <FaSyncAlt style={{ width:12,height:12 }} className={loadingStats?"animate-spin":""} />
            </button>
            <DarkToggle />
          </div>
        </div>
      </header>

      {/* ═══ MAIN LAYOUT ═══ */}
      <div style={{ maxWidth:1280, margin:"0 auto", padding:"20px 24px", display:"grid",
        gridTemplateColumns:"1fr 300px", gap:20, alignItems:"start" }}>

        {/* ── COLONNE GAUCHE ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Filtres */}
          <div style={{
            borderRadius:14, padding:"14px 18px",
            background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, boxShadow:T.cardShadow,
          }}>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
              <Sel label="Classe" icon={FaLayerGroup}
                value={filterClassId} onChange={(e) => setFilterClassId(e.target.value)}>
                <option value="">— Choisir une classe —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Sel>

              <div style={{ opacity: filterClassId ? 1 : 0.45, pointerEvents: filterClassId ? "auto" : "none", transition:"opacity .2s" }}>
                <Sel label="Filtrer élève" icon={FaUserGraduate}
                  value={filterStudentId} onChange={(e) => setFilterStudentId(e.target.value)}>
                  <option value="">Tous les élèves</option>
                  {classStudents.map((s) => <option key={s.id} value={s.id}>{sName(s)}</option>)}
                </Sel>
              </div>

              <div style={{ opacity: filterClassId ? 1 : 0.45, pointerEvents: filterClassId ? "auto" : "none", transition:"opacity .2s" }}>
                <Input label="Recherche" icon={FaSearch}
                  placeholder="Nom ou matricule…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)} />
              </div>
            </div>
          </div>

          {students.length > 0 && (
            <p style={{ fontSize:11, fontWeight:700, color:T.textMuted, paddingLeft:2 }}>
              {students.length} élève{students.length > 1 ? "s" : ""} affiché{students.length > 1 ? "s" : ""}
            </p>
          )}

          {/* Grille étudiants */}
          {loadingStudents ? (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{ height:130, borderRadius:14, background:T.cardBg }}
                  className="animate-pulse" />
              ))}
            </div>
          ) : !filterClassId ? (
            <div style={{
              borderRadius:16, padding:"64px 24px", textAlign:"center",
              background:T.cardBg, border:`2px dashed ${COL.from}44`,
              animation:"fadeUp .3s ease-out",
            }}>
              <div style={{
                width:60, height:60, borderRadius:18, margin:"0 auto 14px",
                display:"flex", alignItems:"center", justifyContent:"center",
                background:`linear-gradient(135deg,${COL.from}22,${COL.to}11)`,
              }}>
                <FaLayerGroup style={{ width:24,height:24,color:COL.from,opacity:.6 }} />
              </div>
              <p style={{ fontSize:15, fontWeight:800, color:T.textSecondary }}>
                Sélectionnez une classe
              </p>
              <p style={{ fontSize:12, color:T.textMuted, marginTop:6 }}>
                Les élèves s'afficheront ici pour gestion financière.
              </p>
            </div>
          ) : students.length === 0 ? (
            <div style={{
              borderRadius:14, padding:"48px 24px", textAlign:"center",
              background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
            }}>
              <p style={{ fontSize:13, color:T.textMuted }}>Aucun élève trouvé.</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {students.map((s, i) => (
                <StudentCard key={s.id} student={s}
                  onOpenFees={openFeesForStudent}
                  animDelay={i * 25} />
              ))}
            </div>
          )}
        </div>

        {/* ── COLONNE DROITE (sticky) ── */}
        <div style={{ position:"sticky", top:72, display:"flex", flexDirection:"column", gap:14 }}>

          {/* Stats */}
          <div style={{
            borderRadius:14, padding:"14px 16px",
            background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, boxShadow:T.cardShadow,
          }}>
            <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
              letterSpacing:"0.09em", color:T.textMuted, marginBottom:12 }}>
              Tableau de bord
            </p>
            {loadingStats ? (
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {[...Array(3)].map((_, i) => (
                  <div key={i} style={{ height:70, borderRadius:10, background:T.inputBg }}
                    className="animate-pulse" />
                ))}
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                <StatCard label="Total attendu" value={formatCurrency(expected)} icon={FaWallet} color={COL.from} />
                <StatCard label="Encaissé" value={formatCurrency(totalPaid)} icon={FaCheck} color="#10b981" pct={pct} />
                <StatCard label="Reste à recouvrer" value={formatCurrency(remaining)}
                  icon={FaHistory} color="#f59e0b" sub={`${(100 - pct).toFixed(1)}% restant`} />
              </div>
            )}
          </div>

          {/* Types de frais */}
          <div style={{
            borderRadius:14, overflow:"hidden",
            background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, boxShadow:T.cardShadow,
          }}>
            <div style={{
              padding:"12px 14px", borderBottom:`1px solid ${T.divider}`,
              display:"flex", alignItems:"center", justifyContent:"space-between",
              background: dark ? "rgba(255,255,255,0.02)" : `${COL.from}06`,
            }}>
              <p style={{ fontSize:11, fontWeight:800, color:T.textPrimary }}>Types de frais</p>
              <button
                onClick={() => { setCurrentFeeType({ id:null, name:"", description:"", is_active:true }); setFeeTypeOpen(true); }}
                style={{
                  display:"flex", alignItems:"center", gap:5, padding:"5px 10px",
                  borderRadius:8, border:"none", cursor:"pointer",
                  fontSize:10, fontWeight:800, color:"#fff",
                  background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                  boxShadow:`0 3px 8px ${COL.shadow}`,
                }}>
                <FaPlus style={{ width:8,height:8 }} /> Nouveau
              </button>
            </div>

            <div style={{ maxHeight:400, overflowY:"auto",
              scrollbarWidth:"thin", scrollbarColor:`${COL.from} transparent` }}>
              {feeTypes.length === 0 && (
                <p style={{ padding:"24px 14px", textAlign:"center", fontSize:12,
                  fontStyle:"italic", color:T.textMuted }}>
                  Aucun type configuré.
                </p>
              )}
              {feeTypes.map((ft) => {
                const exp = expandedFT.has(String(ft.id));
                return (
                  <div key={ft.id} style={{ borderBottom:`1px solid ${T.divider}` }}>
                    <div
                      onClick={() => setExpandedFT((p) => {
                        const c = new Set(p);
                        c.has(String(ft.id)) ? c.delete(String(ft.id)) : c.add(String(ft.id));
                        return c;
                      })}
                      style={{
                        padding:"10px 14px", cursor:"pointer",
                        display:"flex", alignItems:"center", gap:10, transition:"background .12s",
                        background: exp ? (dark ? `${COL.from}12` : `${COL.from}07`) : "transparent",
                      }}
                      onMouseEnter={(e) => !exp && (e.currentTarget.style.background=dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.015)")}
                      onMouseLeave={(e) => !exp && (e.currentTarget.style.background="transparent")}>
                      <div style={{
                        width:6, height:6, borderRadius:999, flexShrink:0,
                        background: ft.is_active ? "#10b981" : "#ef4444",
                        boxShadow: ft.is_active ? "0 0 6px #10b98188" : "0 0 6px #ef444488",
                      }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:12, fontWeight:700, color:T.textPrimary,
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {ft.name}
                        </p>
                        <p style={{ fontSize:10, color:T.textMuted, marginTop:1 }}>
                          {(ft.amounts || []).length} montant{(ft.amounts||[]).length > 1?"s":""}
                        </p>
                      </div>
                      <FaChevronDown style={{
                        width:8,height:8, color:T.textMuted, flexShrink:0,
                        transform: exp ? "rotate(180deg)" : "rotate(0)", transition:"transform .2s",
                      }} />
                    </div>

                    {exp && (
                      <div style={{
                        padding:"10px 14px",
                        background: dark ? "rgba(0,0,0,.15)" : "rgba(0,0,0,.015)",
                        borderTop:`1px solid ${T.divider}`,
                      }}>
                        <div style={{ display:"flex", gap:6, marginBottom:10 }}>
                          <button
                            onClick={() => { setCurrentFeeType(ft); setFeeTypeOpen(true); }}
                            style={{
                              flex:1, padding:"5px 8px", borderRadius:7,
                              border:`1.5px solid ${T.cardBorder}`, background:"transparent",
                              cursor:"pointer", fontSize:10, fontWeight:700, color:T.textSecondary,
                              display:"flex", alignItems:"center", justifyContent:"center", gap:4,
                            }}>
                            <FaEdit style={{ width:9,height:9 }} /> Modifier
                          </button>
                          <button
                            onClick={() => {
                              setCurrentAmount({ id:null, fee_type:ft.id, level:"", amount:"", is_active:true });
                              setAmountOpen(true);
                            }}
                            style={{
                              flex:1, padding:"5px 8px", borderRadius:7,
                              border:"none", cursor:"pointer",
                              fontSize:10, fontWeight:700, color:"#fff",
                              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                              display:"flex", alignItems:"center", justifyContent:"center", gap:4,
                            }}>
                            <FaPlus style={{ width:8,height:8 }} /> Montant
                          </button>
                        </div>

                        {(ft.amounts || []).map((a) => (
                          <div key={a.id} style={{
                            display:"flex", alignItems:"center", justifyContent:"space-between",
                            padding:"6px 9px", marginBottom:5, borderRadius:8,
                            background:T.cardBg, border:`1px solid ${T.cardBorder}`,
                          }}>
                            <span style={{ fontSize:11, fontWeight:700, color:T.textPrimary }}>
                              {a.level_name || a.level?.name || a.level}
                            </span>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontSize:10, fontWeight:800, color:COL.from,
                                fontVariantNumeric:"tabular-nums" }}>
                                {formatCurrency(a.amount)}
                              </span>
                              <button onClick={() => {
                                // ✅ FIX : pré-remplir avec l'ID du level (a.level est l'ID)
                                setCurrentAmount({
                                  id:        a.id,
                                  fee_type:  ft.id,
                                  level:     a.level,
                                  amount:    a.amount,
                                  is_active: a.is_active,
                                });
                                setAmountOpen(true);
                              }}
                                style={{
                                  width:22, height:22, borderRadius:6, border:"none",
                                  background:`${COL.from}18`, cursor:"pointer",
                                  display:"flex", alignItems:"center", justifyContent:"center",
                                  color:COL.from,
                                }}>
                                <FaEdit style={{ width:8,height:8 }} />
                              </button>
                            </div>
                          </div>
                        ))}
                        {(ft.amounts || []).length === 0 && (
                          <p style={{ fontSize:10, color:T.textMuted, textAlign:"center",
                            padding:"8px 0", fontStyle:"italic" }}>
                            Aucun montant défini.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MODALS
      ══════════════════════════════════════════════════════ */}

      {/* ─── MODAL DOSSIER FINANCIER (z=100) ─── */}
      <Modal isOpen={feesOpen} onClose={() => setFeesOpen(false)}
        title={selectedStudent ? `Dossier : ${sName(selectedStudent)}` : "Dossier Financier"}
        icon={FaWallet} width={900} zIndex={100}>
        {selectedStudent && (
          <div style={{ display:"flex", flexDirection:"column", gap:18 }}>

            {/* Bannière élève */}
            <div style={{
              borderRadius:12, padding:"14px 18px",
              background:`linear-gradient(135deg,${COL.from}18,${COL.to}10)`,
              border:`1.5px solid ${COL.from}33`,
              display:"flex", alignItems:"center", gap:12,
            }}>
              {(() => {
                const [gf, gt] = avatarGradient(sName(selectedStudent));
                return (
                  <div style={{
                    width:44, height:44, borderRadius:12, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontSize:18, fontWeight:900, color:"#fff",
                    background:`linear-gradient(135deg,${gf},${gt})`,
                    boxShadow:`0 4px 12px ${gf}44`,
                  }}>
                    {sName(selectedStudent)[0]?.toUpperCase()}
                  </div>
                );
              })()}
              <div>
                <p style={{ fontSize:15, fontWeight:900, color:COL.from }}>
                  {sName(selectedStudent)}
                </p>
                <p style={{ fontSize:11, color:COL.from, opacity:.7, marginTop:2 }}>
                  {selectedStudent.school_class?.name}
                  {selectedStudent.user?.email ? ` · ${selectedStudent.user.email}` : ""}
                </p>
              </div>
            </div>

            {/* Formulaire ajout/modif frais */}
            <div style={{
              borderRadius:12, padding:"14px 16px",
              background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              border:`1.5px solid ${T.cardBorder}`,
            }}>
              <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted, marginBottom:12,
                display:"flex", alignItems:"center", gap:6 }}>
                <FaPlus style={{ width:9,height:9,color:COL.from }} />
                {feeForm.id ? "Modifier le frais" : "Attribuer un frais"}
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1.2fr 1.5fr auto", gap:10, alignItems:"end" }}>
                <Sel label="Type de frais" icon={FaTag}
                  value={feeForm.fee_type_id}
                  onChange={(e) => setFeeForm((p) => ({ ...p, fee_type_id:e.target.value }))}
                  disabled={!!feeForm.id}>
                  <option value="">— Choisir —</option>
                  {feeTypes.filter((f) => f.is_active).map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </Sel>

                <Input label="Montant (FCFA)" icon={FaCoins}
                  type="number" placeholder="Auto"
                  value={feeForm.amount}
                  onChange={(e) => setFeeForm((p) => ({ ...p, amount:e.target.value }))} />

                <Input label="Échéance" icon={FaCalendarAlt}
                  type="date"
                  value={feeForm.due_date}
                  onChange={(e) => setFeeForm((p) => ({ ...p, due_date:e.target.value }))} />

                <div>
                  <p style={{ fontSize:10, marginBottom:5 }}>&nbsp;</p>
                  <button onClick={submitFee} disabled={saving}
                    style={{
                      display:"flex", alignItems:"center", gap:6,
                      padding:"9px 14px", borderRadius:10, border:"none", cursor:"pointer",
                      fontSize:12, fontWeight:800, color:"#fff",
                      background: saving ? T.textMuted : `linear-gradient(135deg,${COL.from},${COL.to})`,
                      boxShadow: saving ? "none" : `0 4px 12px ${COL.shadow}`,
                      whiteSpace:"nowrap",
                    }}>
                    {saving ? <FaSyncAlt style={{ width:10,height:10 }} className="animate-spin" />
                            : (feeForm.id ? <FaCheck style={{ width:10,height:10 }} />
                                          : <FaPlus  style={{ width:10,height:10 }} />)}
                    {feeForm.id ? "Mettre à jour" : "Ajouter"}
                  </button>
                </div>
              </div>
              {feeForm.id && (
                <button onClick={() => setFeeForm({ id:null, fee_type_id:"", amount:"", due_date:"" })}
                  style={{
                    marginTop:8, fontSize:10, color:T.textMuted, background:"none",
                    border:"none", cursor:"pointer", textDecoration:"underline",
                  }}>
                  Annuler la modification
                </button>
              )}
            </div>

            {/* Toggle filtre */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <p style={{ fontSize:13, fontWeight:800, color:T.textPrimary }}>
                Historique des frais
              </p>
              <div style={{ display:"flex", gap:4, background:T.inputBg,
                padding:3, borderRadius:9, border:`1px solid ${T.cardBorder}` }}>
                {[
                  { label:"Impayés", val:false },
                  { label:"Tous",    val:true  },
                ].map(({ label, val }) => (
                  <button key={label}
                    onClick={() => { setFeesShowAll(val); fetchFees(selectedStudent.id, !val); }}
                    style={{
                      padding:"5px 12px", borderRadius:7, border:"none", cursor:"pointer",
                      fontSize:11, fontWeight:700, transition:"all .15s",
                      background: feesShowAll === val
                        ? `linear-gradient(135deg,${COL.from},${COL.to})` : "transparent",
                      color: feesShowAll === val ? "#fff" : T.textMuted,
                      boxShadow: feesShowAll === val ? `0 2px 8px ${COL.shadow}` : "none",
                    }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tableau des frais */}
            {loadingFees ? (
              <div style={{ padding:"32px 0", textAlign:"center" }}>
                <FaSyncAlt style={{ width:22,height:22,color:COL.from }} className="animate-spin" />
              </div>
            ) : fees.length === 0 ? (
              <div style={{
                padding:"40px 24px", textAlign:"center", borderRadius:12,
                border:`2px dashed ${T.cardBorder}`,
                background: dark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.01)",
              }}>
                <p style={{ fontSize:13, color:T.textMuted }}>Aucun frais trouvé.</p>
              </div>
            ) : (
              <div style={{ borderRadius:12, overflow:"hidden", border:`1.5px solid ${T.cardBorder}` }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ background:T.tableHead, borderBottom:`2px solid ${T.divider}` }}>
                      {["Type","Montant","Payé","Reste","Échéance","Statut","Actions"].map((h, i) => (
                        <th key={i} style={{
                          padding:"9px 12px",
                          textAlign: i >= 1 && i <= 5 ? "center" : i === 6 ? "right" : "left",
                          fontSize:9, fontWeight:800, textTransform:"uppercase",
                          letterSpacing:"0.07em", color:T.textMuted, whiteSpace:"nowrap",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {fees.map((f, idx) => {
                      // ✅ FIX : isPaid basé UNIQUEMENT sur total_remaining (pas sur f.paid qui est stale)
                      // Après un PATCH sur amount, total_remaining est recalculé par l'API (annoté)
                      const isPaid = Number(f.total_remaining) <= 0;
                      const isOverdue = !isPaid && f.due_date && new Date(f.due_date) < new Date();
                      const even = idx % 2 === 0;
                      return (
                        <tr key={f.id} style={{
                          borderBottom:`1px solid ${T.divider}`,
                          background: even ? T.cardBg : (dark?"rgba(255,255,255,.018)":"rgba(0,0,0,.012)"),
                          transition:"background .1s",
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background=dark?`${COL.from}10`:`${COL.from}07`)}
                        onMouseLeave={(e) => (e.currentTarget.style.background=even?T.cardBg:dark?"rgba(255,255,255,.018)":"rgba(0,0,0,.012)")}>

                          <td style={{ padding:"10px 12px", fontWeight:700, color:T.textPrimary }}>
                            {f.fee_type_name || f.fee_type?.name || "Divers"}
                            <p style={{ fontSize:9, color:T.textMuted, marginTop:1, fontWeight:400 }}>
                              {f.created_at?.substring(0,10)}
                            </p>
                          </td>
                          <td style={{ padding:"10px 12px", textAlign:"center", fontWeight:700, color:T.textSecondary }}>
                            {formatCurrency(f.amount)}
                          </td>
                          <td style={{ padding:"10px 12px", textAlign:"center", fontWeight:700, color:"#10b981" }}>
                            {formatCurrency(f.total_paid)}
                          </td>
                          <td style={{
                            padding:"10px 12px", textAlign:"center", fontWeight:800,
                            color: f.total_remaining > 0 ? "#f59e0b" : "#10b981",
                          }}>
                            {formatCurrency(f.total_remaining)}
                          </td>
                          <td style={{ padding:"10px 12px", textAlign:"center" }}>
                            {f.due_date ? (
                              <span style={{
                                padding:"2px 8px", borderRadius:999, fontSize:10, fontWeight:700,
                                background: isOverdue ? "#ef444422" : "#3b82f622",
                                color: isOverdue ? "#ef4444" : "#3b82f6",
                                border:`1px solid ${isOverdue ? "#ef444455" : "#3b82f655"}`,
                              }}>
                                {f.due_date}
                              </span>
                            ) : (
                              <span style={{ color:T.textMuted, fontSize:11 }}>—</span>
                            )}
                          </td>
                          <td style={{ padding:"10px 12px", textAlign:"center" }}>
                            <StatusBadge paid={isPaid} overdue={isOverdue} />
                          </td>
                          <td style={{ padding:"10px 12px" }}>
                            <div style={{ display:"flex", justifyContent:"flex-end", gap:5 }}>
                              {!isPaid && (
                                <button onClick={() => openPaymentsForFee(f)}
                                  title="Encaisser"
                                  style={{
                                    width:28, height:28, borderRadius:7, border:"none", cursor:"pointer",
                                    display:"flex", alignItems:"center", justifyContent:"center",
                                    background:`${COL.from}18`, color:COL.from,
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background=`${COL.from}33`)}
                                  onMouseLeave={(e) => (e.currentTarget.style.background=`${COL.from}18`)}>
                                  <FaMoneyBillWave style={{ width:10,height:10 }} />
                                </button>
                              )}
                              {/* ✅ FIX : pré-remplir fee_type_id avec l'ID (f.fee_type = integer ID) */}
                              <button onClick={() => setFeeForm({
                                id:          f.id,
                                fee_type_id: f.fee_type,
                                amount:      f.amount,
                                due_date:    f.due_date || "",
                              })}
                                title="Modifier"
                                style={{
                                  width:28, height:28, borderRadius:7, border:"none", cursor:"pointer",
                                  display:"flex", alignItems:"center", justifyContent:"center",
                                  background:dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.04)", color:T.textSecondary,
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background=`${COL.from}22`)}
                                onMouseLeave={(e) => (e.currentTarget.style.background=dark?"rgba(255,255,255,.06)":"rgba(0,0,0,.04)")}>
                                <FaEdit style={{ width:10,height:10 }} />
                              </button>
                              {Number(f.total_paid) === 0 && (
                                <button onClick={() => deleteFee(f.id)}
                                  title="Supprimer"
                                  style={{
                                    width:28, height:28, borderRadius:7, border:"none", cursor:"pointer",
                                    display:"flex", alignItems:"center", justifyContent:"center",
                                    background:"#ef444418", color:"#ef4444",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background="#ef444433")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background="#ef444418")}>
                                  <FaTrash style={{ width:10,height:10 }} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ─── MODAL PAIEMENT (z=200) ─── */}
      <Modal isOpen={paymentsOpen} onClose={() => setPaymentsOpen(false)}
        title={selectedFee ? `Paiement · ${selectedFee.fee_type_name || "Frais"}` : "Nouveau Paiement"}
        icon={FaMoneyBillWave} width={480} zIndex={200}>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {selectedFee && (
            <div style={{
              display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8,
              padding:"12px 14px", borderRadius:12,
              background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.025)",
              border:`1.5px solid ${T.cardBorder}`,
            }}>
              {[
                { label:"Total",     val:selectedFee.amount,          color:T.textPrimary },
                { label:"Déjà payé", val:selectedFee.total_paid,      color:"#10b981" },
                { label:"Reste",     val:selectedFee.total_remaining,  color:"#f59e0b", bold:true },
              ].map(({ label, val, color, bold }, i) => (
                <div key={i} style={{ textAlign:"center" }}>
                  <p style={{ fontSize:9, fontWeight:700, color:T.textMuted,
                    textTransform:"uppercase", letterSpacing:"0.06em", marginBottom:4 }}>
                    {label}
                  </p>
                  <p style={{ fontSize:13, fontWeight: bold ? 900 : 700, color }}>
                    {formatCurrency(val)}
                  </p>
                </div>
              ))}
            </div>
          )}

          <Input label="Montant du versement (FCFA)" icon={FaCoins}
            type="number" placeholder="0"
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm((p) => ({ ...p, amount:e.target.value }))}
            accent={COL.from} />

          <div>
            <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
              letterSpacing:"0.08em", color:T.textMuted, marginBottom:8 }}>
              Méthode de paiement
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {[
                { id:"CASH",         icon:FaCoins,      label:"Espèces" },
                { id:"MOBILE_MONEY", icon:FaMobileAlt,  label:"Mobile" },
                { id:"BANK",         icon:FaUniversity, label:"Banque" },
              ].map(({ id, icon:Icon, label }) => {
                const active = paymentForm.method === id;
                return (
                  <button key={id} onClick={() => setPaymentForm((p) => ({ ...p, method:id }))}
                    style={{
                      display:"flex", flexDirection:"column", alignItems:"center", gap:6,
                      padding:"11px 8px", borderRadius:10, cursor:"pointer", transition:"all .15s",
                      background: active ? `linear-gradient(135deg,${COL.from},${COL.to})` : T.inputBg,
                      border:`1.5px solid ${active ? "transparent" : T.inputBorder}`,
                      color: active ? "#fff" : T.textMuted,
                      boxShadow: active ? `0 4px 12px ${COL.shadow}` : "none",
                      transform: active ? "translateY(-1px)" : "none",
                    }}>
                    <Icon style={{ width:15,height:15 }} />
                    <span style={{ fontSize:10, fontWeight:800 }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Input label="Référence (optionnel)" icon={FaShieldAlt}
            placeholder="N° chèque, ID transaction…"
            value={paymentForm.reference}
            onChange={(e) => setPaymentForm((p) => ({ ...p, reference:e.target.value }))} />

          <div>
            <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
              letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>
              Note (optionnel)
            </p>
            <textarea
              placeholder="Observation…"
              value={paymentForm.note}
              onChange={(e) => setPaymentForm((p) => ({ ...p, note:e.target.value }))}
              style={{
                width:"100%", boxSizing:"border-box", padding:"9px 12px",
                fontSize:12, borderRadius:10, outline:"none",
                resize:"vertical", minHeight:68, lineHeight:1.5,
                background:T.inputBg, color:T.textPrimary,
                border:`1.5px solid ${T.inputBorder}`, transition:"all .15s", fontFamily:"inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor=COL.from)}
              onBlur={(e)  => (e.target.style.borderColor=T.inputBorder)} />
          </div>

          <button onClick={submitPayment} disabled={saving}
            style={{
              width:"100%", display:"flex", alignItems:"center",
              justifyContent:"center", gap:8, padding:"13px 16px",
              borderRadius:12, border:"none", cursor: saving?"not-allowed":"pointer",
              fontSize:13, fontWeight:800, color:"#fff",
              background: saving ? T.textMuted : `linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow: saving ? "none" : `0 6px 20px ${COL.shadow}`,
            }}>
            {saving ? <FaSyncAlt style={{ width:13,height:13 }} className="animate-spin" />
                    : <FaCheck style={{ width:13,height:13 }} />}
            {saving ? "Traitement…" : "Confirmer le paiement"}
          </button>

          <div>
            <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
              letterSpacing:"0.08em", color:T.textMuted, marginBottom:8 }}>
              Historique pour ce frais
            </p>
            {loadingPayments ? (
              <div style={{ height:48, borderRadius:10, background:T.inputBg }} className="animate-pulse" />
            ) : payments.length === 0 ? (
              <div style={{
                padding:"16px 14px", textAlign:"center", borderRadius:10,
                border:`2px dashed ${T.cardBorder}`, fontSize:11,
                color:T.textMuted, fontStyle:"italic",
              }}>
                Aucun paiement enregistré.
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:6,
                maxHeight:180, overflowY:"auto",
                scrollbarWidth:"thin", scrollbarColor:`${COL.from} transparent` }}>
                {payments.map((p) => (
                  <div key={p.id} style={{
                    display:"flex", alignItems:"center", justifyContent:"space-between",
                    padding:"9px 12px", borderRadius:9,
                    background: dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",
                    border:`1px solid ${T.cardBorder}`,
                  }}>
                    <div style={{ display:"flex", alignItems:"center", gap:9 }}>
                      <div style={{
                        width:28, height:28, borderRadius:8, flexShrink:0,
                        background:`${COL.from}18`,
                        display:"flex", alignItems:"center", justifyContent:"center", color:COL.from,
                      }}>
                        <FaReceipt style={{ width:10,height:10 }} />
                      </div>
                      <div>
                        <p style={{ fontSize:12, fontWeight:800, color:T.textPrimary }}>
                          {formatCurrency(p.amount)}
                        </p>
                        <p style={{ fontSize:10, color:T.textMuted, marginTop:1 }}>
                          {new Date(p.payment_date || p.created_at).toLocaleDateString("fr-FR")} · {p.method}
                        </p>
                      </div>
                    </div>
                    <span style={{
                      padding:"2px 8px", borderRadius:999, fontSize:9, fontWeight:800,
                      background: p.validated ? "#10b98122" : "#f59e0b22",
                      color: p.validated ? "#10b981" : "#f59e0b",
                      border:`1px solid ${p.validated ? "#10b98155" : "#f59e0b55"}`,
                    }}>
                      {p.validated ? "Validé" : "En attente"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ─── MODAL TYPE DE FRAIS (z=150) ─── */}
      <Modal isOpen={feeTypeOpen} onClose={() => setFeeTypeOpen(false)}
        title={currentFeeType.id ? "Modifier le type" : "Nouveau type de frais"}
        icon={FaTag} width={420} zIndex={150}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Input label="Nom du type *" icon={FaTag}
            placeholder="Ex: Frais de scolarité, Cantine…"
            value={currentFeeType.name}
            onChange={(e) => setCurrentFeeType((p) => ({ ...p, name:e.target.value }))} />
          <div>
            <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
              letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>
              Description (optionnel)
            </p>
            <textarea
              placeholder="Détails sur ce type de frais…"
              value={currentFeeType.description}
              onChange={(e) => setCurrentFeeType((p) => ({ ...p, description:e.target.value }))}
              style={{
                width:"100%", boxSizing:"border-box", padding:"9px 12px",
                fontSize:12, borderRadius:10, outline:"none",
                resize:"vertical", minHeight:64, lineHeight:1.5,
                background:T.inputBg, color:T.textPrimary,
                border:`1.5px solid ${T.inputBorder}`, fontFamily:"inherit",
              }}
              onFocus={(e) => (e.target.style.borderColor=COL.from)}
              onBlur={(e)  => (e.target.style.borderColor=T.inputBorder)} />
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={() => setCurrentFeeType((p) => ({ ...p, is_active:!p.is_active }))}
              style={{
                width:40, height:22, borderRadius:999, border:"none", cursor:"pointer",
                transition:"all .2s",
                background: currentFeeType.is_active
                  ? `linear-gradient(135deg,${COL.from},${COL.to})` : T.inputBg,
                boxShadow: currentFeeType.is_active ? `0 2px 8px ${COL.shadow}` : "none",
                position:"relative",
              }}>
              <div style={{
                position:"absolute", top:2, width:18, height:18, borderRadius:999,
                background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,.2)", transition:"left .2s",
                left: currentFeeType.is_active ? "calc(100% - 20px)" : 2,
              }} />
            </button>
            <span style={{ fontSize:12, fontWeight:700, color:T.textSecondary }}>
              {currentFeeType.is_active ? "Type actif" : "Type inactif"}
            </span>
          </div>
          <button onClick={submitFeeType} disabled={saving}
            style={{
              marginTop:4, width:"100%", display:"flex", alignItems:"center",
              justifyContent:"center", gap:8, padding:"11px 16px",
              borderRadius:12, border:"none", cursor: saving?"not-allowed":"pointer",
              fontSize:13, fontWeight:800, color:"#fff",
              background: saving ? T.textMuted : `linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow: saving ? "none" : `0 4px 16px ${COL.shadow}`,
            }}>
            {saving ? <FaSyncAlt style={{ width:12,height:12 }} className="animate-spin" />
                    : <FaCheck style={{ width:12,height:12 }} />}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </Modal>

      {/* ─── MODAL MONTANT (z=150) ─── */}
      <Modal isOpen={amountOpen} onClose={() => setAmountOpen(false)}
        title={currentAmount.id ? "Modifier le montant" : "Ajouter un montant"}
        icon={FaCoins} width={380} zIndex={150}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {/* ✅ FIX : utiliser les NIVEAUX (Level) et pas les classes (SchoolClass) */}
          <Sel label="Niveau *" icon={FaLayerGroup}
            value={currentAmount.level}
            onChange={(e) => setCurrentAmount((p) => ({ ...p, level:e.target.value }))}>
            <option value="">— Choisir un niveau —</option>
            {levels.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </Sel>
          {levels.length === 0 && (
            <p style={{ fontSize:10, color:"#f59e0b", fontStyle:"italic" }}>
              ⚠ Aucun niveau chargé. Vérifiez l'endpoint <code>/academics/levels/</code>.
            </p>
          )}
          <Input label="Montant (FCFA) *" icon={FaCoins}
            type="number" placeholder="0"
            value={currentAmount.amount}
            onChange={(e) => setCurrentAmount((p) => ({ ...p, amount:e.target.value }))} />
          <button onClick={submitAmount} disabled={saving}
            style={{
              marginTop:4, width:"100%", display:"flex", alignItems:"center",
              justifyContent:"center", gap:8, padding:"11px 16px",
              borderRadius:12, border:"none", cursor: saving?"not-allowed":"pointer",
              fontSize:13, fontWeight:800, color:"#fff",
              background: saving ? T.textMuted : `linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow: saving ? "none" : `0 4px 16px ${COL.shadow}`,
            }}>
            {saving ? <FaSyncAlt style={{ width:12,height:12 }} className="animate-spin" />
                    : <FaCheck style={{ width:12,height:12 }} />}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </Modal>

      {/* ─── CONFIRM DIALOG (z=300) ─── */}
      <ConfirmDialog
        open={confirm.open}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm({ open:false })}
        zIndex={300}
      />

      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{BASE_KEYFRAMES}{`
        .animate-spin  { animation: spin 1s linear infinite; }
        @keyframes spin  { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        .animate-pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.25} }
      `}</style>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   ROOT
────────────────────────────────────────────────────────────── */
const StudentsWithFees = () => {
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
      <StudentsWithFeesInner />
    </ThemeCtx.Provider>
  );
};

export default StudentsWithFees;