import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaCheck,
  FaSyncAlt,
  FaChevronDown,
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";

/* Palette réutilisable */
const COLORS = [
  "bg-red-200 text-red-800",
  "bg-orange-200 text-orange-800",
  "bg-amber-200 text-amber-800",
  "bg-yellow-200 text-yellow-800",
  "bg-lime-200 text-lime-800",
  "bg-green-200 text-green-800",
  "bg-emerald-200 text-emerald-800",
  "bg-teal-200 text-teal-800",
  "bg-cyan-200 text-cyan-800",
  "bg-sky-200 text-sky-800",
  "bg-indigo-200 text-indigo-800",
  "bg-violet-200 text-violet-800",
  "bg-purple-200 text-purple-800",
  "bg-fuchsia-200 text-fuchsia-800",
  "bg-pink-200 text-pink-800",
  "bg-rose-200 text-rose-800",
];
function colorFor(id) {
  if (id === undefined || id === null) return "bg-gray-100 text-gray-800";
  return COLORS[id % COLORS.length] || "bg-gray-100 text-gray-800";
}

export default function SubjectsAndClassSubjects() {
  /* --- Subjects (matières) --- */
  const [subjects, setSubjects] = useState([]);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [currentSubject, setCurrentSubject] = useState({ name: "" });
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsSaving, setSubjectsSaving] = useState(false);
  const [subjectsOpen, setSubjectsOpen] = useState(false);

  /* --- ClassSubjects (attributions) --- */
  const [classSubjects, setClassSubjects] = useState([]);
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [csLoading, setCsLoading] = useState(false);

  /* shared UI */
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterSubject, setFilterSubject] = useState("");

  /* editor (bulk) */
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
      console.error("fetchSubjects:", err);
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
      console.error("fetchClassSubjects:", err);
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
      console.error("fetchSchoolClasses:", err);
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

  /* --- SUBJECTS: submit / delete --- */
  const submitSubject = async () => {
    if (!currentSubject.name || !currentSubject.name.trim()) {
      setMessage({ type: "error", text: "Nom requis." });
      return;
    }
    setSubjectsSaving(true);
    setMessage(null);
    try {
      if (currentSubject.id) {
        await putData(`/academics/subjects/${currentSubject.id}/`, { name: currentSubject.name });
        setMessage({ type: "success", text: "Matière mise à jour." });
      } else {
        await postData("/academics/subjects/", { name: currentSubject.name });
        setMessage({ type: "success", text: "Matière ajoutée." });
      }
      setCurrentSubject({ name: "" });
      await fetchSubjects();
    } catch (err) {
      console.error("submitSubject:", err);
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement." });
    } finally {
      setSubjectsSaving(false);
    }
  };

  const deleteSubjectHandler = async (id) => {
    if (!window.confirm("Supprimer cette matière ?")) return;
    try {
      await deleteData(`/academics/subjects/${id}/`);
      setMessage({ type: "success", text: "Matière supprimée." });
      await fetchSubjects();
      await fetchClassSubjects();
    } catch (err) {
      console.error("deleteSubject:", err);
      setMessage({ type: "error", text: "Impossible de supprimer la matière." });
    }
  };

  /* --- CLASS-SUBJECTS editor logic --- */
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
      setMessage({ type: "error", text: "Sélectionne une classe avant d'enregistrer." });
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
        setMessage({ type: "info", text: "Aucune modification à enregistrer." });
        setSavingAssignments(false);
        return;
      }

      await Promise.all(promises);
      setMessage({ type: "success", text: "Attributions enregistrées." });
      await fetchClassSubjects();
      setSelectedClass(selectedClass); // rebuild form
    } catch (err) {
      console.error("handleBulkSave:", err);
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement." });
    } finally {
      setSavingAssignments(false);
    }
  };

  const deleteClassSubjectHandler = async (id) => {
    if (!window.confirm("Supprimer cette attribution ?")) return;
    try {
      await deleteData(`/academics/class-subjects/${id}/`);
      setMessage({ type: "success", text: "Attribution supprimée." });
      await fetchClassSubjects();
    } catch (err) {
      console.error("deleteClassSubject:", err);
      setMessage({ type: "error", text: "Impossible de supprimer." });
    }
  };

  /* filtered views */
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
        (cs.subject.name || "").toLowerCase().includes(term) ||
        String(cs.coefficient).includes(term)
      );
    });
  }, [classSubjects, searchTerm, filterClass, filterSubject]);

  const refreshAll = async () => {
    setMessage(null);
    await fetchAll();
  };

 

  /* UI render */
  return (
    <div className="p-8 bg-gray-50 min-h-screen text-gray-800 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">📚 Matières & Attributions</h1>
          <p className="text-sm text-gray-600 mt-1">Gère les matières et attribue-les aux classes (grille d'édition groupée).</p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={refreshAll} className="bg-white border px-3 py-2 rounded-lg shadow-sm hover:shadow-md">
            <FaSyncAlt /> <span className="ml-2 hidden md:inline">Rafraîchir</span>
          </button>
          <button onClick={() => { setCurrentSubject({ name: "" }); setSubjectsOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-sm flex items-center gap-2">
            <FaPlus /> Nouvelle matière
          </button>
        </div>
      </header>

      {/* SUBJECTS: collapsible panel */}
      <section className="space-y-3">
        <div className="bg-white border rounded-xl shadow-sm p-4 flex items-center justify-between cursor-pointer" onClick={() => setSubjectsOpen((v) => !v)}>
          <div className="flex items-center gap-3">
            <div className="text-lg font-medium">Matières générales</div>
            <div className="text-sm text-gray-500">{subjects.length} matières</div>
          </div>
          <div className={`transform transition-transform ${subjectsOpen ? 'rotate-180' : 'rotate-0'}`}>
            <FaChevronDown />
          </div>
        </div>

        <div className={`overflow-hidden transition-all duration-300 ${subjectsOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="bg-white border rounded-xl shadow-sm p-6 mt-3 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              <div className="relative max-w-sm w-full">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Rechercher une matière..."
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="pl-10 pr-3 py-2 border rounded-full w-full shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
              </div>

              <div className="flex-1" />

              <div className="flex gap-2">
                <button
                  onClick={() => { setCurrentSubject({ name: "" }); fetchSubjects(); }}
                  className="px-4 py-2 rounded-full bg-white border hover:bg-gray-50"
                >
                  Réinitialiser
                </button>
                <button
                  onClick={() => { setCurrentSubject({ name: "" }); setSubjectsOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className="px-4 py-2 rounded-full bg-white border hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>

            {/* subject form */}
            <div className="bg-gray-50 border rounded-lg p-4 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                placeholder="Nom de la matière..."
                value={currentSubject.name}
                onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })}
                className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-300"
              />
              <button
                onClick={submitSubject}
                disabled={subjectsSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white ${subjectsSaving ? "bg-gray-400" : "bg-indigo-600 hover:bg-indigo-700"}`}
              >
                <FaCheck /> {currentSubject.id ? "Modifier" : "Ajouter"}
              </button>
            </div>

            {/* list of subjects: nicer cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjectsLoading && <div className="text-gray-500 col-span-full">Chargement...</div>}
              {!subjectsLoading && filteredSubjects.length === 0 && <div className="text-gray-500 col-span-full">Aucune matière trouvée.</div>}

              {filteredSubjects.map((s) => (
                <div key={s.id} className="flex flex-col justify-between border rounded-2xl bg-white shadow hover:shadow-md p-4 transition animate-fadeIn">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${colorFor(s.id)}`}>{s.name}</div>
                        {s.code && <div className="text-xs text-gray-400">{s.code}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentSubject(s)}
                          className="p-2 rounded-full bg-white border hover:bg-indigo-50 text-blue-600"
                          title="Modifier"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => deleteSubjectHandler(s.id)}
                          className="p-2 rounded-full bg-white border hover:bg-red-50 text-red-600"
                          title="Supprimer"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 text-sm text-gray-600">{s.description || ''}</div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-xs text-gray-500">Créé: {new Date(s.created_at || s.created || Date.now()).toLocaleDateString()}</div>
                    <div className="text-xs text-gray-400">{s.id ? 'ID ' + s.id : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CLASS-SUBJECTS: left list + editor right */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* left column: existing assignments + filters */}
        <aside className="col-span-1 bg-white border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Attributions existantes</h2>
            <button onClick={fetchClassSubjects} className="px-3 py-1 rounded-full bg-white border">Rafraîchir</button>
          </div>

          <div className="space-y-3 mb-3">
            <div className="relative">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                placeholder="Recherche..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 border rounded-full w-full shadow-sm"
              />
            </div>

            <select value={filterClass} onChange={(e) => setFilterClass(e.target.value)} className="w-full border rounded-full px-3 py-2">
              <option value="">Toutes les classes</option>
              {schoolClasses.map((sc) => <option key={sc.id} value={sc.id}>{sc.name} ({sc.level?.name})</option>)}
            </select>

            <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} className="w-full border rounded-full px-3 py-2">
              <option value="">Toutes les matières</option>
              {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <button onClick={() => { setSearchTerm(""); setFilterClass(""); setFilterSubject(""); }} className="w-full px-3 py-2 rounded-full bg-white border">Reset</button>
          </div>

          <div className="max-h-[60vh] overflow-auto space-y-2">
            {csLoading && <div className="text-gray-500">Chargement...</div>}
            {!csLoading && filteredClassSubjects.length === 0 && <div className="text-gray-500">Aucune attribution trouvée.</div>}

            {filteredClassSubjects.map((cs) => (
              <div key={cs.id} className="flex items-center justify-between gap-3 p-2 border rounded-md hover:shadow-sm">
                <div>
                  <div className="text-sm font-medium">{cs.school_class.name} <span className="text-xs text-gray-400">({cs.school_class.level?.name})</span></div>
                  <div className="text-xs text-gray-600">{cs.subject.name} • coef {cs.coefficient} • {cs.hours_per_week}h/w {cs.is_optional ? "• facultatif" : ""}</div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${colorFor(cs.subject.id)}`}>{cs.subject.name}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setSelectedClass(String(cs.school_class.id)); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="px-2 py-1 rounded-full bg-white border text-blue-600"
                    >
                      Éditer
                    </button>
                    <button
                      onClick={() => deleteClassSubjectHandler(cs.id)}
                      className="px-2 py-1 rounded-full bg-white border text-red-600"
                    >
                      Suppr
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* right area: grid editor */}
        <div className="lg:col-span-2 bg-white border rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <label className="block text-sm text-gray-600">Choisir une classe</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="mt-1 w-full max-w-xs border rounded px-3 py-2"
              >
                <option value="">-- Sélectionner une classe --</option>
                {schoolClasses.map((sc) => <option key={sc.id} value={sc.id}>{sc.name} ({sc.level?.name})</option>)}
              </select>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500">{selectedClass ? `Édition: ${schoolClasses.find(s => String(s.id) === String(selectedClass))?.name || ''}` : 'Aucune classe sélectionnée'}</div>
              <div className="text-xs text-gray-400">Remplis la grille et clique sur Enregistrer.</div>
            </div>
          </div>

          {!selectedClass && (
            <div className="p-6 border-dashed border-2 border-gray-100 rounded-md text-center text-gray-500">Sélectionne une classe pour voir et modifier ses matières.</div>
          )}

          {selectedClass && (
            <form onSubmit={handleBulkSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((s) => {
                  const d = formData[s.id] || {};
                  const badgeClass = colorFor(s.id);
                  return (
                    <div key={s.id} className="border rounded-lg p-4 flex flex-col justify-between shadow-sm hover:shadow transition">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className={`px-2 py-1 rounded-md text-xs font-semibold ${badgeClass}`}>{s.name}</div>
                          <div className="text-xs text-gray-400">{s.code || ''}</div>
                        </div>

                        <div className="mt-3 space-y-2">
                          <label className="text-xs text-gray-600 block">Coefficient</label>
                          <input
                            type="number"
                            min={1}
                            max={20}
                            value={d.coefficient ?? ''}
                            onChange={(e) => setField(s.id, 'coefficient', Number(e.target.value))}
                            className="w-full border rounded px-2 py-1"
                          />

                          <label className="text-xs text-gray-600 block">Heures / semaine</label>
                          <input
                            type="number"
                            min={0}
                            max={40}
                            value={d.hours_per_week ?? ''}
                            onChange={(e) => setField(s.id, 'hours_per_week', Number(e.target.value))}
                            className="w-full border rounded px-2 py-1"
                          />

                          <label className="inline-flex items-center gap-2 mt-2">
                            <input
                              type="checkbox"
                              checked={Boolean(d.is_optional)}
                              onChange={(e) => setField(s.id, 'is_optional', e.target.checked)}
                            />
                            <span className="text-sm">Facultatif</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="text-xs text-gray-500">{d.id ? 'Déjà attribué' : 'Pas encore'}</div>
                        <div className="text-xs text-gray-400">{d.changed ? 'Modifié' : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => { setSelectedClass(''); setFormData({}); }} className="px-4 py-2 rounded-full border">Annuler</button>
                <button type="submit" disabled={savingAssignments} className={`px-6 py-2 rounded-full text-white font-medium ${savingAssignments ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}>
                  {savingAssignments ? 'Enregistrement...' : 'Enregistrer toutes les attributions'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* messages */}
      {message && (
        <div className={`p-3 rounded-md text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-700' : message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-sky-50 text-sky-700'}`}>
          {message.text}
        </div>
      )}

      {/* small CSS for animation */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.18s ease-out; }
      `}</style>
    </div>
  );
}
