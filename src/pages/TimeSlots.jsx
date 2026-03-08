// src/pages/TimeSlots.jsx
import React, {
  useCallback, useEffect, useMemo, useState,
} from "react";
import {
  FaEdit, FaTrash, FaPlus, FaSearch,
  FaChevronDown, FaChevronUp, FaClock,
  FaCheck, FaSyncAlt, FaExclamationTriangle,
  FaMoon, FaSun, FaExclamationCircle, FaTimes,
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";
import {
  ThemeCtx, useTheme, LIGHT, DARK,
  SECTION_PALETTE, BASE_KEYFRAMES,
} from "./theme";

const COL = SECTION_PALETTE.academic; // bleu → cyan

/* ──────────────────────────────────────────────────────────────
   CONSTANTS
────────────────────────────────────────────────────────────── */
const DAYS = [
  { id:"1", name:"Lundi"    },
  { id:"2", name:"Mardi"    },
  { id:"3", name:"Mercredi" },
  { id:"4", name:"Jeudi"    },
  { id:"5", name:"Vendredi" },
  { id:"6", name:"Samedi"   },
  { id:"7", name:"Dimanche" },
];

// Dégradé subtil par jour (cycle sur 7)
const DAY_ACCENTS = [
  { from:"#3b82f6", to:"#06b6d4" },  // Lundi
  { from:"#6366f1", to:"#8b5cf6" },  // Mardi
  { from:"#10b981", to:"#14b8a6" },  // Mercredi
  { from:"#f59e0b", to:"#f97316" },  // Jeudi
  { from:"#ef4444", to:"#db2777" },  // Vendredi
  { from:"#0ea5e9", to:"#06b6d4" },  // Samedi
  { from:"#84cc16", to:"#10b981" },  // Dimanche
];

const dayAccent = (dayId) => {
  const idx = parseInt(dayId, 10) - 1;
  return DAY_ACCENTS[idx] ?? DAY_ACCENTS[0];
};

const dayName = (d) => {
  if (d === null || d === undefined) return "Autre";
  const found = DAYS.find((x) => String(x.id) === String(d));
  return found ? found.name : "Autre";
};

const fmtTime = (t) => {
  if (!t) return "—";
  const p = String(t).split(":");
  return p.length >= 2 ? `${p[0]}:${p[1]}` : t;
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

/* Toast */
const Toast = ({ msg, onClose }) => {
  useEffect(() => {
    if (msg) { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }
  }, [msg, onClose]);
  if (!msg) return null;
  const isErr = msg.type === "error";
  return (
    <div onClick={onClose} style={{
      position:"fixed", bottom:24, right:24, zIndex:350,
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

/* Confirm Dialog */
const ConfirmDialog = ({ open, title, message, onConfirm, onCancel }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div style={{
      position:"fixed", inset:0, zIndex:300,
      background:"rgba(0,0,0,0.55)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:16, animation:"fadeIn .15s ease-out",
    }}>
      <div style={{
        width:"100%", maxWidth:380, background:T.cardBg, borderRadius:18,
        boxShadow:"0 24px 60px rgba(0,0,0,.35)", border:`1.5px solid ${T.cardBorder}`,
        animation:"panelUp .2s cubic-bezier(.34,1.4,.64,1)", overflow:"hidden",
      }}>
        <div style={{ height:4, background:"linear-gradient(90deg,#ef4444,#dc2626)" }} />
        <div style={{ padding:"20px 20px 14px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{
              width:34, height:34, borderRadius:10, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:"#ef444418",
            }}>
              <FaExclamationCircle style={{ width:15,height:15,color:"#ef4444" }} />
            </div>
            <p style={{ fontSize:14, fontWeight:800, color:T.textPrimary }}>{title}</p>
          </div>
          <p style={{ fontSize:12, color:T.textSecondary, lineHeight:1.6, paddingLeft:44 }}>{message}</p>
        </div>
        <div style={{
          padding:"12px 20px", borderTop:`1px solid ${T.divider}`,
          display:"flex", justifyContent:"flex-end", gap:8,
        }}>
          <button onClick={onCancel} style={{
            padding:"8px 16px", borderRadius:9, border:`1.5px solid ${T.cardBorder}`,
            background:"transparent", cursor:"pointer", fontSize:12, fontWeight:700,
            color:T.textSecondary, fontFamily:"'Plus Jakarta Sans', sans-serif",
          }}>Annuler</button>
          <button onClick={onConfirm} style={{
            padding:"8px 18px", borderRadius:9, border:"none", cursor:"pointer",
            fontSize:12, fontWeight:800, color:"#fff",
            background:"linear-gradient(135deg,#ef4444,#dc2626)",
            boxShadow:"0 4px 12px #ef444444",
            fontFamily:"'Plus Jakarta Sans', sans-serif",
          }}>Supprimer</button>
        </div>
      </div>
    </div>
  );
};

/* Input stylé */
const SI = ({ icon: Icon, type = "text", ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [f, setF] = useState(false);
  return (
    <div style={{ position:"relative" }}>
      {Icon && (
        <span style={{
          position:"absolute", left:11, top:"50%", transform:"translateY(-50%)",
          pointerEvents:"none", color: f ? COL.from : T.textMuted,
          transition:"color .15s",
        }}>
          <Icon style={{ width:12,height:12 }} />
        </span>
      )}
      <input type={type} {...props}
        onFocus={(e) => { setF(true); props.onFocus?.(e); }}
        onBlur={(e)  => { setF(false); props.onBlur?.(e); }}
        style={{
          width:"100%", boxSizing:"border-box",
          padding: Icon ? "9px 12px 9px 32px" : "9px 12px",
          fontSize:13, borderRadius:10, outline:"none",
          background:T.inputBg, color:T.textPrimary,
          border:`1.5px solid ${f ? COL.from : T.inputBorder}`,
          boxShadow: f ? `0 0 0 3px ${COL.from}22` : "none",
          transition:"all .15s",
          fontFamily:"'Plus Jakarta Sans', sans-serif",
          ...props.style,
        }}
      />
    </div>
  );
};

/* Select stylé */
const SS = ({ children, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [f, setF] = useState(false);
  return (
    <select {...props}
      onFocus={(e) => { setF(true); props.onFocus?.(e); }}
      onBlur={(e)  => { setF(false); props.onBlur?.(e); }}
      style={{
        width:"100%", padding:"9px 12px", fontSize:13, borderRadius:10, outline:"none",
        appearance:"none", background:T.inputBg, color:T.textPrimary,
        border:`1.5px solid ${f ? COL.from : T.inputBorder}`,
        boxShadow: f ? `0 0 0 3px ${COL.from}22` : "none",
        transition:"all .15s",
        fontFamily:"'Plus Jakarta Sans', sans-serif",
      }}>
      {children}
    </select>
  );
};

/* Label de champ */
const FL = ({ children }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <p style={{
      fontSize:9, fontWeight:800, textTransform:"uppercase",
      letterSpacing:"0.08em", color:T.textMuted, marginBottom:5,
    }}>{children}</p>
  );
};

/* ──────────────────────────────────────────────────────────────
   SLOT CHIP — un créneau dans la liste du jour
────────────────────────────────────────────────────────────── */
const SlotChip = ({ slot, accent, onEdit, onDelete, animDelay }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"10px 14px", borderRadius:12, transition:"all .15s",
        background: hov
          ? (dark ? "rgba(255,255,255,0.05)" : `${accent.from}0c`)
          : (dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)"),
        border:`1.5px solid ${hov ? accent.from+"55" : T.divider}`,
        animation:`fadeUp .25s ease-out ${animDelay}ms both`,
      }}>

      {/* Heure */}
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{
          width:36, height:36, borderRadius:9, flexShrink:0,
          display:"flex", alignItems:"center", justifyContent:"center",
          background:`linear-gradient(135deg,${accent.from}22,${accent.to}11)`,
          border:`1px solid ${accent.from}33`,
        }}>
          <FaClock style={{ width:13,height:13,color:accent.from }} />
        </div>
        <div>
          <p style={{
            fontSize:14, fontWeight:800, color:T.textPrimary, lineHeight:1.1,
            fontFeatureSettings:'"tnum"',
          }}>
            {fmtTime(slot.start_time)}
            <span style={{ fontSize:11, color:T.textMuted, fontWeight:600, margin:"0 6px" }}>→</span>
            {fmtTime(slot.end_time)}
          </p>
          <p style={{ fontSize:10, color:T.textMuted, marginTop:2, fontWeight:600 }}>
            {slot.day_display ?? dayName(slot.day)} · #{slot.id}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div style={{
        display:"flex", gap:5,
        opacity: hov ? 1 : 0, transition:"opacity .15s",
      }}>
        <button onClick={() => onEdit(slot)}
          style={{
            width:30, height:30, borderRadius:8, border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            background: dark ? "#1a1a2e" : "#eff6ff", color:"#3b82f6",
            transition:"background .12s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background="#3b82f622")}
          onMouseLeave={(e) => (e.currentTarget.style.background=dark?"#1a1a2e":"#eff6ff")}>
          <FaEdit style={{ width:11,height:11 }} />
        </button>
        <button onClick={() => onDelete(slot)}
          style={{
            width:30, height:30, borderRadius:8, border:"none", cursor:"pointer",
            display:"flex", alignItems:"center", justifyContent:"center",
            background: dark ? "#2a0a0a" : "#fef2f2", color:"#ef4444",
            transition:"background .12s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background="#ef444422")}
          onMouseLeave={(e) => (e.currentTarget.style.background=dark?"#2a0a0a":"#fef2f2")}>
          <FaTrash style={{ width:11,height:11 }} />
        </button>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   DAY CARD — carte accordéon par jour
────────────────────────────────────────────────────────────── */
const DayCard = ({ dayId, dayLabel, slots: daySlots, onAdd, onEdit, onDelete, animDelay }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [open, setOpen] = useState(false);
  const [hov, setHov] = useState(false);
  const accent = dayAccent(dayId);
  const isEmpty = daySlots.length === 0;

  return (
    <div style={{
      borderRadius:16, overflow:"hidden",
      background:T.cardBg,
      border:`1.5px solid ${open ? accent.from+"55" : (hov ? accent.from+"33" : T.cardBorder)}`,
      boxShadow: open ? T.cardShadowHov : (hov ? T.cardShadow : "none"),
      transition:"all .2s",
      animation:`fadeUp .3s ease-out ${animDelay}ms both`,
    }}>

      {/* Bande couleur du jour */}
      <div style={{
        height:3,
        background:`linear-gradient(90deg,${accent.from},${accent.to})`,
        opacity: open ? 1 : 0.5, transition:"opacity .2s",
      }} />

      {/* Header cliquable */}
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"14px 16px", cursor:"pointer",
          background: open
            ? (dark ? `rgba(${accent.from === "#3b82f6" ? "59,130,246" : "99,102,241"},0.06)` : `${accent.from}08`)
            : "transparent",
          transition:"background .2s",
        }}
        onClick={() => setOpen((v) => !v)}>

        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {/* Icône jour */}
          <div style={{
            width:38, height:38, borderRadius:10, flexShrink:0,
            display:"flex", alignItems:"center", justifyContent:"center",
            background:`linear-gradient(135deg,${accent.from},${accent.to})`,
            boxShadow:`0 4px 12px ${accent.from}44`,
            fontSize:14, fontWeight:900, color:"#fff",
          }}>
            {dayLabel.slice(0,2)}
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:800, color:T.textPrimary, lineHeight:1.1 }}>
              {dayLabel}
            </p>
            <p style={{ fontSize:10, color: isEmpty ? T.textMuted : accent.from, marginTop:2, fontWeight:700 }}>
              {isEmpty ? "Aucun créneau" : `${daySlots.length} créneau${daySlots.length > 1 ? "x" : ""}`}
            </p>
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {/* Bouton ajouter pour ce jour */}
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(dayId); }}
            style={{
              display:"flex", alignItems:"center", gap:5,
              padding:"5px 10px", borderRadius:8,
              border:`1.5px solid ${accent.from}44`,
              background: dark ? `${accent.from}18` : `${accent.from}0f`,
              color:accent.from, fontSize:11, fontWeight:700,
              cursor:"pointer", transition:"all .15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background=`${accent.from}28`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background=dark?`${accent.from}18`:`${accent.from}0f`; }}>
            <FaPlus style={{ width:9,height:9 }} />
            Ajouter
          </button>

          {/* Toggle accordéon */}
          <div style={{
            width:28, height:28, borderRadius:8, display:"flex",
            alignItems:"center", justifyContent:"center",
            background: open ? `${accent.from}22` : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
            color: open ? accent.from : T.textMuted, transition:"all .2s",
          }}>
            {open
              ? <FaChevronUp  style={{ width:10,height:10 }} />
              : <FaChevronDown style={{ width:10,height:10 }} />}
          </div>
        </div>
      </div>

      {/* Contenu accordéon */}
      <div style={{
        maxHeight: open ? `${Math.max(daySlots.length * 70 + 24, 80)}px` : "0px",
        overflow:"hidden", transition:"max-height .3s cubic-bezier(.4,0,.2,1)",
      }}>
        <div style={{
          padding: "0 12px 12px",
          borderTop:`1px solid ${T.divider}`,
        }}>
          {isEmpty ? (
            <div style={{
              padding:"20px 0", textAlign:"center",
            }}>
              <FaClock style={{ width:22,height:22,color:accent.from,opacity:.3,marginBottom:8 }} />
              <p style={{ fontSize:12, color:T.textMuted, fontStyle:"italic" }}>
                Aucun créneau défini pour ce jour.
              </p>
              <button
                onClick={() => onAdd(dayId)}
                style={{
                  marginTop:10, display:"inline-flex", alignItems:"center", gap:5,
                  padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer",
                  fontSize:11, fontWeight:800, color:"#fff",
                  background:`linear-gradient(135deg,${accent.from},${accent.to})`,
                  boxShadow:`0 3px 10px ${accent.from}44`,
                }}>
                <FaPlus style={{ width:9,height:9 }} />
                Créer le premier créneau
              </button>
            </div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:6, paddingTop:10 }}>
              {daySlots.map((s, i) => (
                <SlotChip
                  key={s.id}
                  slot={s}
                  accent={accent}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  animDelay={i * 30}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   MODAL CRÉATION / ÉDITION
────────────────────────────────────────────────────────────── */
const SlotModal = ({ open, slot, presetDay, onClose, onSaved, setMsg }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const isEdit = !!slot;
  const [form, setForm] = useState({ day:"", start_time:"", end_time:"" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (slot) {
      setForm({
        day: String(slot.day ?? ""),
        start_time: slot.start_time || "",
        end_time:   slot.end_time   || "",
      });
    } else {
      setForm({ day: String(presetDay || ""), start_time:"", end_time:"" });
    }
  }, [open, slot, presetDay]);

  const handleSubmit = async () => {
    if (!form.day || !form.start_time || !form.end_time) {
      setMsg({ type:"error", text:"Tous les champs sont obligatoires." });
      return;
    }
    if (form.start_time >= form.end_time) {
      setMsg({ type:"error", text:"L'heure de fin doit être après l'heure de début." });
      return;
    }
    setSaving(true);
    try {
      const payload = { day: form.day, start_time: form.start_time, end_time: form.end_time };
      if (isEdit) await putData(`/academics/time-slots/${slot.id}/`, payload);
      else        await postData("/academics/time-slots/", payload);
      setMsg({ type:"success", text: isEdit ? "Créneau mis à jour." : "Créneau créé avec succès." });
      onSaved();
      onClose();
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setMsg({ type:"error", text: detail || "Erreur lors de l'enregistrement." });
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:200,
      background:"rgba(0,0,0,0.55)", backdropFilter:"blur(8px)",
      display:"flex", alignItems:"center", justifyContent:"center",
      padding:16, animation:"fadeIn .15s ease-out",
    }}>
      <div style={{
        width:"100%", maxWidth:420, background:T.cardBg, borderRadius:20,
        border:`1.5px solid ${T.cardBorder}`,
        boxShadow:"0 24px 60px rgba(0,0,0,.3)",
        animation:"panelUp .25s cubic-bezier(.34,1.4,.64,1)",
        overflow:"hidden",
      }}>
        {/* Bande */}
        <div style={{ height:4, background:`linear-gradient(90deg,${COL.from},${COL.to})` }} />

        {/* Header */}
        <div style={{
          padding:"16px 20px", borderBottom:`1px solid ${T.divider}`,
          display:"flex", alignItems:"center", justifyContent:"space-between",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:32, height:32, borderRadius:9, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 3px 10px ${COL.shadow}`,
            }}>
              <FaClock style={{ width:13,height:13,color:"#fff" }} />
            </div>
            <div>
              <p style={{ fontSize:14, fontWeight:800, color:T.textPrimary }}>
                {isEdit ? "Modifier le créneau" : "Nouveau créneau"}
              </p>
              <p style={{ fontSize:10, color:T.textMuted, marginTop:1 }}>
                {isEdit ? `Créneau #${slot.id}` : "Définissez le jour et les horaires"}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            style={{
              width:28, height:28, borderRadius:7, border:"none", cursor:"pointer",
              display:"flex", alignItems:"center", justifyContent:"center",
              background:"transparent", color:T.textMuted,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background="#ef444418"; e.currentTarget.style.color="#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
            <FaTimes style={{ width:12,height:12 }} />
          </button>
        </div>

        {/* Corps */}
        <div style={{ padding:"18px 20px", display:"flex", flexDirection:"column", gap:14 }}>

          {/* Jour */}
          <div>
            <FL>Jour *</FL>
            <SS value={form.day} onChange={(e) => setForm((p) => ({ ...p, day: e.target.value }))}>
              <option value="">— Sélectionner un jour —</option>
              {DAYS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </SS>
          </div>

          {/* Horaires côte à côte */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <FL>Heure de début *</FL>
              <SI type="time" value={form.start_time}
                onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))} />
            </div>
            <div>
              <FL>Heure de fin *</FL>
              <SI type="time" value={form.end_time}
                onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))} />
            </div>
          </div>

          {/* Preview */}
          {form.start_time && form.end_time && (
            <div style={{
              padding:"10px 14px", borderRadius:10,
              background: dark ? `${COL.from}18` : `${COL.from}0c`,
              border:`1px solid ${COL.from}33`,
              display:"flex", alignItems:"center", gap:8,
            }}>
              <FaClock style={{ width:12,height:12,color:COL.from,flexShrink:0 }} />
              <p style={{ fontSize:13, fontWeight:800, color:COL.from }}>
                {form.day ? `${dayName(form.day)} · ` : ""}
                {fmtTime(form.start_time)}
                <span style={{ fontWeight:600, margin:"0 6px", opacity:.7 }}>→</span>
                {fmtTime(form.end_time)}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding:"12px 20px", borderTop:`1px solid ${T.divider}`,
          display:"flex", justifyContent:"flex-end", gap:8,
        }}>
          <button onClick={onClose} style={{
            padding:"8px 16px", borderRadius:9, border:`1.5px solid ${T.cardBorder}`,
            background:"transparent", cursor:"pointer", fontSize:12, fontWeight:700,
            color:T.textSecondary, fontFamily:"'Plus Jakarta Sans', sans-serif",
          }}>Annuler</button>
          <button onClick={handleSubmit} disabled={saving} style={{
            padding:"8px 20px", borderRadius:9, border:"none", cursor: saving ? "not-allowed" : "pointer",
            fontSize:12, fontWeight:800, color:"#fff",
            background: saving ? T.textMuted : `linear-gradient(135deg,${COL.from},${COL.to})`,
            boxShadow: saving ? "none" : `0 4px 14px ${COL.shadow}`,
            display:"flex", alignItems:"center", gap:7,
            fontFamily:"'Plus Jakarta Sans', sans-serif",
            transition:"all .2s",
          }}>
            {saving
              ? <FaSyncAlt style={{ width:11,height:11, animation:"spin 1s linear infinite" }} />
              : (isEdit ? <FaCheck style={{ width:11,height:11 }} /> : <FaPlus style={{ width:11,height:11 }} />)}
            {saving ? "Enregistrement…" : isEdit ? "Mettre à jour" : "Créer le créneau"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   PAGE PRINCIPALE
────────────────────────────────────────────────────────────── */
const TimeSlotsInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  const [slots,   setSlots]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [msg,     setMsg]     = useState(null);

  /* Modal */
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editSlot,    setEditSlot]    = useState(null);
  const [presetDay,   setPresetDay]   = useState("");

  /* Confirm */
  const [confirm, setConfirm] = useState({ open:false, slot:null });

  /* Jours ouverts */
  const [openDays, setOpenDays] = useState(new Set());

  /* ── Fetch ── */
  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData("/academics/time-slots/");
      const arr = Array.isArray(data) ? data : (data?.results ?? []);
      setSlots(arr);
    } catch {
      setMsg({ type:"error", text:"Impossible de charger les créneaux." });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  /* ── Filtrage & groupement ── */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return slots;
    return slots.filter((s) => {
      const d = (s.day_display || dayName(s.day) || "").toLowerCase();
      return d.includes(q)
        || (s.start_time || "").toLowerCase().includes(q)
        || (s.end_time   || "").toLowerCase().includes(q);
    });
  }, [slots, search]);

  const grouped = useMemo(() => {
    const map = new Map();
    DAYS.forEach((d) => map.set(d.id, []));
    map.set("other", []);
    filtered.forEach((s) => {
      const key = s.day ? String(s.day) : "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || ""));
    }
    const result = DAYS.map((d) => ({
      dayId: d.id, dayLabel: d.name, slots: map.get(d.id) || [],
    }));
    const other = map.get("other") || [];
    if (other.length) result.push({ dayId:"other", dayLabel:"Autre", slots: other });
    return result;
  }, [filtered]);

  /* ── Stats ── */
  const totalSlots = slots.length;
  const daysUsed   = grouped.filter((g) => g.slots.length > 0).length;

  /* ── Actions ── */
  const openAdd  = (dayId = "") => { setEditSlot(null); setPresetDay(dayId); setModalOpen(true); };
  const openEdit = (s)          => { setEditSlot(s);    setPresetDay("");    setModalOpen(true); };

  const requestDelete = (s)  => setConfirm({ open:true, slot:s });
  const confirmDelete = async () => {
    const s = confirm.slot;
    setConfirm({ open:false, slot:null });
    try {
      await deleteData(`/academics/time-slots/${s.id}/`);
      setMsg({ type:"success", text:"Créneau supprimé." });
      fetchSlots();
    } catch { setMsg({ type:"error", text:"Impossible de supprimer ce créneau." }); }
  };

  const toggleDay = (dayId) => {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId); else next.add(dayId);
      return next;
    });
  };

  /* ══════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════ */
  return (
    <div style={{
      minHeight:"100vh", background:T.pageBg, transition:"background .3s",
      fontFamily:"'Plus Jakarta Sans', sans-serif", paddingBottom:60,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ══ HEADER ══ */}
      <header style={{
        position:"sticky", top:0, zIndex:40,
        background:T.headerBg, backdropFilter:"blur(16px)",
        borderBottom:`1px solid ${T.divider}`, transition:"all .3s",
      }}>
        <div style={{
          maxWidth:1100, margin:"0 auto", padding:"12px 24px",
          display:"flex", alignItems:"center", justifyContent:"space-between",
          gap:12, flexWrap:"wrap",
        }}>
          {/* Titre */}
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{
              width:40, height:40, borderRadius:12, flexShrink:0,
              display:"flex", alignItems:"center", justifyContent:"center",
              background:`linear-gradient(135deg,${COL.from},${COL.to})`,
              boxShadow:`0 6px 18px ${COL.shadow}`,
            }}>
              <FaClock style={{ width:16,height:16,color:"#fff" }} />
            </div>
            <div>
              <h1 style={{ fontSize:17, fontWeight:900, color:T.textPrimary, letterSpacing:"-0.02em" }}>
                Créneaux horaires
              </h1>
              <p style={{ fontSize:11, color:T.textMuted, marginTop:1 }}>
                Définissez les plages horaires disponibles pour la semaine
              </p>
            </div>
          </div>

          {/* Actions droite */}
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <DarkToggle />

            {/* Refresh */}
            <button onClick={fetchSlots}
              style={{
                width:36, height:36, borderRadius:10, border:`1.5px solid ${T.cardBorder}`,
                background:T.cardBg, cursor:"pointer", display:"flex",
                alignItems:"center", justifyContent:"center", color:T.textSecondary,
                transition:"all .15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor=COL.from; e.currentTarget.style.color=COL.from; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor=T.cardBorder; e.currentTarget.style.color=T.textSecondary; }}>
              <FaSyncAlt style={{
                width:13,height:13,
                animation: loading ? "spin 1s linear infinite" : "none",
              }} />
            </button>

            {/* Ajouter */}
            <button onClick={() => openAdd()}
              style={{
                display:"flex", alignItems:"center", gap:6,
                padding:"8px 16px", borderRadius:10, border:"none", cursor:"pointer",
                fontSize:12, fontWeight:800, color:"#fff",
                background:`linear-gradient(135deg,${COL.from},${COL.to})`,
                boxShadow:`0 4px 14px ${COL.shadow}`,
                transition:"all .2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform="translateY(-1px)")}
              onMouseLeave={(e) => (e.currentTarget.style.transform="none")}>
              <FaPlus style={{ width:11,height:11 }} />
              Nouveau créneau
            </button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth:1100, margin:"0 auto", padding:"20px 24px 0" }}>

        {/* ══ STATS + RECHERCHE ══ */}
        <div style={{
          display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto",
          gap:10, marginBottom:20, alignItems:"stretch",
        }}>
          {[
            { label:"Total créneaux",   val: totalSlots,  color:COL.from },
            { label:"Jours configurés", val: daysUsed,    color:`${COL.from}` },
            { label:"Non configurés",   val: 7 - daysUsed, color: (7 - daysUsed) > 0 ? "#f59e0b" : COL.from },
          ].map(({ label, val, color }, i) => (
            <div key={i} style={{
              borderRadius:14, padding:"12px 16px",
              background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
              boxShadow:T.cardShadow,
              animation:`fadeUp .3s ease-out ${i*60}ms both`,
            }}>
              <p style={{ fontSize:9, fontWeight:800, textTransform:"uppercase",
                letterSpacing:"0.08em", color:T.textMuted, marginBottom:4 }}>{label}</p>
              <p style={{ fontSize:24, fontWeight:900, color, lineHeight:1 }}>{val}</p>
            </div>
          ))}

          {/* Barre de recherche dans la 4e colonne */}
          <div style={{
            borderRadius:14, padding:"10px 14px",
            background:T.cardBg, border:`1.5px solid ${T.cardBorder}`,
            boxShadow:T.cardShadow, minWidth:240,
            display:"flex", alignItems:"center",
            animation:"fadeUp .3s ease-out 180ms both",
          }}>
            <SI
              icon={FaSearch}
              placeholder="Jour ou heure…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background:"transparent", border:"none", boxShadow:"none", padding:"4px 4px 4px 28px" }}
            />
          </div>
        </div>

        {/* ══ GRILLE DE JOURS ══ */}
        {loading ? (
          <div style={{
            display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12,
          }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{
                height:78, borderRadius:16, background:T.cardBg,
                border:`1.5px solid ${T.cardBorder}`,
                animation:"pulse 1.5s ease-in-out infinite",
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
            {grouped.map(({ dayId, dayLabel, slots: daySlots }, i) => (
              <DayCard
                key={dayId}
                dayId={dayId}
                dayLabel={dayLabel}
                slots={daySlots}
                onAdd={openAdd}
                onEdit={openEdit}
                onDelete={requestDelete}
                animDelay={i * 40}
              />
            ))}
          </div>
        )}
      </main>

      {/* ══ MODALS ══ */}
      <SlotModal
        open={modalOpen}
        slot={editSlot}
        presetDay={presetDay}
        onClose={() => setModalOpen(false)}
        onSaved={fetchSlots}
        setMsg={setMsg}
      />

      <ConfirmDialog
        open={confirm.open}
        title="Supprimer ce créneau ?"
        message={
          confirm.slot
            ? `Le créneau ${fmtTime(confirm.slot.start_time)} → ${fmtTime(confirm.slot.end_time)} du ${dayName(confirm.slot.day)} sera définitivement supprimé.`
            : "Cette action est irréversible."
        }
        onConfirm={confirmDelete}
        onCancel={() => setConfirm({ open:false, slot:null })}
      />

      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{BASE_KEYFRAMES}{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:.25} }
      `}</style>
    </div>
  );
};

/* ──────────────────────────────────────────────────────────────
   ROOT
────────────────────────────────────────────────────────────── */
const TimeSlots = () => {
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
      <TimeSlotsInner />
    </ThemeCtx.Provider>
  );
};

export default TimeSlots;