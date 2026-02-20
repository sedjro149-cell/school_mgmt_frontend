import React, { useEffect, useState, useMemo } from "react";
import {
  FaSearch,
  FaPlus,
  FaEdit,
  FaTrash,
  FaSyncAlt,
  FaChalkboardTeacher,
  FaBookOpen,
  FaUsers,
  FaEnvelope,
  FaIdCard,
  FaTimes,
  FaCheck,
  FaChevronLeft,
  FaChevronRight
} from "react-icons/fa";
import { fetchData, postData, patchData, deleteData } from "./api";

/* --- COMPONENTS --- */

const Avatar = ({ firstName, lastName }) => {
  const initials = `${(firstName || "?")[0]}${(lastName || "?")[0]}`.toUpperCase();
  return (
    <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-md ring-2 ring-white">
      {initials}
    </div>
  );
};

const SubjectBadge = ({ subject }) => (
  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-100">
    <FaBookOpen size={11} />
    {subject || "Non assigné"}
  </span>
);

const ClassTag = ({ name }) => (
  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium border border-slate-200 mr-1">
    {name}
  </span>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden transform transition-all scale-100 max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"><FaTimes /></button>
        </div>
        <div className="p-6 custom-scrollbar overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

/* --- TEACHERS COMPONENT (updated: server-side search + pagination + list view) --- */

const Teachers = () => {
  /* --- STATE --- */
  const [teachers, setTeachers] = useState([]); // current page results
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // pagination & search
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [count, setCount] = useState(0);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  // UI
  const [showModal, setShowModal] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    username: "", email: "", firstName: "", lastName: "", password: "",
    subjectId: "", classIds: []
  });

  /* --- HELPERS --- */

  // Build teachers endpoint with params
  const teachersEndpoint = (p = 1, q = "", ps = pageSize) => {
    const base = `/core/admin/teachers/?page=${p}&page_size=${ps}`;
    return q ? `${base}&search=${encodeURIComponent(q)}` : base;
  };

  const fetchTeachers = async (p = page, q = debouncedQuery) => {
    setLoading(true);
    try {
      const res = await fetchData(teachersEndpoint(p, q));
      // DRF paginated response: {count, next, previous, results}
      if (res && typeof res === "object" && Array.isArray(res.results)) {
        setTeachers(res.results);
        setCount(res.count ?? 0);
        setNextUrl(res.next ?? null);
        setPrevUrl(res.previous ?? null);
      } else if (Array.isArray(res)) {
        // backward compatibility: some endpoints might return array — handle it
        setTeachers(res);
        setCount(res.length);
        setNextUrl(null);
        setPrevUrl(null);
      } else {
        setTeachers([]);
        setCount(0);
        setNextUrl(null);
        setPrevUrl(null);
      }
    } catch (err) {
      console.error("Erreur fetchTeachers:", err);
      alert("Erreur lors du chargement des enseignants.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjectsAndClasses = async () => {
    try {
      const [sData, cData] = await Promise.all([
        fetchData("/academics/subjects/"),
        fetchData("/academics/school-classes/")
      ]);
      setSubjects(Array.isArray(sData) ? sData : sData?.results || []);
      setClasses(Array.isArray(cData) ? cData : cData?.results || []);
    } catch (err) {
      console.error("Erreur fetch subjects/classes:", err);
      alert("Erreur chargement matières / classes");
    }
  };

  // load both once on mount
  useEffect(() => {
    fetchSubjectsAndClasses();
  }, []);

  // debounce query input (300ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPage(1); // on new search, reset to page 1
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // fetch teachers whenever page, pageSize or debouncedQuery change
  useEffect(() => {
    fetchTeachers(page, debouncedQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, debouncedQuery]);

  /* --- ACTIONS --- */

  const openModal = (t = null) => {
    setCurrentTeacher(t);
    setFormData({
      username: t?.user?.username || "",
      email: t?.user?.email || "",
      firstName: t?.user?.first_name || "",
      lastName: t?.user?.last_name || "",
      password: "",
      subjectId: t?.subject?.id || "",
      classIds: (t?.classes || []).map(c => c.id)
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName) return alert("Champs requis manquants.");

    const payload = {
      user: { email: formData.email, first_name: formData.firstName, last_name: formData.lastName },
      subject_id: formData.subjectId ? Number(formData.subjectId) : null,
      class_ids: formData.classIds
    };

    if (!currentTeacher) {
      if (!formData.username || !formData.password) return alert("Username et mot de passe requis.");
      payload.user.username = formData.username;
      payload.user.password = formData.password;
    } else if (formData.password) {
      payload.user.password = formData.password;
    }

    setSaving(true);
    try {
      if (currentTeacher) {
        await patchData(`/core/admin/teachers/${currentTeacher.id}/`, payload);
      } else {
        await postData("/core/admin/teachers/", payload);
      }
      // refresh teachers current page
      await fetchTeachers(page, debouncedQuery);
      // refresh subjects/classes just in case
      await fetchSubjectsAndClasses();
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Erreur enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet enseignant ?")) return;
    try {
      await deleteData(`/core/admin/teachers/${id}/`);
      // after delete, if current page becomes empty and previous page exists, go back
      const isLastItemOnPage = teachers.length === 1 && page > 1;
      const newPage = isLastItemOnPage ? page - 1 : page;
      setPage(newPage);
      await fetchTeachers(newPage, debouncedQuery);
    } catch (err) {
      console.error(err);
      alert("Erreur suppression.");
    }
  };

  const handleRefresh = async () => {
    setQuery("");
    setPage(1);
    await fetchSubjectsAndClasses();
    await fetchTeachers(1, "");
  };

  /* --- RENDER HELPERS --- */

  const totalPages = useMemo(() => (pageSize > 0 ? Math.ceil(count / pageSize) : 1), [count, pageSize]);

  const pageInfoText = `${Math.min((page - 1) * pageSize + 1, count || 0)} - ${Math.min(page * pageSize, count || 0)} sur ${count}`;

  /* --- RENDER --- */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm bg-opacity-90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                  <FaChalkboardTeacher size={20} />
               </div>
               <div>
                 <h1 className="text-xl font-bold text-slate-900 leading-tight">Corps Enseignant</h1>
                 <p className="text-xs text-slate-500">Gestion des professeurs et attributions</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleRefresh} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition">
                <FaSyncAlt className={loading ? "animate-spin" : ""} />
              </button>
              <button onClick={() => openModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-md shadow-emerald-200 flex items-center gap-2 text-sm font-medium transition-transform active:scale-95">
                <FaPlus /> Ajouter
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 max-w-2xl">
            <div className="relative group">
              <FaSearch className="absolute left-3 top-3 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher (Nom, Matière, Email)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-transparent focus:bg-white border focus:border-emerald-300 rounded-xl text-sm focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* PAGINATION CONTROLS (top) */}
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
            <div className="px-3 text-sm font-medium">Page {page} / {Math.max(1, totalPages)}</div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">
              <FaChevronRight />
            </button>
          </div>
        </div>

        {loading ? (
           <div className="space-y-3 animate-pulse">
             {[...Array(6)].map((_, i) => (
               <div key={i} className="h-16 bg-gray-200 rounded-xl"></div>
             ))}
           </div>
        ) : teachers.length === 0 ? (
           <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300">
             <div className="bg-slate-50 p-4 rounded-full inline-block mb-4"><FaChalkboardTeacher className="text-4xl text-slate-300" /></div>
             <h3 className="text-lg font-bold text-slate-700">Aucun enseignant trouvé</h3>
           </div>
        ) : (
           <div className="space-y-3">
             {teachers.map(t => {
               const name = `${t.user?.first_name || ""} ${t.user?.last_name || ""}`.trim() || "Utilisateur";
               return (
                 <div key={t.id} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-200 hover:shadow-lg transition-all flex items-center gap-4">
                   <Avatar firstName={t.user?.first_name} lastName={t.user?.last_name} />

                   <div className="flex-1 min-w-0">
                     <div className="flex items-start justify-between gap-4">
                       <div className="min-w-0">
                         <div className="flex items-center gap-3">
                           <h3 className="font-bold text-slate-800 truncate" title={name}>{name}</h3>
                           <div className="ml-2">{t.subject ? <SubjectBadge subject={t.subject.name} /> : null}</div>
                         </div>
                         <div className="text-xs text-slate-500 mt-1 truncate">
                           <span title={t.user?.email}><FaEnvelope className="inline mr-1 text-[10px]" /> {t.user?.email || "—"}</span>
                           <span className="mx-2">•</span>
                           <span title={t.user?.username}><FaIdCard className="inline mr-1 text-[10px]" /> {t.user?.username}</span>
                         </div>
                       </div>

                       {/* Actions */}
                       <div className="flex items-center gap-2">
                         <button onClick={() => openModal(t)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition"><FaEdit /></button>
                         <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition"><FaTrash /></button>
                       </div>
                     </div>

                     {/* Classes */}
                     <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                       <FaUsers className="text-[12px]" />
                       <div className="flex flex-wrap">
                         {(t.classes || []).length > 0 ? (
                           t.classes.map(c => <ClassTag key={c.id} name={c.name} />)
                         ) : (
                           <span className="text-xs text-slate-400 italic">Aucune classe</span>
                         )}
                       </div>
                     </div>
                   </div>
                 </div>
               );
             })}
           </div>
        )}

        {/* PAGINATION CONTROLS (bottom) */}
        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="text-sm text-slate-600">{pageInfoText}</div>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(1)} disabled={page === 1} className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">Début</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">
              <FaChevronLeft />
            </button>
            <div className="px-3 text-sm font-medium">Page {page} / {Math.max(1, totalPages)}</div>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">
              <FaChevronRight />
            </button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="px-3 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50">Fin</button>
          </div>
        </div>
      </main>

      {/* MODAL FORM */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={currentTeacher ? "Modifier Enseignant" : "Nouvel Enseignant"}>
         <div className="space-y-5">
            {!currentTeacher && (
               <div>
                 <label className="label">Nom d'utilisateur</label>
                 <input className="input" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="Auto si vide" />
               </div>
            )}

            <div className="grid grid-cols-2 gap-4">
               <div><label className="label">Prénom *</label><input className="input" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} /></div>
               <div><label className="label">Nom *</label><input className="input" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} /></div>
            </div>

            <div><label className="label">Email *</label><input type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>

            <div className="grid grid-cols-1 gap-4">
               <div>
                  <label className="label">Matière enseignée</label>
                  <select className="input" value={formData.subjectId} onChange={e => setFormData({...formData, subjectId: e.target.value})}>
                     <option value="">-- Aucune --</option>
                     {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </div>
               <div>
                  <label className="label">Classes attribuées</label>
                  <select multiple className="input h-32 custom-scrollbar" value={formData.classIds} onChange={e => setFormData({...formData, classIds: Array.from(e.target.selectedOptions, o => Number(o.value))})}>
                     {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs classes.</p>
               </div>
            </div>

            <div><label className="label">Mot de passe {currentTeacher && "(Optionnel)"}</label><input type="password" className="input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>

            <div className="pt-6 flex justify-end gap-3 border-t border-slate-100 mt-4">
               <button onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
               <button onClick={handleSubmit} disabled={saving} className="btn-primary">{saving ? <FaSyncAlt className="animate-spin" /> : <FaCheck />} Enregistrer</button>
            </div>
         </div>
      </Modal>

      <style>{`
        .label { @apply block text-xs font-bold text-slate-500 uppercase mb-1.5; }
        .input { @apply w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white outline-none transition-all; }
        .btn-primary { @apply bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition text-sm flex items-center gap-2 active:scale-95; }
        .btn-secondary { @apply px-5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition text-sm border border-transparent hover:border-slate-200; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.99); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default Teachers;