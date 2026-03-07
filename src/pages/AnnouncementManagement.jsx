// src/pages/AnnouncementManagement.jsx
import React, {
  useCallback, useEffect, useRef, useState,
} from "react";
import {
  FaEdit, FaTrash, FaPlus, FaSearch, FaTimes,
  FaBullhorn, FaImage, FaUser, FaCalendarAlt,
  FaCheck, FaExclamationTriangle, FaMoon, FaSun,
  FaSyncAlt, FaNewspaper, FaEye, FaUpload,
} from "react-icons/fa";
import {
  fetchData, postFormData, patchFormData, deleteData,
} from "./api";
import {
  ThemeCtx, useTheme, LIGHT, DARK,
  SECTION_PALETTE, BASE_KEYFRAMES,
} from "./theme";

const COL = SECTION_PALETTE.tool; // amber → orange

/* ──────────────────────────────────────────────────────────────
   UTILS
────────────────────────────────────────────────────────────── */
const fmtDate = (dt) => {
  if (!dt) return "—";
  try {
    return new Date(dt).toLocaleDateString("fr-FR", {
      day:"numeric", month:"long", year:"numeric",
    });
  } catch { return dt; }
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
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   MODAL GÉNÉRIQUE
────────────────────────────────────────────────────────────── */
const Modal = ({ isOpen, onClose, title, icon:Icon, children, width=540, zIndex=100 }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);
  if (!isOpen) return null;
  return (
    <div onClick={(e) => e.target === e.currentTarget && onClose()}
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

/* ──────────────────────────────────────────────────────────────
   INPUT STYLISÉ
────────────────────────────────────────────────────────────── */
const Field = ({ label, icon:Icon, children }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div>
      {label && (
        <p style={{ fontSize:10, fontWeight:800, textTransform:"uppercase",
          letterSpacing:"0.08em", color:T.textMuted, marginBottom:6 }}>
          {label}
        </p>
      )}
      {children}
    </div>
  );
};

const StyledInput = ({ label, icon:Icon, multiline, rows=4, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [f, setF] = useState(false);
  const shared = {
    width:"100%", boxSizing:"border-box",
    paddingLeft:Icon?30:12, paddingRight:12, paddingTop:10, paddingBottom:10,
    fontSize:12, borderRadius:10, outline:"none", transition:"all .15s",
    background:T.inputBg, color:T.textPrimary, fontFamily:"inherit",
    border:`1.5px solid ${f ? COL.from : T.inputBorder}`,
    boxShadow:f ? `0 0 0 3px ${COL.from}22` : "none",
  };
  return (
    <Field label={label}>
      <div style={{ position:"relative" }}>
        {Icon && (
          <span style={{
            position:"absolute", left:11, top: multiline ? 11 : "50%",
            transform: multiline ? "none" : "translateY(-50%)",
            pointerEvents:"none", color:f?COL.from:T.textMuted, transition:"color .15s",
          }}>
            <Icon style={{ width:11,height:11 }} />
          </span>
        )}
        {multiline
          ? <textarea {...props} rows={rows}
              onFocus={(e) => { setF(true); props.onFocus?.(e); }}
              onBlur={(e)  => { setF(false); props.onBlur?.(e); }}
              style={{ ...shared, resize:"vertical", minHeight:100, lineHeight:1.6 }} />
          : <input {...props}
              onFocus={(e) => { setF(true); props.onFocus?.(e); }}
              onBlur={(e)  => { setF(false); props.onBlur?.(e); }}
              style={shared} />}
      </div>
    </Field>
  );
};

/* ──────────────────────────────────────────────────────────────
   ZONE UPLOAD IMAGE
────────────────────────────────────────────────────────────── */
const ImageUploadZone = ({ file, existingUrl, onChange, onClear }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const preview = file ? URL.createObjectURL(file) : existingUrl || null;

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("image/")) onChange(f);
  };

  return (
    <Field label="Image (optionnel)">
      <input ref={inputRef} type="file" accept="image/*"
        style={{ display:"none" }}
        onChange={(e) => onChange(e.target.files[0])} />

      {preview ? (
        <div style={{ position:"relative", borderRadius:12, overflow:"hidden", lineHeight:0 }}>
          <img src={preview} alt="preview"
            style={{ width:"100%", height:160, objectFit:"cover", display:"block" }} />
          {/* Overlay */}
          <div style={{
            position:"absolute", inset:0, background:"rgba(0,0,0,0.45)",
            display:"flex", alignItems:"center", justifyContent:"center", gap:10,
            opacity:0, transition:"opacity .2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity=1)}
          onMouseLeave={(e) => (e.currentTarget.style.opacity=0)}>
            <button onClick={() => inputRef.current?.click()}
              style={{
                padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer",
                background:"rgba(255,255,255,0.9)", fontSize:11, fontWeight:800,
                color:"#111", display:"flex", alignItems:"center", gap:6,
              }}>
              <FaUpload style={{ width:10,height:10 }} /> Changer
            </button>
            <button onClick={onClear}
              style={{
                padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer",
                background:"rgba(239,68,68,0.9)", fontSize:11, fontWeight:800,
                color:"#fff", display:"flex", alignItems:"center", gap:6,
              }}>
              <FaTrash style={{ width:10,height:10 }} /> Retirer
            </button>
          </div>
          {file && (
            <div style={{
              position:"absolute", bottom:6, left:8,
              background:"rgba(0,0,0,0.6)", color:"#fff", borderRadius:6,
              fontSize:9, fontWeight:700, padding:"2px 8px",
            }}>
              Nouvelle image
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          style={{
            height:120, borderRadius:12, cursor:"pointer",
            display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
            gap:8, transition:"all .15s",
            border:`2px dashed ${drag ? COL.from : T.cardBorder}`,
            background: drag
              ? (dark?`${COL.from}18`:`${COL.from}0a`)
              : T.inputBg,
          }}>
          <FaImage style={{ width:22,height:22, color:drag?COL.from:T.textMuted, opacity:.5 }} />
          <p style={{ fontSize:11, color:T.textMuted, textAlign:"center", lineHeight:1.5 }}>
            Cliquez ou glissez une image ici<br />
            <span style={{ fontSize:9, color:T.textMuted, opacity:.7 }}>JPG, PNG, WEBP — max 5 Mo</span>
          </p>
        </div>
      )}
    </Field>
  );
};

/* ──────────────────────────────────────────────────────────────
   CARTE ANNONCE
────────────────────────────────────────────────────────────── */
const AnnouncementCard = ({ ann, onEdit, onDelete, animDelay }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [hov, setHov] = useState(false);
  const [actHov, setActHov] = useState(null);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius:16, overflow:"hidden",
        background:T.cardBg,
        border:`1.5px solid ${hov ? COL.from+"66" : T.cardBorder}`,
        boxShadow: hov ? T.cardShadowHov : T.cardShadow,
        transition:"all .2s",
        animation:`fadeUp .3s ease-out ${animDelay}ms both`,
        display:"flex", flexDirection:"column",
      }}>

      {/* Barre de couleur + image */}
      {ann.image ? (
        <div style={{ position:"relative", height:160, overflow:"hidden" }}>
          <img src={ann.image} alt={ann.title}
            style={{
              width:"100%", height:"100%", objectFit:"cover", display:"block",
              transition:"transform .3s",
              transform: hov ? "scale(1.04)" : "scale(1)",
            }} />
          <div style={{
            position:"absolute", inset:0,
            background:"linear-gradient(to top, rgba(0,0,0,.5) 0%, transparent 60%)",
          }} />
        </div>
      ) : (
        <div style={{
          height:4,
          background:`linear-gradient(90deg,${COL.from},${COL.to})`,
        }} />
      )}

      {/* Contenu */}
      <div style={{ padding:"14px 16px", flex:1, display:"flex", flexDirection:"column", gap:8 }}>
        <h2 style={{
          fontSize:14, fontWeight:800, color:T.textPrimary, lineHeight:1.3,
          overflow:"hidden", display:"-webkit-box",
          WebkitLineClamp:2, WebkitBoxOrient:"vertical",
        }}>
          {ann.title}
        </h2>

        <p style={{
          fontSize:11, color:T.textSecondary, lineHeight:1.6, flex:1,
          overflow:"hidden", display:"-webkit-box",
          WebkitLineClamp:3, WebkitBoxOrient:"vertical",
        }}>
          {ann.content}
        </p>

        {/* Méta */}
        <div style={{
          display:"flex", alignItems:"center", gap:10, flexWrap:"wrap",
          paddingTop:8, borderTop:`1px solid ${T.divider}`,
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <div style={{
              width:20, height:20, borderRadius:999,
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0,
            }}>
              <FaUser style={{ width:8,height:8,color:"#fff" }} />
            </div>
            <span style={{ fontSize:10, color:T.textMuted, fontWeight:600 }}>
              {ann.author_name || "Admin"}
            </span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:4 }}>
            <FaCalendarAlt style={{ width:9,height:9,color:T.textMuted }} />
            <span style={{ fontSize:10, color:T.textMuted }}>
              {fmtDate(ann.created_at)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display:"flex", gap:7, marginTop:2 }}>
          {[
            { id:"edit",   icon:FaEdit,  label:"Modifier",  color:COL.from,  action:() => onEdit(ann)   },
            { id:"delete", icon:FaTrash, label:"Supprimer", color:"#ef4444", action:() => onDelete(ann) },
          ].map(({ id, icon:Icon, label, color, action }) => (
            <button key={id} onClick={action}
              onMouseEnter={() => setActHov(id)}
              onMouseLeave={() => setActHov(null)}
              style={{
                flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6,
                padding:"7px 10px", borderRadius:9, border:"none", cursor:"pointer",
                fontSize:11, fontWeight:800, transition:"all .15s",
                background: actHov===id ? `${color}22` : T.inputBg,
                color: actHov===id ? color : T.textMuted,
                border:`1.5px solid ${actHov===id ? color+"44" : T.inputBorder}`,
              }}>
              <Icon style={{ width:10,height:10 }} /> {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   PAGE PRINCIPALE (inner)
────────────────────────────────────────────────────────────── */
const AnnouncementsInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  /* ── Data ── */
  const [announcements, setAnnouncements] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [msg,           setMsg]           = useState(null);

  /* ── Recherche ── */
  const [search, setSearch] = useState("");

  /* ── Modal ── */
  const [modalOpen,   setModalOpen]   = useState(false);
  const [currentAnn,  setCurrentAnn]  = useState(null); // null = création
  const [submitting,  setSubmitting]  = useState(false);

  /* ── Form ── */
  const [title,     setTitle]     = useState("");
  const [content,   setContent]   = useState("");
  const [imageFile, setImageFile] = useState(null);

  /* ── Confirm ── */
  const [confirm, setConfirm] = useState({ open:false, message:"", onConfirm:null });

  const toast = (type, text) => setMsg({ type, text });

  /* ── Fetch ── */
  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData("/academics/announcements/");
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      setAnnouncements(arr);
    } catch (err) {
      console.error(err);
      toast("error", "Erreur de récupération. Vérifiez vos permissions.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  /* ── Filtrage ── */
  const filtered = announcements.filter((ann) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (ann.title   || "").toLowerCase().includes(q) ||
      (ann.content || "").toLowerCase().includes(q)
    );
  });

  /* ── Ouvrir modal ── */
  const openCreate = () => {
    setCurrentAnn(null);
    setTitle(""); setContent(""); setImageFile(null);
    setModalOpen(true);
  };
  const openEdit = (ann) => {
    setCurrentAnn(ann);
    setTitle(ann.title || "");
    setContent(ann.content || "");
    setImageFile(null);
    setModalOpen(true);
  };
  const closeModal = () => {
    setModalOpen(false); setCurrentAnn(null);
    setTitle(""); setContent(""); setImageFile(null);
  };

  /* ── Submit ── */
  const handleSubmit = async () => {
    if (!title.trim())   return toast("error", "Le titre est requis.");
    if (!content.trim()) return toast("error", "Le contenu est requis.");

    const fd = new FormData();
    fd.append("title",   title.trim());
    fd.append("content", content.trim());
    if (imageFile) fd.append("image", imageFile);

    setSubmitting(true);
    try {
      if (currentAnn) {
        await patchFormData(`/academics/announcements/${currentAnn.id}/`, fd);
        toast("success", "Annonce modifiée avec succès.");
      } else {
        await postFormData("/academics/announcements/", fd);
        toast("success", "Annonce publiée avec succès.");
      }
      closeModal();
      await fetchAnnouncements();
    } catch (err) {
      console.error(err);
      const errMsg = err.body ? JSON.stringify(err.body) : err.message;
      toast("error", `Erreur (${err.status || "?"}): ${errMsg}`);
    } finally { setSubmitting(false); }
  };

  /* ── Supprimer ── */
  const handleDelete = (ann) => {
    setConfirm({
      open: true,
      message: `Supprimer l'annonce « ${ann.title} » ? Cette action est irréversible.`,
      onConfirm: async () => {
        setConfirm({ open:false });
        try {
          await deleteData(`/academics/announcements/${ann.id}/`);
          toast("success", "Annonce supprimée.");
          await fetchAnnouncements();
        } catch (err) {
          const msg = err.body ? JSON.stringify(err.body) : "Erreur lors de la suppression.";
          toast("error", msg);
        }
      },
    });
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
              <FaBullhorn style={{ width:16,height:16,color:"#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize:16, fontWeight:900, color:T.textPrimary, letterSpacing:"-0.02em" }}>
                Annonces
              </h1>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>
                Gérez les communications publiées sur l'application
              </p>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <button onClick={fetchAnnouncements}
              title="Actualiser"
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
            <button onClick={openCreate}
              style={{
                display:"flex", alignItems:"center", gap:7,
                padding:"8px 16px", borderRadius:10, border:"none", cursor:"pointer",
                fontSize:12, fontWeight:800, color:"#fff",
                background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                boxShadow:`0 4px 14px ${COL.shadow}`,
              }}>
              <FaPlus style={{ width:10,height:10 }} />
              Nouvelle annonce
            </button>
            <DarkToggle />
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1280, margin:"0 auto", padding:"20px 24px 0" }}>

        {/* ═══ BARRE RECHERCHE + STATS ═══ */}
        <div style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          gap:12, marginBottom:20, flexWrap:"wrap",
        }}>
          {/* Recherche */}
          <div style={{ position:"relative", flex:1, minWidth:240, maxWidth:420 }}>
            <FaSearch style={{
              position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
              width:11,height:11, color:T.textMuted, pointerEvents:"none",
            }} />
            <input
              placeholder="Rechercher par titre ou contenu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width:"100%", boxSizing:"border-box",
                paddingLeft:30, paddingRight: search ? 32 : 12,
                paddingTop:9, paddingBottom:9,
                fontSize:12, borderRadius:10, outline:"none",
                background:T.inputBg, color:T.textPrimary,
                border:`1.5px solid ${T.inputBorder}`, transition:"all .15s",
              }}
              onFocus={(e) => (e.target.style.borderColor=COL.from)}
              onBlur={(e)  => (e.target.style.borderColor=T.inputBorder)} />
            {search && (
              <button onClick={() => setSearch("")}
                style={{
                  position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
                  background:"transparent", border:"none", cursor:"pointer",
                  color:T.textMuted, display:"flex", alignItems:"center",
                }}>
                <FaTimes style={{ width:10,height:10 }} />
              </button>
            )}
          </div>

          {/* Compteur */}
          <div style={{
            display:"flex", alignItems:"center", gap:8,
            padding:"7px 14px", borderRadius:10,
            background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
          }}>
            <FaNewspaper style={{ width:11,height:11,color:COL.from }} />
            <span style={{ fontSize:12, fontWeight:700, color:T.textPrimary }}>
              {search
                ? `${filtered.length} résultat${filtered.length!==1?"s":""} sur ${announcements.length}`
                : `${announcements.length} annonce${announcements.length!==1?"s":""}`}
            </span>
          </div>
        </div>

        {/* ═══ GRILLE ═══ */}
        {loading ? (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:16 }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                borderRadius:16, height:260,
                background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
                animation:"pulse 1.5s ease-in-out infinite",
                animationDelay:`${i*100}ms`,
              }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding:"64px 24px", textAlign:"center",
            border:`2px dashed ${T.cardBorder}`, borderRadius:16,
            margin:"0 auto", maxWidth:400,
          }}>
            <div style={{
              width:56, height:56, borderRadius:16, margin:"0 auto 14px",
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`${COL.from}18`,
            }}>
              <FaBullhorn style={{ width:22,height:22,color:COL.from,opacity:.5 }} />
            </div>
            <p style={{ fontSize:14, fontWeight:700, color:T.textSecondary }}>
              {search ? "Aucune annonce correspondante" : "Aucune annonce publiée"}
            </p>
            <p style={{ fontSize:11, color:T.textMuted, marginTop:6, marginBottom:16, lineHeight:1.5 }}>
              {search
                ? "Essayez un autre terme de recherche."
                : "Créez votre première annonce pour la faire apparaître ici."}
            </p>
            {!search && (
              <button onClick={openCreate}
                style={{
                  display:"inline-flex", alignItems:"center", gap:7,
                  padding:"9px 18px", borderRadius:10, border:"none", cursor:"pointer",
                  fontSize:12, fontWeight:800, color:"#fff",
                  background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                  boxShadow:`0 4px 14px ${COL.shadow}`,
                }}>
                <FaPlus style={{ width:10,height:10 }} /> Créer une annonce
              </button>
            )}
          </div>
        ) : (
          <div style={{
            display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",
            gap:16,
          }}>
            {filtered.map((ann, i) => (
              <AnnouncementCard
                key={ann.id}
                ann={ann}
                onEdit={openEdit}
                onDelete={handleDelete}
                animDelay={i * 40}
              />
            ))}
          </div>
        )}
      </main>

      {/* ═══ MODAL CRÉATION / MODIFICATION ═══ */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={currentAnn ? "Modifier l'annonce" : "Nouvelle annonce"}
        icon={currentAnn ? FaEdit : FaPlus}
        width={520}
        zIndex={100}>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Titre */}
          <StyledInput
            label="Titre *"
            icon={FaBullhorn}
            placeholder="Titre de l'annonce"
            value={title}
            onChange={(e) => setTitle(e.target.value)} />

          {/* Contenu */}
          <StyledInput
            label="Contenu *"
            icon={FaNewspaper}
            multiline rows={5}
            placeholder="Rédigez le contenu de votre annonce…"
            value={content}
            onChange={(e) => setContent(e.target.value)} />

          {/* Image */}
          <ImageUploadZone
            file={imageFile}
            existingUrl={currentAnn?.image || null}
            onChange={setImageFile}
            onClear={() => setImageFile(null)} />

          {/* Bouton submit */}
          <button onClick={handleSubmit} disabled={submitting}
            style={{
              marginTop:4, width:"100%",
              display:"flex", alignItems:"center", justifyContent:"center", gap:8,
              padding:"12px 16px", borderRadius:12, border:"none",
              cursor:submitting ? "not-allowed" : "pointer",
              fontSize:13, fontWeight:800, color:"#fff",
              background: submitting ? "#9ca3af"
                : `linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow: submitting ? "none" : `0 4px 16px ${COL.shadow}`,
              transition:"all .2s",
            }}>
            {submitting
              ? <><FaSyncAlt style={{ width:12,height:12 }} className="animate-spin" /> Envoi…</>
              : currentAnn
                ? <><FaCheck style={{ width:12,height:12 }} /> Sauvegarder les modifications</>
                : <><FaBullhorn style={{ width:12,height:12 }} /> Publier l'annonce</>}
          </button>
        </div>
      </Modal>

      {/* ── Confirm ── */}
      <ConfirmDialog
        open={confirm.open}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm({ open:false })}
        zIndex={200} />

      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{BASE_KEYFRAMES}{`
        .animate-spin  { animation: spin 1s linear infinite; }
        @keyframes spin  { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.25} }
      `}</style>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   ROOT
────────────────────────────────────────────────────────────── */
const AnnouncementManagement = () => {
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
      <AnnouncementsInner />
    </ThemeCtx.Provider>
  );
};

export default AnnouncementManagement;