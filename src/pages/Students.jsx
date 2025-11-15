// src/pages/Students.jsx
import React, { useEffect, useMemo, useState } from "react";
import { fetchData, postData, patchData, deleteData } from "./api";

/**
 * Students.jsx (Design modernisé + barre de recherche + pagination)
 */

const Students = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [parents, setParents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);

  // champs modal
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [schoolClass, setSchoolClass] = useState("");
  const [parentId, setParentId] = useState("");
  const [password, setPassword] = useState("");

  // filtres + recherche + pagination
  const [filterClassId, setFilterClassId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchAll = async (byClassId = null) => {
    setLoading(true);
    setError("");
    try {
      const studentsUrl = byClassId
        ? `/core/admin/students/by-class/${byClassId}/`
        : `/core/admin/students/`;
      const [studentsData, classesData, parentsData] = await Promise.all([
        fetchData(studentsUrl),
        fetchData("/academics/school-classes/"),
        fetchData("/core/admin/parents/"),
      ]);
      setStudents(Array.isArray(studentsData) ? studentsData : studentsData?.results || []);
      setClasses(Array.isArray(classesData) ? classesData : classesData?.results || []);
      setParents(Array.isArray(parentsData) ? parentsData : parentsData?.results || []);
    } catch (err) {
      console.error("fetchAll error:", err?.body ?? err?.message ?? err);
      if (err?.status === 401) {
        setError("Non autorisé — connectez-vous.");
      } else {
        setError("Erreur lors de la récupération des données.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreateModal = () => {
    setCurrentStudent(null);
    setUsername("");
    setEmail("");
    setFirstName("");
    setLastName("");
    setDateOfBirth("");
    setSchoolClass("");
    setParentId("");
    setPassword("");
    setShowModal(true);
  };

  const openEditModal = (student) => {
    setCurrentStudent(student);
    const first = student.user?.first_name ?? student.firstname ?? "";
    const last = student.user?.last_name ?? student.lastname ?? "";
    setUsername(student.user?.username ?? "");
    setEmail(student.user?.email ?? "");
    setFirstName(first);
    setLastName(last);
    setDateOfBirth(student.date_of_birth ?? "");
    setSchoolClass(student.school_class?.id ?? "");
    setParentId(student.parent?.id ?? "");
    setPassword("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentStudent(null);
  };

  const handleSubmit = async () => {
    if (!email || !firstName || !lastName) {
      alert("Email, prénom et nom sont requis.");
      return;
    }
    if (!currentStudent && (!username || !password || !dateOfBirth || !schoolClass)) {
      alert("Pour créer : username, password, date de naissance et classe sont requis.");
      return;
    }

    setSaving(true);

    try {
      if (currentStudent) {
        const userPayload = { email, first_name: firstName, last_name: lastName };
        if (password) userPayload.password = password;
        const payload = {
          user: userPayload,
          school_class_id: schoolClass || null,
          parent_id: parentId || null,
        };
        if (dateOfBirth) payload.date_of_birth = dateOfBirth;
        // NOTE: using PUT via putData. If your backend requires PATCH, I can add patchData to api.js.
        console.log("PATCH payload:", payload);
await patchData(`/core/admin/students/${currentStudent.id}/`, payload);
        alert("Étudiant modifié avec succès !");
      } else {
        const payload = {
          user: { username, email, first_name: firstName, last_name: lastName, password },
          date_of_birth: dateOfBirth,
          school_class_id: schoolClass || null,
          parent_id: parentId || null,
        };
        await postData("/core/admin/students/", payload);
        alert("Étudiant ajouté avec succès !");
      }
      if (filterClassId) await fetchAll(filterClassId);
      else await fetchAll();
      closeModal();
    } catch (err) {
      console.error("submit error:", err?.body ?? err?.message ?? err);
      const resp = err?.body ?? null;
      let msg = "";
      if (typeof resp === "string") msg = resp;
      else if (Array.isArray(resp)) msg = resp.join("; ");
      else if (typeof resp === "object" && resp !== null)
        msg = Object.entries(resp)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(" | ");
      alert("Erreur : " + (msg || "Voir console"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet étudiant ?")) return;
    try {
      await deleteData(`/core/admin/students/${id}/`);
      alert("Étudiant supprimé !");
      if (filterClassId) await fetchAll(filterClassId);
      else await fetchAll();
    } catch (err) {
      console.error("delete error:", err?.body ?? err?.message ?? err);
      alert("Erreur lors de la suppression.");
    }
  };

  const applyClassFilter = async () => {
    if (!filterClassId) await fetchAll();
    else await fetchAll(filterClassId);
  };

  // --- Recherche + Pagination côté client ---
  // Filtre les étudiants selon la recherche et la classe sélectionnée
  const filteredStudents = useMemo(() => {
    const q = (searchQuery || "").trim().toLowerCase();
    let list = students || [];
    if (q) {
      list = list.filter((s) => {
        const username = (s.user?.username || "").toString().toLowerCase();
        const email = (s.user?.email || "").toString().toLowerCase();
        const first = (s.user?.first_name || s.firstname || "").toString().toLowerCase();
        const last = (s.user?.last_name || s.lastname || "").toString().toLowerCase();
        const cls = (s.school_class?.name || "").toString().toLowerCase();
        const parent = (s.parent?.user?.username || s.parent?.id || "").toString().toLowerCase();
        return (
          username.includes(q) ||
          email.includes(q) ||
          first.includes(q) ||
          last.includes(q) ||
          cls.includes(q) ||
          parent.includes(q)
        );
      });
    }
    return list;
  }, [students, searchQuery]);

  // recalcul page si changements
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterClassId, students, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));

  const currentPageStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return filteredStudents.slice(start, end);
  }, [filteredStudents, currentPage, pageSize]);

  const goPrev = () => setCurrentPage((p) => Math.max(1, p - 1));
  const goNext = () => setCurrentPage((p) => Math.min(totalPages, p + 1));

  return (
    <div className="p-8 bg-gray-50 min-h-screen text-gray-800">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">👩‍🎓 Gestion des étudiants</h1>
        <button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition"
        >
          + Ajouter un étudiant
        </button>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher par nom, email, username, classe..."
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 flex-1 min-w-[200px]"
        />

        <select
          value={filterClassId}
          onChange={(e) => setFilterClassId(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Toutes les classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button onClick={applyClassFilter} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg shadow-sm">
          Filtrer
        </button>
        <button
          onClick={() => {
            setFilterClassId("");
            setSearchQuery("");
            fetchAll();
          }}
          className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg shadow-sm"
        >
          Réinitialiser
        </button>

        {/* Choix page size */}
        <div className="ml-auto flex items-center gap-2">
          <label className="text-sm text-gray-600">Afficher</label>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-2 py-1 bg-white"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-600">/ page</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-200">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Chargement des étudiants...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">{error}</div>
        ) : (
          <>
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
                <tr>
                  <th className="py-3 px-4 text-left">ID</th>
                  <th className="py-3 px-4 text-left">Utilisateur</th>
                  <th className="py-3 px-4 text-left">Email</th>
                  <th className="py-3 px-4 text-left">Prénom</th>
                  <th className="py-3 px-4 text-left">Nom</th>
                  <th className="py-3 px-4 text-left">Classe</th>
                  <th className="py-3 px-4 text-left">Parent</th>
                  <th className="py-3 px-4 text-left">Naissance</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPageStudents.map((student) => (
                  <tr key={student.id} className="border-t hover:bg-gray-50 transition">
                    <td className="py-2 px-4">{student.id}</td>
                    <td className="py-2 px-4">{student.user?.username ?? ""}</td>
                    <td className="py-2 px-4">{student.user?.email ?? ""}</td>
                    <td className="py-2 px-4">{student.user?.first_name ?? student.firstname ?? ""}</td>
                    <td className="py-2 px-4">{student.user?.last_name ?? student.lastname ?? ""}</td>
                    <td className="py-2 px-4">{student.school_class?.name ?? ""}</td>
                    <td className="py-2 px-4">{student.parent?.user?.username ?? student.parent?.id ?? ""}</td>
                    <td className="py-2 px-4">{student.date_of_birth ?? ""}</td>
                    <td className="py-2 px-4 flex justify-center gap-2">
                      <button
                        onClick={() => openEditModal(student)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs shadow-sm"
                      >
                        Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs shadow-sm"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-6 text-gray-500">
                      Aucun étudiant trouvé.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <div className="text-sm text-gray-600">
                Affichage {filteredStudents.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} —{" "}
                {Math.min(currentPage * pageSize, filteredStudents.length)} sur {filteredStudents.length}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={goPrev}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-lg text-sm shadow-sm ${currentPage === 1 ? "bg-gray-200 text-gray-500" : "bg-white hover:bg-gray-100"}`}
                >
                  Précédent
                </button>
                <div className="text-sm text-gray-700">Page {currentPage} / {totalPages}</div>
                <button
                  onClick={goNext}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-lg text-sm shadow-sm ${currentPage === totalPages ? "bg-gray-200 text-gray-500" : "bg-white hover:bg-gray-100"}`}
                >
                  Suivant
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 animate-fadeIn">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">{currentStudent ? "Modifier l'étudiant" : "Ajouter un étudiant"}</h2>

            <div className="grid grid-cols-1 gap-3">
              {!currentStudent && (
                <input type="text" placeholder="Nom d'utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} className="input" />
              )}
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
              <div className="flex gap-2">
                <input type="text" placeholder="Prénom" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="input flex-1" />
                <input type="text" placeholder="Nom" value={lastName} onChange={(e) => setLastName(e.target.value)} className="input flex-1" />
              </div>
              <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="input" />
              <select value={schoolClass} onChange={(e) => setSchoolClass(e.target.value)} className="input">
                <option value="">Sélectionner une classe</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
              <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="input">
                <option value="">Sélectionner un parent (optionnel)</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.user?.username ?? p.id}
                  </option>
                ))}
              </select>
              <input
                type="password"
                placeholder={currentStudent ? "Mot de passe (laisser vide)" : "Mot de passe"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeModal} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg">
                Annuler
              </button>
              <button onClick={handleSubmit} disabled={saving} className={`px-4 py-2 rounded-lg text-white ${saving ? "bg-yellow-500" : "bg-green-600 hover:bg-green-700"}`}>
                {saving ? "En cours..." : currentStudent ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Petite classe utilitaire pour champs input (CSS standard)
const style = document.createElement("style");
style.innerHTML = `
.input {
  width: 100%;
  border: 1px solid #d1d5db; /* gray-300 */
  border-radius: 0.5rem;
  padding: 0.5rem 0.75rem;
  box-sizing: border-box;
  outline: none;
}
.input:focus {
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
  border-color: #6366f1;
}
@keyframes fadeIn {
  from {opacity: 0; transform: scale(0.98);}
  to {opacity: 1; transform: scale(1);}
}
.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}
`;
document.head.appendChild(style);

export default Students;
