// src/pages/TermManager.jsx
import React, { useCallback, useEffect, useState } from "react";
import {
  FaLock, FaLockOpen, FaEye, FaEyeSlash, FaSyncAlt, FaCheck,
  FaExclamationTriangle, FaMoon, FaSun,
  FaSave, FaLayerGroup, FaChevronDown, FaInfoCircle,
  FaExclamationCircle, FaSchool, FaBook, FaCog,
  FaPlus, FaMinus,
} from "react-icons/fa";
import { fetchData, postData, putData } from "./api";
import { ThemeCtx, useTheme, LIGHT, DARK, BASE_KEYFRAMES } from "./theme";

const COL = { from:"#6366f1", to:"#8b5cf6", shadow:"#6366f144" };
const TERMS_ALL = ["T1","T2","T3"];
const TERM_COLORS = {
  T1:{ from:"#3b82f6", to:"#06b6d4" },
  T2:{ from:"#10b981", to:"#14b8a6" },
  T3:{ from:"#f59e0b", to:"#f97316" },
};
const STATUS_META = {
  draft:     { label:"Brouillon",  color:"#6366f1", bg:"#6366f118", Icon:FaLockOpen },
  locked:    { label:"Verrouillé", color:"#f59e0b", bg:"#f59e0b18", Icon:FaLock     },
  published: { label:"Publié",     color:"#10b981", bg:"#10b98118", Icon:FaEye      },
};

const buildQuery = (obj={}) => {
  const p = Object.entries(obj)
    .filter(([,v]) => v!==null && v!==undefined && v!=="")
    .map(([k,v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return p.length ? `?${p.join("&")}` : "";
};
const fmtDate = iso =>
  iso ? new Date(iso).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : null;

/* ── DarkToggle ── */
const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button onClick={toggle}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{
        position:"relative",width:52,height:28,borderRadius:999,
        border:"none",cursor:"pointer",flexShrink:0,outline:"none",transition:"all .3s",
        background:dark?"linear-gradient(135deg,#6366f1,#8b5cf6)"
          :`linear-gradient(135deg,${COL.from},${COL.to})`,
        boxShadow:hov?`0 0 18px ${COL.shadow}`:"0 2px 8px rgba(0,0,0,.2)",
      }}>
      <div style={{
        position:"absolute",top:2,width:24,height:24,borderRadius:999,
        background:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
        transition:"all .3s",left:dark?"calc(100% - 26px)":2,
        boxShadow:"0 2px 6px rgba(0,0,0,.25)",
      }}>
        {dark ? <FaMoon style={{width:11,height:11,color:"#6366f1"}} />
               : <FaSun  style={{width:11,height:11,color:COL.from }} />}
      </div>
    </button>
  );
};

/* ── Toast ── */
const Toast = ({ msg, onClose }) => {
  useEffect(()=>{
    if(msg){const t=setTimeout(onClose,4500);return()=>clearTimeout(t);}
  },[msg]);
  if(!msg) return null;
  const isErr = msg.type==="error";
  return (
    <div onClick={onClose} style={{
      position:"fixed",bottom:24,right:24,zIndex:400,
      display:"flex",alignItems:"center",gap:10,padding:"13px 18px",
      borderRadius:14,cursor:"pointer",fontWeight:700,fontSize:12,color:"#fff",
      animation:"slideUp .3s cubic-bezier(.34,1.56,.64,1)",maxWidth:380,
      background:isErr?"linear-gradient(135deg,#ef4444,#dc2626)"
        :`linear-gradient(135deg,${COL.from},${COL.to})`,
      boxShadow:isErr?"0 8px 24px #ef444444":`0 8px 24px ${COL.shadow}`,
    }}>
      {isErr
        ? <FaExclamationTriangle style={{flexShrink:0,width:13,height:13}}/>
        : <FaCheck style={{flexShrink:0,width:13,height:13}}/>}
      {msg.text}
    </div>
  );
};

