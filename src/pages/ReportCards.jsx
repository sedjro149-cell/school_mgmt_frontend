// src/pages/ReportCardsUnified.jsx
import React, {
  useCallback, useEffect, useMemo, useRef, useState,
} from "react";
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from "recharts";
import {
  FaGraduationCap, FaUserGraduate, FaLayerGroup, FaBookOpen,
  FaChevronDown, FaSyncAlt, FaTimes, FaCheck, FaExclamationTriangle,
  FaPrint, FaFilePdf, FaMoon, FaSun, FaArrowLeft, FaMedal,
  FaChartBar, FaTable, FaInfoCircle,
} from "react-icons/fa";
import { fetchData } from "./api";
import {
  ThemeCtx, useTheme, LIGHT, DARK,
  SECTION_PALETTE, BASE_KEYFRAMES,
} from "./theme";

const COL = SECTION_PALETTE.tool; // ambre → orange

/* ──────────────────────────────────────────────────────────────
   UTILS
────────────────────────────────────────────────────────────── */
const fmt = (v) =>
  v === null || v === undefined || v === "" ? "—" : String(v).replace(".", ",");

const safeNum = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : Math.round((n + Number.EPSILON) * 100) / 100;
};

function buildQuery(params = {}) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

function handleApiError(err) {
  const status = err?.status ?? err?.statusCode ?? null;
  if (status === 401) {
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    } catch {}
    if (typeof window !== "undefined") window.location.href = "/login";
  }
}

const studentFullName = (s) => {
  if (!s) return "—";
  const fn = s.user?.first_name || s.firstname || "";
  const ln = s.user?.last_name  || s.lastname  || "";
  return `${fn} ${ln}`.trim() || s.user?.username || `#${s.id}`;
};

/* ── Mention par moyenne ── */
const MENTIONS = [
  { min: 16, label:"Très Bien",   from:"#10b981", to:"#059669" },
  { min: 14, label:"Bien",        from:"#22c55e", to:"#16a34a" },
  { min: 12, label:"Assez bien",  from:"#3b82f6", to:"#2563eb" },
  { min: 10, label:"Passable",    from:COL.from,  to:COL.to    },
  { min:  0, label:"Insuffisant", from:"#ef4444", to:"#dc2626" },
];

const mentionFor = (avg) => {
  const n = safeNum(avg);
  if (n === null) return { label:"—", from:"#94a3b8", to:"#64748b" };
  return MENTIONS.find((m) => n >= m.min) ?? MENTIONS[MENTIONS.length - 1];
};

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
    if (msg) { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); }
  }, [msg]);
  if (!msg) return null;
  const isErr = msg.type === "error";
  return (
    <div onClick={onClose} style={{
      position:"fixed", bottom:24, right:24, zIndex:400,
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
const Sel = ({ icon: Icon, label, children, ...props }) => {
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
            <Icon style={{ width:12,height:12 }} />
          </span>
        )}
        <select {...props}
          onFocus={(e) => { setF(true); props.onFocus?.(e); }}
          onBlur={(e)  => { setF(false); props.onBlur?.(e); }}
          style={{
            width:"100%", appearance:"none",
            paddingLeft: Icon ? 30 : 12, paddingRight:28,
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
          position:"absolute", right:10, top:"50%", transform:"translateY(-50%)",
          width:9, height:9, color:T.textMuted, pointerEvents:"none",
        }} />
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   AVERAGE CELL (dans le tableau imprimable)
────────────────────────────────────────────────────────────── */
const AvgCell = ({ value, bold, highlight }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const n = safeNum(value);
  if (n === null) return (
    <span style={{ fontSize:12, color:T.textMuted }}>—</span>
  );
  const { from } = mentionFor(n);
  const passing = n >= 10;
  return (
    <div style={{
      display:"inline-flex", alignItems:"center", justifyContent:"center",
      padding: highlight ? "4px 10px" : "2px 8px",
      borderRadius:8,
      background: highlight
        ? (dark ? `${from}22` : `${from}15`)
        : "transparent",
      border: highlight ? `1.5px solid ${from}44` : "none",
      fontWeight: bold ? 800 : 600,
      fontSize: highlight ? 13 : 12,
      color: passing ? (highlight ? from : T.textPrimary) : "#ef4444",
      minWidth: highlight ? 44 : 32,
    }}>
      {fmt(n)}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   CUSTOM TOOLTIP (recharts)
────────────────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
      borderRadius:10, padding:"8px 12px",
      boxShadow:"0 8px 24px rgba(0,0,0,.15)",
    }}>
      <p style={{ fontSize:11, fontWeight:800, color:T.textPrimary, marginBottom:4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize:11, color:p.fill, fontWeight:700 }}>
          {p.name} : {fmt(p.value)}/20
        </p>
      ))}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   MENTION BADGE
