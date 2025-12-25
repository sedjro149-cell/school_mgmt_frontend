// src/pages/GenerateTimetable.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  FaPlay,
  FaDownload,
  FaBolt,
  FaExclamationTriangle,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaFilter,
  FaClock,
  FaMapMarkerAlt
} from "react-icons/fa";
import { fetchData, postData } from "./api";

// =============================================================================
// 1. UTILITAIRES & COMPOSANTS STATIQUES
// =============================================================================

const weekdays = [
  { value: 1, label: "Lundi" },
  { value: 2, label: "Mardi" },
  { value: 3, label: "Mercredi" },
  { value: 4, label: "Jeudi" },
  { value: 5, label: "Vendredi" },
  { value: 6, label: "Samedi" },
];

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
}

const ExplainBox = ({ children, title = "Explication", icon }) => (
  <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex gap-3 items-start mb-4">
    <div className="text-blue-600 mt-1 text-lg">{icon}</div>
    <div className="flex-1">
      <div className="text-sm font-bold text-gray-800">{title}</div>
      <div className="text-sm text-gray-700 mt-1 leading-relaxed">{children}</div>
    </div>
  </div>
);

const SmallStat = ({ label, value, color = "text-gray-700" }) => (
  <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col min-w-[120px]">
    <div className={`text-xs font-bold uppercase tracking-wider ${color}`}>{label}</div>
    <div className="text-2xl font-extrabold mt-1 text-gray-800">{value ?? "—"}</div>
  </div>
);

/**
 * Logique d'interprétation du rapport backend (restaurée à l'originale)
 */
const interpretReport = (report) => {
  if (!report) return null;

  // 1) Pipeline detect_and_resolve
  if (report.detected_before || report.detected_after || report.resolve_report) {
    const before = report.detected_before ?? report.detected;
    const resolve = report.resolve_report ?? report.resolve;
    const after = report.detected_after;

    return {
      type: "detection_pipeline",
      detected_before: before?.meta ?? before,
      resolve_report: resolve,
      detected_after: after?.meta ?? after,
      raw: report,
    };
  }

  // 2) Direct resolve_report
  if (report.resolve_report || report.initial_conflicts_count !== undefined || report.proposals) {
    const rr = report.resolve_report ?? report;
    return {
      type: "resolve_direct",
      initial_conflicts_count: rr.initial_conflicts_count ?? rr.initial_conflicts ?? rr.detected_count ?? 0,
      resolved_count: rr.resolved_count ?? rr.resolved?.length ?? 0,
      unresolved_count: rr.unresolved_count ?? rr.unresolved?.length ?? 0,
      proposals: rr.proposals ?? [],
      applied: rr.applied ?? [],
      errors: rr.errors ?? [],
      raw: report,
    };
  }

  // 3) Generator summary
  if (report.created !== undefined || report.summary !== undefined || report.stats !== undefined) {
    return {
      type: "generator_summary",
      created: report.created,
      updated: report.updated,
      summary: report.summary ?? report.stats,
      raw: report,
    };
  }

  return { type: "unknown", raw: report };
};

// =============================================================================
// 2. COMPOSANT PRINCIPAL
// =============================================================================

