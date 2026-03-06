import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaChalkboardTeacher, FaSearch, FaSyncAlt, FaCheck, FaTimes,
  FaBookOpen, FaLock, FaUserTie,
  FaExclamationTriangle, FaInfoCircle, FaSave, FaLayerGroup,
} from "react-icons/fa";
import { fetchData, patchData } from "./api";

/* ─── Avatar ─────────────────────────────────────────────────────────────── */
const AVATAR_COLORS = [
  ["#7c3aed","#a78bfa"],["#d97706","#fcd34d"],["#059669","#6ee7b7"],
  ["#0284c7","#7dd3fc"],["#db2777","#f9a8d4"],["#4f46e5","#a5b4fc"],
  ["#0d9488","#5eead4"],["#ea580c","#fdba74"],
];
const avatarColor = (name) =>
  AVATAR_COLORS[((name || "").charCodeAt(0) || 0) % AVATAR_COLORS.length];

const Avatar = ({ firstName, lastName, size = 40 }) => {
  const initials = `${(firstName || "?")[0]}${(lastName || "")[0] || ""}`.toUpperCase();
  const [from, to] = avatarColor(firstName);
  return (
    <div style={{
      width: size, height: size,
      borderRadius: size * 0.3,
      background: `linear-gradient(135deg, ${from}, ${to})`,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontWeight:700, color:"#fff", fontSize: size * 0.34, flexShrink:0,
      boxShadow:`0 2px 8px ${from}44`,
    }}>
      {initials}
    </div>
  );
};

