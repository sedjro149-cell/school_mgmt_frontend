// src/pages/TimetableEditor.jsx
import React, { useEffect, useState, useRef } from "react";
import { FaBolt, FaCheck, FaUndo, FaDownload, FaExclamationTriangle } from "react-icons/fa";
import { fetchData, postData } from "./api";

/**
 * TimetableEditor
 * - Holding pool ("cards") for removed/moved entries
 * - Color-coded moved entries with origin info
 * - Local staging of operations (stagedOps) to send to backend (validate/apply)
 *
 * Endpoints used:
 * - GET /academics/slots/              -> [{ idx, day, start_time, end_time, label? }]
 * - GET /academics/timetable/?school_class=X  -> list of ClassScheduleEntry
 * - POST /academics/timetable-batch-validate/ -> { operations: [...] }
 * - POST /academics/timetable-batch-apply/    -> { operations: [...], persist: bool }
 *
 * NOTE: adapt endpoint names if différent. This is plug-and-play with les helpers fetchData/postData.
 */

const COLOR_CLASSES = [
  "border-yellow-400 bg-yellow-50",
  "border-green-400 bg-green-50",
  "border-indigo-400 bg-indigo-50",
  "border-pink-400 bg-pink-50",
  "border-purple-400 bg-purple-50",
  "border-rose-400 bg-rose-50",
  "border-sky-400 bg-sky-50",
];

function colorForId(id) {
  if (id == null) return COLOR_CLASSES[0];
  const n = typeof id === "number" ? id : id.toString().split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  return COLOR_CLASSES[Math.abs(n) % COLOR_CLASSES.length];
}

