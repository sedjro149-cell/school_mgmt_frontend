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
  if (avg === null || avg === undefined) return { label: "—", classes: "bg-gray-100 text-gray-800 border-gray-300" };
  const n = Number(avg);
  if (Number.isNaN(n)) return { label: "—", classes: "bg-gray-100 text-gray-800 border-gray-300" };
  if (n >= 16) return { label: "Très Bien", classes: "bg-green-100 text-green-800 border-green-300" };
  if (n >= 14) return { label: "Bien", classes: "bg-lime-100 text-lime-800 border-lime-300" };
  if (n >= 12) return { label: "Assez bien", classes: "bg-indigo-100 text-indigo-800 border-indigo-300" };
  if (n >= 10) return { label: "Passable", classes: "bg-yellow-100 text-yellow-800 border-yellow-300" };
  return { label: "Insuffisant", classes: "bg-red-100 text-red-800 border-red-300" };
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

  // --- Fetch Logic (unchanged) ---

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

  // --- Print/Export Logic (optimized PDF export) ---

  const onPrint = () => {
    if (!printableRef.current) return alert("Rien à imprimer.");
    window.print();
  };

  const onExportPdf = async () => {
    if (!printableRef.current) return alert("Rien à exporter.");
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      
      const nonPrintElements = document.querySelectorAll(".no-print");
      nonPrintElements.forEach(el => el.style.display = 'none');

      const node = printableRef.current;
      const canvas = await html2canvas(node, { scale: 3, useCORS: true, logging: false });
      
      nonPrintElements.forEach(el => el.style.display = '');

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min((pageWidth - 40) / imgWidth, (pageHeight - 40) / imgHeight);
      
      const w = imgWidth * ratio;
      const h = imgHeight * ratio;
      
      pdf.addImage(imgData, "PNG", 20, 20, w, h);
      
      const name = `${reportCard?.student_lastname || "eleve"}_${reportCard?.student_firstname || ""}_${term || ""}_bulletin.pdf`;
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
        <h1 className="text-3xl font-extrabold text-slate-900">🎓 Bulletins Scolaires</h1>
        <p className="mt-1 text-base text-slate-600">Sélectionnez la classe et l'élève pour visualiser ou exporter le bulletin.</p>
      </div>
    </header>
  );

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <Header />

        {/* SECTION FILTRES & ACTIONS */}
        <section className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8 no-print">
          
          {/* Carte de sélection */}
          <div className="lg:col-span-3 bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">Sélectionner un élève</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {/* Classe */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Classe</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                  disabled={loadingClasses}
                >
                  <option value="">{loadingClasses ? "Chargement..." : "Choisir une classe"}</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Élève */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Élève</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={!classId || loadingStudents}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white disabled:opacity-70 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
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

              {/* Trimestre (plus concis) */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Trimestre</label>
                <select value={term} onChange={(e) => setTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-xl bg-white focus:ring-indigo-500 focus:border-indigo-500 transition duration-150">
                  <option value="T1">T1</option>
                  <option value="T2">T2</option>
                  <option value="T3">T3</option>
                </select>
              </div>
            </div>
          </div>

          {/* Carte d'actions */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl shadow-xl border border-gray-100 flex flex-col justify-between">
            <h2 className="text-lg font-semibold text-slate-700 mb-3">Actions rapides</h2>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  if (!studentId) return alert("Choisissez d'abord un élève.");
                  fetchReportCard(studentId, term);
                }}
                className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition duration-150 shadow-md shadow-indigo-200"
              >
                🔄 Recharger
              </button>
              <button
                onClick={() => {
                  setClassId("");
                  setStudentId("");
                  setStudents([]);
                  setReportCard(null);
                  setError("");
                }}
                className="px-4 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold transition duration-150"
              >
                ✖️ Vider
              </button>
            </div>
          </div>
        </section>

        {error && <div className="mb-6 p-4 rounded-xl bg-red-100 text-red-700 font-medium no-print">{error}</div>}

        <main>
          {/* État initial / Chargement */}
          {!studentId && (
            <div className="bg-white rounded-3xl shadow-xl p-10 text-center">
              <h2 className="text-2xl font-bold text-indigo-700 mb-2">👋 Bienvenue</h2>
              <p className="text-base text-slate-600">Utilisez les filtres ci-dessus pour sélectionner un élève et afficher son bulletin détaillé.</p>
            </div>
          )}

          {loadingReport && studentId && (
            <div className="bg-white rounded-3xl shadow-xl p-10 text-center text-lg text-slate-600 font-medium">⏳ Chargement du bulletin en cours...</div>
          )}

          {/* Bulletin affiché */}
          {reportCard && !loadingReport && (
            <div className="mt-6">
              
              {/* Entête du bulletin + Boutons d'export (no-print) */}
              <div className="flex items-center justify-between p-4 mb-4 rounded-xl bg-white shadow-lg border border-indigo-100 no-print">
                <div className="flex items-center gap-4">
                  <div className="rounded-full w-14 h-14 bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xl ring-2 ring-indigo-300">
                    {(reportCard.student_firstname?.[0] || reportCard.student_lastname?.[0] || "?").toUpperCase()}
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900">{reportCard.student_firstname} {reportCard.student_lastname}</div>
                    <div className="text-base text-slate-500">{reportCard.student_class} • **{term}**</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button onClick={() => { setStudentId(""); setReportCard(null); }} className="px-4 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 transition duration-150">
                    ← Autre élève
                  </button>
                  <button onClick={onPrint} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition duration-150">
                    🖨️ Imprimer
                  </button>
                  <button onClick={onExportPdf} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition duration-150">
                    📄 Export PDF
                  </button>
                </div>
              </div>

              {/* CONTENU IMPRIMABLE DU BULLETIN */}
              <div ref={printableRef} className="reportcard-printable bg-white rounded-3xl shadow-2xl p-8 print:p-6 print:shadow-none print:border print:border-gray-200">
                
                {/* 1. EN-TÊTE DU BULLETIN (pour l'impression) */}
                <div className="mb-8 p-4 border-b pb-6 print:border-b-2 print:mb-4">
                    <h1 className="text-3xl font-extrabold text-slate-900 print:text-2xl">BULLETIN SCOLAIRE</h1>
                    <div className="text-xl font-bold text-indigo-600 mt-1 print:text-lg">{reportCard.student_firstname} {reportCard.student_lastname}</div>
                    <div className="text-lg text-slate-600 print:text-base">Classe : {reportCard.student_class} • Période : **{term}**</div>
                    <div className="mt-3 flex gap-4 items-center">
                        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-800 font-bold text-base print:bg-indigo-50 print:text-indigo-700 print:text-sm">
                            Moyenne Générale: {fmt(reportCard.term_average)} / 20
                        </span>
                        <span className={`inline-block px-4 py-1.5 rounded-full font-bold text-base print:text-sm ${mentionFor(reportCard.term_average).classes}`}>
                            Mention: {mentionFor(reportCard.term_average).label}
                        </span>
                        <span className="ml-2 text-base text-slate-600 print:text-sm">
                            Rang: {reportCard.rank != null ? String(reportCard.rank) : "—"}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                  
                  {/* COLONNE PRINCIPALE (Matières) */}
                  <div className="lg:col-span-3">
                    <h3 className="text-xl font-bold mb-4 text-slate-700 border-b pb-2">Détail des notes par matière</h3>

                    <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-md print:rounded-none print:shadow-none print:border-none">
                      <table className="min-w-full text-sm divide-y divide-gray-200">
                        <thead className="bg-indigo-50/50 print:bg-gray-100">
                          <tr className="text-left text-xs text-slate-600 uppercase tracking-wider font-semibold">
                            <th className="p-3">Matière</th>
                            <th className="p-3 text-center">Coef</th>
                            {/* Colonnes individuelles restaurées */}
                            <th className="p-3 text-center">I1</th>
                            <th className="p-3 text-center">I2</th>
                            <th className="p-3 text-center">I3</th>
                            <th className="p-3 text-center">D1</th>
                            <th className="p-3 text-center">D2</th>
                            <th className="p-3 text-center">Moy Interro</th>
                            <th className="p-3 text-center bg-indigo-100 print:bg-gray-200">Moy Matière</th>
                            <th className="p-3 text-center">Moy×Coef</th>
                            <th className="p-3 no-print">Commentaire</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                          {(reportCard.subjects || []).map((s, idx) => {
                            const expanded = expandedSubjects.has(idx);
                            const subjAvg = safeNum(s.average_subject);
                            const mention = mentionFor(subjAvg);

                            return (
                              <React.Fragment key={idx}>
                                <tr className="bg-white hover:bg-gray-50 transition duration-100 print:hover:bg-white print:text-[11px]">
                                  <td className="p-3 font-medium text-slate-800">{s.subject}</td>
                                  <td className="p-3 text-center text-slate-600">{s.coefficient ?? 1}</td>
                                  
                                  {/* Notes individuelles (I1, I2, I3, D1, D2) */}
                                  <td className="p-3 text-center text-xs text-slate-600">{fmt(s.interrogation1)}</td>
                                  <td className="p-3 text-center text-xs text-slate-600">{fmt(s.interrogation2)}</td>
                                  <td className="p-3 text-center text-xs text-slate-600">{fmt(s.interrogation3)}</td>
                                  <td className="p-3 text-center text-xs text-slate-600">{fmt(s.devoir1)}</td>
                                  <td className="p-3 text-center text-xs text-slate-600">{fmt(s.devoir2)}</td>
                                  {/* Fin Notes individuelles */}
                                  
                                  <td className="p-3 text-center">
                                    <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold print:text-xs">
                                      {s.average_interro != null ? fmt(s.average_interro) : "—"}
                                    </span>
                                  </td>

                                  <td className="p-3 text-center bg-indigo-50/70 print:bg-gray-100 font-bold">
                                    <span title={mention.label} className={`inline-block px-3 py-1 rounded-lg border text-sm ${mention.classes} print:text-xs print:font-extrabold print:border-none print:px-1`}>
                                      {s.average_subject != null ? fmt(s.average_subject) : "—"}
                                    </span>
                                  </td>

                                  <td className="p-3 text-center font-semibold text-slate-700">{s.average_coeff != null ? fmt(s.average_coeff) : "—"}</td>
                                  
                                  <td className="p-3 no-print">
                                    <div className="flex items-center gap-2">
                                      <button onClick={() => toggleSubject(idx)} className="text-xs px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition duration-150">
                                        {expanded ? "Masquer" : "Détails"}
                                      </button>
                                      {s.comment && <div className="text-xs text-slate-500 italic max-w-[12rem] truncate">{s.comment}</div>}
                                    </div>
                                  </td>
                                </tr>

                                {/* Détails étendus (Notes individuelles) - Masqué à l'impression */}
                                {expanded && (
                                  <tr className="no-print">
                                    <td colSpan={11} className="p-3 bg-indigo-50 text-sm text-slate-700 border-t border-indigo-100">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <div className="text-xs text-indigo-700 font-semibold mb-1">Détail des Interrogations (I1, I2, I3)</div>
                                          <div className="text-sm">I1: {fmt(s.interrogation1)} • I2: {fmt(s.interrogation2)} • I3: {fmt(s.interrogation3)}</div>
                                        </div>
                                        <div>
                                          <div className="text-xs text-indigo-700 font-semibold mb-1">Détail des Devoirs (D1, D2)</div>
                                          <div className="text-sm">D1: {fmt(s.devoir1)} • D2: {fmt(s.devoir2)}</div>
                                        </div>
                                      </div>
                                      {s.comment && <div className="mt-3 text-xs text-slate-600 italic">Commentaire Prof: {s.comment}</div>}
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                          {(!reportCard.subjects || reportCard.subjects.length === 0) && (
                            <tr><td colSpan={11} className="p-6 text-center text-slate-500">Aucune matière avec note pour cette période.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* COLONNE LATÉRALE (Résumé & Graphique) - Masqué à l'impression */}
                  <aside className="lg:col-span-1 space-y-6 print:hidden">
                    
                    {/* Carte Résumé */}
                    <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-200 shadow-lg">
                      <h4 className="text-lg font-bold text-indigo-800 mb-4">Statistiques du trimestre</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-indigo-600 font-semibold">Meilleure moyenne</div>
                          <div className="text-2xl font-extrabold text-slate-900 mt-1">{fmt(reportCard.best_average)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-indigo-600 font-semibold">Plus faible moyenne</div>
                          <div className="text-2xl font-extrabold text-slate-900 mt-1">{fmt(reportCard.worst_average)}</div>
                        </div>
                      </div>
                    </div>

                    {/* Carte Graphique */}
                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
                      <h5 className="text-lg font-bold text-slate-700 mb-4">Évolution des Moyennes</h5>
                      <div style={{ width: '100%', height: 280 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={subjectsForCharts} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                            <XAxis dataKey="subject" interval={0} angle={-45} textAnchor="end" height={60} style={{ fontSize: '10px' }} />
                            <YAxis domain={[0, 20]} allowDecimals={false} ticks={[0, 5, 10, 15, 20]} />
                            <Tooltip formatter={(value) => [`${fmt(value)}/20`, 'Moyenne']} />
                            <Bar dataKey="average" name="Moyenne" fill={palette[0]} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 p-4 border rounded-xl bg-gray-50">
                        Conseil d'impression : Utilisez l'option **"Exporter PDF"** pour un rendu optimal sur un document A4.
                    </div>
                  </aside>
                </div>

                {/* Pied de page du bulletin (pour l'impression) */}
                <div className="mt-8 pt-4 border-t print:border-t-2 print:mt-6 print:pt-4 flex items-center justify-between text-xs text-slate-500 print:text-gray-600">
                    <div>Fait à [Ville, Pays] le {new Date().toLocaleDateString()}.</div>
                    <div className="text-sm font-semibold print:text-xs">Cachet et Signature de l'Administration</div>
                </div>

              </div>
            </div>
          )}
        </main>
      </div>

      {/* Styles d'impression mis à jour */}
      <style>{`
        @media print {
          @page { 
            size: A4 portrait; 
            margin: 10mm;
          }
          body {
             -webkit-print-color-adjust: exact;
             print-color-adjust: exact;
          }
          body * { 
            visibility: hidden; 
          }
          .reportcard-printable, .reportcard-printable * { 
            visibility: visible; 
          }
          .reportcard-printable { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%;
            margin: 0;
            padding: 0; 
            box-shadow: none !important;
          }
          .no-print { 
            display: none !important; 
          }
          /* Fixe la taille de la police pour le tableau imprimé */
          .reportcard-printable table {
            font-size: 10px; /* Taille de base pour le tableau imprimé */
          }
        }
      `}</style>
    </div>
  );
}