import React, { useEffect, useState } from "react";
import { 
  FaEdit, 
  FaTrash, 
  FaSearch, 
  FaCalculator, 
  FaUserGraduate, 
  FaBookOpen, 
  FaLayerGroup,
  FaSave,
  FaEraser
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";

// --- Utilitaires ---

function buildQuery(obj = {}) {
  const parts = [];
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    if (v === null || v === undefined || v === "") return;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  });
  return parts.length ? `?${parts.join("&")}` : "";
}

// Petit composant pour afficher une note individuelle avec style
const GradeBadge = ({ label, value }) => {
  const valNum = parseFloat(value);
  const isGrade = !isNaN(valNum);
  
  let colorClass = "text-slate-400 bg-slate-50 border-slate-100"; // Vide
  if (isGrade) {
    if (valNum < 10) colorClass = "text-red-700 bg-red-50 border-red-100 font-bold";
    else if (valNum >= 16) colorClass = "text-emerald-700 bg-emerald-50 border-emerald-100 font-bold";
    else colorClass = "text-slate-700 bg-white border-slate-200 font-medium";
  }

  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-wider text-slate-400 mb-1">{label}</span>
      <div className={`w-12 h-10 flex items-center justify-center rounded-lg border ${colorClass} shadow-sm transition-transform hover:scale-105`}>
        {value ?? "-"}
      </div>
    </div>
  );
};

