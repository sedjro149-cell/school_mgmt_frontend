// src/pages/AnnouncementManagement.jsx
import React, { useEffect, useState, useRef } from "react";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaTimes } from "react-icons/fa";
// Nous importons les fonctions dédiées aux FormData : postFormData et patchFormData
import { 
    fetchData, 
    postFormData, // Utilisé pour la CRÉATION
    patchFormData, // Utilisé pour la MODIFICATION
    deleteData 
} from "./api"; 

const AnnouncementManagement = () => {
    // ----------------------
    // 1. GESTION DE L'ÉTAT (Identique)
    // ----------------------
    const [announcements, setAnnouncements] = useState([]);
    const [filteredAnnouncements, setFilteredAnnouncements] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // État de la Modale
    const [showModal, setShowModal] = useState(false);
    const [currentAnnouncement, setCurrentAnnouncement] = useState(null);
    
    // Champs du formulaire
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [imageFile, setImageFile] = useState(null); // Pour le fichier image
    const imageInputRef = useRef(null);

    // ----------------------
    // 2. LOGIQUE DE L'API (CRUD) (fetchData et deleteData restent inchangés)
    // ----------------------

    const fetchAnnouncements = async () => {
        try {
            setLoading(true);
            const data = await fetchData("/academics/announcements/"); 
            const arr = Array.isArray(data) ? data : data?.results ?? [];
            setAnnouncements(arr);
            setFilteredAnnouncements(arr);
        } catch (err) {
            console.error("fetchAnnouncements", err);
            setError("Erreur de récupération. Vérifiez vos permissions (Admin Requis)."); 
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const handleSearch = (e) => {
        const value = (e.target.value || "").toLowerCase();
        setSearch(value);
        const filtered = announcements.filter(
            (ann) => (ann.title || "").toLowerCase().includes(value) || 
                     (ann.content || "").toLowerCase().includes(value)
        );
        setFilteredAnnouncements(filtered);
    };

    const handleImageChange = (e) => {
        setImageFile(e.target.files[0]);
    };

    // ----------------------
    // 3. GESTION DES MODALES ET FORMULAIRES (Identique)
    // ----------------------

    const handleOpenModal = (announcement = null) => {
        setCurrentAnnouncement(announcement);
        setTitle(announcement ? announcement.title : "");
        setContent(announcement ? announcement.content : "");
        setImageFile(null); 
        if (imageInputRef.current) {
            imageInputRef.current.value = ""; 
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setCurrentAnnouncement(null);
        setTitle("");
        setContent("");
        setImageFile(null);
        if (imageInputRef.current) {
            imageInputRef.current.value = "";
        }
    };

    // ------------------------------------------------------------------
    // CORRECTION MAJEURE: Utilisation de postFormData et patchFormData
    // ------------------------------------------------------------------
    const handleSubmit = async () => {
        if (!title.trim() || !content.trim()) {
            return alert("Le titre et le contenu de l'annonce sont requis !");
        }

        const formData = new FormData();
        formData.append("title", title.trim());
        formData.append("content", content.trim());

        if (imageFile) {
            formData.append("image", imageFile);
        }

        try {
            if (currentAnnouncement) {
                // Utilise la nouvelle fonction patchFormData
                await patchFormData(`/academics/announcements/${currentAnnouncement.id}/`, formData);
                alert("Annonce modifiée !");
            } else {
                // Utilise la fonction postFormData
                await postFormData("/academics/announcements/", formData);
                alert("Annonce ajoutée !");
            }
            await fetchAnnouncements();
            handleCloseModal();
        } catch (err) {
            console.error("handleSubmit", err);
            // L'objet erreur contient maintenant 'err.body' grâce à handleResponse()
            const errorMessage = err.body ? JSON.stringify(err.body) : err.message;
            alert(`Erreur lors de l'opération (Statut: ${err.status || 'Inconnu'}): ${errorMessage}`);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Voulez-vous vraiment supprimer cette annonce ?")) return;
        try {
            await deleteData(`/academics/announcements/${id}/`);
            alert("Annonce supprimée !");
            await fetchAnnouncements();
        } catch (err) {
            console.error("handleDelete", err);
            const msg = err.body ? JSON.stringify(err.body) : "Erreur lors de la suppression ! (Admin requis)";
            alert(msg);
        }
    };


    // ----------------------
    // 4. RENDU (Identique)
    // ----------------------
    return (
        <div className="p-6 bg-gradient-to-br from-gray-100 via-gray-50 to-white min-h-screen">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <h1 className="text-3xl font-bold text-gray-800 mb-4 md:mb-0">
                    📢 Gestion des Annonces
                </h1>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-gradient-to-r from-green-500 to-teal-500 text-white px-5 py-2 rounded-xl shadow-md hover:from-teal-500 hover:to-green-500 transition flex items-center gap-2"
                >
                    <FaPlus /> Nouvelle annonce
                </button>
            </div>

            <div className="relative mb-6 max-w-sm">
                <FaSearch className="absolute left-3 top-3 text-gray-400" />
                <input
                    type="text"
                    placeholder="Rechercher par titre ou contenu..."
                    value={search}
                    onChange={handleSearch}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-400 focus:outline-none"
                />
            </div>

            {/* Tableau ou Liste des Annonces */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-center py-6 text-gray-500 col-span-full">Chargement...</p>
                ) : error ? (
                    <p className="text-center text-red-500 py-6 col-span-full">{error}</p>
                ) : filteredAnnouncements.length === 0 ? (
                    <p className="text-center py-6 text-gray-500 col-span-full">Aucune annonce trouvée 😢</p>
                ) : (
                    filteredAnnouncements.map((announcement) => (
                        <div 
                            key={announcement.id} 
                            className="bg-white rounded-xl shadow-xl overflow-hidden border-t-4 border-green-500 hover:shadow-2xl transition duration-300"
                        >
                            {/* Affichage de l'image (si présente) */}
                            {announcement.image && (
                                <img 
                                    src={announcement.image} 
                                    alt={announcement.title} 
                                    className="w-full h-48 object-cover" 
                                />
                            )}
                            <div className="p-5">
                                <h2 className="text-xl font-bold text-gray-900 mb-2">{announcement.title}</h2>
                                <p className="text-sm text-gray-600 mb-3 line-clamp-3">{announcement.content}</p>
                                
                                <div className="text-xs text-gray-400 mb-4">
                                    Posté par **{announcement.author_name || 'Admin'}** le {new Date(announcement.created_at).toLocaleDateString()}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleOpenModal(announcement)}
                                        className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-1 rounded-full shadow-sm flex items-center gap-1 text-sm"
                                    >
                                        <FaEdit /> Modifier
                                    </button>
                                    <button
                                        onClick={() => handleDelete(announcement.id)}
                                        className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-pink-500 hover:to-red-500 text-white px-4 py-1 rounded-full shadow-sm flex items-center gap-1 text-sm"
                                    >
                                        <FaTrash /> Supprimer
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal de Création/Modification */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-8 rounded-2xl w-full max-w-lg shadow-2xl border-t-4 border-green-500 animate-fadeIn">
                        <div className="flex justify-between items-center mb-4">
                             <h2 className="text-2xl font-bold text-gray-800">{currentAnnouncement ? "Modifier l'annonce" : "Créer une annonce"}</h2>
                             <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-700"><FaTimes /></button>
                        </div>
                        
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Titre de l'annonce"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-green-400 focus:outline-none"
                            />
                            <textarea
                                placeholder="Contenu de l'annonce..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows="5"
                                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-green-400 focus:outline-none resize-none"
                            />
                            
                            <label className="block text-sm font-medium text-gray-700">Image (Optionnel)</label>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                ref={imageInputRef}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                            />
                            {/* Affichage de l'image existante lors de la modification */}
                            {currentAnnouncement && currentAnnouncement.image && !imageFile && (
                                <div className="mt-2">
                                    <p className="text-xs text-gray-500">Image actuelle:</p>
                                    <img src={currentAnnouncement.image} alt="Actuelle" className="h-16 w-16 object-cover rounded-md mt-1 border" />
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={handleCloseModal}
                                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-5 py-2 rounded-xl transition font-semibold"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-teal-500 hover:to-green-500 text-white px-6 py-2 rounded-xl transition font-semibold"
                            >
                                {currentAnnouncement ? "Sauvegarder" : "Publier"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnnouncementManagement;