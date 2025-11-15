// src/pages/Grades.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from "react";
import { fetchData, postData } from "./api";

/* ---------------------------
   Utilitaires locaux
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
  // err will typically be Error thrown by api.handleResponse with .status and .body
  const status = err?.status ?? (err && err.status) ?? null;
  if (status === 401) {
    try { localStorage.removeItem("access_token"); localStorage.removeItem("refresh_token"); } catch(e) {}
    if (typeof window !== "undefined") window.location.href = "/login";
    // throw to stop further processing
  }
}

/* ---------------------------
   Toast Provider (unchanged)
   --------------------------- */
const ToastContext = React.createContext(null);
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback(({ type = "info", title = "", text = "", timeout = 5000 }) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, title, text }]);
    if (timeout > 0) setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), timeout);
  }, []);
  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="fixed right-4 top-4 z-50 flex flex-col gap-3 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={`flex items-start gap-3 p-3 rounded-lg shadow-md border transform transition-all
              ${t.type === "success" ? "bg-emerald-50 border-emerald-200" : t.type === "error" ? "bg-rose-50 border-rose-200" : "bg-white border-gray-100"}`}
          >
            <div className="flex-1">
              {t.title && <div className="font-semibold text-sm mb-0.5">{t.title}</div>}
              <div className="text-xs text-gray-700">{t.text}</div>
            </div>
            <button
              aria-label="Fermer notification"
              onClick={() => setToasts((s) => s.filter((x) => x.id !== t.id))}
              className="text-xs text-gray-400 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ---------------------------
   Result Modal (unchanged)
   --------------------------- */
function ResultModal({ open, onClose, results }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-lg font-semibold">Résultats de la sauvegarde</h3>
          <button onClick={onClose} className="text-sm px-3 py-1 rounded border">Fermer</button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-auto">
          <div className="grid grid-cols-12 gap-2 font-medium text-sm border-b pb-2 mb-2">
            <div className="col-span-3">Élève</div>
            <div className="col-span-3">Matière</div>
            <div className="col-span-2">Opération</div>
            <div className="col-span-4">Message</div>
          </div>
          {(!results || results.length === 0) ? (
            <div className="text-gray-500">Aucun résultat.</div>
          ) : results.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start py-2 border-b last:border-b-0">
              <div className="col-span-3 text-sm">{r.student_label || (r.student_id ? `ID ${r.student_id}` : "ID manquant")}</div>
              <div className="col-span-3 text-sm">{r.subject_label || (r.subject_id ? `ID ${r.subject_id}` : "ID manquant")}</div>
              <div className="col-span-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold
                  ${r.status === "created" ? "bg-emerald-100 text-emerald-800" : r.status === "updated" ? "bg-indigo-100 text-indigo-800" : "bg-rose-100 text-rose-800"}`}>
                  {r.status}
                </span>
              </div>
              <div className="col-span-4 text-sm text-gray-700">{r.message || (r.errors ? JSON.stringify(r.errors) : "-")}</div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border">OK</button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------
   Grades component (migration)
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
  const [gradesMap, setGradesMap] = useState({});
  const [cellErrors, setCellErrors] = useState({});
  const cellErrorsRef = useRef(cellErrors);
  useEffect(() => { cellErrorsRef.current = cellErrors; }, [cellErrors]);
  const [dirtyMap, setDirtyMap] = useState({});
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [saveResults, setSaveResults] = useState([]);

  const savingRef = useRef({});
  const timersRef = useRef({});
  const isBulkSavingRef = useRef(false);
  const isReloadingRef = useRef(false);

  const headerRef = useRef(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  /* initial classes load */
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
    return () => {
      Object.values(timersRef.current).forEach((id) => clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    function measure() {
      const h = headerRef.current ? headerRef.current.getBoundingClientRect().height : 0;
      setHeaderHeight(Math.round(h));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setStudents([]); setSubjects([]); setGradesMap({}); setSubjectsNote(null);
      return;
    }
    reloadAllForClass(selectedClassId, term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId, term]);

  const reloadAllForClass = useCallback(async (classId, termArg) => {
    isReloadingRef.current = true;
    setLoading(true);
    setSubjectsNote(null);
    try {
      const stData = await fetchData(`core/admin/students/by-class/${classId}/`);
      setStudents(Array.isArray(stData) ? stData : []);

      let normalizedSubjects = [];
      try {
        const subRes = await fetchData(`academics/class-subjects/by-class/${classId}/`);
        const rawSubjects = Array.isArray(subRes) ? subRes : [];
        if (!rawSubjects.length) {
          setSubjects([]);
          setSubjectsNote("Aucune matière renvoyée pour cette classe.");
        } else {
          normalizedSubjects = rawSubjects.map((s) => {
            const csId = s.id;
            const subjectObj = s.subject || null;
            const subject_id = subjectObj?.id ?? s.subject_id ?? s.subject?.subject?.id ?? null;
            const subject_name = subjectObj?.name ?? s.subject_name ?? s.name ?? null;
            const displayName = (s.name && String(s.name).trim()) || subject_name || (subject_id ? `Matière #${subject_id}` : `Matière #${csId}`);
            return {
              id: csId,
              displayName,
              subject_id: subject_id,
              subject_name: subject_name,
              raw: s,
              name: displayName,
            };
          });
          setSubjects(normalizedSubjects);
        }
      } catch (err) {
        handleApiError(err);
        setSubjects([]);
        setSubjectsNote("Impossible d'obtenir les matières.");
      }

      const subjectLookupBySubjectId = {};
      const subjectLookupByClassSubjectId = {};
      normalizedSubjects.forEach((s) => {
        if (s.subject_id != null) subjectLookupBySubjectId[String(s.subject_id)] = s;
        subjectLookupByClassSubjectId[String(s.id)] = s;
      });

      try {
        const query = buildQuery({ school_class: classId, term: termArg });
        const gres = await fetchData(`academics/grades/${query}`);
        const newMap = {};
        (gres || []).forEach((g) => {
          const sidRaw = g.student_id ?? (g.student && (g.student.id ?? g.student_id)) ?? null;
          const subidRaw = g.subject_id ?? (g.subject && (g.subject.id ?? g.subject_id)) ?? g.subject_code ?? null;
          if (sidRaw == null || subidRaw == null) return;
          const key = gradeKey(String(sidRaw), String(subidRaw));
          const subjectName =
            g.subject_name ??
            g.classsubject_name ??
            (subjectLookupBySubjectId[String(subidRaw)] && subjectLookupBySubjectId[String(subidRaw)].displayName) ??
            (subjectLookupByClassSubjectId[String(subidRaw)] && subjectLookupByClassSubjectId[String(subidRaw)].displayName) ??
            (g.subject && (g.subject.name || g.subject.subject?.name)) ??
            `Matière #${subidRaw}`;
          newMap[key] = {
            ...g,
            student_id: String(sidRaw),
            subject_id: String(subidRaw),
            subject_name: subjectName,
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
        toast.push({ type: "error", title: "Erreur", text: "Impossible de charger les notes." });
        setGradesMap({});
      }
    } catch (err) {
      handleApiError(err);
      console.error(err);
      toast.push({ type: "error", title: "Erreur", text: "Impossible de charger les données." });
      setStudents([]); setSubjects([]); setGradesMap({});
    } finally {
      setLoading(false);
      isReloadingRef.current = false;
    }
  }, [toast]);

  const visibleSubjects = useMemo(() => subjects || [], [subjects]);

  const cellHasAnyErrors = useCallback((key) => !!cellErrorsRef.current[key] && Object.keys(cellErrorsRef.current[key]).length > 0, []);

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
      if (Number.isNaN(parsed)) err = "Doit être un nombre";
      else if (parsed < 0 || parsed > 20) err = "Val. entre 0 et 20";
    }

    setCellErrors((errs) => {
      const copy = { ...errs };
      const cellErr = copy[key] ? { ...copy[key] } : {};
      if (err) cellErr[field] = err; else delete cellErr[field];
      if (!Object.keys(cellErr).length) delete copy[key]; else copy[key] = cellErr;
      return copy;
    });

    try { clearTimeout(timersRef.current[key]); } catch (e) {}
    if (isBulkSavingRef.current || isReloadingRef.current) return;
    timersRef.current[key] = setTimeout(() => {
      if (!cellHasAnyErrors(key) && dirtyMap[key]) {
        saveSingleGrade(key).catch(() => {});
      }
      delete timersRef.current[key];
    }, 3000);
  }, [dirtyMap, cellHasAnyErrors]);

  async function saveSingleGrade(key) {
    if (savingRef.current[key]) return savingRef.current[key];

    const g = gradesMap[key];
    if (!g) return;

    const student_id = String(g.student_id ?? key.split("::")[0]);
    const subject_id_key = String(g.subject_id ?? key.split("::")[1]);

    const payloadLine = {
      ...(g.id ? { id: g.id } : {}),
      student_id: student_id,
      subject_id: Number(subject_id_key),
      term: g.term || term,
    };

    ["interrogation1", "interrogation2", "interrogation3", "devoir1", "devoir2"].forEach((f) => {
      const val = g[f];
      if (val !== null && val !== undefined) payloadLine[f] = clampGradeValue(val);
    });

    const act = async () => {
      isBulkSavingRef.current = true;
      try {
        const data = await postData(`academics/grades/bulk_upsert/`, [payloadLine]);
        const results = Array.isArray(data.results) ? data.results : data.results ? [data.results] : [];
        const r = results.find(rr => String(rr.student_id) === String(student_id) && String(rr.subject_id) === String(subject_id_key)) || results[0];

        if (r && r.status && r.status !== "error") {
          setGradesMap((prev) => {
            const copy = { ...prev };
            copy[key] = { ...(copy[key] || {}), ...(r.id ? { id: r.id } : {}), student_id: String(student_id), subject_id: String(subject_id_key) };
            return copy;
          });
          setDirtyMap((d) => { const c = { ...d }; delete c[key]; return c; });
          toast.push({ type: "success", title: "Auto-save", text: `Note de ${student_id} sauvegardée automatiquement.` });
        } else if (r && r.status === "error") {
          setCellErrors(prev => ({ ...prev, [key]: r.errors || { server: r.errors || "Erreur serveur" } }));
          toast.push({ type: "error", title: "Erreur", text: `Erreur serveur: ${JSON.stringify(r.errors)}` });
        } else {
          if ((data.created || 0) + (data.updated || 0) > 0) {
            (data.results || []).forEach(rr => {
              const k = gradeKey(String(rr.student_id), String(rr.subject_id));
              setGradesMap(prev => ({ ...prev, [k]: { ...(prev[k] || {}), id: rr.id ? rr.id : prev[k]?.id, student_id: String(rr.student_id), subject_id: String(rr.subject_id) } }));
              setDirtyMap(prev => { const c = { ...prev }; delete c[k]; return c; });
              toast.push({ type: "success", title: "Auto-save", text: `Note de ${rr.student_id} sauvegardée automatiquement.` });
            });
          } else {
            toast.push({ type: "warning", title: "Avertissement", text: `Aucune ligne traitée.` });
          }
        }
      } catch (err) {
        console.error("Autosave error", err);
        handleApiError(err);
        const message = err?.body ? JSON.stringify(err.body) : (err?.message || "Erreur réseau");
        toast.push({ type: "error", title: "Erreur", text: `Enregistrement échoué: ${message}` });
      } finally {
        delete savingRef.current[key];
        isBulkSavingRef.current = false;
      }
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
    ["interrogation1", "interrogation2", "interrogation3", "devoir1", "devoir2"].forEach((f) => {
      const val = g[f];
      if (val !== null && val !== undefined) line[f] = clampGradeValue(val);
    });
    return line;
  }

  function computeLocalAverages(studentId, subjectId) {
    const key = gradeKey(studentId, subjectId);
    const g = gradesMap[key] || {};
    const ai = avg([g.interrogation1, g.interrogation2, g.interrogation3]);
    const devoirs = [g.devoir1, g.devoir2].filter(x => x != null);
    const all = [...(ai != null ? [ai] : []), ...devoirs];
    return { average_interro: ai, average_subject: all.length ? Math.round(all.reduce((a, b) => a + Number(b), 0) / all.length * 100) / 100 : null };
  }

  const renderCellInputs = useCallback((student, subject) => {
    const subjKeyId = subject.subject_id != null ? subject.subject_id : subject.id;
    const key = gradeKey(student.id, subjKeyId);
    const g = gradesMap[key] || { interrogation1: null, interrogation2: null, interrogation3: null, devoir1: null, devoir2: null, student_id: String(student.id), subject_id: String(subjKeyId) };
    const errs = cellErrors[key] || {};
    const dirty = !!dirtyMap[key];
    const { average_interro, average_subject } = computeLocalAverages(student.id, subjKeyId);

    return (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-5 gap-1">
          {["interrogation1", "interrogation2", "interrogation3", "devoir1", "devoir2"].map((f) => (
            <input
              key={f}
              aria-label={`${f} pour ${student.user?.first_name} ${student.user?.last_name}`}
              className={`text-xs p-2 rounded border bg-white focus:outline-none focus:ring-2 transition-all
                ${errs[f] ? "border-rose-400 focus:ring-rose-200" : "border-gray-200 focus:ring-indigo-100"}`}
              value={fmtNullable(g[f])}
              placeholder="-"
              inputMode="decimal"
              onChange={(e) => setGradeCell(student.id, subjKeyId, f, e.target.value)}
              onBlur={(e) => { setGradeCell(student.id, subjKeyId, f, e.target.value); }}
              title={f.charAt(0).toUpperCase() + f.slice(1)}
            />
          ))}
        </div>

        <div className="flex items-center justify-between text-xs mt-1">
          <div className="text-gray-600">
            <div>Avg I: <span className="font-semibold">{average_interro ?? "-"}</span></div>
            <div>Moy Sub: <span className="font-semibold">{average_subject ?? "-"}</span></div>
          </div>
          <div>
            {dirty
              ? <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">non sauvegardé</span>
              : <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">sauvegardé</span>}
          </div>
        </div>

        {errs && Object.keys(errs).length > 0 && (
          <div className="text-rose-600 text-xs mt-1" role="alert">
            {Object.values(errs).map((m, i) => <div key={i}>{m}</div>)}
          </div>
        )}
      </div>
    );
  }, [gradesMap, cellErrors, dirtyMap, setGradeCell]);

  const handleSaveAll = useCallback(async () => {
    setSaveResults([]);
    const toCreate = [];
    students.forEach(stu => {
      visibleSubjects.forEach(sub => {
        const subjKeyId = sub.subject_id != null ? sub.subject_id : sub.id;
        const key = gradeKey(stu.id, subjKeyId);
        if (cellHasAnyErrors(key)) { setSaveResults(s => [...s, { student_id: stu.id, subject_id: subjKeyId, status: "error", message: "Validation locale" }]); return; }
        const g = buildPayloadLine(stu.id, subjKeyId);
        const hasAnyValue = ["interrogation1","interrogation2","interrogation3","devoir1","devoir2"].some(f => g[f] != null);
        if (!hasAnyValue && !g.id) return;
        toCreate.push(g);
      });
    });

    if (!toCreate.length) { toast.push({ type: "info", title: "Info", text: "Aucune modification." }); return; }

    isBulkSavingRef.current = true;
    setLoading(true);
    try {
      const data = await postData(`academics/grades/bulk_upsert/`, toCreate);
      const results = Array.isArray(data.results) ? data.results : [];
      if (results.length) {
        setGradesMap(prev => {
          const copy = { ...prev };
          results.forEach((r) => {
            const k = gradeKey(String(r.student_id), String(r.subject_id));
            if (!copy[k]) copy[k] = {};
            copy[k] = { ...copy[k], id: r.id ? r.id : copy[k].id, student_id: String(r.student_id), subject_id: String(r.subject_id) };
          });
          return copy;
        });
        setDirtyMap(prev => {
          const copy = { ...prev };
          results.forEach((r) => {
            const k = gradeKey(String(r.student_id), String(r.subject_id));
            delete copy[k];
          });
          return copy;
        });
      }

      setSaveResults(results);
      if ((data.created || 0) + (data.updated || 0) === 0 && (data.errors || 0) === 0 && results.length === 0) {
        toast.push({ type: "warning", title: "Attention", text: "Aucune ligne traitée (vérifie le payload)." });
        console.warn("bulk_upsert suspicious response", toCreate, data);
      } else {
        toast.push({ type: "success", title: "Enregistré", text: `Créées: ${data.created||0} • Modifiées: ${data.updated||0} • Erreurs: ${data.errors||0}` });
      }

      await reloadAllForClass(selectedClassId, term);
    } catch (err) {
      console.error(err);
      handleApiError(err);
      const message = err?.body ? JSON.stringify(err.body) : (err?.message || "Echec de la sauvegarde.");
      toast.push({ type: "error", title: "Erreur", text: message });
      setSaveResults([{ status: "error", errors: err?.body ?? err }]);
    } finally {
      isBulkSavingRef.current = false;
      setLoading(false);
    }
  }, [students, visibleSubjects, toast, reloadAllForClass, selectedClassId, term]);

  return (
    <div className="p-6 max-w-full" style={{ "--header-height": `${headerHeight}px` }}>
      <div ref={headerRef} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold leading-tight text-slate-800">Gestion des notes</h1>
          <p className="text-sm text-slate-600 mt-1">Édition en ligne • Autosave • Sauvegarde globale</p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2">
            <label className="sr-only">Classe</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="border rounded p-2 min-w-[220px] text-sm bg-white shadow-sm"
            >
              <option value="">-- Choisir classe --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            <div className="flex items-center gap-1">
              {["T1","T2","T3"].map(ti => (
                <button
                  key={ti}
                  onClick={() => setTerm(ti)}
                  className={`px-3 py-2 rounded text-sm transition
                    ${term === ti ? (ti === "T1" ? "bg-indigo-600 text-white" : ti === "T2" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white") : "bg-gray-100 text-gray-700"}`}
                  aria-pressed={term === ti}
                >
                  {ti}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={async () => {
              if (!selectedClassId) { toast.push({ type: "info", title: "Sélection", text: "Choisis d'abord une classe." }); return; }
              setLoading(true);
              await reloadAllForClass(selectedClassId, term);
              setLoading(false);
              toast.push({ type: "success", title: "Rafraîchi", text: "Données rechargées." });
            }}
            className="px-3 py-2 bg-white border rounded text-sm hover:shadow transition"
            title="Rafraîchir"
          >
            ⟳ Rafraîchir
          </button>

          <button onClick={handleSaveAll} className="px-3 py-2 bg-indigo-600 text-white rounded shadow text-sm">💾 Sauvegarder tout</button>
        </div>
      </div>

      {subjectsNote && <div className="mb-4 p-3 bg-amber-50 border-l-4 border-amber-300 text-sm text-amber-800 rounded">{subjectsNote}</div>}

      {!selectedClassId ? (
        <div className="text-center text-slate-500 py-12 rounded border-dashed border-2 border-slate-100">Sélectionne une classe pour commencer.</div>
      ) : loading ? (
        <div className="text-center text-slate-500 py-12">Chargement…</div>
      ) : students.length === 0 ? (
        <div className="text-center text-slate-500 py-12">Aucun élève dans cette classe.</div>
      ) : visibleSubjects.length === 0 ? (
        <div className="text-center text-slate-500 py-12">Aucune matière définie pour cette classe.</div>
      ) : (
        <div className="relative">
          <div
            className="sticky z-20 bg-white/90 backdrop-blur-sm p-2 border-b flex items-center justify-between"
            style={{ top: headerHeight + 8 }}
          >
            <div className="text-xs text-slate-600">Élèves: <span className="font-semibold">{students.length}</span> — Matières: <span className="font-semibold">{visibleSubjects.length}</span></div>
            <div className="flex gap-2 items-center">
              <div className="text-xs text-slate-600">État:
                {Object.keys(dirtyMap).length ? <span className="text-amber-700 font-medium ml-1">{Object.keys(dirtyMap).length} modifs</span> : <span className="text-emerald-700 ml-1">tout sauvé</span>}
              </div>
              <button onClick={() => { setResultModalOpen(true); }} className="text-xs px-2 py-1 border rounded">Voir résultats</button>
            </div>
          </div>

          <div className="overflow-auto border rounded shadow-sm mt-2 max-h-[75vh]">
            <table className="min-w-full table-fixed border-collapse">
              <thead
                className="sticky top-0 z-20"
                style={{
                  background: "linear-gradient(180deg, rgba(247,250,255,0.97), rgba(236,239,255,0.97))",
                  backdropFilter: "blur(4px)",
                }}
              >
                <tr className="shadow-sm">
                  <th className="p-3 text-left w-56 border-b border-slate-200 bg-indigo-50">
                    <div className="flex items-center gap-2">
                      <div className="text-slate-800 font-semibold">Élève</div>
                      <div className="text-xs text-slate-500">identité</div>
                    </div>
                  </th>

                  {visibleSubjects.map((s) => (
                    <th
                      key={s.id}
                      className="p-3 text-left align-top min-w-[280px] border-b border-slate-200 bg-indigo-50"
                    >
                      <div className="flex items-start gap-2">
                        <div className="rounded px-2 py-1 bg-gradient-to-b from-indigo-50 to-violet-50 border border-violet-100 shadow-sm">
                          <div className="font-semibold text-slate-800">
                            {s.displayName ?? s.name}
                          </div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {students.map((stu, rIdx) => (
                  <tr key={stu.id} className={`${rIdx % 2 === 0 ? "bg-white" : "bg-slate-50"} hover:bg-indigo-50 transition-colors`}>
                    <td className="p-3 align-top border-r">
                      <div className="font-medium text-slate-800">{stu.user?.first_name} {stu.user?.last_name}</div>
                      <div className="text-xs text-slate-500 mt-1">ID: {stu.id}</div>
                    </td>

                    {visibleSubjects.map(s => (
                      <td key={s.id} className="p-3 align-top border-b align-middle">
                        <div className="p-2 bg-white rounded border border-slate-50 shadow-sm">
                          {renderCellInputs(stu, s)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ResultModal open={resultModalOpen} onClose={() => setResultModalOpen(false)} results={saveResults} />

      {loading && (
        <div className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-black/20 w-full h-full"></div>
        </div>
      )}
    </div>
  );
}
