// src/pages/YearEndPromotion.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  FaCheck, FaMoon, FaSun, FaExclamationTriangle, FaExclamationCircle,
  FaArrowRight, FaUserGraduate, FaTimesCircle, FaSyncAlt, FaLock,
  FaChevronDown, FaChevronUp, FaSchool, FaUsers, FaShieldAlt,
  FaLayerGroup,
} from "react-icons/fa";
import { fetchData, postData } from "./api";
import { useTheme, LIGHT, DARK, BASE_KEYFRAMES, SECTION_PALETTE } from "./theme";

const COL = SECTION_PALETTE.promotion;
const STEP_LABELS = ["Aperçu des promotions", "Assignation des classes", "Clôture de l'année"];

const avg2color = (v) => {
  if (v === null || v === undefined) return "#94a3b8";
  if (v >= 16) return "#10b981";
  if (v >= 10) return "#3b82f6";
  if (v >= 8)  return "#f59e0b";
  return "#ef4444";
};

/* ── DarkToggle ── */
const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  return (
    <button onClick={toggle} style={{
      position:"relative", width:52, height:28, borderRadius:999,
      border:"none", cursor:"pointer", flexShrink:0, outline:"none", transition:"all .3s",
      background: dark ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
        : `linear-gradient(135deg,${COL.from},${COL.to})`,
    }}>
      <div style={{
        position:"absolute", top:2, width:24, height:24, borderRadius:999,
        background:"#fff", display:"flex", alignItems:"center", justifyContent:"center",
        transition:"all .3s", left: dark ? "calc(100% - 26px)" : 2,
      }}>
        {dark ? <FaMoon style={{width:11,height:11,color:"#6366f1"}} />
               : <FaSun  style={{width:11,height:11,color:COL.from}} />}
      </div>
    </button>
  );
};

/* ── Toast ── */
const Toast = ({ msg, onClose }) => {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 5000); return () => clearTimeout(t); } }, [msg]);
  if (!msg) return null;
  const isErr = msg.type === "error";
  return (
    <div onClick={onClose} style={{
      position:"fixed", bottom:24, right:24, zIndex:400,
      display:"flex", alignItems:"center", gap:10, padding:"13px 18px",
      borderRadius:14, cursor:"pointer", fontWeight:700, fontSize:12, color:"#fff",
      animation:"slideUp .3s cubic-bezier(.34,1.56,.64,1)", maxWidth:420,
      background: isErr ? "linear-gradient(135deg,#ef4444,#dc2626)"
        : `linear-gradient(135deg,${COL.from},${COL.to})`,
      boxShadow: isErr ? "0 8px 24px #ef444444" : `0 8px 24px ${COL.shadow}`,
    }}>
      {isErr ? <FaExclamationTriangle style={{flexShrink:0,width:13,height:13}} />
             : <FaCheck style={{flexShrink:0,width:13,height:13}} />}
      {msg.text}
    </div>
  );
};

