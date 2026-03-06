// src/pages/Teachers.jsx
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  FaUserTie, FaPlus, FaSearch, FaEdit, FaTrash, FaSyncAlt,
  FaTimes, FaCheck, FaEye, FaEyeSlash, FaChalkboardTeacher,
  FaEnvelope, FaAt, FaBookOpen, FaExclamationTriangle,
  FaShieldAlt, FaMoon, FaSun, FaUsers, FaLayerGroup,
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";
import {
  ThemeCtx, useTheme,
  LIGHT, DARK,
  SECTION_PALETTE, avatarGradient,
  BASE_KEYFRAMES,
} from "./theme";

const COL = SECTION_PALETTE.teachers; // ambre → jaune

/* ═══════════════════════════════════════════════════════════
   COMPOSANTS ATOMIQUES
═══════════════════════════════════════════════════════════ */

const Avatar = ({ firstName, lastName, size = 44 }) => {
  const initials = `${(firstName || "?")[0]}${(lastName || "")[0] || ""}`.toUpperCase();
  const [from, to] = avatarGradient(firstName);
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

const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={dark ? "Mode clair" : "Mode sombre"}
      className="relative rounded-full focus:outline-none transition-all duration-300 flex-shrink-0"
      style={{
        width: 52, height: 28,
        background: dark
          ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
          : `linear-gradient(135deg,${COL.from},${COL.to})`,
        boxShadow: hov
          ? dark ? "0 0 18px #6366f199" : `0 0 18px ${COL.shadow}`
          : "0 2px 8px rgba(0,0,0,.2)",
      }}
    >
      <div
        className="absolute top-0.5 w-6 h-6 rounded-full bg-white flex items-center justify-center transition-all duration-300"
        style={{ left: dark ? "calc(100% - 26px)" : "2px", boxShadow: "0 2px 6px rgba(0,0,0,.25)" }}
      >
        {dark ? <FaMoon style={{ width:12,height:12,color:"#6366f1" }} />
               : <FaSun  style={{ width:12,height:12,color:COL.from  }} />}
      </div>
    </button>
  );
};

const Toast = ({ msg, onClose }) => {
  useEffect(() => { if (msg) { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); } }, [msg, onClose]);
  if (!msg) return null;
  const bg = msg.type === "error"
    ? "linear-gradient(135deg,#ef4444,#dc2626)"
    : `linear-gradient(135deg,${COL.from},${COL.to})`;
  return (
    <div onClick={onClose} className="fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl cursor-pointer text-white text-sm font-bold max-w-sm"
      style={{ background: bg, animation: "slideUp .3s cubic-bezier(.34,1.56,.64,1)" }}>
      <FaCheck style={{ width:14,height:14,flexShrink:0 }} />
      {msg.text}
    </div>
  );
};

const Backdrop = ({ children, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
    style={{ background:"rgba(2,6,23,.7)", backdropFilter:"blur(8px)", animation:"fadeIn .18s ease-out" }}>
    <div className="absolute inset-0" onClick={onClose} />
    {children}
  </div>
);

const Panel = ({ children, className = "" }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div className={`relative w-full flex flex-col overflow-hidden ${className}`}
      style={{ background:T.cardBg, border:`1px solid ${T.cardBorder}`, borderRadius:20,
        boxShadow:"0 24px 64px rgba(0,0,0,.35)", maxHeight:"95dvh",
        animation:"panelUp .3s cubic-bezier(.34,1.4,.64,1)" }}>
      {children}
    </div>
  );
};

const SectionLabel = ({ icon, text }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div className="flex items-center gap-2 mb-3">
      <span style={{ color:T.textMuted }}>{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color:T.textMuted }}>{text}</span>
      <div className="flex-1 h-px" style={{ background:T.divider }} />
    </div>
  );
};

const FormField = ({ label, sublabel, error, required, children }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color:T.textSecondary }}>{label}</label>
        {required && <span className="text-[10px] font-bold" style={{ color:COL.from }}>*</span>}
        {sublabel && <span className="text-[10px] italic" style={{ color:T.textMuted }}>{sublabel}</span>}
      </div>
      {children}
      {error && (
        <p className="mt-1 text-[11px] flex items-center gap-1 font-medium" style={{ color:"#ef4444" }}>
          <FaExclamationTriangle style={{ width:9,height:9 }} />{error}
        </p>
      )}
    </div>
  );
};

