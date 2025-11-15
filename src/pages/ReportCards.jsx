// src/pages/ReportCardsUnified.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { fetchData } from "./api";

/* small helpers kept */
const fmt = (v) => (v === null || v === undefined || v === "" ? "—" : String(v).replace(".", ","));
const safeNum = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : Math.round((n + Number.EPSILON) * 100) / 100;
};
const palette = ["#4f46e5", "#06b6d4", "#f97316", "#10b981", "#ef4444", "#8b5cf6", "#f59e0b", "#6366f1"];

function mentionFor(avg) {
  if (avg === null || avg === undefined) return { label: "—", classes: "bg-gray-100 text-gray-800" };
  const n = Number(avg);
  if (Number.isNaN(n)) return { label: "—", classes: "bg-gray-100 text-gray-800" };
  if (n >= 16) return { label: "Très Bien", classes: "bg-green-100 text-green-800" };
  if (n >= 14) return { label: "Bien", classes: "bg-lime-100 text-lime-800" };
  if (n >= 12) return { label: "Assez bien", classes: "bg-indigo-100 text-indigo-800" };
  if (n >= 10) return { label: "Passable", classes: "bg-yellow-100 text-yellow-800" };
  return { label: "Insuffisant", classes: "bg-red-100 text-red-800" };
}

/* small query builder for GET params */
function buildQuery(params = {}) {
  const parts = [];
  Object.keys(params).forEach((k) => {
    const v = params[k];
    if (v === null || v === undefined || v === "") return;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  });
  return parts.length ? `?${parts.join("&")}` : "";
}

