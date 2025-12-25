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
  FaChevronUp,
  FaTimes,
  FaCheck,
  FaGraduationCap,
  FaIdBadge
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

/* --- COMPONENTS --- */
const Avatar = ({ name }) => {
  const initials = (name || "?").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
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

export default function Parents() {
  /* --- STATE --- */
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // UI
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null); // Pour l'accordéon
  const [showModal, setShowModal] = useState(false);
  const [currentParent, setCurrentParent] = useState(null);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  // Form
  const [formData, setFormData] = useState({ username: "", email: "", firstName: "", lastName: "", phone: "", password: "" });
  const [formErrors, setFormErrors] = useState({});

  /* --- FETCH --- */
  const fetchParents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchData("/core/admin/parents/");
      setParents(Array.isArray(data) ? data : data?.results ?? []);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchParents(); }, [fetchParents]);

  /* --- LOGIC --- */
  const toggleExpand = (id) => setExpandedId(expandedId === id ? null : id);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return parents;
    return parents.filter(p => {
      const name = getFullName(p).toLowerCase();
      const meta = [p?.user?.email, p?.phone, p?.user?.username].join(" ").toLowerCase();
      return name.includes(q) || meta.includes(q);
    });
  }, [parents, query]);

  const pageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  /* --- ACTIONS --- */
  const openModal = (p = null) => {
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
  };

  const handleSubmit = async () => {
    setFormErrors({});
    if (!formData.firstName || !formData.lastName) return setFormErrors({ global: "Nom et Prénom requis" });

    setSaving(true);
    try {
      const userPayload = { email: formData.email, first_name: formData.firstName, last_name: formData.lastName };
      if (formData.password) userPayload.password = formData.password;
      
      const payload = { 
         user: { ...userPayload, username: formData.username || `${formData.firstName}.${formData.lastName}`.toLowerCase() }, 
         phone: formData.phone || null 
      };

      if (currentParent) {
        await patchData(`/core/admin/parents/${currentParent.id}/`, { user: userPayload, phone: formData.phone });
      } else {
        await postData("/core/admin/parents/", payload);
      }
      await fetchParents();
      setShowModal(false);
    } catch (err) { alert("Erreur lors de l'enregistrement."); } 
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Supprimer ce parent ?")) {
      try { await deleteData(`/core/admin/parents/${id}/`); fetchParents(); } catch (e) { alert("Erreur"); }
    }
  };

  /* --- RENDER --- */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      
      {/* HEADER STICKY */}
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
              <button onClick={() => { setQuery(""); fetchParents(); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition"><FaSyncAlt className={loading ? "animate-spin" : ""} /></button>
              <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md shadow-indigo-200 flex items-center gap-2 text-sm font-medium transition-transform active:scale-95"><FaPlus /> Nouveau</button>
            </div>
          </div>
          
          <div className="mt-4 max-w-3xl relative">
              <FaSearch className="absolute left-3 top-3 text-slate-400" />
              <input 
                value={query} 
                onChange={e => { setQuery(e.target.value); setPage(1); }}
                placeholder="Rechercher (Nom, Email, Téléphone)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-300 rounded-xl text-sm outline-none transition-all"
              />
          </div>
        </div>
      </header>

      {/* LIST CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Table Headers (Visual Only) */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-4">Parent</div>
            <div className="col-span-3">Contact</div>
            <div className="col-span-2 text-center">Enfants</div>
            <div className="col-span-3 text-right">Actions</div>
        </div>

        <div className="space-y-3">
          {loading ? (
             [...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)
          ) : filtered.length === 0 ? (
             <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-500">Aucun parent trouvé.</div>
          ) : (
             pageData.map(parent => {
                const fullName = getFullName(parent);
                const children = parent.students || parent.children || [];
                const isExpanded = expandedId === parent.id;

                return (
                  <div key={parent.id} className={`bg-white border rounded-xl transition-all duration-300 overflow-hidden ${isExpanded ? 'border-indigo-300 shadow-lg ring-1 ring-indigo-100' : 'border-slate-200 shadow-sm hover:border-indigo-200'}`}>
                      
                      {/* MAIN ROW (Always visible) */}
                      <div 
                        className="p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-center cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleExpand(parent.id)}
                      >
                          {/* Col 1: Identity */}
                          <div className="md:col-span-4 flex items-center gap-3">
                              <div className="transition-transform duration-300">
                                  <Avatar name={fullName} />
                              </div>
                              <div className="min-w-0">
                                  <h3 className="font-bold text-slate-800 truncate text-sm">{fullName}</h3>
                                  <p className="text-xs text-slate-400 font-mono truncate">ID: {parent.id} • {parent.user?.username}</p>
                              </div>
                          </div>

                          {/* Col 2: Contact */}
                          <div className="md:col-span-3 flex flex-col gap-1">
                              <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <FaPhone className="text-slate-400" /> <span>{parent.phone || "—"}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-600 truncate">
                                  <FaEnvelope className="text-slate-400" /> <span className="truncate" title={parent.user?.email}>{parent.user?.email || "—"}</span>
                              </div>
                          </div>

                          {/* Col 3: Children Count Badge */}
                          <div className="md:col-span-2 flex justify-center">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${children.length > 0 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                  <FaGraduationCap /> {children.length}
                              </span>
                          </div>

                          {/* Col 4: Actions & Chevron */}
                          <div className="md:col-span-3 flex items-center justify-end gap-3">
                              <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                                  <button onClick={() => openModal(parent)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><FaEdit /></button>
                                  <button onClick={() => handleDelete(parent.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><FaTrash /></button>
                              </div>
                              <div className={`w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-indigo-50 text-indigo-600' : ''}`}>
                                  <FaChevronDown size={12} />
                              </div>
                          </div>
                      </div>

                      {/* EXPANDED SECTION (Children Details) */}
                      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
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

        {/* PAGINATION */}
        {totalPages > 1 && (
           <div className="flex justify-center mt-10 gap-2">
             <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50">Précédent</button>
             <span className="px-4 py-2 text-sm text-slate-500 font-medium self-center">Page {page} / {totalPages}</span>
             <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50">Suivant</button>
           </div>
        )}
      </main>

      {/* MODAL FORM */}
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