const TextInput = React.forwardRef(({ icon: Icon, hasError, ...props }, ref) => {
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
      <input ref={ref} {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
        className="w-full py-2.5 text-sm rounded-xl outline-none transition-all duration-150 placeholder:opacity-40"
        style={{
          paddingLeft: Icon ? "2.5rem" : "1rem", paddingRight:"1rem",
          background:  hasError ? (dark?"#2a0a0a":"#fef2f2") : T.inputBg,
          border:`1.5px solid ${hasError?"#ef4444":focused?COL.from:T.inputBorder}`,
          boxShadow: focused && !hasError ? `0 0 0 3px ${COL.from}22` : "none",
          color: T.textPrimary,
        }} />
    </div>
  );
});
TextInput.displayName = "TextInput";

/* ═══════════════════════════════════════════════════════════
   MODAL SUPPRESSION
═══════════════════════════════════════════════════════════ */
const DeleteModal = ({ teacher, onClose, onDeleted, setMsg }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await deleteData(`/core/admin/teachers/${teacher.id}/`);
      setMsg({ type:"success", text:"Professeur supprimé avec succès." });
      onDeleted(); onClose();
    } catch {
      setMsg({ type:"error", text:"Impossible de supprimer ce professeur." });
      setBusy(false);
    }
  };
  return (
    <Backdrop onClose={onClose}>
      <Panel className="max-w-sm">
        <div className="h-1.5 flex-shrink-0" style={{ background:"linear-gradient(90deg,#ef4444,#dc2626)" }} />
        <div className="p-7 flex flex-col items-center text-center gap-5">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background:"#fef2f2",color:"#ef4444" }}>
            <FaTrash style={{ width:22,height:22 }} />
          </div>
          <div>
            <p className="text-base font-black mb-1" style={{ color:T.textPrimary }}>Supprimer ce professeur ?</p>
            <p className="text-sm" style={{ color:T.textSecondary }}>
              <span className="font-bold" style={{ color:T.textPrimary }}>{teacher.user?.first_name} {teacher.user?.last_name}</span>{" "}
              sera définitivement retiré du système.
            </p>
          </div>
          <div className="flex gap-3 w-full">
            <button onClick={onClose} className="flex-1 py-2.5 text-sm font-bold rounded-xl transition-all focus:outline-none"
              style={{ border:`1.5px solid ${T.cardBorder}`,color:T.textSecondary,background:T.cardBg }}>
              Annuler
            </button>
            <button onClick={go} disabled={busy}
              className="flex-1 py-2.5 text-sm font-black text-white rounded-xl flex items-center justify-center gap-2 transition-all focus:outline-none disabled:opacity-60"
              style={{ background:"linear-gradient(135deg,#ef4444,#dc2626)",boxShadow:"0 4px 14px #ef444440" }}>
              {busy ? <FaSyncAlt style={{ width:12,height:12 }} className="animate-spin" /> : <FaTrash style={{ width:12,height:12 }} />}
              Supprimer
            </button>
          </div>
        </div>
      </Panel>
    </Backdrop>
  );
};

