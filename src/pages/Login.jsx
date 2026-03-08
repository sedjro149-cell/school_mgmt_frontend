// src/pages/Login.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { loginAndStore as login } from "./api";

/* ─────────────────────────────────────────────────
   Palette : ardoise profond — un seul accent indigo
   Pas de dégradé coloré, pas de T&C, pas de mot
   de passe oublié, labels statiques (pas floating)
───────────────────────────────────────────────── */
const P = {
  bg:        "#f0f2f5",
  card:      "#ffffff",
  border:    "#e2e6ea",
  accent:    "#4f46e5",       // indigo 600
  accentHov: "#4338ca",       // indigo 700
  accentGlow:"rgba(79,70,229,0.18)",
  text:      "#111827",
  textSub:   "#6b7280",
  textMuted: "#9ca3af",
  error:     "#dc2626",
  errorBg:   "#fef2f2",
  errorBdr:  "#fecaca",
  inputBg:   "#ffffff",
  inputBdr:  "#d1d5db",
  inputFocus:"#4f46e5",
  shadow:    "0 20px 60px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)",
};

/* ─── Icône œil ─── */
const EyeIcon = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

/* ─── Icône spinner ─── */
const Spinner = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
    style={{ animation: "spin360 .8s linear infinite", flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

/* ─── Input avec label statique ─── */
const Field = ({ id, label, type, value, onChange, autoComplete, inputRef }) => {
  const [focused, setFocused] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const isPwd = type === "password";
  const inputType = isPwd ? (showPwd ? "text" : "password") : type;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label htmlFor={id} style={{
        fontSize: 12, fontWeight: 700, color: focused ? P.accent : P.textSub,
        textTransform: "uppercase", letterSpacing: "0.07em", transition: "color .15s",
        userSelect: "none",
      }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input
          ref={inputRef}
          id={id}
          type={inputType}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: "100%", boxSizing: "border-box",
            padding: isPwd ? "12px 44px 12px 14px" : "12px 14px",
            fontSize: 14, fontWeight: 500, borderRadius: 10, outline: "none",
            background: P.inputBg, color: P.text,
            border: `1.5px solid ${focused ? P.inputFocus : P.inputBdr}`,
            boxShadow: focused ? `0 0 0 3px ${P.accentGlow}` : "none",
            transition: "border-color .15s, box-shadow .15s",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        />
        {isPwd && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPwd(v => !v)}
            style={{
              position: "absolute", right: 13, top: "50%",
              transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", padding: 2,
              color: showPwd ? P.accent : P.textMuted, transition: "color .15s",
              display: "flex", alignItems: "center",
            }}
            aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
            <EyeIcon open={showPwd} />
          </button>
        )}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════ */
export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [visible, setVisible]   = useState(false);
  const [shaking, setShaking]   = useState(false);
  const usernameRef = useRef(null);

  /* Entrée */
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30);
    return () => clearTimeout(t);
  }, []);

  /* Shake */
  useEffect(() => {
    if (!shaking) return;
    const t = setTimeout(() => setShaking(false), 520);
    return () => clearTimeout(t);
  }, [shaking]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError(""); setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/");
    } catch (err) {
      const msg = err?.response?.data?.detail
        || err?.message
        || "Identifiants incorrects. Veuillez réessayer.";
      setError(msg);
      setShaking(true);
      setPassword("");
      setTimeout(() => usernameRef.current?.focus(), 50);
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: "100vh", background: P.bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      padding: 16,
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* Décor géométrique — cercles flous en arrière-plan */}
      <div aria-hidden style={{
        position: "fixed", inset: 0, overflow: "hidden",
        pointerEvents: "none", zIndex: 0,
      }}>
        <div style={{
          position: "absolute", width: 480, height: 480, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,70,229,0.07) 0%, transparent 70%)",
          top: "-120px", left: "-120px",
          animation: "floatA 8s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", width: 360, height: 360, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,70,229,0.05) 0%, transparent 70%)",
          bottom: "-80px", right: "-80px",
          animation: "floatB 10s ease-in-out infinite",
        }} />
        {/* Grille de points subtile */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(circle, rgba(79,70,229,0.1) 1px, transparent 1px)`,
          backgroundSize: "32px 32px",
          opacity: 0.4,
        }} />
      </div>

      {/* Carte */}
      <div
        style={{
          position: "relative", zIndex: 1,
          width: "100%", maxWidth: 400,
          background: P.card, borderRadius: 20,
          border: `1px solid ${P.border}`,
          boxShadow: P.shadow, padding: "36px 32px",
          transition: "opacity .4s ease, transform .4s ease",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(20px) scale(0.98)",
          animation: shaking ? "shakeX .5s cubic-bezier(.36,.07,.19,.97)" : "none",
        }}>

        {/* En-tête */}
        <div style={{ marginBottom: 28 }}>
          {/* Logo */}
          <div style={{
            width: 48, height: 48, borderRadius: 13,
            background: P.accent,
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 18,
            boxShadow: `0 8px 20px ${P.accentGlow}`,
          }}>
            {/* Icône simple maison/école stylisée */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
              <path d="M9 21V12h6v9" />
            </svg>
          </div>
          <h1 style={{
            fontSize: 22, fontWeight: 900, color: P.text,
            letterSpacing: "-0.03em", marginBottom: 4,
          }}>
            Connexion
          </h1>
          <p style={{ fontSize: 13, color: P.textSub, lineHeight: 1.5 }}>
            Entrez vos identifiants pour accéder au tableau de bord.
          </p>
        </div>

        {/* Erreur */}
        {error && (
          <div style={{
            padding: "10px 13px", borderRadius: 9, marginBottom: 18,
            background: P.errorBg, border: `1.5px solid ${P.errorBdr}`,
            display: "flex", alignItems: "flex-start", gap: 8,
            animation: "fadeDown .2s ease-out",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke={P.error} strokeWidth="2.5" strokeLinecap="round"
              style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p style={{ fontSize: 12, color: P.error, fontWeight: 600, lineHeight: 1.5 }}>
              {error}
            </p>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field
            id="username"
            label="Nom d'utilisateur"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            inputRef={usernameRef}
          />
          <Field
            id="password"
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {/* Bouton submit */}
          <button
            type="submit"
            disabled={loading || !username.trim() || !password}
            style={{
              marginTop: 6,
              width: "100%", padding: "13px 16px",
              borderRadius: 11, border: "none", cursor: "pointer",
              fontSize: 14, fontWeight: 800, color: "#fff",
              background: loading || !username.trim() || !password
                ? "#a5b4fc"
                : P.accent,
              boxShadow: loading || !username.trim() || !password
                ? "none"
                : `0 4px 16px ${P.accentGlow}`,
              transition: "all .2s",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
            onMouseEnter={(e) => {
              if (!loading && username.trim() && password)
                e.currentTarget.style.background = P.accentHov;
            }}
            onMouseLeave={(e) => {
              if (!loading)
                e.currentTarget.style.background = (!username.trim() || !password) ? "#a5b4fc" : P.accent;
            }}
          >
            {loading ? <><Spinner /> Connexion…</> : "Se connecter"}
          </button>
        </form>

        {/* Pied de carte discret */}
        <p style={{
          marginTop: 22, textAlign: "center",
          fontSize: 11, color: P.textMuted, lineHeight: 1.5,
        }}>
          Scol360 · Espace administration
        </p>
      </div>

      <style>{`
        @keyframes spin360  { to { transform: rotate(360deg); } }
        @keyframes floatA   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(12px,-16px)} }
        @keyframes floatB   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-10px,12px)} }
        @keyframes fadeDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shakeX {
          0%,100% { transform: translateX(0); }
          15%     { transform: translateX(-7px); }
          35%     { transform: translateX(7px); }
          55%     { transform: translateX(-4px); }
          75%     { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}