────────────────────────────────────────────────────────────── */
const MentionBadge = ({ avg, size = "sm" }) => {
  const m = mentionFor(avg);
  const n = safeNum(avg);
  const large = size === "lg";
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap: large ? 6 : 4,
      padding: large ? "6px 16px" : "3px 10px",
      borderRadius:999, fontWeight:800,
      fontSize: large ? 14 : 11,
      background:`linear-gradient(135deg,${m.from}22,${m.to}11)`,
      color: m.from,
      border:`1.5px solid ${m.from}44`,
    }}>
      {large && <FaMedal style={{ width:13,height:13 }} />}
      {n !== null ? m.label : "—"}
    </span>
  );
};

/* ──────────────────────────────────────────────────────────────
   PAGE PRINCIPALE (inner)
────────────────────────────────────────────────────────────── */
const ReportCardsInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  /* ── State ── */
  const [classes,        setClasses]        = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classId,        setClassId]        = useState("");
  const [students,       setStudents]       = useState([]);
  const [loadingStudents,setLoadingStudents] = useState(false);
  const [studentId,      setStudentId]      = useState("");
  const [term,           setTerm]           = useState("T1");
  const [reportCard,     setReportCard]     = useState(null);
  const [loadingReport,  setLoadingReport]  = useState(false);
  const [msg,            setMsg]            = useState(null);

  const printableRef = useRef(null);

  /* ── Fetch classes ── */
  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const data = await fetchData("/academics/school-classes/");
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      handleApiError(err);
      setMsg({ type:"error", text:"Impossible de charger les classes." });
    } finally { setLoadingClasses(false); }
  }, []);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  /* ── Fetch élèves ── */
  const fetchStudents = useCallback(async (cid) => {
    if (!cid) { setStudents([]); return; }
    setLoadingStudents(true);
    setStudents([]);
    try {
      const data = await fetchData(`/core/admin/students/by-class/${cid}/`);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      handleApiError(err);
      setMsg({ type:"error", text:"Impossible de charger les élèves." });
    } finally { setLoadingStudents(false); }
  }, []);

  useEffect(() => {
    setStudentId(""); setReportCard(null);
    if (classId) fetchStudents(classId);
    else setStudents([]);
  }, [classId, fetchStudents]);

  /* ── Fetch bulletin ── */
  const fetchReportCard = useCallback(async (sid, t) => {
    if (!sid) return;
    setLoadingReport(true); setReportCard(null);
    try {
      const data = await fetchData(`/academics/report-cards/${buildQuery({ student_id: sid, term: t })}`);
      const arr = Array.isArray(data) ? data : [];
      setReportCard(arr.length ? arr[0] : null);
      if (!arr.length) setMsg({ type:"info", text:"Aucun bulletin trouvé pour cet élève / trimestre." });
    } catch (err) {
      handleApiError(err);
      const s = err?.status;
      setMsg({ type:"error", text:
        s === 401 ? "Non authentifié — veuillez vous reconnecter." :
        s === 403 ? "Accès refusé." :
        "Impossible de charger le bulletin." });
    } finally { setLoadingReport(false); }
  }, []);

  useEffect(() => {
    if (studentId) fetchReportCard(studentId, term);
    else setReportCard(null);
  }, [studentId, term, fetchReportCard]);

  /* ── Chart data ── */
  const chartData = useMemo(() =>
    (reportCard?.subjects ?? []).map((s) => ({
      subject: s.subject?.length > 8 ? s.subject.slice(0, 8) + "…" : s.subject,
      fullName: s.subject,
      average: safeNum(s.average_subject) ?? 0,
      weighted: safeNum(s.average_coeff)  ?? 0,
    })),
    [reportCard]
  );

  /* ── Print ── */
  const onPrint = () => window.print();

  const onExportPdf = async () => {
    if (!printableRef.current) { setMsg({ type:"error", text:"Rien à exporter." }); return; }
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"), import("jspdf"),
      ]);
      // Masquer les éléments no-print pendant le rendu
      const noPrint = document.querySelectorAll(".rc-no-print");
      noPrint.forEach((el) => (el.style.visibility = "hidden"));
      const canvas = await html2canvas(printableRef.current, { scale: 3, useCORS: true, logging: false });
      noPrint.forEach((el) => (el.style.visibility = ""));
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit:"pt", format:"a4" });
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ratio = Math.min((pw - 40) / canvas.width, (ph - 40) / canvas.height);
      pdf.addImage(imgData, "PNG", 20, 20, canvas.width * ratio, canvas.height * ratio);
      const name = `Bulletin_${reportCard?.student_lastname || "eleve"}_${reportCard?.student_firstname || ""}_${term}.pdf`;
      pdf.save(name);
      setMsg({ type:"success", text:"Bulletin exporté en PDF." });
    } catch (err) {
      console.warn("pdf export failed", err);
      onPrint();
    }
  };

  /* ── Helpers ── */
  const reset = () => {
    setClassId(""); setStudentId(""); setStudents([]); setReportCard(null);
  };

  const TERM_COLORS = {
    T1: { from:"#3b82f6", to:"#06b6d4" },
    T2: { from:"#10b981", to:"#14b8a6" },
    T3: { from:COL.from,  to:COL.to    },
  };

  /* ══════════════════════════════════════
     RENDER
  ══════════════════════════════════════ */
  return (
    <div style={{ minHeight:"100vh", background:T.pageBg, transition:"background .3s",
      fontFamily:"'Plus Jakarta Sans', sans-serif", paddingBottom:60 }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ═══ HEADER ═══ */}
      <header className="rc-no-print" style={{
        position:"sticky", top:0, zIndex:40,
        background:T.headerBg, backdropFilter:"blur(16px)",
        borderBottom:`1px solid ${T.divider}`, transition:"all .3s",
      }}>
        <div style={{ maxWidth:1280, margin:"0 auto", padding:"12px 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12, flexWrap:"wrap" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:40, height:40, borderRadius:12, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 6px 18px ${COL.shadow}`,
            }}>
              <FaGraduationCap style={{ width:18,height:18,color:"#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize:17, fontWeight:900, color:T.textPrimary, letterSpacing:"-0.02em" }}>
                Bulletins Scolaires
              </h1>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>
                Consultation et export des bulletins par trimestre
              </p>
            </div>
          </div>
          <DarkToggle />
        </div>
      </header>

      <main style={{ maxWidth:1280, margin:"0 auto", padding:"20px 24px 0" }}>

        {/* ═══ SÉLECTEURS ═══ */}
        <div className="rc-no-print" style={{
          borderRadius:16, padding:"16px 20px", marginBottom:16,
          background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
          boxShadow:T.cardShadow,
        }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 180px auto", gap:12, alignItems:"end" }}>

            {/* Classe */}
            <Sel label="Classe" icon={FaLayerGroup}
              value={classId} onChange={(e) => setClassId(e.target.value)}
              disabled={loadingClasses}>
              <option value="">{loadingClasses ? "Chargement…" : "— Choisir une classe —"}</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.level?.name ? ` (${c.level.name})` : ""}</option>
              ))}
            </Sel>

            {/* Élève */}
            <Sel label={`Élève${loadingStudents ? " …" : ""}`} icon={FaUserGraduate}
              value={studentId} onChange={(e) => setStudentId(e.target.value)}
              disabled={!classId || loadingStudents}>
              <option value="">
                {!classId ? "Sélectionner une classe" :
                  loadingStudents ? "Chargement…" :
                  students.length === 0 ? "Aucun élève" : "— Choisir un élève —"}
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {studentFullName(s)}
                  {(s.user?.username || s.username) ? ` · ${s.user?.username || s.username}` : ""}
                </option>
              ))}
            </Sel>

            {/* Trimestre — 3 boutons pill */}
            <div>
              <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted, marginBottom:5 }}>
                Trimestre
              </p>
              <div style={{ display:"flex", gap:6 }}>
                {Object.entries(TERM_COLORS).map(([t, { from, to }]) => {
                  const active = term === t;
                  return (
                    <button key={t} onClick={() => setTerm(t)}
                      style={{
                        flex:1, padding:"8px 4px", borderRadius:9, border:"none",
                        cursor:"pointer", fontSize:12, fontWeight:800, transition:"all .15s",
                        background: active ? `linear-gradient(135deg,${from},${to})` : T.inputBg,
                        color: active ? "#fff" : T.textMuted,
                        border:`1.5px solid ${active ? "transparent" : T.inputBorder}`,
                        boxShadow: active ? `0 3px 10px ${from}55` : "none",
                        transform: active ? "translateY(-1px)" : "none",
                      }}>
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:8, flexDirection:"column" }}>
              <button
                onClick={() => studentId ? fetchReportCard(studentId, term) : setMsg({ type:"error", text:"Choisissez d'abord un élève." })}
                style={{
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  padding:"9px 14px", borderRadius:10, border:"none", cursor:"pointer",
                  fontSize:11, fontWeight:800, color:"#fff",
                  background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                  boxShadow:`0 3px 10px ${COL.shadow}`,
                }}>
                <FaSyncAlt style={{ width:10,height:10 }} className={loadingReport?"animate-spin":""} />
                Recharger
              </button>
              <button onClick={reset}
                style={{
                  display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                  padding:"8px 14px", borderRadius:10, cursor:"pointer",
                  fontSize:11, fontWeight:700, color:T.textSecondary,
                  background:"transparent", border:`1.5px solid ${T.cardBorder}`,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background=T.rowHover)}
                onMouseLeave={(e) => (e.currentTarget.style.background="transparent")}>
                <FaTimes style={{ width:10,height:10 }} />
                Vider
              </button>
            </div>
          </div>
        </div>

        {/* ═══ ÉTAT VIDE / LOADING ═══ */}
        {!studentId && !loadingReport && (
          <div style={{
            borderRadius:16, padding:"60px 24px", textAlign:"center",
            background:T.cardBg, border:`2px dashed ${COL.from}44`,
            animation:"fadeUp .3s ease-out",
          }}>
            <div style={{
              width:68, height:68, borderRadius:20, margin:"0 auto 16px",
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${COL.from}22,${COL.to}11)`,
            }}>
              <FaGraduationCap style={{ width:28,height:28,color:COL.from,opacity:.6 }} />
            </div>
            <p style={{ fontSize:16, fontWeight:800, color:T.textSecondary }}>
              Sélectionnez un élève
            </p>
            <p style={{ fontSize:12, color:T.textMuted, marginTop:6, maxWidth:300, margin:"6px auto 0", lineHeight:1.6 }}>
              Choisissez une classe, un élève et un trimestre pour afficher le bulletin scolaire.
            </p>
          </div>
        )}

        {loadingReport && studentId && (
          <div style={{
            borderRadius:16, padding:"60px 24px", textAlign:"center",
            background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
          }}>
            <FaSyncAlt style={{ width:28,height:28,color:COL.from,margin:"0 auto 14px" }} className="animate-spin" />
            <p style={{ fontSize:13, color:T.textMuted }}>Chargement du bulletin…</p>
          </div>
        )}

        {/* ═══ BULLETIN ═══ */}
        {reportCard && !loadingReport && (() => {
          const avg = safeNum(reportCard.term_average);
          const mention = mentionFor(avg);
          const tc = TERM_COLORS[term] || TERM_COLORS.T1;

          return (
            <div style={{ animation:"fadeUp .3s ease-out" }}>

              {/* Barre d'actions (no-print) */}
              <div className="rc-no-print" style={{
                display:"flex", alignItems:"center", justifyContent:"space-between",
                gap:12, flexWrap:"wrap",
                marginBottom:14, padding:"12px 16px",
                borderRadius:12, background:T.cardBg,
                border:`1.5px solid ${T.cardBorder}`, boxShadow:T.cardShadow,
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  {/* Avatar initiale */}
                  <div style={{
                    width:40, height:40, borderRadius:12, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    fontWeight:900, fontSize:16, color:"#fff",
                    background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                    boxShadow:`0 4px 12px ${COL.shadow}`,
                  }}>
                    {(reportCard.student_firstname?.[0] || reportCard.student_lastname?.[0] || "?").toUpperCase()}
                  </div>
                  <div>
                    <p style={{ fontSize:15, fontWeight:900, color:T.textPrimary }}>
                      {reportCard.student_firstname} {reportCard.student_lastname}
                    </p>
                    <p style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>
                      {reportCard.student_class} · Trimestre {term}
                    </p>
                  </div>
                  <MentionBadge avg={avg} size="sm" />
                </div>

                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={() => { setStudentId(""); setReportCard(null); }}
                    style={{
                      display:"flex", alignItems:"center", gap:6, padding:"8px 14px",
                      borderRadius:10, border:`1.5px solid ${T.cardBorder}`,
                      background:"transparent", cursor:"pointer",
                      fontSize:11, fontWeight:700, color:T.textSecondary,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background=T.rowHover)}
                    onMouseLeave={(e) => (e.currentTarget.style.background="transparent")}>
                    <FaArrowLeft style={{ width:10,height:10 }} /> Autre élève
                  </button>
                  <button onClick={onPrint}
                    style={{
                      display:"flex", alignItems:"center", gap:6, padding:"8px 14px",
                      borderRadius:10, border:"none", cursor:"pointer",
                      fontSize:11, fontWeight:700, color:"#fff",
                      background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
                      boxShadow:"0 3px 10px #6366f144",
                    }}>
                    <FaPrint style={{ width:11,height:11 }} /> Imprimer
                  </button>
                  <button onClick={onExportPdf}
                    style={{
                      display:"flex", alignItems:"center", gap:6, padding:"8px 14px",
                      borderRadius:10, border:"none", cursor:"pointer",
                      fontSize:11, fontWeight:700, color:"#fff",
                      background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                      boxShadow:`0 3px 10px ${COL.shadow}`,
                    }}>
                    <FaFilePdf style={{ width:11,height:11 }} /> Exporter PDF
                  </button>
                </div>
              </div>

              {/* ─── ZONE IMPRIMABLE ─── */}
              <div ref={printableRef} style={{
                background:T.cardBg, borderRadius:16, overflow:"hidden",
                border:`1.5px solid ${T.cardBorder}`, boxShadow:T.cardShadow,
              }}>
                {/* Bande de couleur trimestre */}
                <div style={{ height:5, background:`linear-gradient(90deg,${tc.from},${tc.to})` }} />

                {/* En-tête bulletin */}
                <div style={{
                  padding:"24px 28px",
                  borderBottom:`1.5px solid ${T.divider}`,
                  display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap",
                }}>
                  <div>
                    <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
                      letterSpacing:"0.12em", color:T.textMuted, marginBottom:6 }}>
                      Bulletin Scolaire
                    </p>
                    <h2 style={{ fontSize:22, fontWeight:900, color:T.textPrimary, lineHeight:1.1, marginBottom:4 }}>
                      {reportCard.student_firstname} {reportCard.student_lastname}
                    </h2>
                    <p style={{ fontSize:13, color:T.textSecondary }}>
                      {reportCard.student_class}
                      {reportCard.student_class ? " · " : ""}
                      Trimestre {term}
                    </p>
                  </div>

                  {/* Stats résumé */}
                  <div style={{ display:"flex", gap:16, flexWrap:"wrap" }}>
                    {[
                      {
                        label:"Moyenne générale",
                        val: avg !== null ? `${fmt(avg)}/20` : "—",
                        color: avg !== null
                          ? (avg >= 10 ? COL.from : "#ef4444")
                          : T.textMuted,
                        big: true,
                      },
                      {
                        label:"Mention",
                        val: mention.label,
                        color: mention.from,
                        big: false,
                      },
                      {
                        label:"Rang",
                        val: reportCard.rank != null ? `${reportCard.rank}e` : "—",
                        color: T.textSecondary,
                        big: false,
                      },
                    ].map(({ label, val, color, big }, i) => (
                      <div key={i} style={{
                        textAlign:"center", padding:"10px 16px", borderRadius:12,
                        background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)",
                        border:`1px solid ${T.cardBorder}`, minWidth:90,
                      }}>
                        <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                          letterSpacing:"0.07em", color:T.textMuted, marginBottom:4 }}>
                          {label}
                        </p>
                        <p style={{ fontSize: big ? 22 : 14, fontWeight:900, color, lineHeight:1 }}>
                          {val}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Layout : tableau + aside */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 280px" }}>

                  {/* ── Tableau des matières ── */}
                  <div style={{ borderRight:`1px solid ${T.divider}`, overflowX:"auto" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                      <thead>
                        <tr style={{
                          background:T.tableHead,
                          borderBottom:`2px solid ${T.divider}`,
                        }}>
                          {[
                            { lbl:"Matière",     align:"left",   w:"auto"  },
                            { lbl:"Coef",        align:"center", w:44      },
                            { lbl:"I1",          align:"center", w:40      },
                            { lbl:"I2",          align:"center", w:40      },
                            { lbl:"I3",          align:"center", w:40      },
                            { lbl:"D1",          align:"center", w:40      },
                            { lbl:"D2",          align:"center", w:40      },
                            { lbl:"Moy Interro", align:"center", w:80      },
                            { lbl:"Moy Matière", align:"center", w:90      },
                            { lbl:"Moy×Coef",    align:"center", w:80      },
                          ].map(({ lbl, align, w }, i) => (
                            <th key={i} style={{
                              padding:"9px 10px", textAlign:align,
                              fontSize:9, fontWeight:800, textTransform:"uppercase",
                              letterSpacing:"0.07em", color:T.textMuted,
                              width: w === "auto" ? undefined : w,
                              whiteSpace:"nowrap",
                              background: lbl === "Moy Matière"
                                ? (dark ? `${COL.from}18` : `${COL.from}0e`)
                                : "transparent",
                            }}>
                              {lbl}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(reportCard.subjects ?? []).map((s, idx) => {
                          const subAvg = safeNum(s.average_subject);
                          const even = idx % 2 === 0;
                          return (
                            <tr key={idx} style={{
                              borderBottom:`1px solid ${T.divider}`,
                              background: even ? T.cardBg
                                : (dark ? "rgba(255,255,255,0.018)" : "rgba(0,0,0,0.012)"),
                              transition:"background .12s",
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background=dark?`${COL.from}12`:`${COL.from}07`)}
                            onMouseLeave={(e) => (e.currentTarget.style.background=even?T.cardBg:dark?"rgba(255,255,255,0.018)":"rgba(0,0,0,0.012)")}>

                              {/* Matière */}
                              <td style={{ padding:"9px 10px", fontWeight:700, color:T.textPrimary }}>
                                {s.subject}
                              </td>
                              {/* Coef */}
                              <td style={{ padding:"9px 10px", textAlign:"center", color:T.textMuted, fontWeight:600 }}>
                                {s.coefficient ?? 1}
                              </td>
                              {/* Notes individuelles */}
                              {[s.interrogation1, s.interrogation2, s.interrogation3, s.devoir1, s.devoir2].map((v, i) => (
                                <td key={i} style={{ padding:"9px 10px", textAlign:"center" }}>
                                  <span style={{
                                    fontSize:11, color: safeNum(v) !== null && safeNum(v) < 10
                                      ? "#ef4444" : T.textSecondary,
                                    fontWeight: safeNum(v) !== null && safeNum(v) < 10 ? 700 : 500,
                                  }}>
                                    {fmt(v)}
                                  </span>
                                </td>
                              ))}
                              {/* Moy Interro */}
                              <td style={{ padding:"9px 10px", textAlign:"center" }}>
                                <AvgCell value={s.average_interro} />
                              </td>
                              {/* Moy Matière (highlightée) */}
                              <td style={{
                                padding:"9px 10px", textAlign:"center",
                                background: dark ? `${COL.from}12` : `${COL.from}07`,
                              }}>
                                <AvgCell value={s.average_subject} bold highlight />
                              </td>
                              {/* Moy×Coef */}
                              <td style={{ padding:"9px 10px", textAlign:"center" }}>
                                <AvgCell value={s.average_coeff} bold />
                              </td>
                            </tr>
                          );
                        })}

                        {(!reportCard.subjects || reportCard.subjects.length === 0) && (
                          <tr>
                            <td colSpan={10} style={{ padding:"32px 16px", textAlign:"center",
                              fontSize:13, fontStyle:"italic", color:T.textMuted }}>
                              Aucune matière avec note pour ce trimestre.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* ── Colonne latérale : stats + graphique ── */}
                  <div className="rc-no-print" style={{ display:"flex", flexDirection:"column" }}>

                    {/* Stats */}
                    <div style={{ padding:"20px 18px", borderBottom:`1px solid ${T.divider}` }}>
                      <p style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
                        letterSpacing:"0.07em", color:T.textMuted, marginBottom:12 }}>
                        Statistiques
                      </p>
                      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                        {[
                          { label:"Meilleure moyenne",    val: reportCard.best_average,  color:"#10b981" },
                          { label:"Moyenne la plus basse", val: reportCard.worst_average, color:"#ef4444" },
                          { label:"Moyenne pondérée",      val: reportCard.term_average,  color:COL.from  },
                        ].map(({ label, val, color }, i) => {
                          const n = safeNum(val);
                          const pct = n !== null ? Math.min(100, n / 20 * 100) : 0;
                          return (
                            <div key={i}>
                              <div style={{ display:"flex", justifyContent:"space-between",
                                marginBottom:4, alignItems:"baseline" }}>
                                <span style={{ fontSize:10, color:T.textMuted, fontWeight:600 }}>{label}</span>
                                <span style={{ fontSize:13, fontWeight:900, color }}>{fmt(n)}</span>
                              </div>
                              <div style={{ height:5, borderRadius:999,
                                background: dark?"rgba(255,255,255,0.06)":"#f1f5f9" }}>
                                <div style={{
                                  width:`${pct}%`, height:"100%", borderRadius:999,
                                  background: `linear-gradient(90deg,${color},${color}aa)`,
                                  transition:"width .5s ease-out",
                                }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Mention grande */}
                      <div style={{ marginTop:14 }}>
                        <MentionBadge avg={avg} size="lg" />
                      </div>
                    </div>

                    {/* Graphique */}
                    {chartData.length > 0 && (
                      <div style={{ padding:"16px 18px", flex:1 }}>
                        <p style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
                          letterSpacing:"0.07em", color:T.textMuted, marginBottom:10 }}>
                          Moyennes par matière
                        </p>
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={chartData} margin={{ top:4, right:4, left:-24, bottom:50 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={T.divider} />
                            <ReferenceLine y={10} stroke="#ef444466" strokeDasharray="4 2" />
                            <XAxis
                              dataKey="subject"
                              interval={0}
                              angle={-40}
                              textAnchor="end"
                              height={60}
                              tick={{ fontSize:8, fill:T.textMuted, fontWeight:600 }}
                            />
                            <YAxis
                              domain={[0, 20]}
                              ticks={[0, 5, 10, 15, 20]}
                              tick={{ fontSize:9, fill:T.textMuted }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="average" name="Moy. matière"
                              radius={[4, 4, 0, 0]}
                              fill={`url(#barGrad)`} />
                            <defs>
                              <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={COL.from} />
                                <stop offset="100%" stopColor={COL.to} />
                              </linearGradient>
                            </defs>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>

                {/* Pied de page bulletin */}
                <div style={{
                  padding:"14px 28px",
                  borderTop:`1px solid ${T.divider}`,
                  display:"flex", alignItems:"center", justifyContent:"space-between",
                  flexWrap:"wrap", gap:8,
                }}>
                  <p style={{ fontSize:11, color:T.textMuted }}>
                    Édité le {new Date().toLocaleDateString("fr-FR", { day:"2-digit", month:"long", year:"numeric" })}
                  </p>
                  <p style={{ fontSize:11, color:T.textMuted, fontStyle:"italic" }}>
                    Cachet et Signature de l'Administration
                  </p>
                </div>
              </div>
            </div>
          );
        })()}
      </main>

      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{BASE_KEYFRAMES}{`
        .animate-spin  { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }

        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden; }
          [data-printable], [data-printable] * { visibility: visible; }
          .rc-no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

/* ── Root ── */
const ReportCardsUnified = () => {
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
      <ReportCardsInner />
    </ThemeCtx.Provider>
  );
};

export default ReportCardsUnified;