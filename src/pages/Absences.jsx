import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FaCalendarAlt, FaChevronLeft, FaChevronRight, FaCheck,
  FaTimes, FaUndo, FaSpinner, FaUserCheck, FaUserTimes,
  FaLockOpen, FaLock, FaBan, FaChevronDown, FaChevronUp,
  FaBell, FaRedo,
} from "react-icons/fa";
import { fetchData, postData, patchData, deleteData } from "./api";

// ─── constants ───────────────────────────────────────────────────────────────

const STATUS_META = {
  PRESENT: { label: "Présent",  bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-100", dot: "bg-emerald-400" },
  ABSENT:  { label: "Absent",   bg: "bg-red-50",      text: "text-red-700",     border: "border-red-100",     dot: "bg-red-400"     },
  LATE:    { label: "Retard",   bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-100",   dot: "bg-amber-400"   },
  EXCUSED: { label: "Excusé",   bg: "bg-sky-50",      text: "text-sky-700",     border: "border-sky-100",     dot: "bg-sky-400"     },
};

const SESSION_STATUS_META = {
  OPEN:      { label: "En cours",    bg: "bg-indigo-50", text: "text-indigo-700", icon: <FaLockOpen size={10} /> },
  SUBMITTED: { label: "Validé",      bg: "bg-emerald-50", text: "text-emerald-700", icon: <FaLock size={10} /> },
  CANCELLED: { label: "Annulé",      bg: "bg-slate-100",  text: "text-slate-500",   icon: <FaBan size={10} /> },
};

const NON_PRESENT = ["ABSENT", "LATE", "EXCUSED"];
const weekdays    = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

// ─── AttendanceSheet ─────────────────────────────────────────────────────────

export default function AttendanceSheet() {
  const [classes,        setClasses]        = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [selectedClass,  setSelectedClass]  = useState("");
  const [date,           setDate]           = useState(localDateISO(new Date()));
  const [slots,          setSlots]          = useState([]);   // [{ entry, session, students }]
  const [loadingSheet,   setLoadingSheet]   = useState(false);
  const [toast,          setToast]          = useState(null); // { type, text }
  const [undoStack,      setUndoStack]      = useState([]);
  const [pendingCells,   setPendingCells]   = useState({});  // key: `${sessionId}_${studentId}`
  const [pendingSession, setPendingSession] = useState({}); // sessionId: bool
  const [expandedSlots,  setExpandedSlots]  = useState({}); // slotIndex: bool
  const toastTimer = useRef(null);

  // ── toast helper ─────────────────────────────────────────────────────────
  const showToast = useCallback((type, text) => {
    setToast({ type, text });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  // ── load classes ─────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setClassesLoading(true);
      try {
        const data = await fetchData("/academics/school-classes/");
        const arr  = Array.isArray(data) ? data : data?.results ?? [];
        setClasses(arr);
        if (arr.length > 0) setSelectedClass(arr[0].id);
      } catch {
        showToast("error", "Impossible de charger les classes.");
      } finally {
        setClassesLoading(false);
      }
    };
    load();
  }, [showToast]);

  // ── fetch daily sheet ─────────────────────────────────────────────────────
  const fetchSheet = useCallback(async (classId, isoDate) => {
    if (!classId) return;
    setLoadingSheet(true);
    try {
      const res = await fetchData(
        `/academics/attendance/daily-sheet/?class_id=${encodeURIComponent(classId)}&date=${encodeURIComponent(isoDate)}`
      );
      const rawSlots = Array.isArray(res.slots) ? res.slots : [];
      setSlots(rawSlots);
      // expand first OPEN slot by default
      const firstOpen = rawSlots.findIndex(s => s.session?.status === "OPEN");
      setExpandedSlots({ [firstOpen >= 0 ? firstOpen : 0]: true });
    } catch {
      showToast("error", "Impossible de charger la feuille de présence.");
      setSlots([]);
    } finally {
      setLoadingSheet(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedClass) fetchSheet(selectedClass, date);
  }, [selectedClass, date, fetchSheet]);

  // ── cell pending helpers ──────────────────────────────────────────────────
  const cellKey  = (sessionId, studentId) => `${sessionId}_${studentId}`;
  const isBusy   = (sessionId, studentId) => !!pendingCells[cellKey(sessionId, studentId)];
  const setBusy  = (sessionId, studentId, val) =>
    setPendingCells(p => ({ ...p, [cellKey(sessionId, studentId)]: val }));

  // ── update slots state immutably ──────────────────────────────────────────
  const updateStudentInSlot = (slotIdx, studentId, updater) => {
    setSlots(prev => prev.map((slot, i) => {
      if (i !== slotIdx) return slot;
      return {
        ...slot,
        students: slot.students.map(s =>
          s.id === studentId ? updater(s) : s
        ),
      };
    }));
  };

  const updateSessionInSlot = (slotIdx, updater) => {
    setSlots(prev => prev.map((slot, i) =>
      i !== slotIdx ? slot : { ...slot, session: updater(slot.session) }
    ));
  };

  // ── toggle absent / present ───────────────────────────────────────────────
  const toggleAbsence = async (slotIdx, student) => {
    const slot      = slots[slotIdx];
    const session   = slot.session;
    const sessionId = session.id;

    if (!session.is_editable) return showToast("info", "Session soumise. Demandez une réouverture.");
    if (isBusy(sessionId, student.id)) return;

    setBusy(sessionId, student.id, true);

    if (student.status === "PRESENT") {
      // mark absent: POST new absence
      const prev = { ...student };
      updateStudentInSlot(slotIdx, student.id, s => ({ ...s, status: "ABSENT", absence_id: "temp" }));
      try {
        const res = await postData("/academics/attendance/absences/", {
          session: sessionId,
          student: student.id,
          status:  "ABSENT",
        });
        updateStudentInSlot(slotIdx, student.id, s => ({ ...s, absence_id: res.id, status: res.status }));
        pushUndo({ type: "marked_absent", slotIdx, studentId: student.id, absenceId: res.id, prev });
        showToast("success", `${student.name} — Absent.`);
      } catch {
        updateStudentInSlot(slotIdx, student.id, () => prev);
        showToast("error", "Échec enregistrement.");
      }
    } else {
      // restore present: DELETE absence
      const prev = { ...student };
      updateStudentInSlot(slotIdx, student.id, s => ({ ...s, status: "PRESENT", absence_id: null }));
      try {
        await deleteData(`/academics/attendance/absences/${student.absence_id}/`);
        pushUndo({ type: "restored_present", slotIdx, studentId: student.id, prev });
        showToast("success", `${student.name} — Présent.`);
      } catch {
        updateStudentInSlot(slotIdx, student.id, () => prev);
        showToast("error", "Échec suppression.");
      }
    }
    setBusy(sessionId, student.id, false);
  };

  // ── change status (ABSENT → LATE | EXCUSED) ───────────────────────────────
  const changeStatus = async (slotIdx, student, newStatus) => {
    const slot      = slots[slotIdx];
    const session   = slot.session;
    if (!session.is_editable) return showToast("info", "Session soumise.");
    if (!student.absence_id || String(student.absence_id) === "temp") return;

    const prev = { ...student };
    updateStudentInSlot(slotIdx, student.id, s => ({ ...s, status: newStatus }));
    try {
      await patchData(`/academics/attendance/absences/${student.absence_id}/`, { status: newStatus });
      pushUndo({ type: "status_changed", slotIdx, studentId: student.id, prev });
    } catch {
      updateStudentInSlot(slotIdx, student.id, () => prev);
      showToast("error", "Impossible de modifier le statut.");
    }
  };

  // ── mark all absent for a slot ────────────────────────────────────────────
  const markAllAbsent = async (slotIdx) => {
    const slot    = slots[slotIdx];
    const session = slot.session;
    if (!session.is_editable) return showToast("info", "Session soumise.");

    const toMark = slot.students.filter(s => s.status === "PRESENT");
    if (!toMark.length) return showToast("info", "Tous déjà marqués.");

    const prevStudents = [...slot.students];
    // optimistic
    setSlots(prev => prev.map((s, i) => i !== slotIdx ? s : {
      ...s,
      students: s.students.map(st =>
        st.status === "PRESENT" ? { ...st, status: "ABSENT", absence_id: "temp" } : st
      ),
    }));

    const results = await Promise.allSettled(
      toMark.map(s => postData("/academics/attendance/absences/", {
        session: session.id, student: s.id, status: "ABSENT",
      }))
    );

    let ok = 0;
    setSlots(prev => prev.map((sl, i) => {
      if (i !== slotIdx) return sl;
      const studentsCopy = [...sl.students];
      toMark.forEach((s, idx) => {
        const r = results[idx];
        const pos = studentsCopy.findIndex(st => st.id === s.id);
        if (pos === -1) return;
        if (r.status === "fulfilled") {
          studentsCopy[pos] = { ...studentsCopy[pos], absence_id: r.value.id, status: r.value.status };
          ok++;
        } else {
          studentsCopy[pos] = prevStudents.find(ps => ps.id === s.id) || studentsCopy[pos];
        }
      });
      return { ...sl, students: studentsCopy };
    }));

    pushUndo({ type: "bulk_absent", slotIdx, prevStudents });
    showToast(ok === toMark.length ? "success" : "info", `${ok}/${toMark.length} absences enregistrées.`);
  };

  // ── submit session ─────────────────────────────────────────────────────────
  const submitSession = async (slotIdx) => {
    const session = slots[slotIdx].session;
    if (!session.is_editable) return;
    setPendingSession(p => ({ ...p, [session.id]: true }));
    try {
      await postData(`/academics/attendance/sessions/${session.id}/submit/`, {});
      updateSessionInSlot(slotIdx, s => ({ ...s, status: "SUBMITTED", is_editable: false }));
      showToast("success", "Session validée. Notifications envoyées aux parents.");
    } catch (e) {
      showToast("error", e?.body?.detail ?? "Impossible de valider la session.");
    } finally {
      setPendingSession(p => ({ ...p, [session.id]: false }));
    }
  };

  // ── reopen session (admin) ────────────────────────────────────────────────
  const reopenSession = async (slotIdx) => {
    const session = slots[slotIdx].session;
    setPendingSession(p => ({ ...p, [session.id]: true }));
    try {
      await postData(`/academics/attendance/sessions/${session.id}/reopen/`, {});
      updateSessionInSlot(slotIdx, s => ({ ...s, status: "OPEN", is_editable: true }));
      showToast("success", "Session réouverte.");
    } catch (e) {
      showToast("error", e?.body?.detail ?? "Impossible de rouvrir.");
    } finally {
      setPendingSession(p => ({ ...p, [session.id]: false }));
    }
  };

  // ── cancel session ────────────────────────────────────────────────────────
  const cancelSession = async (slotIdx) => {
    if (!window.confirm("Annuler ce cours ? Aucune présence ne sera comptabilisée.")) return;
    const session = slots[slotIdx].session;
    setPendingSession(p => ({ ...p, [session.id]: true }));
    try {
      await postData(`/academics/attendance/sessions/${session.id}/cancel/`, {});
      updateSessionInSlot(slotIdx, s => ({ ...s, status: "CANCELLED", is_editable: false }));
      showToast("info", "Session annulée.");
    } catch (e) {
      showToast("error", e?.body?.detail ?? "Impossible d'annuler.");
    } finally {
      setPendingSession(p => ({ ...p, [session.id]: false }));
    }
  };

  // ── undo ──────────────────────────────────────────────────────────────────
  const pushUndo = (action) => setUndoStack(s => [action, ...s].slice(0, 30));
  const popUndo  = ()       => setUndoStack(s => s.slice(1));

  const handleUndo = async () => {
    if (!undoStack.length) return showToast("info", "Rien à annuler.");
    const action = undoStack[0];
    popUndo();

    if (action.type === "marked_absent") {
      const { slotIdx, studentId, absenceId, prev } = action;
      updateStudentInSlot(slotIdx, studentId, () => prev);
      try { await deleteData(`/academics/attendance/absences/${absenceId}/`); }
      catch { showToast("error", "Undo impossible."); }
    } else if (action.type === "restored_present") {
      const { slotIdx, studentId, prev } = action;
      updateStudentInSlot(slotIdx, studentId, () => prev);
      try {
        const session = slots[slotIdx].session;
        const res = await postData("/academics/attendance/absences/", {
          session: session.id, student: studentId, status: prev.status,
        });
        updateStudentInSlot(slotIdx, studentId, s => ({ ...s, absence_id: res.id }));
      } catch { showToast("error", "Undo impossible."); }
    } else if (action.type === "status_changed") {
      const { slotIdx, studentId, prev } = action;
      const student = slots[slotIdx].students.find(s => s.id === studentId);
      if (student?.absence_id) {
        updateStudentInSlot(slotIdx, studentId, () => prev);
        try { await patchData(`/academics/attendance/absences/${student.absence_id}/`, { status: prev.status }); }
        catch { showToast("error", "Undo impossible."); }
      }
    } else if (action.type === "bulk_absent") {
      // full refetch is safest
      await fetchSheet(selectedClass, date);
    }
    showToast("success", "Action annulée.");
  };

  // ── keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const active = document.activeElement;
      if (active && ["INPUT", "SELECT", "TEXTAREA"].includes(active.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undoStack, handleUndo]);

  // ── derived ───────────────────────────────────────────────────────────────
  const totalAbsentToday = slots.reduce((sum, slot) => {
    const submitted = slot.session?.status === "SUBMITTED";
    if (!submitted) return sum;
    return sum + slot.students.filter(s => NON_PRESENT.includes(s.status)).length;
  }, 0);

  const submittedCount = slots.filter(s => s.session?.status === "SUBMITTED").length;

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 pb-20" style={{ fontFamily: "'DM Sans', 'Manrope', sans-serif" }}>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3">

          {/* title */}
          <div className="flex items-center gap-3 mr-auto">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow">
              <FaUserCheck className="text-white" size={15} />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 leading-none">Prise de présence</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {slots.length > 0
                  ? `${weekdays[new Date(date + "T12:00").getDay() === 0 ? 6 : new Date(date + "T12:00").getDay() - 1]} · ${slots.length} cours`
                  : "Aucun cours"}
              </div>
            </div>
          </div>

          {/* date nav */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            <button onClick={() => setDate(d => shiftDate(d, -1))}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition text-slate-500">
              <FaChevronLeft size={11} />
            </button>
            <div className="relative flex items-center gap-2 px-2">
              <FaCalendarAlt className="text-slate-400" size={12} />
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-700 outline-none w-[130px] cursor-pointer" />
            </div>
            <button onClick={() => setDate(localDateISO(new Date()))}
              className="text-[11px] px-2 py-1.5 rounded-md bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition">
              Auj.
            </button>
            <button onClick={() => setDate(d => shiftDate(d, +1))}
              className="p-1.5 rounded-md hover:bg-white hover:shadow-sm transition text-slate-500">
              <FaChevronRight size={11} />
            </button>
          </div>

          {/* class selector */}
          <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 outline-none focus:border-indigo-400 min-w-[180px]">
            {classesLoading
              ? <option>Chargement...</option>
              : classes.map(c => <option key={c.id} value={c.id}>{c.name}{c.level?.name ? ` · ${c.level.name}` : ""}</option>)
            }
          </select>

          {/* undo */}
          <button onClick={handleUndo} disabled={!undoStack.length}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition">
            <FaUndo size={11} /> Annuler
          </button>
        </div>

        {/* progress bar */}
        {slots.length > 0 && (
          <div className="max-w-6xl mx-auto px-4 pb-2 flex items-center gap-3">
            <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${slots.length ? (submittedCount / slots.length) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-400 whitespace-nowrap">
              {submittedCount}/{slots.length} validés
              {totalAbsentToday > 0 && ` · ${totalAbsentToday} absent${totalAbsentToday > 1 ? "s" : ""}`}
            </span>
          </div>
        )}
      </div>

      {/* ── MAIN ────────────────────────────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 py-6">

        {!selectedClass && (
          <EmptyState icon={<FaCalendarAlt size={28} />} text="Sélectionne une classe pour commencer." />
        )}

        {selectedClass && loadingSheet && (
          <EmptyState icon={<FaSpinner className="animate-spin" size={24} />} text="Chargement..." />
        )}

        {selectedClass && !loadingSheet && slots.length === 0 && (
          <EmptyState icon={<FaCalendarAlt size={28} />} text="Aucun cours prévu ce jour pour cette classe." />
        )}

        {!loadingSheet && slots.length > 0 && (
          <div className="space-y-3">
            {slots.map((slot, slotIdx) => (
              <SlotCard
                key={slot.session?.id ?? slotIdx}
                slotIdx={slotIdx}
                slot={slot}
                expanded={!!expandedSlots[slotIdx]}
                onToggleExpand={() => setExpandedSlots(p => ({ ...p, [slotIdx]: !p[slotIdx] }))}
                pendingCells={pendingCells}
                sessionPending={!!pendingSession[slot.session?.id]}
                isBusy={isBusy}
                onToggleAbsence={toggleAbsence}
                onChangeStatus={changeStatus}
                onMarkAllAbsent={markAllAbsent}
                onSubmit={submitSession}
                onReopen={reopenSession}
                onCancel={cancelSession}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── TOAST ───────────────────────────────────────────────────────── */}
      {toast && (
        <div onClick={() => setToast(null)}
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium cursor-pointer transition-all
            ${toast.type === "error"   ? "bg-red-50 border-red-200 text-red-800" :
              toast.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" :
                                          "bg-slate-50 border-slate-200 text-slate-700"}`}>
          {toast.type === "error" ? <FaTimes size={12} /> :
           toast.type === "success" ? <FaCheck size={12} /> : <FaBell size={12} />}
          {toast.text}
        </div>
      )}
    </div>
  );
}

// ─── SlotCard ────────────────────────────────────────────────────────────────

function SlotCard({
  slotIdx, slot, expanded, onToggleExpand,
  isBusy, onToggleAbsence, onChangeStatus,
  onMarkAllAbsent, onSubmit, onReopen, onCancel,
  sessionPending,
}) {
  const { entry, session, students } = slot;
  const statusMeta  = SESSION_STATUS_META[session?.status] ?? SESSION_STATUS_META.OPEN;
  const isEditable  = session?.is_editable;
  const isSubmitted = session?.status === "SUBMITTED";
  const isCancelled = session?.status === "CANCELLED";

  const absentCount  = students.filter(s => s.status === "ABSENT").length;
  const lateCount    = students.filter(s => s.status === "LATE").length;
  const excusedCount = students.filter(s => s.status === "EXCUSED").length;
  const presentCount = students.filter(s => s.status === "PRESENT").length;
  const total        = students.length;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all
      ${isSubmitted ? "border-emerald-200" : isCancelled ? "border-slate-200 opacity-60" : "border-slate-200"}`}>

      {/* ── slot header ─── */}
      <div
        className={`flex items-center gap-4 px-5 py-4 cursor-pointer select-none
          ${isSubmitted ? "bg-emerald-50/50" : isCancelled ? "bg-slate-50" : "bg-white"}`}
        onClick={onToggleExpand}
      >
        {/* time + subject */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-slate-800">{entry?.subject ?? "—"}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${statusMeta.bg} ${statusMeta.text}`}>
              {statusMeta.icon} {statusMeta.label}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
            <span>{entry?.starts_at?.slice(0,5)} — {entry?.ends_at?.slice(0,5)}</span>
            <span>{entry?.teacher}</span>
          </div>
        </div>

        {/* pill counters */}
        <div className="hidden sm:flex items-center gap-1.5">
          {absentCount  > 0 && <Pill n={absentCount}  label="abs" color="red" />}
          {lateCount    > 0 && <Pill n={lateCount}    label="ret" color="amber" />}
          {excusedCount > 0 && <Pill n={excusedCount} label="exc" color="sky" />}
          <Pill n={presentCount} label="prés" color="emerald" />
        </div>

        {/* chevron */}
        <div className="text-slate-400">
          {expanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </div>
      </div>

      {/* ── expanded content ─── */}
      {expanded && !isCancelled && (
        <div>
          {/* toolbar */}
          <div className="px-5 py-3 border-t border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-2">
            {isEditable && (
              <>
                <button onClick={() => onMarkAllAbsent(slotIdx)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 font-medium hover:bg-red-100 transition flex items-center gap-1.5">
                  <FaUserTimes size={11} /> Tous absents
                </button>
                <div className="flex-1" />
                <button onClick={() => onCancel(slotIdx)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200 transition">
                  Cours annulé
                </button>
                <button
                  onClick={() => onSubmit(slotIdx)}
                  disabled={sessionPending}
                  className="text-xs px-4 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow disabled:opacity-60">
                  {sessionPending
                    ? <><FaSpinner className="animate-spin" size={11} /> Validation...</>
                    : <><FaBell size={11} /> Valider & notifier</>}
                </button>
              </>
            )}
            {isSubmitted && (
              <>
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                  <FaCheck size={10} /> Validé — parents notifiés
                </span>
                <div className="flex-1" />
                <button onClick={() => onReopen(slotIdx)} disabled={sessionPending}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition flex items-center gap-1.5 disabled:opacity-60">
                  {sessionPending ? <FaSpinner className="animate-spin" size={11} /> : <FaRedo size={11} />} Rouvrir
                </button>
              </>
            )}
          </div>

          {/* student list */}
          <div className="divide-y divide-slate-50">
            {students.map(student => (
              <StudentRow
                key={student.id}
                student={student}
                isEditable={isEditable}
                busy={isBusy(session.id, student.id)}
                onToggle={() => onToggleAbsence(slotIdx, student)}
                onChangeStatus={(newStatus) => onChangeStatus(slotIdx, student, newStatus)}
              />
            ))}
          </div>

          {/* slot footer */}
          <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
            <span><strong className="text-slate-600">{total}</strong> élèves</span>
            <span><strong className="text-emerald-600">{presentCount}</strong> présents</span>
            {absentCount > 0 && <span><strong className="text-red-600">{absentCount}</strong> absents</span>}
            {lateCount > 0 && <span><strong className="text-amber-600">{lateCount}</strong> retards</span>}
            {excusedCount > 0 && <span><strong className="text-sky-600">{excusedCount}</strong> excusés</span>}
          </div>
        </div>
      )}

      {expanded && isCancelled && (
        <div className="px-5 py-6 text-center text-sm text-slate-400 border-t border-slate-100">
          Ce cours a été annulé. Aucune présence comptabilisée.
        </div>
      )}
    </div>
  );
}

// ─── StudentRow ───────────────────────────────────────────────────────────────

function StudentRow({ student, isEditable, busy, onToggle, onChangeStatus }) {
  const isPresent = student.status === "PRESENT";
  const meta      = STATUS_META[student.status] ?? STATUS_META.PRESENT;

  return (
    <div className={`flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/60
      ${!isPresent ? meta.bg : ""}`}>

      {/* avatar dot */}
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${meta.dot}`} />

      {/* name */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm font-medium ${!isPresent ? meta.text : "text-slate-700"}`}>
          {student.name}
        </span>
      </div>

      {/* status label or selector */}
      {!isPresent ? (
        isEditable ? (
          <select
            value={student.status}
            onChange={e => { e.stopPropagation(); onChangeStatus(e.target.value); }}
            onClick={e => e.stopPropagation()}
            className={`text-xs border rounded-lg px-2 py-1 font-semibold outline-none cursor-pointer ${meta.bg} ${meta.text} ${meta.border}`}>
            <option value="ABSENT">Absent</option>
            <option value="LATE">Retard</option>
            <option value="EXCUSED">Excusé</option>
          </select>
        ) : (
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${meta.bg} ${meta.text}`}>
            {meta.label}
          </span>
        )
      ) : (
        <span className="text-xs text-slate-400">Présent</span>
      )}

      {/* toggle button */}
      {isEditable && (
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          disabled={busy}
          title={isPresent ? "Marquer absent" : "Marquer présent"}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition flex-shrink-0
            ${busy ? "bg-slate-100" :
              isPresent ? "bg-slate-100 hover:bg-red-100 hover:text-red-600 text-slate-400" :
                          "bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-600 text-slate-400"}`}>
          {busy
            ? <FaSpinner className="animate-spin" size={11} />
            : isPresent ? <FaUserTimes size={11} /> : <FaUserCheck size={11} />}
        </button>
      )}
    </div>
  );
}

// ─── small shared components ──────────────────────────────────────────────────

function Pill({ n, label, color }) {
  const colors = {
    red:     "bg-red-100 text-red-700",
    amber:   "bg-amber-100 text-amber-700",
    sky:     "bg-sky-100 text-sky-700",
    emerald: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${colors[color] ?? ""}`}>
      {n} {label}
    </span>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 flex flex-col items-center gap-4">
      <div className="text-slate-300">{icon}</div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ─── date helpers ─────────────────────────────────────────────────────────────

function localDateISO(d) {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function shiftDate(isoStr, delta) {
  const [y, m, d] = isoStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return localDateISO(dt);
}