export default function GenerateTimetable() {
  // --- STATE DONNÉES ---
  const [classes, setClasses] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]); // Crucial pour l'affichage grille
  const [entries, setEntries] = useState([]);
  
  // --- STATE GENERATION & CONFLITS ---
  const [running, setRunning] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [persist, setPersist] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  
  const [conflicts, setConflicts] = useState(null);
  const [resolving, setResolving] = useState(false);

  // --- STATE UI ---
  const [loading, setLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState("");

  // --- INITIAL LOAD ---
  useEffect(() => {
    const initFetch = async () => {
      try {
        setLoading(true);
        const [classesData, slotsData, conflictsData] = await Promise.all([
          fetchData("/academics/school-classes/"),
          fetchData("/academics/time-slots/"),
          fetchData("/academics/timetable-conflicts/") // On charge aussi les conflits au démarrage
        ]);

        // Traitement des classes
        const classesArr = Array.isArray(classesData) ? classesData : classesData?.results ?? [];
        setClasses(classesArr);
        if (classesArr.length > 0) setSelectedClassId(classesArr[0].id);

        // Traitement des créneaux (TimeSlots) - Tri indispensable pour la grille
        const slotsArr = (slotsData || []).slice().sort((a,b) => (a.day - b.day) || (String(a.start_time).localeCompare(String(b.start_time))));
        setTimeSlots(slotsArr);

        // Traitement des conflits
        setConflicts(conflictsData);

      } catch (err) {
        console.error("Init Error", err);
        setError("Erreur lors du chargement des données initiales (Classes/Slots/Conflits).");
      } finally {
        setLoading(false);
      }
    };
    initFetch();
  }, []);

  // --- FETCH ENTRIES (Grid Data) ---
  useEffect(() => {
    const fetchEntries = async () => {
      if (!selectedClassId) {
        setEntries([]);
        return;
      }
      try {
        // Pas de setLoading global ici pour ne pas faire clignoter tout l'écran, juste update discret si possible
        const url = `/academics/timetable/?school_class=${selectedClassId}`;
        const data = await fetchData(url);
        const arr = Array.isArray(data) ? data : data?.results ?? [];
        setEntries(arr);
      } catch (err) {
        console.error("Fetch Entries Error", err);
      }
    };
    fetchEntries();
  }, [selectedClassId]);

  // --- ACTIONS : GENERATION ---
  const handleRun = async () => {
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const payload = { dry_run: !!dryRun, persist: !!persist };
      const res = await postData("/academics/generate-timetable/", payload);
      setReport(res);

      // Si persisté, on rafraichit la vue actuelle et les conflits
      if (persist || !dryRun) {
        if (selectedClassId) {
            const url = `/academics/timetable/?school_class=${selectedClassId}`;
            const data = await fetchData(url);
            setEntries(Array.isArray(data) ? data : data?.results ?? []);
        }
        // Rafraichir les conflits potentiels
        const conf = await fetchData("/academics/timetable-conflicts/");
        setConflicts(conf);
      }
    } catch (err) {
      console.error("handleRun", err);
      setError(err?.message || "Erreur lors de la génération");
    } finally {
      setRunning(false);
    }
  };

  // --- ACTIONS : RESOLUTION CONFLITS ---
  const handleResolveConflicts = async () => {
    setResolving(true);
    try {
      // On utilise les mêmes flags dryRun/persist que pour la génération pour être cohérent
      const res = await postData("/academics/timetable-conflicts/", { dry_run: dryRun, persist: persist });
      
      // On update le rapport local pour afficher le résultat
      setReport((prev) => ({ ...(prev || {}), conflict_resolution: res }));
      
      // Refresh datas
      const conf = await fetchData("/academics/timetable-conflicts/");
      setConflicts(conf);

      if (persist && selectedClassId) {
         const data = await fetchData(`/academics/timetable/?school_class=${selectedClassId}`);
         setEntries(Array.isArray(data) ? data : data?.results ?? []);
      }
    } catch (err) {
      console.error("handleResolveConflicts", err);
      setError(err?.message || "Erreur lors de la résolution des conflits");
    } finally {
      setResolving(false);
    }
  };

  const downloadJSON = () => {
    if (!report) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `timetable_report_${new Date().toISOString()}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
  };

  // --- INTERPRETATION RESULTATS (Memoized) ---
  const interpreted = useMemo(() => interpretReport(report), [report]);

  const renderInterpretedReport = () => {
    if (!interpreted) return null;

    if (interpreted.type === "detection_pipeline") {
      const beforeMeta = interpreted.detected_before ?? {};
      const afterMeta = interpreted.detected_after ?? {};
      const resolve = interpreted.resolve_report;

      return (
        <div className="space-y-4 animate-fadeIn">
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SmallStat label="Conflits Profs (Avant)" value={beforeMeta.num_teacher_conflicts ?? 0} color="text-red-600"/>
              <SmallStat label="Conflits Classes (Avant)" value={beforeMeta.num_class_conflicts ?? 0} color="text-orange-600"/>
              {afterMeta && (
                <>
                  <SmallStat label="Conflits Profs (Après)" value={afterMeta.num_teacher_conflicts ?? "—"} color="text-blue-600"/>
                  <SmallStat label="Conflits Classes (Après)" value={afterMeta.num_class_conflicts ?? "—"} color="text-blue-600"/>
                </>
              )}
           </div>
           
           <ExplainBox icon={<FaCheckCircle/>} title="Rapport de résolution">
              {resolve ? (
                <div className="text-sm">
                   Tentatives de résolution : <strong>{resolve.resolved_count ?? 0}</strong> appliquées, 
                   <strong> {resolve.unresolved_count ?? 0}</strong> non résolues.
                   {resolve.errors?.length > 0 && <div className="text-red-600 mt-1">{resolve.errors.length} erreurs techniques.</div>}
                </div>
              ) : "Aucune procédure de résolution automatique n'a été déclenchée."}
           </ExplainBox>
        </div>
      );
    }

    // Default fallback simple
    return (
        <div className="p-4 bg-gray-100 rounded font-mono text-xs overflow-auto max-h-60">
            {JSON.stringify(interpreted.raw, null, 2)}
        </div>
    );
  };


  // --- LOGIQUE GRILLE (Visualisation) ---
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

  const grid = useMemo(() => {
    const g = {};
    weekdays.forEach(d => {
      g[d.value] = {};
      timeLabels.forEach(t => (g[d.value][t] = []));
    });
    entries.forEach(e => {
      const timeLabel = `${e.starts_at} - ${e.ends_at}`;
      if (g[e.weekday] && g[e.weekday][timeLabel]) {
        g[e.weekday][timeLabel].push(e);
      }
    });
    return g;
  }, [entries, timeLabels]);

  const renderCell = (day, timeLabel) => {
    const cellEntries = (grid[day] && grid[day][timeLabel]) ? grid[day][timeLabel] : [];
    if (!cellEntries.length) return <div className="text-xs text-gray-300 italic p-2 min-h-[50px]">—</div>;

    return (
      <div className="flex flex-col gap-1 p-1">
        {cellEntries.map((e, idx) => (
          <div key={e.id || idx} className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-2 rounded text-xs shadow-sm hover:bg-emerald-100 transition">
            <div className="font-bold truncate">{e.subject_name || e.subject}</div>
            <div className="mt-1 truncate">{e.teacher_name || e.teacher}</div>
            {e.room && (
               <div className="flex items-center gap-1 mt-1 text-emerald-700 font-medium">
                 <FaMapMarkerAlt size={10}/> {e.room}
               </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // =============================================================================
  // 3. RENDER UI
  // =============================================================================

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans text-gray-800">
      
      {/* --- HEADER --- */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Génération & Optimisation</h1>
        <p className="text-gray-600">
            Gérez la création automatique des emplois du temps, résolvez les conflits et visualisez le résultat final.
        </p>
      </div>

      {/* --- ZONE DE CONFIGURATION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Panneau de contrôle */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                <FaFilter className="text-indigo-600"/> Paramètres d'exécution
            </h2>
            
            <div className="flex flex-wrap items-center gap-6 mb-6 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                    type="checkbox" 
                    checked={dryRun} 
                    onChange={e => setDryRun(e.target.checked)} 
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div>
                        <span className="block font-semibold text-gray-700">Mode Simulation (Dry Run)</span>
                        <span className="text-xs text-gray-500">Ne modifie pas la base de données</span>
                    </div>
                </label>

                <div className="h-8 w-px bg-gray-300 mx-2 hidden md:block"></div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                    type="checkbox" 
                    checked={persist} 
                    onChange={e => setPersist(e.target.checked)} 
                    className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                    />
                    <div>
                        <span className="block font-semibold text-gray-700">Persister les données</span>
                        <span className="text-xs text-gray-500">Sauvegarde les résultats valides</span>
                    </div>
                </label>
            </div>

            <div className="flex flex-wrap gap-3">
                <button 
                    onClick={handleRun} 
                    disabled={running}
                    className={`flex-1 px-6 py-3 rounded-lg text-white font-semibold flex items-center justify-center gap-2 shadow-md transition transform active:scale-95
                        ${running ? 'bg-gray-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                >
                    {running ? "Calcul en cours..." : <><FaPlay/> Générer l'emploi du temps</>}
                </button>

                <button 
                    onClick={handleResolveConflicts} 
                    disabled={resolving}
                    className={`flex-1 px-6 py-3 rounded-lg text-indigo-700 bg-indigo-50 border border-indigo-200 font-semibold flex items-center justify-center gap-2 hover:bg-indigo-100 transition transform active:scale-95`}
                >
                    {resolving ? "Résolution..." : <><FaBolt/> Résoudre les conflits</>}
                </button>
            </div>

            {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded flex items-center gap-2">
                    <FaTimesCircle/> {error}
                </div>
            )}
        </div>

        {/* Panneau Stats Conflits Actuels */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <h2 className="font-bold text-lg mb-4 flex items-center gap-2 text-gray-800">
                <FaExclamationTriangle className="text-orange-500"/> État des conflits
            </h2>
            {conflicts ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-gray-600">Total Conflits</span>
                        <span className="font-bold text-xl">{conflicts.count ?? (conflicts.length || 0)}</span>
                    </div>
                    {/* Si l'API renvoie des détails, on pourrait les lister ici */}
                    <div className="text-xs text-gray-500">
                        Ces conflits sont présents actuellement en base de données. Utilisez "Résoudre" pour tenter une correction automatique.
                    </div>
                </div>
            ) : (
                <div className="text-gray-400 italic">Chargement des conflits...</div>
            )}
        </div>
      </div>

      {/* --- RAPPORT DE RESULTAT --- */}
      {report && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 mb-8 animate-slideDown">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-800">Rapport d'exécution</h3>
                <button onClick={downloadJSON} className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
                    <FaDownload/> Télécharger JSON
                </button>
            </div>
            {renderInterpretedReport()}
        </div>
      )}

      <hr className="my-8 border-gray-200" />

      {/* --- VISUALISATION GRILLE --- */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
                <h2 className="text-lg font-bold text-gray-800">Visualisation par Classe</h2>
                <p className="text-xs text-gray-500">Sélectionnez une classe pour voir son planning (généré ou actuel).</p>
            </div>
            
            <div className="flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 ring-indigo-500">
                <div className="bg-gray-100 px-3 py-2 border-r border-gray-300 text-gray-500">
                    <FaFilter/>
                </div>
                <select 
                    value={selectedClassId} 
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="p-2 text-sm bg-transparent outline-none min-w-[200px]"
                >
                    {classes.length === 0 && <option>Chargement...</option>}
                    {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </select>
            </div>
        </div>

        {loading && !entries.length ? (
            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                Chargement des données...
            </div>
        ) : !selectedClassId ? (
            <div className="p-12 text-center text-gray-400 italic">
                Aucune classe sélectionnée.
            </div>
        ) : (
            <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                    {/* Header Grid */}
                    <div className="grid grid-cols-7 bg-gray-100 border-b border-gray-200">
                        <div className="p-3 text-xs font-bold text-gray-500 uppercase tracking-wider text-center border-r border-gray-200">
                            Horaire
                        </div>
                        {weekdays.map(d => (
                            <div key={d.value} className="p-3 text-sm font-bold text-gray-700 text-center border-r border-gray-200 last:border-r-0">
                                {d.label}
                            </div>
                        ))}
                    </div>

                    {/* Body Grid */}
                    {timeLabels.length === 0 ? (
                        <div className="p-8 text-center text-red-500 bg-red-50">
                            <FaExclamationTriangle className="inline mb-1 mr-2"/>
                            Aucun créneau horaire (Time Slots) trouvé. Veuillez en configurer dans l'administration.
                        </div>
                    ) : (
                        timeLabels.map((tl, idx) => {
                            const isEven = idx % 2 === 0;
                            return (
                                <div key={tl} className={`grid grid-cols-7 ${isEven ? 'bg-white' : 'bg-gray-50'} border-b border-gray-100 last:border-b-0`}>
                                    {/* Colonne Heure */}
                                    <div className="p-2 text-xs font-semibold text-gray-500 flex items-center justify-center border-r border-gray-200">
                                        {tl}
                                    </div>
                                    
                                    {/* Colonnes Jours */}
                                    {weekdays.map(d => (
                                        <div key={d.value} className="border-r border-gray-100 last:border-r-0 min-h-[80px] relative group">
                                            {renderCell(d.value, tl)}
                                        </div>
                                    ))}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}