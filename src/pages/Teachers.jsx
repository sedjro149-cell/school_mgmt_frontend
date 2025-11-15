// src/pages/Teachers.jsx
import React, { useEffect, useState } from "react";
import { fetchData, postData,  patchData, deleteData } from "./api";

/**
 * Teachers.jsx (Design modernisé — migration vers src/api.js)
 */

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");

  const [subjectId, setSubjectId] = useState("");
  const [classIds, setClassIds] = useState([]);

  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);

  const [query, setQuery] = useState("");

  // ===============================
  // ======= FETCH DATA ============
  // ===============================
  const fetchTeachers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchData("/core/admin/teachers/");
      const list = Array.isArray(data) ? data : data?.results || [];
      setTeachers(list);
      setFilteredTeachers(list);
    } catch (err) {
      console.error("fetchTeachers error:", err?.body ?? err?.message ?? err);
      setError("Erreur lors du chargement des enseignants.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const data = await fetchData("/academics/subjects/");
      setSubjects(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      console.error("Erreur récupération matières:", err?.body ?? err);
    }
  };

  const fetchClasses = async () => {
    try {
      const data = await fetchData("/academics/school-classes/");
      setClasses(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      console.error("Erreur récupération classes:", err?.body ?? err);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchSubjects();
    fetchClasses();
  }, []);

  // ===============================
  // ======= FORM LOGIC ============
  // ===============================
  const resetForm = () => {
    setCurrentTeacher(null);
    setUsername("");
    setEmail("");
    setFirstName("");
    setLastName("");
    setPassword("");
    setSubjectId("");
    setClassIds([]);
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (t) => {
    setCurrentTeacher(t);
    setUsername(t?.user?.username || "");
    setEmail(t?.user?.email || "");
    setFirstName(t?.user?.first_name || "");
    setLastName(t?.user?.last_name || "");
    setPassword("");
    setSubjectId(t?.subject?.id ?? "");
    setClassIds((t?.classes || []).map((c) => c.id));
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentTeacher(null);
  };

  // ===============================
  // ======= SUBMIT LOGIC ==========
  // ===============================
  const handleSubmit = async () => {
    if (!email || !firstName || !lastName) {
      alert("Champs requis : Email, prénom, nom.");
      return;
    }

    const payload = {
      user: { email, first_name: firstName, last_name: lastName },
      subject_id: subjectId === "" ? null : Number(subjectId),
      class_ids: classIds,
    };

    if (!currentTeacher) {
      if (!username || !password) {
        alert("Nom d'utilisateur et mot de passe requis pour la création.");
        return;
      }
      payload.user.username = username;
      payload.user.password = password;
    } else if (password) {
      // password may be optional for edit
      payload.user.password = password;
    }

    setSaving(true);
    try {
      if (currentTeacher) {
        // NOTE: api.js doesn't include a patch helper in the original.
        // We use PUT here. If your backend requires PATCH, add patchData to api.js.
        await patchData(`/core/admin/teachers/${currentTeacher.id}/`, payload);
        alert("Enseignant modifié avec succès !");
      } else {
        await postData("/core/admin/teachers/", payload);
        alert("Enseignant créé avec succès !");
      }
      await fetchTeachers();
      closeModal();
    } catch (err) {
      console.error("submit teacher error:", err?.body ?? err?.message ?? err);
      alert("Erreur lors de l’envoi — voir console.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cet enseignant ?")) return;
    try {
      await deleteData(`/core/admin/teachers/${id}/`);
      alert("Enseignant supprimé !");
      await fetchTeachers();
    } catch (err) {
      console.error("delete teacher error:", err?.body ?? err);
      alert("Erreur lors de la suppression.");
    }
  };

  // ===============================
  // ======= SEARCH ================
  // ===============================
  useEffect(() => {
    if (!query) return setFilteredTeachers(teachers);
    const q = query.toLowerCase().trim();
    setFilteredTeachers(
      teachers.filter((t) => {
        const u = t.user || {};
        return (
          (u.username || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q) ||
          (u.first_name || "").toLowerCase().includes(q) ||
          (u.last_name || "").toLowerCase().includes(q)
        );
      })
    );
  }, [query, teachers]);

  // ===============================
  // ========= RENDER ==============
  // ===============================
  return (
    <div className="p-8 bg-gray-50 min-h-screen text-gray-800">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">👨‍🏫 Gestion des enseignants</h1>
        <button
          onClick={openCreateModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition"
        >
          + Ajouter un enseignant
        </button>
      </div>

      {/* BARRE DE RECHERCHE */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="search"
          placeholder="Rechercher un enseignant..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 w-80"
        />
        <button
          onClick={() => {
            setQuery("");
            fetchTeachers();
          }}
          className="bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg shadow-sm"
        >
          Réinitialiser
        </button>
      </div>

      {/* TABLE */}
      <div className="bg-white shadow rounded-xl overflow-hidden border border-gray-200">
        {loading ? (
          <div className="p-6 text-center text-gray-500">Chargement des enseignants...</div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">{error}</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700 uppercase text-xs">
              <tr>
                <th className="py-3 px-4 text-left">ID</th>
                <th className="py-3 px-4 text-left">Utilisateur</th>
                <th className="py-3 px-4 text-left">Email</th>
                <th className="py-3 px-4 text-left">Prénom</th>
                <th className="py-3 px-4 text-left">Nom</th>
                <th className="py-3 px-4 text-left">Matière</th>
                <th className="py-3 px-4 text-left">Classes</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTeachers.map((t) => (
                <tr key={t.id} className="border-t hover:bg-gray-50 transition">
                  <td className="py-2 px-4">{t.id}</td>
                  <td className="py-2 px-4">{t.user?.username}</td>
                  <td className="py-2 px-4">{t.user?.email}</td>
                  <td className="py-2 px-4">{t.user?.first_name}</td>
                  <td className="py-2 px-4">{t.user?.last_name}</td>
                  <td className="py-2 px-4">{t.subject?.name ?? "-"}</td>
                  <td className="py-2 px-4">{(t.classes || []).map((c) => c.name).join(", ")}</td>
                  <td className="py-2 px-4 flex justify-center gap-2">
                    <button
                      onClick={() => openEditModal(t)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-lg text-xs shadow-sm"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs shadow-sm"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
              {filteredTeachers.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-500">
                    Aucun enseignant trouvé.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 animate-fadeIn">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {currentTeacher ? "Modifier l’enseignant" : "Ajouter un enseignant"}
            </h2>

            <div className="grid grid-cols-1 gap-3">
              {!currentTeacher && (
                <input
                  type="text"
                  placeholder="Nom d'utilisateur"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                />
              )}
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input flex-1"
                />
                <input
                  type="text"
                  placeholder="Nom"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input flex-1"
                />
              </div>

              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="input">
                <option value="">Sélectionner une matière</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              <select
                multiple
                value={classIds}
                onChange={(e) => setClassIds(Array.from(e.target.selectedOptions, (o) => Number(o.value)))}
                className="input"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>

              <input
                type="password"
                placeholder={currentTeacher ? "Mot de passe (laisser vide)" : "Mot de passe"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
              />
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={closeModal} className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-lg">
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className={`px-4 py-2 rounded-lg text-white ${saving ? "bg-yellow-500" : "bg-green-600 hover:bg-green-700"}`}
              >
                {saving ? "En cours..." : currentTeacher ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* small CSS for inputs + animation */}
      <style>{`
        .input {
          width: 100%;
          border: 1px solid #d1d5db; /* gray-300 */
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          box-sizing: border-box;
          outline: none;
        }
        .input:focus {
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15); /* indigo-500 ring like */
          border-color: #6366f1;
        }
        @keyframes fadeIn {
          from {opacity: 0; transform: scale(0.98);}
          to {opacity: 1; transform: scale(1);}
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default Teachers;
