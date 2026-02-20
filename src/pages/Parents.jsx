import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  FaSearch,
  FaSyncAlt,
  FaPlus,
  FaEdit,
  FaTrash,
  FaPhone,
  FaEnvelope,
  FaUserTie,
  FaChevronDown,
  FaTimes,
  FaCheck,
  FaGraduationCap,
  FaChevronLeft,
  FaChevronRight
} from "react-icons/fa";
import { fetchData, postData, patchData, deleteData } from "./api";

/* --- HELPERS --- */
const getFullName = (obj) => {
  if (!obj) return "—";
  if (obj.user) {
    const f = obj.user.first_name || obj.user.firstname || "";
    const l = obj.user.last_name || obj.user.lastname || "";
    if (f || l) return `${f} ${l}`.trim();
    return obj.user.username || "Utilisateur";
  }
  const f = obj.first_name || obj.firstname || "";
  const l = obj.last_name || obj.lastname || "";
  if (f || l) return `${f} ${l}`.trim();
  return obj.username || "—";
};

/* --- PRESENTATION --- */
const Avatar = ({ name }) => {
  const initials = (name || "?").split(" ").map(n => (n ? n[0] : "")).join("").substring(0, 2).toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm ring-2 ring-white shrink-0">
      {initials}
    </div>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"><FaTimes /></button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

/* --- MAIN COMPONENT --- */
export default function Parents() {
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // UI
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentParent, setCurrentParent] = useState(null);

  // Pagination server-driven
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [count, setCount] = useState(0);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    password: ""
  });
  const [formErrors, setFormErrors] = useState({});

  // --- build endpoint (force core/admin/parents) ---
  const buildEndpoint = useCallback((p = 1, q = "", ps = pageSize) => {
    const base = `/core/admin/parents/?page=${p}&page_size=${ps}`;
    return q ? `${base}&search=${encodeURIComponent(q)}` : base;
  }, [pageSize]);

  // --- debounce search input 300ms ---
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // --- fetch page whenever page / pageSize / debouncedQuery change ---
  useEffect(() => {
    let mounted = true;
    const url = buildEndpoint(page, debouncedQuery, pageSize);
    console.log("[Parents] fetch ->", url); // vérifie la console / network

    setLoading(true);
    fetchData(url)
      .then((data) => {
        if (!mounted) return;
        if (data && typeof data === "object" && Array.isArray(data.results)) {
          setParents(data.results);
          setCount(data.count ?? 0);
          setNextUrl(data.next ?? null);
          setPrevUrl(data.previous ?? null);
        } else if (Array.isArray(data)) {
          setParents(data);
          setCount(data.length);
          setNextUrl(null);
          setPrevUrl(null);
        } else {
          setParents([]);
          setCount(0);
          setNextUrl(null);
          setPrevUrl(null);
        }
      })
      .catch((err) => {
        console.error("[Parents] fetch error:", err);
        if (!mounted) return;
        setParents([]);
        setCount(0);
        setNextUrl(null);
        setPrevUrl(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [page, pageSize, debouncedQuery, buildEndpoint]);

  // --- actions ---
  const toggleExpand = useCallback((id) => setExpandedId(prev => (prev === id ? null : id)), []);
  const openModal = useCallback((p = null) => {
    setCurrentParent(p);
    setFormData({
      username: p?.user?.username ?? p?.username ?? "",
      email: p?.user?.email ?? p?.email ?? "",
      firstName: p?.user?.first_name ?? p?.first_name ?? "",
      lastName: p?.user?.last_name ?? p?.last_name ?? "",
      phone: p?.phone ?? "",
      password: ""
    });
    setFormErrors({});
    setShowModal(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    setFormErrors({});
    if (!formData.firstName || !formData.lastName) return setFormErrors({ global: "Nom et Prénom requis" });

    setSaving(true);
    try {
      const userPayload = { email: formData.email, first_name: formData.firstName, last_name: formData.lastName };
      if (formData.password) userPayload.password = formData.password;

      if (currentParent) {
        await patchData(`/core/admin/parents/${currentParent.id}/`, { user: userPayload, phone: formData.phone || null });
      } else {
        const payload = {
          user: { ...userPayload, username: formData.username || `${formData.firstName}.${formData.lastName}`.toLowerCase() },
          phone: formData.phone || null
        };
        await postData("/core/admin/parents/", payload);
        setPage(1);
      }

      // refresh current page
      // buildEndpoint here to ensure consistent URL logged later by useEffect
      setTimeout(() => { /* small delay to let backend update */ setPage(p => p); }, 150);
      setShowModal(false);
    } catch (err) {
      console.error("Erreur save parent:", err);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  }, [currentParent, formData]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm("Supprimer ce parent ?")) return;
    try {
      await deleteData(`/core/admin/parents/${id}/`);
      // If last item on page removed, go back a page if possible
      const isLastItemOnPage = parents.length === 1 && page > 1;
      const newPage = isLastItemOnPage ? page - 1 : page;
      setPage(newPage);
      // small delay to refresh
      setTimeout(() => setPage(p => p), 100);
    } catch (err) {
      console.error("Erreur suppression parent:", err);
      alert("Erreur lors de la suppression.");
    }
  }, [parents.length, page]);

  const handleRefresh = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setPage(1);
  }, []);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((count || 0) / pageSize)), [count, pageSize]);
  const pageInfoText = `${Math.min((page - 1) * pageSize + 1, count || 0)} - ${Math.min(page * pageSize, count || 0)} sur ${count || 0}`;

  // --- render (identique visuel que toi) ---
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm bg-opacity-90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
                  <FaUserTie size={20} />
               </div>
               <div>
                 <h1 className="text-xl font-bold text-slate-900 leading-tight">Parents & Tuteurs</h1>
                 <p className="text-xs text-slate-500">Vue Liste Détaillée</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleRefresh} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition">
                <FaSyncAlt className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md shadow-indigo-200 flex items-center gap-2 text-sm font-medium transition-transform active:scale-95">
                <FaPlus /> Nouveau
              </button>
            </div>
          </div>

          <div className="mt-4 max-w-3xl relative">
              <FaSearch className="absolute left-3 top-3 text-slate-400" />
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setPage(1); }}
                placeholder="Rechercher (Nom, Email, Téléphone)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-300 rounded-xl text-sm outline-none transition-all"
              />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="text-sm text-slate-600">{pageInfoText}</div>
          <div className="flex items-center gap-2">
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }} className="input text-sm">
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>

            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">
              <FaChevronLeft />
            </button>
            <div className="px-3 text-sm font-medium">Page {page} / {totalPages}</div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">
              <FaChevronRight />
            </button>
          </div>
        </div>

        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-4">Parent</div>
            <div className="col-span-3">Contact</div>
            <div className="col-span-2 text-center">Enfants</div>
            <div className="col-span-3 text-right">Actions</div>
        </div>

        <div className="space-y-3">
          {loading ? (
             [...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)
          ) : parents.length === 0 ? (
             <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">Aucun parent trouvé.</div>
          ) : (
             parents.map(parent => {
                const fullName = getFullName(parent);
                const children = parent.students || parent.children || [];
                const isExpanded = expandedId === parent.id;

                return (
                  <div key={parent.id} className={`bg-white border rounded-xl transition-all duration-300 overflow-hidden ${isExpanded ? 'border-indigo-300 shadow-lg ring-1 ring-indigo-100' : 'border-slate-200 shadow-sm hover:border-indigo-200'}`}>
                      <div
                        className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleExpand(parent.id)}
                      >
                          <div className="md:col-span-4 flex items-center gap-3">
                              <div><Avatar name={fullName} /></div>
                              <div className="min-w-0">
                                  <h3 className="font-bold text-slate-800 truncate text-sm">{fullName}</h3>
                                  <p className="text-xs text-slate-400 font-mono truncate">ID: {parent.id} • {parent.user?.username}</p>
                              </div>
                          </div>

                          <div className="md:col-span-3 flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <FaPhone className="text-slate-400" /> <span>{parent.phone || "—"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
                                  <FaEnvelope className="text-slate-400" /> <span className="truncate" title={parent.user?.email}>{parent.user?.email || "—"}</span>
                              </div>
                          </div>

                          <div className="md:col-span-2 flex justify-center">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${children.length > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                  <FaGraduationCap /> {children.length}
                              </span>
                          </div>

                          <div className="md:col-span-3 flex items-center justify-end gap-3">
                              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => openModal(parent)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><FaEdit /></button>
                                  <button onClick={() => handleDelete(parent.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><FaTrash /></button>
                              </div>
                              <div className={`w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''}`}>
                                  <FaChevronDown size={12} />
                              </div>
                          </div>
                      </div>

                      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'} `}>
                          <div className="overflow-hidden">
                              <div className="bg-slate-50/80 border-t border-slate-100 p-4 sm:p-6">
                                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                                      <FaGraduationCap /> Liste des Enfants ({children.length})
                                  </h4>

                                  {children.length > 0 ? (
                                    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                                                <tr>
                                                    <th className="px-4 py-2">ID</th>
                                                    <th className="px-4 py-2">Prénom</th>
                                                    <th className="px-4 py-2">Nom</th>
                                                    <th className="px-4 py-2">Username</th>
                                                    <th className="px-4 py-2">Classe</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {children.map(child => {
                                                    const cFirst = child.user?.first_name || child.firstname || "—";
                                                    const cLast = child.user?.last_name || child.lastname || "—";
                                                    return (
                                                        <tr key={child.id} className="hover:bg-slate-50/50">
                                                            <td className="px-4 py-2.5 font-mono text-slate-400 text-xs">{child.id}</td>
                                                            <td className="px-4 py-2.5 font-medium text-slate-700">{cFirst}</td>
                                                            <td className="px-4 py-2.5 font-bold text-slate-800">{cLast}</td>
                                                            <td className="px-4 py-2.5 text-slate-500 text-xs">{child.user?.username || child.username}</td>
                                                            <td className="px-4 py-2.5">
                                                                <span className="inline-block bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold border border-indigo-100">
                                                                    {child.school_class?.name || "—"}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                  ) : (
                                    <div className="text-center py-4 bg-white rounded-lg border border-dashed border-slate-300 text-slate-400 text-sm italic">
                                        Aucun enfant associé à ce compte parent.
                                    </div>
                                  )}
                              </div>
                          </div>
                      </div>
                  </div>
                );
             })
          )}
        </div>

        {totalPages > 1 && (
           <div className="mt-6 flex items-center justify-center gap-3">
             <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">Début</button>
             <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">Précédent</button>
             <div className="px-4 py-1 text-sm text-slate-600">Page {page} / {totalPages}</div>
             <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">Suivant</button>
             <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">Fin</button>
           </div>
        )}
      </main>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={currentParent ? "Modifier Parent" : "Nouveau Parent"}>
        <div className="space-y-4">
           {formErrors.global && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{formErrors.global}</div>}

           {!currentParent && (
             <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
               <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="Auto si vide" />
             </div>
           )}
           <div className="grid grid-cols-2 gap-4">
             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Prénom *</label>
               <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
             </div>
             <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nom *</label>
               <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                 value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
             </div>
           </div>
           <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
             <input type="email" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
               value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
           </div>
           <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Téléphone</label>
             <input className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
               value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
           </div>
           <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mot de passe {currentParent && "(Optionnel)"}</label>
             <input type="password" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
               value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
           </div>
           <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-4">
              <button onClick={() => setShowModal(false)} className="px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-sm">Annuler</button>
              <button onClick={handleSubmit} disabled={saving} className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 text-sm flex items-center gap-2">
                 {saving ? <FaSyncAlt className="animate-spin" /> : <FaCheck />} Enregistrer
              </button>
           </div>
        </div>
      </Modal>

      <style>{`
        .input { @apply px-3 py-2 rounded border border-slate-200; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.99); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
}