/* ── Stepper ── */
const Stepper = ({ step }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div style={{ display:"flex", alignItems:"center", marginBottom:32 }}>
      {STEP_LABELS.map((label, i) => {
        const done = i < step, active = i === step, pending = i > step;
        return (
          <React.Fragment key={i}>
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:6 }}>
              <div style={{
                width:36, height:36, borderRadius:"50%", display:"flex",
                alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:800,
                transition:"all .3s",
                background: done ? "#10b981" : active ? `linear-gradient(135deg,${COL.from},${COL.to})` : T.cardBg,
                color: done || active ? "#fff" : T.textMuted,
                border: pending ? `2px solid ${T.divider}` : "none",
                boxShadow: active ? `0 4px 14px ${COL.shadow}` : "none",
              }}>
                {done ? <FaCheck style={{width:13,height:13}} /> : i + 1}
              </div>
              <p style={{
                fontSize:11, fontWeight: done || active ? 700 : 500,
                color: done ? "#10b981" : active ? COL.from : T.textMuted,
                maxWidth:100, textAlign:"center", margin:0,
              }}>{label}</p>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div style={{
                flex:1, height:2, margin:"0 8px", marginTop:-20,
                background: i < step ? "#10b981" : T.divider,
                transition:"background .4s",
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ── Sous-groupe PAR CLASSE SOURCE ── */
const ClassSubGroup = ({ subgroup, toLevels, availableClasses, yearId, onAssigned, showToast, isTerminal }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [open, setOpen]       = useState(false);
  const [classId, setClassId] = useState(subgroup.assignedClass?.id ?? "");
  const [saving, setSaving]   = useState(false);

  const assigned = availableClasses.find(c => c.id === Number(classId));

  // Label du placeholder : liste toutes les séries cibles
  const toSeriesLabel = useMemo(() => {
    if (!toLevels || toLevels.length === 0) return "destination";
    return toLevels.map(l => l.name).join(" / ");
  }, [toLevels]);

  const handleAssign = async () => {
    if (!classId) { showToast("Sélectionnez une classe de destination.", "error"); return; }
    setSaving(true);
    try {
      // On lit le level_id directement depuis la classe sélectionnée dans
      // available_classes — plus fiable que de passer toLevel.id qui ne
      // représente qu'une seule série parmi plusieurs valides.
      const selectedClass = availableClasses.find(c => c.id === Number(classId));
      await postData(`/academics/school-years/${yearId}/bulk-assign-class/`, {
        from_level_id:  subgroup.fromLevel.id,
        to_level_id:    selectedClass?.level_id ?? null,
        class_id:       Number(classId),
        from_class_id:  subgroup.fromClassId,
      });
      showToast(`Classe assignée aux élèves de ${subgroup.fromClassName}.`);
      onAssigned(subgroup.fromClassId, Number(classId));
    } catch (e) {
      showToast(e?.body?.detail || e?.message || "Erreur lors de l'assignation.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      border:`1px solid ${T.divider}`, borderRadius:12,
      overflow:"hidden", marginBottom:10,
    }}>
      {/* Header sous-groupe */}
      <div style={{
        padding:"10px 16px", display:"flex", alignItems:"center",
        justifyContent:"space-between", gap:12,
        background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <FaLayerGroup style={{ color:COL.from, width:12, height:12, flexShrink:0 }} />
          <div>
            <span style={{ fontSize:13, fontWeight:700, color:T.textPrimary }}>
              {subgroup.fromClassName}
            </span>
            <span style={{ fontSize:11, color:T.textMuted, marginLeft:8 }}>
              {subgroup.students.length} élève{subgroup.students.length > 1 ? "s" : ""} admis
              {assigned && !isTerminal && (
                <span style={{ color:"#10b981", marginLeft:8, fontWeight:700 }}>
                  → {assigned.level_name ? `${assigned.level_name} · ` : ""}{assigned.name}
                </span>
              )}
            </span>
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} style={{
          background:"transparent", border:"none", cursor:"pointer", color:T.textMuted, padding:4,
        }}>
          {open ? <FaChevronUp style={{width:11,height:11}} /> : <FaChevronDown style={{width:11,height:11}} />}
        </button>
      </div>

      {/* Select classe destination (sauf terminal) */}
      {!isTerminal && (
        <div style={{
          padding:"10px 16px", borderTop:`1px solid ${T.divider}`,
          display:"flex", alignItems:"center", gap:10,
          background: dark ? "rgba(255,255,255,0.015)" : "rgba(0,0,0,0.01)",
        }}>
          <FaSchool style={{ color:T.textMuted, width:12, height:12, flexShrink:0 }} />
          <select value={classId} onChange={e => setClassId(e.target.value)} style={{
            flex:1, padding:"7px 10px", borderRadius:9,
            border:`1.5px solid ${classId ? COL.from+"66" : T.inputBorder}`,
            background:T.inputBg, color: classId ? T.textPrimary : T.textMuted,
            fontSize:12, outline:"none", cursor:"pointer",
          }}>
            <option value="">— Classe de destination ({toSeriesLabel}) —</option>
            {/* Grouper les classes par niveau/série pour plus de lisibilité */}
            {(() => {
              // Regrouper par level_name pour faire des <optgroup>
              const byLevel = {};
              for (const c of availableClasses) {
                const key = c.level_name || "Autre";
                if (!byLevel[key]) byLevel[key] = [];
                byLevel[key].push(c);
              }
              const groups = Object.entries(byLevel);
              // Si une seule série → pas besoin d'optgroup
              if (groups.length <= 1) {
                return availableClasses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ));
              }
              return groups.map(([levelName, classes]) => (
                <optgroup key={levelName} label={levelName}>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ));
            })()}
          </select>
          <button onClick={handleAssign} disabled={saving || !classId} style={{
            display:"flex", alignItems:"center", gap:6, padding:"7px 14px",
            borderRadius:9, border:"none",
            cursor: saving || !classId ? "not-allowed" : "pointer",
            background: classId ? `linear-gradient(135deg,${COL.from},${COL.to})` : T.tableHead,
            color: classId ? "#fff" : T.textMuted,
            fontSize:12, fontWeight:700, opacity: saving ? 0.7 : 1, flexShrink:0,
          }}>
            {saving ? "…" : <><FaCheck style={{width:10,height:10}} /> Assigner</>}
          </button>
        </div>
      )}

      {/* Liste élèves (accordéon) */}
      {open && (
        <div style={{ padding:"8px 16px 12px", borderTop:`1px solid ${T.divider}` }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr>
                {["Élève", "Moy. annuelle"].map(h => (
                  <th key={h} style={{
                    textAlign:"left", padding:"5px 8px", fontSize:10, fontWeight:700,
                    color:T.textSecondary, borderBottom:`1px solid ${T.divider}`,
                  }}>{h.toUpperCase()}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {subgroup.students.map(s => (
                <tr key={s.id}>
                  <td style={{ padding:"5px 8px", color:T.textPrimary, fontWeight:600 }}>
                    {s.last_name} {s.first_name}
                  </td>
                  <td style={{ padding:"5px 8px" }}>
                    <span style={{ fontWeight:800, color:avg2color(s.annual_average) }}>
                      {s.annual_average !== null ? `${Number(s.annual_average).toFixed(2)}/20` : "—"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

/* ── Groupe de niveau (contient N sous-groupes de classes) ── */
const PromotedLevelGroup = ({ group, yearId, onAssigned, showToast, assignedMap }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  const subgroups = useMemo(() => {
    const byClass = {};
    for (const s of group.students) {
      const key = s.from_class_id;
      if (!byClass[key]) byClass[key] = {
        fromClassId:   key,
        fromClassName: s.from_class_name,
        fromLevel:     group.from_level,
        assignedClass: assignedMap[key] ?? null,
        students:      [],
      };
      byClass[key].students.push(s);
    }
    return Object.values(byClass).sort((a,b) => a.fromClassName.localeCompare(b.fromClassName));
  }, [group, assignedMap]);

  // Label des séries cibles (toutes)
  const toSeriesLabel = useMemo(() => {
    if (group.is_terminal) return null;
    const levels = group.to_levels || (group.to_level ? [group.to_level] : []);
    return levels.map(l => l.name).join(" / ");
  }, [group]);

  return (
    <div style={{
      background:T.cardBg, borderRadius:16, border:`1px solid ${T.cardBorder}`,
      overflow:"hidden", marginBottom:14,
    }}>
      {/* Header niveau */}
      <div style={{
        padding:"14px 18px", display:"flex", alignItems:"center", gap:12,
        background: group.is_terminal ? "#ec489910" : `${COL.from}08`,
      }}>
        <div style={{
          width:36, height:36, borderRadius:10, display:"flex", alignItems:"center",
          justifyContent:"center",
          background: group.is_terminal ? "#ec489920" : `${COL.from}20`,
        }}>
          <FaUserGraduate style={{ width:15, height:15, color: group.is_terminal ? "#ec4899" : COL.from }} />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:2 }}>
            <p style={{ fontSize:14, fontWeight:800, color:T.textPrimary, margin:0 }}>
              {group.from_level.name}
            </p>
            {group.is_terminal ? (
              <span style={{ padding:"2px 8px", borderRadius:7, fontSize:10, fontWeight:700, background:"#ec489920", color:"#ec4899" }}>
                Niveau terminal
              </span>
            ) : (
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <FaArrowRight style={{ color:T.textMuted, width:10, height:10 }} />
                {/* Affiche TOUTES les séries cibles, pas seulement la première */}
                <span style={{ fontSize:12, color:T.textSecondary }}>{toSeriesLabel}</span>
              </div>
            )}
          </div>
          <p style={{ fontSize:11, color:T.textMuted, margin:0 }}>
            {group.students.length} élève{group.students.length > 1 ? "s" : ""}
            · {subgroups.length} classe{subgroups.length > 1 ? "s" : ""} source
          </p>
        </div>
      </div>

      {/* Sous-groupes par classe source */}
      <div style={{ padding:"12px 14px" }}>
        {subgroups.map(sg => (
          <ClassSubGroup
            key={sg.fromClassId}
            subgroup={sg}
            toLevels={group.to_levels || (group.to_level ? [group.to_level] : [])}
            availableClasses={group.available_classes}
            yearId={yearId}
            isTerminal={group.is_terminal}
            showToast={showToast}
            onAssigned={(fromClassId, destClassId) => onAssigned(fromClassId, destClassId)}
          />
        ))}
      </div>
    </div>
  );
};

/* ── Groupe redoublants ── */
const RepeatingGroup = ({ group }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [open, setOpen] = useState(false);

  const subgroups = useMemo(() => {
    const byClass = {};
    for (const s of group.students) {
      const key = s.from_class_id;
      if (!byClass[key]) byClass[key] = { name: s.from_class_name, students: [] };
      byClass[key].students.push(s);
    }
    return Object.values(byClass).sort((a,b) => a.name.localeCompare(b.name));
  }, [group]);

  return (
    <div style={{
      background:T.cardBg, borderRadius:16, border:`1px solid ${T.cardBorder}`,
      overflow:"hidden", marginBottom:14,
    }}>
      <div style={{
        padding:"14px 18px", display:"flex", alignItems:"center",
        justifyContent:"space-between", gap:12, background:"#ef444408",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <div style={{ width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", background:"#ef444420" }}>
            <FaTimesCircle style={{ width:15, height:15, color:"#ef4444" }} />
          </div>
          <div>
            <p style={{ fontSize:13, fontWeight:800, color:T.textPrimary, margin:0 }}>
              {group.from_level.name} — <span style={{color:"#ef4444"}}>Ajournés</span>
            </p>
            <p style={{ fontSize:11, color:T.textSecondary, margin:0 }}>
              {group.students.length} élève{group.students.length > 1 ? "s" : ""} · restent dans leur classe
            </p>
          </div>
        </div>
        <button onClick={() => setOpen(o => !o)} style={{ background:"transparent", border:"none", cursor:"pointer", color:T.textMuted }}>
          {open ? <FaChevronUp /> : <FaChevronDown />}
        </button>
      </div>
      {open && (
        <div style={{ padding:"12px 14px" }}>
          {subgroups.map(sg => (
            <div key={sg.name} style={{
              border:`1px solid ${T.divider}`, borderRadius:10, marginBottom:8, overflow:"hidden",
            }}>
              <div style={{ padding:"8px 14px", background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.015)" }}>
                <p style={{ fontSize:12, fontWeight:700, color:T.textPrimary, margin:0 }}>
                  {sg.name} <span style={{ color:T.textMuted, fontWeight:400 }}>({sg.students.length})</span>
                </p>
              </div>
              <div style={{ padding:"6px 14px 10px" }}>
                {sg.students.map(s => (
                  <div key={s.id} style={{ display:"flex", justifyContent:"space-between", padding:"3px 0", borderBottom:`1px solid ${T.divider}` }}>
                    <span style={{ fontSize:12, color:T.textPrimary }}>{s.last_name} {s.first_name}</span>
                    <span style={{ fontSize:12, fontWeight:800, color:avg2color(s.annual_average) }}>
                      {s.annual_average !== null ? `${Number(s.annual_average).toFixed(2)}/20` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════════════════
   PAGE PRINCIPALE
══════════════════════════════════════════════════════ */
const YearEndPromotion = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  const [step, setStep]               = useState(0);
  const [activeYear, setActiveYear]   = useState(null);
  const [preview, setPreview]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [closing, setClosing]         = useState(false);
  const [closed, setClosed]           = useState(false);
  const [toast, setToast]             = useState(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const [assignedMap, setAssignedMap] = useState({});

  const showToast = (text, type = "success") => setToast({ text, type });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const years = await fetchData("/academics/school-years/");
      const arr = Array.isArray(years) ? years : years?.results ?? [];
      const active = arr.find(y => y.is_active && !y.is_closed);
      if (!active) { setActiveYear(null); setLoading(false); return; }
      setActiveYear(active);
      const prev = await fetchData(`/academics/school-years/${active.id}/promotion-preview/`);
      setPreview(prev);

      // Pré-remplir assignedMap depuis les données existantes du preview
      const map = {};
      for (const g of prev.promoted_groups ?? []) {
        for (const s of g.students) {
          if (s.assigned_class_id) {
            const ac = g.available_classes.find(c => c.id === s.assigned_class_id);
            if (ac) map[s.from_class_id] = ac;
          }
        }
      }
      setAssignedMap(map);
    } catch {
      showToast("Erreur lors du chargement des données.", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleAssigned = (fromClassId, destClassId) => {
    let found = null;
    for (const g of preview?.promoted_groups ?? []) {
      found = g.available_classes.find(c => c.id === destClassId);
      if (found) break;
    }
    setAssignedMap(prev => ({ ...prev, [fromClassId]: found ?? { id: destClassId, name: "?" } }));
  };

  const allAssigned = useMemo(() => {
    if (!preview) return false;
    for (const g of preview.promoted_groups ?? []) {
      if (g.is_terminal) continue;
      const classIds = [...new Set(g.students.map(s => s.from_class_id))];
      for (const cid of classIds) {
        if (!assignedMap[cid]) return false;
      }
    }
    return true;
  }, [preview, assignedMap]);

  const handleClose = async () => {
    if (!activeYear) return;
    setClosing(true);
    try {
      await postData(`/academics/school-years/${activeYear.id}/close/`, {});
      setClosed(true);
      setStep(2);
      showToast("Année scolaire clôturée avec succès !");
    } catch (e) {
      showToast(e?.body?.detail || e?.message || "Erreur lors de la clôture.", "error");
    } finally {
      setClosing(false);
      setConfirmClose(false);
    }
  };

  const promotedCount  = preview?.promoted_groups?.reduce((s,g) => s + g.students.length, 0) ?? 0;
  const repeatingCount = preview?.repeating_groups?.reduce((s,g) => s + g.students.length, 0) ?? 0;

  if (loading) return (
    <div style={{ minHeight:"100vh", background:T.pageBg, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <p style={{ color:T.textMuted, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>Chargement…</p>
    </div>
  );

  if (!activeYear) return (
    <>
      <style>{BASE_KEYFRAMES}</style>
      <div style={{ minHeight:"100vh", background:T.pageBg, fontFamily:"'Plus Jakarta Sans',sans-serif", padding:"28px 24px" }}>
        <div style={{ maxWidth:560, margin:"80px auto", textAlign:"center" }}>
          <div style={{ width:64, height:64, borderRadius:20, background:`${COL.from}18`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 20px" }}>
            <FaSchool style={{ width:28, height:28, color:COL.from }} />
          </div>
          <h2 style={{ fontSize:18, fontWeight:800, color:T.textPrimary, marginBottom:10 }}>Aucune année active</h2>
          <p style={{ fontSize:13, color:T.textSecondary, lineHeight:1.7 }}>
            Rendez-vous sur <a href="/academics/school-years" style={{ color:COL.from, fontWeight:700 }}>Années scolaires</a> pour en activer une.
          </p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{BASE_KEYFRAMES}</style>
      <div style={{ minHeight:"100vh", background:T.pageBg, fontFamily:"'Plus Jakarta Sans',sans-serif", padding:"28px 24px" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:28 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{
              width:46, height:46, borderRadius:14,
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:`0 6px 20px ${COL.shadow}`,
            }}>
              <FaUserGraduate style={{ color:"#fff", width:20, height:20 }} />
            </div>
            <div>
              <h1 style={{ fontSize:20, fontWeight:800, color:T.textPrimary, margin:0 }}>Fin d'année scolaire</h1>
              <p style={{ fontSize:12, color:T.textSecondary, margin:0 }}>
                {activeYear.label} · Workflow de promotion
              </p>
            </div>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <DarkToggle />
            <button onClick={loadData} style={{
              display:"flex", alignItems:"center", gap:7, padding:"8px 14px",
              borderRadius:11, border:`1.5px solid ${T.inputBorder}`,
              background:"transparent", color:T.textSecondary, fontSize:12, fontWeight:600, cursor:"pointer",
            }}>
              <FaSyncAlt style={{ width:11, height:11 }} /> Actualiser
            </button>
          </div>
        </div>

        <Stepper step={closed ? 2 : step} />

        {/* ÉTAPE 0 — Aperçu */}
        {!closed && step === 0 && preview && (
          <>
            {!preview.can_close && (
              <div style={{ padding:"14px 18px", borderRadius:14, marginBottom:24, background:"#ef444410", border:"1px solid #ef444430" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
                  <FaExclamationCircle style={{ color:"#ef4444", width:15, height:15 }} />
                  <p style={{ fontSize:13, fontWeight:800, color:"#ef4444", margin:0 }}>Conditions non remplies — clôture bloquée</p>
                </div>
                {preview.blocking_issues.map((issue, i) => (
                  <p key={i} style={{ fontSize:12, color:T.textSecondary, margin:"4px 0 0 25px", lineHeight:1.6 }}>• {issue}</p>
                ))}
              </div>
            )}

            {/* Stats */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:28 }}>
              {[
                { label:"Élèves admis",    value:promotedCount,               color:"#10b981", Icon:FaUserGraduate },
                { label:"Élèves ajournés", value:repeatingCount,              color:"#ef4444", Icon:FaTimesCircle  },
                { label:"Total",           value:promotedCount+repeatingCount, color:COL.from,  Icon:FaUsers       },
              ].map(({ label, value, color, Icon }) => (
                <div key={label} style={{
                  background:T.cardBg, borderRadius:14, padding:"16px 18px",
                  border:`1px solid ${T.cardBorder}`, display:"flex", alignItems:"center", gap:12,
                }}>
                  <div style={{ width:38, height:38, borderRadius:11, display:"flex", alignItems:"center", justifyContent:"center", background:`${color}18` }}>
                    <Icon style={{ width:16, height:16, color }} />
                  </div>
                  <div>
                    <p style={{ fontSize:22, fontWeight:800, color:T.textPrimary, margin:0 }}>{value}</p>
                    <p style={{ fontSize:11, color:T.textSecondary, margin:0 }}>{label}</p>
                  </div>
                </div>
              ))}
            </div>

            {preview.promoted_groups?.length > 0 && (
              <>
                <p style={{ fontSize:11, fontWeight:700, color:T.textSecondary, letterSpacing:".06em", marginBottom:12 }}>
                  ÉLÈVES ADMIS — TRIÉS PAR CLASSE SOURCE
                </p>
                {preview.promoted_groups.map(g => (
                  <PromotedLevelGroup
                    key={g.from_level.id}
                    group={g}
                    yearId={activeYear.id}
                    onAssigned={handleAssigned}
                    showToast={showToast}
                    assignedMap={assignedMap}
                  />
                ))}
              </>
            )}

            {preview.repeating_groups?.length > 0 && (
              <>
                <p style={{ fontSize:11, fontWeight:700, color:T.textSecondary, letterSpacing:".06em", margin:"24px 0 12px" }}>
                  ÉLÈVES AJOURNÉS
                </p>
                {preview.repeating_groups.map(g => (
                  <RepeatingGroup key={g.from_level.id} group={g} />
                ))}
              </>
            )}

            {preview.can_close && (
              <div style={{
                marginTop:28, padding:"16px 20px", borderRadius:14,
                background:`${COL.from}10`, border:`1px solid ${COL.from}30`,
                display:"flex", alignItems:"center", justifyContent:"space-between",
              }}>
                <p style={{ fontSize:12, color:T.textSecondary, margin:0 }}>
                  Assignez une classe de destination à chaque groupe, puis clôturez l'année.
                </p>
                <button onClick={() => setStep(1)} style={{
                  display:"flex", alignItems:"center", gap:8, padding:"9px 18px",
                  borderRadius:11, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, color:"#fff",
                  background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                  boxShadow:`0 4px 14px ${COL.shadow}`, flexShrink:0,
                }}>
                  Assigner les classes <FaArrowRight style={{ width:11, height:11 }} />
                </button>
              </div>
            )}
          </>
        )}

        {/* ÉTAPE 1 — Assignation */}
        {!closed && step === 1 && preview && (
          <>
            <div style={{
              padding:"14px 18px", borderRadius:14, marginBottom:24,
              background:`${COL.from}10`, border:`1px solid ${COL.from}30`,
              display:"flex", alignItems:"center", gap:12,
            }}>
              <FaShieldAlt style={{ color:COL.from, width:15, height:15, flexShrink:0 }} />
              <p style={{ fontSize:12, color:T.textSecondary, margin:0, lineHeight:1.6 }}>
                Pour chaque classe source, sélectionnez la classe de destination et cliquez sur <strong style={{ color:T.textPrimary }}>Assigner</strong>.
                Chaque classe source est traitée indépendamment — vous pouvez envoyer 4eA en 3eA et 4eB en 3eB séparément.
              </p>
            </div>

            {preview.promoted_groups?.map(g => (
              <PromotedLevelGroup
                key={g.from_level.id}
                group={g}
                yearId={activeYear.id}
                onAssigned={handleAssigned}
                showToast={showToast}
                assignedMap={assignedMap}
              />
            ))}

            <div style={{ display:"flex", gap:12, marginTop:28, justifyContent:"space-between", alignItems:"center" }}>
              <button onClick={() => setStep(0)} style={{
                padding:"9px 18px", borderRadius:11, border:`1.5px solid ${T.inputBorder}`,
                background:"transparent", color:T.textSecondary, fontSize:13, fontWeight:600, cursor:"pointer",
              }}>← Retour à l'aperçu</button>

              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                {!allAssigned && (
                  <p style={{ fontSize:11, color:"#f59e0b", margin:0 }}>
                    ⚠ Certaines classes source n'ont pas encore de classe assignée
                  </p>
                )}
                <button onClick={() => setConfirmClose(true)} disabled={!allAssigned} style={{
                  display:"flex", alignItems:"center", gap:8, padding:"10px 22px",
                  borderRadius:12, border:"none", cursor: allAssigned ? "pointer" : "not-allowed",
                  background: allAssigned ? "linear-gradient(135deg,#ef4444,#dc2626)" : T.tableHead,
                  color: allAssigned ? "#fff" : T.textMuted,
                  fontSize:13, fontWeight:800,
                  boxShadow: allAssigned ? "0 4px 14px #ef444440" : "none",
                }}>
                  <FaLock style={{ width:12, height:12 }} />
                  Clôturer l'année {activeYear.label}
                </button>
              </div>
            </div>
          </>
        )}

        {/* ÉTAPE 2 — Succès */}
        {closed && (
          <div style={{ maxWidth:520, margin:"0 auto", textAlign:"center", padding:"60px 20px" }}>
            <div style={{
              width:72, height:72, borderRadius:"50%", margin:"0 auto 24px",
              background:"linear-gradient(135deg,#10b981,#06b6d4)",
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 8px 28px #10b98140",
            }}>
              <FaCheck style={{ color:"#fff", width:28, height:28 }} />
            </div>
            <h2 style={{ fontSize:20, fontWeight:800, color:T.textPrimary, marginBottom:12 }}>
              Année {activeYear.label} clôturée
            </h2>
            <p style={{ fontSize:13, color:T.textSecondary, lineHeight:1.7, marginBottom:28 }}>
              Les promotions ont été appliquées. Un journal d'audit complet a été créé.
            </p>
            <div style={{ display:"flex", gap:12, justifyContent:"center" }}>
              <a href="/academics/promotion-records" style={{
                display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px",
                borderRadius:12, border:"none", cursor:"pointer", fontSize:13, fontWeight:700, color:"#fff",
                background:`linear-gradient(135deg,${COL.from},${COL.to})`, textDecoration:"none",
              }}>Journal de promotion</a>
              <a href="/academics/school-years" style={{
                display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px",
                borderRadius:12, border:`1.5px solid ${T.inputBorder}`,
                color:T.textSecondary, fontSize:13, fontWeight:600, textDecoration:"none",
              }}>Gérer les années</a>
            </div>
          </div>
        )}

        {/* Modal confirmation clôture */}
        {confirmClose && (
          <div style={{
            position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.65)",
            backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", padding:16,
          }}>
            <div style={{
              width:"100%", maxWidth:460, background:T.cardBg, borderRadius:20,
              boxShadow:"0 24px 60px rgba(0,0,0,.45)", border:`1.5px solid ${T.cardBorder}`,
              overflow:"hidden", animation:"panelUp .2s cubic-bezier(.34,1.4,.64,1)",
            }}>
              <div style={{ height:5, background:"linear-gradient(90deg,#ef4444,#dc2626)" }} />
              <div style={{ padding:"22px 22px 18px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                  <div style={{ width:42, height:42, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", background:"#ef444418" }}>
                    <FaExclamationCircle style={{ width:18, height:18, color:"#ef4444" }} />
                  </div>
                  <div>
                    <p style={{ fontSize:15, fontWeight:800, color:T.textPrimary, margin:0 }}>Action irréversible</p>
                    <p style={{ fontSize:11, color:T.textSecondary, margin:0 }}>Cette opération ne peut pas être annulée</p>
                  </div>
                </div>
                <div style={{ padding:"12px 14px", borderRadius:12, background:"#ef444410", border:"1px solid #ef444430", marginBottom:16 }}>
                  <p style={{ fontSize:12, color:T.textSecondary, lineHeight:1.7, margin:0 }}>
                    En clôturant <strong style={{ color:T.textPrimary }}>l'année {activeYear.label}</strong> :
                  </p>
                  <ul style={{ margin:"8px 0 0 16px", padding:0, fontSize:12, color:T.textSecondary, lineHeight:2 }}>
                    <li><strong style={{ color:"#10b981" }}>{promotedCount} élèves admis</strong> seront déplacés dans leurs nouvelles classes</li>
                    <li><strong style={{ color:"#ef4444" }}>{repeatingCount} élèves ajournés</strong> resteront dans leur classe actuelle</li>
                    <li>L'année sera verrouillée en lecture seule</li>
                  </ul>
                </div>
                <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
                  <button onClick={() => setConfirmClose(false)} disabled={closing} style={{
                    padding:"9px 18px", borderRadius:10, border:`1.5px solid ${T.inputBorder}`,
                    background:"transparent", color:T.textSecondary, fontSize:13, fontWeight:600, cursor:"pointer",
                  }}>Annuler</button>
                  <button onClick={handleClose} disabled={closing} style={{
                    padding:"9px 22px", borderRadius:10, border:"none",
                    background:"linear-gradient(135deg,#ef4444,#dc2626)",
                    color:"#fff", fontSize:13, fontWeight:800,
                    cursor: closing ? "not-allowed" : "pointer", opacity: closing ? 0.7 : 1,
                  }}>{closing ? "Clôture en cours…" : "Confirmer la clôture"}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Toast msg={toast} onClose={() => setToast(null)} />
      </div>
    </>
  );
};

export default YearEndPromotion;