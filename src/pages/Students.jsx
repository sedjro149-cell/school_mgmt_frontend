// src/Students.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  FaSearch, FaPlus, FaEdit, FaTrash, FaSyncAlt,
  FaUserGraduate, FaFilter, FaChevronLeft, FaChevronRight,
  FaTimes, FaMars, FaVenus, FaPhone
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
    schoolClassId: "", // Correspond à school_class_id (Write)
    parentId: "",      // Correspond à parent_id (Write)
    password: "",
  });

  const latestRequestId = useRef(0);

  /* ----------------------------------------------------------------
   * 1. INITIALISATION (Listes déroulantes)
   * On ne le fait qu'une fois pour peupler les formulaires
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        // On charge les classes et parents pour pouvoir créer/modifier
        // Ce n'est PAS pour l'affichage du tableau (car l'info est déjà dans student)
        const [clsData, parData] = await Promise.all([
          fetchData("/academics/school-classes/?page_size=100"), 
          fetchData("/core/admin/parents/?page_size=100")
        ]);
        
        // Gestion robuste selon si l'API renvoie { results: [...] } ou [...]
        setClassesList(clsData.results || clsData || []);
        setParentsList(parData.results || parData || []);
      } catch (err) {
        console.error("Erreur chargement dropdowns:", err);
      }
    };
    fetchDropdowns();
  }, []);

  /* ----------------------------------------------------------------
   * 2. RECHERCHE & DEBOUNCE
   * ---------------------------------------------------------------- */
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  /* ----------------------------------------------------------------
   * 3. RÉCUPÉRATION DES ÉTUDIANTS (Le cœur du sujet)
   * ---------------------------------------------------------------- */
  const fetchStudents = async () => {
    setLoading(true);
    const reqId = ++latestRequestId.current;

    try {
      const params = new URLSearchParams();
      params.set("page", currentPage);
      params.set("page_size", pageSize);
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (filterClassId) params.set("school_class", filterClassId);

      // Appel unique. Le Serializer renvoie déjà 'school_class' (objet) et 'parent' (objet)
      const data = await fetchData(`/core/admin/students/?${params.toString()}`);

      if (reqId === latestRequestId.current) {
        if (data && data.results) {
          setStudents(data.results);
          setTotalStudents(data.count);
        } else {
          setStudents([]);
          setTotalStudents(0);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (reqId === latestRequestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line
  }, [currentPage, pageSize, debouncedSearch, filterClassId]);


  /* ----------------------------------------------------------------
   * 4. GESTION DU FORMULAIRE (Mapping Read -> Write)
   * ---------------------------------------------------------------- */
  const openModal = (student = null) => {
    setCurrentStudent(student);
    if (student) {
      // MODE ÉDITION : On extrait les IDs des objets imbriqués
      // student.school_class est un objet {id, name, level} -> on prend .id
      // student.parent est un objet {id, user, ...} -> on prend .id
      
      setFormData({
        username: student.user?.username || "",
        email: student.user?.email || "",
        firstName: student.user?.first_name || "",
        lastName: student.user?.last_name || "",
        sex: student.sex || "M",
        dateOfBirth: student.date_of_birth || "",
        
        // C'EST ICI QUE LA MAGIE OPÈRE :
        schoolClassId: student.school_class?.id || "", 
        parentId: student.parent?.id || "",
        
        password: "", // On laisse vide en édition
      });
    } else {
      // MODE CRÉATION
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
      // Préparation du payload EXACTEMENT comme le serializer l'attend
      // student.user est un nested write, school_class_id est un ID
      const payload = {
        user: {
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
        },
        sex: formData.sex,
        date_of_birth: formData.dateOfBirth || null,
        
        // CLÉS SPÉCIFIQUES POUR LE WRITE ONLY DU SERIALIZER
        school_class_id: formData.schoolClassId ? parseInt(formData.schoolClassId) : null,
        parent_id: formData.parentId ? parseInt(formData.parentId) : null,
      };

      // Champs conditionnels
      if (formData.password) payload.user.password = formData.password;
      if (!currentStudent && formData.username) payload.user.username = formData.username;

      if (currentStudent) {
        await patchData(`/core/admin/students/${currentStudent.id}/`, payload);
      } else {
        await postData("/core/admin/students/", payload);
      }

      setShowModal(false);
      fetchStudents(); // Rafraîchissement du tableau
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
   * 5. RENDU
   * ---------------------------------------------------------------- */
  const totalPages = Math.ceil(totalStudents / pageSize);

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
                    // --- MAPPING DE L'AFFICHAGE (READ) ---
                    // On navigue dans les objets imbriqués fournis par le Serializer
                    
                    const user = student.user || {};
                    const parent = student.parent; // Objet ParentSimple
                    const schoolClass = student.school_class; // Objet SchoolClassSimple

                    // Noms
                    const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || user.username || "—";
                    
                    // Nom de la classe (sécurisé)
                    // Si schoolClass est null, l'étudiant n'est pas inscrit
                    const className = schoolClass ? schoolClass.name : "Non inscrit";

                    // Nom du parent (sécurisé)
                    // parent -> user -> first_name/last_name
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
                             <span className="text-pink-500 font-bold text-xs flex items-center gap-1"><FaVenus/> F</span> : 
                             <span className="text-indigo-500 font-bold text-xs flex items-center gap-1"><FaMars/> M</span>
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
                                  <FaPhone size={8}/> {parentPhone}
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
                              <FaEdit/>
                            </button>
                            <button onClick={() => handleDelete(student.id)} className="p-1.5 border rounded hover:text-red-600 hover:bg-slate-50" title="Supprimer">
                              <FaTrash/>
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
                <FaChevronLeft size={10}/>
              </button>
              <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="p-1 px-3 border rounded bg-white disabled:opacity-50 hover:bg-slate-50">
                <FaChevronRight size={10}/>
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
                value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Nom</label>
              <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition" 
                value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
            </div>
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Email</label>
            <input type="email" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition" 
              value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          {!currentStudent && (
             <div>
               <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Nom d'utilisateur (Login)</label>
               <input className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition" 
                 value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
             </div>
          )}

          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Sexe</label>
                <select className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition" 
                  value={formData.sex} onChange={e => setFormData({...formData, sex: e.target.value})}>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
             </div>
             <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Date Naissance</label>
                <input type="date" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition" 
                  value={formData.dateOfBirth} onChange={e => setFormData({...formData, dateOfBirth: e.target.value})} />
             </div>
          </div>

          {/* SÉLECTION CLASSE ET PARENT */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
             <div>
                <label className="block text-[11px] font-bold text-indigo-400 uppercase mb-1">Classe</label>
                <select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition" 
                  value={formData.schoolClassId} onChange={e => setFormData({...formData, schoolClassId: e.target.value})}>
                   <option value="">-- Non attribuée --</option>
                   {classesList.map(c => (
                     <option key={c.id} value={c.id}>{c.name}</option>
                   ))}
                </select>
             </div>
             <div>
                <label className="block text-[11px] font-bold text-indigo-400 uppercase mb-1">Parent</label>
                <select className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500 transition" 
                  value={formData.parentId} onChange={e => setFormData({...formData, parentId: e.target.value})}>
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
              value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
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

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Students;