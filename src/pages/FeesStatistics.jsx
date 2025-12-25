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
  const [paymentsRaw, setPaymentsRaw] = useState([]); // raw list fetched from server (could be paginated page or full list)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // filters & controls
  const [search, setSearch] = useState("");
  const [validatedOnly, setValidatedOnly] = useState(false);
  const [ordering, setOrdering] = useState("-paid_at"); // default
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // count will reflect the filtered count (client-side)
  const [count, setCount] = useState(null);

  // small UI states
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);

  // create form
  const [form, setForm] = useState({ fee: "", amount: "", method: "", reference: "", note: "" });

  // fetch payments with filters, search, ordering and pagination
  // NOTE: we request a LARGE page_size when user is actively filtering so client can apply filters reliably.
  const fetchPayments = async (opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      // if opts.fetchAll === true -> force large page_size to try retrieve all items
      const shouldFetchAll =
        opts.fetchAll === true || search.trim() !== "" || validatedOnly || (ordering && ordering !== "-paid_at");

      const params = {
        search: search || undefined,
        ordering: ordering || undefined,
        page: page || 1,
        page_size: shouldFetchAll ? 10000 : pageSize || 20,
        validated: validatedOnly ? "1" : undefined,
        ...(opts.params || {}),
      };

      const data = await fetchData("/fees/payments/", { params });

      // handle DRF-style pagination or plain array
      const results = data?.results ?? data ?? [];
      const list = Array.isArray(results) ? results : [];
      setPaymentsRaw(list);

      // If backend returned a total count and we fetched full pages, use it; else we compute filtered count later
      if (data?.count !== undefined && !shouldFetchAll) {
        // server paginated response AND we didn't fetch all -> keep server-side count as fallback
        setCount(data.count);
      } else {
        // otherwise, we'll compute count based on client filtering
        setCount(list.length);
      }
    } catch (err) {
      console.error("fetchPayments:", err);
      setError("Impossible de récupérer les paiements.");
      setPaymentsRaw([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // On filter change, reset to page 1 and fetch payments (fetch will request a big page_size so client-side filters work)
    setPage(1);
    fetchPayments({ fetchAll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, validatedOnly, ordering, pageSize]);

  // also fetch when page changes (but do not re-fetch full list if we already have it)
  useEffect(() => {
    // If the current raw data length seems smaller than pageSize and we rely on server paging, fetch that page:
    // Simpler rule: when user only changes page, request that page normally (not fetchAll).
    fetchPayments({ params: { page } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // Helper: extract a stable student object from a payment
  const studentFromPayment = (p) => {
    return p.student ?? p.fee_detail?.student ?? (p.fee?.student ?? null);
  };

  // CLIENT-SIDE FILTERING + SORTING + PAGINATION (applied to paymentsRaw)
  const filteredAndPaged = useMemo(() => {
    const arr = Array.isArray(paymentsRaw) ? paymentsRaw.slice() : [];

    // local filter: search
    const q = (search || "").trim().toLowerCase();
    const matchesSearch = (p) => {
      if (!q) return true;

      // student fields
      const stud = studentFromPayment(p) || {};
      const nameCandidates = [
        stud.full_name,
        `${stud.first_name ?? ""} ${stud.last_name ?? ""}`.trim(),
        stud.username,
        stud.email,
      ]
        .filter(Boolean)
        .map((s) => String(s).toLowerCase());

      for (const s of nameCandidates) {
        if (s.includes(q)) return true;
      }

      // payment fields
      if (p.reference && String(p.reference).toLowerCase().includes(q)) return true;
      if (p.note && String(p.note).toLowerCase().includes(q)) return true;

      // fee fields
      const fee = p.fee_detail ?? p.fee ?? {};
      if (fee.fee_type_name && String(fee.fee_type_name).toLowerCase().includes(q)) return true;
      if (fee.id && String(fee.id).toLowerCase().includes(q)) return true;
      if (fee.amount && String(fee.amount).toLowerCase().includes(q)) return true;

      return false;
    };

    // filter validatedOnly
    const matchesValidated = (p) => {
      if (!validatedOnly) return true;
      return !!p.validated;
    };

    const filtered = arr.filter((p) => matchesSearch(p) && matchesValidated(p));

    // Sorting
    const cmp = (a, b, field, asc = true) => {
      const va = a[field];
      const vb = b[field];
      if (va == null && vb == null) return 0;
      if (va == null) return asc ? -1 : 1;
      if (vb == null) return asc ? 1 : -1;
      // numeric date values
      if (field === "amount") {
        return (Number(va) - Number(vb)) * (asc ? 1 : -1);
      }
      if (field === "paid_at" || field === "validated_at" || field === "created_at") {
        const da = new Date(va).getTime() || 0;
        const db = new Date(vb).getTime() || 0;
        return (da - db) * (asc ? 1 : -1);
      }
      // fallback string compare
      return String(va).localeCompare(String(vb)) * (asc ? 1 : -1);
    };

    // interpret ordering string
    const order = ordering || "-paid_at";
    let sorted = filtered;
    try {
      if (order.startsWith("-")) {
        const field = order.substring(1);
        sorted = filtered.sort((a, b) => cmp(a, b, field, false));
      } else {
        const field = order;
        sorted = filtered.sort((a, b) => cmp(a, b, field, true));
      }
    } catch (e) {
      // fallback: no sorting if unknown field
      sorted = filtered;
    }

    // Update count for pagination
    const totalFiltered = sorted.length;
    setCount(totalFiltered);

    // Client-side pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const pageSlice = sorted.slice(from, to);

    return {
      total: totalFiltered,
      pageSlice,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentsRaw, search, validatedOnly, ordering, page, pageSize]);

  // validate a payment (admin action)
  const validatePayment = async (id) => {
    if (!window.confirm("Valider ce paiement ?")) return;
    try {
      await postData(`/fees/payments/${id}/validate_payment/`, {});
      await fetchPayments({ fetchAll: true });
    } catch (err) {
      console.error("validatePayment:", err);
      alert(err?.response?.data?.detail || "Échec de validation");
    }
  };

  const deletePayment = async (id) => {
    if (!window.confirm("Supprimer ce paiement ? (opération irréversible)")) return;
    try {
      await deleteData(`/fees/payments/${id}/`);
      await fetchPayments({ fetchAll: true });
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
      await fetchPayments({ params: { page: 1 }, fetchAll: true });
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

  // Derived list to render
  const visiblePayments = filteredAndPaged.pageSlice ?? [];
  const visibleCount = filteredAndPaged.total ?? count ?? 0;
  const firstIndex = visibleCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastIndex = Math.min(page * pageSize, visibleCount);

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
              fetchPayments({ fetchAll: true });
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

            <select
              value={ordering}
              onChange={(e) => {
                setOrdering(e.target.value);
                setPage(1);
              }}
              className="border rounded-lg px-3 py-2"
            >
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
            ) : visiblePayments.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Aucun paiement trouvé.</div>
            ) : (
              visiblePayments.map((p) => {
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

                      <div className="text-xs text-slate-500 mt-1">S-Id: {(stud.id ?? feeDetail?.student ?? "—")}</div>
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
              {visibleCount !== null ? `${firstIndex}-${lastIndex} sur ${visibleCount}` : "—"}
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1 border rounded">
                Préc.
              </button>
              <span className="px-3 py-1">{page}</span>
              <button
                onClick={() => {
                  // next page only if there are more items
                  if (page * pageSize < visibleCount) setPage((p) => p + 1);
                }}
                className="px-3 py-1 border rounded"
              >
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