/* ═══════════════════════════════════════════════════════════
   MODAL CRÉER / MODIFIER
═══════════════════════════════════════════════════════════ */
const TeacherModal = ({ teacher, subjects, onClose, onSaved, setMsg }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const isEdit = !!teacher;
  const [form, setForm] = useState({
    first_name: teacher?.user?.first_name ?? "",
    last_name:  teacher?.user?.last_name  ?? "",
    username:   teacher?.user?.username   ?? "",
    email:      teacher?.user?.email      ?? "",
    password:   "",
    subject_id: teacher?.subject?.id      ?? "",
  });
  const [showPwd, setShowPwd] = useState(false);
  const [errors,  setErrors]  = useState({});
  const [saving,  setSaving]  = useState(false);
  const firstRef = useRef(null);

  useEffect(() => { setTimeout(() => firstRef.current?.focus(), 120); }, []);

  const set = (k, v) => { setForm((p) => ({ ...p, [k]:v })); setErrors((p) => ({ ...p, [k]:undefined,global:undefined })); };

  const validate = () => {
    const e = {};
    if (!form.first_name.trim()) e.first_name = "Prénom obligatoire.";
    if (!form.last_name.trim())  e.last_name  = "Nom obligatoire.";
    if (!form.username.trim())   e.username   = "Identifiant obligatoire.";
    if (!isEdit && !form.password.trim()) e.password = "Mot de passe obligatoire.";
    if (form.password && form.password.length < 6) e.password = "6 caractères minimum.";
    return e;
  };

  const handleSave = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setSaving(true);
    try {
      const payload = {
        user: {
          username: form.username.trim(), first_name: form.first_name.trim(),
          last_name: form.last_name.trim(), email: form.email.trim(),
          ...(form.password ? { password: form.password } : {}),
        },
        subject_id: form.subject_id ? parseInt(form.subject_id) : null,
      };
      if (isEdit) {
        await putData(`/core/admin/teachers/${teacher.id}/`, payload);
        setMsg({ type:"success", text:"Professeur mis à jour." });
      } else {
        await postData("/core/admin/teachers/", payload);
        setMsg({ type:"success", text:"Professeur créé avec succès." });
      }
      onSaved(); onClose();
    } catch (err) {
      const d = err?.response?.data ?? err?.data;
      if (d?.user?.username) setErrors({ username: Array.isArray(d.user.username) ? d.user.username[0] : d.user.username });
      else if (d?.user?.email) setErrors({ email: Array.isArray(d.user.email) ? d.user.email[0] : d.user.email });
      else setErrors({ global: d?.detail ?? "Une erreur est survenue." });
    } finally { setSaving(false); }
  };

  const selectedSubject = subjects.find((s) => String(s.id) === String(form.subject_id));

  return (
    <Backdrop onClose={onClose}>
      <Panel className="max-w-xl">
        <div className="h-1.5 flex-shrink-0" style={{ background:`linear-gradient(90deg,${COL.from},${COL.to})` }} />
        {/* Header */}
        <div className="flex items-center justify-between px-7 pt-6 pb-4 flex-shrink-0" style={{ borderBottom:`1px solid ${T.divider}` }}>
          <div className="flex items-center gap-4">
            <Avatar firstName={form.first_name || teacher?.user?.first_name || "?"} lastName={form.last_name || teacher?.user?.last_name || ""} size={48} />
            <div>
              <h2 className="text-lg font-black tracking-tight" style={{ color:T.textPrimary }}>
                {isEdit ? "Modifier le professeur" : "Nouveau professeur"}
              </h2>
              <p className="text-xs mt-0.5" style={{ color:T.textMuted }}>
                {isEdit ? `${teacher.user?.first_name} ${teacher.user?.last_name} · #${teacher.id}` : "Identité et accès au système"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all focus:outline-none"
            style={{ color:T.textMuted }}
            onMouseEnter={(e) => { e.currentTarget.style.background="#ef444418"; e.currentTarget.style.color="#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
            <FaTimes style={{ width:14,height:14 }} />
          </button>
        </div>

        {errors.global && (
          <div className="mx-7 mt-4 flex items-start gap-2.5 p-3.5 rounded-xl text-sm"
            style={{ background:"#fef2f2",border:"1px solid #fecaca",color:"#b91c1c" }}>
            <FaExclamationTriangle style={{ width:13,height:13,flexShrink:0,marginTop:2 }} />
            {errors.global}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-7 pt-5 pb-2 space-y-5 custom-scrollbar">
          {/* Identité */}
          <div>
            <SectionLabel icon={<FaUserTie style={{ width:10,height:10 }} />} text="Identité" />
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Prénom" required error={errors.first_name}>
                <TextInput ref={firstRef} placeholder="ex : Kofi" value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)} hasError={!!errors.first_name} />
              </FormField>
              <FormField label="Nom" required error={errors.last_name}>
                <TextInput placeholder="ex : Mensah" value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)} hasError={!!errors.last_name} />
              </FormField>
            </div>
          </div>
          {/* Accès */}
          <div>
            <SectionLabel icon={<FaShieldAlt style={{ width:10,height:10 }} />} text="Accès au système" />
            <div className="space-y-3">
              <FormField label="Identifiant" required error={errors.username}>
                <TextInput icon={FaAt} placeholder="ex : k.mensah" value={form.username}
                  onChange={(e) => set("username", e.target.value)} hasError={!!errors.username} />
              </FormField>
              <FormField label="Email" error={errors.email}>
                <TextInput icon={FaEnvelope} type="email" placeholder="ex : k.mensah@ecole.bj"
                  value={form.email} onChange={(e) => set("email", e.target.value)} hasError={!!errors.email} />
              </FormField>
              <FormField label={isEdit ? "Nouveau mot de passe" : "Mot de passe"}
                sublabel={isEdit ? "Laisser vide pour conserver l'actuel" : ""} required={!isEdit} error={errors.password}>
                <div className="relative">
                  <input type={showPwd ? "text" : "password"}
                    placeholder={isEdit ? "••••••  (inchangé si vide)" : "Minimum 6 caractères"}
                    value={form.password} onChange={(e) => set("password", e.target.value)}
                    className="w-full pr-11 pl-4 py-2.5 text-sm rounded-xl outline-none transition-all placeholder:opacity-40"
                    style={{
                      background: errors.password ? (dark?"#2a0a0a":"#fef2f2") : T.inputBg,
                      border:`1.5px solid ${errors.password?"#ef4444":T.inputBorder}`, color:T.textPrimary,
                    }}
                    onFocus={(e) => !errors.password && (e.currentTarget.style.borderColor=COL.from)}
                    onBlur={(e)  => !errors.password && (e.currentTarget.style.borderColor=T.inputBorder)} />
                  <button type="button" onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors focus:outline-none"
                    style={{ color:T.textMuted }}
                    onMouseEnter={(e) => (e.currentTarget.style.color=COL.from)}
                    onMouseLeave={(e) => (e.currentTarget.style.color=T.textMuted)}>
                    {showPwd ? <FaEyeSlash style={{ width:14,height:14 }} /> : <FaEye style={{ width:14,height:14 }} />}
                  </button>
                </div>
              </FormField>
            </div>
          </div>
          {/* Matière */}
          <div>
            <SectionLabel icon={<FaBookOpen style={{ width:10,height:10 }} />} text="Matière enseignée" />
            <select value={form.subject_id} onChange={(e) => set("subject_id", e.target.value)}
              className="w-full appearance-none px-4 py-2.5 text-sm rounded-xl outline-none transition-all"
              style={{ background:T.inputBg, border:`1.5px solid ${T.inputBorder}`, color: form.subject_id ? T.textPrimary : T.textMuted }}
              onFocus={(e) => (e.currentTarget.style.borderColor=COL.from)}
              onBlur={(e)  => (e.currentTarget.style.borderColor=T.inputBorder)}>
              <option value="">— Aucune matière pour l'instant —</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {selectedSubject && (
              <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                style={{ background:dark?COL.darkBg:COL.lightBg, border:`1px solid ${COL.from}44`, color:COL.text }}>
                <FaBookOpen style={{ width:11,height:11,flexShrink:0 }} />
                {selectedSubject.name}
                <span className="ml-auto opacity-60">Attribution aux classes sur la page dédiée.</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-5 flex items-center justify-between gap-3 flex-shrink-0"
          style={{ borderTop:`1px solid ${T.divider}` }}>
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold rounded-xl transition-all focus:outline-none"
            style={{ color:T.textSecondary }}
            onMouseEnter={(e) => (e.currentTarget.style.background=dark?"rgba(255,255,255,0.06)":"#f1f5f9")}
            onMouseLeave={(e) => (e.currentTarget.style.background="transparent")}>
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2.5 px-6 py-2.5 text-sm font-black text-white rounded-xl transition-all focus:outline-none active:scale-95 disabled:opacity-60"
            style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 4px 16px ${COL.shadow}` }}>
            {saving ? <FaSyncAlt style={{ width:13,height:13 }} className="animate-spin" />
              : isEdit ? <FaCheck style={{ width:13,height:13 }} /> : <FaPlus style={{ width:13,height:13 }} />}
            {saving ? "Enregistrement…" : isEdit ? "Sauvegarder" : "Créer le professeur"}
          </button>
        </div>
      </Panel>
    </Backdrop>
  );
};

/* ═══════════════════════════════════════════════════════════
   TEACHER CARD
═══════════════════════════════════════════════════════════ */
const TeacherCard = ({ teacher, onEdit, onDelete, style: animStyle }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const fn = teacher.user?.first_name ?? "";
  const ln = teacher.user?.last_name  ?? "";
  const subj    = teacher.subject;
  const classes = teacher.classes ?? [];
  const [from]  = avatarGradient(fn);
  const [hov, setHov] = useState(false);

  return (
    <div className="group rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background:T.cardBg, border:`1.5px solid ${hov?COL.from+"55":T.cardBorder}`,
        boxShadow: hov ? T.cardShadowHov : T.cardShadow,
        transform: hov ? "translateY(-3px)" : "translateY(0)", ...animStyle,
      }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>

      <div className="h-1 w-full transition-all duration-300"
        style={{ background:`linear-gradient(90deg,${from}${hov?"ee":"55"},${from}11)` }} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar firstName={fn} lastName={ln} size={44} />
            <div className="min-w-0">
              <p className="font-black text-sm leading-tight truncate" style={{ color:T.textPrimary }}>{fn} {ln}</p>
              <p className="text-[11px] truncate mt-0.5" style={{ color:T.textSecondary }}>
                {teacher.user?.email || teacher.user?.username || "—"}
              </p>
              <p className="text-[10px] font-mono mt-0.5" style={{ color:T.textMuted }}>#{teacher.id}</p>
            </div>
          </div>
          <div className="flex gap-1 transition-all duration-150"
            style={{ opacity:hov?1:0, transform:hov?"translateX(0)":"translateX(4px)" }}>
            <button onClick={() => onEdit(teacher)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all focus:outline-none"
              style={{ color:T.textMuted }}
              onMouseEnter={(e) => { e.currentTarget.style.background=`${COL.from}22`; e.currentTarget.style.color=COL.from; }}
              onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
              <FaEdit style={{ width:13,height:13 }} />
            </button>
            <button onClick={() => onDelete(teacher)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all focus:outline-none"
              style={{ color:T.textMuted }}
              onMouseEnter={(e) => { e.currentTarget.style.background="#ef444422"; e.currentTarget.style.color="#ef4444"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
              <FaTrash style={{ width:13,height:13 }} />
            </button>
          </div>
        </div>

        <div className="mb-3">
          {subj ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black"
              style={{ background:dark?COL.darkBg:COL.lightBg, border:`1px solid ${COL.from}44`, color:COL.text }}>
              <FaBookOpen style={{ width:9,height:9 }} />{subj.name}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
              style={{ background:T.divider, color:T.textMuted }}>Aucune matière</span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 min-h-[22px]">
          {classes.length === 0
            ? <span className="text-[11px] italic" style={{ color:T.textMuted }}>Aucune classe assignée</span>
            : <>
                {classes.slice(0,4).map((c) => (
                  <span key={c.id} className="px-2 py-0.5 rounded-md text-[11px] font-bold"
                    style={{ background:T.divider, border:`1px solid ${T.cardBorder}`, color:T.textSecondary }}>
                    {c.name}
                  </span>
                ))}
                {classes.length > 4 && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-black text-white"
                    style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})` }}>
                    +{classes.length - 4}
                  </span>
                )}
              </>
          }
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════ */
const TeachersInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  const [teachers,   setTeachers]   = useState([]);
  const [subjects,   setSubjects]   = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [search,     setSearch]     = useState("");
  const [filterSubj, setFilterSubj] = useState("");
  const [msg,        setMsg]        = useState(null);
  const [modal,      setModal]      = useState(null);
  const [delTarget,  setDelTarget]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([
        fetchData("/core/admin/teachers/?no_pagination=1"),
        fetchData("/academics/subjects/"),
      ]);
      setTeachers(Array.isArray(t) ? t : (t?.results ?? []));
      setSubjects(Array.isArray(s) ? s : []);
    } catch { setMsg({ type:"error", text:"Erreur de chargement." }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teachers.filter((t) => {
      if (filterSubj && String(t.subject?.id) !== String(filterSubj)) return false;
      if (!q) return true;
      return [t.user?.first_name, t.user?.last_name, t.user?.username, t.subject?.name, t.id]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
    });
  }, [teachers, search, filterSubj]);

  const stats = useMemo(() => ({
    total:       teachers.length,
    withSubject: teachers.filter((t) => t.subject).length,
    withClasses: teachers.filter((t) => t.classes?.length > 0).length,
  }), [teachers]);

  return (
    <div className="min-h-screen pb-20 transition-colors duration-300"
      style={{ background:T.pageBg, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <header className="sticky top-0 z-40 transition-colors duration-300"
        style={{ background:T.headerBg, backdropFilter:"blur(16px)", borderBottom:`1px solid ${T.divider}` }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 6px 20px ${COL.shadow}` }}>
                <FaChalkboardTeacher style={{ width:20,height:20,color:"#fff" }} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight" style={{ color:T.textPrimary }}>Corps Enseignant</h1>
                <p className="text-xs" style={{ color:T.textMuted }}>
                  {stats.total} professeur{stats.total !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <DarkToggle />
              <button onClick={load}
                className="h-9 w-9 rounded-xl flex items-center justify-center transition-all focus:outline-none"
                style={{ background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, color:T.textSecondary }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor=COL.from; e.currentTarget.style.color=COL.from; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor=T.cardBorder; e.currentTarget.style.color=T.textSecondary; }}>
                <FaSyncAlt style={{ width:14,height:14 }} className={loading?"animate-spin":""} />
              </button>
              <button onClick={() => setModal("create")}
                className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-black text-white transition-all focus:outline-none active:scale-95"
                style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 4px 14px ${COL.shadow}` }}>
                <FaPlus style={{ width:12,height:12 }} /> Nouveau professeur
              </button>
            </div>
          </div>
          {/* Filtres */}
          <div className="mt-4 flex gap-3 flex-wrap">
            <div className="relative flex-1" style={{ minWidth:200 }}>
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ width:13,height:13,color:T.textMuted }} />
              <input placeholder="Nom, identifiant, matière…" value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all placeholder:opacity-50"
                style={{ background:T.inputBg, border:`1.5px solid ${T.inputBorder}`, color:T.textPrimary }}
                onFocus={(e) => (e.currentTarget.style.borderColor=COL.from)}
                onBlur={(e)  => (e.currentTarget.style.borderColor=T.inputBorder)} />
            </div>
            <select value={filterSubj} onChange={(e) => setFilterSubj(e.target.value)}
              className="px-3 py-2.5 text-sm rounded-xl outline-none transition-all"
              style={{ background:T.inputBg, border:`1.5px solid ${T.inputBorder}`,
                color:filterSubj?T.textPrimary:T.textMuted, minWidth:180 }}
              onFocus={(e) => (e.currentTarget.style.borderColor=COL.from)}
              onBlur={(e)  => (e.currentTarget.style.borderColor=T.inputBorder)}>
              <option value="">Toutes les matières</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label:"Total",        value:stats.total,       icon:FaUsers         },
            { label:"Avec matière", value:stats.withSubject, icon:FaBookOpen      },
            { label:"Avec classes", value:stats.withClasses, icon:FaLayerGroup    },
          ].map((s, i) => (
            <div key={i} className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, boxShadow:T.cardShadow }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:`linear-gradient(135deg,${COL.from}22,${COL.to}11)`, color:COL.from }}>
                <s.icon style={{ width:18,height:18 }} />
              </div>
              <div>
                <p className="text-2xl font-black" style={{ color:T.textPrimary }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color:T.textMuted }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Grille */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4" style={{ color:T.textMuted }}>
            <FaSyncAlt style={{ width:28,height:28 }} className="animate-spin" />
            <p className="text-sm font-medium">Chargement…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 rounded-2xl gap-4"
            style={{ border:`2px dashed ${COL.from}44`, background:dark?COL.darkBg:COL.lightBg }}>
            <FaChalkboardTeacher style={{ width:40,height:40,color:COL.from,opacity:0.4 }} />
            <p className="font-black" style={{ color:T.textSecondary }}>
              {search || filterSubj ? "Aucun résultat pour ces filtres" : "Aucun professeur enregistré"}
            </p>
            {!search && !filterSubj && (
              <button onClick={() => setModal("create")}
                className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white transition-all active:scale-95"
                style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 4px 12px ${COL.shadow}` }}>
                <FaPlus style={{ width:12,height:12 }} /> Créer le premier professeur
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((t, i) => (
              <TeacherCard key={t.id} teacher={t}
                onEdit={(t) => setModal({ teacher:t })}
                onDelete={setDelTarget}
                style={{ animation:`fadeUp .35s ease-out ${i*30}ms both` }} />
            ))}
          </div>
        )}
      </main>

      {modal === "create" && <TeacherModal subjects={subjects} onClose={() => setModal(null)} onSaved={load} setMsg={setMsg} />}
      {modal?.teacher    && <TeacherModal teacher={modal.teacher} subjects={subjects} onClose={() => setModal(null)} onSaved={load} setMsg={setMsg} />}
      {delTarget         && <DeleteModal  teacher={delTarget} onClose={() => setDelTarget(null)} onDeleted={load} setMsg={setMsg} />}

      <Toast msg={msg} onClose={() => setMsg(null)} />
      <style>{BASE_KEYFRAMES}{`
        .custom-scrollbar::-webkit-scrollbar { width:4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:${COL.from}66; border-radius:10px; }
      `}</style>
    </div>
  );
};

const Teachers = () => {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("scol360_dark")==="true"; } catch { return false; } });
  const toggle = useCallback(() => { setDark((v) => { const n=!v; try{localStorage.setItem("scol360_dark",String(n));}catch{} return n; }); }, []);
  return <ThemeCtx.Provider value={{ dark, toggle }}><TeachersInner /></ThemeCtx.Provider>;
};

export default Teachers;