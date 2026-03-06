import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  FaEdit, FaTrash, FaPlus, FaSearch, FaCheck, FaSyncAlt,
  FaChevronDown, FaChevronUp, FaLayerGroup, FaClock,
  FaPercentage, FaInfoCircle, FaEraser, FaSave, FaCopy,
  FaTimes, FaArrowRight, FaCheckSquare, FaSquare, FaExclamationTriangle,
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";

/* ─── Color palette ─────────────────────────────────────────────────────── */
const PALETTE = [
  { dot: "bg-red-500",    card: "border-red-200",    tag: "bg-red-50 text-red-700"    },
  { dot: "bg-orange-500", card: "border-orange-200", tag: "bg-orange-50 text-orange-700" },
  { dot: "bg-amber-500",  card: "border-amber-200",  tag: "bg-amber-50 text-amber-700"  },
  { dot: "bg-emerald-500",card: "border-emerald-200",tag: "bg-emerald-50 text-emerald-700"},
  { dot: "bg-teal-500",   card: "border-teal-200",   tag: "bg-teal-50 text-teal-700"   },
  { dot: "bg-cyan-500",   card: "border-cyan-200",   tag: "bg-cyan-50 text-cyan-700"   },
  { dot: "bg-blue-500",   card: "border-blue-200",   tag: "bg-blue-50 text-blue-700"   },
  { dot: "bg-indigo-500", card: "border-indigo-200", tag: "bg-indigo-50 text-indigo-700"},
  { dot: "bg-violet-500", card: "border-violet-200", tag: "bg-violet-50 text-violet-700"},
  { dot: "bg-fuchsia-500",card: "border-fuchsia-200",tag: "bg-fuchsia-50 text-fuchsia-700"},
  { dot: "bg-rose-500",   card: "border-rose-200",   tag: "bg-rose-50 text-rose-700"   },
];
const palette = (id) => PALETTE[(id ?? 0) % PALETTE.length];

/* ─── Toast ─────────────────────────────────────────────────────────────── */
const Toast = ({ message, onClose }) => {
  if (!message) return null;
  const styles = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    error:   "bg-red-50 border-red-200 text-red-800",
    info:    "bg-blue-50 border-blue-200 text-blue-800",
  };
  return (
    <div
      onClick={onClose}
      className={`fixed bottom-6 right-6 z-[100] px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 border cursor-pointer max-w-sm
        animate-[slideUp_0.3s_ease-out] ${styles[message.type] ?? styles.info}`}
    >
      {message.type === "success" ? <FaCheck className="shrink-0" /> : <FaInfoCircle className="shrink-0" />}
      <span className="font-medium text-sm">{message.text}</span>
    </div>
  );
};

