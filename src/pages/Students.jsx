// src/pages/Students.jsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  FaSearch, FaPlus, FaEdit, FaTrash, FaSyncAlt,
  FaUserGraduate, FaFilter, FaChevronLeft, FaChevronRight,
  FaTimes, FaMars, FaVenus, FaPhone, FaUpload,
  FaCheckCircle, FaTimesCircle, FaExclamationTriangle,
  FaCheck, FaMoon, FaSun, FaUsers, FaLayerGroup,
  FaAt, FaEnvelope,
} from "react-icons/fa";
import { fetchData, postData, patchData, deleteData, postFormData } from "./api";
import {
  ThemeCtx, useTheme,
  LIGHT, DARK,
  SECTION_PALETTE, avatarGradient,
  BASE_KEYFRAMES,
} from "./theme";

const COL = SECTION_PALETTE.students; // indigo → violet

/* ═══════════════════════════════════════════════════════════
   COMPOSANTS ATOMIQUES
═══════════════════════════════════════════════════════════ */

const Avatar = ({ firstName, lastName, sex, size = 40 }) => {
  const initials = `${(firstName || "?")[0]}${(lastName || "")[0] || ""}`.toUpperCase();
  const [from, to] = sex === "F"
    ? ["#db2777","#f9a8d4"]
    : avatarGradient(firstName);
  return (
    <div className="flex-shrink-0 flex items-center justify-center font-black select-none"
      style={{
        width:size, height:size, borderRadius:size*0.28,
        background:`linear-gradient(135deg,${from},${to})`,
        boxShadow:`0 4px 12px ${from}55`,
        color:"#fff", fontSize:size*0.34,
      }}>
      {initials}
    </div>
  );
};

const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button onClick={toggle} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      title={dark?"Mode clair":"Mode sombre"}
      className="relative rounded-full focus:outline-none transition-all duration-300 flex-shrink-0"
      style={{
        width:52, height:28,
        background:dark?"linear-gradient(135deg,#6366f1,#8b5cf6)":`linear-gradient(135deg,${COL.from},${COL.to})`,
        boxShadow:hov?(dark?"0 0 18px #6366f199":`0 0 18px ${COL.shadow}`):"0 2px 8px rgba(0,0,0,.2)",
      }}>
      <div className="absolute top-0.5 w-6 h-6 rounded-full bg-white flex items-center justify-center transition-all duration-300"
        style={{ left:dark?"calc(100% - 26px)":"2px", boxShadow:"0 2px 6px rgba(0,0,0,.25)" }}>
        {dark ? <FaMoon style={{ width:12,height:12,color:"#6366f1" }} />
               : <FaSun  style={{ width:12,height:12,color:COL.from  }} />}
      </div>
    </button>
  );
};

/* Modal générique */
const Modal = ({ isOpen, onClose, title, subtitle, children }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(2,6,23,.7)", backdropFilter:"blur(8px)", animation:"fadeIn .18s ease-out" }}>
      <div className="w-full max-w-lg flex flex-col overflow-hidden"
        style={{
          background:T.cardBg, border:`1px solid ${T.cardBorder}`,
          borderRadius:20, boxShadow:"0 24px 64px rgba(0,0,0,.35)",
          maxHeight:"90vh", animation:"panelUp .28s cubic-bezier(.34,1.4,.64,1)",
        }}>
        <div className="h-1.5 flex-shrink-0" style={{ background:`linear-gradient(90deg,${COL.from},${COL.to})` }} />
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom:`1px solid ${T.divider}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 4px 12px ${COL.shadow}` }}>
              <FaUserGraduate style={{ width:16,height:16,color:"#fff" }} />
            </div>
            <div>
              <h3 className="text-base font-black" style={{ color:T.textPrimary }}>{title}</h3>
              {subtitle && <p className="text-xs" style={{ color:T.textMuted }}>{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all focus:outline-none"
            style={{ color:T.textMuted }}
            onMouseEnter={(e) => { e.currentTarget.style.background="#ef444418"; e.currentTarget.style.color="#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
            <FaTimes style={{ width:14,height:14 }} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">{children}</div>
      </div>
    </div>
  );
};

/* Champ formulaire */
const FormField = ({ label, required, sublabel, children }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div>
      <div className="flex items-baseline gap-1.5 mb-1.5">
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color:T.textSecondary }}>{label}</label>
        {required && <span className="text-[10px] font-bold" style={{ color:COL.from }}>*</span>}
        {sublabel && <span className="text-[10px] italic" style={{ color:T.textMuted }}>{sublabel}</span>}
      </div>
      {children}
    </div>
  );
};

