// src/pages/PaymentsPage.jsx
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  FaCheck, FaTimes, FaPlus, FaSearch, FaSyncAlt,
  FaMoneyBillWave, FaFilter, FaChevronDown, FaChevronLeft,
  FaChevronRight, FaExclamationTriangle, FaMoon, FaSun,
  FaReceipt, FaUserGraduate, FaCoins, FaMobileAlt,
  FaUniversity, FaShieldAlt, FaTrash, FaClipboardCheck,
  FaArrowUp, FaArrowDown,
} from "react-icons/fa";
import { fetchData, postData, deleteData } from "./api";
import {
  ThemeCtx, useTheme, LIGHT, DARK,
  SECTION_PALETTE, BASE_KEYFRAMES,
} from "./theme";

const COL = SECTION_PALETTE.finance; // emerald → teal

/* ──────────────────────────────────────────────────────────────
   UTILS
────────────────────────────────────────────────────────────── */
const formatDate = (dt) => {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleString("fr-FR", {
      year:"numeric", month:"short", day:"numeric",
      hour:"2-digit", minute:"2-digit",
    });
  } catch { return dt; }
};

const formatMoney = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("fr-FR", { minimumFractionDigits:0, maximumFractionDigits:0 }) + " FCFA";
};

const studentFromPayment = (p) =>
  p.student ?? p.fee_detail?.student ?? p.fee?.student ?? null;

const METHODS = [
  { id:"CASH",         icon:FaCoins,      label:"Espèces" },
  { id:"MOBILE_MONEY", icon:FaMobileAlt,  label:"Mobile" },
  { id:"BANK",         icon:FaUniversity, label:"Banque" },
];

const ORDERINGS = [
  { v:"-paid_at",  label:"Plus récents" },
  { v:"paid_at",   label:"Plus anciens" },
  { v:"-amount",   label:"Montant ↓" },
  { v:"amount",    label:"Montant ↑" },
  { v:"validated", label:"Validés en premier" },
];

