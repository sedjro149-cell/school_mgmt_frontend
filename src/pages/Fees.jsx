import React, { useCallback, useEffect, useRef, useState } from "react";
import { 
  FaSearch, FaPlus, FaEdit, FaTrash, FaCheck, FaTimes, FaMoneyBillWave, 
  FaUserGraduate, FaChevronDown, FaChevronUp, FaWallet, FaReceipt, FaSyncAlt,
  FaHistory, FaUniversity, FaMobileAlt, FaCoins
} from "react-icons/fa";
import { fetchData, postData, patchData, deleteData } from "./api";

/* --- UTILS --- */
function formatCurrency(v) {
  if (v == null || v === "") return "0 FCFA";
  const n = Number(v);
  if (Number.isNaN(n)) return "0 FCFA";
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " FCFA";
}

/* --- COMPONENTS --- */

// Toast Notification
const Toast = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!message) return null;

  const styles = message.type === 'error' 
    ? 'bg-red-50 text-red-800 border-red-200 shadow-red-100' 
    : 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-100';

  return (
    <div className={`fixed bottom-6 right-6 z-[100] px-6 py-4 rounded-xl shadow-xl border flex items-center gap-3 animate-slideIn ${styles}`}>
      <div className={`p-2 rounded-full ${message.type === 'error' ? 'bg-red-100' : 'bg-emerald-100'}`}>
        {message.type === 'error' ? <FaTimes /> : <FaCheck />}
      </div>
      <span className="font-bold text-sm">{message.text}</span>
    </div>
  );
};

