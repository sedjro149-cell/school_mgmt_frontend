import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from "react";
import { fetchData, postData } from "./api";
import { FaCheckCircle, FaExclamationTriangle, FaSave, FaSyncAlt, FaTable, FaUserGraduate } from "react-icons/fa";

/* ---------------------------
   Utilitaires (Inchangés mais essentiels)
   --------------------------- */
function gradeKey(studentId, subjectId) {
  return `${String(studentId)}::${String(subjectId)}`;
}
function clampGradeValue(v) {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  if (Number.isNaN(n)) return null;
  return Math.max(0, Math.min(20, Math.round(n * 100) / 100));
}
function fmtNullable(n) {
  return n == null ? "" : String(n);
}
function avg(nums) {
  const vals = (nums || []).filter((x) => x != null && x !== "");
  if (!vals.length) return null;
  return Math.round(vals.reduce((a, b) => a + Number(b), 0) / vals.length * 100) / 100;
}
function buildQuery(obj = {}) {
  const parts = [];
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    if (v === null || v === undefined || v === "") return;
    parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  });
  return parts.length ? `?${parts.join("&")}` : "";
}
function handleApiError(err) {
  const status = err?.status ?? (err && err.status) ?? null;
  if (status === 401) {
    try { localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token"); } catch(e) {}
    if (typeof window !== "undefined") window.location.href = "/login";
  }
}

/* ---------------------------
   Toast Provider (Visuel amélioré)
   --------------------------- */
const ToastContext = React.createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback(({ type = "info", title = "", text = "", timeout = 4000 }) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, title, text }]);
    if (timeout > 0) setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), timeout);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-3 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border transform transition-all animate-slideUp
              ${t.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-900" : t.type === "error" ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-white border-gray-200 text-slate-800"}`}
          >
            <div className="flex-1">
              {t.title && <div className="font-bold text-sm mb-1">{t.title}</div>}
              <div className="text-xs opacity-90 leading-relaxed">{t.text}</div>
            </div>
            <button onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))} className="text-current opacity-50 hover:opacity-100">✕</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------------------------
   Result Modal (Redesign)
   --------------------------- */
function ResultModal({ open, onClose, results }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><FaTable className="text-indigo-500"/> Rapport de Sauvegarde</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl leading-none">&times;</button>
        </div>
        <div className="p-0 overflow-auto flex-1 custom-scrollbar">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-500 font-semibold uppercase text-xs sticky top-0">
              <tr>
                <th className="px-6 py-3">Élève</th>
                <th className="px-6 py-3">Matière</th>
                <th className="px-6 py-3">État</th>
                <th className="px-6 py-3">Détail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(!results || results.length === 0) ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-slate-400 italic">Aucune opération effectuée.</td></tr>
              ) : results.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-700">{r.student_label || `ID ${r.student_id}`}</td>
                  <td className="px-6 py-3 text-slate-600">{r.subject_label || `ID ${r.subject_id}`}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                      ${r.status === "created" ? "bg-emerald-100 text-emerald-800" : 
                        r.status === "updated" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}>
                      {r.status === 'created' ? 'Créé' : r.status === 'updated' ? 'Mis à jour' : 'Erreur'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-slate-500 truncate max-w-xs" title={r.message}>{r.message || JSON.stringify(r.errors) || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t bg-slate-50 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition shadow-sm">Fermer</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
   Grades Component
   --------------------------- */
export default function Grades() {
  const toast = React.useContext(ToastContext);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [term, setTerm] = useState("T1");
  const [loading, setLoading] = useState(false);
  const [subjectsNote, setSubjectsNote] = useState(null);
  
  // State for grades logic
  const [gradesMap, setGradesMap] = useState({});
  const [cellErrors, setCellErrors] = useState({});
  const cellErrorsRef = useRef(cellErrors);
  useEffect(() => { cellErrorsRef.current = cellErrors; }, [cellErrors]);
  const [dirtyMap, setDirtyMap] = useState({});
  
  // Save Results
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [saveResults, setSaveResults] = useState([]);

  // Refs
  const savingRef = useRef({});
  const timersRef = useRef({});
  const isBulkSavingRef = useRef(false);
  const isReloadingRef = useRef(false);
  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  /* --- Load Classes --- */
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchData("academics/school-classes/");
        setClasses(Array.isArray(data) ? data : []);
      } catch (e) {
        handleApiError(e);
        toast.push({ type: "error", title: "Erreur", text: "Impossible de charger les classes." });
      }
    })();
    return () => Object.values(timersRef.current).forEach(clearTimeout);
  }, []);

  // Measure header for sticky positioning
  useLayoutEffect(() => {
    const measure = () => {
      if (headerRef.current) setHeaderHeight(headerRef.current.getBoundingClientRect().height);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  /* --- Main Data Loader --- */
  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]); setSubjects([]); setGradesMap({}); setSubjectsNote(null); return;
    }
    reloadAllForClass(selectedClassId, term);
  }, [selectedClassId, term]);

  const reloadAllForClass = useCallback(async (classId, termArg) => {
    isReloadingRef.current = true;
    setLoading(true);
    setSubjectsNote(null);
    
    try {
      // 1. Students
      const stData = await fetchData(`core/admin/students/by-class/${classId}/`);
      setStudents(Array.isArray(stData) ? stData : []);

      // 2. Subjects
      let normalizedSubjects = [];
      try {
        const subRes = await fetchData(`academics/class-subjects/by-class/${classId}/`);
        const rawSubjects = Array.isArray(subRes) ? subRes : [];
        if (!rawSubjects.length) {
          setSubjects([]);
          setSubjectsNote("Aucune matière configurée pour cette classe.");
        } else {
          normalizedSubjects = rawSubjects.map((s) => {
            const subjectObj = s.subject || null;
            const subject_id = subjectObj?.id ?? s.subject_id ?? s.subject?.subject?.id ?? null;
            return {
              id: s.id,
              displayName: (s.name && String(s.name).trim()) || subjectObj?.name || s.subject_name || `Matière #${s.id}`,
              subject_id: subject_id,
              raw: s
            };
          });
          setSubjects(normalizedSubjects);
        }
      } catch (err) {
        handleApiError(err);
        setSubjectsNote("Impossible de charger les matières.");
      }

      // Lookup Maps
      const subjectLookupBySubjectId = {};
      normalizedSubjects.forEach(s => { if(s.subject_id != null) subjectLookupBySubjectId[String(s.subject_id)] = s; });

      // 3. Grades
      try {
        const query = buildQuery({ school_class: classId, term: termArg });
        const gres = await fetchData(`academics/grades/${query}`);
        const newMap = {};
        
        (gres || []).forEach((g) => {
          const sidRaw = g.student_id ?? (g.student?.id) ?? null;
          const subidRaw = g.subject_id ?? (g.subject?.id) ?? null;
          if (!sidRaw || !subidRaw) return;
          
          const key = gradeKey(String(sidRaw), String(subidRaw));
          newMap[key] = {
            ...g,
            student_id: String(sidRaw),
            subject_id: String(subidRaw),
            interrogation1: g.interrogation1 != null ? Number(g.interrogation1) : null,
            interrogation2: g.interrogation2 != null ? Number(g.interrogation2) : null,
            interrogation3: g.interrogation3 != null ? Number(g.interrogation3) : null,
            devoir1: g.devoir1 != null ? Number(g.devoir1) : null,
            devoir2: g.devoir2 != null ? Number(g.devoir2) : null,
          };
        });

        setGradesMap(newMap);
        setCellErrors({});
        setDirtyMap({});
      } catch (err) {
        handleApiError(err);
        toast.push({ type: "error", title: "Erreur", text: "Erreur chargement notes." });
      }
    } catch (err) {
      handleApiError(err);
      toast.push({ type: "error", title: "Fatal", text: "Impossible de charger les données." });
    } finally {
      setLoading(false);
      isReloadingRef.current = false;
    }
  }, [toast]);

  const visibleSubjects = useMemo(() => subjects || [], [subjects]);
  const cellHasAnyErrors = useCallback((key) => !!cellErrorsRef.current[key] && Object.keys(cellErrorsRef.current[key]).length > 0, []);

  /* --- Input Handlers --- */
  const setGradeCell = useCallback((studentId, subjectId, field, raw) => {
    const key = gradeKey(studentId, subjectId);
    const parsed = raw === "" ? null : parseFloat(raw);

    setGradesMap((prev) => {
      const existing = prev[key] || { id: null, student_id: String(studentId), subject_id: String(subjectId), term };
      return { ...prev, [key]: { ...existing, [field]: parsed, term } };
    });
    setDirtyMap((d) => ({ ...d, [key]: true }));

    let err = null;
    if (parsed !== null) {
      if (Number.isNaN(parsed)) err = "Numérique requis";
      else if (parsed < 0 || parsed > 20) err = "0-20";
    }

    setCellErrors((errs) => {
      const copy = { ...errs };
      const cellErr = copy[key] ? { ...copy[key] } : {};
      if (err) cellErr[field] = err; else delete cellErr[field];
      if (!Object.keys(cellErr).length) delete copy[key]; else copy[key] = cellErr;
      return copy;
    });

    // Debounced Autosave
    try { clearTimeout(timersRef.current[key]); } catch (e) {}
    if (isBulkSavingRef.current || isReloadingRef.current) return;
    
    timersRef.current[key] = setTimeout(() => {
      if (!cellHasAnyErrors(key) && dirtyMap[key]) {
        saveSingleGrade(key).catch(() => {});
      }
      delete timersRef.current[key];
    }, 2000); // 2s autosave
  }, [dirtyMap, cellHasAnyErrors, term]); // Added term to dependencies if needed, though handled in effect

  /* --- Save Logic (Single & Bulk) --- */
  async function saveSingleGrade(key) {
    if (savingRef.current[key]) return savingRef.current[key];
    const g = gradesMap[key];
    if (!g) return;

    const student_id = String(g.student_id ?? key.split("::")[0]);
    const subject_id_key = String(g.subject_id ?? key.split("::")[1]);

    const payloadLine = {
      ...(g.id ? { id: g.id } : {}),
      student_id, subject_id: Number(subject_id_key), term: g.term || term,
    };
    ["interrogation1", "interrogation2", "interrogation3", "devoir1", "devoir2"].forEach(f => {
        const v = g[f];
        if(v !== null && v !== undefined) payloadLine[f] = clampGradeValue(v);
    });

    const act = async () => {
        try {
            const data = await postData(`academics/grades/bulk_upsert/`, [payloadLine]);
            const r = (Array.isArray(data.results) ? data.results : [])[0];
            
            if(r && r.status !== 'error') {
                setGradesMap(p => ({ ...p, [key]: { ...p[key], id: r.id || p[key].id } }));
                setDirtyMap(d => { const c = {...d}; delete c[key]; return c; });
                // Optional: silent success or small indicator
            } else if (r && r.status === 'error') {
                setCellErrors(p => ({...p, [key]: r.errors || { server: "Erreur" } }));
            }
        } catch(e) { console.error(e); }
    };
    const p = act();
    savingRef.current[key] = p;
    return p;
  }

  function buildPayloadLine(studentId, subjectId) {
    const key = gradeKey(studentId, subjectId);
    const g = gradesMap[key] || { id: null, student_id: String(studentId), subject_id: String(subjectId) };
    const line = {
      ...(g.id ? { id: g.id } : {}),
      student_id: String(g.student_id ?? studentId),
      subject_id: Number(g.subject_id ?? subjectId),
      term: g.term || term,
    };
    ["interrogation1", "interrogation2", "interrogation3", "devoir1", "devoir2"].forEach(f => {
       const v = g[f];
       if (v !== null && v !== undefined) line[f] = clampGradeValue(v);
    });
    return line;
  }

  const handleSaveAll = useCallback(async () => {
    setSaveResults([]);
    const toCreate = [];
    students.forEach(stu => {
        visibleSubjects.forEach(sub => {
            const subjKeyId = sub.subject_id != null ? sub.subject_id : sub.id;
            const key = gradeKey(stu.id, subjKeyId);
            if(cellHasAnyErrors(key)) {
                setSaveResults(s => [...s, { student_label: stu.user?.last_name, subject_label: sub.displayName, status: "error", message: "Erreur de validation locale" }]);
                return;
            }
            const g = buildPayloadLine(stu.id, subjKeyId);
            // Check if any data exists to save
            const hasData = ["interrogation1","interrogation2","interrogation3","devoir1","devoir2"].some(f => g[f] != null);
            if(!hasData && !g.id) return;
            if(dirtyMap[key]) toCreate.push(g); // Only save dirty
        });
    });

    if(!toCreate.length) { toast.push({type:"info", text:"Aucune modification en attente."}); return; }

    isBulkSavingRef.current = true;
    setLoading(true);
    try {
        const data = await postData(`academics/grades/bulk_upsert/`, toCreate);
        const results = Array.isArray(data.results) ? data.results : [];
        
        if(results.length) {
            setGradesMap(prev => {
                const copy = {...prev};
                results.forEach(r => {
                    const k = gradeKey(String(r.student_id), String(r.subject_id));
                    if(copy[k]) copy[k] = { ...copy[k], id: r.id || copy[k].id };
                });
                return copy;
            });
            setDirtyMap({}); // Clear all dirty
        }
        setSaveResults(results);
        toast.push({ type: "success", title: "Sauvegarde terminée", text: `${data.created || 0} créés, ${data.updated || 0} mis à jour.` });
        setResultModalOpen(true);
    } catch(err) {
        console.error(err);
        toast.push({ type: "error", title: "Echec", text: "Erreur lors de la sauvegarde globale." });
    } finally {
        isBulkSavingRef.current = false;
        setLoading(false);
    }
  }, [students, visibleSubjects, dirtyMap, cellHasAnyErrors, term, toast]);

  /* --- Render Helpers --- */
  function computeLocalAverages(studentId, subjectId) {
    const key = gradeKey(studentId, subjectId);
    const g = gradesMap[key] || {};
    const ai = avg([g.interrogation1, g.interrogation2, g.interrogation3]);
    const devoirs = [g.devoir1, g.devoir2].filter(x => x != null);
    const all = [...(ai != null ? [ai] : []), ...devoirs];
    return { avgI: ai, avgTot: all.length ? Math.round(all.reduce((a,b)=>a+Number(b),0)/all.length*100)/100 : null };
  }

  const renderCellInputs = useCallback((student, subject) => {
    const subjKeyId = subject.subject_id != null ? subject.subject_id : subject.id;
    const key = gradeKey(student.id, subjKeyId);
    const g = gradesMap[key] || {};
    const errs = cellErrors[key] || {};
    const dirty = !!dirtyMap[key];
    const { avgI, avgTot } = computeLocalAverages(student.id, subjKeyId);

    return (
        <div className={`p-3 rounded-lg border transition-all duration-300 relative group ${dirty ? "bg-amber-50/50 border-amber-200" : "bg-white border-slate-100 hover:border-indigo-100"}`}>
            {/* Status Indicator Dot */}
            <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${dirty ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 opacity-0 group-hover:opacity-100'}`} title={dirty ? "Non sauvegardé" : "Sauvegardé"}></div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-5 gap-2 mb-2">
                {["interrogation1", "interrogation2", "interrogation3", "devoir1", "devoir2"].map((f, idx) => (
                    <div key={f} className="flex flex-col items-center">
                        <span className="text-[9px] text-slate-400 uppercase font-bold mb-0.5 tracking-tighter">{idx < 3 ? `I${idx+1}` : `D${idx-2}`}</span>
                        <input 
                            className={`w-full text-center text-xs font-medium h-8 rounded border outline-none transition-all shadow-sm focus:ring-2 focus:z-10
                                ${errs[f] ? "border-red-400 focus:ring-red-200 bg-red-50" : "border-slate-200 focus:border-indigo-400 focus:ring-indigo-100 bg-white"}`}
                            value={fmtNullable(g[f])}
                            placeholder="-"
                            onChange={e => setGradeCell(student.id, subjKeyId, f, e.target.value)}
                        />
                    </div>
                ))}
            </div>

            {/* Averages Footer */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-100/50 text-[10px]">
                <div className="text-slate-500 font-medium">Moy. Interros: <span className="text-slate-800 font-bold">{avgI ?? "-"}</span></div>
                <div className={`font-bold px-2 py-0.5 rounded ${avgTot < 10 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                    Moyenne: {avgTot ?? "-"}
                </div>
            </div>
            
            {/* Errors Overlay */}
            {Object.keys(errs).length > 0 && (
                <div className="absolute inset-x-0 -bottom-2 flex justify-center">
                    <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full shadow-sm border border-red-200 flex items-center gap-1">
                        <FaExclamationTriangle size={10} /> Erreur saisie
                    </span>
                </div>
            )}
        </div>
    );
  }, [gradesMap, cellErrors, dirtyMap, setGradeCell]);


  return (
    <div className="p-6 min-h-screen bg-slate-50/50 font-sans pb-24" style={{ "--header-h": `${headerHeight}px` }}>
      
      {/* STICKY HEADER */}
      <div ref={headerRef} className="sticky top-4 z-40 mb-6">
        <div className="bg-white/90 backdrop-blur-md border border-white/50 shadow-xl shadow-slate-200/50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Title & Breadcrumb */}
            <div>
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">Saisie des Notes</h1>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1">
                    <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Enseignant</span>
                    <span>•</span>
                    <span>Mode Grille</span>
                    {Object.keys(dirtyMap).length > 0 && (
                        <span className="text-amber-600 flex items-center gap-1 animate-pulse">
                            • {Object.keys(dirtyMap).length} modif(s) en attente
                        </span>
                    )}
                </div>
            </div>

            {/* Controls Toolbar */}
            <div className="flex flex-wrap items-center gap-3">
                {/* Class Selector */}
                <div className="relative">
                    <select 
                        value={selectedClassId} 
                        onChange={e => setSelectedClassId(e.target.value)}
                        className="appearance-none bg-slate-100 hover:bg-slate-200 border-transparent text-sm font-bold text-slate-700 py-2.5 pl-4 pr-10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-colors cursor-pointer min-w-[200px]"
                    >
                        <option value="">-- Sélectionner une classe --</option>
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500">▼</div>
                </div>

                {/* Term Switcher */}
                <div className="bg-slate-100 p-1 rounded-xl flex shadow-inner">
                    {["T1", "T2", "T3"].map(t => (
                        <button 
                            key={t}
                            onClick={() => setTerm(t)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${term === t ? 'bg-white text-indigo-600 shadow-sm scale-105' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="w-px h-8 bg-slate-200 mx-2 hidden md:block"></div>

                {/* Action Buttons */}
                <button 
                    onClick={async () => { 
                        if(!selectedClassId) return; 
                        setLoading(true); 
                        await reloadAllForClass(selectedClassId, term); 
                        setLoading(false); 
                    }}
                    className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition border border-transparent hover:border-indigo-100"
                    title="Rafraîchir les données"
                >
                    <FaSyncAlt className={loading ? "animate-spin" : ""} />
                </button>

                <button 
                    onClick={handleSaveAll}
                    disabled={Object.keys(dirtyMap).length === 0}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg shadow-indigo-200 transition-all active:scale-95
                        ${Object.keys(dirtyMap).length > 0 ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-300' : 'bg-slate-300 cursor-not-allowed shadow-none'}`}
                >
                    <FaSave /> Sauvegarder Tout
                </button>
            </div>
        </div>
      </div>

      {/* ALERTS & EMPTY STATES */}
      {subjectsNote && (
          <div className="max-w-4xl mx-auto mb-6 p-4 rounded-xl bg-amber-50 border border-amber-100 text-amber-800 text-sm font-medium flex items-center gap-3">
              <FaExclamationTriangle /> {subjectsNote}
          </div>
      )}

      {!selectedClassId ? (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-slate-200 rounded-3xl bg-white/50">
              <div className="bg-indigo-50 p-4 rounded-full mb-4 text-indigo-300"><FaTable size={32} /></div>
              <h3 className="text-lg font-bold text-slate-700">Aucune classe sélectionnée</h3>
              <p className="text-slate-500 text-sm mt-1">Veuillez choisir une classe dans la barre d'outils ci-dessus pour commencer la saisie.</p>
          </div>
      ) : loading ? (
          <div className="flex flex-col items-center justify-center py-32">
              <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-slate-400 font-medium text-sm animate-pulse">Chargement de la grille...</p>
          </div>
      ) : students.length === 0 || visibleSubjects.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-500 font-medium">Aucune donnée trouvée pour cette configuration (Élèves ou Matières manquants).</p>
          </div>
      ) : (
          /* GRID CONTAINER */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden flex flex-col max-h-[calc(100vh-180px)]">
              {/* Stats Bar */}
              <div className="bg-slate-50/80 border-b border-slate-200 px-6 py-2 flex justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <span>{students.length} Élèves</span>
                  <span>{visibleSubjects.length} Matières</span>
              </div>

              <div className="overflow-auto custom-scrollbar flex-1">
                  <table className="min-w-max border-collapse">
                      <thead className="sticky top-0 z-30 bg-white shadow-sm">
                          <tr>
                              <th className="sticky left-0 z-40 bg-white p-0 border-b border-r border-slate-200 w-64 min-w-[250px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                                  <div className="h-full p-4 flex items-center gap-3 bg-slate-50/50">
                                      <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><FaUserGraduate /></div>
                                      <div className="text-left">
                                          <div className="text-slate-800 font-bold text-sm">Élève</div>
                                          <div className="text-[10px] text-slate-400 font-normal">Nom & Prénom</div>
                                      </div>
                                  </div>
                              </th>
                              {visibleSubjects.map(s => (
                                  <th key={s.id} className="p-3 border-b border-r border-slate-100 min-w-[280px] bg-slate-50/30 text-left align-top">
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                          <span className="font-bold text-slate-700 text-xs uppercase tracking-wide truncate max-w-[200px]" title={s.displayName}>{s.displayName}</span>
                                      </div>
                                      <div className="h-1 w-8 bg-indigo-100 rounded-full"></div>
                                  </th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {students.map((stu, idx) => (
                              <tr key={stu.id} className="group hover:bg-slate-50/50 transition-colors">
                                  <td className="sticky left-0 z-20 bg-white group-hover:bg-slate-50/50 p-4 border-r border-slate-200 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                                      <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 border border-white shadow-sm">
                                              {(stu.user?.first_name?.[0] || "E")}
                                          </div>
                                          <div className="min-w-0">
                                              <div className="font-bold text-slate-700 text-sm truncate max-w-[160px]" title={`${stu.user?.first_name} ${stu.user?.last_name}`}>
                                                  {stu.user?.first_name} {stu.user?.last_name}
                                              </div>
                                              <div className="text-[10px] text-slate-400 font-mono">ID: {stu.id}</div>
                                          </div>
                                      </div>
                                  </td>
                                  {visibleSubjects.map(s => (
                                      <td key={s.id} className="p-2 border-r border-slate-50 align-top">
                                          {renderCellInputs(stu, s)}
                                      </td>
                                  ))}
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* MODALS & TOASTS */}
      <ResultModal open={resultModalOpen} onClose={() => setResultModalOpen(false)} results={saveResults} />
      
      {/* CSS for animations & scrollbars */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; border: 2px solid #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slideUp { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
      `}</style>
    </div>
  );
}