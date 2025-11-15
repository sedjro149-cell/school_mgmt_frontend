// src/StudentsWithFees.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { fetchData, postData,  patchData, deleteData } from "./api";

/*
  StudentsWithFees — Full component (filters card + sidebar + all modals)
  Converted to use central src/api.js helpers instead of axios instance.
*/

function formatCurrency(v) {
  if (v == null || v === "") return "";
  const n = Number(v);
  if (Number.isNaN(n)) return v;
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function StudentsWithFees() {
  // lookups
  const [classes, setClasses] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);
  // students
  const [classStudents, setClassStudents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentsError, setStudentsError] = useState("");

  // filters / search
  const [filterClassId, setFilterClassId] = useState("");
  const [selectedStudentIdFilter, setSelectedStudentIdFilter] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const searchDebRef = useRef(null);

  // modals / fees / payments
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [feesModalOpen, setFeesModalOpen] = useState(false);
  const [paymentsModalOpen, setPaymentsModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  // forms & states
  const [studentForm, setStudentForm] = useState({});
  const [savingStudent, setSavingStudent] = useState(false);

  const [fees, setFees] = useState([]);
  const [loadingFees, setLoadingFees] = useState(false);
  const [feesShowAll, setFeesShowAll] = useState(true);
  const [selectedFee, setSelectedFee] = useState(null);
  const [feeForm, setFeeForm] = useState({ id: null, fee_type_id: "", amount: "" });
  const [savingFee, setSavingFee] = useState(false);

  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "", reference: "", note: "" });
  const [savingPayment, setSavingPayment] = useState(false);

  // fee-types & stats
  const [showFeeTypeModal, setShowFeeTypeModal] = useState(false);
  const [currentFeeType, setCurrentFeeType] = useState({ id: null, name: "", description: "", is_active: true, amounts: [] });

  const [showAmountModal, setShowAmountModal] = useState(false);
  const [currentAmount, setCurrentAmount] = useState({ id: null, fee_type: null, level: "", amount: "", is_active: true });

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const [expandedFeeTypeIds, setExpandedFeeTypeIds] = useState(new Set());

  // ---------- lookups ----------
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
      console.error("fetchLookups", e?.body || e?.message || e);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      // small query param inline
      const data = await fetchData("/fees/statistics/?validated=1");
      setStats(data || null);
    } catch (e) {
      console.error("fetchStats", e?.body || e?.message || e);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchLookups();
    fetchStats();
    setClassStudents([]);
    setStudents([]);
  }, [fetchLookups, fetchStats]);

  // ---------- class selection: load students for that class ONLY ----------
  useEffect(() => {
    let mounted = true;
    async function loadByClass(classId) {
      if (!classId) {
        if (mounted) {
          setClassStudents([]);
          setStudents([]);
          setSelectedStudentIdFilter("");
        }
        return;
      }
      setLoadingStudents(true);
      setStudentsError("");
      try {
        const arr = await fetchData(`/core/admin/students/by-class/${classId}/`);
        if (!mounted) return;
        setClassStudents(arr || []);
        setStudents(arr || []);
        setSelectedStudentIdFilter("");
      } catch (err) {
        console.error("loadByClass", err?.body || err?.message || err);
        setStudentsError("Erreur lors du chargement des élèves de la classe.");
        setClassStudents([]);
        setStudents([]);
      } finally {
        if (mounted) setLoadingStudents(false);
      }
    }
    loadByClass(filterClassId);
    return () => { mounted = false; };
  }, [filterClassId]);

  // when a specific student is selected from dropdown, show only that student
  useEffect(() => {
    if (!selectedStudentIdFilter) {
      setStudents(classStudents);
      return;
    }
    const s = classStudents.find(st => String(st.id) === String(selectedStudentIdFilter));
    setStudents(s ? [s] : []);
  }, [selectedStudentIdFilter, classStudents]);

  // ---------- client-side search (only filters currently loaded students) ----------
  useEffect(() => {
    if (searchDebRef.current) clearTimeout(searchDebRef.current);
    searchDebRef.current = setTimeout(() => {
      const q = (searchQ || "").trim().toLowerCase();
      if (!q) {
        if (selectedStudentIdFilter) {
          const s = classStudents.find(st => String(st.id) === String(selectedStudentIdFilter));
          setStudents(s ? [s] : []);
        } else {
          setStudents(classStudents);
        }
        return;
      }
      const filtered = classStudents.filter(st => {
        const fullName = `${st.user?.first_name ?? st.firstname ?? ""} ${st.user?.last_name ?? st.lastname ?? ""}`.toLowerCase();
        const username = (st.user?.username || "").toLowerCase();
        const email = (st.user?.email || "").toLowerCase();
        const idStr = String(st.id);
        return fullName.includes(q) || username.includes(q) || email.includes(q) || idStr.includes(q);
      });
      setStudents(filtered);
    }, 220);
    return () => clearTimeout(searchDebRef.current);
  }, [searchQ, classStudents, selectedStudentIdFilter]);

  // ---------- utilities & small components ----------
  const toggleFeeTypeExpand = (id) => {
    setExpandedFeeTypeIds(prev => {
      const copy = new Set(prev);
      const sid = String(id);
      if (copy.has(sid)) copy.delete(sid);
      else copy.add(sid);
      return copy;
    });
  };

  const getFeeTypeDisplay = (f) => {
    if (!f) return "—";
    const ft = f.fee_type;
    if (ft && typeof ft === "object") return ft.name ?? ft.fee_type_name ?? String(ft.id ?? "—");
    if (f.fee_type_name) return f.fee_type_name;
    if (f.fee_type_display) return f.fee_type_display;
    if (typeof ft === "string" || typeof ft === "number") return String(ft);
    return "—";
  };

  const StatsBar = ({ stats }) => {
    if (!stats) return <div className="text-sm text-gray-500">Aucune donnée</div>;
    const expected = Number(stats.global?.total_expected ?? stats.global?.total_due ?? 0);
    const paid = Number(stats.global?.total_paid ?? 0);
    const remaining = Math.max(0, expected - paid);
    const total = Math.max(1, expected);
    const wPaid = Math.round((paid / total) * 100);
    const wRemaining = Math.min(100, Math.round((remaining / total) * 100));
    return (
      <div className="mt-2">
        <div className="w-full bg-slate-100 rounded-lg h-4 overflow-hidden flex">
          <div style={{ width: `${wPaid}%` }} className="h-4 bg-emerald-400" />
          <div style={{ width: `${wRemaining}%` }} className="h-4 bg-amber-300" />
          <div style={{ width: `${100 - wPaid - wRemaining}%` }} className="h-4 bg-slate-50" />
        </div>
        <div className="mt-2 text-xs text-gray-600 flex gap-3">
          <div>Attendu: <strong>{formatCurrency(expected)}</strong></div>
          <div>Payé: <strong>{formatCurrency(paid)}</strong></div>
          <div>Reste: <strong>{formatCurrency(remaining)}</strong></div>
        </div>
      </div>
    );
  };

  // ---------- fees & payments functions ----------
  const openFeesForStudent = async (student) => {
    setSelectedStudent(student);
    setFeesShowAll(true);
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
      setFees(res || []);
    } catch (err) {
      console.error("fetchFees", err?.body || err?.message || err);
      alert("Erreur lors de la récupération des frais pour l'étudiant.");
    } finally {
      setLoadingFees(false);
    }
  };

  const toggleFeesShowAll = async () => {
    if (!selectedStudent) return;
    const target = !feesShowAll;
    setFeesShowAll(target);
    await fetchFees(selectedStudent.id, { unpaidOnly: !target });
  };

  const submitFee = async () => {
    if (!selectedStudent) return alert("Aucun étudiant sélectionné.");
    if (!feeForm.fee_type_id) return alert("Veuillez choisir un type de frais.");
    setSavingFee(true);
    try {
      if (feeForm.id) {
        await patchData(`/fees/fees/${feeForm.id}/`, { amount: feeForm.amount, paid: feeForm.paid, payment_date: feeForm.payment_date });
        alert("Frais modifié.");
      } else {
        const payload = { student: selectedStudent.id, fee_type_id: feeForm.fee_type_id };
        if (feeForm.amount) payload.amount = feeForm.amount;
        await postData(`/fees/fees/`, payload);
        alert("Frais ajouté.");
      }
      await fetchFees(selectedStudent.id, { unpaidOnly: !feesShowAll });
    } catch (err) {
      console.error("submitFee", err?.body || err?.message || err);
      alert("Erreur lors de l'enregistrement du frais.");
    } finally {
      setSavingFee(false);
    }
  };

  const deleteFee = async (feeId) => {
    if (!window.confirm("Supprimer ce frais ?")) return;
    try {
      await deleteData(`/fees/fees/${feeId}/`);
      alert("Frais supprimé.");
      if (selectedStudent) await fetchFees(selectedStudent.id, { unpaidOnly: !feesShowAll });
    } catch (err) {
      console.error("deleteFee", err?.body || err?.message || err);
      alert("Erreur lors de la suppression du frais.");
    }
  };

  const validateFee = async (feeId, paid = true, payment_date = null) => {
    try {
      await patchData(`/fees/fees/${feeId}/validate_fee/`, { paid, payment_date });
      alert("Frais mis à jour.");
      if (selectedStudent) await fetchFees(selectedStudent.id, { unpaidOnly: !feesShowAll });
      fetchStats();
      fetchLookups();
    } catch (err) {
      console.error("validateFee", err?.body || err?.message || err);
      alert("Erreur lors de la validation du frais (admin uniquement).");
    }
  };

  const openPaymentsForFee = async (fee) => {
    setSelectedFee(fee);
    setPayments([]);
    setPaymentsModalOpen(true);
    await fetchPayments(fee.id);
  };

  const fetchPayments = async (feeId) => {
    setLoadingPayments(true);
    try {
      const res = await fetchData(`/fees/payments/?fee=${feeId}`);
      setPayments(res || []);
    } catch (err) {
      console.error("fetchPayments", err?.body || err?.message || err);
      alert("Erreur lors de la récupération des paiements.");
    } finally {
      setLoadingPayments(false);
    }
  };

  const submitPayment = async () => {
    if (!selectedFee) return alert("Aucun frais sélectionné.");
    if (!paymentForm.amount) return alert("Montant requis.");
    setSavingPayment(true);
    try {
      const payload = { fee: selectedFee.id, amount: paymentForm.amount, method: paymentForm.method || "", reference: paymentForm.reference || "", note: paymentForm.note || "" };
      await postData(`/fees/payments/`, payload);
      alert("Paiement créé.");
      await fetchPayments(selectedFee.id);
      if (selectedStudent) await fetchFees(selectedStudent.id, { unpaidOnly: !feesShowAll });
      setPaymentForm({ amount: "", method: "", reference: "", note: "" });
      fetchStats();
      fetchLookups();
    } catch (err) {
      console.error("submitPayment", err?.body || err?.message || err);
      alert("Erreur lors de la création du paiement.");
    } finally {
      setSavingPayment(false);
    }
  };

  const validatePayment = async (paymentId) => {
    try {
      await postData(`/fees/payments/${paymentId}/validate_payment/`, {});
      alert("Paiement validé (admin).");
      if (selectedFee) await fetchPayments(selectedFee.id);
      if (selectedStudent) await fetchFees(selectedStudent.id, { unpaidOnly: !feesShowAll });
      fetchStats();
      fetchLookups();
    } catch (err) {
      console.error("validatePayment", err?.body || err?.message || err);
      alert("Erreur lors de la validation du paiement (admin uniquement).");
    }
  };

  // ---------- FeeType & Amount management ----------
  const saveOrPatch = async (pathRoot, obj) => {
    if (obj.id) return patchData(`${pathRoot}${obj.id}/`, obj).then(r => r);
    return postData(pathRoot, obj).then(r => r);
  };

  const openFeeTypeModal = (ft = null) => {
    setCurrentFeeType(ft ? { ...ft } : { id: null, name: "", description: "", is_active: true, amounts: [] });
    setShowFeeTypeModal(true);
  };
  const closeFeeTypeModal = () => {
    setShowFeeTypeModal(false);
    setCurrentFeeType({ id: null, name: "", description: "", is_active: true, amounts: [] });
  };
  const [savingFeeType, setSavingFeeType] = useState(false);
  const [feeTypeError, setFeeTypeError] = useState(null);

  const saveFeeType = async () => {
    if (!currentFeeType.name || !currentFeeType.name.trim()) {
      return alert("Nom requis");
    }
    setFeeTypeError(null);
    setSavingFeeType(true);
    try {
      const payload = {
        id: currentFeeType.id,
        name: currentFeeType.name,
        description: currentFeeType.description,
        is_active: !!currentFeeType.is_active,
      };
      const saved = await saveOrPatch("/fees/fee-types/", payload);
      setFeeTypes(prev => {
        const exists = prev.find(x => x.id === saved.id);
        if (exists) return prev.map(x => (x.id === saved.id ? saved : x));
        return [saved, ...prev];
      });
      await fetchLookups();
      closeFeeTypeModal();
      fetchStats();
    } catch (e) {
      console.error("saveFeeType", e?.body || e?.message || e);
      const resp = e?.body;
      let msg = "Erreur sauvegarde type";
      if (resp) {
        if (typeof resp === "string") msg = resp;
        else if (Array.isArray(resp)) msg = resp.join("; ");
        else if (typeof resp === "object") msg = Object.entries(resp).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ");
      }
      setFeeTypeError(msg);
      alert(msg);
    } finally {
      setSavingFeeType(false);
    }
  };

  const deleteFeeType = async (id) => {
    if (!window.confirm("Supprimer ce type de frais ?")) return;
    try {
      await deleteData(`/fees/fee-types/${id}/`);
      await fetchLookups();
      fetchStats();
    } catch (e) {
      console.error(e);
      alert("Impossible de supprimer. Vérifiez les dépendances côté backend.");
    }
  };

  const openAmountModal = (feeType = null, amount = null) => {
    if (amount) setCurrentAmount({ ...amount, fee_type: amount.fee_type });
    else setCurrentAmount({ id: null, fee_type: feeType?.id ?? feeType, level: "", amount: "", is_active: true });
    setShowAmountModal(true);
  };
  const closeAmountModal = () => {
    setShowAmountModal(false);
    setCurrentAmount({ id: null, fee_type: null, level: "", amount: "", is_active: true });
  };
  const saveAmount = async () => {
    if (!currentAmount.fee_type || !currentAmount.level || !currentAmount.amount) return alert("FeeType, niveau et montant requis.");
    try {
      await saveOrPatch("/fees/fee-type-amounts/", {
        id: currentAmount.id,
        fee_type: currentAmount.fee_type,
        level: currentAmount.level,
        amount: currentAmount.amount,
        is_active: currentAmount.is_active,
      });
      await fetchLookups();
      closeAmountModal();
    } catch (e) {
      console.error(e);
      alert(e?.body || "Erreur sauvegarde montant");
    }
  };
  const deleteAmount = async (id) => {
    if (!window.confirm("Supprimer ce montant ?")) return;
    try {
      await deleteData(`/fees/fee-type-amounts/${id}/`);
      await fetchLookups();
    } catch (e) {
      console.error(e);
      alert("Impossible de supprimer le montant.");
    }
  };

  // ---------- Student modal helper (was missing in original) ----------
  const openStudentModal = (student = null) => {
    if (student) {
      setStudentForm({
        id: student.id,
        username: student.user?.username ?? "",
        email: student.user?.email ?? "",
        first_name: student.user?.first_name ?? student.firstname ?? "",
        last_name: student.user?.last_name ?? student.lastname ?? "",
        date_of_birth: student.date_of_birth ?? "",
        school_class_id: student.school_class?.id ?? student.school_class_id ?? filterClassId,
        parent_id: student.parent_id ?? "",
        password: "",
      });
    } else {
      setStudentForm({});
    }
    setStudentModalOpen(true);
  };

  // ---------- render students cards ----------
  const renderStudentsCards = () => {
    if (loadingStudents) return <div className="p-6 text-center text-gray-500">Chargement des étudiants...</div>;
    if (studentsError) return <div className="p-6 text-center text-red-500">{studentsError}</div>;
    if (!students || students.length === 0) {
      return <div className="p-6 text-center text-gray-500">Aucun étudiant à afficher. Sélectionnez une classe.</div>;
    }
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        {students.map((s) => (
          <article key={s.id} className="bg-white rounded-2xl p-4 shadow-md border border-slate-100 hover:shadow-lg transition">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-semibold">
                {(s.user?.first_name?.[0] || s.firstname?.[0] || "?").toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">{s.user?.first_name ?? s.firstname ?? ""} {s.user?.last_name ?? s.lastname ?? ""}</h3>
                  <div className="text-xs text-slate-500">#{s.id}</div>
                </div>
                <div className="mt-1 text-xs text-slate-600">{s.user?.username ?? ""} • {s.user?.email ?? ""}</div>

                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 rounded-md bg-slate-100">Classe: <strong className="ml-1 text-slate-800">{s.school_class?.name ?? '—'}</strong></span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <button onClick={() => openFeesForStudent(s)} className="text-sm bg-indigo-600 text-white px-3 py-2 rounded-md">Voir frais</button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  };

  // ---------- main render ----------
  return (
    <div className="p-6 bg-gradient-to-b from-slate-50 to-white min-h-screen text-slate-900">
      {/* Header */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Administration — Étudiants & Frais</h1>
          <p className="text-sm text-slate-500 mt-1">Choisissez une classe pour charger ses élèves ; la recherche opère seulement sur les élèves chargés.</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => { fetchLookups(); fetchStats(); }} className="px-3 py-2 rounded bg-slate-100 text-sm">Rafraîchir</button>
        </div>
      </header>

      {/* Layout: main + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2">
          {/* Filters card */}
          <section className="bg-white p-5 rounded-2xl shadow-md mb-6 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end md:gap-4 gap-3">
              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-500 mb-1 block">Classe</label>
                <select
                  value={filterClassId}
                  onChange={(e) => setFilterClassId(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-white"
                >
                  <option value="">Choisir une classe …</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="text-xs text-slate-400 mt-1">La sélection charge uniquement les élèves de la classe choisie.</div>
              </div>

              <div className="w-60">
                <label className="text-xs text-slate-500 mb-1 block">Élève</label>
                <select
                  value={selectedStudentIdFilter}
                  onChange={(e) => setSelectedStudentIdFilter(e.target.value)}
                  className="w-full border rounded px-3 py-2 bg-white"
                >
                  <option value="">Tous les élèves (de la classe)</option>
                  {classStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {(s.user?.first_name ?? s.firstname ?? '') + ' ' + (s.user?.last_name ?? s.lastname ?? '')} #{s.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-0">
                <label className="text-xs text-slate-500 mb-1 block">Recherche élèves (sur la liste chargée)</label>
                <div className="flex gap-2">
                  <input
                    value={searchQ}
                    onChange={(e) => setSearchQ(e.target.value)}
                    placeholder="Tapez un nom, username, email ou id (min 1 caract.)"
                    className="input"
                  />
                  <button
                    onClick={() => { setSearchQ(""); }}
                    className="px-4 py-2 rounded bg-indigo-600 text-white text-sm"
                  >
                    Réinitialiser
                  </button>
                </div>
                <div className="text-xs text-slate-400 mt-1">La recherche filtre uniquement les élèves présents sur la page.</div>
              </div>
            </div>
          </section>

          {/* Students list */}
          <main>
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {renderStudentsCards()}
            </div>
          </main>
        </div>

        {/* Sidebar */}
        <aside className="lg:col-span-1">
          <div className="sticky top-6 space-y-4">
            <div className="bg-white p-4 rounded-2xl shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-500">Total attendu</div>
                  <div className="text-lg font-bold">{stats ? formatCurrency(stats.global?.total_expected ?? stats.global?.total_due ?? 0) : (loadingStats ? "…" : "-")}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500">Total payé</div>
                  <div className="text-lg font-bold">{stats ? formatCurrency(stats.global?.total_paid ?? 0) : (loadingStats ? "…" : "-")}</div>
                </div>
              </div>
              <StatsBar stats={stats} />
            </div>

            <div className="bg-white p-4 rounded-2xl shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800">Types de frais</h3>
                <button onClick={() => { setShowFeeTypeModal(true); setCurrentFeeType({ id: null, name: "", description: "", is_active: true, amounts: [] }); }} className="px-3 py-2 rounded bg-indigo-600 text-white text-sm">+ Type</button>
              </div>

              <div className="space-y-3 max-h-[60vh] overflow-auto pr-2">
                {feeTypes.length === 0 && <div className="text-sm text-slate-500">Aucun type de frais.</div>}
                {feeTypes.map(ft => {
                  const isExpanded = expandedFeeTypeIds.has(String(ft.id));
                  const amounts = Array.isArray(ft.amounts) ? ft.amounts : [];
                  return (
                    <div key={ft.id} className="border rounded-lg p-3 bg-slate-50">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium text-slate-800">{ft.name}</div>
                          <div className="text-xs text-slate-500">{ft.description || '—'}</div>
                          <div className="text-xs text-slate-600 mt-1">{amounts.length} niveaux</div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className={`text-xs px-2 py-1 rounded-full ${ft.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{ft.is_active ? 'Actif' : 'Inactif'}</div>
                          <div className="flex gap-1">
                            <button onClick={() => toggleFeeTypeExpand(ft.id)} className="px-2 py-1 rounded text-xs bg-indigo-600 text-white">{isExpanded ? 'Cacher' : 'Détails'}</button>
                            <button onClick={() => { setShowFeeTypeModal(true); setCurrentFeeType(ft); }} className="px-2 py-1 rounded text-xs bg-blue-500 text-white">Éditer</button>
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="mt-3 space-y-2">
                          {amounts.length === 0 && <div className="text-xs text-slate-500">Aucun montant configuré.</div>}
                          {amounts.map(a => (
                            <div key={a.id} className="flex items-center justify-between bg-white p-2 rounded">
                              <div>
                                <div className="text-sm text-slate-800">{a.level_name || (a.level && a.level.name) || a.level}</div>
                                <div className="text-xs text-slate-500">Montant: {formatCurrency(a.amount)}</div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => { setShowAmountModal(true); setCurrentAmount(a); }} className="px-2 py-1 text-xs rounded bg-blue-500 text-white">Éditer</button>
                                <button onClick={async () => { if (!window.confirm("Supprimer ce montant ?")) return; try { await deleteData(`/fees/fee-type-amounts/${a.id}/`); await fetchLookups(); } catch (e) { alert("Impossible de supprimer le montant."); } }} className="px-2 py-1 text-xs rounded bg-red-500 text-white">Suppr</button>
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-end">
                            <button onClick={() => { setShowAmountModal(true); setCurrentAmount({ id: null, fee_type: ft.id, level: "", amount: "", is_active: true }); }} className="px-3 py-1 rounded bg-emerald-500 text-white text-xs">+ Montant</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ---------------- MODALS ---------------- */}
      {/* Student modal (create / edit) */}
      {studentModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h2 className="text-lg font-semibold mb-4">{studentForm?.id ? "Modifier l'étudiant" : "Ajouter un étudiant"}</h2>
            <div className="grid gap-3">
              {!studentForm?.id && <input placeholder="Nom d'utilisateur" value={studentForm.username ?? ""} onChange={(e) => setStudentForm(s => ({ ...s, username: e.target.value }))} className="input" />}
              <input placeholder="Email" value={studentForm.email ?? ""} onChange={(e) => setStudentForm(s => ({ ...s, email: e.target.value }))} className="input" />
              <div className="flex gap-2">
                <input placeholder="Prénom" value={studentForm.first_name ?? ""} onChange={(e) => setStudentForm(s => ({ ...s, first_name: e.target.value }))} className="input flex-1" />
                <input placeholder="Nom" value={studentForm.last_name ?? ""} onChange={(e) => setStudentForm(s => ({ ...s, last_name: e.target.value }))} className="input flex-1" />
              </div>
              <input type="date" value={studentForm.date_of_birth ?? ""} onChange={(e) => setStudentForm(s => ({ ...s, date_of_birth: e.target.value }))} className="input" />
              <select value={studentForm.school_class_id ?? ""} onChange={(e) => setStudentForm(s => ({ ...s, school_class_id: e.target.value }))} className="input">
                <option value="">Sélectionner une classe</option>
                {classes.map(cls => <option key={cls.id} value={cls.id}>{cls.name}</option>)}
              </select>
              <input placeholder="Parent (id) optionnel" value={studentForm.parent_id ?? ""} onChange={(e) => setStudentForm(s => ({ ...s, parent_id: e.target.value }))} className="input" />
              <input type="password" placeholder={studentForm.id ? "Mot de passe (laisser vide)" : "Mot de passe"} value={studentForm.password ?? ""} onChange={(e) => setStudentForm(s => ({ ...s, password: e.target.value }))} className="input" />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setStudentModalOpen(false)} className="px-4 py-2 rounded bg-gray-200">Annuler</button>
              <button onClick={async () => {
                const s = studentForm;
                if (!s.email || !s.first_name || !s.last_name) return alert("Email, prénom et nom sont requis.");
                if (!s.id && (!s.username || !s.password || !s.date_of_birth || !s.school_class_id)) return alert("Pour créer : username, password, date de naissance et classe sont requis.");
                setSavingStudent(true);
                try {
                  if (s.id) {
                    const userPayload = { email: s.email, first_name: s.first_name, last_name: s.last_name };
                    if (s.password) userPayload.password = s.password;
                    const payload = { user: userPayload, school_class_id: s.school_class_id || null, parent_id: s.parent_id || null };
                    if (s.date_of_birth) payload.date_of_birth = s.date_of_birth;
                    await patchData(`/core/admin/students/${s.id}/`, payload);
                    alert("Étudiant modifié avec succès !");
                  } else {
                    const payload = {
                      user: { username: s.username, email: s.email, first_name: s.first_name, last_name: s.last_name, password: s.password },
                      date_of_birth: s.date_of_birth,
                      school_class_id: s.school_class_id || null,
                      parent_id: s.parent_id || null,
                    };
                    await postData(`/core/admin/students/`, payload);
                    alert("Étudiant ajouté avec succès !");
                  }
                  if (filterClassId) {
                    const arr = await fetchData(`/core/admin/students/by-class/${filterClassId}/`);
                    setClassStudents(arr || []);
                    setStudents(arr || []);
                    setSelectedStudentIdFilter("");
                  }
                  setStudentModalOpen(false);
                } catch (err) {
                  console.error("submitStudent", err?.body || err?.message || err);
                  const resp = err?.body;
                  let msg = "";
                  if (typeof resp === "string") msg = resp;
                  else if (Array.isArray(resp)) msg = resp.join("; ");
                  else if (typeof resp === "object") msg = Object.entries(resp).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`).join(" | ");
                  alert("Erreur : " + msg);
                } finally {
                  setSavingStudent(false);
                }
              }} disabled={savingStudent} className={`px-4 py-2 rounded text-white ${savingStudent ? 'bg-yellow-500' : 'bg-green-600'}`}>{savingStudent ? 'Enregistrement...' : (studentForm.id ? 'Modifier' : 'Ajouter')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Fees modal */}
      {feesModalOpen && selectedStudent && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-6 overflow-auto">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-4xl p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Frais — {selectedStudent.user?.username ?? `${selectedStudent.id}`}</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => { setFeesModalOpen(false); setFees([]); }} className="px-3 py-1 rounded bg-gray-200">Fermer</button>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm text-gray-600">Affichage: <strong>{feesShowAll ? 'Tous' : 'Impayés seulement'}</strong></div>
                <div className="flex gap-2">
                  <button onClick={toggleFeesShowAll} className="px-3 py-1 rounded bg-gray-100 text-sm">{feesShowAll ? 'Afficher impayés' : 'Afficher tous'}</button>
                </div>
              </div>

              {loadingFees ? <div className="p-4">Chargement...</div> : (
                <div className="space-y-3">
                  {fees.map(f => (
                    <div key={f.id} className={`p-3 rounded-lg border ${f.paid ? 'border-green-100 bg-green-50' : 'border-red-100 bg-white'}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{getFeeTypeDisplay(f)}</div>
                          <div className="text-xs text-gray-600">Montant: <strong>{formatCurrency(f.amount)}</strong></div>
                          <div className="text-xs text-gray-500 mt-1">Statut: <strong>{f.paid ? 'Payé' : 'Impayé'}</strong></div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openPaymentsForFee(f)} className="px-2 py-1 rounded text-xs bg-indigo-600 text-white">Payer</button>
                          </div>
                          <div className="text-xs text-gray-500">{f.payment_date ? `Date: ${f.payment_date}` : ''}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {fees.length === 0 && <div className="text-center py-6 text-gray-500">Aucun frais à afficher.</div>}
                </div>
              )}

             

            </div>

          </div>
        </div>
      )}

      {/* Payments modal */}
      {paymentsModalOpen && selectedFee && (
        <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-6 overflow-auto">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-3xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Paiements — {selectedFee.fee_type?.name ?? selectedFee.id}</h3>
              <button onClick={() => { setPaymentsModalOpen(false); setPayments([]); }} className="px-3 py-1 bg-gray-200 rounded">Fermer</button>
            </div>

            <div className="mt-4">
              {loadingPayments ? <div>Chargement...</div> : (
                <div>
                  <div className="space-y-2">
                    {payments.map(p => (
                      <div key={p.id} className="p-3 rounded border flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{formatCurrency(p.amount)} — {p.method ?? '-'}</div>
                          <div className="text-xs text-gray-500">Réf: {p.reference ?? '-'}{p.note ? ` • ${p.note}` : ''}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs">{p.validated ? `Validé ${p.validated_at?.slice(0,10)}` : 'Non validé'}</div>
                          {!p.validated && <button onClick={() => validatePayment(p.id)} className="px-2 py-1 rounded bg-indigo-600 text-white text-xs">Valider</button>}
                        </div>
                      </div>
                    ))}
                    {payments.length === 0 && <div className="text-center text-gray-500 py-6">Aucun paiement.</div>}
                  </div>

                  <div className="mt-4 p-3 bg-slate-50 rounded">
                    <div className="flex gap-2">
                      <input placeholder="Montant" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} className="border rounded px-3 py-2 w-28" />
                      <input placeholder="Méthode" value={paymentForm.method} onChange={e => setPaymentForm(p => ({ ...p, method: e.target.value }))} className="border rounded px-3 py-2 w-28" />
                      <input placeholder="Référence" value={paymentForm.reference} onChange={e => setPaymentForm(p => ({ ...p, reference: e.target.value }))} className="border rounded px-3 py-2 w-28" />
                      <button onClick={submitPayment} disabled={savingPayment} className={`px-3 py-2 rounded text-white ${savingPayment ? 'bg-yellow-500' : 'bg-green-600'}`}>{savingPayment ? 'Création...' : 'Ajouter paiement'}</button>
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* FeeType modal */}
      {showFeeTypeModal && (
        <div className="fixed inset-0 bg-black/40 flex items-start md:items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto relative">
            <button onClick={closeFeeTypeModal} className="absolute right-4 top-4 text-gray-500 hover:text-gray-800">✕</button>
            <h2 className="text-xl font-bold mb-4">{currentFeeType.id ? "Modifier Type de frais" : "Nouveau Type de frais"}</h2>
            <div className="grid grid-cols-1 gap-3">
              <input placeholder="Nom" value={currentFeeType.name} onChange={(e)=>setCurrentFeeType({...currentFeeType, name: e.target.value})} className="p-2 border rounded-xl" />
              <textarea placeholder="Description" value={currentFeeType.description} onChange={(e)=>setCurrentFeeType({...currentFeeType, description: e.target.value})} className="p-2 border rounded-xl" />
              <div className="flex items-center gap-2">
                <input id="ft_active" type="checkbox" checked={!!currentFeeType.is_active} onChange={(e)=>setCurrentFeeType({...currentFeeType, is_active: e.target.checked})} />
                <label htmlFor="ft_active" className="text-sm text-gray-600">Actif</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={closeFeeTypeModal} className="px-4 py-2 rounded-xl bg-gray-200">Annuler</button>
              <button onClick={saveFeeType} className="px-4 py-2 rounded-xl bg-indigo-600 text-white">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* Amount modal */}
      {showAmountModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto relative">
            <button onClick={closeAmountModal} className="absolute right-4 top-4 text-gray-500 hover:text-gray-800">✕</button>
            <h2 className="text-xl font-bold mb-4">{currentAmount.id ? "Modifier Montant" : "Ajouter Montant"}</h2>
            <div className="grid grid-cols-1 gap-3">
              <select value={currentAmount.fee_type || ""} onChange={(e)=>setCurrentAmount({...currentAmount, fee_type: e.target.value})} className="p-2 border rounded-xl">
                <option value="">Sélectionner un type</option>
                {feeTypes.map(ft => <option key={ft.id} value={ft.id}>{ft.name}</option>)}
              </select>
              <input placeholder="Niveau (texte ou id)" value={currentAmount.level} onChange={(e)=>setCurrentAmount({...currentAmount, level: e.target.value})} className="p-2 border rounded-xl" />
              <input placeholder="Montant" value={currentAmount.amount} onChange={(e)=>setCurrentAmount({...currentAmount, amount: e.target.value})} className="p-2 border rounded-xl" />
              <div className="flex items-center gap-2">
                <input id="amt_active" type="checkbox" checked={!!currentAmount.is_active} onChange={(e)=>setCurrentAmount({...currentAmount, is_active: e.target.checked})} />
                <label htmlFor="amt_active" className="text-sm text-gray-600">Actif</label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={closeAmountModal} className="px-4 py-2 rounded-xl bg-gray-200">Annuler</button>
              <button onClick={saveAmount} className="px-4 py-2 rounded-xl bg-green-600 text-white">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .input{width:100%;border:1px solid #E6E9EE;padding:10px 12px;border-radius:10px;outline:none}
        button { font-weight: 600; }
      `}</style>
    </div>
  );
}
