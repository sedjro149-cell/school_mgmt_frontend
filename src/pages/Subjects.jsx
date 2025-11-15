// src/pages/Subject.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaCheck } from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";

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
  return COLORS[Number(id) % COLORS.length] || "bg-gray-100 text-gray-800";
}

export default function Subject() {
  const [subjects, setSubjects] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [current, setCurrent] = useState({ name: "" });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const loadSubjects = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const data = await fetchData("/academics/subjects/");
      setSubjects(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("loadSubjects:", err);
      const text = err?.body || err?.message || "Impossible de charger les matières.";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubjects();
  }, []);

  const handleSubmit = async () => {
    if (!current.name || !current.name.trim()) {
      setMessage({ type: "error", text: "Nom requis." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      if (current.id) {
        // update (use PUT since api.js exposes putData)
        await putData(`/academics/subjects/${current.id}/`, { name: current.name });
        setMessage({ type: "success", text: "Matière mise à jour." });
      } else {
        await postData("/academics/subjects/", { name: current.name });
        setMessage({ type: "success", text: "Matière ajoutée." });
      }
      setCurrent({ name: "" });
      await loadSubjects();
    } catch (err) {
      console.error("handleSubmit:", err);
      const text = err?.body || err?.message || "Erreur lors de l’enregistrement.";
      setMessage({ type: "error", text });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette matière ?")) return;
    setMessage(null);
    try {
      await deleteData(`/academics/subjects/${id}/`);
      setMessage({ type: "success", text: "Matière supprimée." });
      await loadSubjects();
    } catch (err) {
      console.error("handleDelete:", err);
      const text = err?.body || err?.message || "Erreur lors de la suppression.";
      setMessage({ type: "error", text });
    }
  };

  const filtered = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();
    if (!term) return subjects;
    return subjects.filter((s) => (s?.name || "").toLowerCase().includes(term));
  }, [subjects, searchTerm]);

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-800 flex items-center gap-2">
          📚 Gestion des matières
        </h1>
        <div className="flex gap-2 items-center">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-3 py-2 border rounded-full shadow-sm focus:ring-2 focus:ring-sky-400 focus:outline-none w-64"
            />
          </div>
          <button
            onClick={() => {
              setCurrent({ name: "" });
              loadSubjects();
            }}
            className="px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition"
          >
            Rafraîchir
          </button>
        </div>
      </header>

      {/* Formulaire unique */}
      <div className="bg-white border rounded-2xl shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <input
            type="text"
            placeholder="Nom de la matière..."
            value={current.name}
            onChange={(e) => setCurrent({ ...current, name: e.target.value })}
            className="flex-1 border rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-400 outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-white font-medium transition ${
              saving
                ? "bg-gray-400"
                : "bg-gradient-to-r from-green-500 to-teal-500 hover:from-teal-500 hover:to-green-500"
            }`}
          >
            <FaCheck /> {current.id ? "Modifier" : "Ajouter"}
          </button>
        </div>
      </div>

      {/* Liste des matières */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && (
          <div className="text-gray-500 text-sm col-span-full">Chargement...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="text-gray-500 text-sm col-span-full">
            Aucune matière trouvée.
          </div>
        )}

        {filtered.map((s) => (
          <div
            key={s.id}
            className="flex items-center justify-between border rounded-xl bg-white shadow-sm hover:shadow-md transition p-4"
          >
            <div className={`px-3 py-1 rounded-full text-sm font-semibold ${colorFor(s.id)}`}>
              {s.name}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrent(s)}
                className="p-2 rounded-full bg-yellow-50 border hover:bg-yellow-100 transition"
              >
                <FaEdit />
              </button>
              <button
                onClick={() => handleDelete(s.id)}
                className="p-2 rounded-full bg-red-50 border hover:bg-red-100 transition"
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))}
      </div>

      {message && (
        <div
          className={`p-3 rounded-md text-sm font-medium ${
            message.type === "error"
              ? "bg-red-50 text-red-700"
              : message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-sky-50 text-sky-700"
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
