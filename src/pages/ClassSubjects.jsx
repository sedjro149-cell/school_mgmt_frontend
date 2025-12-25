import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaCheck,
  FaSyncAlt,
  FaChevronDown,
  FaChevronUp,
  FaLayerGroup,
  FaClock,
  FaPercentage,
  FaInfoCircle,
  FaEraser,
  FaSave,
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";

/* --- Design System Helpers --- */
const getColorStyle = (id) => {
  const styles = [
    { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", ring: "focus:ring-red-500", accent: "border-l-red-500" },
    { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", ring: "focus:ring-orange-500", accent: "border-l-orange-500" },
    { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", ring: "focus:ring-amber-500", accent: "border-l-amber-500" },
    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", ring: "focus:ring-emerald-500", accent: "border-l-emerald-500" },
    { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200", ring: "focus:ring-teal-500", accent: "border-l-teal-500" },
    { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200", ring: "focus:ring-cyan-500", accent: "border-l-cyan-500" },
    { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", ring: "focus:ring-blue-500", accent: "border-l-blue-500" },
    { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", ring: "focus:ring-indigo-500", accent: "border-l-indigo-500" },
    { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200", ring: "focus:ring-violet-500", accent: "border-l-violet-500" },
    { bg: "bg-fuchsia-50", text: "text-fuchsia-700", border: "border-fuchsia-200", ring: "focus:ring-fuchsia-500", accent: "border-l-fuchsia-500" },
    { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200", ring: "focus:ring-rose-500", accent: "border-l-rose-500" },
  ];
  if (id === undefined || id === null) return styles[0];
  return styles[id % styles.length];
};

export default function SubjectsAndClassSubjects() {
  /* --- State --- */
  const [subjects, setSubjects] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [currentSubject, setCurrentSubject] = useState({ name: "" });
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsSaving, setSubjectsSaving] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);

  const [classSubjects, setClassSubjects] = useState([]);
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [csLoading, setCsLoading] = useState(false);

  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  const [selectedClass, setSelectedClass] = useState("");
  const [formData, setFormData] = useState({});
  const [savingAssignments, setSavingAssignments] = useState(false);

  const refreshRef = useRef(null);

  /* --- Fetchers --- */
  const fetchSubjects = useCallback(async () => {
    setSubjectsLoading(true);
    try {
      const data = await fetchData("/academics/subjects/");
      setSubjects(data || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Impossible de charger les matières." });
    } finally {
      setSubjectsLoading(false);
    }
  }, []);

  const fetchClassSubjects = useCallback(async () => {
    setCsLoading(true);
    try {
      const data = await fetchData("/academics/class-subjects/");
      setClassSubjects(data || []);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Impossible de charger les attributions." });
    } finally {
      setCsLoading(false);
    }
  }, []);

  const fetchSchoolClasses = useCallback(async () => {
    try {
      const data = await fetchData("/academics/school-classes/");
      setSchoolClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setMessage(null);
    await Promise.all([fetchSubjects(), fetchClassSubjects(), fetchSchoolClasses()]);
  }, [fetchSubjects, fetchClassSubjects, fetchSchoolClasses]);

  useEffect(() => {
    fetchAll();
    refreshRef.current = fetchAll;
  }, [fetchAll]);

  // Auto-dismiss message
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  /* --- Logic: Subjects --- */
  const submitSubject = async () => {
    if (!currentSubject.name || !currentSubject.name.trim()) {
      setMessage({ type: "error", text: "Le nom de la matière est requis." });
      return;
    }
    setSubjectsSaving(true);
    try {
      if (currentSubject.id) {
        await putData(`/academics/subjects/${currentSubject.id}/`, { name: currentSubject.name });
        setMessage({ type: "success", text: "Matière mise à jour avec succès." });
      } else {
        await postData("/academics/subjects/", { name: currentSubject.name });
        setMessage({ type: "success", text: "Nouvelle matière ajoutée." });
      }
      setCurrentSubject({ name: "" });
      await fetchSubjects();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement." });
    } finally {
      setSubjectsSaving(false);
    }
  };

  const deleteSubjectHandler = async (id) => {
    if (!window.confirm("Attention: Supprimer cette matière supprimera aussi toutes les attributions liées. Continuer ?")) return;
    try {
      await deleteData(`/academics/subjects/${id}/`);
      setMessage({ type: "success", text: "Matière supprimée." });
      await fetchSubjects();
      await fetchClassSubjects();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Impossible de supprimer la matière." });
    }
  };

  /* --- Logic: Assignments Editor --- */
  useEffect(() => {
    if (!selectedClass) {
      setFormData({});
      return;
    }
    const existing = classSubjects.filter(
      (cs) => cs.school_class && String(cs.school_class.id) === String(selectedClass)
    );
    const map = {};
    subjects.forEach((s) => {
      const found = existing.find((cs) => cs.subject && cs.subject.id === s.id);
      map[s.id] = {
        subject_id: s.id,
        subject_name: s.name,
        coefficient: found ? found.coefficient : 1,
        hours_per_week: found ? found.hours_per_week : (s.hours_per_week || 1),
        is_optional: found ? Boolean(found.is_optional) : false,
        id: found ? found.id : null,
        changed: false,
        // Helper to know if it's active (has an ID) for UI styling
        isActive: !!found, 
      };
    });
    setFormData(map);
  }, [selectedClass, subjects, classSubjects]);

  const setField = (subjectId, field, value) => {
    setFormData((prev) => {
      const next = { ...(prev || {}) };
      const current = next[subjectId] || { subject_id: subjectId };
      next[subjectId] = { ...current, [field]: value, changed: true };
      return next;
    });
  };

  const handleBulkSave = async (e) => {
    e && e.preventDefault();
    if (!selectedClass) {
      setMessage({ type: "error", text: "Veuillez sélectionner une classe." });
      return;
    }
    setSavingAssignments(true);
    setMessage(null);

    const toCreate = [];
    const toUpdate = [];

    Object.values(formData).forEach((d) => {
      const payload = {
        school_class_id: parseInt(selectedClass, 10),
        subject_id: parseInt(d.subject_id, 10),
        coefficient: Number(d.coefficient) || 1,
        hours_per_week: Number(d.hours_per_week) || 1,
        is_optional: Boolean(d.is_optional),
      };
      if (d.id) {
        if (d.changed) toUpdate.push({ id: d.id, payload });
      } else {
        // Only create if user changed defaults or explicitly wants to add it? 
        // For this logic, we'll assume if they touched it OR if we want to enforce defaults. 
        // Actually, usually a checkbox "Assigned" is better, but based on your logic:
        // We create it if it's not standard? Let's assume we want to create it if it doesn't exist
        // but the user hit save. However, bulk saving usually implies saving ALL active states.
        // Let's stick to your original logic: create if params differ from default?
        // Better UX: Let's assume we save it if the user clicked "Save".
        // But to avoid spamming DB with defaults, let's check if it's meaningful.
        // For now, preserving original logic:
         if (payload.coefficient !== 1 || payload.hours_per_week !== 1 || payload.is_optional) {
             toCreate.push(payload);
         }
      }
    });

    try {
      const promises = [];
      toUpdate.forEach((u) => promises.push(putData(`/academics/class-subjects/${u.id}/`, u.payload)));
      toCreate.forEach((c) => promises.push(postData("/academics/class-subjects/", c)));

      if (promises.length === 0) {
        setMessage({ type: "info", text: "Aucune modification détectée." });
        setSavingAssignments(false);
        return;
      }

      await Promise.all(promises);
      setMessage({ type: "success", text: "Attributions enregistrées avec succès." });
      await fetchClassSubjects();
      // We keep selectedClass to let user see result
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erreur technique lors de l'enregistrement." });
    } finally {
      setSavingAssignments(false);
    }
  };

  const deleteClassSubjectHandler = async (id) => {
    if (!window.confirm("Supprimer cette attribution ?")) return;
    try {
      await deleteData(`/academics/class-subjects/${id}/`);
      setMessage({ type: "success", text: "Attribution retirée." });
      await fetchClassSubjects();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Impossible de supprimer." });
    }
  };

  /* --- Filtering --- */
  const filteredSubjects = useMemo(() => {
    const term = (subjectSearch || "").trim().toLowerCase();
    return subjects.filter((s) => (s.name || "").toLowerCase().includes(term));
  }, [subjects, subjectSearch]);

  const filteredClassSubjects = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();
    return classSubjects.filter((cs) => {
      if (!cs || !cs.school_class || !cs.subject) return false;
      if (filterClass && String(filterClass) !== String(cs.school_class.id)) return false;
      if (filterSubject && String(filterSubject) !== String(cs.subject.id)) return false;
      if (!term) return true;
      return (
        (cs.school_class.name || "").toLowerCase().includes(term) ||
        (cs.subject.name || "").toLowerCase().includes(term)
      );
    });
  }, [classSubjects, searchTerm, filterClass, filterSubject]);

  /* --- UI Render --- */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-20">
      {/* Top Navigation / Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-opacity-90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                  <FaLayerGroup size={20} />
               </div>
               <div>
                 <h1 className="text-xl font-bold text-slate-900 leading-tight">Configuration Académique</h1>
                 <p className="text-xs text-slate-500">Gérez les matières et leurs coefficients par classe</p>
               </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={fetchAll} 
                className="inline-flex items-center px-3 py-2 border border-slate-200 shadow-sm text-sm font-medium rounded-md text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
              >
                <FaSyncAlt className={`mr-2 ${subjectsLoading || csLoading ? 'animate-spin' : ''}`} /> 
                Actualiser
              </button>
              <button 
                onClick={() => { setCurrentSubject({ name: "" }); setSubjectsOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} 
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
              >
                <FaPlus className="mr-2" /> Nouvelle Matière
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Toast Message */}
        {message && (
            <div className={`fixed bottom-5 right-5 z-50 px-6 py-4 rounded-lg shadow-xl flex items-center gap-3 border animate-fadeIn cursor-pointer ${
                message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 
                message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
                'bg-blue-50 border-blue-200 text-blue-800'
            }`} onClick={() => setMessage(null)}>
                {message.type === 'success' ? <FaCheck /> : <FaInfoCircle />}
                <span className="font-medium">{message.text}</span>
            </div>
        )}

        {/* --- SECTION 1: SUBJECTS MANAGEMENT --- */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div 
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors select-none"
                onClick={() => setSubjectsOpen(!subjectsOpen)}
            >
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-800">Matières Générales</h2>
                    <span className="bg-slate-100 text-slate-600 py-0.5 px-2.5 rounded-full text-xs font-semibold border border-slate-200">
                        {subjects.length}
                    </span>
                </div>
                <div className={`text-slate-400 transition-transform duration-300 ${subjectsOpen ? 'rotate-180' : ''}`}>
                    {subjectsOpen ? <FaChevronUp /> : <FaChevronDown />}
                </div>
            </div>
            
            {/* Collapsible Content */}
            <div className={`transition-all duration-500 ease-in-out ${subjectsOpen ? 'max-h-[1500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                    
                    {/* Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaSearch className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Filtrer les matières..."
                                value={subjectSearch}
                                onChange={(e) => setSubjectSearch(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm transition-shadow"
                            />
                        </div>
                        
                        {/* Add/Edit Form */}
                        <div className="flex gap-2 flex-1 md:flex-none">
                             <input
                                type="text"
                                placeholder="Nom de la matière (ex: Mathématiques)"
                                value={currentSubject.name}
                                onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })}
                                className="flex-1 block w-full min-w-[200px] px-3 py-2.5 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm"
                            />
                            <button 
                                onClick={submitSubject}
                                disabled={subjectsSaving}
                                className={`px-4 py-2 rounded-lg shadow-sm text-white font-medium transition-all flex items-center gap-2 ${
                                    subjectsSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-md active:scale-95'
                                }`}
                            >
                                <FaCheck /> {currentSubject.id ? 'Modifier' : 'Ajouter'}
                            </button>
                            {currentSubject.id && (
                                <button onClick={() => setCurrentSubject({name: ""})} className="px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50">
                                    Annuler
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Grid of Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {subjectsLoading && <div className="col-span-full text-center py-8 text-slate-400">Chargement des matières...</div>}
                        
                        {!subjectsLoading && filteredSubjects.map((s, idx) => {
                            const theme = getColorStyle(s.id);
                            return (
                                <div key={s.id} className={`group relative bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-lg hover:border-indigo-200 transition-all duration-200 ${theme.accent} border-l-[4px]`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-bold text-slate-800">{s.name}</h3>
                                            <p className="text-xs text-slate-400 mt-1 font-mono">{s.code || `ID: ${s.id}`}</p>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setCurrentSubject(s)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md"><FaEdit size={14} /></button>
                                            <button onClick={() => deleteSubjectHandler(s.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md"><FaTrash size={14} /></button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {!subjectsLoading && filteredSubjects.length === 0 && (
                            <div className="col-span-full text-center py-10 border-2 border-dashed border-slate-200 rounded-xl">
                                <p className="text-slate-500">Aucune matière trouvée pour "{subjectSearch}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>

        {/* --- SECTION 2: CLASS ATTRIBUTIONS (Split View) --- */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            
            {/* Left Column: Sidebar Filters & List */}
            <div className="xl:col-span-4 space-y-6">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[600px]">
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                        <h3 className="font-bold text-slate-700 mb-4">Attributions Existantes</h3>
                        <div className="space-y-3">
                             <div className="relative">
                                <FaSearch className="absolute left-3 top-3 text-slate-400 text-sm" />
                                <input 
                                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                                    placeholder="Rechercher (classe, matière...)"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                             </div>
                             <div className="grid grid-cols-2 gap-2">
                                 <select 
                                    className="text-sm w-full border border-slate-300 rounded-md py-2 px-2 bg-white focus:ring-indigo-500 focus:border-indigo-500"
                                    value={filterClass} onChange={e => setFilterClass(e.target.value)}
                                 >
                                     <option value="">Toutes Classes</option>
                                     {schoolClasses.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                                 </select>
                                 <select 
                                    className="text-sm w-full border border-slate-300 rounded-md py-2 px-2 bg-white focus:ring-indigo-500 focus:border-indigo-500"
                                    value={filterSubject} onChange={e => setFilterSubject(e.target.value)}
                                 >
                                     <option value="">Toutes Matières</option>
                                     {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                 </select>
                             </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {filteredClassSubjects.length === 0 ? (
                            <div className="text-center p-8 text-slate-400 text-sm">Aucun résultat.</div>
                        ) : (
                            filteredClassSubjects.map(cs => {
                                const theme = getColorStyle(cs.subject.id);
                                return (
                                    <div key={cs.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${theme.bg.replace('bg-', 'bg-').replace('50', '500')}`}></span>
                                                <p className="text-sm font-semibold text-slate-700 truncate">{cs.subject.name}</p>
                                            </div>
                                            <p className="text-xs text-slate-500 truncate ml-4 mt-0.5">
                                                {cs.school_class.name} • Coef: {cs.coefficient}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => { setSelectedClass(String(cs.school_class.id)); window.scrollTo({top: 200, behavior: 'smooth'}); }}
                                                className="p-1.5 bg-white border rounded text-slate-500 hover:text-indigo-600 hover:border-indigo-200 shadow-sm"
                                                title="Editer cette classe"
                                            >
                                                <FaEdit size={12} />
                                            </button>
                                            <button 
                                                onClick={() => deleteClassSubjectHandler(cs.id)}
                                                className="p-1.5 bg-white border rounded text-slate-500 hover:text-red-600 hover:border-red-200 shadow-sm"
                                                title="Supprimer"
                                            >
                                                <FaTrash size={12} />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column: The Main Editor */}
            <div className="xl:col-span-8">
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
                    
                    {/* Header of Editor */}
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
                        <div className="w-full sm:max-w-md">
                            <label className="block text-sm font-medium text-slate-700 mb-2">Sélectionner une classe à configurer</label>
                            <div className="relative">
                                <select
                                    value={selectedClass}
                                    onChange={(e) => setSelectedClass(e.target.value)}
                                    className="block w-full pl-4 pr-10 py-3 text-base border-slate-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-xl shadow-sm bg-slate-50"
                                >
                                    <option value="">-- Choisir une classe --</option>
                                    {schoolClasses.map((sc) => (
                                        <option key={sc.id} value={sc.id}>{sc.name} ({sc.level?.name})</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                    <FaChevronDown className="text-slate-400" />
                                </div>
                            </div>
                        </div>
                        {selectedClass && (
                            <div className="text-right">
                                <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    Mode Édition
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Empty State */}
                    {!selectedClass && (
                        <div className="text-center py-20">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                                <FaLayerGroup size={32} />
                            </div>
                            <h3 className="text-lg font-medium text-slate-900">Aucune classe sélectionnée</h3>
                            <p className="mt-1 text-slate-500 max-w-sm mx-auto">
                                Sélectionnez une classe dans le menu déroulant ci-dessus pour configurer ses matières et coefficients.
                            </p>
                        </div>
                    )}

                    {/* Editor Grid */}
                    {selectedClass && (
                        <form onSubmit={handleBulkSave} className="animate-fadeIn">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                                {subjects.map((s) => {
                                    const d = formData[s.id] || {};
                                    const theme = getColorStyle(s.id);
                                    // Highlight if assigned
                                    const isAssigned = !!d.id;
                                    const isChanged = d.changed;

                                    return (
                                        <div 
                                            key={s.id} 
                                            className={`relative rounded-xl border transition-all duration-200 overflow-hidden ${
                                                isAssigned 
                                                ? `bg-white border-indigo-200 shadow-md ring-1 ring-indigo-50` 
                                                : 'bg-slate-50 border-slate-200 opacity-80 hover:opacity-100 hover:bg-white hover:shadow-md hover:border-slate-300'
                                            }`}
                                        >
                                            {isChanged && <div className="absolute top-0 right-0 w-3 h-3 bg-amber-400 rounded-bl-lg z-10" title="Modifié"></div>}
                                            
                                            {/* Card Header */}
                                            <div className={`px-4 py-3 flex justify-between items-center border-b ${isAssigned ? 'bg-indigo-50/30 border-indigo-100' : 'border-slate-100'}`}>
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-8 rounded-full ${theme.bg.replace('bg-','bg-').replace('50','500')}`}></div>
                                                    <span className={`font-semibold text-sm ${theme.text}`}>{s.name}</span>
                                                </div>
                                                {isAssigned && <FaCheck className="text-indigo-500 text-xs" />}
                                            </div>

                                            {/* Card Body */}
                                            <div className="p-4 space-y-4">
                                                <div className="flex gap-3">
                                                    <div className="flex-1">
                                                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1"><FaPercentage size={10}/> Coef.</label>
                                                        <input 
                                                            type="number" min="1" max="20"
                                                            value={d.coefficient ?? ''}
                                                            onChange={(e) => setField(s.id, 'coefficient', e.target.value)}
                                                            className={`w-full text-sm border rounded-md px-2 py-1.5 focus:ring-indigo-500 focus:border-indigo-500 ${isAssigned ? 'font-bold text-slate-800' : 'text-slate-500'}`}
                                                        />
                                                    </div>
                                                    <div className="flex-1">
                                                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1"><FaClock size={10}/> Heures</label>
                                                        <input 
                                                            type="number" min="0" max="40"
                                                            value={d.hours_per_week ?? ''}
                                                            onChange={(e) => setField(s.id, 'hours_per_week', e.target.value)}
                                                            className={`w-full text-sm border rounded-md px-2 py-1.5 focus:ring-indigo-500 focus:border-indigo-500 ${isAssigned ? 'font-bold text-slate-800' : 'text-slate-500'}`}
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2">
                                                    <label className="flex items-center gap-2 cursor-pointer group select-none">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${d.is_optional ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 bg-white'}`}>
                                                            {d.is_optional && <FaCheck size={10} className="text-white" />}
                                                        </div>
                                                        <input 
                                                            type="checkbox" className="hidden"
                                                            checked={Boolean(d.is_optional)}
                                                            onChange={(e) => setField(s.id, 'is_optional', e.target.checked)}
                                                        />
                                                        <span className="text-xs text-slate-500 group-hover:text-indigo-600">Facultatif</span>
                                                    </label>
                                                    
                                                    {isAssigned && (
                                                         <button type="button" onClick={() => setField(s.id, 'coefficient', 0)} className="text-xs text-slate-300 hover:text-red-400 transition-colors" title="Désactiver (mettre coef à 0 ou supprimer via liste)">
                                                            <FaEraser />
                                                         </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Sticky Footer for Action */}
                            <div className="sticky bottom-4 mt-8 bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between z-20 border border-slate-700">
                                <div className="text-sm text-slate-300">
                                    <span className="font-bold text-white">{Object.values(formData).filter(x => x.changed).length}</span> modifications en attente
                                </div>
                                <div className="flex gap-3">
                                    <button 
                                        type="button"
                                        onClick={() => { setSelectedClass(''); window.scrollTo({top: 0, behavior: 'smooth'}) }}
                                        className="px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-800 text-sm font-medium transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={savingAssignments}
                                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold shadow-lg hover:shadow-indigo-500/30 transition-all transform active:scale-95 flex items-center gap-2"
                                    >
                                        {savingAssignments ? <FaSyncAlt className="animate-spin" /> : <FaSave />}
                                        Enregistrer la Configuration
                                    </button>
                                </div>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>

      </main>
      
      {/* Global Styles for scrollbar & animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        
        /* Custom Scrollbar for the list */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { bg: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #94a3b8; }
      `}</style>
    </div>
  );
}