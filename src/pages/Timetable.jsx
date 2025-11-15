// Timetable.jsx (converted to use src/api.js)
import React, { useEffect, useMemo, useState, useRef } from "react";
import { FaEdit, FaTrash, FaPlus, FaFilter, FaPrint, FaFilePdf, FaClock, FaMapMarkerAlt } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { fetchData, postData, patchData, deleteData } from "./api";

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
  return h * 60 + (m || 0);
}

export default function Timetable() {
  // data
  const [entries, setEntries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  // ui
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClasses, setSelectedClasses] = useState([]); // keep order of selection
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterDay, setFilterDay] = useState("");
  const pdfRef = useRef(null);

  // fetch
  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [entriesData, classesData, slotsData] = await Promise.all([
        fetchData("/academics/timetable/"),
        fetchData("/academics/school-classes/"),
        fetchData("/academics/time-slots/"),
      ]);
      const entriesArr = entriesData || [];
      const classesArr = classesData || [];
      const slotsArr = (slotsData || []).slice().sort((a,b) => (a.day - b.day) || (String(a.start_time).localeCompare(String(b.start_time))));
      setEntries(entriesArr);
      setClasses(classesArr);
      setTimeSlots(slotsArr);

      // keep previous selection only if still present
      setSelectedClasses(prev => prev.filter(id => classesArr.some(c => c.id === id)));
    } catch (err) {
      console.error("fetchAll", err);
      setError("Erreur lors du chargement des données. Vérifie l'API / token.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, []);

  // derived labels
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

  // displayedEntries apply selectedClasses + filters (search, teacher, subject, room, day)
  const displayedEntries = useMemo(() => {
    const isFilterActive = !!(searchText || filterTeacher || filterSubject || filterRoom || filterDay);
    const selected = selectedClasses.length ? selectedClasses : (isFilterActive ? classes.map(c => c.id) : []);
    return entries.filter(e => {
      if (!selected.includes(e.school_class)) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const any = `${e.subject_name || e.subject || ""} ${e.teacher_name || e.teacher || ""} ${e.school_class_name || ""}`;
        if (!any.toLowerCase().includes(q)) return false;
      }
      if (filterTeacher && String(e.teacher_name || e.teacher) !== String(filterTeacher)) return false;
      if (filterSubject && String(e.subject_name || e.subject) !== String(filterSubject)) return false;
      if (filterRoom && String(e.room || "") !== String(filterRoom)) return false;
      if (filterDay && String(e.weekday) !== String(filterDay)) return false;
      return true;
    });
  }, [entries, selectedClasses, searchText, filterTeacher, filterSubject, filterRoom, filterDay, classes]);

  // Grid: day x timeLabel -> array of entries
  const grid = useMemo(() => {
    const g = {};
    weekdays.forEach(d => {
      g[d.value] = {};
      timeLabels.forEach(t => (g[d.value][t] = []));
    });
    displayedEntries.forEach(e => {
      const timeLabel = `${e.starts_at} - ${e.ends_at}`;
      if (!g[e.weekday]) g[e.weekday] = {};
      if (!g[e.weekday][timeLabel]) g[e.weekday][timeLabel] = [];
      g[e.weekday][timeLabel].push(e);
    });
    return g;
  }, [displayedEntries, timeLabels]);

  // === STABLE CLASS COLOR MAP ===
  const classColorMap = useMemo(() => {
    const map = {};
    classes.forEach((c, idx) => {
      const color = CLASS_COLORS[idx % CLASS_COLORS.length];
      map[c.id] = color;
    });
    return map;
  }, [classes]);

  // visibleClassIds: classes that actually appear in displayedEntries (keeps order: selectedClasses first)
  const visibleClassIds = useMemo(() => {
    const present = new Set();
    displayedEntries.forEach(e => present.add(e.school_class));
    const order = selectedClasses.length ? selectedClasses : classes.map(c => c.id);
    const result = order.filter(id => present.has(id));
    Array.from(present).forEach(id => { if (!result.includes(id)) result.push(id); });
    return result;
  }, [displayedEntries, selectedClasses, classes]);

  // === VISIBLE COLOR MAP (NEW) ===
  const visibleColorMap = useMemo(() => {
    const map = {};
    const usedSwatches = new Set();

    visibleClassIds.forEach((id, idx) => {
      const preferred = classColorMap[id];
      if (preferred && !usedSwatches.has(preferred.swatch)) {
        map[id] = preferred;
        usedSwatches.add(preferred.swatch);
      } else {
        const found = CLASS_COLORS.find(c => !usedSwatches.has(c.swatch));
        if (found) {
          map[id] = found;
          usedSwatches.add(found.swatch);
        } else {
          map[id] = classColorMap[id] || CLASS_COLORS[idx % CLASS_COLORS.length];
        }
      }
    });

    return map;
  }, [visibleClassIds, classColorMap]);

  const handleClassToggle = (id) => {
    setSelectedClasses(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= 3) return [...prev.slice(0,2), id];
      return [...prev, id];
    });
  };

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
      if (form.id) {
        await patchData(`/academics/timetable/${form.id}/`, payload);
      } else {
        await postData(`/academics/timetable/`, payload);
      }
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

  const teachers = useMemo(() => {
    const s = new Set();
    entries.forEach(e => { if (e.teacher_name) s.add(e.teacher_name); else if (e.teacher) s.add(e.teacher); });
    return Array.from(s);
  }, [entries]);
  const subjects = useMemo(() => {
    const s = new Set();
    entries.forEach(e => { if (e.subject_name) s.add(e.subject_name); else if (e.subject) s.add(e.subject); });
    return Array.from(s);
  }, [entries]);
  const rooms = useMemo(() => {
    const s = new Set();
    entries.forEach(e => { if (e.room) s.add(e.room); });
    return Array.from(s);
  }, [entries]);

  const renderCell = (day, timeLabel) => {
    const cellEntries = (grid[day] && grid[day][timeLabel]) ? grid[day][timeLabel] : [];
    if (!cellEntries.length) return <div className="text-xs text-gray-400 italic">—</div>;

    const grouped = {};
    cellEntries.forEach(e => {
      grouped[e.school_class] = grouped[e.school_class] || [];
      grouped[e.school_class].push(e);
    });

    const baseOrder = selectedClasses.length ? selectedClasses : classes.map(c => c.id);
    const displayOrder = baseOrder.filter(id => grouped[id]).concat(
      Object.keys(grouped).map(k => parseInt(k,10)).filter(id => !baseOrder.includes(id))
    );

    const sideBySide = displayOrder.length <= 3;

    return (
      <div className={`${sideBySide ? "flex flex-nowrap gap-2" : "flex flex-col gap-2"}`}>
        {displayOrder.map((clsId, idx) => {
          const arr = grouped[clsId] || [];
          const e = arr[0];
          const color = (visibleColorMap && visibleColorMap[clsId]) || classColorMap[clsId] || CLASS_COLORS[idx % CLASS_COLORS.length];

          return (
            <div
              key={`${clsId}-${idx}`}
              className={`${sideBySide ? "flex-1 min-w-0" : ""} rounded border p-2 bg-white hover:shadow-sm transition`}
              style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 64 }}
            >
              <div>
                <div className={`px-2 py-1 rounded text-sm font-semibold ${color.bg} ${color.text} truncate`}>
                  {e.subject_name || e.subject || "—"}
                </div>
                <div className="text-[12px] text-gray-600 mt-1 truncate">
                  <strong>{e.teacher_name || e.teacher || "—"}</strong>
                </div>
                <div className="text-[11px] text-gray-500 mt-1 truncate flex items-center gap-2">
                  <FaClock className="text-[10px]" /> {e.starts_at} — {e.ends_at}
                </div>
                {e.room && <div className="text-[11px] text-gray-700 mt-1 truncate flex items-center gap-2"><FaMapMarkerAlt className="text-[10px]" /> {e.room}</div>}
                {arr.length > 1 && <div className="text-xs text-gray-400 mt-1">+{arr.length - 1} autre(s)</div>}
              </div>

              <div className="mt-2 flex gap-2 justify-end">
                <button onClick={() => openModal(e)} className="text-sm px-2 py-1 border rounded hover:bg-gray-50"><FaEdit/></button>
                <button onClick={() => deleteEntry(e.id)} className="text-sm px-2 py-1 border rounded hover:bg-red-50 text-red-600"><FaTrash/></button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // === COLUMN WIDTH LOGIC ===
  const initialSingleDayWidth = 140;
  const visibleCount = Math.max(1, (selectedClasses.length ? selectedClasses.length : 1));
  const clampedCount = Math.min(Math.max(visibleCount, 1), 3);
  const dayColWidth = initialSingleDayWidth * clampedCount;
  const gridCols = `160px repeat(${weekdays.length}, ${dayColWidth}px)`;
  const containerMinWidth = 160 + weekdays.length * dayColWidth;

  // ========================================================================================

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Emplois du temps — Administration</h1>
          <p className="text-sm text-gray-600 mt-1">Comparaison jusqu’à 3 classes • export PDF</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={exportPDF} className="px-3 py-2 rounded-full bg-rose-600 text-white flex items-center gap-2"><FaFilePdf/> Export PDF</button>
          <button onClick={handlePrint} className="px-3 py-2 rounded-full bg-white border"><FaPrint/> Imprimer</button>
          <button onClick={() => openModal(null)} className="ml-2 bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2 rounded-full flex items-center gap-2"><FaPlus/> Ajouter</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-sm font-medium">Sélection classes (max 3)</div>
            <div className="flex gap-2 flex-wrap">
              {classes.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleClassToggle(c.id)}
                  className={`px-3 py-1 rounded-full border ${selectedClasses.includes(c.id) ? "bg-slate-800 text-white" : "bg-white text-gray-700"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Recherche matière / prof / classe" value={searchText} onChange={(e)=>setSearchText(e.target.value)} className="border rounded p-2" />
            <button onClick={()=>setFiltersOpen(prev => !prev)} className="px-3 py-2 rounded bg-white border"><FaFilter/></button>
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={filterTeacher} onChange={(e)=>setFilterTeacher(e.target.value)} className="border p-2 rounded">
              <option value="">Tous les enseignants</option>
              {teachers.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select value={filterDay} onChange={(e)=>setFilterDay(e.target.value)} className="border p-2 rounded">
              <option value="">Tous les jours</option>
              {weekdays.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        )}
      </div>

      <div ref={pdfRef} className="bg-white rounded-lg shadow p-4 overflow-auto">
        {loading ? (
          <div className="text-gray-500">Chargement...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div style={{ minWidth: containerMinWidth }}>
            <div
              className="grid gap-0 border-b border-gray-200 sticky top-0 bg-white z-10"
              style={{ gridTemplateColumns: gridCols }}
            >
              <div className="p-2 text-sm font-medium">Heure</div>
              {weekdays.map(d => (
                <div key={d.value} className="p-2 text-center text-sm font-medium border-l border-gray-200">{d.label}</div>
              ))}
            </div>

            <div>
              {timeLabels.map((tl, idx) => {
                const [start] = tl.split(" - ").map(s => s.trim());
                const startMinutes = timeToMinutes(start);
                const period = startMinutes < 12*60 ? "Matinée" : startMinutes < 17*60 ? "Après-midi" : "Soirée";
                const rowBg = idx % 2 === 0 ? "bg-white" : "bg-gray-50";
                return (
                  <div key={tl} className={`${rowBg} grid border-b border-gray-100`} style={{ gridTemplateColumns: gridCols }}>
                    <div className="p-2 bg-gray-50">
                      <div className="text-sm font-medium">{tl}</div>
                      <div className="text-xs text-gray-500 mt-1">{period}</div>
                    </div>

                    {weekdays.map(d => (
                      <div key={`${d.value}-${idx}`} className="p-2 border-l border-gray-100">
                        {renderCell(d.value, tl)}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* LEGEND */}
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

      {showModal && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-2xl p-6 w-[720px] max-w-full">
            <h2 className="text-xl font-bold mb-4">{form.id ? "Modifier une entrée" : "Ajouter une entrée"}</h2>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.school_class} onChange={(e)=>setForm({...form, school_class: e.target.value})} className="border p-2 rounded">
                <option value="">Choisir une classe</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="Matière (id ou nom)" value={form.subject} onChange={(e)=>setForm({...form, subject: e.target.value})} className="border p-2 rounded" />
              <input placeholder="Prof (id ou nom)" value={form.teacher} onChange={(e)=>setForm({...form, teacher: e.target.value})} className="border p-2 rounded" />
              <select value={form.weekday} onChange={(e)=>setForm({...form, weekday: parseInt(e.target.value || "", 10)})} className="border p-2 rounded">
                <option value="">Jour</option>
                {weekdays.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <select value={form.starts_at} onChange={(e)=>setForm({...form, starts_at: e.target.value})} className="border p-2 rounded">
                <option value="">Début</option>
                {timeSlots.map(ts => <option key={ts.id} value={ts.start_time}>{ts.start_time}</option>)}
              </select>
              <select value={form.ends_at} onChange={(e)=>setForm({...form, ends_at: e.target.value})} className="border p-2 rounded">
                <option value="">Fin</option>
                {timeSlots.map(ts => <option key={ts.id} value={ts.end_time}>{ts.end_time}</option>)}
              </select>
              <input placeholder="Salle" value={form.room} onChange={(e)=>setForm({...form, room: e.target.value})} className="border p-2 rounded col-span-2" />
              <input placeholder="Notes" value={form.notes} onChange={(e)=>setForm({...form, notes: e.target.value})} className="border p-2 rounded col-span-2" />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 rounded bg-gray-200">Annuler</button>
              <button onClick={submitForm} className="px-4 py-2 rounded bg-gradient-to-r from-green-500 to-teal-500 text-white">{form.id ? "Modifier" : "Ajouter"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/*// Timetable.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaPlus, FaFilter, FaPrint, FaFilePdf, FaClock, FaMapMarkerAlt } from "react-icons/fa";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/*
  NOTE:
  - Ce fichier reprend ton code original et ajoute :
    -> Pan (drag) dans toutes les directions
    -> Zoom (boutons + Ctrl+molette) + Reset
    -> Touch support (drag)
  - La logique existante (fetch, grid, renderCell, PDF export, modal...) est conservée.
  - La largeur d'une colonne jour est toujours : initialSingleDayWidth * clampedCount (1..3).
*/
/*
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
];

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
}

export default function Timetable() {
  const token = localStorage.getItem("access_token");
  const API_BASE = "http://localhost:8000/api";

  // data
  const [entries, setEntries] = useState([]);
  const [classes, setClasses] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);

  // ui
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClasses, setSelectedClasses] = useState([]); // array of class ids in display order
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [filterTeacher, setFilterTeacher] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterRoom, setFilterRoom] = useState("");
  const [filterDay, setFilterDay] = useState("");

  // pan/zoom
  const [zoomLevel, setZoomLevel] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const lastOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);   // element that is translated & scaled
  const wrapperRef = useRef(null);  // visible area wrapper (for wheel events)

  const pdfRef = useRef(null); // kept for pdf export (wraps wrapper)

  // fetch
  const fetchAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [entriesRes, classesRes, slotsRes] = await Promise.all([
        axios.get(`${API_BASE}/academics/timetable/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE}/academics/school-classes/`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API_BASE}/academics/time-slots/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const entriesData = entriesRes.data || [];
      const classesData = classesRes.data || [];
      const slotsData = (slotsRes.data || []).slice().sort((a,b) => (a.day - b.day) || (String(a.start_time).localeCompare(String(b.start_time))));
      setEntries(entriesData);
      setClasses(classesData);
      setTimeSlots(slotsData);
      if (classesData.length && selectedClasses.length === 0) {
        setSelectedClasses([classesData[0].id]);
      } else {
        setSelectedClasses(prev => prev.filter(id => classesData.some(c => c.id === id)));
      }
    } catch (err) {
      console.error(err);
      setError("Erreur lors du chargement des données. Vérifie l'API / token.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line  }, []);

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

  const displayedEntries = useMemo(() => {
    const selected = selectedClasses.length ? selectedClasses : classes.map(c => c.id);
    return entries.filter(e => {
      if (!selected.includes(e.school_class)) return false;
      if (searchText) {
        const q = searchText.toLowerCase();
        const any = `${e.subject_name || e.subject || ""} ${e.teacher_name || e.teacher || ""} ${e.school_class_name || ""}`;
        if (!any.toLowerCase().includes(q)) return false;
      }
      if (filterTeacher && String(e.teacher_name || e.teacher) !== String(filterTeacher)) return false;
      if (filterSubject && String(e.subject_name || e.subject) !== String(filterSubject)) return false;
      if (filterRoom && String(e.room || "") !== String(filterRoom)) return false;
      if (filterDay && String(e.weekday) !== String(filterDay)) return false;
      return true;
    });
  }, [entries, selectedClasses, searchText, filterTeacher, filterSubject, filterRoom, filterDay, classes]);

  const grid = useMemo(() => {
    const g = {};
    weekdays.forEach(d => {
      g[d.value] = {};
      timeLabels.forEach(t => (g[d.value][t] = []));
    });
    displayedEntries.forEach(e => {
      const timeLabel = `${e.starts_at} - ${e.ends_at}`;
      if (!g[e.weekday]) g[e.weekday] = {};
      if (!g[e.weekday][timeLabel]) g[e.weekday][timeLabel] = [];
      g[e.weekday][timeLabel].push(e);
    });
    return g;
  }, [displayedEntries, timeLabels]);

  const classColorMap = useMemo(() => {
    const map = {};
    const order = selectedClasses.length ? selectedClasses : classes.map(c => c.id);
    order.forEach((clsId, idx) => {
      map[clsId] = CLASS_COLORS[idx % CLASS_COLORS.length];
    });
    classes.forEach((c, idx) => {
      if (!map[c.id]) map[c.id] = CLASS_COLORS[(selectedClasses.length + idx) % CLASS_COLORS.length];
    });
    return map;
  }, [selectedClasses, classes]);

  const handleClassToggle = (id) => {
    setSelectedClasses(prev => {
      if (prev.includes(id)) return prev.filter(p => p !== id);
      if (prev.length >= 3) return [...prev.slice(0,2), id];
      return [...prev, id];
    });
  };

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
      if (form.id) {
        await axios.put(`${API_BASE}/academics/timetable/${form.id}/`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API_BASE}/academics/timetable/`, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      await fetchAll();
      closeModal();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de l'enregistrement");
    }
  };

  const deleteEntry = async (id) => {
    if (!confirm("Supprimer cette entrée ?")) return;
    try {
      await axios.delete(`${API_BASE}/academics/timetable/${id}/`, { headers: { Authorization: `Bearer ${token}` } });
      await fetchAll();
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la suppression");
    }
  };

  const exportPDF = async () => {
    // capture wrapper (pdfRef) which contains the visible canvas - transforms are captured by html2canvas
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
      let offsetPdf = pageHeight - 20;
      while (remaining > 0) {
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, -offsetPdf + 10, imgWidth, imgHeight);
        offsetPdf += pageHeight - 20;
        remaining -= pageHeight - 20;
      }
    }
    pdf.save("emplois_du_temps.pdf");
    element.style.backgroundColor = originalBg;
  };

  const handlePrint = () => window.print();

  const teachers = useMemo(() => {
    const s = new Set();
    entries.forEach(e => { if (e.teacher_name) s.add(e.teacher_name); else if (e.teacher) s.add(e.teacher); });
    return Array.from(s);
  }, [entries]);
  const subjects = useMemo(() => {
    const s = new Set();
    entries.forEach(e => { if (e.subject_name) s.add(e.subject_name); else if (e.subject) s.add(e.subject); });
    return Array.from(s);
  }, [entries]);
  const rooms = useMemo(() => {
    const s = new Set();
    entries.forEach(e => { if (e.room) s.add(e.room); });
    return Array.from(s);
  }, [entries]);

  const renderCell = (day, timeLabel) => {
    const cellEntries = (grid[day] && grid[day][timeLabel]) ? grid[day][timeLabel] : [];
    if (!cellEntries.length) return <div className="text-xs text-gray-400 italic">—</div>;

    const grouped = {};
    cellEntries.forEach(e => {
      grouped[e.school_class] = grouped[e.school_class] || [];
      grouped[e.school_class].push(e);
    });

    const displayOrder = (selectedClasses.length ? selectedClasses : classes.map(c => c.id)).filter(id => grouped[id]).concat(
      Object.keys(grouped).map(k => parseInt(k,10)).filter(id => !(selectedClasses.length ? selectedClasses : classes.map(c => c.id)).includes(id))
    );

    const sideBySide = displayOrder.length <= 3;

    return (
      <div className={`${sideBySide ? "flex flex-nowrap gap-2" : "flex flex-col gap-2"}`}>
        {displayOrder.map((clsId, idx) => {
          const arr = grouped[clsId] || [];
          const e = arr[0];
          const color = classColorMap[clsId] || CLASS_COLORS[idx % CLASS_COLORS.length];
          return (
            <div
              key={`${clsId}-${idx}`}
              className={`${sideBySide ? "flex-1 min-w-0" : ""} rounded border p-2 bg-white hover:shadow-sm transition`}
              style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 64 }}
            >
              <div>
                <div className={`px-2 py-1 rounded text-sm font-semibold ${color.bg} ${color.text} truncate`}>
                  {e.subject_name || e.subject || "—"}
                </div>
                <div className="text-[12px] text-gray-600 mt-1 truncate">
                  <strong>{e.teacher_name || e.teacher || "—"}</strong>
                </div>
                <div className="text-[11px] text-gray-500 mt-1 truncate flex items-center gap-2">
                  <FaClock className="text-[10px]" /> {e.starts_at} — {e.ends_at}
                </div>
                {e.room && <div className="text-[11px] text-gray-700 mt-1 truncate flex items-center gap-2"><FaMapMarkerAlt className="text-[10px]" /> {e.room}</div>}
                {arr.length > 1 && <div className="text-xs text-gray-400 mt-1">+{arr.length - 1} autre(s)</div>}
              </div>

              <div className="mt-2 flex gap-2 justify-end">
                <button onClick={() => openModal(e)} className="text-sm px-2 py-1 border rounded hover:bg-gray-50"><FaEdit/></button>
                <button onClick={() => deleteEntry(e.id)} className="text-sm px-2 py-1 border rounded hover:bg-red-50 text-red-600"><FaTrash/></button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // === MODIFICATION : garder la largeur initiale d'une colonne pour 1 emploi et multiplier ===
  const initialSingleDayWidth = 100; // px pour 1 emploi ; multiplié par 1..3
  const visibleCount = selectedClasses.length ? selectedClasses.length : 1;
  const clampedCount = Math.min(Math.max(visibleCount, 1), 3); // 1..3
  const dayColWidth = initialSingleDayWidth * clampedCount; // 1x, 2x, 3x
  const gridCols = `160px repeat(6, ${dayColWidth}px)`; // left time column fixed 160px, 6 day columns fixed
  const containerMinWidth = 160 + 6 * dayColWidth;
  // ========================================================================================

  /* ---------------- Pan & Zoom logic: event handlers + effects ---------------- 

  // Mouse-based pan (mousedown on canvas -> move -> mouseup)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onMouseDown = (e) => {
      // only left button
      if (e.button !== 0) return;
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
      el.style.cursor = "grabbing";
      // prevent selecting text while dragging
      document.body.style.userSelect = "none";
      document.body.style.pointerEvents = "none";
    };

    const onMouseMove = (e) => {
      if (!isPanning) return;
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      const newOffset = { x: lastOffset.current.x + dx, y: lastOffset.current.y + dy };
      // update offset directly (no debouncing required)
      setOffset(newOffset);
    };

    const onMouseUp = () => {
      if (!isPanning) return;
      setIsPanning(false);
      lastOffset.current = { ...offset };
      if (el) el.style.cursor = "grab";
      document.body.style.userSelect = "";
      document.body.style.pointerEvents = "";
    };

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.userSelect = "";
      document.body.style.pointerEvents = "";
    };
    // include isPanning & offset in deps so mouseup captures latest offset
  }, [isPanning, offset]);

  // Touch support (touchdrag)
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const onTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      setIsPanning(true);
      const t = e.touches[0];
      panStart.current = { x: t.clientX, y: t.clientY };
      document.body.style.userSelect = "none";
    };

    const onTouchMove = (e) => {
      if (!isPanning) return;
      if (!e.touches || e.touches.length === 0) return;
      const t = e.touches[0];
      const dx = t.clientX - panStart.current.x;
      const dy = t.clientY - panStart.current.y;
      const newOffset = { x: lastOffset.current.x + dx, y: lastOffset.current.y + dy };
      setOffset(newOffset);
    };

    const onTouchEnd = () => {
      if (!isPanning) return;
      setIsPanning(false);
      lastOffset.current = { ...offset };
      document.body.style.userSelect = "";
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      document.body.style.userSelect = "";
    };
  }, [isPanning, offset]);

  // Update lastOffset whenever offset changes (so mouseup stores correct value)
  useEffect(() => {
    // don't overwrite lastOffset while panning; keep source of truth in lastOffset when pan ends
    if (!isPanning) {
      lastOffset.current = { ...offset };
    }
  }, [offset, isPanning]);

  // Wheel zoom (Ctrl + wheel) on wrapperRef - prevents default when ctrl pressed
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const onWheel = (e) => {
      // Ctrl + wheel -> zoom
      if (e.ctrlKey) {
        e.preventDefault();
        // deltaY positive = zoom out
        setZoomLevel(z => {
          const next = z - e.deltaY * 0.0015;
          return Math.min(2.5, Math.max(0.5, next));
        });
      } else {
        // not ctrl: allow default (could scroll page) or we can pan vertically by wheel if desired
        // we leave default to allow page scroll
      }
    };

    wrapper.addEventListener("wheel", onWheel, { passive: false });
    return () => wrapper.removeEventListener("wheel", onWheel);
  }, []);

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(z => Math.min(2.5, parseFloat((z + 0.1).toFixed(2))));
  const handleZoomOut = () => setZoomLevel(z => Math.max(0.5, parseFloat((z - 0.1).toFixed(2))));
  const resetView = () => {
    setZoomLevel(1);
    setOffset({ x: 0, y: 0 });
    lastOffset.current = { x: 0, y: 0 };
  };

  // Double click on wrapper to reset (handy)
  useEffect(() => {
    const wrap = wrapperRef.current;
    if (!wrap) return;
    const onDbl = (e) => {
      e.preventDefault();
      resetView();
    };
    wrap.addEventListener("dblclick", onDbl);
    return () => wrap.removeEventListener("dblclick", onDbl);
  }, []);

  /* ---------------- End Pan & Zoom logic ---------------- */

  /* ---------- Render ---------- 
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* header }
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Emplois du temps — Administration</h1>
          <p className="text-sm text-gray-600 mt-1">Tableau pro • comparaison jusqu’à 3 classes • export PDF</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={exportPDF} className="px-3 py-2 rounded-full bg-rose-600 text-white flex items-center gap-2"><FaFilePdf/> Export PDF</button>
          <button onClick={handlePrint} className="px-3 py-2 rounded-full bg-white border"><FaPrint/> Imprimer</button>
          <button onClick={() => openModal(null)} className="ml-2 bg-gradient-to-r from-green-500 to-teal-500 text-white px-4 py-2 rounded-full flex items-center gap-2"><FaPlus/> Ajouter</button>
        </div>
      </div>

      {/* filters & class selector }
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-sm font-medium">Sélection classes (max 3)</div>
            <div className="flex gap-2 flex-wrap">
              {classes.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleClassToggle(c.id)}
                  className={`px-3 py-1 rounded-full border ${selectedClasses.includes(c.id) ? "bg-slate-800 text-white" : "bg-white text-gray-700"}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Recherche matière / prof / classe" value={searchText} onChange={(e)=>setSearchText(e.target.value)} className="border rounded p-2" />
            <button onClick={()=>setFiltersOpen(prev => !prev)} className="px-3 py-2 rounded bg-white border"><FaFilter/></button>
          </div>
        </div>

        {filtersOpen && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <select value={filterTeacher} onChange={(e)=>setFilterTeacher(e.target.value)} className="border p-2 rounded">
              <option value="">Tous les enseignants</option>
              {teachers.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterSubject} onChange={(e)=>setFilterSubject(e.target.value)} className="border p-2 rounded">
              <option value="">Toutes les matières</option>
              {subjects.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterRoom} onChange={(e)=>setFilterRoom(e.target.value)} className="border p-2 rounded">
              <option value="">Toutes les salles</option>
              {rooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select value={filterDay} onChange={(e)=>setFilterDay(e.target.value)} className="border p-2 rounded">
              <option value="">Tous les jours</option>
              {weekdays.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* wrapper that holds the transformable canvas; pdfRef wraps wrapper so export captures visible area }
      <div ref={pdfRef} className="bg-white rounded-lg shadow p-4">
        {loading ? (
          <div className="text-gray-500">Chargement...</div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <>
            {/* visible wrapper - overflow hidden so we pan/zoom inside it }
            <div
              ref={wrapperRef}
              className="relative overflow-hidden select-none"
              style={{ height: "72vh" }} // adjust height if you want different viewport height
            >
              {/* canvas: absolutely positioned element that we translate & scale }
              <div
                ref={canvasRef}
                className="absolute top-0 left-0 cursor-grab"
                style={{
                  transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoomLevel})`,
                  transformOrigin: "top left",
                  transition: isPanning ? "none" : "transform 0.12s ease-out",
                  width: "max-content",
                }}
              >
                {/* ---------- GRID CONTENT (unchanged logic) ---------- }
                <div style={{ minWidth: containerMinWidth }}>
                  {/* header row: remove page-sticky because header moves with canvas (keeps it synced during pan) }
                  <div
                    className="grid gap-0 border-b border-gray-200 bg-white z-10"
                    style={{ gridTemplateColumns: gridCols }}
                  >
                    <div className="p-2 text-sm font-medium">Heure</div>
                    {weekdays.map(d => (
                      <div key={d.value} className="p-2 text-center text-sm font-medium border-l border-gray-200">{d.label}</div>
                    ))}
                  </div>

                  {/* time rows }
                  <div>
                    {timeLabels.map((tl, idx) => {
                      const [start] = tl.split(" - ").map(s => s.trim());
                      const startMinutes = timeToMinutes(start);
                      const period = startMinutes < 12*60 ? "Matinée" : startMinutes < 17*60 ? "Après-midi" : "Soirée";
                      const rowBg = idx % 2 === 0 ? "bg-white" : "bg-gray-50"; // zebra
                      return (
                        <div key={tl} className={`${rowBg} grid border-b border-gray-100`} style={{ gridTemplateColumns: gridCols }}>
                          <div className="p-2 bg-gray-50">
                            <div className="text-sm font-medium">{tl}</div>
                            <div className="text-xs text-gray-500 mt-1">{period}</div>
                          </div>

                          {weekdays.map(d => (
                            <div key={`${d.value}-${idx}`} className="p-2 border-l border-gray-100">
                              {renderCell(d.value, tl)}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                </div>
                {/* ---------- end grid content ---------- }
              </div>

              {/* zoom controls: bottom-right inside wrapper }
              <div className="absolute bottom-4 right-4 bg-white border rounded-lg shadow flex gap-2 p-2">
                <button onClick={handleZoomOut} className="px-3 py-1 rounded border">−</button>
                <button onClick={resetView} className="px-3 py-1 rounded border">Reset</button>
                <button onClick={handleZoomIn} className="px-3 py-1 rounded border">+</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* LEGEND *}
      <div className="mt-4 bg-white p-3 rounded-lg shadow flex flex-wrap items-center gap-4">
        <div className="text-sm font-medium">Légende :</div>
        {(selectedClasses.length ? selectedClasses : classes.slice(0,3).map(c => c.id)).map((id, idx) => {
          const cls = classes.find(c => c.id === id);
          const color = classColorMap[id] || CLASS_COLORS[idx % CLASS_COLORS.length];
          return (
            <div key={id} className="flex items-center gap-2 text-sm">
              <span className={`inline-block w-6 h-4 rounded ${color.swatch} border`}></span>
              <span>{cls?.name || `Classe ${id}`}</span>
            </div>
          );
        })}
      </div>

      {/* Modal *}
      {showModal && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 p-4">
          <div className="bg-white rounded-2xl p-6 w-[720px] max-w-full">
            <h2 className="text-xl font-bold mb-4">{form.id ? "Modifier une entrée" : "Ajouter une entrée"}</h2>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.school_class} onChange={(e)=>setForm({...form, school_class: e.target.value})} className="border p-2 rounded">
                <option value="">Choisir une classe</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input placeholder="Matière (id ou nom)" value={form.subject} onChange={(e)=>setForm({...form, subject: e.target.value})} className="border p-2 rounded" />
              <input placeholder="Prof (id ou nom)" value={form.teacher} onChange={(e)=>setForm({...form, teacher: e.target.value})} className="border p-2 rounded" />
              <select value={form.weekday} onChange={(e)=>setForm({...form, weekday: parseInt(e.target.value || "", 10)})} className="border p-2 rounded">
                <option value="">Jour</option>
                {weekdays.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
              <select value={form.starts_at} onChange={(e)=>setForm({...form, starts_at: e.target.value})} className="border p-2 rounded">
                <option value="">Début</option>
                {timeSlots.map(ts => <option key={ts.id} value={ts.start_time}>{ts.start_time}</option>)}
              </select>
              <select value={form.ends_at} onChange={(e)=>setForm({...form, ends_at: e.target.value})} className="border p-2 rounded">
                <option value="">Fin</option>
                {timeSlots.map(ts => <option key={ts.id} value={ts.end_time}>{ts.end_time}</option>)}
              </select>
              <input placeholder="Salle" value={form.room} onChange={(e)=>setForm({...form, room: e.target.value})} className="border p-2 rounded col-span-2" />
              <input placeholder="Notes" value={form.notes} onChange={(e)=>setForm({...form, notes: e.target.value})} className="border p-2 rounded col-span-2" />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={closeModal} className="px-4 py-2 rounded bg-gray-200">Annuler</button>
              <button onClick={submitForm} className="px-4 py-2 rounded bg-gradient-to-r from-green-500 to-teal-500 text-white">{form.id ? "Modifier" : "Ajouter"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}*/