/* ──────────────────────────────────────────────────────────────
   ATOMES
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

const ConfirmDialog = ({ open, message, onConfirm, onCancel, zIndex=300 }) => {
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
            width:40, height:40, borderRadius:12, marginBottom:12,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:"#ef444422",
          }}>
            <FaExclamationTriangle style={{ width:16,height:16,color:"#ef4444" }} />
          </div>
          <p style={{ fontSize:13, fontWeight:700, color:T.textPrimary, lineHeight:1.5 }}>
            {message}
          </p>
        </div>
        <div style={{ display:"flex", gap:8, padding:"12px 20px 16px",
          borderTop:`1px solid ${T.divider}` }}>
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

const Modal = ({ isOpen, onClose, title, icon:Icon, children, width=520, zIndex=100 }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div onClick={(e) => e.target===e.currentTarget && onClose()}
      style={{
        position:"fixed", inset:0, zIndex,
        background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:16, animation:"fadeIn .18s ease-out",
      }}>
      <div style={{
        width:"100%", maxWidth:width, maxHeight:"90vh",
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
          {Icon && (
            <div style={{
              width:32, height:32, borderRadius:9, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 4px 12px ${COL.shadow}`,
            }}>
              <Icon style={{ width:13,height:13,color:"#fff" }} />
            </div>
          )}
          <h3 style={{ flex:1, fontSize:14, fontWeight:800, color:T.textPrimary }}>{title}</h3>
          <button onClick={onClose}
            style={{
              width:28, height:28, borderRadius:7, border:"none", cursor:"pointer",
              background:"transparent", color:T.textMuted, transition:"all .15s",
              display:"flex", alignItems:"center", justifyContent:"center",
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

/* Styled input */
const Input = ({ label, icon:Icon, accent, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [f, setF] = useState(false);
  const ac = accent || COL.from;
  return (
    <div>
      {label && <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
        letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>{label}</p>}
      <div style={{ position:"relative" }}>
        {Icon && <span style={{ position:"absolute", left:11, top:"50%",
          transform:"translateY(-50%)", pointerEvents:"none",
          color:f?ac:T.textMuted, transition:"color .15s" }}>
          <Icon style={{ width:11,height:11 }} />
        </span>}
        <input {...props}
          onFocus={(e) => { setF(true); props.onFocus?.(e); }}
          onBlur={(e)  => { setF(false); props.onBlur?.(e); }}
          style={{
            width:"100%", boxSizing:"border-box",
            paddingLeft:Icon?30:12, paddingRight:12, paddingTop:9, paddingBottom:9,
            fontSize:12, borderRadius:10, outline:"none", transition:"all .15s",
            background:T.inputBg, color:T.textPrimary,
            border:`1.5px solid ${f?ac:T.inputBorder}`,
            boxShadow:f?`0 0 0 3px ${ac}22`:"none",
          }} />
      </div>
    </div>
  );
};

/* Styled select */
const Sel = ({ label, icon:Icon, children, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [f, setF] = useState(false);
  return (
    <div>
      {label && <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
        letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>{label}</p>}
      <div style={{ position:"relative" }}>
        {Icon && <span style={{ position:"absolute", left:11, top:"50%",
          transform:"translateY(-50%)", pointerEvents:"none",
          color:f?COL.from:T.textMuted, zIndex:1 }}>
          <Icon style={{ width:11,height:11 }} />
        </span>}
        <select {...props}
          onFocus={(e) => { setF(true); props.onFocus?.(e); }}
          onBlur={(e)  => { setF(false); props.onBlur?.(e); }}
          style={{
            width:"100%", appearance:"none",
            paddingLeft:Icon?30:12, paddingRight:26, paddingTop:9, paddingBottom:9,
            fontSize:12, borderRadius:10, outline:"none", transition:"all .15s",
            background:T.inputBg, color:props.value?T.textPrimary:T.textMuted,
            border:`1.5px solid ${f?COL.from:T.inputBorder}`,
            boxShadow:f?`0 0 0 3px ${COL.from}22`:"none",
            cursor:"pointer",
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
   STATUS BADGE
────────────────────────────────────────────────────────────── */
const StatusBadge = ({ validated }) => {
  const bg    = validated ? "#10b98122" : "#f59e0b22";
  const color = validated ? "#10b981"   : "#f59e0b";
  const label = validated ? "Validé"    : "En attente";
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      padding:"3px 10px", borderRadius:999, fontSize:10, fontWeight:800,
      background:bg, color, border:`1px solid ${color}44`,
    }}>
      {validated ? <FaCheck style={{ width:8,height:8 }} /> : null}
      {label}
    </span>
  );
};

/* ──────────────────────────────────────────────────────────────
   PAYMENT ROW
────────────────────────────────────────────────────────────── */
const PaymentRow = ({ payment, onValidate, onDelete, animDelay }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [hov, setHov] = useState(false);

  const stud      = studentFromPayment(payment) || {};
  const feeDetail = payment.fee_detail ?? payment.fee ?? {};
  const studentName = (
    stud.full_name ??
    `${stud.first_name ?? ""} ${stud.last_name ?? ""}`.trim()
  ) || "—";
  const methodObj = METHODS.find((m) => m.id === payment.method);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"grid",
        gridTemplateColumns:"1fr 130px 150px 160px 120px 90px",
        alignItems:"center", gap:8,
        padding:"11px 16px",
        borderBottom:`1px solid ${T.divider}`,
        background: hov
          ? (dark?`${COL.from}0d`:`${COL.from}06`)
          : "transparent",
        transition:"background .12s",
        animation:`fadeUp .25s ease-out ${animDelay}ms both`,
      }}>

      {/* Élève */}
      <div>
        <p style={{ fontSize:12, fontWeight:700, color:T.textPrimary,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {studentName}
        </p>
        <p style={{ fontSize:10, color:T.textMuted, marginTop:1 }}>
          {stud.class_name ?? stud.current_class ?? "—"}
          {stud.level ? ` · ${stud.level}` : ""}
        </p>
        <p style={{ fontSize:9, color:T.textMuted, marginTop:1, fontFamily:"monospace" }}>
          ID {stud.id ?? feeDetail?.student ?? "—"}
        </p>
      </div>

      {/* Montant */}
      <div>
        <p style={{ fontSize:14, fontWeight:900, color:COL.from }}>
          {formatMoney(payment.amount)}
        </p>
        {methodObj && (
          <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:3 }}>
            <methodObj.icon style={{ width:9,height:9,color:T.textMuted }} />
            <span style={{ fontSize:9, color:T.textMuted, fontWeight:600 }}>
              {methodObj.label}
            </span>
          </div>
        )}
      </div>

      {/* Date */}
      <div>
        <p style={{ fontSize:11, color:T.textSecondary }}>
          {formatDate(payment.paid_at)}
        </p>
        {payment.reference && (
          <p style={{ fontSize:9, color:T.textMuted, marginTop:2, fontFamily:"monospace" }}>
            Réf: {payment.reference}
          </p>
        )}
      </div>

      {/* Frais */}
      <div>
        <p style={{ fontSize:11, fontWeight:700, color:T.textPrimary,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
          {feeDetail.fee_type_name ?? feeDetail.fee_type ?? "Frais"}
        </p>
        <p style={{ fontSize:10, color:T.textMuted, marginTop:1 }}>
          Total: {formatMoney(feeDetail.amount ?? feeDetail.total)}
        </p>
        <p style={{ fontSize:9, color:T.textMuted, fontFamily:"monospace", marginTop:1 }}>
          Fee #{feeDetail.id ?? payment.fee}
        </p>
      </div>

      {/* Statut */}
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        <StatusBadge validated={payment.validated} />
        {payment.validated && payment.validated_by && (
          <p style={{ fontSize:9, color:T.textMuted }}>
            par {payment.validated_by?.username ?? payment.validated_by?.first_name ?? "—"}
          </p>
        )}
        {payment.note && (
          <p style={{ fontSize:9, color:T.textMuted, fontStyle:"italic",
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:110 }}>
            {payment.note}
          </p>
        )}
      </div>

      {/* Actions */}
      <div style={{ display:"flex", gap:5, justifyContent:"flex-end",
        opacity:hov?1:0.4, transition:"opacity .15s" }}>
        <button onClick={() => onValidate(payment)}
          disabled={payment.validated}
          title={payment.validated ? "Déjà validé" : "Valider ce paiement"}
          style={{
            width:30, height:30, borderRadius:8, border:"none", cursor: payment.validated?"not-allowed":"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            background: payment.validated ? T.inputBg : `${COL.from}18`,
            color: payment.validated ? T.textMuted : COL.from,
            opacity: payment.validated ? 0.4 : 1,
          }}
          onMouseEnter={(e) => !payment.validated && (e.currentTarget.style.background=`${COL.from}33`)}
          onMouseLeave={(e) => !payment.validated && (e.currentTarget.style.background=`${COL.from}18`)}>
          <FaClipboardCheck style={{ width:11,height:11 }} />
        </button>
        <button onClick={() => onDelete(payment)}
          title="Supprimer"
          style={{
            width:30, height:30, borderRadius:8, border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            background:"#ef444418", color:"#ef4444",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background="#ef444433")}
          onMouseLeave={(e) => (e.currentTarget.style.background="#ef444418")}>
          <FaTrash style={{ width:10,height:10 }} />
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   PAGE PRINCIPALE (inner)
────────────────────────────────────────────────────────────── */
const PaymentsInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  /* ── Data ── */
  const [paymentsRaw,  setPaymentsRaw]  = useState([]);
  const [fees,         setFees]         = useState([]);  // pour le dropdown "créer paiement"
  const [loading,      setLoading]      = useState(false);
  const [msg,          setMsg]          = useState(null);

  /* ── Filtres ── */
  const [search,         setSearch]         = useState("");
  const [validatedOnly,  setValidatedOnly]  = useState(false);
  const [ordering,       setOrdering]       = useState("-paid_at");
  const [page,           setPage]           = useState(1);
  const [pageSize,       setPageSize]       = useState(20);

  /* ── Modal créer ── */
  const [createOpen, setCreateOpen] = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [form, setForm] = useState({ fee:"", amount:"", method:"CASH", reference:"", note:"" });

  /* ── Confirm ── */
  const [confirm, setConfirm] = useState({ open:false, message:"", onConfirm:null });

  const toast = (type, text) => setMsg({ type, text });

  /* ── Fetch unique (anti double-fetch) ── */
  const fetchRef = useRef(null);
  const fetchPayments = useCallback(async () => {
    if (fetchRef.current) clearTimeout(fetchRef.current);
    fetchRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page_size: 10000, // tout récupérer pour filtre client
          ordering:  ordering,
        });
        if (validatedOnly) params.set("validated", "1");
        const data = await fetchData(`/fees/payments/?${params}`);
        const list = Array.isArray(data) ? data : (data?.results ?? []);
        setPaymentsRaw(list);
      } catch (err) {
        console.error(err);
        toast("error", "Impossible de récupérer les paiements.");
        setPaymentsRaw([]);
      } finally { setLoading(false); }
    }, 80); // debounce 80ms pour éviter double-fire
  }, [ordering, validatedOnly]);

  /* ── Fetch frais (pour le select du modal) ── */
  const fetchFees = useCallback(async () => {
    try {
      const d = await fetchData("/fees/fees/?page_size=500&paid=0");
      setFees(Array.isArray(d) ? d : (d?.results ?? []));
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => {
    fetchPayments();
    fetchFees();
  }, [fetchPayments, fetchFees]);

  /* ── Reset page quand filtre change ── */
  const prevFilter = useRef({ search, validatedOnly, ordering });
  useEffect(() => {
    const prev = prevFilter.current;
    if (prev.search !== search || prev.validatedOnly !== validatedOnly || prev.ordering !== ordering) {
      setPage(1);
      prevFilter.current = { search, validatedOnly, ordering };
    }
  }, [search, validatedOnly, ordering]);

  /* ── Filtre + tri + pagination côté client ── */
  const { visiblePayments, totalFiltered } = useMemo(() => {
    let arr = paymentsRaw.slice();
    const q = search.trim().toLowerCase();

    // filtre recherche
    if (q) arr = arr.filter((p) => {
      const stud = studentFromPayment(p) || {};
      const name = (stud.full_name ?? `${stud.first_name??""} ${stud.last_name??""}`.trim() ?? "").toLowerCase();
      const fee  = p.fee_detail ?? p.fee ?? {};
      return (
        name.includes(q) ||
        (stud.username   ?? "").toLowerCase().includes(q) ||
        (p.reference     ?? "").toLowerCase().includes(q) ||
        (p.note          ?? "").toLowerCase().includes(q) ||
        (fee.fee_type_name ?? "").toLowerCase().includes(q)
      );
    });

    // filtre validé
    if (validatedOnly) arr = arr.filter((p) => !!p.validated);

    // tri
    const desc = ordering.startsWith("-");
    const field = desc ? ordering.slice(1) : ordering;
    arr.sort((a, b) => {
      const va = a[field], vb = b[field];
      if (va == null && vb == null) return 0;
      if (va == null) return 1; if (vb == null) return -1;
      let cmp;
      if (field === "amount") cmp = Number(va) - Number(vb);
      else if (["paid_at","validated_at","created_at"].includes(field))
        cmp = new Date(va).getTime() - new Date(vb).getTime();
      else cmp = String(va).localeCompare(String(vb));
      return desc ? -cmp : cmp;
    });

    const total = arr.length;
    const from = (page - 1) * pageSize;
    return {
      visiblePayments: arr.slice(from, from + pageSize),
      totalFiltered:   total,
    };
  }, [paymentsRaw, search, validatedOnly, ordering, page, pageSize]);

  const firstIdx = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastIdx  = Math.min(page * pageSize, totalFiltered);
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  /* ── Statistiques rapides ── */
  const stats = useMemo(() => {
    const total    = paymentsRaw.length;
    const validated = paymentsRaw.filter((p) => p.validated).length;
    const pending   = total - validated;
    const totalAmt  = paymentsRaw.reduce((s, p) => s + Number(p.amount || 0), 0);
    return { total, validated, pending, totalAmt };
  }, [paymentsRaw]);

  /* ── Actions ── */
  const handleValidate = (payment) => {
    if (payment.validated) return;
    setConfirm({
      open: true,
      message: `Valider ce paiement de ${formatMoney(payment.amount)} ?`,
      onConfirm: async () => {
        setConfirm({ open:false });
        try {
          await postData(`/fees/payments/${payment.id}/validate_payment/`, {});
          toast("success", "Paiement validé avec succès.");
          await fetchPayments();
        } catch (err) {
          toast("error", err?.response?.data?.detail || "Échec de la validation.");
        }
      },
    });
  };

  const handleDelete = (payment) => {
    setConfirm({
      open: true,
      message: `Supprimer ce paiement de ${formatMoney(payment.amount)} ? Cette action est irréversible.`,
      onConfirm: async () => {
        setConfirm({ open:false });
        try {
          await deleteData(`/fees/payments/${payment.id}/`);
          toast("success", "Paiement supprimé.");
          await fetchPayments();
        } catch {
          toast("error", "Impossible de supprimer ce paiement.");
        }
      },
    });
  };

  const handleCreate = async () => {
    if (!form.fee)    return toast("error", "Veuillez sélectionner un frais.");
    if (!form.amount) return toast("error", "Le montant est requis.");
    setCreating(true);
    try {
      await postData("/fees/payments/", {
        fee:       Number(form.fee),
        amount:    Number(form.amount),
        method:    form.method || "CASH",
        reference: form.reference || "",
        note:      form.note || "",
      });
      toast("success", "Paiement créé avec succès.");
      setCreateOpen(false);
      setForm({ fee:"", amount:"", method:"CASH", reference:"", note:"" });
      await fetchPayments();
    } catch (err) {
      const data = err?.response?.data;
      const errMsg = data?.non_field_errors?.[0]
        || data?.detail
        || Object.values(data||{})?.flat?.()?.[0]
        || "Impossible de créer le paiement.";
      toast("error", errMsg);
    } finally { setCreating(false); }
  };

  const resetFilters = () => {
    setSearch(""); setValidatedOnly(false); setOrdering("-paid_at"); setPage(1);
  };

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
                Paiements
              </h1>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>
                Suivi et validation des versements
              </p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={fetchPayments}
              style={{
                width:34, height:34, borderRadius:9, border:`1.5px solid ${T.cardBorder}`,
                background:"transparent", cursor:"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                color:T.textMuted, transition:"all .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor=COL.from; e.currentTarget.style.color=COL.from; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor=T.cardBorder; e.currentTarget.style.color=T.textMuted; }}>
              <FaSyncAlt style={{ width:12,height:12 }} className={loading?"animate-spin":""} />
            </button>
            <button onClick={() => setCreateOpen(true)}
              style={{
                display:"flex", alignItems:"center", gap:7,
                padding:"8px 16px", borderRadius:10, border:"none", cursor:"pointer",
                fontSize:12, fontWeight:800, color:"#fff",
                background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                boxShadow:`0 4px 14px ${COL.shadow}`,
              }}>
              <FaPlus style={{ width:10,height:10 }} />
              Nouveau paiement
            </button>
            <DarkToggle />
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1280, margin:"0 auto", padding:"20px 24px 0" }}>

        {/* ═══ STATS ═══ */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
          {[
            { label:"Total paiements", val:stats.total,                   color:COL.from,   icon:FaReceipt       },
            { label:"Validés",         val:stats.validated,               color:"#10b981",  icon:FaCheck         },
            { label:"En attente",      val:stats.pending,                 color:"#f59e0b",  icon:FaSyncAlt       },
            { label:"Volume total",    val:formatMoney(stats.totalAmt),   color:"#6366f1",  icon:FaMoneyBillWave },
          ].map(({ label, val, color, icon:Icon }, i) => (
            <div key={i} style={{
              borderRadius:12, padding:"12px 16px",
              background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
              boxShadow:T.cardShadow,
              animation:`fadeUp .3s ease-out ${i*50}ms both`,
            }}>
              <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:6 }}>
                <div style={{
                  width:26, height:26, borderRadius:7,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:`${color}20`,
                }}>
                  <Icon style={{ width:10,height:10,color }} />
                </div>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.08em", color:T.textMuted }}>{label}</p>
              </div>
              <p style={{ fontSize:typeof val==="string"?14:20, fontWeight:900, color, lineHeight:1 }}>
                {val}
              </p>
            </div>
          ))}
        </div>

        {/* ═══ BARRE FILTRES ═══ */}
        <div style={{
          borderRadius:14, padding:"12px 16px", marginBottom:14,
          background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
          boxShadow:T.cardShadow,
          display:"flex", alignItems:"center", gap:12, flexWrap:"wrap",
        }}>
          {/* Recherche */}
          <div style={{ position:"relative", flex:1, minWidth:200 }}>
            <FaSearch style={{
              position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
              width:11,height:11, color:T.textMuted, pointerEvents:"none",
            }} />
            <input
              placeholder="Élève, référence, note, type de frais…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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

          {/* Tri */}
          <Sel value={ordering} onChange={(e) => setOrdering(e.target.value)}
            icon={FaFilter} style={{ minWidth:160 }}>
            {ORDERINGS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
          </Sel>

          {/* Taille page */}
          <Sel value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{ width:90 }}>
            {[10,20,50,100].map((s) => <option key={s} value={s}>{s}/page</option>)}
          </Sel>

          {/* Toggle validés */}
          <button
            onClick={() => setValidatedOnly((v) => !v)}
            style={{
              display:"flex", alignItems:"center", gap:7,
              padding:"8px 14px", borderRadius:10, border:"none", cursor:"pointer",
              fontSize:11, fontWeight:700, transition:"all .15s",
              background: validatedOnly
                ? "linear-gradient(135deg,#10b981,#14b8a6)"
                : T.inputBg,
              color: validatedOnly ? "#fff" : T.textMuted,
              border:`1.5px solid ${validatedOnly?"transparent":T.inputBorder}`,
              boxShadow: validatedOnly ? "0 3px 10px #10b98144" : "none",
            }}>
            <FaCheck style={{ width:9,height:9 }} />
            {validatedOnly ? "Validés seulement" : "Tous les statuts"}
          </button>

          {/* Reset */}
          <button onClick={resetFilters}
            style={{
              display:"flex", alignItems:"center", gap:6,
              padding:"8px 12px", borderRadius:10, cursor:"pointer",
              border:`1.5px solid ${T.cardBorder}`, background:"transparent",
              fontSize:11, fontWeight:700, color:T.textMuted, transition:"all .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor=COL.from)}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor=T.cardBorder)}>
            <FaTimes style={{ width:9,height:9 }} />
            Réinitialiser
          </button>
        </div>

        {/* ═══ TABLEAU ═══ */}
        <div style={{
          borderRadius:14, overflow:"hidden",
          background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
          boxShadow:T.cardShadow, marginBottom:14,
        }}>
          {/* En-tête */}
          <div style={{
            display:"grid",
            gridTemplateColumns:"1fr 130px 150px 160px 120px 90px",
            gap:8, padding:"10px 16px",
            background:T.tableHead,
            borderBottom:`2px solid ${T.divider}`,
          }}>
            {[
              { label:"Élève / Classe",        field:"student"    },
              { label:"Montant",               field:"amount"     },
              { label:"Date de paiement",      field:"paid_at"    },
              { label:"Frais associé",         field:null         },
              { label:"Statut",                field:"validated"  },
              { label:"Actions",               field:null, right:true },
            ].map(({ label, field, right }, i) => (
              <div key={i} style={{
                display:"flex", alignItems:"center",
                gap:4, cursor:field?"pointer":"default",
                justifyContent: right?"flex-end":"flex-start",
              }}
              onClick={() => field && setOrdering((o) => o===field?`-${field}`:o===`-${field}`?field:`-${field}`)}>
                <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                  letterSpacing:"0.07em", color:T.textMuted }}>
                  {label}
                </p>
                {field && (
                  ordering === `-${field}` ? <FaArrowDown style={{ width:7,height:7,color:COL.from }} /> :
                  ordering ===  field      ? <FaArrowUp   style={{ width:7,height:7,color:COL.from }} /> :
                  null
                )}
              </div>
            ))}
          </div>

          {/* Corps */}
          {loading ? (
            <div style={{ padding:"48px 24px", textAlign:"center" }}>
              <FaSyncAlt style={{ width:22,height:22,color:COL.from }} className="animate-spin" />
            </div>
          ) : visiblePayments.length === 0 ? (
            <div style={{
              padding:"56px 24px", textAlign:"center",
              border:`2px dashed ${T.cardBorder}`, margin:16, borderRadius:12,
            }}>
              <FaReceipt style={{ width:28,height:28,color:T.textMuted,opacity:.4,margin:"0 auto 12px" }} />
              <p style={{ fontSize:13, fontWeight:700, color:T.textSecondary }}>
                Aucun paiement trouvé
              </p>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:4 }}>
                Essayez d'ajuster vos filtres ou créez un nouveau paiement.
              </p>
            </div>
          ) : (
            visiblePayments.map((p, i) => (
              <PaymentRow key={p.id}
                payment={p}
                onValidate={handleValidate}
                onDelete={handleDelete}
                animDelay={i * 20} />
            ))
          )}
        </div>

        {/* ═══ PAGINATION ═══ */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 2px", marginBottom:16,
        }}>
          <p style={{ fontSize:11, color:T.textMuted }}>
            {totalFiltered === 0 ? "Aucun résultat"
              : `${firstIdx}–${lastIdx} sur ${totalFiltered} paiement${totalFiltered>1?"s":""}`}
          </p>

          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
            <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}
              style={{
                width:32, height:32, borderRadius:8, border:`1.5px solid ${T.cardBorder}`,
                background:"transparent", cursor:page===1?"not-allowed":"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                color: page===1 ? T.textMuted : T.textPrimary,
                opacity: page===1 ? 0.4 : 1,
              }}>
              <FaChevronLeft style={{ width:9,height:9 }} />
            </button>

            {/* Pages visibles */}
            {[...Array(totalPages)].map((_, i) => {
              const p = i + 1;
              const active = p === page;
              if (totalPages > 7 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
                if (p === 2 || p === totalPages - 1) return <span key={p} style={{ fontSize:11,color:T.textMuted }}>…</span>;
                return null;
              }
              return (
                <button key={p} onClick={() => setPage(p)}
                  style={{
                    minWidth:32, height:32, borderRadius:8, border:"none",
                    cursor:"pointer", fontSize:12, fontWeight: active?800:600,
                    background: active ? `linear-gradient(135deg,${COL.from},${COL.to})` : "transparent",
                    color: active ? "#fff" : T.textMuted,
                    boxShadow: active ? `0 3px 10px ${COL.shadow}` : "none",
                    transition:"all .15s",
                  }}>
                  {p}
                </button>
              );
            })}

            <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page===totalPages}
              style={{
                width:32, height:32, borderRadius:8, border:`1.5px solid ${T.cardBorder}`,
                background:"transparent", cursor:page===totalPages?"not-allowed":"pointer",
                display:"flex", alignItems:"center", justifyContent:"center",
                color: page===totalPages ? T.textMuted : T.textPrimary,
                opacity: page===totalPages ? 0.4 : 1,
              }}>
              <FaChevronRight style={{ width:9,height:9 }} />
            </button>
          </div>
        </div>
      </main>

      {/* ═══ MODAL CRÉER PAIEMENT ═══ */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)}
        title="Nouveau paiement" icon={FaPlus} width={480} zIndex={100}>
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Sélection du frais */}
          <Sel label="Frais à régler *" icon={FaReceipt}
            value={form.fee}
            onChange={(e) => {
              const feeObj = fees.find((f) => String(f.id) === e.target.value);
              setForm((p) => ({
                ...p, fee: e.target.value,
                amount: feeObj ? String(feeObj.total_remaining ?? feeObj.amount ?? "") : p.amount,
              }));
            }}>
            <option value="">— Sélectionner un frais impayé —</option>
            {fees.map((f) => (
              <option key={f.id} value={f.id}>
                #{f.id} · {f.fee_type_name || "Frais"} — {formatMoney(f.total_remaining ?? f.amount)}
              </option>
            ))}
          </Sel>

          {/* Montant */}
          <Input label="Montant (FCFA) *" icon={FaCoins}
            type="number" placeholder="0"
            value={form.amount}
            onChange={(e) => setForm((p) => ({ ...p, amount:e.target.value }))} />

          {/* Méthode */}
          <div>
            <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
              letterSpacing:"0.08em", color:T.textMuted, marginBottom:8 }}>
              Méthode de paiement
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
              {METHODS.map(({ id, icon:Icon, label }) => {
                const active = form.method === id;
                return (
                  <button key={id} onClick={() => setForm((p) => ({ ...p, method:id }))}
                    style={{
                      display:"flex", flexDirection:"column", alignItems:"center", gap:5,
                      padding:"10px 6px", borderRadius:10, border:"none", cursor:"pointer",
                      transition:"all .15s",
                      background: active
                        ? `linear-gradient(135deg,${COL.from},${COL.to})`
                        : T.inputBg,
                      border:`1.5px solid ${active?"transparent":T.inputBorder}`,
                      color: active ? "#fff" : T.textMuted,
                      boxShadow: active ? `0 4px 12px ${COL.shadow}` : "none",
                      transform: active ? "translateY(-1px)" : "none",
                    }}>
                    <Icon style={{ width:14,height:14 }} />
                    <span style={{ fontSize:10, fontWeight:800 }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Référence */}
          <Input label="Référence (optionnel)" icon={FaShieldAlt}
            placeholder="N° chèque, ID transaction…"
            value={form.reference}
            onChange={(e) => setForm((p) => ({ ...p, reference:e.target.value }))} />

          {/* Note */}
          <div>
            <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
              letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>
              Note (optionnel)
            </p>
            <textarea
              placeholder="Observation…"
              value={form.note}
              onChange={(e) => setForm((p) => ({ ...p, note:e.target.value }))}
              style={{
                width:"100%", boxSizing:"border-box", padding:"9px 12px",
                fontSize:12, borderRadius:10, outline:"none",
                resize:"vertical", minHeight:64, lineHeight:1.5,
                background:T.inputBg, color:T.textPrimary,
                border:`1.5px solid ${T.inputBorder}`, fontFamily:"inherit",
                transition:"border-color .15s",
              }}
              onFocus={(e) => (e.target.style.borderColor=COL.from)}
              onBlur={(e)  => (e.target.style.borderColor=T.inputBorder)} />
          </div>

          {/* Submit */}
          <button onClick={handleCreate} disabled={creating}
            style={{
              marginTop:4, width:"100%", display:"flex", alignItems:"center",
              justifyContent:"center", gap:8, padding:"12px 16px",
              borderRadius:12, border:"none", cursor:creating?"not-allowed":"pointer",
              fontSize:13, fontWeight:800, color:"#fff",
              background: creating ? T.textMuted
                : `linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow: creating ? "none" : `0 4px 16px ${COL.shadow}`,
            }}>
            {creating
              ? <><FaSyncAlt style={{ width:12,height:12 }} className="animate-spin" /> Envoi…</>
              : <><FaCheck style={{ width:12,height:12 }} /> Créer le paiement</>}
          </button>
        </div>
      </Modal>

      {/* ── Confirm dialog ── */}
      <ConfirmDialog
        open={confirm.open}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm({ open:false })}
        zIndex={200}
      />

      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{BASE_KEYFRAMES}{`
        .animate-spin  { animation: spin 1s linear infinite; }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   ROOT
────────────────────────────────────────────────────────────── */
const PaymentsPage = () => {
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
      <PaymentsInner />
    </ThemeCtx.Provider>
  );
};

export default PaymentsPage;