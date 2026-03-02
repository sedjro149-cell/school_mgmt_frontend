// src/Students.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  FaSearch, FaPlus, FaEdit, FaTrash, FaSyncAlt,
  FaUserGraduate, FaFilter, FaChevronLeft, FaChevronRight,
  FaTimes, FaMars, FaVenus, FaPhone, FaUpload,
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle,
} from "react-icons/fa";
import { fetchData, postData, patchData, deleteData, postFormData } from "./api";

// ---------------------------------------------------------------------------
// Composants UI partagés
// ---------------------------------------------------------------------------

const Avatar = ({ firstName, lastName, color }) => {
  const initials = ((firstName?.[0] || "?") + (lastName?.[0] || "?")).toUpperCase();
  const palette = {
    indigo: "bg-indigo-100 text-indigo-600",
    pink:   "bg-pink-100 text-pink-600",
    gray:   "bg-slate-200 text-slate-600",
  };
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm ${palette[color] || palette.gray}`}>
      {initials}
    </div>
  );
};

const Badge = ({ children, color = "gray" }) => {
  const styles = {
    gray:   "bg-slate-100 text-slate-600 border-slate-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wide ${styles[color]}`}>
      {children}
    </span>
  );
};

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition">
            <FaTimes />
          </button>
        </div>
        <div className="p-6 overflow-y-auto custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