/* ─── Toast ──────────────────────────────────────────────────────────────── */
const Toast = ({ msg, onClose }) => {
  useEffect(() => {
    if (msg) { const t = setTimeout(onClose, 4500); return () => clearTimeout(t); }
  }, [msg, onClose]);
  if (!msg) return null;
  const cfg = {
    success: { bg:"bg-emerald-600", icon:<FaCheck /> },
    error:   { bg:"bg-red-600",     icon:<FaExclamationTriangle /> },
  }[msg.type] ?? { bg:"bg-slate-700", icon:null };
  return (
    <div onClick={onClose}
      className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl cursor-pointer text-white text-sm font-semibold max-w-sm ${cfg.bg}`}
      style={{animation:"slideUp .3s cubic-bezier(.34,1.56,.64,1)"}}>
      <span className="shrink-0">{cfg.icon}</span>
      <span>{msg.text}</span>
    </div>
  );
};

/* ─── ClassCard ──────────────────────────────────────────────────────────── */
const ClassCard = ({ cls, status, occupiedBy, pendingSelected, onToggle }) => {
  // status : "assigned" | "available" | "no_subject" | "occupied"
  // pendingSelected : true si dans pendingIds (hors "assigned")
  const isSelectable = status === "available" || status === "assigned";

  // Apparence de la checkbox
  const checkboxChecked = status === "assigned" || pendingSelected;

  let cardClass = "relative w-full text-left rounded-xl border-2 p-3 transition-all duration-150 ";
  if (!isSelectable) {
    cardClass += "cursor-default opacity-60 border-slate-200 bg-slate-50";
  } else if (pendingSelected && status !== "assigned") {
    cardClass += "cursor-pointer border-amber-400 bg-amber-50 shadow-md shadow-amber-100";
  } else if (status === "assigned") {
    cardClass += "cursor-pointer border-emerald-300 bg-emerald-50";
  } else {
    cardClass += "cursor-pointer border-slate-200 bg-white hover:border-amber-300 hover:bg-amber-50/40";
  }

  return (
    <button type="button" disabled={!isSelectable}
      onClick={() => isSelectable && onToggle(cls.id)}
      className={cardClass}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {/* Checkbox visuel */}
          {isSelectable ? (
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
              checkboxChecked ? "bg-amber-500 border-amber-500" : "border-slate-300 bg-white"
            }`}>
              {checkboxChecked && <FaCheck size={8} className="text-white" />}
            </div>
          ) : (
            <div className="w-4 h-4 rounded border-2 border-slate-200 bg-slate-100 flex items-center justify-center shrink-0">
              <FaLock size={7} className="text-slate-400" />
            </div>
          )}
          <span className="text-sm font-semibold text-slate-800 truncate">{cls.name}</span>
        </div>

        {/* Badge statut */}
        {status === "assigned" && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 bg-emerald-100 text-emerald-700">
            <FaCheck size={8} />Assigné
          </span>
        )}
        {status === "no_subject" && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 bg-slate-100 text-slate-400">
            <FaLock size={8} />Non configuré
          </span>
        )}
        {status === "occupied" && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold shrink-0 bg-orange-100 text-orange-600">
            <FaUserTie size={8} />Occupé
          </span>
        )}
      </div>

      {status === "occupied" && occupiedBy && (
        <p className="mt-1.5 ml-6 text-[11px] text-orange-600 font-medium truncate">
          <FaUserTie className="inline mr-1" size={9} />
          {occupiedBy.user?.first_name} {occupiedBy.user?.last_name}
        </p>
      )}
      {cls.level?.name && (
        <p className="mt-0.5 ml-6 text-[10px] text-slate-400">{cls.level.name}</p>
      )}
    </button>
  );
};

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════════════════════ */
export default function TeacherClassAssignment() {
  const [teachers,      setTeachers]      = useState([]);
  const [schoolClasses, setSchoolClasses] = useState([]);
  const [classSubjects, setClassSubjects] = useState([]);
  const [loading,       setLoading]       = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [msg,           setMsg]           = useState(null);
  const [search,        setSearch]        = useState("");
  const [selectedTid,   setSelectedTid]   = useState(null);
  const [pendingIds,    setPendingIds]     = useState(null);

  /* ── Fetch ── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, sc, cs] = await Promise.all([
        fetchData("/core/admin/teachers/?no_pagination=1"),
        fetchData("/academics/school-classes/"),
        fetchData("/academics/class-subjects/"),
      ]);
      setTeachers(Array.isArray(t) ? t : (t?.results ?? []));
      setSchoolClasses(Array.isArray(sc) ? sc : (sc?.results ?? []));
      setClassSubjects(Array.isArray(cs) ? cs : (cs?.results ?? []));
    } catch {
      setMsg({ type: "error", text: "Erreur de chargement." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* ── Prof sélectionné ── */
  const teacher = useMemo(
    () => teachers.find((t) => t.id === selectedTid) ?? null,
    [teachers, selectedTid]
  );

  useEffect(() => {
    if (teacher) setPendingIds(teacher.classes?.map((c) => c.id) ?? []);
    else setPendingIds(null);
  }, [teacher]);

  /* ── Calcul statut de chaque classe ── */
  const classStatusMap = useMemo(() => {
    if (!teacher) return {};
    const subjectId = teacher.subject?.id;
    const result = {};

    schoolClasses.forEach((cls) => {
      if (!subjectId) {
        result[cls.id] = { status: "no_subject", occupiedBy: null };
        return;
      }
      const hasSubject = classSubjects.some(
        (cs) => (cs.school_class?.id ?? cs.school_class) === cls.id &&
                (cs.subject?.id ?? cs.subject) === subjectId
      );
      if (!hasSubject) {
        result[cls.id] = { status: "no_subject", occupiedBy: null };
        return;
      }
      const otherTeacher = teachers.find(
        (t) => t.id !== teacher.id &&
               t.subject?.id === subjectId &&
               t.classes?.some((c) => c.id === cls.id)
      );
      if (otherTeacher) {
        result[cls.id] = { status: "occupied", occupiedBy: otherTeacher };
        return;
      }
      const isAssigned = teacher.classes?.some((c) => c.id === cls.id);
      result[cls.id] = { status: isAssigned ? "assigned" : "available", occupiedBy: null };
    });
    return result;
  }, [teacher, teachers, schoolClasses, classSubjects]);

  /* ── Grouper par niveau ── */
  const byLevel = useMemo(() => {
    const map = {};
    schoolClasses.forEach((cls) => {
      const lvl = cls.level?.name ?? "—";
      if (!map[lvl]) map[lvl] = [];
      map[lvl].push(cls);
    });
    return map;
  }, [schoolClasses]);

  /* ── Toggle classe ── */
  const toggleClass = (classId) => {
    setPendingIds((prev) => {
      if (!prev) return [classId];
      return prev.includes(classId)
        ? prev.filter((id) => id !== classId)
        : [...prev, classId];
    });
  };

  /* ── Diff ── */
  const originalIds  = useMemo(() => new Set(teacher?.classes?.map((c) => c.id) ?? []), [teacher]);
  const pendingSet   = useMemo(() => new Set(pendingIds ?? []), [pendingIds]);
  const hasChanges   = useMemo(() => {
    if (!pendingIds) return false;
    if (pendingIds.length !== originalIds.size) return true;
    return pendingIds.some((id) => !originalIds.has(id));
  }, [pendingIds, originalIds]);
  const added   = useMemo(() => (pendingIds ?? []).filter((id) => !originalIds.has(id)), [pendingIds, originalIds]);
  const removed = useMemo(() => [...originalIds].filter((id) => !pendingSet.has(id)), [originalIds, pendingSet]);

  /* ── Sauvegarde — payload complet identique à Teachers.jsx ── */
 const handleSave = async () => {
  if (!teacher || !hasChanges) return;
  setSaving(true);
  try {
    // ✅ On utilise l'endpoint dédié — pas le PATCH général
    await patchData(
      `/core/admin/teachers/${teacher.id}/assign-classes/`,
      { class_ids: pendingIds ?? [] }
    );
    setMsg({ type: "success", text: "Attribution enregistrée." });
    await load();
  } catch (err) {
    // L'action renvoie { classes: [...erreurs] } en cas de conflit R1/R2
    const data = err?.body;
    if (data?.classes) {
      const msgs = Array.isArray(data.classes) ? data.classes : [data.classes];
      setMsg({ type: "error", text: msgs[0] });
    } else if (data?.detail) {
      setMsg({ type: "error", text: data.detail });
    } else {
      setMsg({ type: "error", text: "Erreur lors de l'enregistrement." });
    }
  } finally {
    setSaving(false);
  }
};

  const handleReset = () => {
    if (teacher) setPendingIds(teacher.classes?.map((c) => c.id) ?? []);
  };

  /* ── Filtrage profs ── */
  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter((t) => {
      const name = `${t.user?.first_name ?? ""} ${t.user?.last_name ?? ""}`.toLowerCase();
      return name.includes(q) || (t.subject?.name ?? "").toLowerCase().includes(q);
    });
  }, [teachers, search]);

  /* ── Compteurs ── */
  const assignedCount  = pendingIds?.length ?? 0;
  const availableCount = Object.values(classStatusMap).filter((v) => v.status === "available").length;
  const blockedCount   = Object.values(classStatusMap).filter(
    (v) => v.status === "no_subject" || v.status === "occupied"
  ).length;

  /* ── Render ── */
  return (
    <div className="min-h-screen bg-[#f7f8fa] font-sans">

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40"
        style={{boxShadow:"0 1px 3px rgba(0,0,0,.06)"}}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <FaLayerGroup size={18} />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight leading-none">Attribution des classes</h1>
              <p className="text-xs text-slate-500 mt-0.5">Affectez les professeurs à leurs classes</p>
            </div>
          </div>
          <button onClick={load}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors shadow-sm">
            <FaSyncAlt size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Layout deux colonnes */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex gap-5"
        style={{height:"calc(100vh - 65px)"}}>

        {/* ── Colonne gauche — liste profs ── */}
        <div className="w-68 shrink-0 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          style={{width:"17rem"}}>
          <div className="p-3.5 border-b border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5">Professeurs</p>
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={11} />
              <input type="text" placeholder="Rechercher…"
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none bg-slate-50 focus:bg-white" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scroll">
            {loading ? (
              <div className="flex justify-center py-10"><FaSyncAlt className="animate-spin text-slate-400" /></div>
            ) : filteredTeachers.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400">Aucun résultat</div>
            ) : filteredTeachers.map((t) => {
              const isSel = t.id === selectedTid;
              const [from] = avatarColor(t.user?.first_name);
              return (
                <button key={t.id} type="button"
                  onClick={() => setSelectedTid(t.id === selectedTid ? null : t.id)}
                  className={`w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all
                    ${isSel ? "bg-indigo-600 shadow-lg shadow-indigo-200" : "hover:bg-slate-50"}`}>
                  <Avatar firstName={t.user?.first_name} lastName={t.user?.last_name} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${isSel ? "text-white" : "text-slate-800"}`}>
                      {t.user?.first_name} {t.user?.last_name}
                    </p>
                    <p className={`text-[10px] truncate ${isSel ? "text-indigo-200" : "text-slate-400"}`}>
                      {t.subject?.name ?? "Aucune matière"}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0 ${
                    isSel ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                  }`}>
                    {t.classes?.length ?? 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Colonne droite ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {!teacher ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white rounded-2xl border border-slate-200 shadow-sm gap-4 text-center">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300">
                <FaChalkboardTeacher size={36} />
              </div>
              <div>
                <p className="font-bold text-slate-600 text-base">Sélectionnez un professeur</p>
                <p className="text-sm text-slate-400 mt-1">Choisissez un professeur dans la liste pour gérer ses classes.</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

              {/* Header panneau */}
              <div className="px-6 py-4 border-b border-slate-100">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Avatar firstName={teacher.user?.first_name} lastName={teacher.user?.last_name} size={48} />
                    <div>
                      <p className="font-black text-slate-800 text-base leading-tight">
                        {teacher.user?.first_name} {teacher.user?.last_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {teacher.subject ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-bold">
                            <FaBookOpen size={9} />{teacher.subject.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-xs">
                            <FaExclamationTriangle size={9} />Aucune matière
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Compteurs */}
                  <div className="flex items-center gap-4 text-center shrink-0">
                    {[
                      { label:"Assignées",    value:assignedCount,  color:"text-indigo-600" },
                      { label:"Disponibles",  value:availableCount, color:"text-emerald-600" },
                      { label:"Bloquées",     value:blockedCount,   color:"text-slate-400" },
                    ].map((c, i) => (
                      <React.Fragment key={c.label}>
                        {i > 0 && <div className="w-px h-8 bg-slate-200" />}
                        <div>
                          <p className={`text-xl font-black ${c.color}`}>{c.value}</p>
                          <p className="text-[10px] text-slate-400">{c.label}</p>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {!teacher.subject && (
                  <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                    <FaInfoCircle className="shrink-0" size={13} />
                    <span>Ce professeur n'a pas de matière. Assignez-lui une matière d'abord sur la page <strong>Corps Enseignant</strong>.</span>
                  </div>
                )}
              </div>

              {/* Légende */}
              <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 text-[11px] text-slate-500">
                {[
                  {dot:"bg-emerald-400", label:"Assigné"},
                  {dot:"bg-amber-400",   label:"Sélectionné (en attente)"},
                  {dot:"bg-slate-300",   label:"Disponible"},
                  {dot:"bg-orange-300",  label:"Occupé par un autre prof"},
                  {dot:"bg-slate-200",   label:"Matière non configurée"},
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${l.dot}`} />
                    <span>{l.label}</span>
                  </div>
                ))}
              </div>

              {/* Grille */}
              <div className="flex-1 overflow-y-auto px-6 py-5 custom-scroll">
                {Object.entries(byLevel).map(([level, classes]) => {
                  const allSelectable = classes.filter(
                    (c) => classStatusMap[c.id]?.status === "available" ||
                           classStatusMap[c.id]?.status === "assigned"
                  );
                  const allChecked = allSelectable.length > 0 &&
                    allSelectable.every((c) => pendingSet.has(c.id));

                  const toggleLevel = () => {
                    if (!teacher.subject) return;
                    if (allChecked) {
                      setPendingIds(prev => (prev ?? []).filter(
                        id => !allSelectable.some(c => c.id === id)
                      ));
                    } else {
                      setPendingIds(prev => {
                        const base = prev ?? [];
                        const toAdd = allSelectable.map(c => c.id).filter(id => !base.includes(id));
                        return [...base, ...toAdd];
                      });
                    }
                  };

                  return (
                    <div key={level} className="mb-7">
                      {/* Header niveau */}
                      <div className="flex items-center gap-2 mb-3">
                        <button type="button" onClick={toggleLevel}
                          disabled={!teacher.subject}
                          className="flex items-center gap-2 group disabled:cursor-default">
                          <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center transition-colors ${
                            allChecked && teacher.subject
                              ? "bg-indigo-600 border-indigo-600"
                              : "border-slate-300 bg-white group-hover:border-indigo-400"
                          }`}>
                            {allChecked && teacher.subject && <FaCheck size={7} className="text-white" />}
                          </div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{level}</span>
                        </button>
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-[10px] text-slate-400">
                          {classes.filter(c => pendingSet.has(c.id)).length}/{classes.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                        {classes.map((cls) => {
                          const { status, occupiedBy } = classStatusMap[cls.id] ?? { status: "no_subject", occupiedBy: null };
                          return (
                            <ClassCard
                              key={cls.id}
                              cls={cls}
                              status={status}
                              occupiedBy={occupiedBy}
                              pendingSelected={pendingSet.has(cls.id) && status !== "assigned"}
                              onToggle={toggleClass}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer diff — visible seulement si changements */}
              {hasChanges && (
                <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between"
                  style={{animation:"slideUp .2s ease-out"}}>
                  <div className="flex items-center gap-5 text-sm">
                    {added.length > 0 && (
                      <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                        <FaCheck size={11} /> +{added.length} à ajouter
                      </span>
                    )}
                    {removed.length > 0 && (
                      <span className="flex items-center gap-1.5 text-red-400 font-semibold">
                        <FaTimes size={11} /> −{removed.length} à retirer
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={handleReset}
                      className="px-4 py-2 text-sm font-semibold text-slate-400 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors">
                      Annuler
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className={`flex items-center gap-2 px-5 py-2 text-sm font-bold rounded-xl transition-all
                        ${saving
                          ? "bg-slate-700 text-slate-500 cursor-not-allowed"
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/50 active:scale-95"}`}>
                      {saving ? <FaSyncAlt className="animate-spin" size={13} /> : <FaSave size={13} />}
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      <Toast msg={msg} onClose={() => setMsg(null)} />

      <style>{`
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .custom-scroll::-webkit-scrollbar { width:5px }
        .custom-scroll::-webkit-scrollbar-track { background:transparent }
        .custom-scroll::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:10px }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background:#94a3b8 }
      `}</style>
    </div>
  );
}