/* ─── CopyConfigModal ────────────────────────────────────────────────────── */
const CopyConfigModal = ({ sourceClass, schoolClasses, onClose, onSuccess, setMessage }) => {
  const [targetIds, setTargetIds]   = useState([]);
  const [overwrite, setOverwrite]   = useState(false);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);

  // Exclure la classe source des cibles
  const available = useMemo(
    () => schoolClasses.filter((sc) => sc.id !== sourceClass?.id),
    [schoolClasses, sourceClass]
  );

  // Grouper par niveau
  const byLevel = useMemo(() => {
    const map = {};
    available.forEach((sc) => {
      const lvl = sc.level?.name ?? "—";
      if (!map[lvl]) map[lvl] = [];
      map[lvl].push(sc);
    });
    return map;
  }, [available]);

  const toggle = (id) =>
    setTargetIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleLevel = (classes) => {
    const ids = classes.map((c) => c.id);
    const allIn = ids.every((id) => targetIds.includes(id));
    setTargetIds((prev) =>
      allIn ? prev.filter((x) => !ids.includes(x)) : [...new Set([...prev, ...ids])]
    );
  };

  const selectAll = () => setTargetIds(available.map((c) => c.id));
  const clearAll  = () => setTargetIds([]);

  const handleSubmit = async () => {
    if (!targetIds.length) {
      setMessage({ type: "error", text: "Sélectionnez au moins une classe cible." });
      return;
    }
    setLoading(true);
    try {
      const res = await postData("/academics/copy-class-config/", {
        source_class_id:  sourceClass.id,
        target_class_ids: targetIds,
        overwrite,
      });
      setResult(res);
    } catch (e) {
      setMessage({ type: "error", text: "Erreur lors de la copie." });
    } finally {
      setLoading(false);
    }
  };

  /* ── Résultat affiché après exécution ── */
  if (result) {
    const { summary, results } = result;
    return (
      <ModalShell onClose={() => { onSuccess(); onClose(); }} title="Rapport de copie">
        {/* Summary chips */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <Chip color="emerald" label={`${summary.total_created} créé(s)`} />
          {summary.total_skipped > 0 && <Chip color="amber" label={`${summary.total_skipped} ignoré(s)`} />}
          {summary.total_errors  > 0 && <Chip color="red"   label={`${summary.total_errors} erreur(s)`} />}
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
          {results.map((r) => (
            <div key={r.target_class_id}
              className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                r.errors.length ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
              }`}>
              <div className="flex items-center gap-2">
                {r.errors.length
                  ? <FaExclamationTriangle className="text-red-500 shrink-0" />
                  : <FaCheck className="text-emerald-500 shrink-0" />}
                <span className="font-medium text-slate-700">{r.target_class_name ?? `Classe #${r.target_class_id}`}</span>
              </div>
              <div className="flex gap-2 text-xs">
                {r.created   > 0 && <span className="text-emerald-600 font-semibold">+{r.created} matière(s)</span>}
                {r.skipped   > 0 && <span className="text-amber-600">{r.skipped} ignoré(s)</span>}
                {r.errors.length > 0 && <span className="text-red-600">{r.errors[0]}</span>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => { onSuccess(); onClose(); }}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            Fermer
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} title="Dupliquer la configuration">
      {/* Source */}
      <div className="mb-5 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><FaCopy /></div>
        <div>
          <p className="text-xs text-indigo-500 font-medium uppercase tracking-wide">Source</p>
          <p className="font-bold text-indigo-800">{sourceClass?.name}</p>
        </div>
        <FaArrowRight className="ml-auto text-indigo-300" />
      </div>

      {/* Select all / clear */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-700">Choisir les classes cibles</p>
        <div className="flex gap-2 text-xs">
          <button onClick={selectAll} className="text-indigo-600 hover:underline font-medium">Tout sélectionner</button>
          <span className="text-slate-300">|</span>
          <button onClick={clearAll}  className="text-slate-500 hover:underline">Effacer</button>
        </div>
      </div>

      {/* Classes par niveau */}
      <div className="max-h-64 overflow-y-auto space-y-4 pr-1 custom-scrollbar mb-5">
        {Object.entries(byLevel).map(([level, classes]) => {
          const allIn = classes.every((c) => targetIds.includes(c.id));
          const someIn = classes.some((c) => targetIds.includes(c.id));
          return (
            <div key={level}>
              {/* Level header */}
              <button
                onClick={() => toggleLevel(classes)}
                className="flex items-center gap-2 w-full text-left mb-2 group"
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${
                  allIn  ? "bg-indigo-600 border-indigo-600" :
                  someIn ? "bg-indigo-200 border-indigo-400" :
                  "border-slate-300 bg-white group-hover:border-indigo-400"
                }`}>
                  {allIn && <FaCheck size={9} className="text-white" />}
                  {!allIn && someIn && <div className="w-2 h-0.5 bg-indigo-600 rounded" />}
                </div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{level}</span>
                <span className="text-xs text-slate-400">({classes.length} classe{classes.length > 1 ? "s" : ""})</span>
              </button>

              {/* Classes */}
              <div className="grid grid-cols-2 gap-2 pl-6">
                {classes.map((sc) => {
                  const selected = targetIds.includes(sc.id);
                  return (
                    <button
                      key={sc.id}
                      onClick={() => toggle(sc.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm transition-all text-left ${
                        selected
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200"
                          : "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        selected ? "border-white bg-white/20" : "border-current opacity-40"
                      }`}>
                        {selected && <FaCheck size={8} className="text-white" />}
                      </div>
                      <span className="font-medium truncate">{sc.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Options */}
      <div className="border-t border-slate-100 pt-4 mb-5">
        <label className="flex items-start gap-3 cursor-pointer group">
          <button
            type="button"
            onClick={() => setOverwrite((v) => !v)}
            className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
              overwrite ? "bg-amber-500 border-amber-500" : "border-slate-300 bg-white group-hover:border-amber-400"
            }`}
          >
            {overwrite && <FaCheck size={10} className="text-white" />}
          </button>
          <div>
            <p className="text-sm font-semibold text-slate-700">Écraser la config existante</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Si coché, la configuration existante des classes cibles sera entièrement remplacée.
              Sinon, seules les matières manquantes seront ajoutées.
            </p>
          </div>
        </label>
        {overwrite && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-xs text-amber-700">
            <FaExclamationTriangle className="shrink-0 mt-0.5" />
            <span>La configuration actuelle des classes sélectionnées sera supprimée et remplacée.</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          {targetIds.length} classe{targetIds.length > 1 ? "s" : ""} sélectionnée{targetIds.length > 1 ? "s" : ""}
        </span>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors font-medium"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !targetIds.length}
            className={`px-6 py-2 text-sm font-bold rounded-xl transition-all flex items-center gap-2 ${
              loading || !targetIds.length
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95"
            }`}
          >
            {loading ? <FaSyncAlt className="animate-spin" /> : <FaCopy />}
            Copier la configuration
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

/* ─── Shared modal shell ─────────────────────────────────────────────────── */
const ModalShell = ({ children, onClose, title }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* Backdrop */}
    <div
      className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    />
    {/* Panel */}
    <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-[modalIn_0.25s_ease-out]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-800">{title}</h2>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <FaTimes size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  </div>
);

/* ─── Chip helper ────────────────────────────────────────────────────────── */
const Chip = ({ color, label }) => {
  const cls = {
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    amber:   "bg-amber-50 text-amber-700 border-amber-200",
    red:     "bg-red-50 text-red-700 border-red-200",
  }[color] ?? "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${cls}`}>
      {label}
    </span>
  );
};

/* ─── ClassSelector ──────────────────────────────────────────────────────── */
const ClassSelector = ({ value, onChange, schoolClasses, onCopy }) => {
  const [open, setOpen]   = useState(false);
  const ref               = useRef(null);

  // Fermer sur clic extérieur
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const byLevel = useMemo(() => {
    const map = {};
    schoolClasses.forEach((sc) => {
      const lvl = sc.level?.name ?? "—";
      if (!map[lvl]) map[lvl] = [];
      map[lvl].push(sc);
    });
    return map;
  }, [schoolClasses]);

  const selected = schoolClasses.find((sc) => String(sc.id) === String(value));

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all shadow-sm ${
          open
            ? "border-indigo-500 ring-2 ring-indigo-100 bg-white"
            : "border-slate-300 bg-slate-50 hover:border-indigo-300 hover:bg-white"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {selected ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
              <span className="text-slate-800 font-semibold truncate">{selected.name}</span>
              <span className="text-slate-400 text-xs shrink-0">{selected.level?.name}</span>
            </>
          ) : (
            <span className="text-slate-400">— Choisir une classe —</span>
          )}
        </div>
        <FaChevronDown
          size={12}
          className={`text-slate-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden animate-[dropIn_0.15s_ease-out]">
          {/* Clear option */}
          <button
            onClick={() => { onChange(""); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-sm text-slate-400 hover:bg-slate-50 border-b border-slate-100 italic"
          >
            — Aucune sélection —
          </button>

          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {Object.entries(byLevel).map(([level, classes]) => (
              <div key={level}>
                {/* Level header */}
                <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{level}</span>
                </div>
                {classes.map((sc) => {
                  const isSelected = String(sc.id) === String(value);
                  return (
                    <button
                      key={sc.id}
                      onClick={() => { onChange(String(sc.id)); setOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors ${
                        isSelected
                          ? "bg-indigo-600 text-white"
                          : "text-slate-700 hover:bg-indigo-50"
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? "bg-white" : "bg-slate-300"}`} />
                      <span className="font-medium">{sc.name}</span>
                      {isSelected && <FaCheck size={10} className="ml-auto" />}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Copy button — visible uniquement si une classe est sélectionnée */}
      {selected && onCopy && (
        <button
          type="button"
          onClick={onCopy}
          title="Dupliquer cette configuration vers d'autres classes"
          className="absolute -right-12 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:shadow-md transition-all shadow-sm"
        >
          <FaCopy size={14} />
        </button>
      )}
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════════════════════════════════════ */
export default function SubjectsAndClassSubjects() {
  /* State */
  const [subjects,       setSubjects]       = useState([]);
  const [subjectSearch,  setSubjectSearch]  = useState("");
  const [currentSubject, setCurrentSubject] = useState({ name: "" });
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [subjectsSaving,  setSubjectsSaving]  = useState(false);
  const [subjectsOpen,    setSubjectsOpen]    = useState(false);

  const [classSubjects,  setClassSubjects]  = useState([]);
  const [schoolClasses,  setSchoolClasses]  = useState([]);
  const [csLoading,      setCsLoading]      = useState(false);

  const [message,        setMessage]        = useState(null);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [filterClass,    setFilterClass]    = useState("");
  const [filterSubject,  setFilterSubject]  = useState("");

  const [selectedClass,     setSelectedClass]     = useState("");
  const [formData,          setFormData]           = useState({});
  const [savingAssignments, setSavingAssignments]  = useState(false);

  const [copyModalOpen, setCopyModalOpen] = useState(false);

  /* Fetchers */
  const fetchSubjects = useCallback(async () => {
    setSubjectsLoading(true);
    try { setSubjects(await fetchData("/academics/subjects/") || []); }
    catch { setMessage({ type: "error", text: "Impossible de charger les matières." }); }
    finally { setSubjectsLoading(false); }
  }, []);

  const fetchClassSubjects = useCallback(async () => {
    setCsLoading(true);
    try { setClassSubjects(await fetchData("/academics/class-subjects/") || []); }
    catch { setMessage({ type: "error", text: "Impossible de charger les attributions." }); }
    finally { setCsLoading(false); }
  }, []);

  const fetchSchoolClasses = useCallback(async () => {
    try { setSchoolClasses(Array.isArray(await fetchData("/academics/school-classes/")) ? await fetchData("/academics/school-classes/") : []); }
    catch {}
  }, []);

  const fetchAll = useCallback(async () => {
    setMessage(null);
    const [s, cs, sc] = await Promise.all([
      fetchData("/academics/subjects/").catch(() => []),
      fetchData("/academics/class-subjects/").catch(() => []),
      fetchData("/academics/school-classes/").catch(() => []),
    ]);
    setSubjects(s || []);
    setClassSubjects(cs || []);
    setSchoolClasses(Array.isArray(sc) ? sc : []);
    setSubjectsLoading(false);
    setCsLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [message]);

  /* Form data sync */
  useEffect(() => {
    if (!selectedClass) { setFormData({}); return; }
    const existing = classSubjects.filter(
      (cs) => cs.school_class && String(cs.school_class.id) === String(selectedClass)
    );
    const map = {};
    subjects.forEach((s) => {
      const found = existing.find((cs) => cs.subject && cs.subject.id === s.id);
      map[s.id] = {
        subject_id:     s.id,
        subject_name:   s.name,
        coefficient:    found ? found.coefficient    : 1,
        hours_per_week: found ? found.hours_per_week : (s.hours_per_week || 1),
        is_optional:    found ? Boolean(found.is_optional) : false,
        id:      found ? found.id : null,
        changed: false,
        isActive: !!found,
      };
    });
    setFormData(map);
  }, [selectedClass, subjects, classSubjects]);

  const setField = (subjectId, field, value) => {
    setFormData((prev) => {
      const next = { ...(prev || {}) };
      next[subjectId] = { ...(next[subjectId] || { subject_id: subjectId }), [field]: value, changed: true };
      return next;
    });
  };

  /* Subject CRUD */
  const submitSubject = async () => {
    if (!currentSubject.name?.trim()) { setMessage({ type: "error", text: "Le nom est requis." }); return; }
    setSubjectsSaving(true);
    try {
      if (currentSubject.id)
        await putData(`/academics/subjects/${currentSubject.id}/`, { name: currentSubject.name });
      else
        await postData("/academics/subjects/", { name: currentSubject.name });
      setMessage({ type: "success", text: currentSubject.id ? "Matière mise à jour." : "Matière ajoutée." });
      setCurrentSubject({ name: "" });
      await fetchSubjects();
    } catch { setMessage({ type: "error", text: "Erreur lors de l'enregistrement." }); }
    finally { setSubjectsSaving(false); }
  };

  const deleteSubjectHandler = async (id) => {
    if (!window.confirm("Supprimer cette matière et toutes ses attributions ?")) return;
    try {
      await deleteData(`/academics/subjects/${id}/`);
      setMessage({ type: "success", text: "Matière supprimée." });
      await fetchAll();
    } catch { setMessage({ type: "error", text: "Impossible de supprimer." }); }
  };

  /* Bulk save */
  const handleBulkSave = async (e) => {
    e?.preventDefault();
    if (!selectedClass) { setMessage({ type: "error", text: "Sélectionnez une classe." }); return; }
    setSavingAssignments(true);
    setMessage(null);
    const toCreate = [], toUpdate = [];
    Object.values(formData).forEach((d) => {
      const payload = {
        school_class_id: parseInt(selectedClass, 10),
        subject_id:      parseInt(d.subject_id, 10),
        coefficient:     Number(d.coefficient) || 1,
        hours_per_week:  Number(d.hours_per_week) || 1,
        is_optional:     Boolean(d.is_optional),
      };
      if (d.id) { if (d.changed) toUpdate.push({ id: d.id, payload }); }
      else if (payload.coefficient !== 1 || payload.hours_per_week !== 1 || payload.is_optional)
        toCreate.push(payload);
    });
    try {
      const promises = [
        ...toUpdate.map((u) => putData(`/academics/class-subjects/${u.id}/`, u.payload)),
        ...toCreate.map((c) => postData("/academics/class-subjects/", c)),
      ];
      if (!promises.length) { setMessage({ type: "info", text: "Aucune modification détectée." }); return; }
      await Promise.all(promises);
      setMessage({ type: "success", text: "Configuration enregistrée." });
      await fetchClassSubjects();
    } catch { setMessage({ type: "error", text: "Erreur lors de l'enregistrement." }); }
    finally { setSavingAssignments(false); }
  };

  const deleteClassSubjectHandler = async (id) => {
    if (!window.confirm("Supprimer cette attribution ?")) return;
    try {
      await deleteData(`/academics/class-subjects/${id}/`);
      setMessage({ type: "success", text: "Attribution retirée." });
      await fetchClassSubjects();
    } catch { setMessage({ type: "error", text: "Impossible de supprimer." }); }
  };

  /* Filters */
  const filteredSubjects = useMemo(() => {
    const t = subjectSearch.trim().toLowerCase();
    return subjects.filter((s) => s.name?.toLowerCase().includes(t));
  }, [subjects, subjectSearch]);

  const filteredClassSubjects = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    return classSubjects.filter((cs) => {
      if (!cs?.school_class?.name || !cs?.subject?.name) return false;
      if (filterClass   && String(filterClass)   !== String(cs.school_class.id)) return false;
      if (filterSubject && String(filterSubject) !== String(cs.subject.id))      return false;
      return !t || cs.school_class.name.toLowerCase().includes(t) || cs.subject.name.toLowerCase().includes(t);
    });
  }, [classSubjects, searchTerm, filterClass, filterSubject]);

  const selectedClassObj = schoolClasses.find((sc) => String(sc.id) === String(selectedClass));
  const pendingCount = Object.values(formData).filter((x) => x.changed).length;

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-24">

      {/* Sticky header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <FaLayerGroup size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Configuration Académique</h1>
                <p className="text-xs text-slate-500">Gérez les matières et leurs coefficients par classe</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchAll}
                className="inline-flex items-center px-3 py-2 border border-slate-200 text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-sm"
              >
                <FaSyncAlt className={`mr-2 ${subjectsLoading || csLoading ? "animate-spin" : ""}`} />
                Actualiser
              </button>
              <button
                onClick={() => { setCurrentSubject({ name: "" }); setSubjectsOpen(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-all"
              >
                <FaPlus className="mr-2" /> Nouvelle Matière
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        <Toast message={message} onClose={() => setMessage(null)} />

        {/* Copy Config Modal */}
        {copyModalOpen && (
          <CopyConfigModal
            sourceClass={selectedClassObj}
            schoolClasses={schoolClasses}
            onClose={() => setCopyModalOpen(false)}
            onSuccess={() => { fetchClassSubjects(); setMessage({ type: "success", text: "Configuration copiée avec succès." }); }}
            setMessage={setMessage}
          />
        )}

        {/* ── SECTION 1 : Matières ── */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div
            className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors select-none"
            onClick={() => setSubjectsOpen(!subjectsOpen)}
          >
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-800">Matières Générales</h2>
              <span className="bg-slate-100 text-slate-600 py-0.5 px-2.5 rounded-full text-xs font-semibold border border-slate-200">
                {subjects.length}
              </span>
            </div>
            <FaChevronDown size={13} className={`text-slate-400 transition-transform duration-300 ${subjectsOpen ? "rotate-180" : ""}`} />
          </div>

          <div className={`transition-all duration-500 ease-in-out ${subjectsOpen ? "max-h-[1500px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"}`}>
            <div className="p-6 border-t border-slate-100 bg-slate-50/50">

              {/* Toolbar */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                  <input
                    type="text" placeholder="Filtrer les matières..."
                    value={subjectSearch} onChange={(e) => setSubjectSearch(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  />
                </div>
                <div className="flex gap-2 flex-1 md:flex-none">
                  <input
                    type="text" placeholder="Nom de la matière"
                    value={currentSubject.name}
                    onChange={(e) => setCurrentSubject({ ...currentSubject, name: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && submitSubject()}
                    className="flex-1 min-w-[200px] px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 shadow-sm"
                  />
                  <button
                    onClick={submitSubject} disabled={subjectsSaving}
                    className={`px-4 py-2 rounded-lg text-white font-medium text-sm flex items-center gap-2 transition-all ${
                      subjectsSaving ? "bg-slate-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 active:scale-95 shadow-sm"
                    }`}
                  >
                    <FaCheck size={12} /> {currentSubject.id ? "Modifier" : "Ajouter"}
                  </button>
                  {currentSubject.id && (
                    <button onClick={() => setCurrentSubject({ name: "" })} className="px-3 py-2 bg-white border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 text-sm">
                      Annuler
                    </button>
                  )}
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {subjectsLoading && <div className="col-span-full text-center py-8 text-slate-400 text-sm">Chargement...</div>}
                {!subjectsLoading && filteredSubjects.map((s) => {
                  const p = palette(s.id);
                  return (
                    <div key={s.id}
                      className={`group relative bg-white rounded-xl border-2 ${p.card} p-4 shadow-sm hover:shadow-lg transition-all duration-200`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.dot}`} />
                          <h3 className="font-bold text-slate-800 text-sm truncate">{s.name}</h3>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                          <button onClick={() => setCurrentSubject(s)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                            <FaEdit size={13} />
                          </button>
                          <button onClick={() => deleteSubjectHandler(s.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                            <FaTrash size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {!subjectsLoading && filteredSubjects.length === 0 && (
                  <div className="col-span-full text-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
                    Aucune matière trouvée{subjectSearch ? ` pour "${subjectSearch}"` : ""}.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── SECTION 2 : Attributions ── */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* Sidebar */}
          <div className="xl:col-span-4">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-[600px]">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                <h3 className="font-bold text-slate-700 mb-4">Attributions Existantes</h3>
                <div className="space-y-3">
                  <div className="relative">
                    <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    <input
                      className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Rechercher..."
                      value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      className="text-sm border border-slate-300 rounded-lg py-2 px-2 bg-white focus:ring-indigo-500 focus:border-indigo-500"
                      value={filterClass} onChange={(e) => setFilterClass(e.target.value)}
                    >
                      <option value="">Toutes Classes</option>
                      {schoolClasses.map((sc) => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                    </select>
                    <select
                      className="text-sm border border-slate-300 rounded-lg py-2 px-2 bg-white focus:ring-indigo-500 focus:border-indigo-500"
                      value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
                    >
                      <option value="">Toutes Matières</option>
                      {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                {filteredClassSubjects.length === 0 ? (
                  <div className="text-center p-8 text-slate-400 text-sm">Aucun résultat.</div>
                ) : filteredClassSubjects.map((cs) => {
                  const p = palette(cs.subject?.id);
                  return (
                    <div key={cs.id}
                      className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
                          <p className="text-sm font-semibold text-slate-700 truncate">{cs.subject?.name}</p>
                        </div>
                        <p className="text-xs text-slate-400 truncate ml-4 mt-0.5">
                          {cs.school_class?.name} · Coef {cs.coefficient} · {cs.hours_per_week}h/sem
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setSelectedClass(String(cs.school_class.id)); window.scrollTo({ top: 300, behavior: "smooth" }); }}
                          className="p-1.5 bg-white border rounded-lg text-slate-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-colors"
                          title="Éditer"
                        ><FaEdit size={11} /></button>
                        <button
                          onClick={() => deleteClassSubjectHandler(cs.id)}
                          className="p-1.5 bg-white border rounded-lg text-slate-400 hover:text-red-500 hover:border-red-200 shadow-sm transition-colors"
                          title="Supprimer"
                        ><FaTrash size={11} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Éditeur principal */}
          <div className="xl:col-span-8">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">

              {/* Header éditeur */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-100">
                <div className="w-full">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sélectionner une classe à configurer
                  </label>
                  {/* Custom class selector — avec bouton copie intégré */}
                  <div className="relative pr-14">
                    <ClassSelector
                      value={selectedClass}
                      onChange={setSelectedClass}
                      schoolClasses={schoolClasses}
                      onCopy={selectedClass ? () => setCopyModalOpen(true) : null}
                    />
                  </div>
                  {selectedClass && (
                    <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                      <FaCopy size={10} className="text-indigo-400" />
                      Cliquez sur l'icône <FaCopy size={10} className="inline text-indigo-400" /> pour dupliquer cette configuration vers d'autres classes.
                    </p>
                  )}
                </div>
                {selectedClass && (
                  <div className="shrink-0">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      Mode Édition
                    </span>
                  </div>
                )}
              </div>

              {/* Empty state */}
              {!selectedClass && (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 text-slate-400 mb-4">
                    <FaLayerGroup size={28} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-700">Aucune classe sélectionnée</h3>
                  <p className="mt-1 text-slate-400 text-sm max-w-xs mx-auto">
                    Choisissez une classe dans le menu ci-dessus pour configurer ses matières.
                  </p>
                </div>
              )}

              {/* Editor grid */}
              {selectedClass && (
                <form onSubmit={handleBulkSave} className="animate-[fadeIn_0.3s_ease-out]">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {subjects.map((s) => {
                      const d = formData[s.id] || {};
                      const p = palette(s.id);
                      const isAssigned = !!d.id;
                      const isChanged  = d.changed;

                      return (
                        <div
                          key={s.id}
                          className={`relative rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                            isAssigned
                              ? "bg-white border-indigo-200 shadow-md"
                              : "bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-sm"
                          }`}
                        >
                          {isChanged && (
                            <div className="absolute top-0 right-0 w-0 h-0 border-t-[20px] border-r-[20px] border-t-transparent border-r-amber-400 z-10" />
                          )}

                          {/* Card header */}
                          <div className={`px-4 py-3 flex items-center justify-between border-b ${isAssigned ? "bg-indigo-50/40 border-indigo-100" : "border-slate-100"}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.dot}`} />
                              <span className="font-semibold text-sm text-slate-800 truncate">{s.name}</span>
                            </div>
                            {isAssigned && <FaCheck size={11} className="text-indigo-500 shrink-0" />}
                          </div>

                          {/* Card body */}
                          <div className="p-4 space-y-4">
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                                  <FaPercentage size={9} /> Coef.
                                </label>
                                <input
                                  type="number" min="1" max="20"
                                  value={d.coefficient ?? ""}
                                  onChange={(e) => setField(s.id, "coefficient", e.target.value)}
                                  className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1 flex items-center gap-1">
                                  <FaClock size={9} /> Heures/sem
                                </label>
                                <input
                                  type="number" min="0" max="40"
                                  value={d.hours_per_week ?? ""}
                                  onChange={(e) => setField(s.id, "hours_per_week", e.target.value)}
                                  className="w-full text-sm border border-slate-300 rounded-lg px-2 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 cursor-pointer group select-none">
                                <button
                                  type="button"
                                  onClick={() => setField(s.id, "is_optional", !d.is_optional)}
                                  className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                                    d.is_optional ? "bg-indigo-600 border-indigo-600" : "border-slate-300 bg-white group-hover:border-indigo-400"
                                  }`}
                                >
                                  {d.is_optional && <FaCheck size={9} className="text-white" />}
                                </button>
                                <span className="text-xs text-slate-500 group-hover:text-indigo-600 transition-colors">Facultatif</span>
                              </label>
                              {isAssigned && (
                                <button
                                  type="button"
                                  onClick={() => deleteClassSubjectHandler(d.id)}
                                  className="text-xs text-slate-300 hover:text-red-400 transition-colors p-1"
                                  title="Supprimer cette attribution"
                                >
                                  <FaEraser />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Sticky footer */}
                  <div className="sticky bottom-4 mt-8 bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex items-center justify-between z-20 border border-slate-700">
                    <div className="text-sm text-slate-400">
                      <span className="font-bold text-white">{pendingCount}</span> modification{pendingCount > 1 ? "s" : ""} en attente
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => { setCopyModalOpen(true); }}
                        className="px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-800 text-sm font-medium transition-colors flex items-center gap-2"
                        title="Dupliquer vers d'autres classes"
                      >
                        <FaCopy size={13} /> Dupliquer
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedClass("")}
                        className="px-4 py-2 rounded-lg border border-slate-600 hover:bg-slate-800 text-sm font-medium transition-colors"
                      >
                        Fermer
                      </button>
                      <button
                        type="submit" disabled={savingAssignments}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                          savingAssignments
                            ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                            : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 active:scale-95"
                        }`}
                      >
                        {savingAssignments ? <FaSyncAlt className="animate-spin" /> : <FaSave />}
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>

      </main>

      <style>{`
        @keyframes fadeIn   { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes slideUp  { from { opacity:0; transform:translateY(16px);} to { opacity:1; transform:none; } }
        @keyframes dropIn   { from { opacity:0; transform:translateY(-8px);} to { opacity:1; transform:none; } }
        @keyframes modalIn  { from { opacity:0; transform:scale(0.96);    } to { opacity:1; transform:none; } }
        .custom-scrollbar::-webkit-scrollbar       { width:5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background:transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background:#94a3b8; }
      `}</style>
    </div>
  );
}