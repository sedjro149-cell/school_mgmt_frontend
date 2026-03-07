// src/pages/GenerateTimetable.jsx
import React, {
  useCallback, useEffect, useMemo, useState,
} from "react";
import {
  FaPlay, FaDownload, FaBolt, FaExclamationTriangle,
  FaCheckCircle, FaTimesCircle, FaLayerGroup, FaClock,
  FaMapMarkerAlt, FaMoon, FaSun, FaChevronDown,
  FaCheck, FaTimes, FaSyncAlt, FaCalendarAlt,
  FaUserTie, FaBookOpen, FaChartBar, FaInfoCircle,
  FaArrowRight, FaClipboardCheck,
} from "react-icons/fa";
import { fetchData, postData } from "./api";
import {
  ThemeCtx, useTheme, LIGHT, DARK,
  SECTION_PALETTE, BASE_KEYFRAMES,
} from "./theme";

const COL = SECTION_PALETTE.academic; // blue → cyan

/* ──────────────────────────────────────────────────────────────
   UTILS
────────────────────────────────────────────────────────────── */
const WEEKDAYS = [
  { v:1, label:"Lundi"    },
  { v:2, label:"Mardi"    },
  { v:3, label:"Mercredi" },
  { v:4, label:"Jeudi"    },
  { v:5, label:"Vendredi" },
  { v:6, label:"Samedi"   },
];

const toMin = (t) => {
  if (!t) return 0;
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
};

const interpretReport = (report) => {
  if (!report) return null;
  if (report.detected_before || report.detected_after || report.resolve_report) {
    const before  = report.detected_before ?? report.detected;
    const resolve = report.resolve_report ?? report.resolve;
    const after   = report.detected_after;
    return {
      type: "detection_pipeline",
      before: before?.meta ?? before,
      resolve,
      after: after?.meta ?? after,
      raw: report,
    };
  }
  if (report.resolve_report || report.initial_conflicts_count !== undefined || report.proposals) {
    const rr = report.resolve_report ?? report;
    return {
      type: "resolve_direct",
      initial:    rr.initial_conflicts_count ?? rr.initial_conflicts ?? rr.detected_count ?? 0,
      resolved:   rr.resolved_count  ?? rr.resolved?.length  ?? 0,
      unresolved: rr.unresolved_count ?? rr.unresolved?.length ?? 0,
      proposals:  rr.proposals ?? [],
      applied:    rr.applied   ?? [],
      errors:     rr.errors    ?? [],
      raw: report,
    };
  }
  if (report.created !== undefined || report.summary !== undefined || report.stats !== undefined) {
    return {
      type: "generator_summary",
      created: report.created,
      updated: report.updated,
      summary: report.summary ?? report.stats,
      raw: report,
    };
  }
  return { type: "unknown", raw: report };
};

/* ──────────────────────────────────────────────────────────────
   ATOMES UI
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
      position:"fixed", bottom:24, right:24, zIndex:300,
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

/* Toggle switch stylisé */
const Toggle = ({ checked, onChange, label, sub, accentColor }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const ac = accentColor || COL.from;
  return (
    <div style={{ display:"flex", alignItems:"flex-start", gap:12, cursor:"pointer" }}
      onClick={() => onChange(!checked)}>
      <div style={{
        flexShrink:0, marginTop:2,
        width:40, height:22, borderRadius:999, position:"relative",
        background: checked ? `linear-gradient(135deg,${ac},${COL.to})` : T.inputBg,
        border:`1.5px solid ${checked ? ac : T.inputBorder}`,
        boxShadow: checked ? `0 2px 8px ${ac}44` : "none",
        transition:"all .2s", cursor:"pointer",
      }}>
        <div style={{
          position:"absolute", top:2, width:14, height:14, borderRadius:999,
          background:"#fff", boxShadow:"0 1px 4px rgba(0,0,0,.2)",
          transition:"left .2s",
          left: checked ? "calc(100% - 16px)" : 2,
        }} />
      </div>
      <div>
        <p style={{ fontSize:12, fontWeight:700, color:T.textPrimary, lineHeight:1.2 }}>{label}</p>
        {sub && <p style={{ fontSize:10, color:T.textMuted, marginTop:2 }}>{sub}</p>}
      </div>
    </div>
  );
};

/* Styled select */
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
            pointerEvents:"none", color: f ? COL.from : T.textMuted, transition:"color .15s",
          }}>
            <Icon style={{ width:11,height:11 }} />
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
   RAPPORT LISIBLE — traduit le JSON en langage humain