const StyledInput = ({ icon: Icon, type="text", ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      {Icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-150"
        style={{ color:focused?COL.from:T.textMuted }}><Icon style={{ width:13,height:13 }} /></span>}
      <input type={type} {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
        className="w-full py-2.5 text-sm rounded-xl outline-none transition-all duration-150 placeholder:opacity-40"
        style={{
          paddingLeft:Icon?"2.5rem":"1rem", paddingRight:"1rem",
          background:T.inputBg, border:`1.5px solid ${focused?COL.from:T.inputBorder}`,
          boxShadow:focused?`0 0 0 3px ${COL.from}22`:"none", color:T.textPrimary,
        }} />
    </div>
  );
};

const StyledSelect = ({ children, ...props }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [focused, setFocused] = useState(false);
  return (
    <select {...props}
      onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
      onBlur={(e)  => { setFocused(false); props.onBlur?.(e); }}
      className="w-full appearance-none px-4 py-2.5 text-sm rounded-xl outline-none transition-all duration-150"
      style={{
        background:T.inputBg, border:`1.5px solid ${focused?COL.from:T.inputBorder}`,
        boxShadow:focused?`0 0 0 3px ${COL.from}22`:"none", color:T.textPrimary,
      }}>
      {children}
    </select>
  );
};

/* ═══════════════════════════════════════════════════════════
   PAGE PRINCIPALE
═══════════════════════════════════════════════════════════ */
const StudentsInner = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;

  /* ── Données ── */
  const [students,      setStudents]      = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [classesList,   setClassesList]   = useState([]);
  const [parentsList,   setParentsList]   = useState([]);

  /* ── UI ── */
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [showModal, setShowModal] = useState(false);

  /* ── Import ── */
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing,       setImporting]       = useState(false);
  const [importResult,    setImportResult]    = useState(null);
  const importFileRef = useRef(null);

  /* ── Filtres & Pagination ── */
  const [currentPage,     setCurrentPage]     = useState(1);
  const [pageSize]                            = useState(10);
  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterClassId,   setFilterClassId]   = useState("");

  /* ── Form ── */
  const [currentStudent, setCurrentStudent] = useState(null);
  const [studentForm,    setStudentForm]    = useState({
    username:"", email:"", firstName:"", lastName:"",
    sex:"M", dateOfBirth:"", schoolClassId:"", parentId:"", password:"",
  });

  const latestReqId = useRef(0);

  /* ── Dropdowns ── */
  useEffect(() => {
    const load = async () => {
      try {
        const [clsData, parData] = await Promise.all([
          fetchData("/academics/school-classes/?page_size=100"),
          fetchData("/core/admin/parents/?page_size=100"),
        ]);
        setClassesList(clsData?.results ?? clsData ?? []);
        setParentsList(parData?.results  ?? parData  ?? []);
      } catch (err) { console.error("Erreur dropdowns:", err); }
    };
    load();
  }, []);

  /* ── Debounce ── */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  /* ── Fetch students ── */
  const normalizeStudent = (s) => ({
    ...s,
    user:         s.user         ?? { username:"",first_name:"",last_name:"",email:"" },
    parent:       s.parent       ?? null,
    school_class: s.school_class ?? null,
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const reqId = ++latestReqId.current;
    try {
      const params = new URLSearchParams({
        page: currentPage, page_size: pageSize,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filterClassId   && { school_class: filterClassId }),
      });
      const raw = await fetchData(`/core/admin/students/?${params}`);
      if (reqId !== latestReqId.current) return;
      let list = [], count = 0;
      if (Array.isArray(raw?.results)) { list=raw.results; count=raw.count??list.length; }
      else if (Array.isArray(raw))     { list=raw; count=raw.length; }
      setStudents(list.map(normalizeStudent));
      setTotalStudents(count);
    } catch (err) {
      console.error(err);
      if (reqId===latestReqId.current) { setStudents([]); setTotalStudents(0); }
    } finally {
      if (reqId===latestReqId.current) setLoading(false);
    }
  }, [currentPage, pageSize, debouncedSearch, filterClassId]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  /* ── CRUD ── */
  const openModal = (student = null) => {
    setCurrentStudent(student);
    setStudentForm(student ? {
      username:     student.user?.username    ?? "",
      email:        student.user?.email       ?? "",
      firstName:    student.user?.first_name  ?? "",
      lastName:     student.user?.last_name   ?? "",
      sex:          student.sex               ?? "M",
      dateOfBirth:  student.date_of_birth     ?? "",
      schoolClassId: student.school_class?.id ?? "",
      parentId:     student.parent?.id        ?? "",
      password:     "",
    } : { username:"",email:"",firstName:"",lastName:"",sex:"M",dateOfBirth:"",schoolClassId:"",parentId:"",password:"" });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!studentForm.firstName || !studentForm.lastName) return alert("Prénom et Nom sont obligatoires.");
    setSaving(true);
    try {
      const payload = {
        user: {
          first_name: studentForm.firstName, last_name: studentForm.lastName,
          email: studentForm.email,
          ...(studentForm.password && { password:studentForm.password }),
          ...(!currentStudent && studentForm.username && { username:studentForm.username }),
        },
        sex: studentForm.sex,
        date_of_birth:  studentForm.dateOfBirth  || null,
        school_class_id: studentForm.schoolClassId ? parseInt(studentForm.schoolClassId) : null,
        parent_id:       studentForm.parentId      ? parseInt(studentForm.parentId)      : null,
      };
      if (currentStudent) await patchData(`/core/admin/students/${currentStudent.id}/`, payload);
      else                await postData("/core/admin/students/", payload);
      setShowModal(false);
      fetchStudents();
    } catch (err) { console.error(err); alert("Erreur lors de l'enregistrement."); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cet étudiant définitivement ?")) return;
    try { await deleteData(`/core/admin/students/${id}/`); fetchStudents(); }
    catch (err) { console.error(err); alert("Erreur lors de la suppression."); }
  };

  /* ── Import ── */
  const openImportModal  = () => { setImportResult(null); setImporting(false); setShowImportModal(true); };
  const closeImportModal = () => {
    if (importing) return;
    setShowImportModal(false); setImportResult(null);
    if (importFileRef.current) importFileRef.current.value="";
  };

  const uploadImportFile = async (file) => {
    setImporting(true); setImportResult(null);
    const fd = new FormData(); fd.append("file", file);
    try {
      const data = await postFormData("/core/admin/students/import-csv/", fd);
      setImportResult(data ?? { total_rows:0,success_count:0,error_count:0,results:[] });
      if ((data?.success_count??0) > 0) fetchStudents();
    } catch (err) {
      const msg = err.body?.detail ?? err.body?.message ?? err.message ?? "Erreur inconnue.";
      setImportResult({ error:msg });
    } finally {
      setImporting(false);
      if (importFileRef.current) importFileRef.current.value="";
    }
  };

  const totalPages = Math.ceil((totalStudents || 0) / pageSize);
  const stats = [
    { label:"Total inscrits",   value:totalStudents },
    { label:"Classes actives",  value:classesList.length },
    { label:"Cette page",       value:students.length },
  ];

  return (
    <div className="min-h-screen pb-20 transition-colors duration-300"
      style={{ background:T.pageBg, fontFamily:"'Plus Jakarta Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── Header ── */}
      <header className="sticky top-0 z-30 transition-colors duration-300"
        style={{ background:T.headerBg, backdropFilter:"blur(16px)", borderBottom:`1px solid ${T.divider}` }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Titre */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 6px 20px ${COL.shadow}` }}>
                <FaUserGraduate style={{ width:20,height:20,color:"#fff" }} />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight" style={{ color:T.textPrimary }}>Étudiants</h1>
                <p className="text-xs" style={{ color:T.textMuted }}>
                  {totalStudents} inscrit{totalStudents>1?"s":""}
                </p>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2.5">
              <DarkToggle />
              <button onClick={fetchStudents}
                className="h-9 w-9 rounded-xl flex items-center justify-center transition-all focus:outline-none"
                style={{ background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, color:T.textSecondary }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor=COL.from; e.currentTarget.style.color=COL.from; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor=T.cardBorder; e.currentTarget.style.color=T.textSecondary; }}>
                <FaSyncAlt style={{ width:14,height:14 }} className={loading?"animate-spin":""} />
              </button>
              <button onClick={openImportModal}
                className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-bold transition-all focus:outline-none"
                style={{ background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, color:T.textSecondary }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor=COL.from; e.currentTarget.style.color=COL.from; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor=T.cardBorder; e.currentTarget.style.color=T.textSecondary; }}>
                <FaUpload style={{ width:12,height:12 }} /> Importer
              </button>
              <button onClick={() => openModal()}
                className="flex items-center gap-2 px-4 h-9 rounded-xl text-sm font-black text-white transition-all focus:outline-none active:scale-95"
                style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 4px 14px ${COL.shadow}` }}>
                <FaPlus style={{ width:12,height:12 }} /> Nouveau
              </button>
            </div>
          </div>

          {/* Filtres */}
          <div className="mt-4 flex gap-3 flex-wrap">
            <div className="relative flex-1" style={{ minWidth:200 }}>
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ width:13,height:13,color:T.textMuted }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher (Nom, ID, Email…)"
                className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl outline-none transition-all placeholder:opacity-50"
                style={{ background:T.inputBg, border:`1.5px solid ${T.inputBorder}`, color:T.textPrimary }}
                onFocus={(e) => (e.currentTarget.style.borderColor=COL.from)}
                onBlur={(e)  => (e.currentTarget.style.borderColor=T.inputBorder)} />
            </div>
            <div className="relative" style={{ minWidth:180 }}>
              <select value={filterClassId}
                onChange={(e) => { setFilterClassId(e.target.value); setCurrentPage(1); }}
                className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm rounded-xl outline-none transition-all"
                style={{ background:T.inputBg, border:`1.5px solid ${T.inputBorder}`,
                  color:filterClassId?T.textPrimary:T.textMuted }}
                onFocus={(e) => (e.currentTarget.style.borderColor=COL.from)}
                onBlur={(e)  => (e.currentTarget.style.borderColor=T.inputBorder)}>
                <option value="">Toutes les classes</option>
                {classesList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <FaFilter className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ width:11,height:11,color:T.textMuted }} />
            </div>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="max-w-7xl mx-auto px-6 py-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map((s, i) => (
            <div key={i} className="rounded-2xl p-4 flex items-center gap-4"
              style={{ background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, boxShadow:T.cardShadow }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background:`linear-gradient(135deg,${COL.from}22,${COL.to}11)`, color:COL.from }}>
                {i===0 ? <FaUsers style={{ width:18,height:18 }} />
                 :i===1 ? <FaLayerGroup style={{ width:18,height:18 }} />
                         : <FaUserGraduate style={{ width:18,height:18 }} />}
              </div>
              <div>
                <p className="text-2xl font-black" style={{ color:T.textPrimary }}>{s.value}</p>
                <p className="text-xs mt-0.5" style={{ color:T.textMuted }}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tableau */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, boxShadow:T.cardShadow }}>

          {/* Header tableau */}
          <div className="grid px-6 py-3.5"
            style={{ gridTemplateColumns:"2fr 80px 140px 1fr 80px", background:T.tableHead, borderBottom:`1px solid ${T.divider}` }}>
            {["Étudiant","Sexe","Classe","Parent",""].map((h,i) => (
              <p key={i} className="text-[10px] font-black uppercase tracking-widest"
                style={{ color:T.textMuted, textAlign:i===4?"right":"left" }}>{h}</p>
            ))}
          </div>

          {/* Rows */}
          {loading && students.length===0 ? (
            <div className="p-10 text-center text-sm" style={{ color:T.textMuted }}>Chargement…</div>
          ) : students.length===0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3"
              style={{ borderTop:`2px dashed ${COL.from}33` }}>
              <FaUserGraduate style={{ width:36,height:36,color:COL.from,opacity:0.35 }} />
              <p className="font-black" style={{ color:T.textSecondary }}>
                {search||filterClassId?"Aucun résultat":"Aucun étudiant inscrit"}
              </p>
              {!search && !filterClassId && (
                <button onClick={() => openModal()}
                  className="mt-1 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black text-white transition-all active:scale-95"
                  style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 4px 12px ${COL.shadow}` }}>
                  <FaPlus style={{ width:12,height:12 }} /> Ajouter le premier étudiant
                </button>
              )}
            </div>
          ) : (
            students.map((student, idx) => {
              const user        = student.user || {};
              const parent      = student.parent;
              const schoolClass = student.school_class;
              const fullName    = `${user.first_name||""} ${user.last_name||""}`.trim() || user.username || "—";
              const parentName  = parent?.user
                ? `${parent.user.first_name||""} ${parent.user.last_name||""}`.trim() : null;
              const [hov, setHov] = [null, null]; // handled per-row below

              return (
                <StudentRow key={student.id} student={student} fullName={fullName}
                  parentName={parentName} schoolClass={schoolClass}
                  onEdit={() => openModal(student)} onDelete={() => handleDelete(student.id)}
                  isLast={idx===students.length-1}
                  style={{ animation:`fadeUp .3s ease-out ${idx*25}ms both` }} />
              );
            })
          )}

          {/* Pagination */}
          <div className="px-6 py-4 flex items-center justify-between flex-wrap gap-3"
            style={{ borderTop:`1px solid ${T.divider}` }}>
            <p className="text-xs" style={{ color:T.textMuted }}>
              Page {currentPage} sur {totalPages||1} · {totalStudents} résultat{totalStudents>1?"s":""}
            </p>
            <div className="flex items-center gap-1.5">
              {[
                { label:<FaChevronLeft style={{ width:12,height:12 }} />, action:()=>setCurrentPage((p)=>p-1), disabled:currentPage<=1 },
                { label:<FaChevronRight style={{ width:12,height:12 }} />, action:()=>setCurrentPage((p)=>p+1), disabled:currentPage>=totalPages },
              ].map((b, i) => (
                <button key={i} onClick={b.action} disabled={b.disabled}
                  className="w-9 h-9 rounded-xl flex items-center justify-center transition-all focus:outline-none disabled:opacity-40"
                  style={{ background:T.cardBg, border:`1.5px solid ${T.cardBorder}`, color:T.textSecondary }}
                  onMouseEnter={(e) => !b.disabled && (e.currentTarget.style.borderColor=COL.from, e.currentTarget.style.color=COL.from)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor=T.cardBorder, e.currentTarget.style.color=T.textSecondary)}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* ── Modal Étudiant ── */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={currentStudent?"Modifier l'étudiant":"Nouvel étudiant"}
        subtitle={currentStudent?"Mettre à jour les informations":"Créer un nouveau compte étudiant"}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Prénom" required>
              <StyledInput placeholder="ex : Ama" value={studentForm.firstName}
                onChange={(e) => setStudentForm((f) => ({ ...f,firstName:e.target.value }))} />
            </FormField>
            <FormField label="Nom" required>
              <StyledInput placeholder="ex : Koffi" value={studentForm.lastName}
                onChange={(e) => setStudentForm((f) => ({ ...f,lastName:e.target.value }))} />
            </FormField>
          </div>
          <FormField label="Email">
            <StyledInput icon={FaEnvelope} type="email" placeholder="etudiant@ecole.bj"
              value={studentForm.email} onChange={(e) => setStudentForm((f) => ({ ...f,email:e.target.value }))} />
          </FormField>
          {!currentStudent && (
            <FormField label="Identifiant de connexion">
              <StyledInput icon={FaAt} placeholder="Auto-généré si vide"
                value={studentForm.username} onChange={(e) => setStudentForm((f) => ({ ...f,username:e.target.value }))} />
            </FormField>
          )}
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Sexe">
              <StyledSelect value={studentForm.sex} onChange={(e) => setStudentForm((f) => ({ ...f,sex:e.target.value }))}>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </StyledSelect>
            </FormField>
            <FormField label="Date de naissance">
              <StyledInput type="date" value={studentForm.dateOfBirth}
                onChange={(e) => setStudentForm((f) => ({ ...f,dateOfBirth:e.target.value }))} />
            </FormField>
          </div>
          {/* Bloc association */}
          <div className="rounded-xl p-4 space-y-3"
            style={{ background:dark?COL.darkBg:COL.lightBg, border:`1px solid ${COL.from}33` }}>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color:COL.text }}>
              Association scolaire
            </p>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Classe">
                <StyledSelect value={studentForm.schoolClassId}
                  onChange={(e) => setStudentForm((f) => ({ ...f,schoolClassId:e.target.value }))}>
                  <option value="">— Non attribuée —</option>
                  {classesList.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </StyledSelect>
              </FormField>
              <FormField label="Parent">
                <StyledSelect value={studentForm.parentId}
                  onChange={(e) => setStudentForm((f) => ({ ...f,parentId:e.target.value }))}>
                  <option value="">— Aucun —</option>
                  {parentsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.user ? `${p.user.first_name} ${p.user.last_name}` : `Parent #${p.id}`}
                    </option>
                  ))}
                </StyledSelect>
              </FormField>
            </div>
          </div>
          <FormField label="Mot de passe" sublabel={currentStudent?"(laisser vide pour conserver)":""}>
            <StyledInput type="password" placeholder="••••••••"
              value={studentForm.password} onChange={(e) => setStudentForm((f) => ({ ...f,password:e.target.value }))} />
          </FormField>

          <div className="flex justify-end gap-3 pt-4" style={{ borderTop:`1px solid ${dark?DARK.divider:LIGHT.divider}` }}>
            <button onClick={() => setShowModal(false)}
              className="px-5 py-2.5 text-sm font-bold rounded-xl transition-all focus:outline-none"
              style={{ color:T.textSecondary }}
              onMouseEnter={(e) => (e.currentTarget.style.background=dark?"rgba(255,255,255,0.06)":"#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background="transparent")}>
              Annuler
            </button>
            <button onClick={handleSubmit} disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-black text-white rounded-xl transition-all focus:outline-none active:scale-95 disabled:opacity-60"
              style={{ background:`linear-gradient(135deg,${COL.from},${COL.to})`, boxShadow:`0 4px 16px ${COL.shadow}` }}>
              {saving ? <FaSyncAlt style={{ width:13,height:13 }} className="animate-spin" /> : <FaCheck style={{ width:13,height:13 }} />}
              {saving?"Enregistrement…":currentStudent?"Sauvegarder":"Créer l'étudiant"}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal Import ── */}
      <Modal isOpen={showImportModal} onClose={closeImportModal}
        title="Import CSV / XLSX" subtitle="Importer des étudiants en masse">
        <div className="space-y-5">
          {/* Instructions */}
          <div className="rounded-xl p-4 text-xs space-y-1.5"
            style={{ background:dark?COL.darkBg:COL.lightBg, border:`1px solid ${COL.from}33` }}>
            <p className="font-black text-sm mb-2" style={{ color:COL.text }}>Colonnes acceptées</p>
            <p style={{ color:T.textSecondary }}>
              <span className="font-bold" style={{ color:"#ef4444" }}>Obligatoires : </span>
              <code>first_name</code>, <code>last_name</code>
            </p>
            <p style={{ color:T.textSecondary }}>
              <span className="font-bold" style={{ color:T.textMuted }}>Facultatifs : </span>
              <code>email</code>, <code>date_of_birth</code>, <code>sex</code>, <code>school_class</code>, <code>parent_id</code>, <code>username</code>, <code>password</code>
            </p>
            <p style={{ color:T.textMuted }}>Formats : .csv, .txt, .xlsx, .xls — max 1 000 lignes</p>
          </div>

          {/* Zone drop */}
          {!importing && !importResult && (
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all"
              style={{ borderColor:`${COL.from}44` }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor=COL.from, e.currentTarget.style.background=dark?COL.darkBg:COL.lightBg)}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor=`${COL.from}44`, e.currentTarget.style.background="transparent")}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background:`linear-gradient(135deg,${COL.from}22,${COL.to}11)`, color:COL.from }}>
                <FaUpload style={{ width:20,height:20 }} />
              </div>
              <span className="text-sm font-bold" style={{ color:T.textSecondary }}>Cliquez pour choisir un fichier</span>
              <span className="text-xs" style={{ color:T.textMuted }}>.csv, .xlsx, .xls, .txt</span>
              <input ref={importFileRef} type="file" accept=".csv,.xlsx,.xls,.txt"
                onChange={(e) => { const f=e.target.files?.[0]; if(f) uploadImportFile(f); }} className="hidden" />
            </label>
          )}

          {importing && (
            <div className="flex flex-col items-center gap-3 py-8" style={{ color:T.textMuted }}>
              <FaSyncAlt style={{ width:28,height:28,color:COL.from }} className="animate-spin" />
              <p className="text-sm font-medium">Import en cours, veuillez patienter…</p>
            </div>
          )}

          {importResult && !importing && (
            <div className="space-y-4">
              {importResult.error ? (
                <div className="flex items-start gap-3 p-4 rounded-xl text-sm"
                  style={{ background:"#fef2f2",border:"1px solid #fecaca",color:"#b91c1c" }}>
                  <FaTimesCircle style={{ width:16,height:16,marginTop:2,flexShrink:0 }} />
                  <div><p className="font-bold">Erreur d'import</p><p className="text-xs mt-1">{importResult.error}</p></div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label:"Total",    value:importResult.total_rows??0,   bg:T.divider,  text:T.textPrimary },
                      { label:"Importés", value:importResult.success_count??0, bg:"#ecfdf5", text:"#059669" },
                      { label:"Erreurs",  value:importResult.error_count??0,   bg:"#fef2f2", text:"#dc2626" },
                    ].map((s,i) => (
                      <div key={i} className="rounded-xl py-3.5"
                        style={{ background:s.bg, border:`1px solid ${T.cardBorder}` }}>
                        <p className="text-2xl font-black" style={{ color:s.text }}>{s.value}</p>
                        <p className="text-[10px] font-black uppercase tracking-wider mt-0.5" style={{ color:T.textMuted }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                  {Array.isArray(importResult.results) && importResult.results.length > 0 && (
                    <div className="max-h-56 overflow-y-auto rounded-xl custom-scrollbar"
                      style={{ border:`1px solid ${T.cardBorder}` }}>
                      {importResult.results.map((r,i) => (
                        <div key={i} className="flex items-start gap-2 px-3 py-2.5 text-xs"
                          style={{
                            background: r.success ? T.cardBg : (dark?"#1f0a0a":"#fef2f2"),
                            borderTop: i>0?`1px solid ${T.divider}`:"none",
                            color: r.success ? T.textSecondary : "#b91c1c",
                          }}>
                          {r.success
                            ? <FaCheckCircle style={{ width:12,height:12,color:"#059669",flexShrink:0,marginTop:1 }} />
                            : <FaTimesCircle style={{ width:12,height:12,color:"#dc2626",flexShrink:0,marginTop:1 }} />}
                          <div className="min-w-0">
                            <span className="font-bold">Ligne {r.row}</span>
                            {r.username && <span style={{ color:T.textMuted }}> · {r.username}</span>}
                            {!r.success && <p className="mt-0.5 break-words">{typeof r.error==="string"?r.error:JSON.stringify(r.error)}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              <button onClick={() => { setImportResult(null); if(importFileRef.current) importFileRef.current.value=""; }}
                className="w-full py-2.5 text-sm font-bold rounded-xl transition-all focus:outline-none"
                style={{ border:`1.5px solid ${T.cardBorder}`, color:T.textSecondary, background:T.cardBg }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor=COL.from)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor=T.cardBorder)}>
                Importer un autre fichier
              </button>
            </div>
          )}
        </div>
      </Modal>

      <style>{BASE_KEYFRAMES}{`
        .custom-scrollbar::-webkit-scrollbar { width:4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background:${COL.from}66; border-radius:10px; }
      `}</style>
    </div>
  );
};

/* ── Row étudiant isolée pour gérer le hover proprement ── */
const StudentRow = ({ student, fullName, parentName, schoolClass, onEdit, onDelete, isLast, style: animStyle }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const [hov, setHov] = useState(false);
  const user = student.user || {};

  return (
    <div
      className="grid items-center px-6 py-3.5 transition-all duration-150"
      style={{
        gridTemplateColumns:"2fr 80px 140px 1fr 80px",
        background: hov ? T.rowHover : T.cardBg,
        borderBottom: isLast ? "none" : `1px solid ${T.divider}`,
        ...animStyle,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Identité */}
      <div className="flex items-center gap-3 min-w-0">
        <Avatar firstName={user.first_name} lastName={user.last_name} sex={student.sex} size={40} />
        <div className="min-w-0">
          <p className="font-black text-sm truncate" style={{ color:T.textPrimary }}>{fullName}</p>
          <p className="text-[11px] font-mono truncate mt-0.5" style={{ color:T.textMuted }}>ID: {student.id}</p>
        </div>
      </div>

      {/* Sexe */}
      <div>
        {student.sex==="F"
          ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black"
              style={{ background:"#fdf2f8",border:"1px solid #fbcfe8",color:"#db2777" }}>
              <FaVenus style={{ width:10,height:10 }} /> F
            </span>
          : <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-black"
              style={{ background:dark?COL.darkBg:COL.lightBg, border:`1px solid ${COL.from}44`, color:COL.text }}>
              <FaMars style={{ width:10,height:10 }} /> M
            </span>
        }
      </div>

      {/* Classe */}
      <div>
        <span className="px-2.5 py-1 rounded-lg text-xs font-black"
          style={schoolClass
            ? { background:dark?COL.darkBg:COL.lightBg, border:`1px solid ${COL.from}44`, color:COL.text }
            : { background:T.divider, color:T.textMuted }}>
          {schoolClass?.name ?? "Non inscrit"}
        </span>
      </div>

      {/* Parent */}
      <div className="min-w-0">
        {student.parent ? (
          <div>
            <p className="text-xs font-bold truncate" style={{ color:T.textSecondary }}>{parentName}</p>
            {student.parent.phone && (
              <p className="text-[10px] flex items-center gap-1 mt-0.5" style={{ color:T.textMuted }}>
                <FaPhone style={{ width:8,height:8 }} />{student.parent.phone}
              </p>
            )}
          </div>
        ) : (
          <span className="text-xs italic" style={{ color:T.textMuted }}>Aucun parent lié</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-1"
        style={{ opacity:hov?1:0, transform:hov?"translateX(0)":"translateX(4px)", transition:"all .15s" }}>
        <button onClick={onEdit}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all focus:outline-none"
          style={{ color:T.textMuted }}
          onMouseEnter={(e) => { e.currentTarget.style.background=`${COL.from}22`; e.currentTarget.style.color=COL.from; }}
          onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
          <FaEdit style={{ width:13,height:13 }} />
        </button>
        <button onClick={onDelete}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all focus:outline-none"
          style={{ color:T.textMuted }}
          onMouseEnter={(e) => { e.currentTarget.style.background="#ef444422"; e.currentTarget.style.color="#ef4444"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background="transparent"; e.currentTarget.style.color=T.textMuted; }}>
          <FaTrash style={{ width:13,height:13 }} />
        </button>
      </div>
    </div>
  );
};

/* ── Root avec ThemeCtx ── */
const Students = () => {
  const [dark, setDark] = useState(() => { try { return localStorage.getItem("scol360_dark")==="true"; } catch { return false; } });
  const toggle = useCallback(() => { setDark((v) => { const n=!v; try{localStorage.setItem("scol360_dark",String(n));}catch{} return n; }); }, []);
  return <ThemeCtx.Provider value={{ dark, toggle }}><StudentsInner /></ThemeCtx.Provider>;
};

export default Students;