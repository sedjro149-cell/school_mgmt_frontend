// src/pages/TimetableManagment.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaFilter,
  FaPrint,
  FaFilePdf,
  FaClock,
  FaMapMarkerAlt,
  FaBolt,
  FaDownload,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaUndo,
} from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { fetchData, postData, patchData, deleteData } from "./api";

/**
 * TimetableManagment.jsx
 * - Affichage classique (inspiré de ta Timetable.jsx)
 * - Génération / interprétation de rapport
 * - Vérification / résolution conflits
 * - Éditeur léger: holding pool + staging ops + validate/apply batch
 *
 * Endpoints utilisés (attendus) :
 * GET  /academics/timetable/
 * GET  /academics/school-classes/
 * GET  /academics/time-slots/    (ou /academics/time-slots/)
 * GET  /academics/slots/         (optionnel, pour editor)
 * POST /academics/generate-timetable/     { dry_run, persist }
 * GET  /academics/timetable-conflicts/
 * POST /academics/timetable-conflicts/    { dry_run, persist }
 * POST /academics/timetable-batch-validate/ { operations }
 * POST /academics/timetable-batch-apply/    { operations, persist }
 * PATCH/POST/DELETE /academics/timetable/
 */

const weekdays = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
];

const CLASS_COLORS = [
  { bg: "bg-slate-700", text: "text-white", swatch: "bg-slate-700" },
  { bg: "bg-emerald-700", text: "text-white", swatch: "bg-emerald-700" },
  { bg: "bg-indigo-700", text: "text-white", swatch: "bg-indigo-700" },
  { bg: "bg-rose-600", text: "text-white", swatch: "bg-rose-600" },
  { bg: "bg-yellow-500", text: "text-black", swatch: "bg-yellow-500" },
  { bg: "bg-cyan-700", text: "text-white", swatch: "bg-cyan-700" },
  { bg: "bg-purple-700", text: "text-white", swatch: "bg-purple-700" },
  { bg: "bg-fuchsia-600", text: "text-white", swatch: "bg-fuchsia-600" },
  { bg: "bg-orange-600", text: "text-white", swatch: "bg-orange-600" },
  { bg: "bg-sky-600", text: "text-white", swatch: "bg-sky-600" },
  { bg: "bg-lime-700", text: "text-black", swatch: "bg-lime-700" },
  { bg: "bg-amber-600", text: "text-black", swatch: "bg-amber-600" },
  { bg: "bg-teal-700", text: "text-white", swatch: "bg-teal-700" },
  { bg: "bg-violet-700", text: "text-white", swatch: "bg-violet-700" },
  { bg: "bg-pink-600", text: "text-white", swatch: "bg-pink-600" },
  { bg: "bg-stone-600", text: "text-white", swatch: "bg-stone-600" },
  { bg: "bg-zinc-700", text: "text-white", swatch: "bg-zinc-700" },
  { bg: "bg-blue-700", text: "text-white", swatch: "bg-blue-700" },
  { bg: "bg-green-700", text: "text-white", swatch: "bg-green-700" },
  { bg: "bg-red-600", text: "text-white", swatch: "bg-red-600" },
];

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export default function TimetableManagment() {
  // DATA
  const [entries, setEntries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [slots, setSlots] = useState([]); // optional endpoint for editor (slot_idx)

  // UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClasses, setSelectedClasses] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const pdfRef = useRef(null);

  // generation & conflicts
  const [dryRunGen, setDryRunGen] = useState(true);
  const [persistGen, setPersistGen] = useState(false);
  const [runningGen, setRunningGen] = useState(false);
  const [report, setReport] = useState(null);
  const [conflicts, setConflicts] = useState(null);

  // editor: grid by slot_idx, holding pool, staged ops
  const [editorOpen, setEditorOpen] = useState(false);
  const [grid, setGrid] = useState({}); // slot_idx -> entry
  const [holding, setHolding] = useState([]); // { entry, origin }
  const [stagedOps, setStagedOps] = useState([]);
  const [validateReport, setValidateReport] = useState(null);

  // modal / form
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(null);

  // inspector
  const [inspectedEntry, setInspectedEntry] = useState(null);

  // FETCH ALL
  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      // call multiple endpoints in parallel; tolerate missing endpoints
      const [
        entriesResp,
        classesResp,
        timeSlotsResp,
        slotsResp,
      ] = await Promise.allSettled([
        fetchData("/academics/timetable/"),
        fetchData("/academics/school-classes/"),
        fetchData("/academics/time-slots/"), // classical time slots
        fetchData("/academics/slots/"), // editor slot mapping (optional)
      ]);

      const entriesArr = (entriesResp.status === "fulfilled" ? entriesResp.value : []) || [];
      const classesArr = (classesResp.status === "fulfilled" ? classesResp.value : []) || [];
      const timeSlotsArr = (timeSlotsResp.status === "fulfilled" ? timeSlotsResp.value : []) || [];
      const slotsArr = (slotsResp.status === "fulfilled" ? slotsResp.value : []) || [];

      // normalize arrays (DRF may return {results: [...]})
      const normalize = (v) => (Array.isArray(v) ? v : v?.results ?? []);
      const entriesList = normalize(entriesArr);
      const classesList = normalize(classesArr);
      const tSlots = normalize(timeSlotsArr).slice().sort((a,b)=> (a.day - b.day) || String(a.start_time).localeCompare(b.start_time));
      const sSlots = normalize(slotsArr);

      setEntries(entriesList);
      setClasses(classesList);
      setTimeSlots(tSlots);
      setSlots(sSlots);

      // build editor grid + holding using slot_idx when present
      const g = {};
      const hold = [];
      for (const e of entriesList) {
        if (e.slot_idx !== undefined && e.slot_idx !== null) g[e.slot_idx] = e;
        else hold.push({ entry: e, origin: null });
      }
      setGrid(g);
      setHolding(hold);
    } catch (err) {
      console.error("fetchAll", err);
      setError("Erreur lors du chargement des données. Vérifie l'API / token.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // DERIVED: labels/time slots for grid rendering
  const timeLabels = useMemo(() => {
    const map = new Map();
    timeSlots.forEach(s => {
      const label = `${s.start_time} - ${s.end_time}`;
      if (!map.has(label)) map.set(label, { start: s.start_time });
    });
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, start: v.start }))
      .sort((a,b) => timeToMinutes(a.start) - timeToMinutes(b.start))
      .map(x => x.label);
  }, [timeSlots]);

  // DISPLAYED ENTRIES (apply filters and selected classes)
  const displayedEntries = useMemo(() => {
    const isFilterActive = !!(searchText || filterTeacher || filterDay);
    const selected = selectedClasses.length ? selectedClasses : (isFilterActive ? classes.map(c => c.id) : []);
    return entries.filter(e => {
      if (selected.length && !selected.includes(e.school_class)) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const any = `${e.subject_name || e.subject || ""} ${e.teacher_name || e.teacher || ""} ${e.school_class_name || ""}`;
        if (!any.toLowerCase().includes(q)) return false;
      }
      if (filterTeacher && String(e.teacher_name || e.teacher) !== String(filterTeacher)) return false;
      if (filterDay && String(e.weekday) !== String(filterDay)) return false;
      return true;
    });
  }, [entries, selectedClasses, searchText, filterTeacher, filterDay, classes]);

  // GRID BY DAY x TIMELABEL used for classic view
  const gridByDay = useMemo(() => {
    const g = {};
    weekdays.forEach(d => { g[d.value] = {}; timeLabels.forEach(t => (g[d.value][t] = [])); });
    displayedEntries.forEach(e => {
      const timeLabel = `${e.starts_at} - ${e.ends_at}`;
      if (!g[e.weekday]) g[e.weekday] = {};
      if (!g[e.weekday][timeLabel]) g[e.weekday][timeLabel] = [];
      g[e.weekday][timeLabel].push(e);
    });
    return g;
  }, [displayedEntries, timeLabels]);

  // COLOR MAPS
  const classColorMap = useMemo(() => {
    const map = {};
    classes.forEach((c, idx) => { map[c.id] = CLASS_COLORS[idx % CLASS_COLORS.length]; });
    return map;
  }, [classes]);

  const visibleClassIds = useMemo(() => {
    const present = new Set();
    displayedEntries.forEach(e => present.add(e.school_class));
    const order = selectedClasses.length ? selectedClasses : classes.map(c => c.id);
    const result = order.filter(id => present.has(id));
    Array.from(present).forEach(id => { if (!result.includes(id)) result.push(id); });
    return result;
  }, [displayedEntries, selectedClasses, classes]);

  const visibleColorMap = useMemo(() => {
    const map = {}; const used = new Set();
    visibleClassIds.forEach((id, idx) => {
      const pref = classColorMap[id];
      if (pref && !used.has(pref.swatch)) { map[id] = pref; used.add(pref.swatch); }
      else { const found = CLASS_COLORS.find(c => !used.has(c.swatch)); if (found) { map[id]=found; used.add(found.swatch); } else map[id]=classColorMap[id]||CLASS_COLORS[idx%CLASS_COLORS.length]; }
    });
    return map;
  }, [visibleClassIds, classColorMap]);

  // HELPERS: modal/form
  const openModal = (entry = null) => {
    if (entry) {
      setForm({
        id: entry.id,
        school_class: entry.school_class,
        subject: entry.subject,
        teacher: entry.teacher || entry.teacher_id || "",
        weekday: entry.weekday,
        starts_at: entry.starts_at,
        ends_at: entry.ends_at,
        room: entry.room || "",
        notes: entry.notes || ""
      });
    } else {
      setForm({ id: null, school_class: "", subject: "", teacher: "", weekday: "", starts_at: "", ends_at: "", room: "", notes: "" });
    }
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setForm(null); };

  const submitForm = async () => {
    if (!form) return;
    const payload = {
      school_class: form.school_class,
      subject: form.subject,
      teacher: form.teacher || null,
      weekday: form.weekday,
      starts_at: form.starts_at,
      ends_at: form.ends_at,
      room: form.room,
      notes: form.notes,
    };
    try {
      if (form.id) await patchData(`/academics/timetable/${form.id}/`, payload);
      else await postData(`/academics/timetable/`, payload);
      await fetchAll();
      closeModal();
    } catch (err) {
      console.error("submitForm", err);
      alert("Erreur lors de l'enregistrement");
    }
  };

  const deleteEntry = async (id) => {
    if (!confirm("Supprimer cette entrée ?")) return;
    try {
      await deleteData(`/academics/timetable/${id}/`);
      await fetchAll();
    } catch (err) {
      console.error("deleteEntry", err);
      alert("Erreur lors de la suppression");
    }
  };

  // EXPORT PDF / PRINT / JSON
  const exportPDF = async () => {
    if (!pdfRef.current) return;
    const element = pdfRef.current;
    const originalBg = element.style.backgroundColor;
    element.style.backgroundColor = "#ffffff";
    const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgProps = pdf.getImageProperties(imgData);
    const imgRatio = imgProps.width / imgProps.height;
    const imgWidth = pageWidth - 20;
    const imgHeight = imgWidth / imgRatio;
    pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);
    if (imgHeight > pageHeight - 20) {
      let remaining = imgHeight - (pageHeight - 20);
      let offset = pageHeight - 20;
      while (remaining > 0) {
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, -offset + 10, imgWidth, imgHeight);
        offset += pageHeight - 20;
        remaining -= pageHeight - 20;
      }
    }
    pdf.save("emplois_du_temps.pdf");
    element.style.backgroundColor = originalBg;
  };
  const handlePrint = () => window.print();
  const downloadJSON = (obj, filename = `timetable_${new Date().toISOString()}.json`) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj || {}, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // GENERATION / CONFLICTS
  const handleRunGeneration = async () => {
    setRunningGen(true);
    setReport(null);
    setError("");
    try {
      const payload = { dry_run: !!dryRunGen, persist: !!persistGen };
      const res = await postData("/academics/generate-timetable/", payload);
      setReport(res);
      // refresh if DB may have changed
      if (persistGen || dryRunGen === false) await fetchAll();
    } catch (err) {
      console.error("handleRunGeneration", err);
      setReport({ error: String(err) });
    } finally {
      setRunningGen(false);
    }
  };

  const fetchConflicts = async () => {
    try {
      const r = await fetchData("/academics/timetable-conflicts/");
      setConflicts(r);
    } catch (err) {
      console.error("fetchConflicts", err);
      setConflicts(null);
    }
  };

  const handleResolveConflicts = async ({ dry_run = true, persist = false } = {}) => {
    try {
      const r = await postData("/academics/timetable-conflicts/", { dry_run, persist });
      setReport(prev => ({ ...(prev || {}), conflict_resolution: r }));
      await fetchConflicts();
      if (persist) await fetchAll();
    } catch (err) {
      console.error("handleResolveConflicts", err);
      alert("Erreur lors de la résolution automatique (voir console).");
    }
  };

  // EDITOR: helpers for staging ops
  const findSlotOfEntry = (entryId) => {
    for (const k of Object.keys(grid)) {
      const e = grid[k];
      if (e && e.id === entryId) return Number(k);
    }
    return null;
  };

  const suspendEntry = (entryId) => {
    const from = findSlotOfEntry(entryId);
    if (from === null) return;
    setGrid(prev => {
      const next = { ...prev };
      const e = next[from];
      if (e) {
        delete next[from];
        setHolding(h => [...h, { entry: e, origin: { slot_idx: from, label: `slot ${from}` } }]);
      }
      return next;
    });
    setStagedOps(ops => {
      const others = ops.filter(o => o.entry_id !== entryId);
      return [...others, { entry_id: entryId, from_slot_idx: from, action: "suspend" }];
    });
  };

  const placeFromHolding = (entryId, slotIdx) => {
    const card = holding.find(h => h.entry.id === entryId);
    if (!card) return;
    setHolding(prev => prev.filter(h => h.entry.id !== entryId));
    setGrid(prev => {
      const next = { ...prev };
      if (next[slotIdx]) {
        setHolding(h => [...h, { entry: next[slotIdx], origin: { slot_idx: slotIdx, label: `slot ${slotIdx}` } }]);
      }
      next[slotIdx] = { ...card.entry, slot_idx: slotIdx };
      return next;
    });
    setStagedOps(ops => {
      const others = ops.filter(o => o.entry_id !== entryId);
      return [...others, { entry_id: entryId, from_slot_idx: card.origin?.slot_idx ?? null, to_slot_idx: slotIdx, action: "move_from_hold" }];
    });
  };

  const stageMove = (entryId, fromSlot, toSlot) => {
    setStagedOps(ops => {
      const without = ops.filter(o => o.entry_id !== entryId);
      const op = { entry_id: entryId, from_slot_idx: fromSlot ?? null, to_slot_idx: toSlot ?? null, action: "move" };
      return [...without, op];
    });
  };

  const validateBatch = async () => {
    setValidateReport(null);
    try {
      const res = await postData("/academics/timetable-batch-validate/", { operations: stagedOps });
      setValidateReport(res);
    } catch (err) {
      console.error("validateBatch", err);
      setValidateReport({ error: String(err) });
    }
  };

  const applyBatch = async (persist = false) => {
    setValidateReport(null);
    try {
      const res = await postData("/academics/timetable-batch-apply/", { operations: stagedOps, persist: !!persist });
      setValidateReport(res);
      if (persist && !res?.error) {
        await fetchAll();
        setStagedOps([]);
      }
    } catch (err) {
      console.error("applyBatch", err);
      setValidateReport({ error: String(err) });
    }
  };

  // small helpers
  const teachers = useMemo(() => {
    const s = new Set();
    entries.forEach(e => { if (e.teacher_name) s.add(e.teacher_name); else if (e.teacher) s.add(e.teacher); });
    return Array.from(s);
  }, [entries]);

  const handleClassToggle = (id) => {
    setSelectedClasses(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= 3) return [...prev.slice(0, 2), id];
      return [...prev, id];
    });
  };

  const renderCell = (day, timeLabel) => {
    const cellEntries = (gridByDay[day] && gridByDay[day][timeLabel]) ? gridByDay[day][timeLabel] : [];
    if (!cellEntries.length) return <div className="text-xs text-gray-400 italic">—</div>;

    const grouped = {};
    cellEntries.forEach(e => {
      grouped[e.school_class] = grouped[e.school_class] || [];
      grouped[e.school_class].push(e);
    });

    const baseOrder = selectedClasses.length ? selectedClasses : classes.map(c => c.id);
    const displayOrder = baseOrder.filter(id => grouped[id]).concat(Object.keys(grouped).map(k => parseInt(k, 10)).filter(id => !baseOrder.includes(id)));
    const sideBySide = displayOrder.length <= 3;

    return (
      <div className={`${sideBySide ? "flex flex-nowrap gap-2" : "flex flex-col gap-2"}`}>
        {displayOrder.map((clsId, idx) => {
          const arr = grouped[clsId] || [];
          const e = arr[0];
          const color = (visibleColorMap && visibleColorMap[clsId]) || classColorMap[clsId] || CLASS_COLORS[idx % CLASS_COLORS.length];
          return (
            <div key={`${clsId}-${idx}`} className={`${sideBySide ? "flex-1 min-w-0" : ""} rounded border p-2 bg-white hover:shadow-sm transition`} style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 64 }}>
              <div>
                <div className={`px-2 py-1 rounded text-sm font-semibold ${color.bg} ${color.text} truncate`}>{e.subject_name || e.subject || "—"}</div>
                <div className="text-[12px] text-gray-600 mt-1 truncate"><strong>{e.teacher_name || e.teacher || "—"}</strong></div>
                <div className="text-[11px] text-gray-500 mt-1 truncate flex items-center gap-2"><FaClock className="text-[10px]" /> {e.starts_at} — {e.ends_at}</div>
                {e.room && <div className="text-[11px] text-gray-700 mt-1 truncate flex items-center gap-2"><FaMapMarkerAlt className="text-[10px]" /> {e.room}</div>}
                {arr.length > 1 && <div className="text-xs text-gray-400 mt-1">+{arr.length - 1} autre(s)</div>}
              </div>

              <div className="mt-2 flex gap-2 justify-end">
                <button onClick={() => openModal(e)} className="text-sm px-2 py-1 border rounded hover:bg-gray-50"><FaEdit /></button>
                <button onClick={() => deleteEntry(e.id)} className="text-sm px-2 py-1 border rounded hover:bg-red-50 text-red-600"><FaTrash /></button>
                <button onClick={() => { suspendEntry(e.id); }} className="text-sm px-2 py-1 border rounded text-xs">Suspendre</button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // column sizing logic
  const initialSingleDayWidth = 140;
  const visibleCount = Math.max(1, (selectedClasses.length ? selectedClasses.length : 1));
  const clampedCount = Math.min(Math.max(visibleCount, 1), 3);
  const dayColWidth = initialSingleDayWidth * clampedCount;
  const gridCols = `160px repeat(${weekdays.length}, ${dayColWidth}px)`;
  const containerMinWidth = 160 + weekdays.length * dayColWidth;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Emplois du temps — Administration</h1>
          <p className="text-sm text-gray-600 mt-1">Affichage classique + génération + éditeur visuel</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => downloadJSON({ entries, classes, timeSlots }, `timetable_export_${new Date().toISOString()}.json`)} className="px-3 py-2 rounded-full bg-rose-600 text-white flex items-center gap-2"><FaFilePdf /> Export JSON</button>
          <button onClick={handlePrint} className="px-3 py-2 rounded-full bg-white border"><FaPrint /> Imprimer</button>
          <button onClick={() => openModal(null)} className="ml-2 bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2 rounded-full flex items-center gap-2"><FaPlus /> Ajouter</button>
        </div>
      </div>

      {/* controls: generation + editor toggle */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2"><input type="checkbox" checked={dryRunGen} onChange={() => setDryRunGen(v => !v)} className="w-4 h-4" /> <span className="text-sm text-gray-600">Dry-run</span></label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={persistGen} onChange={() => setPersistGen(v => !v)} className="w-4 h-4" /> <span className="text-sm text-gray-600">Persister</span></label>
          <button onClick={handleRunGeneration} disabled={runningGen} className={`px-3 py-2 rounded bg-gradient-to-r from-green-500 to-emerald-600 text-white`}>{runningGen ? 'Génération...' : (<><FaBolt /> <span className="ml-2">Lancer génération</span></>)}</button>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => { fetchConflicts(); }} className="px-3 py-2 rounded bg-yellow-100">Vérifier conflits</button>
          <button onClick={() => { handleResolveConflicts({ dry_run: true, persist: false }); }} className="px-3 py-2 rounded bg-yellow-400 text-white">Proposer résolutions (dry)</button>
          <button onClick={() => { if (!confirm('Appliquer résolutions ?')) return; handleResolveConflicts({ dry_run: false, persist: true }); }} className="px-3 py-2 rounded bg-red-600 text-white">Appliquer (admin)</button>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button onClick={() => setEditorOpen(v => !v)} className="px-3 py-2 rounded bg-white border">{editorOpen ? 'Fermer éditeur' : 'Ouvrir éditeur'}</button>
          <button onClick={() => { if (report) downloadJSON(report, 'generate_report.json'); else alert('Aucun rapport'); }} className="px-3 py-2 rounded bg-blue-600 text-white"><FaDownload /> Télécharger rapport</button>
        </div>
      </div>

      {/* filters and class selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-sm font-medium">Sélection classes (max 3)</div>
            <div className="flex gap-2 flex-wrap">
              {classes.map(c => (
                <button key={c.id} onClick={() => handleClassToggle(c.id)} className={`px-3 py-1 rounded-full border ${selectedClasses.includes(c.id) ? 'bg-slate-800 text-white' : 'bg-white text-gray-700'}`}>{c.name}</button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="text" placeholder="Recherche matière / prof / classe" value={searchText} onChange={(e) => setSearchText(e.target.value)} className="border rounded p-2" />
            <button onClick={() => setFiltersOpen(prev => !prev)} className="px-3 py-2 rounded bg-white border"><FaFilter /></button>
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={filterTeacher} onChange={(e) => setFilterTeacher(e.target.value)} className="border p-2 rounded"><option value="">Tous les enseignants</option>{teachers.map(t => <option key={t} value={t}>{t}</option>)}</select>
            <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)} className="border p-2 rounded"><option value="">Tous les jours</option>{weekdays.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select>
          </div>
        )}
      </div>

      {/* main grid */}
      <div ref={pdfRef} className="bg-white rounded-lg shadow p-4 overflow-auto">
        {loading ? <div className="text-gray-500">Chargement...</div> : error ? <div className="text-red-500">{error}</div> : (
          <div style={{ minWidth: containerMinWidth }}>
            <div className="grid gap-0 border-b border-gray-200 sticky top-0 bg-white z-10" style={{ gridTemplateColumns: gridCols }}>
              <div className="p-2 text-sm font-medium">Heure</div>
              {weekdays.map(d => <div key={d.value} className="p-2 text-center text-sm font-medium border-l border-gray-200">{d.label}</div>)}
            </div>

            <div>
              {timeLabels.map((tl, idx) => {
                const [start] = tl.split(" - ").map(s => s.trim());
                const startMinutes = timeToMinutes(start);
                const period = startMinutes < 12 * 60 ? "Matinée" : startMinutes < 17 * 60 ? "Après-midi" : "Soirée";
                const rowBg = idx % 2 === 0 ? "bg-white" : "bg-gray-50";
                return (
                  <div key={tl} className={`${rowBg} grid border-b border-gray-100`} style={{ gridTemplateColumns: gridCols }}>
                    <div className="p-2 bg-gray-50"><div className="text-sm font-medium">{tl}</div><div className="text-xs text-gray-500 mt-1">{period}</div></div>
                    {weekdays.map(d => <div key={`${d.value}-${idx}`} className="p-2 border-l border-gray-100">{renderCell(d.value, tl)}</div>)}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* legend */}
      <div className="mt-4 bg-white p-3 rounded-lg shadow flex flex-wrap items-center gap-4">
        <div className="text-sm font-medium">Légende :</div>
        {visibleClassIds.length === 0 && <div className="text-sm text-gray-500">Aucune classe affichée</div>}
        {visibleClassIds.map((id, idx) => {
          const cls = classes.find(c => c.id === id);
          const color = (visibleColorMap && visibleColorMap[id]) || classColorMap[id] || CLASS_COLORS[idx % CLASS_COLORS.length];
          return (
            <div key={id} className="flex items-center gap-2 text-sm">
              <span className={`inline-block w-6 h-4 rounded ${color.swatch} border`}></span>
              <span>{cls?.name || `Classe ${id}`}</span>
            </div>
          );
        })}
      </div>

      {/* editor panel */}
      {editorOpen && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Éditeur visuel — Holding & staging</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="grid grid-cols-4 gap-3">
                {slots.length === 0 && <div className="col-span-4 text-sm text-gray-500">Aucun endpoint /academics/slots/ — l'éditeur utilise slot_idx si présent.</div>}
                {slots.map(slot => {
                  const occupant = grid[slot.idx];
                  return (
                    <div key={slot.idx} className="border rounded p-2 min-h-[90px] bg-gray-50">
                      <div className="text-xs text-gray-600 mb-2">{slot.label ?? `J${slot.day} ${slot.start_time}-${slot.end_time}`}</div>
                      {occupant ? (
                        <div className={`p-2 rounded border-l-4 ${CLASS_COLORS[(occupant.school_class || 0) % CLASS_COLORS.length]?.bg || 'bg-slate-200'}`}>
                          <div className="font-medium text-sm truncate">{occupant.subject_name || occupant.subject}</div>
                          <div className="text-xs text-gray-600">{occupant.teacher_name || occupant.teacher}</div>
                        </div>
                      ) : <div className="text-xs text-gray-400">Vide — drop ici</div>}

                      <div className="mt-2 flex gap-2">
                        {occupant && <button onClick={() => suspendEntry(occupant.id)} className="text-xs px-2 py-1 border rounded">Suspendre</button>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <aside className="w-96 space-y-4">
              <div className="bg-white p-3 rounded border">
                <div className="font-semibold mb-2">Holding ({holding.length})</div>
                {holding.length === 0 ? <div className="text-sm text-gray-500">Aucune entrée suspendue</div> : (
                  <div className="space-y-2 max-h-48 overflow-auto">
                    {holding.map(hc => (
                      <div key={hc.entry.id} className={`p-2 rounded border ${CLASS_COLORS[(hc.entry.school_class || 0) % CLASS_COLORS.length]?.bg || 'bg-slate-200'} flex justify-between`}>
                        <div>
                          <div className="font-medium text-sm truncate">{hc.entry.subject_name || hc.entry.subject}</div>
                          <div className="text-xs text-gray-600">{hc.entry.teacher_name || hc.entry.teacher}</div>
                          <div className="text-xs text-gray-500">orig: {hc.origin?.label || 'inconnu'}</div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => {
                            const free = slots.find(s => !grid[s.idx]);
                            if (free) placeFromHolding(hc.entry.id, free.idx);
                            else alert("Aucun slot libre détecté — drop manuellement sur une case.");
                          }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Poser</button>
                          <button onClick={() => { setHolding(prev => prev.filter(h => h.entry.id !== hc.entry.id)); setStagedOps(prev => prev.filter(o => o.entry_id !== hc.entry.id)); }} className="px-2 py-1 border rounded text-xs">Retirer</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-3 rounded border">
                <div className="font-semibold">Opérations en attente ({stagedOps.length})</div>
                <pre className="text-xs max-h-32 overflow-auto bg-gray-50 p-2 rounded">{JSON.stringify(stagedOps, null, 2)}</pre>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button onClick={validateBatch} disabled={stagedOps.length === 0} className="px-2 py-2 rounded bg-yellow-400 text-white text-sm">Valider (dry)</button>
                  <button onClick={() => applyBatch(false)} disabled={stagedOps.length === 0} className="px-2 py-2 rounded bg-blue-600 text-white text-sm">Simuler apply</button>
                  <button onClick={() => { if (!confirm('Appliquer en base ?')) return; applyBatch(true); }} disabled={stagedOps.length === 0} className="col-span-2 px-2 py-2 rounded bg-red-600 text-white text-sm">Appliquer (persist)</button>
                  <button onClick={() => { setStagedOps([]); }} className="px-2 py-2 rounded border text-sm">Clear</button>
                  <button onClick={() => { setStagedOps(prev => prev.slice(0, -1)); }} className="px-2 py-2 rounded border text-sm">Undo</button>
                </div>
                {validateReport && <div className="mt-2 text-xs"><pre className="max-h-40 overflow-auto bg-gray-50 p-2 rounded">{JSON.stringify(validateReport, null, 2)}</pre></div>}
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* modal form */}
      {showModal && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-2xl p-6 w-[720px] max-w-full">
            <h2 className="text-xl font-bold mb-4">{form.id ? "Modifier une entrée" : "Ajouter une entrée"}</h2>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.school_class} onChange={(e) => setForm({ ...form, school_class: e.target.value })} className="border p-2 rounded"><option value="">Choisir une classe</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
              <input placeholder="Matière (id ou nom)" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="border p-2 rounded" />
              <input placeholder="Prof (id ou nom)" value={form.teacher} onChange={(e) => setForm({ ...form, teacher: e.target.value })} className="border p-2 rounded" />
              <select value={form.weekday} onChange={(e) => setForm({ ...form, weekday: parseInt(e.target.value || "", 10) })} className="border p-2 rounded"><option value="">Jour</option>{weekdays.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}</select>
              <select value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} className="border p-2 rounded"><option value="">Début</option>{timeSlots.map(ts => <option key={ts.id} value={ts.start_time}>{ts.start_time}</option>)}</select>
              <select value={form.ends_at} onChange={(e) => setForm({ ...form, ends_at: e.target.value })} className="border p-2 rounded"><option value="">Fin</option>{timeSlots.map(ts => <option key={ts.id} value={ts.end_time}>{ts.end_time}</option>)}</select>
              <input placeholder="Salle" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} className="border p-2 rounded col-span-2" />
              <input placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="border p-2 rounded col-span-2" />
            </div>

            <div className="mt-4 flex justify-end gap-2"><button onClick={closeModal} className="px-4 py-2 rounded bg-gray-200">Annuler</button><button onClick={submitForm} className="px-4 py-2 rounded bg-gradient-to-r from-green-500 to-teal-500 text-white">{form.id ? "Modifier" : "Ajouter"}</button></div>
          </div>
        </div>
      )}

      {/* report viewer */}
      {report && (
        <div className="mt-6 bg-white rounded p-3 shadow">
          <div className="flex items-center justify-between"><div className="font-semibold">📋 Rapport de génération</div><div className="text-xs text-gray-500">Téléchargeable</div></div>
          <div className="mt-3 text-xs"><pre className="max-h-48 overflow-auto bg-gray-50 p-2 rounded">{JSON.stringify(report, null, 2)}</pre></div>
        </div>
      )}

      {error && <div className="mt-4 p-3 rounded bg-red-100 text-red-800">{error}</div>}
    </div>
  );
}