────────────────────────────────────────────────────────────── */
const HumanReport = ({ interpreted }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  if (!interpreted) return null;

  /* ── Carte stat mini ── */
  const MiniStat = ({ label, value, color, icon: Icon, sub }) => (
    <div style={{
      borderRadius:12, padding:"12px 16px",
      background: dark ? `${color}15` : `${color}0e`,
      border:`1.5px solid ${color}33`,
      display:"flex", flexDirection:"column", gap:4, flex:1, minWidth:120,
    }}>
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        {Icon && <Icon style={{ width:11,height:11,color }} />}
        <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
          letterSpacing:"0.08em", color }}>{label}</p>
      </div>
      <p style={{ fontSize:22, fontWeight:900, color, lineHeight:1 }}>
        {value ?? "—"}
      </p>
      {sub && <p style={{ fontSize:10, color:T.textMuted }}>{sub}</p>}
    </div>
  );

  /* ── Bande résultat ── */
  const ResultRow = ({ icon: Icon, color, title, desc }) => (
    <div style={{
      display:"flex", alignItems:"flex-start", gap:10,
      padding:"10px 14px", borderRadius:10,
      background: dark ? `${color}12` : `${color}08`,
      border:`1px solid ${color}33`,
    }}>
      <div style={{
        width:28, height:28, borderRadius:8, flexShrink:0,
        display:"flex", alignItems:"center", justifyContent:"center",
        background:`${color}22`, color,
      }}>
        <Icon style={{ width:11,height:11 }} />
      </div>
      <div>
        <p style={{ fontSize:12, fontWeight:800, color:T.textPrimary, lineHeight:1.2 }}>{title}</p>
        <p style={{ fontSize:11, color:T.textSecondary, marginTop:3, lineHeight:1.5 }}>{desc}</p>
      </div>
    </div>
  );

  /* ─── TYPE : DETECTION PIPELINE ─── */
  if (interpreted.type === "detection_pipeline") {
    const { before, after, resolve } = interpreted;
    const tcBefore = (before?.num_teacher_conflicts  ?? 0);
    const ccBefore = (before?.num_class_conflicts    ?? 0);
    const tcAfter  = after ? (after?.num_teacher_conflicts ?? "—") : null;
    const ccAfter  = after ? (after?.num_class_conflicts   ?? "—") : null;
    const totalBefore = tcBefore + ccBefore;
    const totalAfter  = (tcAfter !== null && tcAfter !== "—" && ccAfter !== null && ccAfter !== "—")
      ? Number(tcAfter) + Number(ccAfter) : null;
    const improved = totalAfter !== null && totalAfter < totalBefore;
    const resolved   = resolve?.resolved_count   ?? resolve?.resolved?.length   ?? 0;
    const unresolved = resolve?.unresolved_count ?? resolve?.unresolved?.length ?? 0;
    const errors     = resolve?.errors?.length ?? 0;

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

        {/* Résumé une phrase */}
        <div style={{
          padding:"12px 16px", borderRadius:12,
          background: improved
            ? (dark?"#10b98118":"#10b98108")
            : (dark?"#f59e0b18":"#f59e0b08"),
          border:`1.5px solid ${improved?"#10b98144":"#f59e0b44"}`,
          display:"flex", alignItems:"center", gap:10,
        }}>
          {improved
            ? <FaCheckCircle style={{ width:16,height:16,color:"#10b981",flexShrink:0 }} />
            : <FaExclamationTriangle style={{ width:16,height:16,color:"#f59e0b",flexShrink:0 }} />}
          <p style={{ fontSize:13, fontWeight:700, color:T.textPrimary, lineHeight:1.4 }}>
            {improved
              ? `Optimisation réussie — les conflits sont passés de ${totalBefore} à ${totalAfter}.`
              : totalBefore === 0
                ? "Aucun conflit détecté dans l'emploi du temps actuel."
                : `${totalBefore} conflit${totalBefore > 1?"s":""} détecté${totalBefore > 1?"s":""} dans l'emploi du temps.`}
          </p>
        </div>

        {/* Stats avant / après */}
        <div>
          <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
            letterSpacing:"0.08em", color:T.textMuted, marginBottom:8 }}>
            État des conflits
          </p>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <MiniStat label="Conflits profs (avant)" value={tcBefore}
              color="#ef4444" icon={FaUserTie}
              sub={tcBefore === 0 ? "Aucun conflit" : "Prof assigné à 2 cours en même temps"} />
            <MiniStat label="Conflits classes (avant)" value={ccBefore}
              color="#f97316" icon={FaBookOpen}
              sub={ccBefore === 0 ? "Aucun conflit" : "Classe avec 2 cours simultanés"} />
            {tcAfter !== null && (
              <MiniStat label="Conflits profs (après)" value={tcAfter}
                color="#3b82f6" icon={FaUserTie} sub="Après résolution" />
            )}
            {ccAfter !== null && (
              <MiniStat label="Conflits classes (après)" value={ccAfter}
                color="#06b6d4" icon={FaBookOpen} sub="Après résolution" />
            )}
          </div>
        </div>

        {/* Résolution */}
        {resolve && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
              letterSpacing:"0.08em", color:T.textMuted }}>
              Résolution automatique
            </p>
            {resolved > 0 && (
              <ResultRow icon={FaCheckCircle} color="#10b981"
                title={`${resolved} conflit${resolved>1?"s":""} résolu${resolved>1?"s":""}`}
                desc="Les créneaux ont été automatiquement réorganisés pour éliminer les chevauchements." />
            )}
            {unresolved > 0 && (
              <ResultRow icon={FaExclamationTriangle} color="#f59e0b"
                title={`${unresolved} conflit${unresolved>1?"s":""} non résolu${unresolved>1?"s":""}`}
                desc="Ces conflits nécessitent une intervention manuelle : vérifiez la disponibilité des enseignants ou les créneaux configurés." />
            )}
            {resolved === 0 && unresolved === 0 && (
              <ResultRow icon={FaInfoCircle} color={COL.from}
                title="Aucune action de résolution effectuée"
                desc="Soit il n'y avait aucun conflit, soit la résolution automatique n'a pas trouvé de solution." />
            )}
            {errors > 0 && (
              <ResultRow icon={FaTimesCircle} color="#ef4444"
                title={`${errors} erreur${errors>1?"s":""} technique${errors>1?"s":""}`}
                desc="Des erreurs sont survenues pendant la résolution. Consultez les logs pour plus de détails." />
            )}
          </div>
        )}
      </div>
    );
  }

  /* ─── TYPE : RESOLVE DIRECT ─── */
  if (interpreted.type === "resolve_direct") {
    const { initial, resolved, unresolved, errors } = interpreted;
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{
          padding:"12px 16px", borderRadius:12,
          background: unresolved === 0
            ? (dark?"#10b98118":"#10b98108")
            : (dark?"#f59e0b18":"#f59e0b08"),
          border:`1.5px solid ${unresolved===0?"#10b98144":"#f59e0b44"}`,
          display:"flex", alignItems:"center", gap:10,
        }}>
          {unresolved === 0
            ? <FaCheckCircle style={{ width:16,height:16,color:"#10b981",flexShrink:0 }} />
            : <FaExclamationTriangle style={{ width:16,height:16,color:"#f59e0b",flexShrink:0 }} />}
          <p style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>
            {initial === 0
              ? "Aucun conflit n'a été trouvé — l'emploi du temps est cohérent."
              : unresolved === 0
                ? `Tous les conflits ont été résolus (${resolved} au total).`
                : `${resolved} conflit${resolved>1?"s":""} résolu${resolved>1?"s":""}, ${unresolved} restant${unresolved>1?"s":""}.`}
          </p>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <MiniStat label="Conflits détectés" value={initial}
            color="#ef4444" icon={FaExclamationTriangle} />
          <MiniStat label="Résolus" value={resolved}
            color="#10b981" icon={FaCheckCircle} />
          <MiniStat label="Non résolus" value={unresolved}
            color="#f59e0b" icon={FaExclamationTriangle} />
          {errors.length > 0 && (
            <MiniStat label="Erreurs" value={errors.length}
              color="#ef4444" icon={FaTimesCircle} />
          )}
        </div>
        {unresolved > 0 && (
          <ResultRow icon={FaInfoCircle} color={COL.from}
            title="Que faire avec les conflits non résolus ?"
            desc="Vérifiez que chaque enseignant n'est pas assigné à deux classes simultanées, et que les créneaux horaires (Time Slots) sont correctement configurés dans l'administration." />
        )}
      </div>
    );
  }

  /* ─── TYPE : GENERATOR SUMMARY ─── */
  if (interpreted.type === "generator_summary") {
    const { created, updated, summary } = interpreted;
    const totalSubjects   = summary?.total_subjects   ?? summary?.subjects   ?? null;
    const totalClasses    = summary?.total_classes    ?? summary?.classes     ?? null;
    const totalConflicts  = summary?.conflicts_found  ?? summary?.conflicts   ?? null;
    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        <div style={{
          padding:"12px 16px", borderRadius:12,
          background: dark ? `${COL.from}18` : `${COL.from}0a`,
          border:`1.5px solid ${COL.from}44`,
          display:"flex", alignItems:"center", gap:10,
        }}>
          <FaCalendarAlt style={{ width:16,height:16,color:COL.from,flexShrink:0 }} />
          <p style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>
            Génération terminée
            {created !== undefined && ` — ${created} créneau${Number(created)>1?"x":""} créé${Number(created)>1?"s":""}`}
            {updated ? `, ${updated} mis à jour` : ""}.
          </p>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          {created  !== undefined && (
            <MiniStat label="Créneaux créés"   value={created}  color={COL.from}  icon={FaCalendarAlt} />
          )}
          {updated  !== undefined && (
            <MiniStat label="Créneaux mis à jour" value={updated} color="#6366f1"  icon={FaSyncAlt}    />
          )}
          {totalSubjects !== null && (
            <MiniStat label="Matières traitées" value={totalSubjects} color="#f97316" icon={FaBookOpen} />
          )}
          {totalClasses  !== null && (
            <MiniStat label="Classes traitées"  value={totalClasses}  color="#8b5cf6" icon={FaLayerGroup} />
          )}
          {totalConflicts !== null && (
            <MiniStat label="Conflits résiduels" value={totalConflicts}
              color={totalConflicts > 0 ? "#ef4444" : "#10b981"}
              icon={totalConflicts > 0 ? FaExclamationTriangle : FaCheckCircle} />
          )}
        </div>
        {created === 0 && updated === 0 && (
          <div style={{
            padding:"12px 14px", borderRadius:10,
            background: dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.03)",
            border:`1px solid ${T.cardBorder}`,
          }}>
            <p style={{ fontSize:12, color:T.textSecondary, lineHeight:1.5 }}>
              <strong>Aucun changement</strong> — Cela peut signifier que l'emploi du temps est déjà complet,
              ou que le mode <em>simulation</em> est activé (les résultats ne sont pas sauvegardés).
            </p>
          </div>
        )}
      </div>
    );
  }

  /* ─── FALLBACK (type inconnu) ─── */
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
      <div style={{
        padding:"12px 14px", borderRadius:10,
        background: dark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.025)",
        border:`1px solid ${T.cardBorder}`,
      }}>
        <p style={{ fontSize:12, fontWeight:700, color:T.textPrimary, marginBottom:6 }}>
          L'opération s'est terminée avec succès.
        </p>
        <p style={{ fontSize:11, color:T.textMuted, lineHeight:1.5 }}>
          Le serveur a répondu mais le format du rapport n'est pas reconnu.
          L'emploi du temps a probablement été mis à jour — actualisez la grille de visualisation pour vérifier.
        </p>
      </div>
    </div>
  );

};