// Modal Wrapper
const Modal = ({ title, isOpen, onClose, children, size = "md" }) => {
  if (!isOpen) return null;
  const maxWidth = size === "lg" ? "max-w-5xl" : size === "xl" ? "max-w-7xl" : "max-w-lg";
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden transform transition-all`}>
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
          <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"><FaTimes /></button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function StudentsWithFees() {
  /* --- STATE --- */
  const [classes, setClasses] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  

  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [filterClassId, setFilterClassId] = useState("");
  const [selectedStudentIdFilter, setSelectedStudentIdFilter] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const searchDebRef = useRef(null);

  // Modals
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [feesModalOpen, setFeesModalOpen] = useState(false);
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  
  // Selection
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedFee, setSelectedFee] = useState(null);

  // Forms
  const [studentForm, setStudentForm] = useState({});
  const [feeForm, setFeeForm] = useState({ id: null, fee_type_id: "", amount: "", due_date: "" });  
  // IMPORTANT: Payment Form with all original fields
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "CASH", reference: "", note: "" });
  
  const [showFeeTypeModal, setShowFeeTypeModal] = useState(false);
  const [currentFeeType, setCurrentFeeType] = useState({ id: null, name: "", description: "", is_active: true, amounts: [] });
  const [showAmountModal, setShowAmountModal] = useState(false);
  const [currentAmount, setCurrentAmount] = useState({ id: null, fee_type: null, level: "", amount: "", is_active: true });

  const [fees, setFees] = useState([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [feesShowAll, setFeesShowAll] = useState(true);
  
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  
  const [saving, setSaving] = useState(false);
  const [expandedFeeTypeIds, setExpandedFeeTypeIds] = useState(new Set());

  /* --- HELPERS --- */
  const showToast = (type, text) => setToast({ type, text });

  /* --- FETCHERS --- */
  const fetchLookups = useCallback(async () => {
    try {
      const [clsData, ftData] = await Promise.all([
        fetchData("/academics/school-classes/"),
        fetchData("/fees/fee-types/"),
      ]);
      setClasses(clsData || []);
      const ftRaw = ftData || [];
      setFeeTypes(ftRaw.map(ft => ({ ...ft, amounts: ft.amounts || ft.amount_set || [] })));
    } catch (e) {
      console.error(e);
      showToast("error", "Erreur chargement données.");
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await fetchData("/fees/statistics/?validated=1");
      setStats(data || null);
    } catch (e) { console.error(e); } finally { setLoadingStats(false); }
  }, []);

  useEffect(() => {
    fetchLookups();
    fetchStats();
  }, [fetchLookups, fetchStats]);

  /* --- STUDENTS LOGIC --- */
  useEffect(() => {
    let mounted = true;
    async function loadByClass(classId) {
      if (!classId) {
        if (mounted) { setClassStudents([]); setStudents([]); setSelectedStudentIdFilter(""); }
        return;
      }
      setLoadingStudents(true);
      try {
        const arr = await fetchData(`/core/admin/students/by-class/${classId}/`);
        if (!mounted) return;
        setClassStudents(arr || []);
        setStudents(arr || []);
        setSelectedStudentIdFilter("");
      } catch (err) {
        showToast("error", "Erreur chargement élèves.");
        setClassStudents([]); setStudents([]);
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    }
    loadByClass(filterClassId);
    return () => { mounted = false; };
  }, [filterClassId]);

  useEffect(() => {
    if (searchDebRef.current) clearTimeout(searchDebRef.current);
    searchDebRef.current = setTimeout(() => {
      const q = (searchQ || "").trim().toLowerCase();
      let list = classStudents;
      if (selectedStudentIdFilter) {
        list = list.filter(st => String(st.id) === String(selectedStudentIdFilter));
      }
      if (q) {
        list = list.filter(st => {
          const fullName = `${st.user?.first_name ?? st.firstname ?? ""} ${st.user?.last_name ?? st.lastname ?? ""}`.toLowerCase();
          return fullName.includes(q) || (st.user?.username || "").toLowerCase().includes(q);
        });
      }
      setStudents(list);
    }, 200);
    return () => clearTimeout(searchDebRef.current);
  }, [searchQ, classStudents, selectedStudentIdFilter]);

  /* --- FEES & PAYMENTS LOGIC --- */
  const openFeesForStudent = async (student) => {
    setSelectedStudent(student);
    setFeesShowAll(true); // Par défaut, on montre tout pour voir l'historique
    setFees([]);
    setFeesModalOpen(true);
    await fetchFees(student.id, { unpaidOnly: false });
  };

  const fetchFees = async (studentId, { unpaidOnly = false } = {}) => {
  setLoadingFees(true);
  try {
    const params = new URLSearchParams({ student: String(studentId) });
    if (unpaidOnly) params.set("paid", "0");
    const res = await fetchData(`/fees/fees/?${params.toString()}`);
    const raw = res || [];

    // Normalisation: on veut total_paid & total_remaining stables côté UI.
    const mapped = raw.map(f => {
      // backend new fields: total_paid, total_remaining
      // older code used paid_amount — on garde en fallback
      const totalPaidRaw = f.total_paid ?? f.paid_amount ?? f.total_paid_all ?? 0;
      const totalPaid = Number(totalPaidRaw || 0);
      const amount = Number(f.amount || 0);
      const totalRemainingRaw = f.total_remaining ?? (amount - totalPaid);
      const totalRemaining = Math.max(0, Number(totalRemainingRaw || 0));

      return {
        ...f,
        total_paid: totalPaid,
        total_remaining: totalRemaining,
        // compat pour anciens usages
        paid_amount: totalPaid,
      };
    });

    setFees(mapped);
  } catch (err) {
    console.error(err);
    showToast("error", "Impossible de charger les frais.");
  } finally {
    setLoadingFees(false);
  }
};


  // Ouvre la modale de paiement pour un frais spécifique
  const openPaymentsForFee = async (fee) => {
  setSelectedFee(fee);

  // Preferer total_remaining, fallback sur calcul
  const remaining = Math.max(0, Number(fee.total_remaining ?? (Number(fee.amount || 0) - Number(fee.total_paid ?? fee.paid_amount ?? 0))));

  // Préremplir le montant avec le reste à payer
  setPaymentForm({
      amount: remaining > 0 ? String(remaining) : "",
      method: "CASH",
      reference: "",
      note: ""
  });

  setPayments([]);
  setPaymentsModalOpen(true);
  await fetchPayments(fee.id);
};


  const fetchPayments = async (feeId) => {
  setLoadingPayments(true);
  try {
    const res = await fetchData(`/fees/payments/?fee=${feeId}`);
    // normalize some fields: date keys and validated presence
    const mapped = (res || []).map(p => ({
      ...p,
      // backend peut renvoyer paid_at ou validated_at ou created_at
      payment_date: p.paid_at ?? p.validated_at ?? p.payment_date ?? p.created_at,
      validated: typeof p.validated === "boolean" ? p.validated : !!p.validated,
    }));
    setPayments(mapped);
  } catch (err) {
    console.error(err);
    showToast("error", "Erreur chargement paiements.");
  } finally {
    setLoadingPayments(false);
  }
};

  /* --- SUBMISSION HANDLERS (Original Logic Restored) --- */
  
 const submitFee = async () => {
    if (!selectedStudent) return;
    if (!feeForm.fee_type_id) return showToast("error", "Veuillez choisir un type de frais.");
    
    setSaving(true);
    try {
      // Préparation du payload
      const payload = { 
          // Si c'est une création, on a besoin de l'ID étudiant et du type
          ...(feeForm.id ? {} : { student: selectedStudent.id, fee_type_id: feeForm.fee_type_id }),
          amount: feeForm.amount,
          // GESTION DE LA DATE D'ÉCHÉANCE
          due_date: feeForm.due_date ? feeForm.due_date : null 
      };

      if (feeForm.id) {
         // UPDATE
         await patchData(`/fees/fees/${feeForm.id}/`, payload);
         showToast("success", "Frais modifié avec succès.");
      } else {
         // CREATE
         await postData(`/fees/fees/`, payload);
         showToast("success", "Frais attribué avec succès.");
      }
      
      // Reset & Refetch
      setFeeForm({ id: null, fee_type_id: "", amount: "", due_date: "" });
      // On recharge la liste
      await fetchFees(selectedStudent.id, { unpaidOnly: !feesShowAll });
      fetchStats(); // Update global stats
    } catch (err) {
       console.error(err);
       showToast("error", "Erreur lors de l'enregistrement.");
    } finally {
       setSaving(false);
    }
  };

  const deleteFee = async (feeId) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce frais ?")) return;
    try {
        await deleteData(`/fees/fees/${feeId}/`);
        showToast("success", "Frais supprimé.");
        if (selectedStudent) await fetchFees(selectedStudent.id, { unpaidOnly: !feesShowAll });
        fetchStats();
    } catch (err) {
        showToast("error", "Impossible de supprimer ce frais.");
    }
  };

  const submitPayment = async () => {
    if (!selectedFee) return showToast("error", "Aucun frais sélectionné.");
    if (!paymentForm.amount) return showToast("error", "Le montant est requis.");

    setSaving(true);
    try {
      // Exact payload as requested logic
      const payload = { 
        fee: selectedFee.id, 
        amount: paymentForm.amount, 
        method: paymentForm.method || "CASH", 
        reference: paymentForm.reference || "", 
        note: paymentForm.note || "" 
      };
      
      await postData(`/fees/payments/`, payload);
      showToast("success", "Paiement enregistré avec succès !");
      
      // Refresh payments list AND fees list (to update status/paid_amount)
      await fetchPayments(selectedFee.id);
      if (selectedStudent) await fetchFees(selectedStudent.id, { unpaidOnly: !feesShowAll });
      
      // Reset form but keep method for convenience? No, reset all.
      setPaymentForm({ amount: "", method: "CASH", reference: "", note: "" });
      fetchStats();

      // Close payment modal if paid in full? No, let user decide.
    } catch (err) {
       console.error(err);
       showToast("error", "Erreur lors du paiement.");
    } finally {
       setSaving(false);
    }
  };

  /* --- CONFIG HANDLERS --- */
  const toggleFeeTypeExpand = (id) => {
    setExpandedFeeTypeIds(prev => {
      const copy = new Set(prev);
      const sid = String(id);
      copy.has(sid) ? copy.delete(sid) : copy.add(sid);
      return copy;
    });
  };

  /* --- RENDERERS --- */
  const renderStatsBar = () => {
    // Logique exacte de repli: global.total_expected OU global.total_due
    const expected = stats ? Number(stats.global?.total_expected ?? stats.global?.total_due ?? 0) : 0;
    const paid = stats ? Number(stats.global?.total_paid ?? 0) : 0;
    
    // Calcul du reste
    const remaining = Math.max(0, expected - paid);
    const totalForCalc = Math.max(1, expected);
    const percentPaid = (paid / totalForCalc) * 100;
    
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-end">
            <div>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Total Attendu</p>
                <p className="text-2xl font-extrabold text-slate-800">{formatCurrency(expected)}</p>
            </div>
            <div className="text-right">
                <span className="inline-block bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-bold">
                    {percentPaid.toFixed(1)}% Recouvré
                </span>
            </div>
        </div>

        <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 shadow-lg transition-all duration-1000 ease-out" 
            style={{ width: `${percentPaid}%` }}
          ></div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 pt-2">
             <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-emerald-200 rounded text-emerald-700"><FaCheck size={10}/></div>
                    <span className="text-xs font-bold text-emerald-700 uppercase">Encaissé</span>
                </div>
                <div className="text-lg font-bold text-emerald-900">{formatCurrency(paid)}</div>
             </div>
             <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2 mb-1">
                    <div className="p-1 bg-amber-200 rounded text-amber-700"><FaHistory size={10}/></div>
                    <span className="text-xs font-bold text-amber-700 uppercase">Reste</span>
                </div>
                <div className="text-lg font-bold text-amber-900">{formatCurrency(remaining)}</div>
             </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm bg-opacity-90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
                    <FaMoneyBillWave size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">Comptabilité</h1>
                    <p className="text-xs font-medium text-slate-500">Suivi des Frais & Paiements</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => { fetchLookups(); fetchStats(); }} className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition border border-transparent hover:border-slate-200" title="Rafraîchir">
                    <FaSyncAlt className={loadingStats ? "animate-spin" : ""} />
                </button>
                {filterClassId && (
                    <button onClick={() => { setStudentForm({}); setStudentModalOpen(true); }} className="btn-primary flex items-center gap-2">
                        <FaPlus /> Nouvel Élève
                    </button>
                )}
            </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT: FILTERS & STUDENTS GRID (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
            {/* Filters Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                        <label className="label">Classe</label>
                        <div className="relative">
                            <select 
                                value={filterClassId} 
                                onChange={(e) => setFilterClassId(e.target.value)}
                                className="input-field w-full"
                            >
                                <option value="">-- Sélectionner --</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <FaChevronDown className="absolute right-3 top-9 text-slate-400 text-xs pointer-events-none" />
                        </div>
                    </div>
                    
                    <div className={`${!filterClassId ? 'opacity-40 pointer-events-none grayscale' : ''} transition-all duration-300`}>
                         <label className="label">Filtrer Élève</label>
                         <div className="relative">
                            <select 
                                value={selectedStudentIdFilter}
                                onChange={(e) => setSelectedStudentIdFilter(e.target.value)}
                                className="input-field w-full"
                            >
                                <option value="">-- Tous les élèves --</option>
                                {classStudents.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {(s.user?.first_name ?? s.firstname) + " " + (s.user?.last_name ?? s.lastname)}
                                    </option>
                                ))}
                            </select>
                            <FaChevronDown className="absolute right-3 top-9 text-slate-400 text-xs pointer-events-none" />
                         </div>
                    </div>

                    <div className={`${!filterClassId ? 'opacity-40 pointer-events-none grayscale' : ''} transition-all duration-300`}>
                        <label className="label">Recherche</label>
                        <div className="relative">
                            <FaSearch className="absolute left-3 top-9 text-slate-400" />
                            <input 
                                value={searchQ}
                                onChange={(e) => setSearchQ(e.target.value)}
                                placeholder="Nom, matricule..."
                                className="input-field w-full pl-9"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Students Grid */}
            <div>
                {loadingStudents ? (
                    <div className="text-center py-20">
                         <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-indigo-100 border-t-indigo-600 mb-4"></div>
                         <p className="text-slate-500 font-medium">Chargement des données...</p>
                    </div>
                ) : !filterClassId ? (
                    <div className="text-center py-20 bg-slate-100/50 rounded-3xl border-2 border-dashed border-slate-300">
                        <div className="bg-white p-4 rounded-full inline-block mb-4 shadow-sm">
                            <FaUserGraduate className="text-4xl text-slate-300" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-700">En attente de sélection</h3>
                        <p className="text-slate-500">Veuillez choisir une classe pour afficher les élèves.</p>
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-200">
                        <p className="text-slate-500">Aucun élève trouvé dans cette classe.</p>
                    </div>
                ) : (
                    <>
                    <div className="flex justify-between items-center mb-4 px-2">
                        <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">{students.length} Élèves trouvés</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                        {students.map(s => (
                            <div key={s.id} className="group bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-xl transition-all duration-300 flex flex-col overflow-hidden relative">
                                {/* Decorative Header */}
                                <div className="h-20 bg-gradient-to-r from-slate-100 to-slate-200"></div>
                                
                                {/* Avatar */}
                                <div className="absolute top-8 left-6">
                                    <div className="w-16 h-16 rounded-2xl bg-white p-1 shadow-md transform group-hover:rotate-3 transition-transform duration-300">
                                        <div className="w-full h-full bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-2xl">
                                            {(s.user?.first_name?.[0] || s.firstname?.[0] || "E").toUpperCase()}
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="pt-8 px-6 pb-6 flex-1 flex flex-col">
                                    <div className="mt-2 mb-4">
                                        <h3 className="font-bold text-slate-800 text-lg truncate leading-tight" title={s.user?.first_name + " " + s.user?.last_name}>
                                            {s.user?.first_name ?? s.firstname} <br/> {s.user?.last_name ?? s.lastname}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1 truncate">{s.user?.email || "Pas d'email"}</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-6">
                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded uppercase tracking-wide border border-slate-200">
                                            {s.school_class?.name || "N/A"}
                                        </span>
                                        <span className="text-[10px] font-mono text-slate-400">ID: {s.id}</span>
                                    </div>

                                    <div className="mt-auto">
                                        <button 
                                            onClick={() => openFeesForStudent(s)}
                                            className="w-full py-3 rounded-xl bg-white border-2 border-indigo-100 text-indigo-700 font-bold text-sm hover:bg-indigo-600 hover:border-indigo-600 hover:text-white transition-all flex items-center justify-center gap-2"
                                        >
                                            <FaWallet /> Dossier Financier
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    </>
                )}
            </div>
        </div>

        {/* RIGHT: SIDEBAR (4 cols) */}
        <aside className="lg:col-span-4 space-y-8">
            
            {/* Stats Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 sticky top-24">
                <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mb-6">Tableau de bord</h3>
                {loadingStats ? <div className="animate-pulse h-32 bg-slate-100 rounded-xl"></div> : renderStatsBar()}
            </div>

            {/* Fee Types Config */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                 <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-700 text-sm">Types de frais</h3>
                    <button onClick={() => { setShowFeeTypeModal(true); setCurrentFeeType({ id: null, name: "", description: "", is_active: true, amounts: [] }) }} className="text-xs bg-slate-800 text-white px-3 py-1.5 rounded-lg hover:bg-slate-700 transition font-medium">
                        + Nouveau
                    </button>
                 </div>
                 <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {feeTypes.length === 0 && <div className="p-6 text-center text-sm text-slate-400 italic">Aucune configuration.</div>}
                    {feeTypes.map(ft => {
                        const isExpanded = expandedFeeTypeIds.has(String(ft.id));
                        return (
                            <div key={ft.id} className="bg-white group">
                                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition duration-200" onClick={() => toggleFeeTypeExpand(ft.id)}>
                                    <div>
                                        <div className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">{ft.name}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{(ft.amounts || []).length} niveaux</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`w-2 h-2 rounded-full shadow-sm ${ft.is_active ? 'bg-emerald-500 shadow-emerald-200' : 'bg-red-500 shadow-red-200'}`}></span>
                                        {isExpanded ? <FaChevronUp className="text-slate-300" size={12} /> : <FaChevronDown className="text-slate-300" size={12} />}
                                    </div>
                                </div>
                                
                                {isExpanded && (
                                    <div className="bg-slate-50/80 p-3 border-t border-slate-100 animate-slideIn">
                                        <div className="flex gap-2 mb-3">
                                            <button onClick={() => { setShowFeeTypeModal(true); setCurrentFeeType(ft); }} className="flex-1 py-1.5 text-xs border border-slate-200 bg-white rounded-md text-slate-600 font-medium hover:border-indigo-300 hover:text-indigo-600 transition">Modifier</button>
                                            <button onClick={() => { setShowAmountModal(true); setCurrentAmount({ id: null, fee_type: ft.id, level: "", amount: "", is_active: true }); }} className="flex-1 py-1.5 text-xs bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 shadow-sm">+ Montant</button>
                                        </div>
                                        <div className="space-y-2">
                                            {(ft.amounts || []).map(a => (
                                                <div key={a.id} className="flex justify-between items-center text-xs bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
                                                    <span className="font-semibold text-slate-700">{a.level_name || a.level?.name || a.level}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-slate-600 bg-slate-100 px-1.5 rounded">{formatCurrency(a.amount)}</span>
                                                        <button onClick={() => { setShowAmountModal(true); setCurrentAmount(a); }} className="text-slate-400 hover:text-indigo-600 transition"><FaEdit /></button>
                                                    </div>
                                                </div>
                                            ))}
                                            {(ft.amounts || []).length === 0 && <div className="text-xs text-slate-400 italic text-center py-2">Aucun montant défini.</div>}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                 </div>
            </div>

        </aside>
      </main>

      {/* ======================= MODALS ======================= */}

      {/* 1. STUDENT MODAL */}
      <Modal title={studentForm.id ? "Modifier l'Étudiant" : "Nouvel Inscription"} isOpen={studentModalOpen} onClose={() => setStudentModalOpen(false)}>
           <div className="grid gap-5">
               <div className="grid grid-cols-2 gap-5">
                  <div>
                      <label className="label">Prénom</label>
                      <input className="input-field" value={studentForm.first_name || ""} onChange={e => setStudentForm({...studentForm, first_name: e.target.value})} />
                  </div>
                  <div>
                      <label className="label">Nom</label>
                      <input className="input-field" value={studentForm.last_name || ""} onChange={e => setStudentForm({...studentForm, last_name: e.target.value})} />
                  </div>
               </div>
               <div>
                   <label className="label">Email</label>
                   <input className="input-field" type="email" value={studentForm.email || ""} onChange={e => setStudentForm({...studentForm, email: e.target.value})} />
               </div>
               {!studentForm.id && (
                 <div>
                    <label className="label">Nom d'utilisateur</label>
                    <input className="input-field" value={studentForm.username || ""} onChange={e => setStudentForm({...studentForm, username: e.target.value})} />
                 </div>
               )}
               <div className="grid grid-cols-2 gap-5">
                   <div>
                        <label className="label">Classe</label>
                        <select className="input-field" value={studentForm.school_class_id || ""} onChange={e => setStudentForm({...studentForm, school_class_id: e.target.value})}>
                            <option value="">Choisir...</option>
                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                   </div>
                   <div>
                        <label className="label">Date Naissance</label>
                        <input type="date" className="input-field" value={studentForm.date_of_birth || ""} onChange={e => setStudentForm({...studentForm, date_of_birth: e.target.value})} />
                   </div>
               </div>
               <div>
                   <label className="label">Mot de passe {studentForm.id && "(Optionnel)"}</label>
                   <input type="password" className="input-field" value={studentForm.password || ""} onChange={e => setStudentForm({...studentForm, password: e.target.value})} />
               </div>
           </div>
           <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button onClick={() => setStudentModalOpen(false)} className="btn-secondary">Annuler</button>
                {/* Placeholder for submit function */}
                <button className="btn-primary" disabled={saving}>
                    {saving ? "..." : "Enregistrer"}
                </button>
           </div>
      </Modal>

      {/* 2. FEES "FILE" MODAL */}
      <Modal title="Dossier Financier" isOpen={feesModalOpen} onClose={() => setFeesModalOpen(false)} size="lg">
         {selectedStudent && (
             <div className="space-y-8">
                 {/* Student Header */}
                 <div className="bg-slate-800 p-6 rounded-2xl text-white flex items-center gap-6 shadow-xl shadow-slate-200">
                     <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center font-bold text-2xl border-2 border-white/20 backdrop-blur-sm">
                         {(selectedStudent.user?.first_name?.[0] || "E")}
                     </div>
                     <div>
                         <h4 className="font-bold text-2xl">
                            {selectedStudent.user?.first_name} {selectedStudent.user?.last_name}
                         </h4>
                         <div className="flex items-center gap-4 mt-2 text-slate-300 text-sm">
                            <span className="bg-slate-700 px-2 py-1 rounded text-white">{selectedStudent.school_class?.name}</span>
                            <span>{selectedStudent.user?.email}</span>
                         </div>
                     </div>
                 </div>

                 {/* Add Fee Section */}
                 <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                     <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-4">Ajouter un frais manuellement</h5>
                     <div className="flex flex-col md:flex-row gap-4 items-end">
                         <div className="flex-1 w-full">
                             <label className="label">Type de frais</label>
                             <select className="input-field" value={feeForm.fee_type_id} onChange={e => setFeeForm({...feeForm, fee_type_id: e.target.value})}>
                                 <option value="">-- Choisir --</option>
                                 {feeTypes.filter(ft => ft.is_active).map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
                             </select>
                         </div>
                         <div className="w-full md:w-40">
                             <label className="label">Montant</label>
                             <input type="number" className="input-field" placeholder="Auto" value={feeForm.amount} onChange={e => setFeeForm({...feeForm, amount: e.target.value})} />
                         </div>
                         <button onClick={submitFee} disabled={saving} className="btn-primary h-[42px] flex items-center gap-2 whitespace-nowrap">
                             {saving ? "..." : <><FaPlus /> Ajouter</>}
                         </button>
                     </div>
                 </div>

                 {/* Fees List */}
                 <div>
                     <div className="flex justify-between items-center mb-4">
                         <h5 className="font-bold text-slate-800 text-lg">Historique des Frais</h5>
                         <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                             <button onClick={() => { setFeesShowAll(false); fetchFees(selectedStudent.id, { unpaidOnly: true }); }} className={`text-xs font-bold px-3 py-1.5 rounded-md transition ${!feesShowAll ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Impayés</button>
                             <button onClick={() => { setFeesShowAll(true); fetchFees(selectedStudent.id, { unpaidOnly: false }); }} className={`text-xs font-bold px-3 py-1.5 rounded-md transition ${feesShowAll ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Tout</button>
                         </div>
                     </div>
                     
                     <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                         {loadingFees ? <div className="p-10 text-center text-slate-400">Chargement...</div> : 
                          fees.length === 0 ? <div className="p-10 text-center text-slate-400 italic bg-slate-50">Aucun frais trouvé pour ce filtre.</div> : 
                          (
                             <table className="w-full text-left text-sm">
                                 <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold border-b border-slate-200">
                                     <tr>
                                         <th className="px-6 py-4">Désignation</th>
                                         <th className="px-6 py-4">Montant</th>
                                         <th className="px-6 py-4">Payé</th>
                                         <th className="px-6 py-4">Reste</th>
                                         <th className="px-6 py-4 text-center">État</th>
                                         <th className="px-6 py-4 text-right">Actions</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                     {fees.map(f => {
  const totalAmt = Number(f.amount || 0);
  const paidAmt = Number(f.total_paid ?? f.paid_amount ?? 0);
  const remaining = Math.max(0, Number(f.total_remaining ?? (totalAmt - paidAmt)));
  const isPaid = !!f.paid || remaining === 0;

  return (
    <tr key={f.id} className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4 font-bold text-slate-700">{f.fee_type_name || f.fee_type?.name || "Frais Divers"}</td>
      <td className="px-6 py-4 font-mono text-slate-600">{formatCurrency(totalAmt)}</td>
      <td className="px-6 py-4 font-mono text-emerald-600">{formatCurrency(paidAmt)}</td>
      <td className="px-6 py-4 font-mono text-amber-600 font-bold">{remaining > 0 ? formatCurrency(remaining) : "0"}</td>
      <td className="px-6 py-4 text-center">
        {isPaid
          ? <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-extrabold border border-emerald-200">PAYÉ</span>
          : <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-extrabold border border-amber-200">IMPAYÉ</span>
        }
      </td>
      <td className="px-6 py-4 text-right flex justify-end gap-2">
        {!isPaid && (
          <button onClick={() => openPaymentsForFee(f)} className="btn-secondary py-1.5 px-3 text-xs flex items-center gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
            <FaMoneyBillWave /> Payer
          </button>
        )}
        <button onClick={() => deleteFee(f.id)} className="p-2 bg-white border border-slate-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-200 transition shadow-sm">
          <FaTrash />
        </button>
      </td>
    </tr>
  );
})}

                                 </tbody>
                             </table>
                          )
                         }
                     </div>
                 </div>
             </div>
         )}
      </Modal>

      {/* 3. PAYMENTS MODAL (Strict Logic Restored) */}
      <Modal title="Nouveau Paiement" isOpen={paymentsModalOpen} onClose={() => setPaymentsModalOpen(false)} size="md">
           <div className="space-y-6">
               {selectedFee && (
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm grid grid-cols-3 gap-4 text-center">
                       <div>
                           <p className="text-xs text-slate-500 uppercase">Montant Total</p>
                           <p className="font-bold text-slate-800 text-lg">{formatCurrency(selectedFee.amount)}</p>
                       </div>
                       <div>
                           <p className="text-xs text-slate-500 uppercase">Déjà Payé</p>
                           <p className="font-bold text-emerald-600 text-lg">{formatCurrency(selectedFee.paid_amount)}</p>
                       </div>
                       <div className="bg-white rounded-lg border border-amber-200 shadow-sm p-1">
                           <p className="text-xs text-amber-600 uppercase font-bold">Reste à Payer</p>
                           <p className="font-extrabold text-amber-600 text-lg">{formatCurrency(Math.max(0, Number(selectedFee.amount) - Number(selectedFee.paid_amount)))}</p>
                       </div>
                   </div>
               )}

               <div className="grid gap-4">
                   <div>
                       <label className="label">Montant du versement</label>
                       <div className="relative">
                           <input 
                                type="number" 
                                className="input-field pl-10 font-mono text-xl py-3 font-bold text-slate-700" 
                                value={paymentForm.amount} 
                                onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} 
                           />
                           <FaMoneyBillWave className="absolute left-4 top-4 text-slate-400" />
                       </div>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-4">
                       <div>
                           <label className="label">Méthode de paiement</label>
                           <div className="grid grid-cols-3 gap-2">
                               {[
                                 {id: 'CASH', icon: FaCoins, label: 'Espèces'},
                                 {id: 'MOBILE_MONEY', icon: FaMobileAlt, label: 'Mobile'},
                                 {id: 'BANK', icon: FaUniversity, label: 'Banque'},
                               ].map(m => (
                                   <button 
                                     key={m.id} 
                                     onClick={() => setPaymentForm({...paymentForm, method: m.id})}
                                     className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${paymentForm.method === m.id ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                   >
                                       <m.icon className="mb-1 text-lg" />
                                       <span className="text-xs font-bold">{m.label}</span>
                                   </button>
                               ))}
                           </div>
                       </div>
                   </div>

                   <div className="grid grid-cols-1 gap-4">
                        <div>
                           <label className="label">Référence (Optionnel)</label>
                           <input className="input-field" placeholder="Ex: Numéro de chèque, ID Transaction..." value={paymentForm.reference} onChange={e => setPaymentForm({...paymentForm, reference: e.target.value})} />
                       </div>
                       <div>
                           <label className="label">Note (Optionnel)</label>
                           <textarea className="input-field h-20 resize-none" placeholder="Observation..." value={paymentForm.note} onChange={e => setPaymentForm({...paymentForm, note: e.target.value})}></textarea>
                       </div>
                   </div>
               </div>

               <div className="pt-4 border-t border-slate-100">
                   <button onClick={submitPayment} disabled={saving} className="btn-primary w-full py-3.5 text-lg shadow-xl shadow-indigo-200">
                       {saving ? "Traitement en cours..." : "Confirmer le Paiement"}
                   </button>
               </div>

               {/* Payments History */}
               <div className="mt-4">
                   <h6 className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-3">Historique pour ce frais</h6>
                   {loadingPayments ? <div className="h-10 bg-slate-100 animate-pulse rounded"></div> : 
                    payments.length === 0 ? <div className="text-center text-slate-400 text-xs py-2 bg-slate-50 rounded-lg border border-dashed border-slate-200">Aucun paiement reçu.</div> : 
                    <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {payments.map(p => (
  <div key={p.id} className="flex justify-between items-center text-sm bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
        <FaReceipt />
      </div>
      <div>
        <span className="font-bold text-slate-800 block">{formatCurrency(p.amount)}</span>
        <span className="text-xs text-slate-500">{new Date(p.payment_date || p.created_at).toLocaleDateString()} • {p.method}</span>
      </div>
    </div>
    <div className={`${p.validated ? 'text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded font-bold' : 'text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded font-bold'}`}>
      {p.validated ? 'Validé' : 'En attente'}
    </div>
  </div>
))}

                    </div>
                   }
               </div>
           </div>
      </Modal>

      {/* 4 & 5. CONFIG MODALS (FeeType & Amount) */}
      <Modal title="Type de Frais" isOpen={showFeeTypeModal} onClose={() => setShowFeeTypeModal(false)}>
           {/* Content kept simple as before */}
           <div className="space-y-4">
               {/* ... Inputs for fee type ... */}
               <div><label className="label">Nom</label><input className="input-field" value={currentFeeType.name} onChange={e => setCurrentFeeType({...currentFeeType, name: e.target.value})} /></div>
               <div className="flex justify-end"><button className="btn-primary">Enregistrer</button></div>
           </div>
      </Modal>
      
      <Modal title="Configuration Montant" isOpen={showAmountModal} onClose={() => setShowAmountModal(false)}>
           <div className="space-y-4">
                {/* ... Inputs for amount ... */}
                <div><label className="label">Montant</label><input type="number" className="input-field" value={currentAmount.amount} onChange={e => setCurrentAmount({...currentAmount, amount: e.target.value})} /></div>
                <div className="flex justify-end"><button className="btn-primary">Enregistrer</button></div>
           </div>
      </Modal>
      {/* --- MODALE DES FRAIS (ASSIGNATION) --- */}
<Modal 
  title={`Dossier Financier : ${selectedStudent?.user?.first_name || ''} ${selectedStudent?.user?.last_name || ''}`}
  isOpen={feesModalOpen} 
  onClose={() => setFeesModalOpen(false)}
  size="xl"
>
  <div className="space-y-8">
    
    {/* Formulaire d'ajout/édition de frais */}
    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200">
      <h4 className="text-sm font-bold text-slate-700 uppercase mb-4 flex items-center gap-2">
        <FaPlus className="text-indigo-600"/> 
        {feeForm.id ? "Modifier le frais" : "Ajouter un frais"}
      </h4>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        {/* Choix du Type de Frais */}
        <div className="md:col-span-4">
          <label className="label">Type de frais</label>
          <select 
            value={feeForm.fee_type_id} 
            onChange={(e) => {
               // Quand on change le type, on peut pré-remplir le montant si tu veux, 
               // mais ici on laisse l'utilisateur libre ou on cherche un montant par défaut
               const ft = feeTypes.find(t => String(t.id) === e.target.value);
               // Astuce : si le feeType a un montant par défaut unique, tu peux le mettre ici
               // setFeeForm(prev => ({ ...prev, fee_type_id: e.target.value, amount: ft?.default_amount || "" }))
               setFeeForm(prev => ({ ...prev, fee_type_id: e.target.value }));
            }}
            disabled={!!feeForm.id} // On ne change pas le type en édition
            className="input-field w-full"
          >
            <option value="">-- Choisir --</option>
            {feeTypes.filter(t => t.is_active).map(ft => (
              <option key={ft.id} value={ft.id}>{ft.name}</option>
            ))}
          </select>
        </div>

        {/* Montant (Libre) */}
        <div className="md:col-span-3">
          <label className="label">Montant (FCFA)</label>
          <input 
            type="number" 
            value={feeForm.amount}
            onChange={(e) => setFeeForm({...feeForm, amount: e.target.value})}
            placeholder="0"
            className="input-field w-full font-mono font-bold"
          />
        </div>

        {/* DATE D'ÉCHÉANCE (NOUVEAU) */}
        <div className="md:col-span-3">
          <label className="label">Échéance (Due Date)</label>
          <input 
            type="date" 
            value={feeForm.due_date || ""}
            onChange={(e) => setFeeForm({...feeForm, due_date: e.target.value})}
            className="input-field w-full"
          />
        </div>

        {/* Bouton de Validation */}
        <div className="md:col-span-2">
          <button 
            onClick={submitFee} 
            disabled={saving}
            className="btn-primary w-full h-[42px] flex items-center justify-center gap-2"
          >
            {saving ? <FaSyncAlt className="animate-spin"/> : (feeForm.id ? <FaCheck/> : <FaPlus/>)}
            <span>{feeForm.id ? "OK" : "Ajouter"}</span>
          </button>
        </div>
      </div>
    </div>

    {/* Liste des frais existants */}
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-bold text-slate-800">Historique des frais</h4>
        <div className="flex items-center gap-2 text-sm">
           <label className="flex items-center gap-2 cursor-pointer select-none">
             <input type="checkbox" checked={feesShowAll} onChange={(e) => {
                setFeesShowAll(e.target.checked);
                // On recharge avec le nouveau filtre
                if(selectedStudent) fetchFees(selectedStudent.id, { unpaidOnly: !e.target.checked });
             }} className="rounded text-indigo-600 focus:ring-indigo-500"/>
             <span className="text-slate-600">Voir tout (y compris soldés)</span>
           </label>
        </div>
      </div>

      {loadingFees ? (
         <div className="text-center py-10"><FaSyncAlt className="animate-spin mx-auto text-indigo-500"/></div>
      ) : fees.length === 0 ? (
         <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500">Aucun frais trouvé.</div>
      ) : (
        <div className="overflow-x-auto border rounded-xl shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Montant</th>
                <th className="px-4 py-3 text-right">Payé</th>
                <th className="px-4 py-3 text-right">Reste</th>
                <th className="px-4 py-3 text-center">Échéance</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {fees.map(fee => (
                <tr key={fee.id} className="hover:bg-slate-50 transition">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {fee.fee_type_name}
                    <div className="text-[10px] text-slate-400 font-mono">{fee.created_at?.substring(0,10)}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{formatCurrency(fee.amount)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-bold">{formatCurrency(fee.total_paid)}</td>
                  <td className="px-4 py-3 text-right text-amber-700 font-bold bg-amber-50/50">
                    {formatCurrency(fee.total_remaining)}
                  </td>
                  
                  {/* Affichage Due Date */}
                  <td className="px-4 py-3 text-center">
                    {fee.due_date ? (
                        <span className={`px-2 py-1 rounded text-xs font-bold border ${
                            new Date(fee.due_date) < new Date() && fee.total_remaining > 0
                            ? "bg-red-50 text-red-700 border-red-200" 
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                            {fee.due_date}
                        </span>
                    ) : <span className="text-slate-300">-</span>}
                  </td>

                  <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                    {/* Bouton Payer (si reste à payer) */}
                    {Number(fee.total_remaining) > 0 && (
                        <button 
                          onClick={() => openPaymentsForFee(fee)}
                          className="p-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition" 
                          title="Encaisser un paiement"
                        >
                          <FaMoneyBillWave />
                        </button>
                    )}
                    
                    {/* Bouton Editer */}
                    <button 
                      onClick={() => setFeeForm({ 
                          id: fee.id, 
                          fee_type_id: fee.fee_type, 
                          amount: fee.amount,
                          due_date: fee.due_date || "" // Pré-remplir la date
                      })}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition"
                    >
                      <FaEdit />
                    </button>

                    {/* Bouton Supprimer (seulement si rien payé pour intégrité) */}
                    {Number(fee.total_paid) === 0 && (
                        <button 
                        onClick={() => deleteFee(fee.id)}
                        className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                        >
                        <FaTrash />
                        </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
</Modal>

      <style>{`
  .label { @apply block text-xs font-bold text-slate-500 uppercase mb-1.5 tracking-wide; }

  /* input-field : bord clair + ombre légère + focus visible (corrige cas "sans contour") */
  .input-field { 
    @apply w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 outline-none transition-all shadow-sm;
  }

  /* boutons primaires/secondaires mieux contrastés et avec bord pour éviter "tout blanc" */
  .btn-primary { 
    @apply bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transform transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none;
    border: 1px solid rgba(79,70,229,0.18); /* subtle border to make it stand out on white */
  }
  .btn-primary:focus { outline: none; box-shadow: 0 0 0 4px rgba(99,102,241,0.12); }

  .btn-secondary { 
    @apply bg-white text-slate-600 border-2 border-slate-200 px-5 py-2.5 rounded-xl font-bold hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 transition-all active:scale-95 shadow-sm;
  }

  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  @keyframes slideIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .animate-slideIn { animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
`}</style>

    </div>
  );
}