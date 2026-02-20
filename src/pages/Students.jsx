// src/Students.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  FaSearch, FaPlus, FaEdit, FaTrash, FaSyncAlt,
  FaUserGraduate, FaFilter, FaChevronLeft, FaChevronRight,
  FaTimes, FaMars, FaVenus, FaPhone, FaUpload
} from "react-icons/fa";
import { fetchData, postData, patchData, deleteData } from "./api";

/* --- COMPOSANTS UI --- */
const Avatar = ({ firstName, lastName, color }) => {
  const f = firstName ? firstName[0] : "?";
  const l = lastName ? lastName[0] : "?";
  const initials = (f + l).toUpperCase();

  const bgColors = {
    indigo: "bg-indigo-100 text-indigo-600",
    pink: "bg-pink-100 text-pink-600",
    gray: "bg-slate-200 text-slate-600"
  };

  return (
    <div className={`w-9 h-9 rounded-full ${bgColors[color] || bgColors.gray} flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm`}>
      {initials}
    </div>
  );
};

const Badge = ({ children, color = "gray" }) => {
  const styles = {
    gray: "bg-slate-100 text-slate-600 border-slate-200",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
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

/* --- PAGE PRINCIPALE --- */
const Students = () => {
  // --- ÉTATS ---
  const [students, setStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);

  // Listes pour les <select> (chargées une seule fois)
  const [classesList, setClassesList] = useState([]);
  const [parentsList, setParentsList] = useState([]);

  // UI States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importProgress, setImportProgress] = useState(0);

  // Filtres & Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterClassId, setFilterClassId] = useState("");

  // Formulaire
  const [currentStudent, setCurrentStudent] = useState(null);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    firstName: "",
    lastName: "",
    sex: "M",
    dateOfBirth: "",
    schoolClassId: "",
    parentId: "",
    password: "",
  });

  const latestRequestId = useRef(0);

  /* ----------------------------------------------------------------
   * 1. INITIALISATION (Listes déroulantes)
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [clsData, parData] = await Promise.all([
          fetchData("/academics/school-classes/?page_size=100"),
          fetchData("/core/admin/parents/?page_size=100")
        ]);

        setClassesList(clsData?.results || clsData || []);
        setParentsList(parData?.results || parData || []);
      } catch (err) {
        console.error("Erreur chargement dropdowns:", err);
      }
    };
    fetchDropdowns();
  }, []);

  /* ----------------------------------------------------------------
   * 2. DEBOUNCE
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  /* ----------------------------------------------------------------
   * 3. FETCH STUDENTS (robuste multi-shape)
   * ---------------------------------------------------------------- */
  const normalizeStudent = (s) => {
    // Ensure necessary nested objects exist to avoid render crashes
    const user = s.user || { username: "", first_name: "", last_name: "", email: "" };
    const parent = s.parent || null;
    const school_class = s.school_class || null;
    return { ...s, user, parent, school_class };
  };

  const fetchStudents = async () => {
    setLoading(true);
    const reqId = ++latestRequestId.current;

    try {
      const params = new URLSearchParams();
      params.set("page", currentPage);
      params.set("page_size", pageSize);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterClassId) params.set("school_class", filterClassId);

      const raw = await fetchData(`/core/admin/students/?${params.toString()}`);

      // Debug log to help trace backend shape
      console.debug("fetchStudents - raw response:", raw);

      let studentsList = [];
      let count = 0;

      // Case A: DRF paginated response {count, next, previous, results: [...]}
      if (raw && typeof raw === "object" && Array.isArray(raw.results)) {
        studentsList = raw.results;
        count = raw.count ?? studentsList.length;
      }
      // Case B: backend returned a plain list [...]
      else if (Array.isArray(raw)) {
        studentsList = raw;
        count = raw.length;
      }
      // Case C: backend returned an object but not paginated (maybe {data: [...]})
      else if (raw && typeof raw === "object" && Array.isArray(raw.data)) {
        studentsList = raw.data;
        count = raw.total ?? studentsList.length;
      }
      // Fallback: if raw contains keys 'results' but not array (defensive)
      else if (raw && raw.results && !Array.isArray(raw.results)) {
        console.warn("fetchStudents - unexpected results shape", raw.results);
        studentsList = [];
        count = raw.count ?? 0;
      } else {
        // Unknown shape — try to be forgiving
        studentsList = raw ? (raw.results || raw.data || []) : [];
        count = raw && raw.count ? raw.count : studentsList.length;
      }

      // Normalize elements to always include nested objects
      const normalized = studentsList.map(normalizeStudent);

      if (reqId === latestRequestId.current) {
        setStudents(normalized);
        setTotalStudents(count);
      }
    } catch (err) {
      console.error("fetchStudents error:", err);
      if (reqId === latestRequestId.current) {
        setStudents([]);
        setTotalStudents(0);
      }
    } finally {
      if (reqId === latestRequestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line
  }, [currentPage, pageSize, debouncedSearch, filterClassId]);

  /* ----------------------------------------------------------------
   * 4. FORM HANDLERS
   * ---------------------------------------------------------------- */
  const openModal = (student = null) => {
    setCurrentStudent(student);
    if (student) {
      setFormData({
        username: student.user?.username || "",
        email: student.user?.email || "",
        firstName: student.user?.first_name || "",
        lastName: student.user?.last_name || "",
        sex: student.sex || "M",
        dateOfBirth: student.date_of_birth || "",
        schoolClassId: student.school_class?.id || "",
        parentId: student.parent?.id || "",
        password: "",
      });
    } else {
      setFormData({
        username: "", email: "", firstName: "", lastName: "",
        sex: "M", dateOfBirth: "", schoolClassId: "", parentId: "", password: ""
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName) return alert("Nom et Prénom obligatoires");

    setSaving(true);
    try {
      const payload = {
        user: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
        },
        sex: formData.sex,
        date_of_birth: formData.dateOfBirth || null,
        school_class_id: formData.schoolClassId ? parseInt(formData.schoolClassId) : null,
        parent_id: formData.parentId ? parseInt(formData.parentId) : null,
      };

      if (formData.password) payload.user.password = formData.password;
      if (!currentStudent && formData.username) payload.user.username = formData.username;

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
    if (!window.confirm("Supprimer cet étudiant ?")) return;
    try {
      await deleteData(`/core/admin/students/${id}/`);
      fetchStudents();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  };

  /* ----------------------------------------------------------------
   * 5. IMPORT (UI + upload logic)
   * ---------------------------------------------------------------- */
  const handleFileSelect = async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    uploadFile(file, e);
  };

  const uploadFile = async (file, event) => {
    setImporting(true);
    setImportProgress(0);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("access_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await fetch("/api/core/admin/students/import-csv/", {
        method: "POST",
        headers,
        body: formData,
      });

      const text = await response.text();
      let data = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch (e) {
        console.warn("Import response not JSON:", text);
      }

      if (!response.ok) {
        const errMsg = (data && (data.detail || data.message)) || text || `Erreur serveur (${response.status})`;
        throw new Error(errMsg);
      }

      setImportProgress(100);
      setImportResult(data || { total_rows: 0, results: [] });

      // refresh listing after successful import
      fetchStudents();
    } catch (error) {
      console.error("Import error:", error);
      setImportResult({ error: error.message || "Erreur lors de l'import." });
      setImportProgress(0);
    } finally {
      setImporting(false);
      if (event?.target) event.target.value = "";
    }
  };

  /* ----------------------------------------------------------------
   * 6. RENDU
   * ---------------------------------------------------------------- */
  const totalPages = Math.ceil((totalStudents || 0) / (pageSize || 1));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans">

      {/* HEADER & FILTRES */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
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

            <div className="flex gap-2">
              <button onClick={fetchStudents} className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition">
                <FaSyncAlt className={loading ? "animate-spin" : ""} />
              </button>

              <label className="inline-flex items-center gap-2 px-3 py-2 border rounded bg-white hover:bg-slate-50 cursor-pointer text-sm">
                <FaUpload /> <span className="text-xs">Importer</span>
                <input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleFileSelect} className="hidden" />
              </label>

              <button onClick={() => openModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700 flex items-center gap-2 text-sm font-bold transition">
                <FaPlus /> Nouveau
              </button>
            </div>
          </div>

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

      {/* TABLEAU */}
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
                    const user = student.user || {};
                    const parent = student.parent;
                    const schoolClass = student.school_class;

                    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "—";
                    const className = schoolClass ? schoolClass.name : "Non inscrit";

                    let parentName = "—";
                    let parentPhone = null;
                    if (parent && parent.user) {
                      parentName = `${parent.user.first_name || ""} ${parent.user.last_name || ""}`.trim();
                      parentPhone = parent.phone;
                    }

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/50 group transition">
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar firstName={user.first_name} lastName={user.last_name} color={student.sex === 'F' ? 'pink' : 'indigo'} />
                            <div>
                              <div className="font-bold text-slate-700">{fullName}</div>
                              <div className="text-xs text-slate-400 font-mono">ID: {student.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          {student.sex === 'F' ?
                            <span className="text-pink-500 font-bold text-xs flex items-center gap-1"><FaVenus /> F</span> :
                            <span className="text-indigo-500 font-bold text-xs flex items-center gap-1"><FaMars /> M</span>
                          }
                        </td>
                        <td className="px-6 py-3">
                          <Badge color={schoolClass ? "indigo" : "gray"}>
                            {className}
                          </Badge>
                        </td>
                        <td className="px-6 py-3 text-slate-600">
                          {parent ? (
                            <div className="flex flex-col">
                              <span className="font-medium text-xs">{parentName}</span>
                              {parentPhone && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <FaPhone size={8} /> {parentPhone}
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
                    <tr><td colSpan="5" className="px-6 py-10 text-center text-slate-400 italic">Aucun étudiant trouvé.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
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

      {/* MODAL AJOUT / ÉDITION */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={currentStudent ? "Modifier l'étudiant" : "Nouvel étudiant"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Prénom</label>
              <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Nom</label>
              <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email</label>
            <input type="email" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
              value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
          </div>

          {!currentStudent && (
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Nom d'utilisateur (Login)</label>
              <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Sexe</label>
              <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Date Naissance</label>
              <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={formData.dateOfBirth} onChange={e => setFormData({ ...formData, dateOfBirth: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="block text-[11px] font-bold text-indigo-400 uppercase mb-1">Classe</label>
              <select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={formData.schoolClassId} onChange={e => setFormData({ ...formData, schoolClassId: e.target.value })}>
                <option value="">-- Non attribuée --</option>
                {classesList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-indigo-400 uppercase mb-1">Parent</label>
              <select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
                value={formData.parentId} onChange={e => setFormData({ ...formData, parentId: e.target.value })}>
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
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Mot de passe {currentStudent && "(Optionnel)"}</label>
            <input type="password" placeholder="••••••••" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition"
              value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-50 mt-2">
            <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 transition">
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50">
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </Modal>

      {/* IMPORT RESULT MODAL */}
      <Modal isOpen={importing || showImportModal || !!importResult} onClose={() => { setShowImportModal(false); setImportResult(null); }}>
        <div className="space-y-4">
          <h3 className="text-lg font-bold">Import CSV / XLSX</h3>

          <div className="text-sm text-slate-600">
            <p>Sélectionnez un fichier .csv ou .xlsx (max côté client). Colonnes acceptées : <code>first_name,last_name,email,date_of_birth,sex,school_class,school_class_id,parent_id,username,password</code></p>
          </div>

          <div className="flex items-center gap-3">
            <input type="file" accept=".csv,.xlsx,.xls,.txt" onChange={handleFileSelect} />
            {importing ? <div className="text-sm text-slate-500">Import en cours... {importProgress}%</div> : null}
          </div>

          {importResult && (
            <div className="mt-4 text-sm">
              {importResult.error ? (
                <div className="text-red-600">Erreur: {importResult.error}</div>
              ) : (
                <>
                  <div>Total lignes: {importResult.total_rows ?? "?"}</div>
                  <div className="max-h-48 overflow-y-auto mt-2">
                    {Array.isArray(importResult.results) ? (
                      importResult.results.slice(0, 200).map((r, i) => (
                        <div key={i} className={`text-xs py-1 ${r.success ? "text-green-700" : "text-red-700"}`}>
                          Ligne {r.row} • {r.username || ""} • {r.success ? "ok" : (typeof r.error === "string" ? r.error : JSON.stringify(r.error))}
                        </div>
                      ))
                    ) : (
                      <pre className="text-xs">{JSON.stringify(importResult, null, 2)}</pre>
                    )}
                  </div>
                </>
              )}
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