export default function Grades() {
  // --- States ---
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ 
      student: "", 
      subject: "", 
      term: "", 
      school_class: "" 
  });

  const [form, setForm] = useState({
    id: null,
    student_id: "",
    subject_id: "",
    term: "T1",
    interrogation1: "",
    interrogation2: "",
    interrogation3: "",
    devoir1: "",
    devoir2: "",
  });

  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // --- Effects ---

  // Chargement initial
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [classesData, subjectsData] = await Promise.all([
          fetchData("/academics/school-classes/"),
          fetchData("/academics/subjects/"),
        ]);
        if (!mounted) return;
        setClasses(Array.isArray(classesData) ? classesData : classesData.results ?? []);
        setSubjects(Array.isArray(subjectsData) ? subjectsData : subjectsData.results ?? []);
      } catch (err) {
        console.error(err);
        setGlobalError("Impossible de charger les données initiales.");
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // Chargement élèves quand classe change
  useEffect(() => {
    let mounted = true;
    const loadStudents = async () => {
      const cls = filters.school_class;
      if (!cls) {
        setStudents([]);
        setFilters(prev => ({ ...prev, student: "" }));
        return;
      }
      setLoadingStudents(true);
      try {
        const data = await fetchData(`/core/admin/students/by-class/${cls}/`);
        if (!mounted) return;
        setStudents(Array.isArray(data) ? data : data.results ?? []);
        setFilters(prev => ({ ...prev, student: "" })); 
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    };
    loadStudents();
    return () => { mounted = false; };
  }, [filters.school_class]);

  // --- Actions ---

  const fetchGrades = async () => {
    setLoadingGrades(true);
    setGlobalError("");
    setSuccessMessage("");
    try {
      const queryObj = {};
      if (filters.school_class) queryObj.school_class = filters.school_class;
      if (filters.student) queryObj.student_id = filters.student;
      if (filters.subject) queryObj.subject = filters.subject;
      if (filters.term) queryObj.term = filters.term;
      if (search?.trim()) queryObj.student_name = search.trim();

      const url = `/academics/grades/${buildQuery(queryObj)}`;
      const data = await fetchData(url);
      setGrades(Array.isArray(data) ? data : data.results ?? []);
    } catch (err) {
      console.error(err);
      setGlobalError("Erreur lors de la récupération des notes.");
    } finally {
      setLoadingGrades(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError("");
    setSuccessMessage("");

    if (!form.student_id || !form.subject_id) {
      setGlobalError("Veuillez sélectionner un élève et une matière.");
      return;
    }

    const payload = {
      student_ref: form.student_id,
      subject_ref: form.subject_id,
      term: form.term || "T1",
      interrogation1: form.interrogation1 === "" ? null : form.interrogation1,
      interrogation2: form.interrogation2 === "" ? null : form.interrogation2,
      interrogation3: form.interrogation3 === "" ? null : form.interrogation3,
      devoir1: form.devoir1 === "" ? null : form.devoir1,
      devoir2: form.devoir2 === "" ? null : form.devoir2,
    };

    try {
      if (form.id) {
        await putData(`/academics/grades/${form.id}/`, payload);
        setSuccessMessage("Note mise à jour avec succès !");
      } else {
        await postData("/academics/grades/", payload);
        setSuccessMessage("Note créée avec succès !");
      }
      resetForm();
      await fetchGrades();
    } catch (err) {
      const apiData = err?.response?.data;
      console.error(apiData);
      setGlobalError(apiData?.detail || "Erreur lors de l'enregistrement.");
    }
  };

  const resetForm = () => {
    setForm({
      id: null,
      student_id: "",
      subject_id: "",
      term: "T1",
      interrogation1: "",
      interrogation2: "",
      interrogation3: "",
      devoir1: "",
      devoir2: "",
    });
  };

  const handleEdit = (g) => {
    setForm({
      id: g.id,
      student_id: g.student_id,
      subject_id: g.subject_id,
      term: g.term || "T1",
      interrogation1: g.interrogation1 ?? "",
      interrogation2: g.interrogation2 ?? "",
      interrogation3: g.interrogation3 ?? "",
      devoir1: g.devoir1 ?? "",
      devoir2: g.devoir2 ?? "",
    });
    
    if (g.student_class_id && String(filters.school_class) !== String(g.student_class_id)) {
       setFilters(prev => ({ ...prev, school_class: g.student_class_id }));
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette note ?")) return;
    try {
      await deleteData(`/academics/grades/${id}/`);
      await fetchGrades();
      setSuccessMessage("Note supprimée.");
    } catch (err) {
      setGlobalError("Impossible de supprimer.");
    }
  };

  const studentLabel = (s) => s.user ? `${s.user.first_name || ""} ${s.user.last_name || ""}`.trim() : (s.name || s.id);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8 font-sans text-slate-800">
      
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
              <span className="bg-indigo-600 text-white p-2 rounded-lg shadow-lg shadow-indigo-200">
                <FaCalculator className="text-xl" />
              </span>
              Gestion des Notes
            </h1>
            <p className="mt-2 text-slate-500">Gérez les évaluations, consultez les moyennes et suivez la progression.</p>
          </div>
        </div>

        {/* Notifications */}
        {globalError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-red-700 flex items-center gap-3 animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            {globalError}
          </div>
        )}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center gap-3">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            {successMessage}
          </div>
        )}

        {/* Zone de Filtres & Contrôle */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            
            {/* Recherche */}
            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Recherche</label>
              <div className="relative group">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition" />
                <input
                    type="text"
                    placeholder="Nom de l'élève..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent transition-all outline-none"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Classe */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Classe</label>
              <div className="relative">
                <FaLayerGroup className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <select
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                  value={filters.school_class}
                  onChange={(e) => setFilters({ ...filters, school_class: e.target.value })}
                >
                  <option value="">Toutes les classes</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            {/* Élève */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Élève</label>
              <div className="relative">
                <FaUserGraduate className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <select
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none cursor-pointer disabled:opacity-50"
                  value={filters.student}
                  onChange={(e) => setFilters({ ...filters, student: e.target.value })}
                  disabled={!filters.school_class && students.length === 0}
                >
                  {students.length === 0 ? (
                      <option value="">{filters.school_class ? "Aucun élève" : "Choisir une classe"}</option>
                  ) : (
                      <>
                      <option value="">Tous les élèves</option>
                      {students.map((s) => <option key={s.id} value={s.id}>{studentLabel(s)}</option>)}
                      </>
                  )}
                </select>
              </div>
            </div>

            {/* Matière */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Matière</label>
              <div className="relative">
                <FaBookOpen className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <select
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                  value={filters.subject}
                  onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
                >
                  <option value="">Toutes les matières</option>
                  {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Bouton Action */}
            <button
              onClick={fetchGrades}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-md shadow-indigo-200 transition-transform transform active:scale-95 flex items-center justify-center gap-2"
            >
              <FaSearch /> Filtrer
            </button>

          </div>
        </div>

        {/* Layout Principal: Formulaire (Gauche/Haut) & Résultats (Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Colonne de Gauche : Formulaire d'édition */}
          <div className="lg:col-span-1 bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden sticky top-6">
            <div className={`p-4 ${form.id ? 'bg-amber-50 border-b border-amber-100' : 'bg-slate-50 border-b border-slate-100'} flex justify-between items-center`}>
              <h3 className={`font-bold ${form.id ? 'text-amber-800' : 'text-slate-800'}`}>
                {form.id ? "Modifier la note" : "Nouvelle Saisie"}
              </h3>
              {form.id && (
                <button onClick={resetForm} className="text-xs text-slate-500 hover:text-slate-800 underline flex items-center gap-1">
                  <FaEraser /> Annuler
                </button>
              )}
            </div>

            <form className="p-6 space-y-5" onSubmit={handleSubmit}>
              {/* Sélection Contextuelle */}
              <div className="space-y-3">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Élève</label>
                    <select
                        className="w-full p-2 bg-white border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        value={form.student_id}
                        onChange={(e) => setForm({ ...form, student_id: e.target.value })}
                        required
                    >
                        <option value="">-- Sélectionner --</option>
                        {students.map((s) => <option key={s.id} value={s.id}>{studentLabel(s)}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Matière</label>
                    <select
                        className="w-full p-2 bg-white border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        value={form.subject_id}
                        onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
                        required
                    >
                        <option value="">-- Sélectionner --</option>
                        {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Trimestre</label>
                    <select
                        className="w-full p-2 bg-white border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        value={form.term}
                        onChange={(e) => setForm({ ...form, term: e.target.value })}
                    >
                        <option value="T1">1er Trimestre</option>
                        <option value="T2">2e Trimestre</option>
                        <option value="T3">3e Trimestre</option>
                    </select>
                </div>
              </div>

              <hr className="border-slate-100" />

              {/* Grille de Saisie des Notes */}
              <div>
                <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-3">Interrogations (Coef 1)</label>
                <div className="grid grid-cols-3 gap-2">
                  {["interrogation1", "interrogation2", "interrogation3"].map((f, i) => (
                    <div key={f}>
                        <input
                          type="number" step="0.01" min="0" max="20"
                          placeholder={`Int ${i+1}`}
                          className="w-full p-2 text-center border border-slate-200 rounded focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm"
                          value={form[f]}
                          onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                        />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-rose-600 uppercase tracking-wider mb-3">Devoirs (Coef 2)</label>
                <div className="grid grid-cols-2 gap-2">
                  {["devoir1", "devoir2"].map((f, i) => (
                    <div key={f}>
                        <input
                          type="number" step="0.01" min="0" max="20"
                          placeholder={`Dev ${i+1}`}
                          className="w-full p-2 text-center border border-slate-200 rounded focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none text-sm"
                          value={form[f]}
                          onChange={(e) => setForm({ ...form, [f]: e.target.value })}
                        />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-3 rounded-xl text-white font-bold shadow-lg transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2
                  ${form.id ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-orange-200" : "bg-gradient-to-r from-indigo-600 to-violet-600 shadow-indigo-200"}`}
              >
                <FaSave /> {form.id ? "Mettre à jour la note" : "Enregistrer la note"}
              </button>
            </form>
          </div>

          {/* Colonne Centrale/Droite : Liste des Cartes */}
          <div className="lg:col-span-2 space-y-6">
             {loadingGrades ? (
               <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
                 <p>Chargement des données...</p>
               </div>
             ) : grades.length === 0 ? (
               <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm">
                 <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaBookOpen className="text-slate-300 text-3xl" />
                 </div>
                 <h3 className="text-lg font-semibold text-slate-800">Aucune note trouvée</h3>
                 <p className="text-slate-500">Essayez d'ajuster vos filtres ou commencez une nouvelle saisie.</p>
               </div>
             ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {grades.map((g) => (
                   <div key={g.id} className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 transition-all duration-300 flex flex-col overflow-hidden relative">
                     
                     {/* Bandeau Trimestre */}
                     <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold 
                        ${g.term === "T1" ? "bg-indigo-100 text-indigo-700" : g.term === "T2" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                        {g.term}
                     </div>

                     {/* Header Carte */}
                     <div className="p-5 pb-2">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                                <FaUserGraduate />
                            </div>
                            <div className="overflow-hidden">
                                <h3 className="font-bold text-slate-800 truncate text-lg leading-tight">
                                    {g.student_firstname} {g.student_lastname}
                                </h3>
                                <p className="text-xs text-slate-500 uppercase tracking-wide mt-0.5 font-semibold">
                                    {g.student_class} • {g.subject_name}
                                </p>
                            </div>
                        </div>
                     </div>

                     {/* Corps Carte: Notes Détaillées */}
                     <div className="px-5 py-4 bg-slate-50/50 flex-1">
                        <div className="flex gap-4 justify-center">
                            {/* Groupe Interros */}
                            <div className="flex gap-2">
                                <GradeBadge label="I.1" value={g.interrogation1} />
                                <GradeBadge label="I.2" value={g.interrogation2} />
                                <GradeBadge label="I.3" value={g.interrogation3} />
                            </div>
                            <div className="w-px bg-slate-200 mx-1"></div>
                            {/* Groupe Devoirs */}
                            <div className="flex gap-2">
                                <GradeBadge label="D.1" value={g.devoir1} />
                                <GradeBadge label="D.2" value={g.devoir2} />
                            </div>
                        </div>
                     </div>

                     {/* Footer: Moyennes & Actions */}
                     <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-white">
                        <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">Moyenne</span>
                            <span className={`text-lg font-bold ${ (g.average_subject ?? 0) >= 10 ? "text-emerald-600" : "text-rose-600" }`}>
                                {g.average_subject ?? "-"} <span className="text-xs text-slate-400 font-normal">/20</span>
                            </span>
                        </div>

                        <div className="flex gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => handleEdit(g)}
                                className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition"
                                title="Modifier"
                            >
                                <FaEdit />
                            </button>
                            <button 
                                onClick={() => handleDelete(g.id)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                                title="Supprimer"
                            >
                                <FaTrash />
                            </button>
                        </div>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}