const Students = () => {

  // --- États données ---
  const [students,      setStudents]      = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [classesList,   setClassesList]   = useState([]);
  const [parentsList,   setParentsList]   = useState([]);

  // --- États UI ---
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [showModal,  setShowModal]  = useState(false);

  // --- Import ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing,       setImporting]       = useState(false);
  const [importResult,    setImportResult]    = useState(null); // null | { total_rows, success_count, error_count, results } | { error }
  const importFileRef = useRef(null);

  // --- Filtres & Pagination ---
  const [currentPage,     setCurrentPage]     = useState(1);
  const [pageSize]                            = useState(10);
  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterClassId,   setFilterClassId]   = useState("");

  // --- Formulaire étudiant ---
  const [currentStudent, setCurrentStudent] = useState(null);
  const [studentForm,    setStudentForm]    = useState({
    username: "", email: "", firstName: "", lastName: "",
    sex: "M", dateOfBirth: "", schoolClassId: "", parentId: "", password: "",
  });

  const latestRequestId = useRef(0);

  // -------------------------------------------------------------------------
  // 1. Chargement des listes déroulantes (une seule fois)
  // -------------------------------------------------------------------------
  useEffect(() => {
    const load = async () => {
      try {
        const [clsData, parData] = await Promise.all([
          fetchData("/academics/school-classes/?page_size=100"),
          fetchData("/core/admin/parents/?page_size=100"),
        ]);
        setClassesList(clsData?.results ?? clsData ?? []);
        setParentsList(parData?.results  ?? parData  ?? []);
      } catch (err) {
        console.error("Erreur chargement dropdowns:", err);
      }
    };
    load();
  }, []);

  // -------------------------------------------------------------------------
  // 2. Debounce de la recherche
  // -------------------------------------------------------------------------
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // -------------------------------------------------------------------------
  // 3. Chargement des élèves
  // -------------------------------------------------------------------------
  const normalizeStudent = (s) => ({
    ...s,
    user:         s.user         ?? { username: "", first_name: "", last_name: "", email: "" },
    parent:       s.parent       ?? null,
    school_class: s.school_class ?? null,
  });

  const fetchStudents = async () => {
    setLoading(true);
    const reqId = ++latestRequestId.current;
    try {
      const params = new URLSearchParams({
        page:      currentPage,
        page_size: pageSize,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filterClassId   && { school_class: filterClassId }),
      });
      const raw = await fetchData(`/core/admin/students/?${params}`);
      if (reqId !== latestRequestId.current) return;

      let list = [], count = 0;
      if (Array.isArray(raw?.results)) { list = raw.results; count = raw.count ?? list.length; }
      else if (Array.isArray(raw))     { list = raw;          count = raw.length; }
      else if (Array.isArray(raw?.data)){ list = raw.data;   count = raw.total ?? list.length; }

      setStudents(list.map(normalizeStudent));
      setTotalStudents(count);
    } catch (err) {
      console.error("fetchStudents error:", err);
      if (reqId === latestRequestId.current) { setStudents([]); setTotalStudents(0); }
    } finally {
      if (reqId === latestRequestId.current) setLoading(false);
    }
  };

  useEffect(() => { fetchStudents(); }, [currentPage, pageSize, debouncedSearch, filterClassId]); // eslint-disable-line

  // -------------------------------------------------------------------------
  // 4. Formulaire étudiant (add / edit)
  // -------------------------------------------------------------------------
  const openModal = (student = null) => {
    setCurrentStudent(student);
    setStudentForm(student ? {
      username:     student.user?.username      ?? "",
      email:        student.user?.email         ?? "",
      firstName:    student.user?.first_name    ?? "",
      lastName:     student.user?.last_name     ?? "",
      sex:          student.sex                 ?? "M",
      dateOfBirth:  student.date_of_birth       ?? "",
      schoolClassId: student.school_class?.id   ?? "",
      parentId:     student.parent?.id          ?? "",
      password:     "",
    } : {
      username: "", email: "", firstName: "", lastName: "",
      sex: "M", dateOfBirth: "", schoolClassId: "", parentId: "", password: "",
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!studentForm.firstName || !studentForm.lastName) return alert("Prénom et Nom sont obligatoires.");
    setSaving(true);
    try {
      const payload = {
        user: {
          first_name: studentForm.firstName,
          last_name:  studentForm.lastName,
          email:      studentForm.email,
          ...(studentForm.password && { password: studentForm.password }),
          ...(!currentStudent && studentForm.username && { username: studentForm.username }),
        },
        sex:            studentForm.sex,
        date_of_birth:  studentForm.dateOfBirth || null,
        school_class_id: studentForm.schoolClassId ? parseInt(studentForm.schoolClassId) : null,
        parent_id:       studentForm.parentId      ? parseInt(studentForm.parentId)      : null,
      };
      if (currentStudent) {
        await patchData(`/core/admin/students/${currentStudent.id}/`, payload);
      } else {
        await postData("/core/admin/students/", payload);
      }
      setShowModal(false);
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement. Vérifiez les champs.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet étudiant définitivement ?")) return;
    try {
      await deleteData(`/core/admin/students/${id}/`);
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression.");
    }
  };

  // -------------------------------------------------------------------------
  // 5. Import CSV / XLSX
  //
  // Corrections apportées :
  //   - URL absolue construite avec API_BASE (évite le 404 dû au port Vite)
  //   - UN SEUL point d'entrée : bouton "Importer" → ouvre le modal
  //     Le fichier est sélectionné UNIQUEMENT depuis l'input dans le modal
  //   - Variable locale renommée "fd" (FormData) pour ne pas shadow le state
  //   - showImportModal correctement piloté
  //   - Affichage des champs success_count / error_count du nouveau backend
  //   - Reset propre de l'input file après upload
  // -------------------------------------------------------------------------
  const openImportModal = () => {
    setImportResult(null);
    setImporting(false);
    setShowImportModal(true);
  };

  const closeImportModal = () => {
    if (importing) return; // empêche la fermeture pendant l'upload
    setShowImportModal(false);
    setImportResult(null);
    if (importFileRef.current) importFileRef.current.value = "";
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImportFile(file);
  };

  const uploadImportFile = async (file) => {
    setImporting(true);
    setImportResult(null);

    // "fd" pour ne pas shadow le state React "studentForm"
    const fd = new FormData();
    fd.append("file", file);

    try {
      // postFormData de api.js gère buildUrl (local + Railway), auth JWT,
      // et ne pose pas de Content-Type → le navigateur fixe la boundary seul
      const data = await postFormData("/core/admin/students/import-csv/", fd);

      // Réponse attendue : { total_rows, success_count, error_count, results: [...] }
      setImportResult(data ?? { total_rows: 0, success_count: 0, error_count: 0, results: [] });

      if ((data?.success_count ?? 0) > 0) fetchStudents();

    } catch (err) {
      console.error("Import error:", err);
      // err.body peut contenir le detail Django si la réponse était du JSON
      const msg = err.body?.detail ?? err.body?.message ?? err.message ?? "Erreur inconnue lors de l'import.";
      setImportResult({ error: msg });
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value = "";
    }
  };

  // -------------------------------------------------------------------------
  // 6. Rendu
  // -------------------------------------------------------------------------
  const totalPages = Math.ceil((totalStudents || 0) / pageSize);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">

      {/* ------------------------------------------------------------------ */}
      {/* HEADER                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">

            {/* Titre */}
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <FaUserGraduate size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Étudiants</h1>
                <p className="text-xs text-slate-500">
                  {totalStudents} inscrit{totalStudents > 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={fetchStudents}
                className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition"
                title="Rafraîchir"
              >
                <FaSyncAlt className={loading ? "animate-spin" : ""} />
              </button>

              {/* Bouton Import — ouvre le modal, pas d'input file ici */}
              <button
                onClick={openImportModal}
                className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-sm font-medium text-slate-600 transition"
              >
                <FaUpload size={12} />
                <span className="text-xs">Importer</span>
              </button>

              <button
                onClick={() => openModal()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 flex items-center gap-2 text-sm font-bold transition"
              >
                <FaPlus /> Nouveau
              </button>
            </div>
          </div>

          {/* Filtres */}
          <div className="mt-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <FaSearch className="absolute left-3 top-3 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher (Nom, ID, Email...)"
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-300 rounded-lg text-sm outline-none transition"
              />
            </div>
            <div className="relative md:w-64">
              <select
                value={filterClassId}
                onChange={(e) => { setFilterClassId(e.target.value); setCurrentPage(1); }}
                className="w-full pl-3 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-300 appearance-none"
              >
                <option value="">Toutes les classes</option>
                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <FaFilter className="absolute right-3 top-3 text-slate-400 pointer-events-none text-xs" />
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* TABLEAU                                                             */}
      {/* ------------------------------------------------------------------ */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading && students.length === 0 ? (
            <div className="p-10 text-center text-slate-400">Chargement des données...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Étudiant</th>
                    <th className="px-6 py-4">Sexe</th>
                    <th className="px-6 py-4">Classe</th>
                    <th className="px-6 py-4">Parent</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {students.map((student) => {
                    const user        = student.user        || {};
                    const parent      = student.parent;
                    const schoolClass = student.school_class;
                    const fullName    = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "—";
                    const parentName  = parent?.user
                      ? `${parent.user.first_name || ""} ${parent.user.last_name || ""}`.trim()
                      : null;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 group transition">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar firstName={user.first_name} lastName={user.last_name} color={student.sex === "F" ? "pink" : "indigo"} />
                            <div>
                              <div className="font-bold text-slate-700">{fullName}</div>
                              <div className="text-xs text-slate-400 font-mono">ID: {student.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          {student.sex === "F"
                            ? <span className="text-pink-500 font-bold text-xs flex items-center gap-1"><FaVenus /> F</span>
                            : <span className="text-indigo-500 font-bold text-xs flex items-center gap-1"><FaMars /> M</span>
                          }
                        </td>
                        <td className="px-6 py-3">
                          <Badge color={schoolClass ? "indigo" : "gray"}>
                            {schoolClass?.name ?? "Non inscrit"}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-slate-600">
                          {parent ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-xs">{parentName}</span>
                              {parent.phone && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <FaPhone size={8} /> {parent.phone}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="italic text-slate-400 text-xs">Aucun parent lié</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => openModal(student)} className="p-1.5 border rounded hover:text-indigo-600 hover:bg-slate-50" title="Modifier">
                              <FaEdit />
                            </button>
                            <button onClick={() => handleDelete(student.id)} className="p-1.5 border rounded hover:text-red-600 hover:bg-slate-50" title="Supprimer">
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && students.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-10 text-center text-slate-400 italic">Aucun étudiant trouvé.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 flex justify-between items-center bg-slate-50/30">
            <span className="text-xs text-slate-500">Page {currentPage} sur {totalPages || 1}</span>
            <div className="flex gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-1 px-3 border rounded bg-white disabled:opacity-50 hover:bg-slate-50">
                <FaChevronLeft size={10} />
              </button>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1 px-3 border rounded bg-white disabled:opacity-50 hover:bg-slate-50">
                <FaChevronRight size={10} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL — Ajout / Édition étudiant                                   */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={currentStudent ? "Modifier l'étudiant" : "Nouvel étudiant"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Prénom</label>
              <input
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={studentForm.firstName}
                onChange={e => setStudentForm(f => ({ ...f, firstName: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Nom</label>
              <input
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={studentForm.lastName}
                onChange={e => setStudentForm(f => ({ ...f, lastName: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
              value={studentForm.email}
              onChange={e => setStudentForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>

          {!currentStudent && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Nom d'utilisateur (Login)</label>
              <input
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={studentForm.username}
                onChange={e => setStudentForm(f => ({ ...f, username: e.target.value }))}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Sexe</label>
              <select
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={studentForm.sex}
                onChange={e => setStudentForm(f => ({ ...f, sex: e.target.value }))}
              >
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Date de naissance</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={studentForm.dateOfBirth}
                onChange={e => setStudentForm(f => ({ ...f, dateOfBirth: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-indigo-400 uppercase mb-1">Classe</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={studentForm.schoolClassId}
                onChange={e => setStudentForm(f => ({ ...f, schoolClassId: e.target.value }))}
              >
                <option value="">-- Non attribuée --</option>
                {classesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-indigo-400 uppercase mb-1">Parent</label>
              <select
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={studentForm.parentId}
                onChange={e => setStudentForm(f => ({ ...f, parentId: e.target.value }))}
              >
                <option value="">-- Aucun --</option>
                {parentsList.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.user ? `${p.user.first_name} ${p.user.last_name}` : `Parent #${p.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Mot de passe {currentStudent ? "(laisser vide pour ne pas changer)" : ""}
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
              value={studentForm.password}
              onChange={e => setStudentForm(f => ({ ...f, password: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() => setShowModal(false)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition"
            >
              Annuler
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL — Import CSV / XLSX                                          */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        isOpen={showImportModal}
        onClose={closeImportModal}
        title="Import CSV / XLSX"
      >
        <div className="space-y-5">

          {/* Instructions */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500 space-y-1">
            <p className="font-bold text-slate-600 mb-2">Colonnes acceptées</p>
            <p><span className="font-semibold text-red-500">Obligatoires :</span> <code>first_name</code>, <code>last_name</code></p>
            <p>
              <span className="font-semibold text-slate-500">Facultatifs :</span>{" "}
              <code>email</code>, <code>date_of_birth</code>, <code>sex</code> (M/F),{" "}
              <code>school_class</code> (ID), <code>parent_id</code>, <code>username</code>, <code>password</code>
            </p>
            <p className="pt-1 text-slate-400">Formats acceptés : .csv, .txt, .xlsx, .xls — max 1 000 lignes</p>
          </div>

          {/* Zone de sélection de fichier */}
          {!importing && !importResult && (
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-indigo-200 rounded-xl p-8 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/40 transition">
              <FaUpload className="text-indigo-400 text-2xl" />
              <span className="text-sm font-medium text-slate-600">Cliquez pour choisir un fichier</span>
              <span className="text-xs text-slate-400">.csv, .xlsx, .xls, .txt</span>
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt"
                onChange={handleImportFileChange}
                className="hidden"
              />
            </label>
          )}

          {/* État : import en cours */}
          {importing && (
            <div className="flex flex-col items-center gap-3 py-6 text-slate-500">
              <FaSyncAlt className="animate-spin text-indigo-500 text-2xl" />
              <p className="text-sm font-medium">Import en cours, veuillez patienter...</p>
            </div>
          )}

          {/* Résultats */}
          {importResult && !importing && (
            <div className="space-y-4">

              {/* Erreur globale (réseau, format, etc.) */}
              {importResult.error ? (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
                  <FaTimesCircle className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold">Erreur d'import</p>
                    <p className="text-xs mt-1">{importResult.error}</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Résumé succès / erreurs */}
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl py-3">
                      <p className="text-lg font-bold text-slate-700">{importResult.total_rows ?? "—"}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold">Total</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl py-3">
                      <p className="text-lg font-bold text-green-700">{importResult.success_count ?? "—"}</p>
                      <p className="text-[10px] text-green-500 uppercase font-bold">Importés</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl py-3">
                      <p className="text-lg font-bold text-red-700">{importResult.error_count ?? "—"}</p>
                      <p className="text-[10px] text-red-400 uppercase font-bold">Erreurs</p>
                    </div>
                  </div>

                  {/* Détail ligne par ligne */}
                  {Array.isArray(importResult.results) && importResult.results.length > 0 && (
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 divide-y divide-slate-50 custom-scrollbar">
                      {importResult.results.map((r, i) => (
                        <div
                          key={i}
                          className={`flex items-start gap-2 px-3 py-2 text-xs ${r.success ? "bg-white text-slate-600" : "bg-red-50 text-red-700"}`}
                        >
                          {r.success
                            ? <FaCheckCircle className="text-green-500 mt-0.5 flex-shrink-0" />
                            : <FaTimesCircle className="text-red-500 mt-0.5 flex-shrink-0" />
                          }
                          <div className="min-w-0">
                            <span className="font-bold">Ligne {r.row}</span>
                            {r.username && <span className="text-slate-400"> · {r.username}</span>}
                            {!r.success && (
                              <p className="text-red-600 mt-0.5 break-words">
                                {typeof r.error === "string" ? r.error : JSON.stringify(r.error)}
                              </p>
                            )}
                            {r.warnings?.map((w, wi) => (
                              <p key={wi} className="text-amber-600 flex items-center gap-1 mt-0.5">
                                <FaExclamationTriangle size={9} /> {w}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Bouton pour relancer un autre import */}
              <button
                onClick={() => {
                  setImportResult(null);
                  if (importFileRef.current) importFileRef.current.value = "";
                }}
                className="w-full py-2 border border-slate-200 rounded-xl text-sm text-slate-500 hover:bg-slate-50 transition"
              >
                Importer un autre fichier
              </button>
            </div>
          )}
        </div>
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Students;