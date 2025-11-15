// src/pages/LevelsAndClasses.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaUsers,
  FaChalkboardTeacher,
  FaTimes,
  FaEllipsisV,
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";

export default function LevelsAndClasses() {
  // UI: tab
  const [tab, setTab] = useState("levels"); // 'levels' | 'classes'

  /* -------------------------
     LEVELS state & handlers
     -------------------------*/
  const [levels, setLevels] = useState([]);
  const [levelsFiltered, setLevelsFiltered] = useState([]);
  const [levelsSearch, setLevelsSearch] = useState("");
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [levelsError, setLevelsError] = useState("");
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [levelEditTarget, setLevelEditTarget] = useState(null);
  const [levelName, setLevelName] = useState("");

  const fetchLevels = useCallback(async () => {
    setLevelsLoading(true);
    setLevelsError("");
    try {
      const data = await fetchData("/academics/levels/");
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      setLevels(arr);
      setLevelsFiltered(arr);
    } catch (err) {
      console.error("fetchLevels:", err);
      setLevelsError("Erreur lors de la récupération des niveaux.");
    } finally {
      setLevelsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  useEffect(() => {
    const q = levelsSearch.trim().toLowerCase();
    if (!q) setLevelsFiltered(levels);
    else setLevelsFiltered(levels.filter((l) => (l.name || "").toLowerCase().includes(q)));
  }, [levelsSearch, levels]);

  const openLevelModal = (lvl = null) => {
    setLevelEditTarget(lvl);
    setLevelName(lvl ? lvl.name : "");
    setLevelModalOpen(true);
  };
  const closeLevelModal = () => {
    setLevelModalOpen(false);
    setLevelEditTarget(null);
    setLevelName("");
  };

  const submitLevel = async () => {
    if (!levelName.trim()) {
      return alert("Le nom du niveau est requis.");
    }
    try {
      if (levelEditTarget) {
        // update (PUT). If you need PATCH, I can add patchData to api.js.
        await putData(`/academics/levels/${levelEditTarget.id}/`, { name: levelName.trim() });
        alert("Niveau modifié !");
      } else {
        await postData("/academics/levels/", { name: levelName.trim() });
        alert("Niveau ajouté !");
      }
      await fetchLevels();
      closeLevelModal();
    } catch (err) {
      console.error("submitLevel:", err);
      alert("Erreur lors de l'opération.");
    }
  };

  const deleteLevel = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce niveau ?")) return;
    try {
      await deleteData(`/academics/levels/${id}/`);
      alert("Niveau supprimé !");
      await fetchLevels();
    } catch (err) {
      console.error("deleteLevel:", err);
      alert("Erreur lors de la suppression.");
    }
  };

  /* -------------------------
     CLASSES state & handlers
     -------------------------*/
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState("");
  const [classSearch, setClassSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [showOptionsFor, setShowOptionsFor] = useState(null);

  // class modal (create/edit)
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [classEditTarget, setClassEditTarget] = useState(null);
  const [classNameInput, setClassNameInput] = useState("");
  const [classLevelInput, setClassLevelInput] = useState("");

  // class view modal (students + teachers)
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState(null);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  // pagination for classes (client-side)
  const [classPage, setClassPage] = useState(1);
  const [classPageSize, setClassPageSize] = useState(10);

  const optionsRef = useRef(null);

  const fetchClasses = useCallback(async () => {
    setClassesLoading(true);
    setClassesError("");
    try {
      const data = await fetchData("/academics/school-classes/");
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      setClasses(arr);
    } catch (err) {
      console.error("fetchClasses:", err);
      setClassesError("Impossible de charger les classes.");
    } finally {
      setClassesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // close options dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (optionsRef.current && !optionsRef.current.contains(e.target)) {
        setShowOptionsFor(null);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // visible classes according to filters & search
  const visibleClasses = useMemo(() => {
    return classes
      .filter((c) => (levelFilter ? String(c.level?.id) === String(levelFilter) : true))
      .filter((c) => (classSearch ? (c.name || "").toLowerCase().includes(classSearch.toLowerCase()) : true));
  }, [classes, levelFilter, classSearch]);

  // pagination
  const classTotalPages = Math.max(1, Math.ceil(visibleClasses.length / classPageSize));
  useEffect(() => {
    if (classPage > classTotalPages) setClassPage(classTotalPages);
  }, [classTotalPages, classPage]);

  const currentClassesPage = useMemo(() => {
    const start = (classPage - 1) * classPageSize;
    return visibleClasses.slice(start, start + classPageSize);
  }, [visibleClasses, classPage, classPageSize]);

  const openClassModal = (cls = null) => {
    setClassEditTarget(cls);
    setClassNameInput(cls ? cls.name : "");
    setClassLevelInput(cls ? cls.level?.id ?? "" : levels[0]?.id ?? "");
    setClassModalOpen(true);
  };
  const closeClassModal = () => {
    setClassModalOpen(false);
    setClassEditTarget(null);
    setClassNameInput("");
    setClassLevelInput("");
  };

  const submitClass = async () => {
    if (!classNameInput.trim() || !classLevelInput) return alert("Nom et niveau requis !");
    try {
      const payload = { name: classNameInput.trim(), level_id: classLevelInput };
      if (classEditTarget) {
        await putData(`/academics/school-classes/${classEditTarget.id}/`, payload);
        alert("Classe modifiée !");
      } else {
        await postData("/academics/school-classes/", payload);
        alert("Classe ajoutée !");
      }
      await fetchClasses();
      closeClassModal();
    } catch (err) {
      console.error("submitClass:", err);
      alert("Erreur lors de l'opération.");
    }
  };

  const deleteClass = async (id) => {
    if (!window.confirm("Supprimer cette classe ?")) return;
    try {
      await deleteData(`/academics/school-classes/${id}/`);
      alert("Classe supprimée !");
      await fetchClasses();
    } catch (err) {
      console.error("deleteClass:", err);
      alert("Erreur suppression.");
    }
  };

  const openViewClassModal = async (cls) => {
    setViewTarget(cls);
    setViewModalOpen(true);
    setStudents([]);
    setTeachers([]);
    setLoadingStudents(true);
    setLoadingTeachers(true);

    try {
      const studentsData = await fetchData(`/core/admin/students/by-class/${cls.id}/`);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
    } catch (err) {
      console.error("fetch students:", err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }

    try {
      const teachersData = await fetchData(`/core/admin/teachers/by-class/${cls.id}/`);
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
    } catch (err) {
      console.error("fetch teachers:", err);
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const closeViewClassModal = () => {
    setViewModalOpen(false);
    setViewTarget(null);
    setStudents([]);
    setTeachers([]);
    setLoadingStudents(false);
    setLoadingTeachers(false);
  };

  // helper render name
  const renderPersonName = (p) => {
    if (!p) return "—";
    if (p.user && (p.user.first_name || p.user.last_name)) return `${p.user.first_name || ""} ${p.user.last_name || ""}`.trim();
    if (p.first_name || p.last_name) return `${p.first_name || ""} ${p.last_name || ""}`.trim();
    return p.username || "—";
  };

  /* -------------------------
     Modal body-scroll lock (prevents page scroll behind modal)
     ------------------------- */
  useEffect(() => {
    const anyOpen = levelModalOpen || classModalOpen || viewModalOpen;
    const original = document.body.style.overflow;
    if (anyOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = original || "";
    }
    return () => {
      document.body.style.overflow = original || "";
    };
  }, [levelModalOpen, classModalOpen, viewModalOpen]);

  /* -------------------------
     Render
     ------------------------- */
  return (
    <div className="p-8 bg-gray-50 min-h-screen text-gray-800">
      {/* Header + Tabs */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Administration — Niveaux & Classes</h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-white border border-gray-200 p-1 shadow-sm">
            <button
              onClick={() => setTab("levels")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "levels" ? "bg-indigo-600 text-white" : "text-gray-700"}`}
            >
              Niveaux
            </button>
            <button
              onClick={() => setTab("classes")}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "classes" ? "bg-indigo-600 text-white" : "text-gray-700"}`}
            >
              Classes
            </button>
          </div>

          {/* global add: context aware */}
          {tab === "levels" ? (
            <button
              onClick={() => openLevelModal(null)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition flex items-center gap-2"
            >
              <FaPlus /> Nouveau niveau
            </button>
          ) : (
            <button
              onClick={() => openClassModal(null)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition flex items-center gap-2"
            >
              <FaPlus /> Nouvelle classe
            </button>
          )}
        </div>
      </div>

      {/* LEVELS TAB */}
      {tab === "levels" && (
        <div className="space-y-4">
          {/* search */}
          <div className="flex items-center gap-3">
            <div className="relative max-w-sm w-full">
              <FaSearch className="absolute left-3 top-3 text-gray-400" />
              <input
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Rechercher un niveau..."
                value={levelsSearch}
                onChange={(e) => setLevelsSearch(e.target.value)}
              />
            </div>
            <div className="text-sm text-gray-600">Résultats : <span className="font-medium text-gray-800">{levelsFiltered.length}</span></div>
          </div>

          <div className="bg-white rounded-xl shadow border overflow-hidden">
            {levelsLoading ? (
              <div className="p-6 text-center text-gray-500">Chargement des niveaux...</div>
            ) : levelsError ? (
              <div className="p-6 text-center text-red-600">{levelsError}</div>
            ) : levelsFiltered.length === 0 ? (
              <div className="p-6 text-center text-gray-500">Aucun niveau trouvé.</div>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                  <tr>
                    <th className="py-3 px-4 text-left">ID</th>
                    <th className="py-3 px-4 text-left">Nom du niveau</th>
                    <th className="py-3 px-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {levelsFiltered.map((lvl, idx) => (
                    <tr key={lvl.id} className={`border-t hover:bg-gray-50 transition ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                      <td className="py-2 px-4">{lvl.id}</td>
                      <td className="py-2 px-4 font-medium text-gray-800">{lvl.name}</td>
                      <td className="py-2 px-4 flex gap-2">
                        <button
                          onClick={() => openLevelModal(lvl)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs shadow-sm flex items-center gap-2"
                        >
                          <FaEdit className="w-3 h-3" /> Modifier
                        </button>
                        <button
                          onClick={() => deleteLevel(lvl.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs shadow-sm flex items-center gap-2"
                        >
                          <FaTrash className="w-3 h-3" /> Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* CLASSES TAB */}
      {tab === "classes" && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3 w-full md:w-2/3">
              <div className="relative w-full">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                  className="pl-10 pr-4 py-2 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  placeholder="Rechercher une classe..."
                  value={classSearch}
                  onChange={(e) => { setClassSearch(e.target.value); setClassPage(1); }}
                />
              </div>

              <select
                className="border rounded-lg px-3 py-2"
                value={levelFilter}
                onChange={(e) => { setLevelFilter(e.target.value); setClassPage(1); }}
              >
                <option value="">Tous niveaux</option>
                {levels.map((lvl) => (
                  <option key={lvl.id} value={lvl.id}>{lvl.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-500">Résultats : <span className="font-medium text-gray-700">{visibleClasses.length}</span></div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            {classesLoading ? (
              <div className="p-8 text-center text-gray-500">Chargement des classes...</div>
            ) : classesError ? (
              <div className="p-8 text-center text-red-600">{classesError}</div>
            ) : (
              <>
                <table className="min-w-full table-auto text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">#</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Nom</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Niveau</th>
                      <th className="text-left px-6 py-3 text-sm font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {currentClassesPage.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-gray-500">Aucune classe trouvée</td>
                      </tr>
                    ) : (
                      currentClassesPage.map((cls, i) => (
                        <tr key={cls.id} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-indigo-50 transition`}>
                          <td className="px-6 py-4 text-sm text-gray-700">{cls.id}</td>
                          <td className="px-6 py-4 font-medium text-gray-800">{cls.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{cls.level?.name || "—"}</td>
                          <td className="px-6 py-4 relative">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => openViewClassModal(cls)}
                                className="text-sm bg-white border hover:bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-2"
                                title="Voir élèves & profs"
                              >
                                <FaUsers className="text-indigo-600" /> Voir
                              </button>

                              <button
                                onClick={() => openClassModal(cls)}
                                className="text-sm bg-white border hover:bg-indigo-50 px-3 py-1 rounded-full flex items-center gap-2"
                                title="Modifier"
                              >
                                <FaEdit className="text-blue-600" /> Modifier
                              </button>

                              <button
                                onClick={() => deleteClass(cls.id)}
                                className="text-sm bg-white border hover:bg-red-50 px-3 py-1 rounded-full flex items-center gap-2"
                                title="Supprimer"
                              >
                                <FaTrash className="text-red-600" /> Supprimer
                              </button>

                              <div ref={optionsRef} className="relative">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setShowOptionsFor(showOptionsFor === cls.id ? null : cls.id); }}
                                  className="p-2 rounded-full hover:bg-gray-100"
                                  title="Plus"
                                >
                                  <FaEllipsisV />
                                </button>

                                {showOptionsFor === cls.id && (
                                  <div className="absolute right-0 mt-2 w-44 bg-white border rounded-lg shadow-lg z-50">
                                    <button
                                      className="w-full text-left px-4 py-2 hover:bg-indigo-50"
                                      onClick={() => { setShowOptionsFor(null); openViewClassModal(cls); }}
                                    >
                                      <FaUsers className="inline mr-2 text-indigo-600" /> Voir personnes
                                    </button>
                                    <button
                                      className="w-full text-left px-4 py-2 hover:bg-gray-50"
                                      onClick={() => { setShowOptionsFor(null); openClassModal(cls); }}
                                    >
                                      <FaEdit className="inline mr-2 text-blue-600" /> Modifier
                                    </button>
                                    <button
                                      className="w-full text-left px-4 py-2 hover:bg-red-50"
                                      onClick={() => { setShowOptionsFor(null); deleteClass(cls.id); }}
                                    >
                                      <FaTrash className="inline mr-2 text-red-600" /> Supprimer
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                {/* Pagination footer (classes) */}
                <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                  <div className="text-sm text-gray-600">
                    Affichage {visibleClasses.length === 0 ? 0 : (classPage - 1) * classPageSize + 1} — {Math.min(classPage * classPageSize, visibleClasses.length)} sur {visibleClasses.length}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={classPageSize}
                      onChange={(e) => { setClassPageSize(Number(e.target.value)); setClassPage(1); }}
                      className="border rounded-lg px-3 py-2"
                    >
                      {[5, 10, 20, 50].map((s) => <option key={s} value={s}>{s} / page</option>)}
                    </select>

                    <button disabled={classPage <= 1} onClick={() => setClassPage((p) => Math.max(1, p - 1))} className="px-3 py-1 rounded-lg bg-white border disabled:opacity-50">Préc</button>
                    <div className="px-3 py-1 bg-white border rounded-lg">{classPage} / {classTotalPages}</div>
                    <button disabled={classPage >= classTotalPages} onClick={() => setClassPage((p) => Math.min(classTotalPages, p + 1))} className="px-3 py-1 rounded-lg bg-white border disabled:opacity-50">Suiv</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* -------------------------
          LEVEL modal (sticky header/footer, scrollable body)
         ------------------------- */}
      {levelModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-0 max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 bg-white z-20 border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">{levelEditTarget ? "Modifier le niveau" : "Ajouter un niveau"}</h2>
              <button onClick={closeLevelModal} className="p-2 rounded-full hover:bg-gray-100"><FaTimes /></button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <input
                type="text"
                placeholder="Nom du niveau"
                value={levelName}
                onChange={(e) => setLevelName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="sticky bottom-0 bg-white z-20 border-t p-4 flex justify-end gap-3">
              <button onClick={closeLevelModal} className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300">Annuler</button>
              <button onClick={submitLevel} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------
          CLASS create/edit modal (sticky header/footer, scrollable body)
         ------------------------- */}
      {classModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-lg max-h-[90vh] overflow-hidden">
            <div className="sticky top-0 bg-white z-20 border-b p-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">{classEditTarget ? "Modifier la classe" : "Nouvelle classe"}</h2>
              <button onClick={closeClassModal} className="p-2 rounded-full hover:bg-gray-100"><FaTimes /></button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-600">Nom</label>
                  <input value={classNameInput} onChange={(e) => setClassNameInput(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2" placeholder="Ex: 3ème A" />
                </div>

                <div>
                  <label className="text-sm text-gray-600">Niveau</label>
                  <select value={classLevelInput} onChange={(e) => setClassLevelInput(e.target.value)} className="mt-1 w-full border rounded-lg px-3 py-2">
                    <option value="">Sélectionner un niveau</option>
                    {levels.map((lvl) => <option key={lvl.id} value={lvl.id}>{lvl.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white z-20 border-t p-4 flex justify-end gap-3">
              <button onClick={closeClassModal} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Annuler</button>
              <button onClick={submitClass} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------
          CLASS view modal (students & teachers) - sticky header/footer and scrollable body
         ------------------------- */}
      {viewModalOpen && viewTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-xl w-full max-w-5xl shadow-2xl p-0 max-h-[90vh] overflow-hidden">
            {/* Sticky header */}
            <div className="sticky top-0 bg-white z-20 border-b p-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800">{viewTarget.name}</h2>
                <p className="text-sm text-gray-500 mt-1">{viewTarget.level?.name || "—"}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={closeViewClassModal} className="p-2 rounded-full bg-gray-100 hover:bg-gray-200" aria-label="Fermer la vue">
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Scrollable body */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-indigo-50 rounded-xl p-4 border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-indigo-700"><FaChalkboardTeacher className="inline mr-2" /> Enseignants</h3>
                    <div className="text-sm text-indigo-600 font-semibold">{loadingTeachers ? "..." : `${teachers.length}`}</div>
                  </div>

                  <div className="mt-4">
                    {loadingTeachers ? (
                      <div className="text-gray-500">Chargement des enseignants...</div>
                    ) : teachers.length === 0 ? (
                      <div className="text-gray-500">Aucun enseignant rattaché à cette classe.</div>
                    ) : (
                      <ul className="space-y-3">
                        {teachers.map((t) => (
                          <li key={t.id} className="bg-white rounded-lg p-3 shadow-sm flex items-center justify-between">
                            <div>
                              <div className="font-medium text-gray-800">{renderPersonName(t)}</div>
                              <div className="text-sm text-gray-500">{t.subject?.name || "Matière non renseignée"}</div>
                            </div>
                            <div className="text-sm text-gray-500">{t.email || ""}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-4 border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-purple-700"><FaUsers className="inline mr-2" /> Élèves</h3>
                    <div className="text-sm text-purple-600 font-semibold">{loadingStudents ? "..." : `${students.length}`}</div>
                  </div>

                  <div className="mt-4">
                    {loadingStudents ? (
                      <div className="text-gray-500">Chargement des élèves...</div>
                    ) : students.length === 0 ? (
                      <div className="text-gray-500">Aucun élève inscrit dans cette classe.</div>
                    ) : (
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {students.map((s) => (
                          <li key={s.id} className="bg-white rounded-lg p-3 shadow-sm">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium text-gray-800">{renderPersonName(s)}</div>
                                <div className="text-sm text-gray-500">Matricule: {s.registration_number || s.id}</div>
                              </div>
                              <div className="text-sm text-gray-500">{s.user?.email || ""}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky footer */}
            <div className="sticky bottom-0 bg-white z-20 border-t p-4 flex justify-end">
              <button onClick={closeViewClassModal} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* small helper style */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.18s ease-out; }

        /* Improve modal visibility on small screens */
        @media (max-height: 700px) {
          .max-h-\\[90vh\\] { max-height: 88vh; }
        }
      `}</style>
    </div>
  );
}