/* redirect helper on 401-like API errors (fetchData throws Error with .status) */
function handleApiError(err) {
  const status = err?.status ?? err?.statusCode ?? null;
  if (status === 401) {
    try { localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token"); } catch (e) {}
    if (typeof window !== "undefined") window.location.href = "/login";
  }
}

export default function ReportCardsUnified() {
  // NOTE: This constant is only shown in the header for debugging — api.js controls actual base URL.
  const API_ROOT = "http://localhost:8000/api";

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);

  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [term, setTerm] = useState("T1");

  const [reportCard, setReportCard] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState("");

  const printableRef = useRef(null);
  const [expandedSubjects, setExpandedSubjects] = useState(new Set());

  const fetchClasses = useCallback(async () => {
    setLoadingClasses(true);
    try {
      const data = await fetchData("/academics/school-classes/");
      setClasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchClasses", err?.body ?? err?.message ?? err);
      handleApiError(err);
    } finally {
      setLoadingClasses(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const fetchStudentsByClass = useCallback(async (cid) => {
    if (!cid) {
      setStudents([]);
      return;
    }
    setLoadingStudents(true);
    setStudents([]);
    setError("");
    try {
      const data = await fetchData(`/core/admin/students/by-class/${cid}/`);
      setStudents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("fetchStudentsByClass", err?.body ?? err?.message ?? err);
      handleApiError(err);
      setStudents([]);
      const status = err?.status ?? null;
      if (status === 401) setError("Non authentifié — connectez-vous.");
      else setError("Impossible de charger les élèves pour la classe sélectionnée.");
    } finally {
      setLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    setStudentId("");
    setReportCard(null);
    if (classId) fetchStudentsByClass(classId);
    else setStudents([]);
  }, [classId, fetchStudentsByClass]);

  const fetchReportCard = useCallback(async (sid, t = term) => {
    if (!sid) return;
    setLoadingReport(true);
    setReportCard(null);
    setError("");
    try {
      const query = buildQuery({ student_id: sid, term: t });
      const data = await fetchData(`/academics/report-cards/${query}`);
      const arr = Array.isArray(data) ? data : [];
      const rc = arr.length ? arr[0] : null;
      setReportCard(rc);
      setExpandedSubjects(new Set());
    } catch (err) {
      console.error("fetchReportCard", err?.body ?? err?.message ?? err);
      handleApiError(err);
      const status = err?.status ?? null;
      if (status === 401) setError("Non authentifié.");
      else if (status === 403) setError("Accès refusé.");
      else setError("Impossible de charger le bulletin.");
      setReportCard(null);
    } finally {
      setLoadingReport(false);
    }
  }, [term]);

  useEffect(() => {
    if (studentId) fetchReportCard(studentId, term);
    else setReportCard(null);
  }, [studentId, term, fetchReportCard]);

  const subjectsForCharts = useMemo(() => {
    if (!reportCard || !reportCard.subjects) return [];
    return reportCard.subjects.map((s) => ({
      subject: s.subject,
      average: safeNum(s.average_subject) ?? 0,
      weighted: safeNum(s.average_coeff) ?? 0,
      coef: s.coefficient ?? 1,
    }));
  }, [reportCard]);

  const onPrint = () => {
    if (!printableRef.current) return alert("Rien à imprimer.");
    window.print();
  };

  const onExportPdf = async () => {
    if (!printableRef.current) return alert("Rien à exporter.");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const node = printableRef.current;
      const canvas = await html2canvas(node, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);
      const w = imgWidth * ratio;
      const h = imgHeight * ratio;
      pdf.addImage(imgData, "PNG", 20, 20, w - 40, h - 40);
      const name = `${reportCard?.student_firstname || "student"}_${reportCard?.student_lastname || ""}_${term || ""}_bulletin.pdf`;
      pdf.save(name);
    } catch (err) {
      console.warn("export failed, fallback to print", err?.message || err);
      onPrint();
    }
  };

  const toggleSubject = (idx) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const Header = () => (
    <header className="flex items-start justify-between gap-6 mb-8 no-print">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900">Bulletin élève — interface unifiée</h1>
        <p className="mt-1 text-sm text-slate-600">Sélectionne la classe puis l'élève — le bulletin s'affiche immédiatement.</p>
      </div>
      <div className="text-right">
        <div className="text-xs text-slate-500">Design: coloré & imprimable</div>
        <div className="mt-1 text-xs text-slate-400 font-mono">{API_ROOT}</div>
      </div>
    </header>
  );

  return (
    <div className="p-8 bg-gradient-to-b from-indigo-50 via-white to-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <Header />

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6 no-print">
          <div className="lg:col-span-2 bg-white p-4 rounded-2xl shadow">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Classe</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full p-3 border rounded-lg bg-white"
                >
                  <option value="">{loadingClasses ? "Chargement..." : "Choisir une classe"}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Élève</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={!classId || loadingStudents}
                  className="w-full p-3 border rounded-lg bg-white disabled:opacity-60"
                >
                  <option value="">{loadingStudents ? "Chargement..." : classId ? "Choisir un élève" : "Sélectionner une classe"}</option>
                  {students.map((s) => {
                    const label = `${s.user?.first_name || s.firstname || ""} ${s.user?.last_name || s.lastname || ""}`.trim() || `#${s.id}`;
                    const username = s.user?.username || s.username || "";
                    return (
                      <option key={s.id} value={s.id}>{label} {username ? `• ${username}` : ""}</option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Trimestre</label>
                <select value={term} onChange={(e) => setTerm(e.target.value)} className="w-full p-3 border rounded-lg bg-white">
                  <option value="T1">1er trimestre</option>
                  <option value="T2">2e trimestre</option>
                  <option value="T3">3e trimestre</option>
                </select>
              </div>
            </div>
            <div className="mt-3 text-xs text-slate-500">Le bulletin s’affiche automatiquement après sélection d’un élève.</div>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow flex flex-col gap-3 no-print">
            <div className="text-sm text-slate-500">Actions</div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (!studentId) return alert("Choisissez d'abord un élève.");
                  fetchReportCard(studentId, term);
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 text-white"
              >
                Recharger bulletin
              </button>
              <button
                onClick={() => {
                  setClassId("");
                  setStudentId("");
                  setStudents([]);
                  setReportCard(null);
                  setError("");
                }}
                className="px-4 py-2 rounded-lg bg-gray-100"
              >
                Réinitialiser
              </button>
            </div>

            <div className="mt-2 text-xs text-slate-500">Export & impression disponibles quand un bulletin est chargé.</div>
          </div>
        </section>

        {error && <div className="mb-6 text-red-600">{error}</div>}

        <main>
          {!studentId && (
            <div className="bg-white rounded-2xl shadow p-8 text-center">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Aucun élève sélectionné</h2>
              <p className="text-sm text-slate-600">Choisis une classe puis un élève pour afficher son bulletin détaillé dans cette même page.</p>
            </div>
          )}

          {loadingReport && studentId && (
            <div className="bg-white rounded-2xl shadow p-6 text-center">Chargement du bulletin…</div>
          )}

          {reportCard && !loadingReport && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4 gap-4 no-print">
                <div className="flex items-center gap-4">
                  <div className="rounded-full w-14 h-14 bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-lg">
                    {(reportCard.student_firstname?.[0] || reportCard.student_lastname?.[0] || "?").toUpperCase()}
                  </div>
                  <div>
                    <div className="text-xl font-extrabold">{reportCard.student_firstname} {reportCard.student_lastname}</div>
                    <div className="text-sm text-slate-500">{reportCard.student_class} • {term}</div>
                    <div className="mt-2">
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-50 text-yellow-800 font-semibold text-sm">
                        Rang: {reportCard.rank != null ? String(reportCard.rank) : "—"}
                      </span>
                      <span className="ml-3 text-sm text-slate-500">Moyenne: <strong className="ml-1">{fmt(reportCard.term_average)}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 no-print">
                  <button onClick={() => { setStudentId(""); setReportCard(null); }} className="px-3 py-2 rounded bg-white border">← Retour</button>
                  <button onClick={onPrint} className="px-3 py-2 rounded bg-indigo-600 text-white">Imprimer</button>
                  <button onClick={onExportPdf} className="px-3 py-2 rounded bg-emerald-600 text-white">Exporter PDF</button>
                </div>
              </div>

              <div ref={printableRef} className="reportcard-printable bg-white rounded-3xl shadow-lg p-6 print:p-0 print:shadow-none">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Matières & notes</h3>
                      <div className="text-sm text-slate-500">Moyenne du trimestre : <strong className="ml-2">{fmt(reportCard.term_average)}</strong></div>
                    </div>

                    <div className="overflow-auto rounded-xl border">
                      <table className="min-w-full text-sm">
                        <thead className="bg-indigo-50">
                          <tr className="text-left text-xs text-slate-600">
                            <th className="p-3">Matière</th>
                            <th className="p-3">Coef</th>
                            <th className="p-3">I1</th>
                            <th className="p-3">I2</th>
                            <th className="p-3">I3</th>
                            <th className="p-3">D1</th>
                            <th className="p-3">D2</th>
                            <th className="p-3">Moy Interro</th>
                            <th className="p-3">Moy Matière</th>
                            <th className="p-3">Moy×Coef</th>
                            <th className="p-3">Commentaire</th>
                          </tr>
                        </thead>

                        <tbody>
                          {(reportCard.subjects || []).map((s, idx) => {
                            const expanded = expandedSubjects.has(idx);
                            const subjAvg = safeNum(s.average_subject);
                            const mention = mentionFor(subjAvg);
                            return (
                              <React.Fragment key={idx}>
                                <tr className="border-b">
                                  <td className="p-3 font-medium">{s.subject}</td>
                                  <td className="p-3">{s.coefficient ?? 1}</td>
                                  <td className="p-3">{fmt(s.interrogation1)}</td>
                                  <td className="p-3">{fmt(s.interrogation2)}</td>
                                  <td className="p-3">{fmt(s.interrogation3)}</td>
                                  <td className="p-3">{fmt(s.devoir1)}</td>
                                  <td className="p-3">{fmt(s.devoir2)}</td>

                                  <td className="p-3">
                                    <div className="inline-block px-3 py-1 rounded-md bg-slate-100 text-slate-800 font-semibold">
                                      {s.average_interro != null ? fmt(s.average_interro) : "—"}
                                    </div>
                                  </td>

                                  <td className="p-3">
                                    <div title={mention.label} className={`inline-block px-3 py-1 rounded-md ${mention.classes} font-semibold`}>
                                      {s.average_subject != null ? fmt(s.average_subject) : "—"}
                                    </div>
                                  </td>

                                  <td className="p-3">{s.average_coeff != null ? fmt(s.average_coeff) : "—"}</td>
                                  <td className="p-3">
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => toggleSubject(idx)} className="text-xs px-2 py-1 rounded bg-gray-100 no-print">
                                        {expanded ? "Masquer" : "Voir"}
                                      </button>
                                      {s.comment && <div className="text-xs text-slate-500 italic max-w-[16rem] truncate">{s.comment}</div>}
                                    </div>
                                  </td>
                                </tr>

                                {expanded && (
                                  <tr>
                                    <td colSpan={11} className="p-3 bg-slate-50 text-sm text-slate-700">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <div>
                                          <div className="text-xs text-slate-500 mb-1">Détails interros & devoirs</div>
                                          <div className="text-sm">{`Interro 1: ${fmt(s.interrogation1)} • Interro 2: ${fmt(s.interrogation2)} • Interro 3: ${fmt(s.interrogation3)}`}</div>
                                          <div className="text-sm mt-1">{`Devoir 1: ${fmt(s.devoir1)} • Devoir 2: ${fmt(s.devoir2)}`}</div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-slate-500 mb-1">Coefficient & pondération</div>
                                          <div className="text-sm">{`Coef: ${s.coefficient ?? 1} • Moy×Coef: ${fmt(s.average_coeff)}`}</div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                          {(!reportCard.subjects || reportCard.subjects.length === 0) && (
                            <tr><td colSpan={11} className="p-6 text-center text-slate-500">Aucune matière pour ce bulletin.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <aside className="space-y-6">
                    <div className="bg-indigo-50 p-4 rounded-xl">
                      <h4 className="text-sm font-semibold text-indigo-800">Résumé</h4>
                      <div className="mt-3">
                        <div className="text-xs text-slate-500">Meilleure moyenne</div>
                        <div className="text-lg font-bold">{fmt(reportCard.best_average)}</div>
                      </div>
                      <div className="mt-3">
                        <div className="text-xs text-slate-500">Plus faible</div>
                        <div className="text-lg font-bold">{fmt(reportCard.worst_average)}</div>
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <h5 className="text-sm font-semibold mb-2">Moyennes par matière</h5>
                      <div style={{ width: 300, height: 180 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={subjectsForCharts} margin={{ top: 6, right: 6, left: -8, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="subject" interval={0} angle={-30} textAnchor="end" height={60} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="average" name="Moyenne" fill={palette[0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500">
                      <div>Conseil d'impression : portrait, marges réduites.</div>
                    </div>
                  </aside>
                </div>

                <div className="mt-6 border-t pt-4 flex items-center justify-between">
                  <div className="text-sm text-slate-600">Généré depuis le backend — vérifie les commentaires pour détails.</div>
                  <div className="text-sm text-slate-500">Date: {new Date().toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body * { visibility: hidden !important; }
          .reportcard-printable, .reportcard-printable * { visibility: visible !important; }
          .reportcard-printable { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}
