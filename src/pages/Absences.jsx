import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
  FaCalendarAlt,
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaUndo,
  FaSpinner,
  FaChevronLeft,
  FaChevronRight,
  FaChevronDown,
  FaEllipsisV,
  FaClock,
  FaBook,
  FaCheck,
  FaTimes
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";

/**
 * AttendanceSheet
 * - GET /attendance/sheet/?class_id=X&date=YYYY-MM-DD
 * - POST /attendances/  { student, schedule_entry, date, status }
 * - DELETE /attendances/{id}/
 * - PUT  /attendances/{id}/  to change status (we call putData with full payload)
 *
 * Conventions : utilise les mêmes toasts / styles que ta page LevelsAndClasses
 */
export default function AttendanceSheet() {
  /* --- global UI state --- */
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("");
  const [date, setDate] = useState(localDateISO(new Date())); // YYYY-MM-DD local
  const [message, setMessage] = useState(null);

  /* --- sheet data --- */
  const [schedule, setSchedule] = useState([]); // array of schedule entries (columns)
  const [students, setStudents] = useState([]); // array of students (rows)
  const [attendanceMap, setAttendanceMap] = useState({}); 
  // attendanceMap[studentId]?.[scheduleId] = { id, status }  OR undefined

  /* --- UI helpers --- */
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [cellPending, setCellPending] = useState({}); // key = `${s}_${e}` => bool
  const [undoStack, setUndoStack] = useState([]); // keep last actions to undo
  const [bulkSaving, setBulkSaving] = useState(false);

  /* focus for keyboard navigation */
  const [focusCell, setFocusCell] = useState({ studentIndex: 0, scheduleIndex: 0 });
  const containerRef = useRef(null);

  /* --- Auto-dismiss toast --- */
  useEffect(() => {
    if (message) {
      const t = setTimeout(() => setMessage(null), 4500);
      return () => clearTimeout(t);
    }
  }, [message]);

  /* --- Load classes for selector (reuse pattern from your page) --- */
  const fetchClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const data = await fetchData("/academics/school-classes/");
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      setClasses(arr);
      if (!selectedClass && arr.length > 0) setSelectedClass(arr[0].id);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Impossible de charger les classes." });
    } finally {
      setClassesLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

  /* --- Load sheet for selected class & date --- */
  const fetchSheet = useCallback(async (classId, isoDate) => {
    if (!classId) return;
    setLoadingSheet(true);
    try {
      const q = `/academics/attendance/sheet/?class_id=${encodeURIComponent(classId)}&date=${encodeURIComponent(isoDate)}`;
      const res = await fetchData(q);
      // expected { date, weekday, schedule: [], students: [], absences: [] }
      setSchedule(Array.isArray(res.schedule) ? res.schedule : []);
      setStudents(Array.isArray(res.students) ? res.students : []);
      // build attendanceMap
      const map = {};
      (res.absences ?? []).forEach(a => {
        if (!map[a.student_id]) map[a.student_id] = {};
        map[a.student_id][a.schedule_entry_id] = { id: a.id, status: a.status || "ABSENT" };
      });
      setAttendanceMap(map);
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Impossible de charger la feuille de présence." });
      setSchedule([]);
      setStudents([]);
      setAttendanceMap({});
    } finally {
      setLoadingSheet(false);
    }
  }, []);

  useEffect(() => {
    if (selectedClass) fetchSheet(selectedClass, date);
  }, [selectedClass, date, fetchSheet]);

  /* --- helpers --- */
  function cellKey(studentId, scheduleId) { return `${studentId}_${scheduleId}`; }
  function isCellAbsent(studentId, scheduleId) {
    return !!(attendanceMap[studentId] && attendanceMap[studentId][scheduleId]);
  }

  function setCellBusy(studentId, scheduleId, busy = true) {
    setCellPending(prev => ({ ...prev, [cellKey(studentId, scheduleId)]: busy }));
  }

  /* build payload for create/update */
  function buildAttendancePayload(studentId, scheduleEntryId, isoDate, status="ABSENT") {
    return { student: studentId, schedule_entry: scheduleEntryId, date: isoDate, status };
  }

  /* --- Toggle single cell (optimistic) --- */
  const toggleCell = async (studentId, scheduleId) => {
    const existing = attendanceMap[studentId]?.[scheduleId];
    const k = cellKey(studentId, scheduleId);
    if (cellPending[k]) return; // prevent double click
    setCellBusy(studentId, scheduleId, true);

    if (!existing) {
      // create absence
      // optimistic update: set temporary placeholder id = "temp-<ts>" to disable double toggles
      const tempId = `temp-${Date.now()}`;
      setAttendanceMap(prev => {
        const copy = { ...prev };
        copy[studentId] = { ...(copy[studentId] || {}) };
        copy[studentId][scheduleId] = { id: tempId, status: "ABSENT" };
        return copy;
      });
      // push undo action
      pushUndo({ type: "create", studentId, scheduleId, tempId });

      try {
        const payload = buildAttendancePayload(studentId, scheduleId, date, "ABSENT");
        const created = await postData("/academics/attendances/", payload);
        // update tempId -> real id
        setAttendanceMap(prev => {
          const copy = { ...prev };
          copy[studentId] = { ...(copy[studentId] || {}) };
          if (copy[studentId][scheduleId] && copy[studentId][scheduleId].id === tempId) {
            copy[studentId][scheduleId] = { id: created.id, status: created.status || "ABSENT" };
          }
          return copy;
        });
        setMessage({ type: "success", text: "Absent enregistré." });
      } catch (err) {
        console.error(err);
        // revert optimistic
        setAttendanceMap(prev => {
          const copy = { ...prev };
          if (copy[studentId]) {
            const row = { ...(copy[studentId]) };
            delete row[scheduleId];
            copy[studentId] = Object.keys(row).length ? row : undefined;
          }
          return copy;
        });
        setMessage({ type: "error", text: "Échec enregistrement. Réessaye." });
        // pop undo (remove last) because create didn't happen
        popUndo();
      } finally {
        setCellBusy(studentId, scheduleId, false);
      }
    } else {
      // delete absence (mark present)
      // optimistic remove but keep data in undo stack
      setAttendanceMap(prev => {
        const copy = { ...prev };
        if (copy[studentId]) {
          const row = { ...(copy[studentId]) };
          delete row[scheduleId];
          copy[studentId] = Object.keys(row).length ? row : undefined;
        }
        return copy;
      });
      pushUndo({ type: "delete", studentId, scheduleId, record: existing });
      try {
        // if id is temporary (shouldn't happen for delete), handle
        if (String(existing.id).startsWith("temp-")) {
          // nothing to call on server
          setMessage({ type: "success", text: "Annulé localement." });
        } else {
          await deleteData(`/academics/attendances/${existing.id}/`);
          setMessage({ type: "success", text: "Présence restaurée." });
        }
      } catch (err) {
        console.error(err);
        // revert: put back existing
        setAttendanceMap(prev => {
          const copy = { ...prev };
          copy[studentId] = { ...(copy[studentId] || {}) };
          copy[studentId][scheduleId] = existing;
          return copy;
        });
        setMessage({ type: "error", text: "Échec suppression. Réessaye." });
        popUndo();
      } finally {
        setCellBusy(studentId, scheduleId, false);
      }
    }
  };

  /* --- change status (ABSENT | LATE | EXCUSED) for an existing record --- */
  const changeStatus = async (studentId, scheduleId, newStatus) => {
    const rec = attendanceMap[studentId]?.[scheduleId];
    if (!rec) return setMessage({ type: "error", text: "Enregistre d'abord l'absence." });
    if (String(rec.id).startsWith("temp-")) return setMessage({ type: "error", text: "Attends la sauvegarde du serveur." });

    setCellBusy(studentId, scheduleId, true);
    const prevStatus = rec.status;
    // optimistic
    setAttendanceMap(prev => {
      const copy = { ...prev };
      copy[studentId] = { ...(copy[studentId] || {}) };
      copy[studentId][scheduleId] = { ...copy[studentId][scheduleId], status: newStatus };
      return copy;
    });
    pushUndo({ type: "status", studentId, scheduleId, prevStatus });

    try {
      // need full payload for PUT: include student, schedule_entry, date, status
      const payload = buildAttendancePayload(studentId, scheduleId, date, newStatus);
      await putData(`/attendances/${rec.id}/`, payload);
      setMessage({ type: "success", text: "Statut mis à jour." });
    } catch (err) {
      console.error(err);
      // revert
      setAttendanceMap(prev => {
        const copy = { ...prev };
        copy[studentId] = { ...(copy[studentId] || {}) };
        copy[studentId][scheduleId] = { ...copy[studentId][scheduleId], status: prevStatus };
        return copy;
      });
      setMessage({ type: "error", text: "Impossible de modifier le statut." });
      popUndo();
    } finally {
      setCellBusy(studentId, scheduleId, false);
    }
  };

  /* --- Bulk mark absent for a whole schedule entry (course) --- */
  const bulkMarkAbsent = async (scheduleEntryId) => {
    if (!students.length) return;
    setBulkSaving(true);
    const toCreate = [];
    students.forEach(s => {
      if (!isCellAbsent(s.id, scheduleEntryId)) {
        toCreate.push({ student: s.id, schedule_entry: scheduleEntryId, date, status: "ABSENT" });
      }
    });
    if (!toCreate.length) {
      setMessage({ type: "info", text: "Tous les élèves sont déjà marqués absents pour ce cours." });
      setBulkSaving(false);
      return;
    }

    // optimistic: mark them temporarily
    const temps = toCreate.map(() => `temp-${Date.now()}-${Math.random().toString(36).slice(2,7)}`);
    setAttendanceMap(prev => {
      const copy = { ...prev };
      toCreate.forEach((t, i) => {
        const sId = t.student, seId = t.schedule_entry;
        copy[sId] = { ...(copy[sId] || {}) };
        copy[sId][seId] = { id: temps[i], status: "ABSENT" };
      });
      return copy;
    });
    pushUndo({ type: "bulk_create", entries: toCreate.map((t, i) => ({ studentId: t.student, scheduleId: t.schedule_entry, tempId: temps[i] })) });

    try {
      // do requests in parallel (limited -> if you want, chunk)
      const promises = toCreate.map(p => postData("/attendances/", p));
      const results = await Promise.allSettled(promises);
      // map results back and replace temp ids with real ids where success
      const successCount = results.reduce((acc, r) => acc + (r.status === "fulfilled" ? 1 : 0), 0);
      let idx = 0;
      setAttendanceMap(prev => {
        const copy = { ...prev };
        toCreate.forEach((t, i) => {
          const sId = t.student, seId = t.schedule_entry;
          const res = results[i];
          if (res.status === "fulfilled") {
            const created = res.value;
            copy[sId] = { ...(copy[sId] || {}) };
            copy[sId][seId] = { id: created.id, status: created.status || "ABSENT" };
          } else {
            // remove failed ones
            if (copy[sId]) {
              const row = { ...(copy[sId]) };
              // attempt remove temp value (we don't have temp id here reliably)
              delete row[seId];
              copy[sId] = Object.keys(row).length ? row : undefined;
            }
          }
        });
        return copy;
      });
      setMessage({ type: successCount === toCreate.length ? "success" : "info", text: `${successCount} / ${toCreate.length} absences enregistrées.` });
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: "Erreur lors du marquage en masse." });
    } finally {
      setBulkSaving(false);
    }
  };

  /* --- Undo utilities --- */
  const pushUndo = (action) => {
    setUndoStack(s => [action, ...s].slice(0, 20));
  };
  const popUndo = () => {
    setUndoStack(s => s.slice(1));
  };
  const handleUndo = async () => {
    const actions = [...undoStack];
    if (!actions.length) return setMessage({ type: "info", text: "Rien à annuler." });
    const action = actions[0];
    // optimistic: apply reverse locally then call backend as needed
    if (action.type === "create") {
      // created absence with tempId -> remove it locally and try delete on server if id real
      const { studentId, scheduleId, tempId } = action;
      setAttendanceMap(prev => {
        const copy = { ...prev };
        if (copy[studentId]) {
          const row = { ...(copy[studentId]) };
          // if id equals tempId or exists, remove
          if (row[scheduleId] && String(row[scheduleId].id).startsWith("temp-")) {
            delete row[scheduleId];
            copy[studentId] = Object.keys(row).length ? row : undefined;
          }
        }
        return copy;
      });
      popUndo();
      setMessage({ type: "success", text: "Annulé localement." });
    } else if (action.type === "delete") {
      // we deleted an absence and kept the record; recreate it on server if needed
      const { studentId, scheduleId, record } = action;
      // optimistic re-add locally
      setAttendanceMap(prev => {
        const copy = { ...prev };
        copy[studentId] = { ...(copy[studentId] || {}) };
        copy[studentId][scheduleId] = record;
        return copy;
      });
      // if record.id is real, try to recreate on server by POST (server will reject if duplicate)
      if (String(record.id).startsWith("temp-")) {
        popUndo();
        setMessage({ type: "success", text: "Annulation locale effectuée." });
        return;
      }
      try {
        const payload = buildAttendancePayload(studentId, scheduleId, date, record.status || "ABSENT");
        const created = await postData("/attendances/", payload);
        // set id to newly created id
        setAttendanceMap(prev => {
          const copy = { ...prev };
          copy[studentId] = { ...(copy[studentId] || {}) };
          copy[studentId][scheduleId] = { id: created.id, status: created.status || "ABSENT" };
          return copy;
        });
        setMessage({ type: "success", text: "Absence rétablie." });
      } catch (err) {
        console.error(err);
        setMessage({ type: "error", text: "Impossible de rétablir l'absence." });
      } finally {
        popUndo();
      }
    } else if (action.type === "status") {
      // revert to prevStatus
      const { studentId, scheduleId, prevStatus } = action;
      const rec = attendanceMap[studentId]?.[scheduleId];
      if (!rec || String(rec.id).startsWith("temp-")) {
        popUndo();
        return setMessage({ type: "info", text: "Rien à annuler côté serveur." });
      }
      // optimistic
      setAttendanceMap(prev => {
        const copy = { ...prev };
        copy[studentId] = { ...(copy[studentId] || {}) };
        copy[studentId][scheduleId] = { ...copy[studentId][scheduleId], status: prevStatus };
        return copy;
      });
      try {
        const payload = buildAttendancePayload(studentId, scheduleId, date, prevStatus);
        await putData(`/attendances/${rec.id}/`, payload);
        setMessage({ type: "success", text: "Statut restauré." });
      } catch (err) {
        console.error(err);
        setMessage({ type: "error", text: "Impossible de restaurer le statut." });
      } finally {
        popUndo();
      }
    } else if (action.type === "bulk_create") {
      // remove all temp markers and try to delete created items if they exist
      // simple approach: re-fetch sheet (safer)
      await fetchSheet(selectedClass, date);
      popUndo();
      setMessage({ type: "success", text: "Opération annulée (rechargé)." });
    }
  };

  /* --- Keyboard navigation --- */
  useEffect(() => {
    const handler = (e) => {
      // only process if container is visible / focused
      if (!containerRef.current) return;
      // ignore if typing in input
      const active = document.activeElement;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setFocusCell(f => ({ studentIndex: Math.min(f.studentIndex + 1, Math.max(0, students.length - 1)), scheduleIndex: f.scheduleIndex }));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setFocusCell(f => ({ studentIndex: Math.max(f.studentIndex - 1, 0), scheduleIndex: f.scheduleIndex }));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setFocusCell(f => ({ studentIndex: f.studentIndex, scheduleIndex: Math.min(f.scheduleIndex + 1, Math.max(0, schedule.length - 1)) }));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setFocusCell(f => ({ studentIndex: f.studentIndex, scheduleIndex: Math.max(f.scheduleIndex - 1, 0) }));
      } else if (e.key === " ") {
        e.preventDefault();
        // toggle focused cell
        const s = students[focusCell.studentIndex];
        const se = schedule[focusCell.scheduleIndex];
        if (s && se) toggleCell(s.id, se.id);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [students, schedule, focusCell, attendanceMap, cellPending, selectedClass, date, undoStack, fetchSheet]);

  /* --- derived values --- */
  const totalStudents = students.length;

  /* --- small UI helpers --- */
  function formatTimeRange(entry) {
    if (!entry) return "";
    return `${entry.starts_at || ""}${entry.ends_at ? ` — ${entry.ends_at}` : ""}`;
  }

  /* --- Render --- */
  return (
    <div ref={containerRef} className="min-h-screen bg-slate-50 text-slate-800 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm bg-opacity-90 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <FaBook size={20} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Prise de présence</h1>
                <p className="text-xs text-slate-500">Construite « à la demande » pour la date sélectionnée</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
                <FaCalendarAlt className="text-slate-500" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-transparent text-sm outline-none"
                  aria-label="Date de la feuille"
                />
              </div>

              <div className="w-64">
                <select
                  className="w-full text-sm border-none bg-slate-50 rounded-lg py-2 px-3 text-slate-600 focus:ring-0 cursor-pointer"
                  value={selectedClass || ""}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  {classesLoading ? <option>Chargement...</option> : (
                    <>
                      <option value="" disabled>-- Choisir une classe --</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} · {c.level?.name}</option>)}
                    </>
                  )}
                </select>
              </div>

              <button
                onClick={() => fetchSheet(selectedClass, date)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow transition flex items-center gap-2 text-sm"
              >
                <FaSpinner className="animate-spin mr-1" /> Recharger
              </button>

              <button
                onClick={handleUndo}
                className="bg-white border border-slate-200 hover:bg-slate-50 px-3 py-2 rounded-lg flex items-center gap-2 text-sm"
                title="Annuler dernière action (Ctrl+Z)"
              >
                <FaUndo /> Annuler
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div className={`fixed bottom-5 right-5 z-50 px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 border animate-fadeIn cursor-pointer ${
            message.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-700'
        }`} onClick={() => setMessage(null)}>
          {message.type === 'error' ? <FaTimes /> : <FaCheck />}
          <span className="font-medium text-sm">{message.text}</span>
        </div>
      )}

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Empty state */}
        {(!selectedClass) ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
            Sélectionne une classe et une date pour construire la feuille de présence.
          </div>
        ) : loadingSheet ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
            Chargement de la feuille...
          </div>
        ) : schedule.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">
            Aucun cours prévu ce jour pour cette classe.
          </div>
        ) : (
          <div className="space-y-6">
            {/* course headers */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {schedule.map((entry, idx) => (
                <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{entry.subject}</div>
                      <h3 className="text-lg font-bold text-slate-800 mt-1">{formatTimeRange(entry)}</h3>
                      <div className="text-xs text-slate-500 mt-2">{entry.teacher || "Professeur N/A"}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={() => bulkMarkAbsent(entry.id)}
                        disabled={bulkSaving}
                        className="text-xs px-3 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100"
                        title="Marquer tous absents"
                      >
                        {bulkSaving ? <FaSpinner className="animate-spin" /> : "Tous absents"}
                      </button>
                      <div className="text-xs text-slate-400">{totalStudents} élèves</div>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-3 max-h-[42vh] overflow-y-auto">
                    {students.map((s, sIdx) => {
                      const rec = attendanceMap[s.id]?.[entry.id];
                      const pending = !!cellPending[cellKey(s.id, entry.id)];
                      const focused = focusCell.studentIndex === sIdx && focusCell.scheduleIndex === idx;
                      return (
                        <div
                          key={`${s.id}_${entry.id}`}
                          className={`flex items-center justify-between gap-3 p-2 rounded-lg mb-2 ${rec ? 'bg-red-50 border border-red-100' : 'bg-white border border-slate-100'} ${focused ? 'ring-2 ring-indigo-200' : ''} hover:shadow-sm`}
                          onClick={() => toggleCell(s.id, entry.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${rec ? 'bg-red-100 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              {rec ? <FaUserTimes /> : <FaUserCheck />}
                            </div>
                            <div>
                              <div className="font-medium text-sm text-slate-800">{renderName(s)}</div>
                              <div className="text-xs text-slate-400">{s.registration_number || ''}</div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {rec ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">{rec.status}</span>
                                <div className="relative">
                                  <select
                                    value={rec.status}
                                    onChange={(e) => changeStatus(s.id, entry.id, e.target.value)}
                                    disabled={pending}
                                    className="text-xs border-none bg-transparent cursor-pointer"
                                    title="Changer statut"
                                  >
                                    <option value="ABSENT">ABSENT</option>
                                    <option value="LATE">LATE</option>
                                    <option value="EXCUSED">EXCUSED</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div className="text-xs text-slate-400">Présent (par défaut)</div>
                            )}
                            <button
                              onClick={(ev) => { ev.stopPropagation(); toggleCell(s.id, entry.id); }}
                              disabled={pending}
                              title={rec ? "Marquer présent" : "Marquer absent"}
                              className={`p-2 rounded-md ${pending ? 'bg-slate-100' : rec ? 'bg-white hover:bg-red-50' : 'bg-white hover:bg-emerald-50'}`}
                            >
                              {pending ? <FaSpinner className="animate-spin" /> : (rec ? <FaTimes /> : <FaCheck />)}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* footer info */}
            <div className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-xl">
              <div className="text-sm text-slate-600">
                <strong>{students.length}</strong> élèves · <strong>{schedule.length}</strong> cours · Date : <strong>{date}</strong>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => fetchSheet(selectedClass, date)} className="px-3 py-2 bg-white border rounded-md">Recharger</button>
                <button onClick={() => { setDate(prev => shiftLocalDate(prev, -1)); }} className="px-3 py-2 bg-white border rounded-md"><FaChevronLeft /></button>
                <button onClick={() => { setDate(localDateISO(new Date())); }} className="px-3 py-2 bg-indigo-600 text-white rounded-md">Aujourd'hui</button>
                <button onClick={() => { setDate(prev => shiftLocalDate(prev, +1)); }} className="px-3 py-2 bg-white border rounded-md"><FaChevronRight /></button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.98);} to { opacity: 1; transform: scale(1);} }
        .animate-fadeIn { animation: fadeIn 0.18s ease-out forwards; }
      `}</style>
    </div>
  );
}

/* ----------------- Helpers ----------------- */

function renderName(p) {
  if (!p) return "Inconnu";
  if (p.user && (p.user.first_name || p.user.last_name)) return `${p.user.last_name || ''} ${p.user.first_name || ''}`.trim();
  if (p.first_name || p.last_name) return `${p.last_name || ''} ${p.first_name || ''}`.trim();
  return p.name || p.username || "Utilisateur";
}

function localDateISO(d) {
  // ensure local YYYY-MM-DD (not toISOString which uses UTC)
  const date = d instanceof Date ? d : new Date(d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function shiftLocalDate(isoDateStr, deltaDays) {
  const [y, m, d] = isoDateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return localDateISO(dt);
}