/* ── ConfirmDialog ── */
const ConfirmDialog = ({ open,title,message,confirmLabel,confirmColor,onConfirm,onCancel }) => {
  const { dark } = useTheme();
  const T = dark?DARK:LIGHT;
  useEffect(()=>{ document.body.style.overflow=open?"hidden":""; return()=>{document.body.style.overflow="";}; },[open]);
  if(!open) return null;
  const cc = confirmColor||"#6366f1";
  return (
    <div style={{
      position:"fixed",inset:0,zIndex:300,
      background:"rgba(0,0,0,0.55)",backdropFilter:"blur(6px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:16,animation:"fadeIn .15s ease-out",
    }}>
      <div style={{
        width:"100%",maxWidth:420,background:T.cardBg,borderRadius:18,
        boxShadow:"0 24px 60px rgba(0,0,0,.35)",
        border:`1.5px solid ${T.cardBorder}`,
        animation:"panelUp .2s cubic-bezier(.34,1.4,.64,1)",overflow:"hidden",
      }}>
        <div style={{height:4,background:`linear-gradient(90deg,${cc},${cc}cc)`}}/>
        <div style={{padding:"20px 20px 14px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
            <div style={{
              width:34,height:34,borderRadius:10,flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center",
              background:`${cc}18`,
            }}>
              <FaExclamationCircle style={{width:15,height:15,color:cc}}/>
            </div>
            <p style={{fontSize:14,fontWeight:800,color:T.textPrimary}}>{title}</p>
          </div>
          <p style={{fontSize:12,color:T.textSecondary,lineHeight:1.65,paddingLeft:44}}>{message}</p>
        </div>
        <div style={{padding:"12px 20px",borderTop:`1px solid ${T.divider}`,display:"flex",justifyContent:"flex-end",gap:8}}>
          <button onClick={onCancel} style={{
            padding:"8px 16px",borderRadius:9,border:`1.5px solid ${T.cardBorder}`,
            background:"transparent",cursor:"pointer",fontSize:12,fontWeight:700,
            color:T.textSecondary,fontFamily:"'Plus Jakarta Sans',sans-serif",
          }}>Annuler</button>
          <button onClick={onConfirm} style={{
            padding:"8px 20px",borderRadius:9,border:"none",cursor:"pointer",
            fontSize:12,fontWeight:800,color:"#fff",
            background:`linear-gradient(135deg,${cc},${cc}cc)`,
            boxShadow:`0 4px 12px ${cc}44`,
            fontFamily:"'Plus Jakarta Sans',sans-serif",
          }}>{confirmLabel||"Confirmer"}</button>
        </div>
      </div>
    </div>
  );
};

/* ── StatusBadge ── */
const StatusBadge = ({ status }) => {
  const meta = STATUS_META[status]||STATUS_META.draft;
  const { Icon } = meta;
  return (
    <span style={{
      display:"inline-flex",alignItems:"center",gap:4,
      padding:"3px 10px",borderRadius:999,fontSize:10,fontWeight:800,
      background:meta.bg,color:meta.color,border:`1.5px solid ${meta.color}33`,flexShrink:0,
    }}>
      <Icon style={{width:9,height:9}}/>{meta.label}
    </span>
  );
};

/* ── Stepper ── */
const Stepper = ({ value,min,max,onChange,accent }) => {
  const { dark } = useTheme();
  const T = dark?DARK:LIGHT;
  const ac = accent||COL.from;
  return (
    <div style={{display:"flex",alignItems:"center",gap:4}}>
      <button onClick={()=>onChange(Math.max(min,value-1))} disabled={value<=min}
        style={{
          width:28,height:28,borderRadius:7,border:`1.5px solid ${T.cardBorder}`,
          background:"transparent",cursor:value<=min?"not-allowed":"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",
          color:value<=min?T.textMuted:T.textSecondary,opacity:value<=min?0.4:1,transition:"all .12s",
        }}
        onMouseEnter={e=>value>min&&(e.currentTarget.style.borderColor=ac)}
        onMouseLeave={e=>(e.currentTarget.style.borderColor=T.cardBorder)}>
        <FaMinus style={{width:8,height:8}}/>
      </button>
      <div style={{
        width:36,height:28,borderRadius:7,
        display:"flex",alignItems:"center",justifyContent:"center",
        background:`${ac}15`,border:`1.5px solid ${ac}33`,
        fontSize:14,fontWeight:900,color:ac,
      }}>{value}</div>
      <button onClick={()=>onChange(Math.min(max,value+1))} disabled={value>=max}
        style={{
          width:28,height:28,borderRadius:7,border:`1.5px solid ${T.cardBorder}`,
          background:"transparent",cursor:value>=max?"not-allowed":"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",
          color:value>=max?T.textMuted:T.textSecondary,opacity:value>=max?0.4:1,transition:"all .12s",
        }}
        onMouseEnter={e=>value<max&&(e.currentTarget.style.borderColor=ac)}
        onMouseLeave={e=>(e.currentTarget.style.borderColor=T.cardBorder)}>
        <FaPlus style={{width:8,height:8}}/>
      </button>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   ONGLET 1 — VUE D'ENSEMBLE
═══════════════════════════════════════════════════════════ */
const TabOverview = ({ classes, validTerms, toast }) => {
  const { dark } = useTheme();
  const T = dark?DARK:LIGHT;

  const [statuses,  setStatuses]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [actioning, setActioning] = useState(null);
  const [confirm,   setConfirm]   = useState({ open:false });

  // BUG 4 FIX : toujours refetch depuis le serveur après chaque action
  // → garantit que le state local reflète exactement la DB
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData("/academics/term-status/");
      setStatuses(Array.isArray(data) ? data : (data?.results??[]));
    } catch {
      toast("error","Impossible de charger les statuts.");
    } finally {
      setLoading(false);
    }
  },[toast]);

  useEffect(()=>{ load(); },[load]);

  const getTs = (classId, term) =>
    statuses.find(s=>String(s.school_class)===String(classId)&&s.term===term)||null;

  // Crée le TermStatus si absent, retourne l'objet dans tous les cas
  const ensureTs = async (classId, term) => {
    const existing = getTs(classId, term);
    if(existing) return existing;
    const created = await postData("/academics/term-status/",{
      school_class:parseInt(classId,10), term,
    });
    return created;
  };

  // BUG 4 FIX : refetch après action au lieu de patch local
  // BUG 6 FIX : message pour unpublish ajouté
  const runAction = async (classId, term, action) => {
    const key = `${classId}-${term}`;
    setActioning(key);
    try {
      const ts = await ensureTs(classId, term);
      await postData(`/academics/term-status/${ts.id}/${action}/`,{});
      // Refetch complet — aucun risque de désync avec la DB
      await load();
      const msgs = {
        lock:      `${term} verrouillé. Les moyennes ont été calculées.`,
        unlock:    `${term} déverrouillé. Les notes sont de nouveau éditables.`,
        publish:   `${term} publié. Les bulletins sont accessibles aux parents.`,
        unpublish: `${term} dépublié. Les bulletins ne sont plus visibles.`, // BUG 6
      };
      toast("success", msgs[action]||"Action effectuée.");
    } catch(err) {
      const detail = err?.response?.data?.detail||err?.message||"Erreur inconnue.";
      toast("error", detail);
      // BUG 4 : en cas d'erreur aussi, resync pour être sûr
      await load();
    } finally {
      setActioning(null);
    }
  };

  // BUG 5 + BUG 7 FIX : cas unpublish ajouté, message publish corrigé
  const openConfirm = (classId, className, term, action) => {
    const cfgs = {
      lock: {
        title:        "Verrouiller ce trimestre ?",
        message:      `Verrouiller ${term} de « ${className} » calculera et figera toutes les moyennes. La saisie sera bloquée. Vous pourrez déverrouiller à tout moment.`,
        confirmLabel: "Verrouiller",
        confirmColor: "#f59e0b",
      },
      unlock: {
        title:        "Déverrouiller ce trimestre ?",
        message:      `Déverrouiller ${term} de « ${className} » remettra les notes en mode éditable et effacera les moyennes calculées. Elles seront recalculées au prochain verrouillage.`,
        confirmLabel: "Déverrouiller",
        confirmColor: "#6366f1",
      },
      // BUG 5 FIX : "action définitive" supprimé
      publish: {
        title:        "Publier ce trimestre ?",
        message:      `Publier ${term} de « ${className} » rendra les bulletins visibles aux élèves et parents. Vous pourrez dépublier si nécessaire.`,
        confirmLabel: "Publier",
        confirmColor: "#10b981",
      },
      // BUG 7 FIX : cas unpublish ajouté
      unpublish: {
        title:        "Dépublier ce trimestre ?",
        message:      `Dépublier ${term} de « ${className} » masquera les bulletins aux élèves et parents. Le trimestre repassera en statut Verrouillé. Les moyennes restent intactes.`,
        confirmLabel: "Dépublier",
        confirmColor: "#f59e0b",
      },
    };
    const cfg = cfgs[action];
    if(!cfg) return;
    setConfirm({ open:true, classId, term, action, ...cfg });
  };

  const handleConfirm = () => {
    const { classId, term, action } = confirm;
    setConfirm({ open:false });
    runAction(classId, term, action);
  };

  if(loading && statuses.length===0) return (
    <div style={{padding:"60px 0",textAlign:"center"}}>
      <FaSyncAlt style={{width:26,height:26,color:COL.from,margin:"0 auto 12px",
        animation:"spin 1s linear infinite",display:"block"}}/>
      <p style={{fontSize:12,color:T.textMuted}}>Chargement des statuts…</p>
    </div>
  );

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <p style={{fontSize:13,fontWeight:800,color:T.textPrimary}}>Statuts par classe × trimestre</p>
          <p style={{fontSize:11,color:T.textMuted,marginTop:2}}>
            {classes.length} classe{classes.length!==1?"s":""} · {validTerms.length} trimestre{validTerms.length!==1?"s":""} actifs
          </p>
        </div>
        <button onClick={load} disabled={loading}
          style={{
            display:"flex",alignItems:"center",gap:6,padding:"7px 14px",
            borderRadius:9,border:`1.5px solid ${T.cardBorder}`,
            background:"transparent",cursor:"pointer",
            fontSize:11,fontWeight:700,color:T.textSecondary,opacity:loading?0.6:1,
          }}
          onMouseEnter={e=>(e.currentTarget.style.background=T.rowHover)}
          onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
          <FaSyncAlt style={{width:10,height:10,animation:loading?"spin 1s linear infinite":"none"}}/>
          Actualiser
        </button>
      </div>

      <div style={{
        display:"flex",alignItems:"flex-start",gap:8,
        padding:"9px 14px",borderRadius:10,marginBottom:16,
        background:`${COL.from}0c`,border:`1px solid ${COL.from}22`,
      }}>
        <FaInfoCircle style={{width:12,height:12,color:COL.from,flexShrink:0,marginTop:1}}/>
        <p style={{fontSize:11,color:COL.from,lineHeight:1.5}}>
          <strong>Brouillon</strong> → saisie ouverte.&ensp;
          <strong>Verrouillé</strong> → moyennes calculées et figées, saisie bloquée.&ensp;
          <strong>Publié</strong> → bulletins visibles aux élèves et parents.&ensp;
          Toutes les actions sont réversibles.
        </p>
      </div>

      {classes.length===0 ? (
        <div style={{
          padding:"48px 24px",textAlign:"center",borderRadius:14,
          background:T.cardBg,border:`2px dashed ${T.cardBorder}`,
        }}>
          <p style={{fontSize:13,color:T.textMuted}}>Aucune classe disponible.</p>
        </div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {classes.map(cls => (
            <div key={cls.id} style={{
              borderRadius:14,overflow:"hidden",
              background:T.cardBg,border:`1.5px solid ${T.cardBorder}`,boxShadow:T.cardShadow,
            }}>
              {/* En-tête classe */}
              <div style={{
                padding:"10px 16px",background:T.tableHead,
                borderBottom:`1px solid ${T.divider}`,
                display:"flex",alignItems:"center",gap:10,
              }}>
                <div style={{
                  width:28,height:28,borderRadius:8,flexShrink:0,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                }}>
                  <FaLayerGroup style={{width:11,height:11,color:"#fff"}}/>
                </div>
                <p style={{fontSize:13,fontWeight:800,color:T.textPrimary}}>{cls.name}</p>
                {cls.level?.name && (
                  <span style={{
                    padding:"1px 8px",borderRadius:999,fontSize:10,fontWeight:700,
                    background:`${COL.from}15`,color:COL.from,
                  }}>{cls.level.name}</span>
                )}
              </div>

              {/* Grille trimestres */}
              <div style={{display:"grid",gridTemplateColumns:`repeat(${validTerms.length},1fr)`}}>
                {validTerms.map((term,tidx) => {
                  const ts     = getTs(cls.id, term);
                  const status = ts?.status||"draft";
                  const tc     = TERM_COLORS[term];
                  const key    = `${cls.id}-${term}`;
                  const busy   = actioning===key;

                  return (
                    <div key={term} style={{
                      padding:"16px",
                      borderRight:tidx<validTerms.length-1?`1px solid ${T.divider}`:"none",
                    }}>
                      {/* Badge terme + statut */}
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
                        <span style={{
                          padding:"3px 11px",borderRadius:999,fontSize:12,fontWeight:800,
                          background:`linear-gradient(135deg,${tc.from}22,${tc.to}11)`,
                          color:tc.from,border:`1px solid ${tc.from}44`,
                        }}>{term}</span>
                        <StatusBadge status={status}/>
                      </div>

                      {/* Détails audit */}
                      <div style={{minHeight:36,marginBottom:12}}>
                        {ts?.locked_by_name && (
                          <p style={{fontSize:10,color:T.textMuted,marginBottom:3}}>
                            <span style={{color:T.textSecondary,fontWeight:700}}>{ts.locked_by_name}</span>
                            {ts.locked_at?` · ${fmtDate(ts.locked_at)}`:""}
                          </p>
                        )}
                        {ts?.published_at && status==="published" && (
                          <p style={{fontSize:10,color:"#10b981"}}>
                            Publié le {fmtDate(ts.published_at)}
                          </p>
                        )}
                        {ts?.unlocked_at && status==="draft" && (
                          <p style={{fontSize:10,color:T.textMuted,fontStyle:"italic"}}>
                            Déverrouillé le {fmtDate(ts.unlocked_at)}
                          </p>
                        )}
                        {!ts && (
                          <p style={{fontSize:10,color:T.textMuted,fontStyle:"italic"}}>Non initialisé</p>
                        )}
                      </div>

                      {/* ── Boutons d'action ── */}
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>

                        {/* DRAFT → Verrouiller */}
                        {status==="draft" && (
                          <button
                            onClick={()=>openConfirm(cls.id,cls.name,term,"lock")}
                            disabled={busy}
                            style={{
                              display:"flex",alignItems:"center",gap:5,
                              padding:"7px 13px",borderRadius:8,border:"none",
                              cursor:busy?"not-allowed":"pointer",
                              fontSize:11,fontWeight:700,color:"#fff",
                              background:"linear-gradient(135deg,#f59e0b,#f97316)",
                              boxShadow:"0 2px 8px #f59e0b44",
                              opacity:busy?0.65:1,transition:"opacity .15s",
                            }}>
                            {busy
                              ? <FaSyncAlt style={{width:9,height:9,animation:"spin 1s linear infinite"}}/>
                              : <FaLock style={{width:9,height:9}}/>}
                            Verrouiller
                          </button>
                        )}

                        {/* LOCKED → Déverrouiller + Publier */}
                        {status==="locked" && (<>
                          <button
                            onClick={()=>openConfirm(cls.id,cls.name,term,"unlock")}
                            disabled={busy}
                            style={{
                              display:"flex",alignItems:"center",gap:5,
                              padding:"7px 13px",borderRadius:8,
                              border:`1.5px solid ${COL.from}55`,
                              cursor:busy?"not-allowed":"pointer",
                              fontSize:11,fontWeight:700,color:COL.from,
                              background:"transparent",opacity:busy?0.65:1,
                            }}>
                            {busy
                              ? <FaSyncAlt style={{width:9,height:9,animation:"spin 1s linear infinite"}}/>
                              : <FaLockOpen style={{width:9,height:9}}/>}
                            Déverrouiller
                          </button>
                          <button
                            onClick={()=>openConfirm(cls.id,cls.name,term,"publish")}
                            disabled={busy}
                            style={{
                              display:"flex",alignItems:"center",gap:5,
                              padding:"7px 13px",borderRadius:8,border:"none",
                              cursor:busy?"not-allowed":"pointer",
                              fontSize:11,fontWeight:700,color:"#fff",
                              background:"linear-gradient(135deg,#10b981,#059669)",
                              boxShadow:"0 2px 8px #10b98144",
                              opacity:busy?0.65:1,
                            }}>
                            {busy
                              ? <FaSyncAlt style={{width:9,height:9,animation:"spin 1s linear infinite"}}/>
                              : <FaEye style={{width:9,height:9}}/>}
                            Publier
                          </button>
                        </>)}

                        {/* BUG 1 FIX : PUBLISHED → label + bouton Dépublier */}
                        {status==="published" && (<>
                          <div style={{
                            display:"inline-flex",alignItems:"center",gap:5,
                            padding:"7px 13px",borderRadius:8,
                            background:"#10b98115",border:"1px solid #10b98133",
                            fontSize:11,fontWeight:700,color:"#10b981",
                          }}>
                            <FaEye style={{width:9,height:9}}/> Bulletin officiel
                          </div>
                          <button
                            onClick={()=>openConfirm(cls.id,cls.name,term,"unpublish")}
                            disabled={busy}
                            style={{
                              display:"flex",alignItems:"center",gap:5,
                              padding:"7px 13px",borderRadius:8,
                              border:`1.5px solid #f59e0b55`,
                              cursor:busy?"not-allowed":"pointer",
                              fontSize:11,fontWeight:700,color:"#f59e0b",
                              background:"transparent",opacity:busy?0.65:1,
                            }}>
                            {busy
                              ? <FaSyncAlt style={{width:9,height:9,animation:"spin 1s linear infinite"}}/>
                              : <FaEyeSlash style={{width:9,height:9}}/>}
                            Dépublier
                          </button>
                        </>)}
                      </div>

                      {/* Résumé configs matières */}
                      {ts?.subject_configs?.length>0 && (
                        <div style={{marginTop:10}}>
                          <p style={{fontSize:9,fontWeight:800,textTransform:"uppercase",
                            letterSpacing:"0.07em",color:T.textMuted,marginBottom:5}}>
                            Config matières
                          </p>
                          <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                            {ts.subject_configs.map(sc=>(
                              <span key={sc.subject_id} style={{
                                padding:"2px 7px",borderRadius:6,
                                fontSize:9,fontWeight:700,
                                background:T.tableHead,color:T.textSecondary,
                                border:`1px solid ${T.divider}`,
                              }}>
                                {sc.subject_name} · {sc.nb_interros}I {sc.nb_devoirs}D
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel}
        confirmColor={confirm.confirmColor}
        onConfirm={handleConfirm}
        onCancel={()=>setConfirm({open:false})}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   ONGLET 2 — CONFIG MATIÈRES
═══════════════════════════════════════════════════════════ */
const TabSubjectConfig = ({ classes, validTerms, toast }) => {
  const { dark } = useTheme();
  const T = dark?DARK:LIGHT;

  const [classId,  setClassId]  = useState("");
  const [term,     setTerm]     = useState("T1");
  const [subjects, setSubjects] = useState([]);
  const [configs,  setConfigs]  = useState({});
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [dirty,    setDirty]    = useState(false);

  const loadSubjects = useCallback(async(cId)=>{
    if(!cId){setSubjects([]);setConfigs({});return;}
    setLoading(true);
    try {
      const raw = await fetchData(`/academics/class-subjects/by-class/${cId}/`);
      const arr = Array.isArray(raw)?raw:[];
      // BUG 8 FIX : ClassSubjectSerializer retourne subject comme objet {id,name,...}
      // → lire sub.subject?.name en priorité
      setSubjects(arr.map(s=>{
        const subObj = s.subject || null;
        return {
          classSubjectId: s.id,
          subjectId:      subObj?.id ?? s.subject_id ?? s.id,
          name: (
            subObj?.name ||
            s.subject_name ||
            s.name?.trim() ||
            `Matière #${s.id}`
          ),
        };
      }));
    } catch {
      toast("error","Impossible de charger les matières.");
    } finally {
      setLoading(false);
    }
  },[toast]);

  const loadConfigs = useCallback(async(cId,t)=>{
    if(!cId||!t){setConfigs({});return;}
    try {
      const data = await fetchData(
        `/academics/term-subject-configs/${buildQuery({school_class:cId,term:t})}`
      );
      const arr = Array.isArray(data)?data:(data?.results??[]);
      const map = {};
      arr.forEach(c=>{
        // BUG 9 FIX : c.subject peut être un int ou un objet selon le serializer
        const sid = typeof c.subject==="object" ? (c.subject?.id??c.subject) : c.subject;
        map[String(sid)] = {
          id:          c.id,
          nb_interros: c.nb_interros,
          nb_devoirs:  c.nb_devoirs,
        };
      });
      setConfigs(map);
      setDirty(false);
    } catch {
      setConfigs({});
    }
  },[]);

  useEffect(()=>{ loadSubjects(classId); },[classId,loadSubjects]);
  useEffect(()=>{ loadConfigs(classId,term); },[classId,term,loadConfigs]);

  // BUG 2 FIX : nb_interros par défaut = 3 (et non 1)
  const getCfg = subjectId =>
    configs[String(subjectId)] || { nb_interros:3, nb_devoirs:2 };

  const updateCfg = (subjectId,field,value) => {
    const n = Math.max(
      field==="nb_interros"?1:0,
      Math.min(field==="nb_interros"?3:2, value)
    );
    setConfigs(prev=>({
      ...prev,
      [String(subjectId)]:{ ...getCfg(subjectId), [field]:n },
    }));
    setDirty(true);
  };

  const handleSave = async()=>{
    if(!classId||!term||subjects.length===0) return;
    setSaving(true);
    try {
      const payload = {
        school_class: parseInt(classId,10),
        term,
        configs: subjects.map(sub=>({
          subject:     sub.subjectId,
          nb_interros: getCfg(sub.subjectId).nb_interros,
          nb_devoirs:  getCfg(sub.subjectId).nb_devoirs,
        })),
      };
      await postData("/academics/term-subject-configs/bulk/", payload);
      toast("success","Configuration sauvegardée.");
      await loadConfigs(classId,term);
    } catch(err) {
      const detail = err?.response?.data?.detail;
      toast("error", detail||"Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  const canSave = !!classId&&!!term&&subjects.length>0;

  return (
    <div>
      {/* Sélecteurs + bouton save */}
      <div style={{
        display:"grid",gridTemplateColumns:"1fr 1fr auto",
        gap:12,alignItems:"end",marginBottom:16,
        padding:"14px 16px",borderRadius:12,
        background:T.cardBg,border:`1.5px solid ${T.cardBorder}`,
      }}>
        {/* Classe */}
        <div>
          <p style={{fontSize:10,fontWeight:800,textTransform:"uppercase",
            letterSpacing:"0.08em",color:T.textMuted,marginBottom:5}}>Classe</p>
          <div style={{position:"relative"}}>
            <FaLayerGroup style={{
              position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",
              width:11,height:11,color:T.textMuted,pointerEvents:"none",
            }}/>
            <select value={classId} onChange={e=>setClassId(e.target.value)}
              style={{
                width:"100%",appearance:"none",
                paddingLeft:30,paddingRight:28,paddingTop:8,paddingBottom:8,
                fontSize:12,borderRadius:10,outline:"none",transition:"all .15s",
                background:T.inputBg,color:classId?T.textPrimary:T.textMuted,
                border:`1.5px solid ${T.inputBorder}`,cursor:"pointer",
                fontFamily:"'Plus Jakarta Sans',sans-serif",
              }}
              onFocus={e=>(e.target.style.borderColor=COL.from)}
              onBlur={e=>(e.target.style.borderColor=T.inputBorder)}>
              <option value="">— Choisir une classe —</option>
              {classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <FaChevronDown style={{
              position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",
              width:8,height:8,color:T.textMuted,pointerEvents:"none",
            }}/>
          </div>
        </div>

        {/* Trimestre */}
        <div>
          <p style={{fontSize:10,fontWeight:800,textTransform:"uppercase",
            letterSpacing:"0.08em",color:T.textMuted,marginBottom:5}}>Trimestre</p>
          <div style={{
            display:"flex",background:T.inputBg,borderRadius:10,padding:3,
            border:`1.5px solid ${T.inputBorder}`,
          }}>
            {validTerms.map(t=>{
              const active=term===t;
              const tc=TERM_COLORS[t];
              return (
                <button key={t} onClick={()=>setTerm(t)}
                  style={{
                    flex:1,padding:"6px 10px",borderRadius:8,
                    border:"none",cursor:"pointer",fontSize:11,fontWeight:800,
                    background:active?`linear-gradient(135deg,${tc.from},${tc.to})`:"transparent",
                    color:active?"#fff":T.textMuted,
                    boxShadow:active?`0 2px 8px ${tc.from}44`:"none",
                    transition:"all .15s",
                  }}>
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bouton save */}
        <button onClick={handleSave} disabled={!canSave||saving}
          style={{
            display:"flex",alignItems:"center",gap:7,
            padding:"9px 20px",borderRadius:10,border:"none",
            cursor:(!canSave||saving)?"not-allowed":"pointer",
            fontSize:12,fontWeight:800,color:"#fff",transition:"all .2s",
            background:!canSave?T.textMuted
              :dirty?`linear-gradient(135deg,${COL.from},${COL.to})`
              :"linear-gradient(135deg,#10b981,#059669)",
            boxShadow:!canSave?"none":`0 4px 14px ${COL.shadow}`,
            opacity:!canSave?0.5:1,
          }}>
          {saving
            ? <FaSyncAlt style={{width:11,height:11,animation:"spin 1s linear infinite"}}/>
            : <FaSave style={{width:11,height:11}}/>}
          {saving?"Sauvegarde…":dirty?"Sauvegarder":"À jour"}
        </button>
      </div>

      {/* BUG 3 FIX : texte corrigé → 3 interrogations par défaut */}
      <div style={{
        display:"flex",alignItems:"flex-start",gap:8,
        padding:"9px 14px",borderRadius:10,marginBottom:16,
        background:`${COL.from}0c`,border:`1px solid ${COL.from}22`,
      }}>
        <FaInfoCircle style={{width:12,height:12,color:COL.from,flexShrink:0,marginTop:1}}/>
        <p style={{fontSize:11,color:COL.from,lineHeight:1.5}}>
          Configurez le nombre d'interrogations (1–3) et de devoirs (0–2) par matière.
          Ces valeurs servent de diviseur lors du calcul des moyennes au verrouillage.
          Si nb_interros &lt; 3 et que plus de notes sont saisies, les <strong>meilleures notes</strong> sont retenues.
          <strong> Par défaut : 3 interrogations, 2 devoirs.</strong>
        </p>
      </div>

      {/* Tableau */}
      {!classId ? (
        <div style={{
          padding:"48px 24px",textAlign:"center",borderRadius:14,
          background:T.cardBg,border:`2px dashed ${T.cardBorder}`,
        }}>
          <FaBook style={{width:26,height:26,color:T.textMuted,margin:"0 auto 12px",display:"block",opacity:.4}}/>
          <p style={{fontSize:13,color:T.textMuted}}>Sélectionnez une classe pour configurer les matières.</p>
        </div>
      ) : loading ? (
        <div style={{padding:"40px 0",textAlign:"center"}}>
          <FaSyncAlt style={{width:22,height:22,color:COL.from,margin:"0 auto 10px",
            animation:"spin 1s linear infinite",display:"block"}}/>
          <p style={{fontSize:12,color:T.textMuted}}>Chargement…</p>
        </div>
      ) : subjects.length===0 ? (
        <div style={{
          padding:"48px 24px",textAlign:"center",borderRadius:14,
          background:T.cardBg,border:`2px dashed ${T.cardBorder}`,
        }}>
          <p style={{fontSize:13,color:T.textMuted}}>Aucune matière configurée pour cette classe.</p>
        </div>
      ) : (
        <div style={{
          borderRadius:14,overflow:"hidden",
          background:T.cardBg,border:`1.5px solid ${T.cardBorder}`,boxShadow:T.cardShadow,
        }}>
          {/* Header */}
          <div style={{
            display:"grid",gridTemplateColumns:"1fr 200px 200px",
            padding:"10px 18px",background:T.tableHead,borderBottom:`2px solid ${T.divider}`,
          }}>
            {[
              {label:"Matière",color:T.textMuted},
              {label:"Interrogations",color:"#6366f1",hint:"1 à 3"},
              {label:"Devoirs",color:"#f97316",hint:"0 à 2"},
            ].map(({label,color,hint},i)=>(
              <p key={i} style={{fontSize:9,fontWeight:800,textTransform:"uppercase",
                letterSpacing:"0.08em",color}}>
                {label}
                {hint&&<span style={{fontWeight:500,textTransform:"none",marginLeft:4,opacity:.7}}>({hint})</span>}
              </p>
            ))}
          </div>

          {/* Lignes */}
          {subjects.map((sub,idx)=>{
            const cfg    = getCfg(sub.subjectId);
            const even   = idx%2===0;
            const hasCfg = !!configs[String(sub.subjectId)]?.id;
            return (
              <div key={sub.classSubjectId} style={{
                display:"grid",gridTemplateColumns:"1fr 200px 200px",
                padding:"14px 18px",alignItems:"center",
                borderBottom:idx<subjects.length-1?`1px solid ${T.divider}`:"none",
                background:even?T.cardBg:(dark?"rgba(255,255,255,0.018)":"rgba(0,0,0,0.012)"),
              }}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{
                    width:3,height:30,borderRadius:999,flexShrink:0,
                    background:`linear-gradient(180deg,${COL.from},${COL.to})`,
                  }}/>
                  <div>
                    <p style={{fontSize:12,fontWeight:700,color:T.textPrimary}}>{sub.name}</p>
                    {hasCfg ? (
                      <span style={{
                        fontSize:9,padding:"1px 6px",borderRadius:999,
                        background:`${COL.from}15`,color:COL.from,
                        fontWeight:700,marginTop:2,display:"inline-block",
                      }}>
                        Configuré · {cfg.nb_interros}I / {cfg.nb_devoirs}D
                      </span>
                    ) : (
                      <span style={{
                        fontSize:9,padding:"1px 6px",borderRadius:999,
                        background:`${T.textMuted}15`,color:T.textMuted,
                        fontWeight:700,marginTop:2,display:"inline-block",
                      }}>
                        Défaut · 3I / 2D
                      </span>
                    )}
                  </div>
                </div>

                <Stepper
                  value={cfg.nb_interros} min={1} max={3}
                  onChange={v=>updateCfg(sub.subjectId,"nb_interros",v)}
                  accent="#6366f1"
                />

                <Stepper
                  value={cfg.nb_devoirs} min={0} max={2}
                  onChange={v=>updateCfg(sub.subjectId,"nb_devoirs",v)}
                  accent="#f97316"
                />
              </div>
            );
          })}

          {/* Pied */}
          <div style={{
            padding:"10px 18px",borderTop:`1px solid ${T.divider}`,
            background:T.tableHead,
            display:"flex",alignItems:"center",justifyContent:"space-between",
          }}>
            <p style={{fontSize:10,color:T.textMuted}}>
              {subjects.length} matière{subjects.length!==1?"s":""} · Trimestre {term}
            </p>
            {dirty && (
              <p style={{fontSize:10,fontWeight:700,color:"#f59e0b",
                animation:"pulse 2s ease-in-out infinite"}}>
                Modifications non sauvegardées
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   ONGLET 3 — CONFIG ÉCOLE
═══════════════════════════════════════════════════════════ */
const TabSchoolConfig = ({ onNbTermsChange, toast }) => {
  const { dark } = useTheme();
  const T = dark?DARK:LIGHT;

  const [config,  setConfig]  = useState(null);
  const [form,    setForm]    = useState({nb_terms:3,current_year:""});
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [errors,  setErrors]  = useState({});
  const [dirty,   setDirty]   = useState(false);

  const load = useCallback(async()=>{
    setLoading(true);
    try {
      const data = await fetchData("/academics/school-year-config/");
      setConfig(data);
      setForm({nb_terms:data.nb_terms, current_year:data.current_year||""});
      setDirty(false);
    } catch {
      toast("error","Impossible de charger la configuration.");
    } finally {
      setLoading(false);
    }
  },[toast]);

  useEffect(()=>{ load(); },[load]);

  const validate = f => {
    const e={};
    if(![2,3].includes(f.nb_terms)) e.nb_terms="Doit être 2 ou 3.";
    if(!f.current_year) e.current_year="Champ requis.";
    else if(!/^\d{4}-\d{4}$/.test(f.current_year)) e.current_year="Format : YYYY-YYYY (ex: 2024-2025).";
    else {
      const [a,b]=f.current_year.split("-").map(Number);
      if(b!==a+1) e.current_year="L'année de fin doit être l'année de début + 1.";
    }
    return e;
  };

  const handleChange = (field,value)=>{
    setForm(p=>({...p,[field]:value}));
    setErrors(p=>({...p,[field]:undefined}));
    setDirty(true);
  };

  const handleSave = async()=>{
    const errs=validate(form);
    if(Object.keys(errs).length){setErrors(errs);return;}
    setSaving(true);
    try {
      const updated = await putData("/academics/school-year-config/1/",{
        nb_terms:form.nb_terms, current_year:form.current_year,
      });
      setConfig(updated);
      setDirty(false);
      setErrors({});
      onNbTermsChange(updated.nb_terms);
      toast("success","Configuration sauvegardée.");
    } catch(err) {
      const data=err?.response?.data||{};
      const ne={};
      if(data.nb_terms)     ne.nb_terms    =data.nb_terms[0]||data.nb_terms;
      if(data.current_year) ne.current_year=data.current_year[0]||data.current_year;
      if(data.detail) toast("error",data.detail);
      if(Object.keys(ne).length) setErrors(ne);
      else toast("error","Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  if(loading) return (
    <div style={{padding:"60px 0",textAlign:"center"}}>
      <FaSyncAlt style={{width:26,height:26,color:COL.from,margin:"0 auto 12px",
        animation:"spin 1s linear infinite",display:"block"}}/>
      <p style={{fontSize:12,color:T.textMuted}}>Chargement…</p>
    </div>
  );

  return (
    <div style={{maxWidth:560}}>
      <div style={{
        display:"flex",alignItems:"flex-start",gap:8,
        padding:"10px 14px",borderRadius:10,marginBottom:20,
        background:"#f59e0b0c",border:"1px solid #f59e0b33",
      }}>
        <FaExclamationTriangle style={{width:12,height:12,color:"#f59e0b",flexShrink:0,marginTop:1}}/>
        <p style={{fontSize:11,color:"#b45309",lineHeight:1.5}}>
          Modifier <strong>nb_terms</strong> affecte immédiatement les trimestres disponibles.
          Les données T3 restent en base si vous passez à 2 trimestres, mais ne sont plus accessibles.
        </p>
      </div>

      <div style={{
        borderRadius:14,overflow:"hidden",
        background:T.cardBg,border:`1.5px solid ${T.cardBorder}`,boxShadow:T.cardShadow,
      }}>
        <div style={{height:4,background:`linear-gradient(90deg,${COL.from},${COL.to})`}}/>
        <div style={{padding:"20px 22px",display:"flex",flexDirection:"column",gap:20}}>

          {/* Année */}
          <div>
            <label style={{display:"block",fontSize:12,fontWeight:800,color:T.textPrimary,marginBottom:6}}>
              Année scolaire
              <span style={{fontWeight:500,color:T.textMuted,marginLeft:6}}>(format YYYY-YYYY)</span>
            </label>
            <input type="text" value={form.current_year} placeholder="ex : 2024-2025"
              onChange={e=>handleChange("current_year",e.target.value)}
              style={{
                width:"100%",boxSizing:"border-box",
                padding:"10px 14px",fontSize:14,fontWeight:700,
                borderRadius:10,outline:"none",transition:"all .15s",
                background:T.inputBg,color:T.textPrimary,
                border:`1.5px solid ${errors.current_year?"#ef4444":T.inputBorder}`,
                fontFamily:"'Plus Jakarta Sans',sans-serif",
              }}
              onFocus={e=>(e.target.style.borderColor=errors.current_year?"#ef4444":COL.from)}
              onBlur={e=>(e.target.style.borderColor=errors.current_year?"#ef4444":T.inputBorder)}
            />
            {errors.current_year&&<p style={{fontSize:11,color:"#ef4444",marginTop:4,fontWeight:600}}>{errors.current_year}</p>}
            {config?.current_year&&!dirty&&(
              <p style={{fontSize:11,color:T.textMuted,marginTop:4}}>
                Actuel : <strong style={{color:COL.from}}>{config.current_year}</strong>
              </p>
            )}
          </div>

          {/* Nb trimestres */}
          <div>
            <label style={{display:"block",fontSize:12,fontWeight:800,color:T.textPrimary,marginBottom:10}}>
              Nombre de trimestres
            </label>
            <div style={{display:"flex",gap:12}}>
              {[2,3].map(n=>{
                const active=form.nb_terms===n;
                return (
                  <button key={n} onClick={()=>handleChange("nb_terms",n)}
                    style={{
                      flex:1,padding:"14px 16px",borderRadius:12,
                      border:`2px solid ${active?COL.from:T.cardBorder}`,
                      cursor:"pointer",transition:"all .2s",
                      background:active?`linear-gradient(135deg,${COL.from}18,${COL.to}0a)`:T.cardBg,
                      boxShadow:active?`0 0 0 3px ${COL.from}22`:"none",
                    }}>
                    <p style={{fontSize:26,fontWeight:900,color:active?COL.from:T.textMuted,lineHeight:1,marginBottom:4}}>{n}</p>
                    <p style={{fontSize:11,fontWeight:700,color:active?COL.from:T.textMuted}}>trimestre{n>1?"s":""}</p>
                    <p style={{fontSize:10,color:T.textMuted,marginTop:4}}>{n===2?"T1 + T2":"T1 + T2 + T3"}</p>
                  </button>
                );
              })}
            </div>
            {errors.nb_terms&&<p style={{fontSize:11,color:"#ef4444",marginTop:6,fontWeight:600}}>{errors.nb_terms}</p>}
          </div>

          {/* Résumé actuel */}
          {config&&(
            <div style={{
              padding:"12px 14px",borderRadius:10,
              background:dark?"rgba(99,102,241,0.08)":"#eef2ff",
              border:`1px solid ${COL.from}33`,
            }}>
              <p style={{fontSize:11,fontWeight:800,color:COL.from,marginBottom:4}}>Configuration actuelle en base</p>
              <div style={{display:"flex",gap:20}}>
                <span style={{fontSize:12,color:T.textSecondary}}>
                  Année : <strong style={{color:T.textPrimary}}>{config.current_year}</strong>
                </span>
                <span style={{fontSize:12,color:T.textSecondary}}>
                  Trimestres : <strong style={{color:T.textPrimary}}>{config.nb_terms}</strong>
                </span>
              </div>
            </div>
          )}

          {/* Boutons */}
          <div style={{display:"flex",alignItems:"center",gap:10,paddingTop:4}}>
            <button onClick={handleSave} disabled={saving||!dirty}
              style={{
                display:"flex",alignItems:"center",gap:8,
                padding:"10px 24px",borderRadius:11,border:"none",
                cursor:(saving||!dirty)?"not-allowed":"pointer",
                fontSize:13,fontWeight:800,color:"#fff",transition:"all .2s",
                background:!dirty?T.textMuted:`linear-gradient(135deg,${COL.from},${COL.to})`,
                boxShadow:!dirty?"none":`0 4px 14px ${COL.shadow}`,
                opacity:(!dirty&&!saving)?0.5:1,
              }}>
              {saving
                ? <FaSyncAlt style={{width:13,height:13,animation:"spin 1s linear infinite"}}/>
                : <FaSave style={{width:13,height:13}}/>}
              {saving?"Sauvegarde…":"Sauvegarder"}
            </button>
            {!dirty&&config&&(
              <span style={{fontSize:11,color:"#10b981",fontWeight:700,display:"flex",alignItems:"center",gap:4}}>
                <FaCheck style={{width:10,height:10}}/> À jour
              </span>
            )}
            {dirty&&(
              <button onClick={load} disabled={loading}
                style={{
                  padding:"9px 16px",borderRadius:10,
                  border:`1.5px solid ${T.cardBorder}`,
                  background:"transparent",cursor:"pointer",
                  fontSize:12,fontWeight:700,color:T.textSecondary,
                }}
                onMouseEnter={e=>(e.currentTarget.style.background=T.rowHover)}
                onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                Annuler
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════════════════════ */
const TermManagerInner = () => {
  const { dark } = useTheme();
  const T = dark?DARK:LIGHT;

  const [tab,         setTab]         = useState(0);
  const [classes,     setClasses]     = useState([]);
  const [nbTerms,     setNbTerms]     = useState(3);
  const [msg,         setMsg]         = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const toast = useCallback((type,text)=>setMsg({type,text}),[]);
  const validTerms = TERMS_ALL.slice(0, nbTerms);

  useEffect(()=>{
    (async()=>{
      setLoadingMeta(true);
      try {
        const [cls,cfg] = await Promise.all([
          fetchData("/academics/school-classes/").catch(()=>[]),
          fetchData("/academics/school-year-config/").catch(()=>null),
        ]);
        setClasses(Array.isArray(cls)?cls:(cls?.results??[]));
        if(cfg?.nb_terms) setNbTerms(cfg.nb_terms);
      } catch {
        toast("error","Erreur lors du chargement initial.");
      } finally {
        setLoadingMeta(false);
      }
    })();
  },[toast]);

  const TABS = [
    {label:"Vue d'ensemble",  Icon:FaEye},
    {label:"Config matières", Icon:FaBook},
    {label:"Config école",    Icon:FaSchool},
  ];

  return (
    <div style={{
      minHeight:"100vh",background:T.pageBg,transition:"background .3s",
      fontFamily:"'Plus Jakarta Sans',sans-serif",paddingBottom:80,
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <header style={{
        position:"sticky",top:0,zIndex:50,
        background:T.headerBg,backdropFilter:"blur(18px)",
        borderBottom:`1px solid ${T.divider}`,
      }}>
        <div style={{
          maxWidth:1280,margin:"0 auto",padding:"12px 24px",
          display:"flex",alignItems:"center",justifyContent:"space-between",
          gap:12,flexWrap:"wrap",
        }}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{
              width:40,height:40,borderRadius:12,flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 6px 18px ${COL.shadow}`,
            }}>
              <FaCog style={{width:17,height:17,color:"#fff"}}/>
            </div>
            <div>
              <h1 style={{fontSize:17,fontWeight:900,color:T.textPrimary,letterSpacing:"-0.02em"}}>
                Gestion Trimestres
              </h1>
              <p style={{fontSize:11,color:T.textMuted,marginTop:1}}>
                Administration du cycle de vie des trimestres
                {!loadingMeta&&(
                  <span style={{
                    marginLeft:8,padding:"1px 8px",borderRadius:999,fontSize:9,
                    fontWeight:800,background:`${COL.from}18`,color:COL.from,
                  }}>
                    {nbTerms} trimestre{nbTerms>1?"s":""}
                  </span>
                )}
              </p>
            </div>
          </div>
          <DarkToggle/>
        </div>

        {/* Onglets */}
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 24px",display:"flex",gap:4}}>
          {TABS.map(({label,Icon},i)=>{
            const active=tab===i;
            return (
              <button key={i} onClick={()=>setTab(i)}
                style={{
                  display:"flex",alignItems:"center",gap:7,
                  padding:"10px 16px 11px",
                  background:"transparent",border:"none",cursor:"pointer",
                  fontSize:12,fontWeight:active?800:600,
                  color:active?COL.from:T.textMuted,
                  borderBottom:active?`2px solid ${COL.from}`:"2px solid transparent",
                  transition:"all .15s",marginBottom:-1,
                }}>
                <Icon style={{width:11,height:11}}/>{label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Contenu */}
      <main style={{maxWidth:1280,margin:"0 auto",padding:"24px 24px 0"}}>
        {loadingMeta ? (
          <div style={{padding:"60px 0",textAlign:"center"}}>
            <FaSyncAlt style={{width:26,height:26,color:COL.from,margin:"0 auto 14px",
              animation:"spin 1s linear infinite",display:"block"}}/>
            <p style={{fontSize:12,color:T.textMuted}}>Initialisation…</p>
          </div>
        ) : (
          <>
            {tab===0 && <TabOverview      classes={classes} validTerms={validTerms} toast={toast}/>}
            {tab===1 && <TabSubjectConfig classes={classes} validTerms={validTerms} toast={toast}/>}
            {tab===2 && <TabSchoolConfig  onNbTermsChange={n=>setNbTerms(n)} toast={toast}/>}
          </>
        )}
      </main>

      <Toast msg={msg} onClose={()=>setMsg(null)}/>
      <style>{BASE_KEYFRAMES}{`
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
      `}</style>
    </div>
  );
};

/* ── ROOT ── */
const TermManager = () => {
  const [dark, setDark] = useState(()=>{
    try{return localStorage.getItem("scol360_dark")==="true";}catch{return false;}
  });
  const toggle = useCallback(()=>{
    setDark(v=>{
      const n=!v;
      try{localStorage.setItem("scol360_dark",String(n));}catch{}
      return n;
    });
  },[]);
  return (
    <ThemeCtx.Provider value={{dark,toggle}}>
      <TermManagerInner/>
    </ThemeCtx.Provider>
  );
};

export default TermManager;