// src/pages/Level.jsx
import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaPlus, FaSearch } from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";

const Level = () => {
  const [levels, setLevels] = useState([]);
  const [filteredLevels, setFilteredLevels] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(null);
  const [name, setName] = useState("");

  const fetchLevels = async () => {
    try {
      setLoading(true);
      const data = await fetchData("/academics/levels/");
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      setLevels(arr);
      setFilteredLevels(arr);
    } catch (err) {
      console.error("fetchLevels", err);
      setError("Erreur lors de la récupération des niveaux");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLevels();
  }, []);

  const handleOpenModal = (level = null) => {
    setCurrentLevel(level);
    setName(level ? level.name : "");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentLevel(null);
    setName("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) return alert("Le nom du niveau est requis !");
    const payload = { name: name.trim() };

    try {
      if (currentLevel) {
        // update (PUT). If you prefer PATCH, tell me and I'll add patchData in api.js.
        await putData(`/academics/levels/${currentLevel.id}/`, payload);
        alert("Niveau modifié !");
      } else {
        await postData("/academics/levels/", payload);
        alert("Niveau ajouté !");
      }
      await fetchLevels();
      handleCloseModal();
    } catch (err) {
      console.error("handleSubmit", err);
      // try to extract message
      const msg = err?.message || "Erreur lors de l'opération !";
      alert(msg);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce niveau ?")) return;
    try {
      await deleteData(`/academics/levels/${id}/`);
      alert("Niveau supprimé !");
      await fetchLevels();
    } catch (err) {
      console.error("handleDelete", err);
      alert("Erreur lors de la suppression !");
    }
  };

  const handleSearch = (e) => {
    const value = (e.target.value || "").toLowerCase();
    setSearch(value);
    const filtered = levels.filter((lvl) => (lvl.name || "").toLowerCase().includes(value));
    setFilteredLevels(filtered);
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-100 via-gray-50 to-white min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">
          🎓 Gestion des Niveaux
        </h1>
        <button
          onClick={() => handleOpenModal()}
          className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-5 py-2 rounded-xl shadow-md hover:from-indigo-500 hover:to-blue-500 transition flex items-center gap-2"
        >
          <FaPlus /> Nouveau niveau
        </button>
      </div>

      {/* Barre de recherche */}
      <div className="relative mb-6 max-w-sm">
        <FaSearch className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un niveau..."
          value={search}
          onChange={handleSearch}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none"
        />
      </div>

      {/* Tableau */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {loading ? (
          <p className="text-center py-6 text-gray-500">Chargement...</p>
        ) : error ? (
          <p className="text-center text-red-500 py-6">{error}</p>
        ) : filteredLevels.length === 0 ? (
          <p className="text-center py-6 text-gray-500">Aucun niveau trouvé 😕</p>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-gray-600 font-semibold">ID</th>
                <th className="text-left px-6 py-3 text-gray-600 font-semibold">Nom du niveau</th>
                <th className="text-left px-6 py-3 text-gray-600 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLevels.map((level, index) => (
                <tr
                  key={level.id}
                  className={`hover:bg-blue-50 transition ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                >
                  <td className="px-6 py-3 border-b text-gray-700">{level.id}</td>
                  <td className="px-6 py-3 border-b font-medium text-gray-800">{level.name}</td>
                  <td className="px-6 py-3 border-b flex gap-2">
                    <button
                      onClick={() => handleOpenModal(level)}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-1 rounded-full shadow-sm flex items-center gap-1"
                    >
                      <FaEdit /> Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(level.id)}
                      className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-pink-500 hover:to-red-500 text-white px-4 py-1 rounded-full shadow-sm flex items-center gap-1"
                    >
                      <FaTrash /> Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-2xl w-96 shadow-2xl border-t-4 border-blue-500 animate-fadeIn">
            <h2 className="text-xl font-bold mb-4 text-gray-800">{currentLevel ? "Modifier le niveau" : "Ajouter un niveau"}</h2>
            <input
              type="text"
              placeholder="Nom du niveau"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 rounded-xl p-2 mb-4 focus:ring-2 focus:ring-blue-400 focus:outline-none"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-xl transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-indigo-500 hover:to-blue-500 text-white px-5 py-2 rounded-xl transition"
              >
                {currentLevel ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Level;
