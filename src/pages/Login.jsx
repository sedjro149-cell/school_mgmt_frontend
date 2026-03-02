import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginAndStore as login } from "./api";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shake, setShake] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // animation d'entrée
    const t = setTimeout(() => setMounted(true), 20);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // animation "shake" pour l'erreur
    if (shake) {
      const t = setTimeout(() => setShake(false), 600);
      return () => clearTimeout(t);
    }
  }, [shake]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      navigate("/");
    } catch (err) {
      // lecture robuste du message d'erreur
      const msg = (err && (err.message || (err.response && err.response.data && err.response.data.detail))) || "Échec de la connexion";
      setError(msg);
      setShake(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      {/* decorative background circles */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-20 w-72 h-72 bg-rose-100 opacity-30 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute -right-24 top-10 w-72 h-72 bg-indigo-100 opacity-30 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
      </div>

      <style>{`
        /* tiny keyframes used inline to avoid editing Tailwind config */
        @keyframes blob { 
          0% { transform: translateY(0px) scale(1); } 
          50% { transform: translateY(-8px) scale(1.05); } 
          100% { transform: translateY(0px) scale(1); } 
        }
        .animate-blob { animation: blob 6s ease-in-out infinite; }
        .animation-delay-2000 { animation-delay: 2s; }

        @keyframes shakeX {
          0% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(6px); }
          100% { transform: translateX(0); }
        }
        .animate-shake { animation: shakeX 0.6s cubic-bezier(.36,.07,.19,.97); }
      `}</style>

      <form
        onSubmit={handleSubmit}
        aria-busy={loading}
        className={[
          "relative z-10 w-full max-w-md p-8 rounded-2xl shadow-2xl bg-white/90 backdrop-blur-md transition-transform duration-500",
          mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-6 scale-95",
          shake ? "animate-shake" : ""
        ].join(" ")}
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-rose-500 to-indigo-600 flex items-center justify-center text-white text-lg font-extrabold shadow-lg">
            S
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Connexion</h1>
            <p className="text-sm text-slate-500">Accède au tableau de bord</p>
          </div>
        </div>

        {error ? (
          <div className="mb-4 p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">
            {error}
          </div>
        ) : (
          <div className="mb-4 text-sm text-slate-500">Entrez vos identifiants pour continuer.</div>
        )}

        {/* username - floating label */}
        <div className="relative mb-4">
          <input
            id="username"
            type="text"
            placeholder=" "
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="peer w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition"
            autoComplete="username"
            required
          />
          <label
            htmlFor="username"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-0 peer-focus:-translate-y-6 peer-focus:text-rose-500"
          >
            Nom d'utilisateur
          </label>
        </div>

        {/* password - floating label + visibility toggle */}
        <div className="relative mb-4">
          <input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder=" "
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="peer w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-800 placeholder-transparent focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-rose-400 transition pr-12"
            autoComplete="current-password"
            required
          />
          <label
            htmlFor="password"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none transition-all peer-placeholder-shown:top-1/2 peer-placeholder-shown:text-sm peer-focus:top-0 peer-focus:-translate-y-6 peer-focus:text-rose-500"
          >
            Mot de passe
          </label>

          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 text-sm"
            aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          >
            {showPassword ? "Masquer" : "Afficher"}
          </button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <label className="inline-flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" className="accent-rose-500" />
            Se souvenir de moi
          </label>
          <button
            type="button"
            onClick={() => alert("Fonction mot de passe oublié non implémentée")}
            className="text-sm text-rose-600 hover:underline"
          >
            Mot de passe oublié ?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={[
            "w-full flex items-center justify-center gap-3 py-3 rounded-lg font-semibold shadow-sm transition disabled:opacity-60",
            "bg-gradient-to-r from-rose-500 to-indigo-600 text-white"
          ].join(" ")}
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Connexion...
            </>
          ) : (
            "Se connecter"
          )}
        </button>

        <div className="mt-5 text-center text-xs text-slate-400">
          En vous connectant, vous acceptez les conditions d'utilisation.
        </div>
      </form>
    </div>
  );
}