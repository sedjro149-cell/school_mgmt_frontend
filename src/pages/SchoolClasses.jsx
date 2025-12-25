import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaUsers,
  FaChalkboardTeacher,
  FaTimes,
  FaEye,
  FaLayerGroup,
  FaGraduationCap,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaInfoCircle,
  FaExclamationTriangle,
  FaIdBadge,
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";

export default function LevelsAndClasses() {
  /* --- UI State --- */
  const [tab, setTab] = useState("levels"); // 'levels' | 'classes'
  const [message, setMessage] = useState(null); // Pour les notifications (remplace alert)

  /* --- LEVELS State --- */
  const [levels, setLevels] = useState([]);
  const [levelsSearch, setLevelsSearch] = useState("");
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [levelEditTarget, setLevelEditTarget] = useState(null);
  const [levelName, setLevelName] = useState("");
  const [levelSaving, setLevelSaving] = useState(false);

  /* --- CLASSES State --- */
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classSearch, setClassSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  
  // Class Modal
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classEditTarget, setClassEditTarget] = useState(null);
  const [classNameInput, setClassNameInput] = useState("");
  const [classLevelInput, setClassLevelInput] = useState("");
  const [classSaving, setClassSaving] = useState(false);

  // View Details Modal
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Pagination
  const [classPage, setClassPage] = useState(1);
  const [classPageSize, setClassPageSize] = useState(10);

  /* --- Auto-dismiss Toast --- */
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  /* --- Fetchers --- */
  const fetchLevels = useCallback(async () => {
    setLevelsLoading(true);
    try {
      const data = await fetchData("/academics/levels/");
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      setLevels(arr);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Impossible de charger les niveaux." });
    } finally {
      setLevelsLoading(false);
    }
  }, []);

  const fetchClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const data = await fetchData("/academics/school-classes/");
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      setClasses(arr);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Impossible de charger les classes." });
    } finally {
      setClassesLoading(false);
    }
  }, []);

  useEffect(() => { fetchLevels(); }, [fetchLevels]);
  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  /* --- Computed Data --- */
  const filteredLevels = useMemo(() => {
    const q = levelsSearch.trim().toLowerCase();
    if (!q) return levels;
    return levels.filter((l) => (l.name || "").toLowerCase().includes(q));
  }, [levels, levelsSearch]);

  const visibleClasses = useMemo(() => {
    return classes
      .filter((c) => (levelFilter ? String(c.level?.id) === String(levelFilter) : true))
      .filter((c) => (classSearch ? (c.name || "").toLowerCase().includes(classSearch.toLowerCase()) : true));
  }, [classes, levelFilter, classSearch]);

  // Pagination Logic
  const classTotalPages = Math.max(1, Math.ceil(visibleClasses.length / classPageSize));
  
  const currentClassesPage = useMemo(() => {
    const start = (classPage - 1) * classPageSize;
    return visibleClasses.slice(start, start + classPageSize);
  }, [visibleClasses, classPage, classPageSize]);

  // Reset pagination on filter change
  useEffect(() => {
    if (classPage > classTotalPages) setClassPage(1);
  }, [classTotalPages, classPage, visibleClasses]);


  /* --- Handlers: Levels --- */
  const openLevelModal = (lvl = null) => {
    setLevelEditTarget(lvl);
    setLevelName(lvl ? lvl.name : "");
    setLevelModalOpen(true);
  };

  const submitLevel = async () => {
    if (!levelName.trim()) return setMessage({ type: "error", text: "Nom du niveau requis." });
    
    setLevelSaving(true);
    try {
      if (levelEditTarget) {
        await putData(`/academics/levels/${levelEditTarget.id}/`, { name: levelName.trim() });
        setMessage({ type: "success", text: "Niveau mis à jour." });
      } else {
        await postData("/academics/levels/", { name: levelName.trim() });
        setMessage({ type: "success", text: "Nouveau niveau créé." });
      }
      await fetchLevels();
      setLevelModalOpen(false);
    } catch (err) {
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement." });
    } finally {
      setLevelSaving(false);
    }
  };

  const deleteLevel = async (id) => {
    if (!window.confirm("Attention : Supprimer un niveau peut affecter les classes liées. Continuer ?")) return;
    try {
      await deleteData(`/academics/levels/${id}/`);
      setMessage({ type: "success", text: "Niveau supprimé." });
      fetchLevels();
    } catch (err) {
      setMessage({ type: "error", text: "Impossible de supprimer." });
    }
  };

  /* --- Handlers: Classes --- */
  const openClassModal = (cls = null) => {
    setClassEditTarget(cls);
    setClassNameInput(cls ? cls.name : "");
    // Default to first available level if creating new
    const defaultLevel = cls ? cls.level?.id : (levels.length > 0 ? levels[0].id : "");
    setClassLevelInput(defaultLevel);
    setClassModalOpen(true);
  };

  const submitClass = async () => {
    if (!classNameInput.trim() || !classLevelInput) return setMessage({ type: "error", text: "Nom et niveau requis." });
    
    setClassSaving(true);
    try {
      const payload = { name: classNameInput.trim(), level_id: classLevelInput };
      if (classEditTarget) {
        await putData(`/academics/school-classes/${classEditTarget.id}/`, payload);
        setMessage({ type: "success", text: "Classe mise à jour." });
      } else {
        await postData("/academics/school-classes/", payload);
        setMessage({ type: "success", text: "Nouvelle classe ajoutée." });
      }
      await fetchClasses();
      setClassModalOpen(false);
    } catch (err) {
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement." });
    } finally {
      setClassSaving(false);
    }
  };

  const deleteClass = async (id) => {
    if (!window.confirm("Supprimer définitivement cette classe ?")) return;
    try {
      await deleteData(`/academics/school-classes/${id}/`);
      setMessage({ type: "success", text: "Classe supprimée." });
      fetchClasses();
    } catch (err) {
      setMessage({ type: "error", text: "Erreur lors de la suppression." });
    }
  };

  /* --- View Details Handler --- */
  const openViewDetails = async (cls) => {
    setViewTarget(cls);
    setViewModalOpen(true);
    setLoadingDetails(true);
    setStudents([]);
    setTeachers([]);
    
    try {
      const [sData, tData] = await Promise.all([
        fetchData(`/core/admin/students/by-class/${cls.id}/`),
        fetchData(`/core/admin/teachers/by-class/${cls.id}/`)
      ]);
      setStudents(Array.isArray(sData) ? sData : []);
      setTeachers(Array.isArray(tData) ? tData : []);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erreur chargement détails." });
    } finally {
      setLoadingDetails(false);
    }
  };

  const renderPersonName = (p) => {
    if (!p) return "Inconnu";
    if (p.user && (p.user.first_name || p.user.last_name)) return `${p.user.first_name} ${p.user.last_name}`;
    if (p.first_name || p.last_name) return `${p.first_name} ${p.last_name}`;
    return p.username || "Utilisateur";
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      
      {/* --- Header --- */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm bg-opacity-90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Title */}
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <FaGraduationCap size={24} />
              </div>
              <div>
                 <h1 className="text-xl font-bold text-slate-900">Structure de l'école</h1>
                 <p className="text-xs text-slate-500">Gérez vos niveaux et vos classes</p>
              </div>
            </div>

            {/* Tabs & Action */}
            <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                    onClick={() => setTab("levels")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                        tab === "levels" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                    <FaLayerGroup /> Niveaux
                </button>
                <button
                    onClick={() => setTab("classes")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                        tab === "classes" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                >
                    <FaChalkboardTeacher /> Classes
                </button>
            </div>

            <button
                onClick={() => tab === "levels" ? openLevelModal() : openClassModal()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 font-medium text-sm"
            >
                <FaPlus /> {tab === "levels" ? "Nouveau Niveau" : "Nouvelle Classe"}
            </button>
          </div>
        </div>
      </div>

      {/* --- Toast Message --- */}
      {message && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 border animate-fadeIn cursor-pointer ${
            message.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-emerald-50 border-emerald-100 text-emerald-800'
        }`} onClick={() => setMessage(null)}>
            {message.type === 'error' ? <FaExclamationTriangle /> : <FaCheck />}
            <span className="font-medium text-sm">{message.text}</span>
        </div>
      )}

      {/* --- Main Content --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ================= LEVELS TAB ================= */}
        {tab === "levels" && (
          <div className="space-y-6 animate-fadeIn">
            {/* Filters */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <FaSearch className="text-slate-400" />
                <input 
                    placeholder="Rechercher un niveau..." 
                    className="flex-1 outline-none text-sm text-slate-700 placeholder-slate-400"
                    value={levelsSearch}
                    onChange={(e) => setLevelsSearch(e.target.value)}
                />
                <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">{filteredLevels.length}</span>
            </div>

            {/* Grid */}
            {levelsLoading ? (
                <div className="text-center py-10 text-slate-400">Chargement...</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {filteredLevels.map(lvl => (
                        <div key={lvl.id} className="group bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all border-l-4 border-l-indigo-500 relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Niveau</span>
                                <span className="text-[10px] text-slate-300">#{lvl.id}</span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4">{lvl.name}</h3>
                            
                            {/* Actions overlay on hover */}
                            <div className="absolute bottom-0 left-0 w-full bg-slate-50 border-t border-slate-100 p-2 flex gap-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                                <button onClick={() => openLevelModal(lvl)} className="flex-1 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 transition">
                                    Modifier
                                </button>
                                <button onClick={() => deleteLevel(lvl.id)} className="px-3 py-1.5 text-xs text-red-600 bg-red-50 rounded hover:bg-red-100 transition">
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    ))}
                    {filteredLevels.length === 0 && (
                        <div className="col-span-full text-center py-10 text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
                            Aucun niveau trouvé.
                        </div>
                    )}
                </div>
            )}
          </div>
        )}

        {/* ================= CLASSES TAB ================= */}
        {tab === "classes" && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Filters Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                <div className="flex-1 flex items-center gap-3 border-r border-slate-100 pr-4">
                    <FaSearch className="text-slate-400" />
                    <input 
                        placeholder="Rechercher une classe (ex: 6ème A)..." 
                        className="flex-1 outline-none text-sm text-slate-700 placeholder-slate-400"
                        value={classSearch}
                        onChange={(e) => { setClassSearch(e.target.value); setClassPage(1); }}
                    />
                </div>
                <div className="w-full md:w-64">
                    <select 
                        className="w-full text-sm border-none bg-slate-50 rounded-lg py-2 px-3 text-slate-600 focus:ring-0 cursor-pointer"
                        value={levelFilter}
                        onChange={(e) => { setLevelFilter(e.target.value); setClassPage(1); }}
                    >
                        <option value="">Tous les niveaux</option>
                        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                {classesLoading ? (
                    <div className="p-10 text-center text-slate-400">Chargement des classes...</div>
                ) : (
                    <>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-xs tracking-wider font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Classe</th>
                                    <th className="px-6 py-4">Niveau</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {currentClassesPage.length === 0 ? (
                                    <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-400">Aucune classe trouvée.</td></tr>
                                ) : (
                                    currentClassesPage.map((cls) => (
                                        <tr key={cls.id} className="hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-slate-700">{cls.name}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                                                    {cls.level?.name || "Non défini"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={() => openViewDetails(cls)} className="p-2 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100" title="Détails"><FaEye /></button>
                                                    <button onClick={() => openClassModal(cls)} className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200" title="Modifier"><FaEdit /></button>
                                                    <button onClick={() => deleteClass(cls.id)} className="p-2 rounded-full bg-red-50 text-red-600 hover:bg-red-100" title="Supprimer"><FaTrash /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Footer */}
                    <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                         <span className="text-xs text-slate-500">
                            Affichage de <strong>{(classPage - 1) * classPageSize + 1}</strong> à <strong>{Math.min(classPage * classPageSize, visibleClasses.length)}</strong> sur <strong>{visibleClasses.length}</strong>
                         </span>
                         <div className="flex items-center gap-2">
                            <button 
                                disabled={classPage <= 1}
                                onClick={() => setClassPage(p => p - 1)}
                                className="p-2 border rounded-md bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FaChevronLeft size={12} />
                            </button>
                            <span className="text-xs font-medium px-2">{classPage} / {classTotalPages}</span>
                            <button 
                                disabled={classPage >= classTotalPages}
                                onClick={() => setClassPage(p => p + 1)}
                                className="p-2 border rounded-md bg-white hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FaChevronRight size={12} />
                            </button>
                         </div>
                    </div>
                    </>
                )}
            </div>
          </div>
        )}

      </div>

      {/* ================= MODALS ================= */}
      
      {/* --- Generic Modal Wrapper --- */}
      {(levelModalOpen || classModalOpen || viewModalOpen) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
            
            {/* 1. Level Modal */}
            {levelModalOpen && (
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-slate-800">{levelEditTarget ? "Modifier le Niveau" : "Nouveau Niveau"}</h3>
                        <button onClick={() => setLevelModalOpen(false)} className="text-slate-400 hover:text-slate-600"><FaTimes /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nom du niveau</label>
                            <input 
                                type="text" 
                                value={levelName} 
                                onChange={e => setLevelName(e.target.value)} 
                                placeholder="ex: Terminale" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                        <button onClick={() => setLevelModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition">Annuler</button>
                        <button onClick={submitLevel} disabled={levelSaving} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition flex items-center gap-2">
                            {levelSaving && <FaLayerGroup className="animate-spin" />} Enregistrer
                        </button>
                    </div>
                </div>
            )}

            {/* 2. Class Modal */}
            {classModalOpen && (
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-lg text-slate-800">{classEditTarget ? "Modifier la Classe" : "Nouvelle Classe"}</h3>
                        <button onClick={() => setClassModalOpen(false)} className="text-slate-400 hover:text-slate-600"><FaTimes /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la classe</label>
                            <input 
                                type="text" 
                                value={classNameInput} 
                                onChange={e => setClassNameInput(e.target.value)} 
                                placeholder="ex: Tle D" 
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Niveau associé</label>
                            <select 
                                value={classLevelInput} 
                                onChange={e => setClassLevelInput(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                            >
                                <option value="" disabled>-- Choisir un niveau --</option>
                                {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                        <button onClick={() => setClassModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition">Annuler</button>
                        <button onClick={submitClass} disabled={classSaving} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-md transition flex items-center gap-2">
                            {classSaving && <FaLayerGroup className="animate-spin" />} Enregistrer
                        </button>
                    </div>
                </div>
            )}

            {/* 3. View Details Modal (Large) */}
            {viewModalOpen && viewTarget && (
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col h-[85vh]">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                        <div>
                            <h2 className="text-2xl font-bold text-slate-800">{viewTarget.name}</h2>
                            <span className="inline-flex items-center gap-1 text-sm text-indigo-600 font-medium bg-indigo-50 px-2 py-0.5 rounded mt-1">
                                <FaLayerGroup size={12} /> {viewTarget.level?.name}
                            </span>
                        </div>
                        <button onClick={() => setViewModalOpen(false)} className="p-2 bg-white rounded-full shadow-sm text-slate-400 hover:text-red-500 hover:bg-red-50 transition">
                            <FaTimes />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            
                            {/* Teachers Column */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <div className="bg-orange-100 text-orange-600 p-1.5 rounded"><FaChalkboardTeacher /></div>
                                    <h3 className="font-bold text-slate-700">Enseignants</h3>
                                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full ml-auto">{teachers.length}</span>
                                </div>
                                <div className="space-y-3">
                                    {loadingDetails ? <div className="text-slate-400 text-sm italic">Chargement...</div> : 
                                     teachers.length === 0 ? <div className="text-slate-400 text-sm italic bg-slate-50 p-4 rounded-lg border border-dashed">Aucun enseignant.</div> :
                                     teachers.map(t => (
                                        <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-orange-200 hover:bg-orange-50 transition-colors group bg-white shadow-sm">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                                                {renderPersonName(t).charAt(0)}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="font-semibold text-slate-800 text-sm truncate">{renderPersonName(t)}</p>
                                                <p className="text-xs text-slate-500 truncate">{t.subject?.name || "Matière inconnue"}</p>
                                            </div>
                                        </div>
                                     ))
                                    }
                                </div>
                            </div>

                            {/* Students Column */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                    <div className="bg-indigo-100 text-indigo-600 p-1.5 rounded"><FaUsers /></div>
                                    <h3 className="font-bold text-slate-700">Élèves inscrits</h3>
                                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full ml-auto">{students.length}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 content-start">
                                    {loadingDetails ? <div className="text-slate-400 text-sm italic col-span-full">Chargement...</div> : 
                                     students.length === 0 ? <div className="text-slate-400 text-sm italic bg-slate-50 p-4 rounded-lg border border-dashed col-span-full">Aucun élève.</div> :
                                     students.map(s => (
                                        <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50 transition-colors bg-white shadow-sm">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs">
                                                <FaUsers />
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="font-semibold text-slate-800 text-sm truncate">{renderPersonName(s)}</p>
                                                <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                                    <FaIdBadge /> {s.registration_number || "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                     ))
                                    }
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
}