/* ──────────────────────────────────────────────────────────────
   ENTRY CHIP (cellule du planning)
────────────────────────────────────────────────────────────── */
const EntryChip = ({ entry }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div style={{
      borderRadius:7, padding:"5px 7px", marginBottom:4,
      background: dark ? `${COL.from}18` : `${COL.from}0d`,
      borderLeft:`3px solid ${COL.from}`,
      border:`1px solid ${COL.from}33`,
      transition:"all .12s",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.background=dark?`${COL.from}28`:`${COL.from}18`;
      e.currentTarget.style.borderLeftColor=COL.to;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background=dark?`${COL.from}18`:`${COL.from}0d`;
      e.currentTarget.style.borderLeftColor=COL.from;
    }}>
      <p style={{
        fontSize:10, fontWeight:800, color:T.textPrimary,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        maxWidth:130,
      }}>
        {entry.subject_name || entry.subject || "—"}
      </p>
      <p style={{
        fontSize:9, color:T.textMuted, marginTop:1,
        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
        maxWidth:130,
      }}>
        {entry.teacher_name || entry.teacher || ""}
      </p>
      {entry.room && (
        <div style={{ display:"flex", alignItems:"center", gap:3, marginTop:2 }}>
          <FaMapMarkerAlt style={{ width:7,height:7,color:COL.from,flexShrink:0 }} />
          <span style={{ fontSize:9, color:COL.from, fontWeight:700 }}>{entry.room}</span>
        </div>
      )}
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   PAGE PRINCIPALE (inner)
────────────────────────────────────────────────────────────── */
const GenerateTimetableInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  /* ── Data ── */
  const [classes,    setClasses]    = useState([]);
  const [timeSlots,  setTimeSlots]  = useState([]);
  const [entries,    setEntries]    = useState([]);
  const [conflicts,  setConflicts]  = useState(null);

  /* ── UI ── */
  const [loading,    setLoading]    = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");

  /* ── Generation ── */
  const [running,    setRunning]    = useState(false);
  const [resolving,  setResolving]  = useState(false);
  const [dryRun,     setDryRun]     = useState(true);
  const [persist,    setPersist]    = useState(false);
  const [report,     setReport]     = useState(null);
  const [msg,        setMsg]        = useState(null);

  const toast = (type, text) => setMsg({ type, text });

  /* ── Chargement initial ── */
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cls, slots, conf] = await Promise.all([
          fetchData("/academics/school-classes/"),
          fetchData("/academics/time-slots/"),
          fetchData("/academics/timetable-conflicts/").catch(() => null),
        ]);
        const classArr = Array.isArray(cls) ? cls : cls?.results ?? [];
        setClasses(classArr);
        if (classArr.length > 0) setSelectedClassId(classArr[0].id);
        const slotArr = (slots || []).slice()
          .sort((a, b) => (a.day - b.day) || String(a.start_time).localeCompare(String(b.start_time)));
        setTimeSlots(slotArr);
        setConflicts(conf);
      } catch { toast("error", "Erreur lors du chargement des données."); }
      finally { setLoading(false); }
    })();
  }, []);

  /* ── Entries par classe ── */
  useEffect(() => {
    if (!selectedClassId) { setEntries([]); return; }
    let active = true;
    fetchData(`/academics/timetable/?school_class=${selectedClassId}`)
      .then((d) => { if (active) setEntries(Array.isArray(d) ? d : d?.results ?? []); })
      .catch(() => {});
    return () => { active = false; };
  }, [selectedClassId]);

  /* ── Rafraîchir les données post-opération ── */
  const refreshData = useCallback(async () => {
    try {
      const [conf, ent] = await Promise.all([
        fetchData("/academics/timetable-conflicts/").catch(() => null),
        selectedClassId
          ? fetchData(`/academics/timetable/?school_class=${selectedClassId}`)
          : Promise.resolve([]),
      ]);
      setConflicts(conf);
      setEntries(Array.isArray(ent) ? ent : ent?.results ?? []);
    } catch {}
  }, [selectedClassId]);

  /* ── Génération ── */
  const handleRun = async () => {
    setRunning(true);
    setReport(null);
    try {
      const res = await postData("/academics/generate-timetable/", {
        dry_run: !!dryRun, persist: !!persist,
      });
      setReport(res);
      if (persist || !dryRun) await refreshData();
      toast("success", dryRun ? "Simulation terminée." : "Emploi du temps généré.");
    } catch (err) {
      toast("error", err?.message || "Erreur lors de la génération.");
    } finally { setRunning(false); }
  };

  /* ── Résolution conflits ── */
  const handleResolve = async () => {
    setResolving(true);
    try {
      const res = await postData("/academics/timetable-conflicts/", {
        dry_run: !!dryRun, persist: !!persist,
      });
      setReport((p) => ({ ...(p || {}), ...res }));
      await refreshData();
      toast("success", "Résolution des conflits terminée.");
    } catch (err) {
      toast("error", err?.message || "Erreur lors de la résolution.");
    } finally { setResolving(false); }
  };

  /* ── Export JSON ── */
  const downloadJSON = () => {
    if (!report) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const a = document.createElement("a");
    a.setAttribute("href", dataStr);
    a.setAttribute("download", `timetable_report_${new Date().toISOString()}.json`);
    document.body.appendChild(a); a.click(); a.remove();
  };

  /* ── Grille ── */
  const timeLabels = useMemo(() => {
    const map = new Map();
    timeSlots.forEach((s) => {
      const lbl = `${s.start_time} – ${s.end_time}`;
      if (!map.has(lbl)) map.set(lbl, s.start_time);
    });
    return [...map.entries()]
      .sort((a, b) => toMin(a[1]) - toMin(b[1]))
      .map(([lbl]) => lbl);
  }, [timeSlots]);

  const grid = useMemo(() => {
    const g = {};
    WEEKDAYS.forEach((d) => {
      g[d.v] = {};
      timeLabels.forEach((t) => (g[d.v][t] = []));
    });
    entries.forEach((e) => {
      const lbl = `${e.starts_at} – ${e.ends_at}`;
      if (g[e.weekday]?.[lbl]) g[e.weekday][lbl].push(e);
    });
    return g;
  }, [entries, timeLabels]);

  /* ── Conflits : compte ── */
  const conflictCount = conflicts
    ? (conflicts.count ?? (Array.isArray(conflicts) ? conflicts.length : 0))
    : null;

  const interpreted = useMemo(() => interpretReport(report), [report]);

  /* ── Nombre de cours par classe ── */
  const coursesPerDay = useMemo(() => {
    const map = {};
    WEEKDAYS.forEach((d) => {
      map[d.v] = entries.filter((e) => e.weekday === d.v).length;
    });
    return map;
  }, [entries]);

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
          display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:40, height:40, borderRadius:12, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 6px 18px ${COL.shadow}`,
            }}>
              <FaBolt style={{ width:16,height:16,color:"#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize:16, fontWeight:900, color:T.textPrimary, letterSpacing:"-0.02em" }}>
                Génération & Optimisation
              </h1>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>
                Création automatique des emplois du temps et résolution des conflits
              </p>
            </div>
          </div>
          <DarkToggle />
        </div>
      </header>

      <main style={{ maxWidth:1280, margin:"0 auto", padding:"20px 24px 0" }}>

        {/* ═══ PANNEAU DE CONTRÔLE + CONFLITS ═══ */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 280px", gap:16, marginBottom:16 }}>

          {/* ── Contrôles ── */}
          <div style={{
            borderRadius:14, padding:"18px 20px",
            background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
            boxShadow:T.cardShadow,
          }}>
            <p style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
              letterSpacing:"0.09em", color:T.textMuted, marginBottom:14 }}>
              Paramètres d'exécution
            </p>

            {/* Toggles */}
            <div style={{
              display:"flex", gap:24, padding:"12px 16px", borderRadius:10,
              background: dark?"rgba(255,255,255,0.03)":"rgba(0,0,0,0.02)",
              border:`1px solid ${T.cardBorder}`, marginBottom:14, flexWrap:"wrap",
            }}>
              <Toggle checked={dryRun} onChange={setDryRun}
                label="Mode simulation"
                sub="Ne modifie pas la base de données"
                accentColor="#6366f1" />
              <div style={{ width:1, background:T.divider, alignSelf:"stretch" }} />
              <Toggle checked={persist} onChange={setPersist}
                label="Persister les résultats"
                sub="Sauvegarde les créneaux valides"
                accentColor={COL.from} />
            </div>

            {/* Info si dry run actif */}
            {dryRun && (
              <div style={{
                display:"flex", alignItems:"flex-start", gap:8, padding:"9px 12px",
                borderRadius:9, marginBottom:12,
                background: dark?"rgba(99,102,241,0.1)":"rgba(99,102,241,0.05)",
                border:"1px solid rgba(99,102,241,0.2)",
              }}>
                <FaInfoCircle style={{ width:11,height:11,color:"#6366f1",flexShrink:0,marginTop:1 }} />
                <p style={{ fontSize:11, color:dark?"#a5b4fc":"#4338ca", lineHeight:1.5 }}>
                  La simulation est active — aucune donnée ne sera modifiée. Désactivez-la pour appliquer réellement les changements.
                </p>
              </div>
            )}

            {/* Boutons d'action */}
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={handleRun} disabled={running || resolving}
                style={{
                  flex:2, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  padding:"11px 16px", borderRadius:10, border:"none", cursor: running?"not-allowed":"pointer",
                  fontSize:12, fontWeight:800, color:"#fff", transition:"all .2s",
                  background: running || resolving ? T.textMuted
                    : `linear-gradient(135deg,${COL.from},${COL.to})`,
                  boxShadow: running || resolving ? "none" : `0 4px 16px ${COL.shadow}`,
                  transform: running ? "none" : "translateY(0)",
                }}>
                {running
                  ? <><FaSyncAlt style={{ width:11,height:11 }} className="animate-spin" /> Calcul en cours…</>
                  : <><FaPlay style={{ width:10,height:10 }} /> Générer l'emploi du temps</>}
              </button>

              <button onClick={handleResolve} disabled={running || resolving}
                style={{
                  flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:8,
                  padding:"11px 16px", borderRadius:10, cursor: resolving?"not-allowed":"pointer",
                  fontSize:12, fontWeight:800, transition:"all .2s",
                  color: running || resolving ? T.textMuted : COL.from,
                  background: "transparent",
                  border:`1.5px solid ${running || resolving ? T.cardBorder : COL.from+"55"}`,
                }}
                onMouseEnter={(e) => {
                  if (!running && !resolving) {
                    e.currentTarget.style.background=`${COL.from}12`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background="transparent";
                }}>
                {resolving
                  ? <><FaSyncAlt style={{ width:11,height:11 }} className="animate-spin" /> Résolution…</>
                  : <><FaBolt style={{ width:10,height:10 }} /> Résoudre les conflits</>}
              </button>
            </div>
          </div>

          {/* ── État des conflits ── */}
          <div style={{
            borderRadius:14, padding:"18px",
            background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
            boxShadow:T.cardShadow,
            display:"flex", flexDirection:"column", gap:12,
          }}>
            <p style={{ fontSize:11, fontWeight:800, textTransform:"uppercase",
              letterSpacing:"0.09em", color:T.textMuted }}>
              État actuel
            </p>

            {conflictCount === null ? (
              <div style={{ height:60, borderRadius:10, background:T.inputBg }}
                className="animate-pulse" />
            ) : (
              <>
                {/* Badge principal */}
                <div style={{
                  display:"flex", alignItems:"center", gap:10, padding:"12px 14px",
                  borderRadius:11,
                  background: conflictCount === 0
                    ? (dark?"#10b98118":"#10b98108")
                    : (dark?"#ef444418":"#ef444408"),
                  border:`1.5px solid ${conflictCount===0?"#10b98155":"#ef444455"}`,
                }}>
                  <div style={{
                    width:36, height:36, borderRadius:10, flexShrink:0,
                    display:"flex", alignItems:"center", justifyContent:"center",
                    background: conflictCount===0 ? "#10b98122" : "#ef444422",
                    color: conflictCount===0 ? "#10b981" : "#ef4444",
                  }}>
                    {conflictCount===0
                      ? <FaCheckCircle style={{ width:15,height:15 }} />
                      : <FaExclamationTriangle style={{ width:15,height:15 }} />}
                  </div>
                  <div>
                    <p style={{ fontSize:22, fontWeight:900, lineHeight:1,
                      color: conflictCount===0 ? "#10b981" : "#ef4444" }}>
                      {conflictCount}
                    </p>
                    <p style={{ fontSize:10, fontWeight:700,
                      color: conflictCount===0 ? "#10b981" : "#ef4444", marginTop:2 }}>
                      {conflictCount===0 ? "Aucun conflit" : `conflit${conflictCount>1?"s":""} détecté${conflictCount>1?"s":""}`}
                    </p>
                  </div>
                </div>

                <p style={{ fontSize:10, color:T.textMuted, lineHeight:1.5 }}>
                  {conflictCount === 0
                    ? "L'emploi du temps est cohérent — aucun chevauchement détecté."
                    : "Des conflits sont présents. Utilisez « Résoudre les conflits » pour une correction automatique."}
                </p>

                {/* Bouton refresh */}
                <button onClick={refreshData}
                  style={{
                    display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                    padding:"7px 12px", borderRadius:8,
                    border:`1px solid ${T.cardBorder}`, background:"transparent",
                    cursor:"pointer", fontSize:10, fontWeight:700, color:T.textMuted,
                    transition:"all .15s", marginTop:"auto",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor=COL.from)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor=T.cardBorder)}>
                  <FaSyncAlt style={{ width:9,height:9 }} />
                  Actualiser
                </button>
              </>
            )}
          </div>
        </div>

        {/* ═══ RAPPORT D'EXÉCUTION ═══ */}
        {report && (
          <div style={{
            borderRadius:14, padding:"18px 20px", marginBottom:16,
            background:T.cardBg,
            border:`1.5px solid ${COL.from}44`,
            boxShadow:`0 4px 20px ${COL.shadow}`,
            animation:"fadeUp .3s ease-out",
          }}>
            {/* Header rapport */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
              marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{
                  width:32, height:32, borderRadius:9,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                  boxShadow:`0 4px 10px ${COL.shadow}`,
                }}>
                  <FaClipboardCheck style={{ width:13,height:13,color:"#fff" }} />
                </div>
                <div>
                  <p style={{ fontSize:13, fontWeight:800, color:T.textPrimary }}>
                    Rapport d'exécution
                  </p>
                  <p style={{ fontSize:10, color:T.textMuted, marginTop:1 }}>
                    {dryRun ? "Simulation — aucune modification n'a été apportée" : "Les modifications ont été appliquées"}
                  </p>
                </div>
              </div>
              <button onClick={downloadJSON}
                style={{
                  display:"flex", alignItems:"center", gap:6, padding:"7px 12px",
                  borderRadius:8, border:`1px solid ${T.cardBorder}`,
                  background:"transparent", cursor:"pointer",
                  fontSize:10, fontWeight:700, color:T.textMuted, transition:"all .15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color=COL.from; e.currentTarget.style.borderColor=COL.from; }}
                onMouseLeave={(e) => { e.currentTarget.style.color=T.textMuted; e.currentTarget.style.borderColor=T.cardBorder; }}>
                <FaDownload style={{ width:9,height:9 }} />
                Télécharger JSON brut
              </button>
            </div>

            <HumanReport interpreted={interpreted} />
          </div>
        )}

        {/* ═══ GRILLE DE VISUALISATION ═══ */}
        <div style={{
          borderRadius:14, overflow:"hidden",
          background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
          boxShadow:T.cardShadow, marginBottom:16,
        }}>
          {/* Header grille */}
          <div style={{
            padding:"14px 18px",
            borderBottom:`1px solid ${T.divider}`,
            display:"flex", alignItems:"center", justifyContent:"space-between", gap:12,
            flexWrap:"wrap",
          }}>
            <div>
              <p style={{ fontSize:13, fontWeight:800, color:T.textPrimary }}>
                Visualisation par classe
              </p>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:2 }}>
                Planning actuel ou généré — sélectionnez une classe
              </p>
            </div>
            <Sel icon={FaLayerGroup} value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              style={{ minWidth:200 }}>
              {loading && <option>Chargement…</option>}
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Sel>
          </div>

          {/* Corps grille */}
          {loading ? (
            <div style={{ padding:"48px 24px", textAlign:"center" }}>
              <FaSyncAlt style={{ width:22,height:22,color:COL.from }} className="animate-spin" />
            </div>
          ) : timeLabels.length === 0 ? (
            <div style={{
              padding:"48px 24px", textAlign:"center",
              background: dark?"rgba(239,68,68,0.07)":"rgba(239,68,68,0.04)",
            }}>
              <FaExclamationTriangle style={{ width:22,height:22,color:"#ef4444",margin:"0 auto 10px" }} />
              <p style={{ fontSize:13, fontWeight:700, color:"#ef4444" }}>
                Aucun créneau horaire (Time Slots) configuré
              </p>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:4 }}>
                Configurez les créneaux dans l'administration avant de générer un emploi du temps.
              </p>
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              {/* En-tête colonnes */}
              <div style={{
                display:"grid",
                gridTemplateColumns:`90px repeat(${WEEKDAYS.length}, 1fr)`,
                minWidth:780,
                background:T.tableHead,
                borderBottom:`2px solid ${T.divider}`,
              }}>
                <div style={{
                  padding:"10px 10px", fontSize:9, fontWeight:800,
                  textTransform:"uppercase", letterSpacing:"0.08em",
                  color:T.textMuted, textAlign:"center",
                  borderRight:`1px solid ${T.divider}`,
                }}>
                  Horaire
                </div>
                {WEEKDAYS.map((d) => {
                  const cnt = coursesPerDay[d.v] || 0;
                  return (
                    <div key={d.v} style={{
                      padding:"10px 8px", textAlign:"center",
                      borderRight:`1px solid ${T.divider}`,
                    }}>
                      <p style={{ fontSize:12, fontWeight:800, color:T.textPrimary }}>
                        {d.label}
                      </p>
                      {cnt > 0 && (
                        <span style={{
                          display:"inline-block", marginTop:3,
                          padding:"1px 7px", borderRadius:999, fontSize:9, fontWeight:800,
                          background:`${COL.from}22`, color:COL.from,
                        }}>
                          {cnt} cours
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Lignes */}
              {timeLabels.map((tl, idx) => {
                const even = idx % 2 === 0;
                return (
                  <div key={tl} style={{
                    display:"grid",
                    gridTemplateColumns:`90px repeat(${WEEKDAYS.length}, 1fr)`,
                    minWidth:780,
                    background: even ? T.cardBg : (dark?"rgba(255,255,255,0.018)":"rgba(0,0,0,0.012)"),
                    borderBottom:`1px solid ${T.divider}`,
                  }}>
                    {/* Créneau horaire */}
                    <div style={{
                      padding:"8px 6px", textAlign:"center",
                      borderRight:`1px solid ${T.divider}`,
                      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                      minHeight:72,
                    }}>
                      {tl.split("–").map((t, i) => (
                        <span key={i} style={{
                          display:"block", fontSize:9, fontWeight: i===0?800:600,
                          color: i===0?T.textPrimary:T.textMuted, lineHeight:1.4,
                        }}>
                          {t.trim()}
                        </span>
                      ))}
                    </div>

                    {/* Cellules par jour */}
                    {WEEKDAYS.map((d) => {
                      const cellEntries = grid[d.v]?.[tl] ?? [];
                      return (
                        <div key={d.v} style={{
                          padding:"6px 6px", minHeight:72,
                          borderRight:`1px solid ${T.divider}`,
                        }}>
                          {cellEntries.length === 0 ? (
                            <div style={{
                              height:"100%", minHeight:60,
                              display:"flex", alignItems:"center", justifyContent:"center",
                            }}>
                              <div style={{
                                width:4, height:4, borderRadius:999,
                                background: dark?"rgba(255,255,255,0.08)":"rgba(0,0,0,0.08)",
                              }} />
                            </div>
                          ) : (
                            cellEntries.map((e, i) => (
                              <EntryChip key={e.id || i} entry={e} />
                            ))
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{BASE_KEYFRAMES}{`
        .animate-spin  { animation: spin 1s linear infinite; }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .animate-pulse { animation: pulse 1.5s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.25} }
      `}</style>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   ROOT
────────────────────────────────────────────────────────────── */
const GenerateTimetable = () => {
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
      <GenerateTimetableInner />
    </ThemeCtx.Provider>
  );
};

export default GenerateTimetable;