// src/pages/Parents.jsx
import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import {
  FaSearch,
  FaSyncAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { fetchData, postData, patchData, deleteData } from "./api";

/* Small helpers / components */
const Skeleton = ({ lines = 6 }) => (
  <div className="space-y-3 animate-pulse">
    {Array.from({ length: lines }).map((_, i) => (
      <div key={i} className="h-10 bg-gray-200 rounded-lg" />
    ))}
  </div>
);

const EmptyState = ({ title = "Rien ici", subtitle = "" }) => (
  <div className="flex items-center justify-center flex-col gap-4 py-12 text-center text-gray-500">
    <svg width="96" height="72" viewBox="0 0 96 72" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="84" height="52" rx="8" stroke="#E5E7EB" strokeWidth="2" fill="#FFFFFF"/>
      <rect x="18" y="22" width="60" height="6" rx="3" fill="#EEF2FF"/>
      <rect x="18" y="34" width="36" height="6" rx="3" fill="#EEF2FF"/>
      <rect x="18" y="46" width="28" height="6" rx="3" fill="#EEF2FF"/>
    </svg>
    <div className="text-lg font-semibold text-gray-800">{title}</div>
    {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
  </div>
);

const Parents = () => {
  // data
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // UI state
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentParent, setCurrentParent] = useState(null);
  const [expandedParent, setExpandedParent] = useState(null);
  const [viewMode, setViewMode] = useState("table"); // "table" or "cards"

  // form
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [formErrors, setFormErrors] = useState({});

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  const firstInputRef = useRef(null);

  const fetchParents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchData("/core/admin/parents/");
      const list = Array.isArray(data) ? data : data?.results ?? [];
      setParents(list);
    } catch (err) {
      console.error("fetchParents error:", err?.body ?? err?.message ?? err);
      setError(err?.status === 401 ? "Non autorisé — connectez-vous." : "Erreur lors de la récupération des parents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  /* debounce query */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [query]);

  /* filtering */
  const filtered = useMemo(() => {
    if (!debouncedQuery) return parents;
    const q = debouncedQuery;
    return parents.filter((p) => {
      const usernameVal = (p?.user?.username ?? p?.username ?? "").toLowerCase();
      const emailVal = (p?.user?.email ?? p?.email ?? "").toLowerCase();
      const first = (p?.user?.first_name ?? p?.first_name ?? "").toLowerCase();
      const last = (p?.user?.last_name ?? p?.last_name ?? "").toLowerCase();
      return usernameVal.includes(q) || emailVal.includes(q) || first.includes(q) || last.includes(q);
    });
  }, [parents, debouncedQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  /* form helpers */
  const resetForm = () => {
    setCurrentParent(null);
    setUsername("");
    setEmail("");
    setFirstName("");
    setLastName("");
    setPhone("");
    setPassword("");
    setFormErrors({});
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (p) => {
    resetForm();
    setCurrentParent(p);
    setUsername(p?.user?.username ?? p?.username ?? "");
    setEmail(p?.user?.email ?? p?.email ?? "");
    setFirstName(p?.user?.first_name ?? p?.first_name ?? "");
    setLastName(p?.user?.last_name ?? p?.last_name ?? "");
    setPhone(p?.phone ?? "");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentParent(null);
    setFormErrors({});
  };

  useEffect(() => {
    if (showModal && firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, [showModal]);

  // close modal on Escape
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && showModal) closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showModal]);

  const validateForm = () => {
    const errs = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Email invalide";
    if (!firstName) errs.firstName = "Prénom requis";
    if (!lastName) errs.lastName = "Nom requis";
    if (!currentParent && !username) errs.username = "Username requis";
    if (!currentParent && !password) errs.password = "Mot de passe requis";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      if (currentParent) {
        const userPayload = { email, first_name: firstName, last_name: lastName };
        if (password) userPayload.password = password;
        const payload = { user: userPayload, phone: phone || null };
        // using PUT helper for updates (api.js doesn't expose patch by default)
        await patchData(`/core/admin/parents/${currentParent.id}/`, payload);
        await fetchParents();
        closeModal();
      } else {
        const payload = {
          user: { username, email, password, first_name: firstName, last_name: lastName },
          phone: phone || null,
        };
        await postData("/core/admin/parents/", payload);
        await fetchParents();
        closeModal();
      }
    } catch (err) {
      console.error("submit parent error:", err?.body ?? err?.message ?? err);
      const resp = err?.body ?? null;
      if (resp && typeof resp === "object") {
        const msg = Object.entries(resp).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ");
        setFormErrors({ submit: msg });
      } else {
        setFormErrors({ submit: "Erreur lors de l'envoi. Voir console." });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce parent ? Cette action est irréversible.")) return;
    try {
      await deleteData(`/core/admin/parents/${id}/`);
      await fetchParents();
    } catch (err) {
      console.error("delete parent error:", err?.body ?? err?.message ?? err);
      alert("Erreur lors de la suppression. Voir console.");
    }
  };

  const toggleExpand = (id) => setExpandedParent(expandedParent === id ? null : id);

  /* --- RENDER --- */
  return (
    <div className="p-8 bg-gray-50 min-h-screen text-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">👨‍👩‍👧 Gestion des parents</h1>
        <button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition"
        >
          + Ajouter un parent
        </button>
      </div>

      {/* Barre de recherche et actions */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          aria-label="Rechercher parents"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Rechercher (nom, username, email)..."
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 flex-1 min-w-[200px]"
        />
        <button
          title={viewMode === "table" ? "Basculer en vue cartes" : "Basculer en vue tableau"}
          onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")}
          className="bg-white border border-gray-300 px-3 py-2 rounded-lg shadow-sm"
        >
          {viewMode === "table" ? "Vue cartes" : "Vue tableau"}
        </button>
        <button onClick={() => { setQuery(""); fetchParents(); }} className="bg-white px-3 py-2 rounded-lg border border-gray-300 shadow-sm" title="Rafraîchir">
          <FaSyncAlt />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <Skeleton lines={8} />
        </div>
      ) : error ? (
        <div className="bg-white rounded-xl p-6 shadow-sm text-red-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <EmptyState title="Aucun parent trouvé" subtitle="Ajuste ta recherche ou ajoute un nouveau parent." />
        </div>
      ) : (
        <>
          {/* Table view */}
          {viewMode === "table" ? (
            <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                  <tr>
                    <th className="py-3 px-4 text-left">Parent</th>
                    <th className="py-3 px-4 text-left">Username</th>
                    <th className="py-3 px-4 text-left">Email</th>
                    <th className="py-3 px-4 text-left">Téléphone</th>
                    <th className="py-3 px-4 text-left">Enfants</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageData.map((p) => {
                    const first = p?.user?.first_name ?? p?.first_name ?? "";
                    const last = p?.user?.last_name ?? p?.last_name ?? "";
                    const children = p?.students ?? [];
                    return (
                      <React.Fragment key={p.id}>
                        <tr className="border-t hover:bg-gray-50 transition">
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-800">{first} {last}</div>
                            <div className="text-xs text-gray-400">ID: {p.id}</div>
                          </td>
                          <td className="py-3 px-4">{p?.user?.username ?? p?.username ?? "—"}</td>
                          <td className="py-3 px-4">{p?.user?.email ?? p?.email ?? "—"}</td>
                          <td className="py-3 px-4">{p?.phone ?? "—"}</td>
                          <td className="py-3 px-4">
                            <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-xs font-medium">
                              {children.length} enfant{children.length > 1 ? "s" : ""}
                            </span>
                          </td>
                          <td className="py-3 px-4 flex justify-center gap-2">
                            <button
                              onClick={() => openEditModal(p)}
                              className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs shadow-sm"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs shadow-sm"
                            >
                              Supprimer
                            </button>
                            {children.length > 0 && (
                              <button
                                onClick={() => toggleExpand(p.id)}
                                className={`px-3 py-1 rounded-lg text-xs shadow-sm ${expandedParent === p.id ? 'bg-white border border-gray-200' : 'bg-white hover:bg-gray-50 border border-gray-200'}`}
                                aria-expanded={expandedParent === p.id}
                              >
                                {expandedParent === p.id ? "Cacher" : "Enfants"}
                              </button>
                            )}
                          </td>
                        </tr>

                        {/* Expanded children */}
                        {expandedParent === p.id && children.length > 0 && (
                          <tr>
                            <td colSpan={6} className="bg-gray-50 px-4 py-4">
                              <div className="overflow-auto">
                                <table className="min-w-full text-xs bg-white border rounded-lg">
                                  <thead className="bg-gray-100">
                                    <tr>
                                      <th className="px-3 py-2 text-left">ID</th>
                                      <th className="px-3 py-2 text-left">Prénom</th>
                                      <th className="px-3 py-2 text-left">Nom</th>
                                      <th className="px-3 py-2 text-left">Username</th>
                                      <th className="px-3 py-2 text-left">Classe</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {children.map((s) => {
                                      const firstChild =
                                        s?.user?.first_name ??
                                        s?.user?.firstname ??
                                        s?.firstname ??
                                        s?.first_name ??
                                        s?.user?.firstName ??
                                        "—";
                                      const lastChild =
                                        s?.user?.last_name ??
                                        s?.user?.lastname ??
                                        s?.lastname ??
                                        s?.last_name ??
                                        s?.user?.lastName ??
                                        "—";
                                      const username = s?.user?.username ?? s?.username ?? "—";
                                      const className = s?.school_class?.name ?? s?.school_class_name ?? "—";

                                      return (
                                        <tr key={s.id} className="border-t hover:bg-gray-50">
                                          <td className="px-3 py-2">{s.id}</td>
                                          <td className="px-3 py-2">{firstChild}</td>
                                          <td className="px-3 py-2">{lastChild}</td>
                                          <td className="px-3 py-2">{username}</td>
                                          <td className="px-3 py-2">{className}</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {/* Pagination footer */}
              <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                <div className="text-sm text-gray-600">
                  Affichage {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} —{' '}
                  {Math.min(page * pageSize, filtered.length)} sur {filtered.length}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`px-3 py-1 rounded-lg text-sm shadow-sm ${page === 1 ? 'bg-gray-200 text-gray-500' : 'bg-white hover:bg-gray-100'}`}
                  >
                    Précédent
                  </button>
                  <div className="text-sm text-gray-700">Page {page} / {totalPages}</div>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`px-3 py-1 rounded-lg text-sm shadow-sm ${page === totalPages ? 'bg-gray-200 text-gray-500' : 'bg-white hover:bg-gray-100'}`}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Card view */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pageData.map((p) => {
                const first = p?.user?.first_name ?? p?.first_name ?? "";
                const last = p?.user?.last_name ?? p?.last_name ?? "";
                const children = p?.students ?? [];
                return (
                  <div key={p.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold text-gray-800">{first} {last}</div>
                        <div className="text-xs text-gray-400">ID: {p.id} • {p?.user?.username ?? "—"}</div>
                      </div>
                      <div className="text-sm text-gray-500">{children.length} enfant{children.length > 1 ? "s" : ""}</div>
                    </div>

                    <div className="mt-3 text-sm text-gray-600 space-y-2">
                      {children.length === 0 ? (
                        <div className="text-xs text-gray-400">Aucun enfant</div>
                      ) : (
                        children.map((s) => (
                          <div key={s.id} className="rounded-lg p-2 bg-gray-50">
                            <div className="text-sm font-medium">{s?.user?.first_name ?? s.firstname ?? "—"} {s?.user?.last_name ?? s.lastname ?? "—"}</div>
                            <div className="text-xs text-gray-500">ID: {s.id} • Classe: {s?.school_class?.name ?? "—"}</div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button onClick={() => openEditModal(p)} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm shadow-sm">Modifier</button>
                      <button onClick={() => handleDelete(p.id)} className="flex-1 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm shadow-sm">Suppr</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Modal Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 animate-fadeIn">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {currentParent ? "Modifier le parent" : "Ajouter un parent"}
            </h2>

            <div className="grid grid-cols-1 gap-3">
              {!currentParent && (
                <input
                  ref={firstInputRef}
                  placeholder="Nom d'utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                />
              )}

              <div className="grid grid-cols-2 gap-3">
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" className="input" />
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" className="input" />
              </div>

              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="input" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Téléphone" className="input" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={currentParent ? "Mot de passe (laisser vide)" : "Mot de passe"} className="input" />

              {formErrors.username && <div className="text-xs text-rose-600 mt-1">{formErrors.username}</div>}
              {formErrors.firstName && <div className="text-xs text-rose-600 mt-1">{formErrors.firstName}</div>}
              {formErrors.lastName && <div className="text-xs text-rose-600 mt-1">{formErrors.lastName}</div>}
              {formErrors.email && <div className="text-xs text-rose-600 mt-1">{formErrors.email}</div>}
              {formErrors.password && <div className="text-xs text-rose-600 mt-1">{formErrors.password}</div>}
              {formErrors.submit && <div className="text-sm text-rose-600">{formErrors.submit}</div>}

              <div className="flex justify-end gap-2 mt-4">
                <button onClick={closeModal} disabled={saving} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg">Annuler</button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg text-white ${saving ? "bg-yellow-500" : "bg-green-600 hover:bg-green-700"}`}
                >
                  {saving ? "Enregistrement..." : (currentParent ? "Modifier" : "Ajouter")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Small helpers CSS (same look as Students) */}
      <style>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db; /* gray-300 */
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          box-sizing: border-box;
          outline: none;
        }
        .input:focus {
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
          border-color: #6366f1;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.18s ease-out; }
      `}</style>
    </div>
  );
};

export default Parents;
