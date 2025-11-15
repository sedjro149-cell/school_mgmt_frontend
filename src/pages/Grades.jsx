// src/pages/Grades.jsx
import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaSearch } from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";

export default function Grades() {
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ student: "", subject: "", term: "", school_class: "" });

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
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");
  const [globalError, setGlobalError] = useState("");

  // ---------- Initial fetch: classes & subjects ----------
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoadingInitial(true);
      setGlobalError("");
      try {
        const [classesData, subjectsData] = await Promise.all([
          fetchData("/academics/school-classes/"),
          fetchData("/academics/subjects/"),
        ]);
        if (!mounted) return;
        setClasses(Array.isArray(classesData) ? classesData : classesData.results ?? []);
        setSubjects(Array.isArray(subjectsData) ? subjectsData : subjectsData.results ?? []);
      } catch (err) {
        console.error("Erreur chargement initial :", err);
        setGlobalError("Impossible de charger les données initiales.");
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // ---------- Load students when a class is selected ----------
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
      setGlobalError("");
      try {
        const data = await fetchData(`/core/admin/students/by-class/${cls}/`);
        if (!mounted) return;
        setStudents(Array.isArray(data) ? data : data.results ?? []);
        // reset selected student when class changes
        setFilters(prev => ({ ...prev, student: "" }));
      } catch (err) {
        console.error("Erreur récupération élèves :", err);
        setGlobalError("Impossible de charger les élèves de la classe sélectionnée.");
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    };
    loadStudents();
    return () => { mounted = false; };
  }, [filters.school_class]);

  // ---------- Fetch grades with current filters ----------
  const fetchGrades = async () => {
    setLoadingGrades(true);
    setGlobalError("");
    try {
      const params = {};
      if (filters.school_class) params.school_class = filters.school_class;
      if (filters.student) params.student = filters.student;
      if (filters.subject) params.subject = filters.subject;
      if (filters.term) params.term = filters.term;
      // optional: include search param server-side if supported
      if (search?.trim()) params.search = search.trim();

      const data = await fetchData("/academics/grades/", { params });
      setGrades(Array.isArray(data) ? data : data.results ?? []);
    } catch (err) {
      console.error("Erreur récupération notes :", err);
      setGlobalError("Impossible de récupérer les notes.");
    } finally {
      setLoadingGrades(false);
    }
  };

  // ---------- Submit create / update ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");
    setGlobalError("");

    if (!form.student_id || !form.subject_id) {
      setErrorMessage("Les champs élève et matière sont obligatoires.");
      return;
    }

    const payload = {
      student_id: form.student_id,
      subject_id: form.subject_id,
      term: form.term || "T1",
      interrogation1: form.interrogation1 || null,
      interrogation2: form.interrogation2 || null,
      interrogation3: form.interrogation3 || null,
      devoir1: form.devoir1 || null,
      devoir2: form.devoir2 || null,
    };

    try {
      if (form.id) {
        // update
        await putData(`/academics/grades/${form.id}/`, payload);
      } else {
        // create
        await postData("/academics/grades/", payload);
      }

      // reset form & refresh
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
      await fetchGrades();
    } catch (err) {
      // parse API error to give a friendly message
      const apiData = err?.response?.data;
      console.error("Erreur lors de l'envoi :", apiData || err);
      if (apiData) {
        if (apiData.subject) {
          setErrorMessage(Array.isArray(apiData.subject) ? apiData.subject.join(" ") : String(apiData.subject));
        } else if (apiData.non_field_errors) {
          setErrorMessage(Array.isArray(apiData.non_field_errors) ? apiData.non_field_errors.join(" ") : String(apiData.non_field_errors));
        } else {
          // flatten other field errors
          try {
            const parts = [];
            Object.entries(apiData).forEach(([k, v]) => {
              if (Array.isArray(v)) parts.push(`${k}: ${v.join(" ")}`);
              else parts.push(`${k}: ${v}`);
            });
            setErrorMessage(parts.join(" | "));
          } catch {
            setErrorMessage("Erreur lors de l'envoi (réponse API inattendue).");
          }
        }
      } else {
        setErrorMessage("Erreur réseau ou serveur lors de l'envoi.");
      }
    }
  };

  // ---------- Edit / Delete helpers ----------
  const handleEdit = (g) => {
    setForm({
      id: g.id,
      student_id: g.student_id ?? g.student ?? "",
      subject_id: g.subject_id ?? g.subject ?? "",
      term: g.term ?? "T1",
      interrogation1: g.interrogation1 ?? "",
      interrogation2: g.interrogation2 ?? "",
      interrogation3: g.interrogation3 ?? "",
      devoir1: g.devoir1 ?? "",
      devoir2: g.devoir2 ?? "",
    });
    setErrorMessage("");
    // ensure students list contains the student (if class not selected)
    if (g.school_class && !filters.school_class) {
      setFilters(prev => ({ ...prev, school_class: g.school_class }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette note ?")) return;
    setGlobalError("");
    try {
      await deleteData(`/academics/grades/${id}/`);
      await fetchGrades();
    } catch (err) {
      console.error("Erreur lors de la suppression :", err);
      setGlobalError("Impossible de supprimer la note.");
    }
  };

  // ---------- small helpers ----------
  const studentLabel = (s) => {
    if (!s) return "—";
    if (s.user) return `${s.user.first_name || ""} ${s.user.last_name || ""}`.trim();
    return s.name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || "—";
  };

  // ---------- render ----------
  return (
    <div className="p-6 bg-gray-100 min-h-screen space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">📝 Gestion des Notes</h1>

      {globalError && <div className="bg-red-50 text-red-700 p-3 rounded">{globalError}</div>}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-center">
        <div className="flex items-center flex-1">
          <FaSearch className="text-gray-400 mr-2" />
          <input
            type="text"
            placeholder="Rechercher (nom élève ou matière)..."
            className="border rounded p-2 flex-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="border rounded p-2"
          value={filters.school_class}
          onChange={(e) => setFilters({ ...filters, school_class: e.target.value })}
        >
          <option value="">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.level?.name ? `(${c.level.name})` : ""}
            </option>
          ))}
        </select>

        <select
          className="border rounded p-2"
          value={filters.student}
          onChange={(e) => setFilters({ ...filters, student: e.target.value })}
        >
          {loadingStudents ? (
            <option>Chargement...</option>
          ) : students.length === 0 ? (
            <option value="">Aucun élève</option>
          ) : (
            <>
              <option value="">Tous les élèves</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {studentLabel(s)}
                </option>
              ))}
            </>
          )}
        </select>

        <select
          className="border rounded p-2"
          value={filters.subject}
          onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
        >
          <option value="">Toutes les matières</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="border rounded p-2"
          value={filters.term}
          onChange={(e) => setFilters({ ...filters, term: e.target.value })}
        >
          <option value="">Tous les trimestres</option>
          <option value="T1">1er trimestre</option>
          <option value="T2">2e trimestre</option>
          <option value="T3">3e trimestre</option>
        </select>

        <button
          onClick={fetchGrades}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-full hover:from-indigo-600 hover:to-blue-500 transition"
        >
          Rechercher
        </button>
      </div>

      {/* Form add / edit */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{form.id ? "Modifier une note" : "Ajouter une note"}</h2>
        <form className="grid grid-cols-1 md:grid-cols-4 gap-4" onSubmit={handleSubmit}>
          <select
            className="border rounded p-2"
            value={form.student_id}
            onChange={(e) => setForm({ ...form, student_id: e.target.value })}
          >
            <option value="">-- Choisir élève --</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {studentLabel(s)}
              </option>
            ))}
          </select>

          <select
            className="border rounded p-2"
            value={form.subject_id}
            onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
          >
            <option value="">-- Choisir matière --</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            className="border rounded p-2"
            value={form.term}
            onChange={(e) => setForm({ ...form, term: e.target.value })}
          >
            <option value="T1">1er trimestre</option>
            <option value="T2">2e trimestre</option>
            <option value="T3">3e trimestre</option>
          </select>

          {["interrogation1","interrogation2","interrogation3","devoir1","devoir2"].map((f) => (
            <input
              key={f}
              type="number"
              step="0.01"
              placeholder={f}
              className="border rounded p-2"
              value={form[f]}
              onChange={(e) => setForm({ ...form, [f]: e.target.value })}
            />
          ))}

          <div className="md:col-span-4">
            <button
              type="submit"
              className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-2 rounded-full hover:from-teal-500 hover:to-green-500 transition"
            >
              {form.id ? "Modifier" : "Ajouter"}
            </button>
          </div>
        </form>

        {/* error message */}
        {errorMessage && (
          <div className="mt-4">
            <p className="text-red-600">{errorMessage}</p>
          </div>
        )}
      </div>

      {/* Grades list */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loadingGrades ? (
          <p className="col-span-2 text-center text-gray-500 py-4">Chargement des notes...</p>
        ) : grades.length === 0 ? (
          <p className="col-span-2 text-center text-gray-500 py-4">Aucune note trouvée.</p>
        ) : (
          grades
            .filter((g) => {
              if (!search?.trim()) return true;
              const q = search.toLowerCase();
              const name = `${g.student_firstname ?? ""} ${g.student_lastname ?? ""} ${g.subject_name ?? ""}`.toLowerCase();
              return name.includes(q);
            })
            .map((g) => (
              <div
                key={g.id}
                className="bg-white rounded-2xl shadow-lg p-4 flex flex-col md:flex-row justify-between items-start gap-4 border-l-4 border-blue-400 hover:shadow-2xl transition"
              >
                <div className="flex-1 flex flex-col gap-2">
                  <p className="font-semibold text-gray-800">
                    {g.student_firstname} {g.student_lastname} ({g.student_class}) - {g.subject_name} • {g.term}
                  </p>
                  <p className="text-sm text-gray-500">
                    I1: {g.interrogation1 ?? "-"}, I2: {g.interrogation2 ?? "-"}, I3: {g.interrogation3 ?? "-"} • D1: {g.devoir1 ?? "-"}, D2: {g.devoir2 ?? "-"}
                  </p>
                  <p className="text-sm text-gray-600">Moy. interros: {g.average_interro ?? "-"}, Moy. matière: {g.average_subject ?? "-"}, Moy. coef: {g.average_coeff ?? "-"}</p>
                </div>

                <div className="flex gap-2 mt-2 md:mt-0">
                  <button
                    onClick={() => handleEdit(g)}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-full hover:bg-yellow-600 flex items-center gap-1"
                  >
                    <FaEdit /> Modifier
                  </button>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="bg-red-600 text-white px-4 py-2 rounded-full hover:bg-red-700 flex items-center gap-1"
                  >
                    <FaTrash /> Supprimer
                  </button>
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
}