const TimetableEditor = ({ classId = null }) => {
  const [slots, setSlots] = useState([]); // list of slots (must include idx)
  const [entries, setEntries] = useState([]); // original entries from server
  const [grid, setGrid] = useState({}); // slot_idx -> entry
  const [holding, setHolding] = useState([]); // pooled entries removed from grid {entry, origin:{slot_idx,label}}
  const [stagedOps, setStagedOps] = useState([]); // operations to send
  const [validReport, setValidReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const dragRef = useRef(null);

  useEffect(() => {
    loadInitial();
  }, [classId]);

  const loadInitial = async () => {
    setLoading(true);
    try {
      // 1) fetch slots
      let slotsResp = [];
      try {
        const s = await fetchData("/academics/slots/");
        slotsResp = Array.isArray(s) ? s : s?.results ?? [];
      } catch (err) {
        // fallback: if missing, leave empty but warn
        console.warn("GET /academics/slots/ failed — ensure endpoint exists");
        slotsResp = [];
      }

      // 2) fetch timetable entries
      const url = classId ? `/academics/timetable/?school_class=${classId}` : "/academics/timetable/";
      const es = await fetchData(url);
      const list = Array.isArray(es) ? es : es?.results ?? [];

      // build grid by slot_idx when provided, else push to holding
      const g = {};
      const hold = [];
      for (const e of list) {
        if (e.slot_idx !== undefined && e.slot_idx !== null && slotsResp.some(s=>s.idx===e.slot_idx)) {
          g[e.slot_idx] = e;
        } else if (e.slot_idx !== undefined && e.slot_idx !== null) {
          // unknown slot_idx but present: still place it
          g[e.slot_idx] = e;
        } else {
          // no slot mapping: treat as holding
          hold.push({ entry: e, origin: null });
        }
      }

      setSlots(slotsResp);
      setEntries(list);
      setGrid(g);
      setHolding(hold);
      setStagedOps([]);
      setValidReport(null);
    } catch (err) {
      console.error("loadInitial", err);
    } finally {
      setLoading(false);
    }
  };

  // Drag handlers
  const onDragStart = (e, payload) => {
    // payload: { type: "grid"|"holding", entry }
    dragRef.current = payload;
    try { e.dataTransfer.setData("text/plain", JSON.stringify({ id: payload.entry.id })); } catch (err) {}
    // add visual cue
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const onDropOnSlot = (e, slotIdx) => {
    e.preventDefault();
    const dragged = dragRef.current;
    if (!dragged) return;
    const entry = dragged.entry;

    // If drop to same slot -> ignore
    const fromSlot = findSlotOfEntry(entry.id);
    if (fromSlot === slotIdx) {
      dragRef.current = null;
      return;
    }

    // apply local changes:
    setGrid(prev => {
      const next = { ...prev };
      // remove entry from old slot if existed
      if (fromSlot !== null && next[fromSlot] && next[fromSlot].id === entry.id) {
        delete next[fromSlot];
      } else {
        // if it was in holding, remove later
      }

      // if target occupied -> move occupant to holding (record its origin)
      if (next[slotIdx]) {
        const occupant = next[slotIdx];
        setHolding(h => [...h, { entry: occupant, origin: { slot_idx: slotIdx, label: slotLabel(slotIdx) } }]);
      }

      // place moved entry
      next[slotIdx] = { ...entry, slot_idx: slotIdx };
      return next;
    });

    // if it was in holding — remove it
    if (dragged.type === "holding") {
      setHolding(h => h.filter(x => x.entry.id !== entry.id));
    }

    // create or update staged op for this entry
    setStagedOps(ops => {
      // remove existing op for same entry
      const without = ops.filter(o => o.entry_id !== entry.id);
      // create op: include origin if we can find it
      const originSlot = fromSlot;
      const op = { entry_id: entry.id, from_slot_idx: originSlot, to_slot_idx: slotIdx, action: "move" };
      return [...without, op];
    });

    dragRef.current = null;
  };

  const slotLabel = (slotIdx) => {
    const s = slots.find(x => x.idx === slotIdx);
    return s ? (s.label ?? `J${s.day} ${s.start_time}-${s.end_time}`) : `slot ${slotIdx}`;
  };

  const findSlotOfEntry = (entryId) => {
    for (const key of Object.keys(grid)) {
      const e = grid[key];
      if (e && e.id === entryId) return Number(key);
    }
    return null;
  };

  // Suspend entry (remove from slot -> holding)
  const suspendEntry = (entryId) => {
    const from = findSlotOfEntry(entryId);
    if (from === null) return;
    setGrid(prev=> {
      const next = { ...prev };
      const e = next[from];
      if (e) {
        delete next[from];
        setHolding(h => [...h, { entry: e, origin: { slot_idx: from, label: slotLabel(from) } }]);
      }
      return next;
    });

    setStagedOps(ops => {
      const others = ops.filter(o => o.entry_id !== entryId);
      return [...others, { entry_id: entryId, from_slot_idx: from, action: "suspend" }];
    });
  };

  // Place from holding to a given slot
  const placeFromHolding = (entryId, slotIdx) => {
    const card = holding.find(h => h.entry.id === entryId);
    if (!card) return;
    // remove from holding & place
    setHolding(prev => prev.filter(h => h.entry.id !== entryId));
    setGrid(prev => {
      const next = { ...prev };
      if (next[slotIdx]) {
        setHolding(h => [...h, { entry: next[slotIdx], origin: { slot_idx: slotIdx, label: slotLabel(slotIdx) } }]);
      }
      next[slotIdx] = { ...card.entry, slot_idx: slotIdx };
      return next;
    });

    setStagedOps(ops => {
      const others = ops.filter(o => o.entry_id !== entryId);
      return [...others, { entry_id: entryId, from_slot_idx: card.origin?.slot_idx ?? null, to_slot_idx: slotIdx, action: "move_from_hold" }];
    });
  };

  // Remove a single holding card (revert to original place if origin exists, else leave as orphan)
  const revertHolding = (entryId) => {
    const card = holding.find(h => h.entry.id === entryId);
    if (!card) return;
    // try to return to origin slot if free
    const target = card.origin?.slot_idx;
    if (target != null && !grid[target]) {
      // place back
      setGrid(prev => ({ ...prev, [target]: card.entry }));
      setHolding(prev => prev.filter(h => h.entry.id !== entryId));
      // remove any staged ops for it
      setStagedOps(ops => ops.filter(o => o.entry_id !== entryId));
    } else {
      // simply remove staged ops and keep in holding (or delete from holding)
      setHolding(prev => prev.filter(h => h.entry.id !== entryId));
      setStagedOps(ops => ops.filter(o => o.entry_id !== entryId));
    }
  };

  // Undo last staged op (pop)
  const undoLast = () => {
    setStagedOps(ops => {
      const next = ops.slice(0, -1);
      rebuildFromOps(next);
      return next;
    });
  };

  // Reset all edits (rebuild original)
  const resetAll = () => {
    loadInitial();
  };

  // Rebuild grid/holding from original entries + ops
  const rebuildFromOps = (ops) => {
    const g = {};
    const hold = [];
    for (const e of entries) {
      if (e.slot_idx !== undefined && e.slot_idx !== null) g[e.slot_idx] = e;
      else hold.push({ entry: e, origin: null });
    }

    // apply ops sequentially
    for (const op of ops) {
      const eid = op.entry_id;
      if (op.action === "suspend") {
        // find and remove from grid
        for (const k of Object.keys(g)) {
          if (g[k] && g[k].id === eid) {
            hold.push({ entry: g[k], origin: { slot_idx: Number(k), label: slotLabel(Number(k)) } });
            delete g[k];
            break;
          }
        }
      } else {
        const to = op.to_slot_idx;
        // remove entry from any slot if present
        for (const k of Object.keys(g)) {
          if (g[k] && g[k].id === eid) {
            delete g[k];
            break;
          }
        }
        // remove from holding if present
        const idxh = hold.findIndex(h => h.entry.id === eid);
        const ent = idxh >= 0 ? hold.splice(idxh,1)[0].entry : entries.find(x => x.id === eid);
        // if target occupied -> move occupant to holding
        if (g[to]) {
          hold.push({ entry: g[to], origin: { slot_idx: to, label: slotLabel(to) } });
        }
        g[to] = { ...ent, slot_idx: to };
      }
    }

    setGrid(g);
    setHolding(hold);
  };

  // Download current stagedOps + preview
  const downloadReport = (obj) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(obj, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `timetable_staged_${new Date().toISOString()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  // Validate stagedOps (dry-run)
  const handleValidate = async () => {
    setValidReport(null);
    setRunning(true);
    try {
      const payload = { operations: stagedOps };
      const res = await postData("/academics/timetable-batch-validate/", payload);
      setValidReport(res);
    } catch (err) {
      console.error("validate", err);
      setValidReport({ error: err?.message || String(err) });
    } finally {
      setRunning(false);
    }
  };

  // Apply stagedOps. persist=true attempts DB write; backend must enforce staff permission.
  const handleApply = async (persist = false) => {
    setRunning(true);
    try {
      const payload = { operations: stagedOps, persist: !!persist };
      const res = await postData("/academics/timetable-batch-apply/", payload);
      // if persist true and success -> reload new state
      if (persist && !res?.error) {
        await loadInitial();
        setStagedOps([]);
        setValidReport(res);
      } else {
        setValidReport(res);
      }
    } catch (err) {
      console.error("apply", err);
      setValidReport({ error: err?.message || String(err) });
    } finally {
      setRunning(false);
    }
  };

  if (loading) {
    return <div className="p-6">Chargement emploi du temps…</div>;
  }

  // Helper to render entry card
  const EntryCard = ({ entry, small=false, showOrigin=false }) => {
    const color = colorForId(entry.id);
    const origin = holding.find(h => h.entry.id === entry.id)?.origin;
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, { type: findHoldingType(entry.id), entry })}
        className={`p-2 rounded border-l-4 ${color} cursor-grab`}
      >
        <div className="font-medium text-sm">{entry.subject?.name ?? entry.subject_id}</div>
        <div className="text-xs text-gray-600">{entry.teacher?.user?.first_name ? `${entry.teacher.user.first_name} ${entry.teacher.user.last_name}` : entry.teacher?.id ?? "-"}</div>
        <div className="text-xs text-gray-400">id:{entry.id}</div>
        { showOrigin && origin && <div className="mt-1 text-xs text-gray-500">orig: {origin.label}</div>}
      </div>
    );
  };

  const findHoldingType = (entryId) => {
    // if entry is in holding, type 'holding' else 'grid'
    return holding.some(h => h.entry.id === entryId) ? "holding" : "grid";
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <header className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">Éditeur d'emploi du temps — édition visuelle</h1>
          <p className="text-sm text-gray-600">Déplace une séance → elle ira dans la zone "Holding" (suspendues) si nécessaire. Les cartes déplacées sont colorées et affichent leur origine.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleValidate} disabled={stagedOps.length === 0 || running} className="px-3 py-2 bg-yellow-400 rounded flex items-center gap-2">
            <FaExclamationTriangle /> Valider (dry-run)
          </button>
          <button onClick={() => handleApply(false)} disabled={stagedOps.length === 0 || running} className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2">
            <FaBolt /> Simuler apply
          </button>
          <button onClick={() => handleApply(true)} disabled={stagedOps.length === 0 || running} className="px-3 py-2 bg-red-600 text-white rounded flex items-center gap-2">
            <FaCheck /> Appliquer (persist)
          </button>
          <button onClick={undoLast} disabled={stagedOps.length===0} className="px-2 py-1 border rounded">Undo</button>
          <button onClick={resetAll} className="px-2 py-1 border rounded">Reset</button>
        </div>
      </header>

      <main className="flex gap-6">
        {/* Grid area (left) */}
        <section className="flex-1 bg-white p-4 rounded shadow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Grille</h2>
            <div className="text-xs text-gray-500">Slots: {slots.length}</div>
          </div>

          {/* Simple grid: renders slots in order (you can adapt layout to weekdays) */}
          <div className="grid grid-cols-4 gap-3">
            {slots.length === 0 && <div className="col-span-4 text-sm text-gray-500">Aucun endpoint slots exposé — vérifie /academics/slots/</div>}
            {slots.map(slot => {
              const occupant = grid[slot.idx];
              return (
                <div key={slot.idx} className="border rounded p-2 min-h-[84px] bg-gray-50"
                     onDragOver={onDragOver}
                     onDrop={(e)=>onDropOnSlot(e, slot.idx)}
                >
                  <div className="text-xs text-gray-600 mb-2">{slot.label ?? `J${slot.day} ${slot.start_time}-${slot.end_time}`}</div>
                  { occupant ? (
                    <div>
                      <div className="mb-2">
                        <EntryCard entry={occupant} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => suspendEntry(occupant.id)} className="text-xs px-2 py-1 border rounded">Suspendre</button>
                        <button onClick={() => {
                          // quick move: pick first free slot (demo) - not recommended
                          const free = slots.find(s => !grid[s.idx]);
                          if (free) placeFromHolding(occupant.id, free.idx);
                        }} className="text-xs px-2 py-1 border rounded">Déplacer (auto)</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400">Vide — drop ici</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Holding + ops (right) */}
        <aside className="w-96">
          <div className="bg-white p-4 rounded shadow mb-4">
            <h3 className="font-semibold mb-2">Holding — suspendues / déplacées ({holding.length})</h3>

            {holding.length === 0 ? (
              <div className="text-sm text-gray-500">Aucune entrée suspendue</div>
            ) : (
              <div className="space-y-3 max-h-[48vh] overflow-auto">
                {holding.map((card, idx) => (
                  <div key={card.entry.id} className={`p-3 rounded border ${colorForId(card.entry.id)} flex justify-between items-start`}>
                    <div>
                      <div className="font-medium">{card.entry.subject?.name ?? card.entry.subject_id}</div>
                      <div className="text-xs text-gray-600">{card.entry.teacher?.user?.first_name ? `${card.entry.teacher.user.first_name} ${card.entry.teacher.user.last_name}` : card.entry.teacher?.id ?? "-"}</div>
                      <div className="text-xs text-gray-500 mt-1">orig: {card.origin?.label ?? "inconnu"}</div>
                      <div className="text-xs text-gray-400">id:{card.entry.id}</div>
                    </div>

                    <div className="flex flex-col gap-2 ml-2">
                      <button title="Placer sur premier slot libre" onClick={() => {
                        const free = slots.find(s=> !grid[s.idx]);
                        if (free) placeFromHolding(card.entry.id, free.idx);
                        else alert("Aucun slot libre détecté — drop manuellement sur une case.");
                      }} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Poser</button>

                      <button title="Revert to origin if possible" onClick={() => revertHolding(card.entry.id)} className="px-2 py-1 border rounded text-xs">Revert</button>

                      <button title="drag me" draggable onDragStart={(e)=>onDragStart(e, { type: "holding", entry: card.entry })} className="px-2 py-1 border rounded text-xs">Drag</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h4 className="font-semibold mb-2">Opérations en attente ({stagedOps.length})</h4>
            <pre className="text-xs max-h-40 overflow-auto bg-gray-50 p-2 rounded">{JSON.stringify(stagedOps, null, 2)}</pre>

            <div className="mt-3 flex gap-2">
              <button onClick={() => downloadReport({ stagedOps, previewGrid: grid })} className="px-2 py-1 border rounded text-xs">Télécharger</button>
              <button onClick={() => { setStagedOps([]); rebuildFromOps([]); }} className="px-2 py-1 border rounded text-xs">Clear</button>
            </div>

            <div className="mt-4">
              <h5 className="font-medium">Rapport validation</h5>
              { validReport ? (
                <div className="text-xs mt-2">
                  { validReport.error ? (
                    <div className="text-red-600">Erreur: {String(validReport.error)}</div>
                  ) : (
                    <>
                      <div className="text-sm">Valid: {String(validReport.valid ?? "—")}</div>
                      <div className="text-xs text-gray-600 mt-2">Détails / suggestions:</div>
                      <pre className="text-xs max-h-32 overflow-auto bg-gray-50 p-2 rounded mt-2">{JSON.stringify(validReport, null, 2)}</pre>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-xs text-gray-500 mt-2">Aucune validation effectuée</div>
              )}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
};

export default TimetableEditor;
