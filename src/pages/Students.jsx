import React, { useEffect, useMemo, useState } from "react";
import { 
  FaSearch, 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaSyncAlt, 
  FaUserGraduate, 
  FaFilter, 
  FaChevronLeft, 
  FaChevronRight,
  FaTimes
} from "react-icons/fa";
import { fetchData, postData, patchData, deleteData } from "./api";

/* --- COMPONENTS --- */

const Avatar = ({ firstName, lastName }) => {
  const initials = `${(firstName || "?")[0]}${(lastName || "?")[0]}`.toUpperCase();
  return (
    <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm">
      {initials}
    </div>
  );
};

const Badge = ({ children, color = "gray" }) => {
  const styles = {
    gray: "bg-gray-100 text-gray-600",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-md text-xs font-medium border ${styles[color] || styles.gray}`}>
      {children}
    </span>
  );
};

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

const Students = () => {
  /* --- STATE --- */
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // UI
  const [showModal, setShowModal] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [filterClassId, setFilterClassId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form
  const [formData, setFormData] = useState({
    username: "", email: "", firstName: "", lastName: "", 
    dateOfBirth: "", schoolClass: "", parentId: "", password: ""
  });

  /* --- FETCHERS --- */
  const fetchAll = async (byClassId = null) => {
    setLoading(true);
    try {
      const url = byClassId ? `/core/admin/students/by-class/${byClassId}/` : `/core/admin/students/`;
      const [sData, cData, pData] = await Promise.all([
        fetchData(url),
        fetchData("/academics/school-classes/"),
        fetchData("/core/admin/parents/"),
      ]);
      setStudents(Array.isArray(sData) ? sData : sData?.results || []);
      setClasses(Array.isArray(cData) ? cData : cData?.results || []);
      setParents(Array.isArray(pData) ? pData : pData?.results || []);
    } catch (err) {
      console.error(err);
      alert("Erreur chargement données");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  /* --- LOGIC --- */
  const applyClassFilter = () => fetchAll(filterClassId || null);

  // Filtrage Client-side
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = students || [];
    if (q) {
      list = list.filter(s => {
        const text = [
          s.user?.username, s.user?.email, s.user?.first_name, s.firstname,
          s.user?.last_name, s.lastname, s.school_class?.name, 
          s.parent?.user?.username
        ].join(" ").toLowerCase();
        return text.includes(q);
      });
    }
    return list;
  }, [students, searchQuery]);

  // Pagination
  useEffect(() => setCurrentPage(1), [searchQuery, filterClassId, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const currentPageStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  /* --- ACTIONS --- */
  const openModal = (student = null) => {
    setCurrentStudent(student);
    setFormData({
      username: student?.user?.username ?? "",
      email: student?.user?.email ?? "",
      firstName: student?.user?.first_name ?? student?.firstname ?? "",
      lastName: student?.user?.last_name ?? student?.lastname ?? "",
      dateOfBirth: student?.date_of_birth ?? "",
      schoolClass: student?.school_class?.id ?? "",
      parentId: student?.parent?.id ?? "",
      password: ""
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName) return alert("Champs requis manquants.");
    setSaving(true);
    try {
      const userPayload = { email: formData.email, first_name: formData.firstName, last_name: formData.lastName };
      if (formData.password) userPayload.password = formData.password;
      
      const payload = {
        user: { ...userPayload, ...(currentStudent ? {} : { username: formData.username }) },
        date_of_birth: formData.dateOfBirth,
        school_class_id: formData.schoolClass || null,
        parent_id: formData.parentId || null,
      };

      if (currentStudent) {
        await patchData(`/core/admin/students/${currentStudent.id}/`, { ...payload, user: userPayload });
      } else {
        await postData("/core/admin/students/", payload);
      }
      await fetchAll(filterClassId);
      setShowModal(false);
    } catch (err) {
      console.error(err);
      alert("Erreur enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet étudiant ?")) return;
    try {
      await deleteData(`/core/admin/students/${id}/`);
      await fetchAll(filterClassId);
    } catch (err) { alert("Erreur suppression."); }
  };

  /* --- RENDER --- */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm bg-opacity-90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                  <FaUserGraduate size={20} />
               </div>
               <div>
                 <h1 className="text-xl font-bold text-slate-900 leading-tight">Étudiants</h1>
                 <p className="text-xs text-slate-500">Gestion académique des élèves</p>
               </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => { setFilterClassId(""); setSearchQuery(""); fetchAll(); }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition"><FaSyncAlt className={loading ? "animate-spin" : ""} /></button>
              <button onClick={() => openModal()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-md shadow-indigo-200 flex items-center gap-2 text-sm font-medium transition-transform active:scale-95"><FaPlus /> Ajouter</button>
            </div>
          </div>

          {/* TOOLBAR */}
          <div className="mt-5 flex flex-col md:flex-row gap-3">
             {/* Search */}
             <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-3 text-slate-400" />
                <input 
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher (Nom, Email, Classe...)"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-300 rounded-xl text-sm outline-none transition-all"
                />
             </div>
             
             {/* Filters */}
             <div className="flex gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                   <select 
                     value={filterClassId} onChange={e => setFilterClassId(e.target.value)}
                     className="w-full pl-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none appearance-none"
                   >
                      <option value="">Toutes les classes</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                   <FaFilter className="absolute right-3 top-3 text-slate-400 text-xs pointer-events-none" />
                </div>
                <button onClick={applyClassFilter} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-medium text-sm rounded-xl hover:bg-slate-50 transition">Filtrer</button>
             </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* TABLE CARD */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           {loading ? (
              <div className="p-12 text-center">
                 <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-100 border-t-indigo-600 mb-3"></div>
                 <p className="text-slate-400 text-sm">Chargement des données...</p>
              </div>
           ) : (
              <>
              <div className="overflow-x-auto">
                 <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold tracking-wider border-b border-slate-100">
                       <tr>
                          <th className="px-6 py-4">Étudiant</th>
                          <th className="px-6 py-4">Contact</th>
                          <th className="px-6 py-4">Classe</th>
                          <th className="px-6 py-4">Parent</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                       {currentPageStudents.map(student => {
                          const firstName = student.user?.first_name || student.firstname || "—";
                          const lastName = student.user?.last_name || student.lastname || "—";
                          
                          return (
                             <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                                <td className="px-6 py-3">
                                   <div className="flex items-center gap-3">
                                      <Avatar firstName={firstName} lastName={lastName} />
                                      <div>
                                         <div className="font-bold text-slate-700">{firstName} {lastName}</div>
                                         <div className="text-xs text-slate-400 font-mono">ID: {student.id} • {student.date_of_birth || "Né(e) : N/A"}</div>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-3">
                                   <div className="text-slate-600">{student.user?.email || "—"}</div>
                                   <div className="text-xs text-slate-400">{student.user?.username}</div>
                                </td>
                                <td className="px-6 py-3">
                                   <Badge color={student.school_class ? "indigo" : "gray"}>
                                      {student.school_class?.name || "Non assigné"}
                                   </Badge>
                                </td>
                                <td className="px-6 py-3 text-slate-600 text-xs">
                                   {student.parent ? (
                                      <span className="flex items-center gap-1"><FaUserGraduate className="opacity-50"/> {student.parent.user?.username || `Parent #${student.parent.id}`}</span>
                                   ) : <span className="text-slate-400 italic">Aucun</span>}
                                </td>
                                <td className="px-6 py-3 text-right">
                                   <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => openModal(student)} className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 rounded-lg shadow-sm transition"><FaEdit /></button>
                                      <button onClick={() => handleDelete(student.id)} className="p-1.5 bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 rounded-lg shadow-sm transition"><FaTrash /></button>
                                   </div>
                                </td>
                             </tr>
                          );
                       })}
                       {filteredStudents.length === 0 && (
                          <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400 italic">Aucun étudiant trouvé pour ces critères.</td></tr>
                       )}
                    </tbody>
                 </table>
              </div>

              {/* PAGINATION FOOTER */}
              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
                 <span className="text-xs text-slate-500 font-medium">
                    Affichage {filteredStudents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0} - {Math.min(currentPage * pageSize, filteredStudents.length)} sur {filteredStudents.length}
                 </span>
                 <div className="flex items-center gap-2">
                    <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm">
                       <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1.5 px-3 rounded-md text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition"><FaChevronLeft size={10} /></button>
                       <span className="px-3 py-1.5 text-xs font-bold text-slate-700 border-x border-slate-100 flex items-center">{currentPage} / {totalPages}</span>
                       <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1.5 px-3 rounded-md text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-transparent transition"><FaChevronRight size={10} /></button>
                    </div>
                    <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="bg-white border border-slate-200 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-indigo-300">
                       <option value={10}>10 / page</option>
                       <option value={20}>20 / page</option>
                       <option value={50}>50 / page</option>
                    </select>
                 </div>
              </div>
              </>
           )}
        </div>
      </main>

      {/* MODAL FORM */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={currentStudent ? "Modifier l'Étudiant" : "Nouvel Étudiant"}>
         <div className="space-y-5">
            {/* Fields */}
            <div className="grid grid-cols-2 gap-4">
               <div><label className="label">Prénom</label><input className="input" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} /></div>
               <div><label className="label">Nom</label><input className="input" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} /></div>
            </div>
            <div><label className="label">Email</label><input type="email" className="input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
            {!currentStudent && (
               <div><label className="label">Nom d'utilisateur</label><input className="input" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
            )}
            <div className="grid grid-cols-2 gap-4">
               <div><label className="label">Date Naissance</label><input type="date" className="input" value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} /></div>
               <div>
                  <label className="label">Classe</label>
                  <select className="input" value={formData.schoolClass} onChange={e => setFormData({...formData, schoolClass: e.target.value})}>
                     <option value="">-- Choisir --</option>
                     {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
            </div>
            <div>
               <label className="label">Parent (Optionnel)</label>
               <select className="input" value={formData.parentId} onChange={e => setFormData({...formData, parentId: e.target.value})}>
                  <option value="">-- Aucun --</option>
                  {parents.map(p => <option key={p.id} value={p.id}>{p.user?.username || `Parent #${p.id}`}</option>)}
               </select>
            </div>
            <div><label className="label">Mot de passe {currentStudent && "(Optionnel)"}</label><input type="password" className="input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-4">
               <button onClick={() => setShowModal(false)} className="btn-secondary">Annuler</button>
               <button onClick={handleSubmit} disabled={saving} className="btn-primary">{saving ? "..." : "Enregistrer"}</button>
            </div>
         </div>
      </Modal>

      <style>{`
        .label { @apply block text-xs font-bold text-slate-500 uppercase mb-1.5; }
        .input { @apply w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all; }
        .btn-primary { @apply bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:bg-indigo-700 transition active:scale-95; }
        .btn-secondary { @apply bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition active:scale-95; }
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

export default Students;