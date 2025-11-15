// src/pages/PaymentsPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FaCheck, FaTimes, FaPlus, FaSearch, FaSyncAlt } from "react-icons/fa";
import { fetchData, postData, deleteData } from "./api";

function formatDate(dt) {
  if (!dt) return "—";
  try {
    const d = new Date(dt);
    return d.toLocaleString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (e) {
    return dt;
  }
}

function formatMoneyEUR(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " FCFA";
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // filters & controls
  const [search, setSearch] = useState("");
  const [validatedOnly, setValidatedOnly] = useState(false);
  const [ordering, setOrdering] = useState("-paid_at"); // default
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [count, setCount] = useState(null);

  // small UI states
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // create form
  const [form, setForm] = useState({ fee: "", amount: "", method: "", reference: "", note: "" });

  // fetch payments with filters, search, ordering and pagination
  const fetchPayments = async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        search: search || undefined,
        ordering: ordering || undefined,
        page: page || 1,
        page_size: pageSize || 20,
        validated: validatedOnly ? "1" : undefined,
        ...(opts.params || {}),
      };

      const data = await fetchData("/fees/payments/", { params });
      // handle DRF-style pagination or plain array
      const results = data?.results ?? data ?? [];
      setPayments(Array.isArray(results) ? results : []);
      if (data?.count !== undefined) setCount(data.count);
      else setCount(Array.isArray(data) ? data.length : null);
    } catch (err) {
      console.error("fetchPayments:", err);
      setError("Impossible de récupérer les paiements.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, validatedOnly, ordering, page, pageSize]);

  // Helper: extract a stable student object from a payment
  const studentFromPayment = (p) => {
    return p.student ?? p.fee_detail?.student ?? (p.fee?.student ?? null);
  };

  // validate a payment (admin action)
  const validatePayment = async (id) => {
    if (!window.confirm("Valider ce paiement ?")) return;
    try {
      await postData(`/fees/payments/${id}/validate_payment/`, {});
      await fetchPayments();
    } catch (err) {
      console.error("validatePayment:", err);
      alert(err?.response?.data?.detail || "Échec de validation");
    }
  };

  const deletePayment = async (id) => {
    if (!window.confirm("Supprimer ce paiement ? (opération irréversible)")) return;
    try {
      await deleteData(`/fees/payments/${id}/`);
      await fetchPayments();
    } catch (err) {
      console.error("deletePayment:", err);
      alert("Impossible de supprimer le paiement.");
    }
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const payload = {
        fee: Number(form.fee),
        amount: Number(form.amount),
        method: form.method || "",
        reference: form.reference || "",
        note: form.note || "",
      };

      await postData(`/fees/payments/`, payload);
      // refresh first page to ensure created item appears
      await fetchPayments({ params: { page: 1 } });
      setShowCreate(false);
      setForm({ fee: "", amount: "", method: "", reference: "", note: "" });
    } catch (err) {
      console.error("submitCreate:", err);
      const errMsg =
        err?.response?.data?.non_field_errors?.[0] ||
        err?.response?.data?.detail ||
        Object.values(err?.response?.data || {})?.flat?.()?.[0] ||
        "Impossible de créer le paiement.";
      alert(errMsg);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-b from-white to-gray-50">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Paiements</h1>
          
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg shadow hover:bg-indigo-700"
          >
            <FaPlus />
            Nouveau paiement
          </button>

          <button
            onClick={() => {
              setSearch("");
              setValidatedOnly(false);
              setOrdering("-paid_at");
              setPage(1);
              fetchPayments();
            }}
            className="inline-flex items-center gap-2 bg-white border px-3 py-2 rounded-lg shadow-sm"
            title="Réinitialiser filtres"
          >
            <FaSyncAlt /> Réinitialiser
          </button>
        </div>
      </header>

      <section className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Rechercher par élève, référence, note..."
                className="w-full border rounded-lg px-3 py-2 pr-10"
              />
              <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={validatedOnly}
                onChange={(e) => {
                  setValidatedOnly(e.target.checked);
                  setPage(1);
                }}
              />
              Paiements validés seulement
            </label>

            <select value={ordering} onChange={(e) => setOrdering(e.target.value)} className="border rounded-lg px-3 py-2">
              <option value="-paid_at">Plus récents</option>
              <option value="paid_at">Plus anciens</option>
              <option value="-amount">Montant décroissant</option>
              <option value="amount">Montant croissant</option>
              <option value="validated">Validés en premier</option>
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600">Taille page</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="border rounded-lg px-2 py-1"
            >
              {[10, 20, 50, 100].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <main>
        {error && <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>}

        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-3 text-xs text-slate-500 border-b">
              <div className="col-span-3">Élève / Classe / Niveau</div>
              <div className="col-span-2">Montant (Paiement)</div>
              <div className="col-span-2">Date paiement</div>
              <div className="col-span-2">Fee / Type / Montant fee</div>
              <div className="col-span-2">Statut</div>
              <div className="col-span-1">Actions</div>
            </div>

            {loading ? (
              <div className="p-6 text-center text-slate-500">Chargement...</div>
            ) : payments.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Aucun paiement trouvé.</div>
            ) : (
              payments.map((p) => {
                const stud = studentFromPayment(p) || {};
                const feeDetail = p.fee_detail ?? p.fee ?? {};
                return (
                  <div key={p.id} className="grid grid-cols-12 gap-4 p-3 items-start hover:bg-slate-50">
                    <div className="col-span-3">
                      <div className="font-medium text-slate-800">
                        {(stud.full_name ?? (`${stud.first_name ?? ""} ${stud.last_name ?? ""}`.trim())) || "—"}
                      </div>

                      <div className="text-xs text-slate-500">
                        {(stud.class_name ?? stud.current_class ?? "Classe non renseignée")}{" "}
                        {stud.level ? `• ${stud.level}` : null}
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        S-Id: {(stud.id ?? feeDetail?.student ?? "—")}
                      </div>
                    </div>

                    <div className="col-span-2 font-semibold">{formatMoneyEUR(p.amount)}</div>

                    <div className="col-span-2 text-sm text-slate-600">{formatDate(p.paid_at)}</div>

                    <div className="col-span-2 text-sm text-slate-600">
                      <div className="font-medium">{feeDetail.fee_type_name ?? feeDetail.fee_type ?? "Fee"}</div>
                      <div className="text-xs text-slate-500">Fee total: {formatMoneyEUR(feeDetail.amount ?? feeDetail.total ?? "—")}</div>
                      <div className="text-xs text-slate-400">Fee ID: {feeDetail.id ?? p.fee}</div>
                    </div>

                    <div className="col-span-2">
                      {p.validated ? (
                        <div className="inline-flex flex-col gap-1">
                          <div className="inline-flex items-center gap-2 bg-green-50 text-green-800 px-3 py-1 rounded-full text-sm">
                            <FaCheck /> Validé
                            <span className="text-xs text-slate-500 ml-2">
                              par {p.validated_by?.username ?? p.validated_by?.first_name ?? "—"}
                            </span>
                          </div>
                          {p.validated_at && <div className="text-xs text-slate-400 mt-1">Le {formatDate(p.validated_at)}</div>}
                          <div className={`mt-2 text-xs font-medium ${feeDetail.paid ? "text-green-700" : "text-red-600"}`}>
                            {feeDetail.paid ? `Fee réglé (${feeDetail.payment_date ?? "—"})` : "Fee non réglé"}
                          </div>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-800 px-3 py-1 rounded-full text-sm">En attente</div>
                      )}

                      {p.note && <div className="text-xs text-slate-400 mt-2">Note: {p.note}</div>}
                      {p.method && <div className="text-xs text-slate-400 mt-1">Méthode: {p.method}</div>}
                      {p.reference && <div className="text-xs text-slate-400 mt-1">Réf: {p.reference}</div>}
                    </div>

                    <div className="col-span-1 flex flex-col gap-2">
                      <button
                        onClick={() => validatePayment(p.id)}
                        disabled={p.validated}
                        className={`px-2 py-1 text-xs rounded ${p.validated ? "bg-slate-100 text-slate-400" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                        title="Valider"
                      >
                        Valider
                      </button>

                      <button
                        onClick={() => deletePayment(p.id)}
                        className="px-2 py-1 text-xs rounded bg-red-50 text-red-700 hover:bg-red-100"
                        title="Supprimer"
                      >
                        Suppr.
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* pagination controls */}
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-500">
              {count !== null ? `${Math.min((page - 1) * pageSize + 1, count)}–${Math.min(page * pageSize, count)} sur ${count}` : "—"}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded">
                Préc.
              </button>
              <span className="px-3 py-1">{page}</span>
              <button onClick={() => setPage((p) => p + 1)} className="px-3 py-1 border rounded">
                Suiv.
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* create modal (simple) */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white w-full max-w-xl rounded-lg p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Nouveau paiement</h2>
              <button onClick={() => setShowCreate(false)} className="text-slate-500">
                Fermer
              </button>
            </div>

            <form onSubmit={submitCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col text-sm">
                  Fee (ID)
                  <input
                    required
                    value={form.fee}
                    onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))}
                    className="mt-1 border rounded px-2 py-1"
                  />
                </label>

                <label className="flex flex-col text-sm">
                  Montant (EUR)
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    className="mt-1 border rounded px-2 py-1"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col text-sm">
                  Méthode
                  <input value={form.method} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))} className="mt-1 border rounded px-2 py-1" />
                </label>

                <label className="flex flex-col text-sm">
                  Référence
                  <input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} className="mt-1 border rounded px-2 py-1" />
                </label>
              </div>

              <label className="flex flex-col text-sm">
                Note (optionnel)
                <textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} className="mt-1 border rounded px-2 py-1" rows={3} />
              </label>

              <div className="flex items-center gap-3 justify-end">
                <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded">
                  Annuler
                </button>
                <button type="submit" disabled={creating} className="px-4 py-2 bg-indigo-600 text-white rounded">
                  {creating ? "Envoi..." : "Créer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
