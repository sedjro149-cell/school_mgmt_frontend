// src/pages/Dashboard.jsx
import React, { useEffect, useState, useCallback, createContext, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  FaUsers, FaChalkboardTeacher, FaSchool, FaClock, FaPen,
  FaFileAlt, FaRegChartBar, FaMoneyBillWave, FaLayerGroup,
  FaChartPie, FaHome, FaSyncAlt, FaBolt, FaAngleDown,
  FaAngleRight, FaMoon, FaSun,
} from "react-icons/fa";
import { fetchData } from "./api";
import usePreventTranslate from "./hooks/usePreventTranslate";

/* ═══════════════════════════════════════════
   THEME CONTEXT
═══════════════════════════════════════════ */
const ThemeCtx = createContext({ dark: false, toggle: () => {} });
const useTheme = () => useContext(ThemeCtx);

/* ═══════════════════════════════════════════
   COLOR PALETTE — one vivid color per section
═══════════════════════════════════════════ */
const PALETTE = {
  personnel: { from: "#f97316", to: "#ef4444", text: "#f97316", light: "#fff7ed", darkBg: "#2a1006" },
  academic:  { from: "#6366f1", to: "#8b5cf6", text: "#6366f1", light: "#eef2ff", darkBg: "#1a1836" },
  finance:   { from: "#10b981", to: "#06b6d4", text: "#10b981", light: "#ecfdf5", darkBg: "#051f18" },
  tool:      { from: "#f59e0b", to: "#f97316", text: "#f59e0b", light: "#fffbeb", darkBg: "#221a05" },
  stats: [
    { from: "#6366f1", to: "#8b5cf6" },
    { from: "#0ea5e9", to: "#06b6d4" },
    { from: "#f97316", to: "#ef4444" },
    { from: "#10b981", to: "#14b8a6" },
  ],
};

/* ═══════════════════════════════════════════
   THEME TOKENS — light / dark
═══════════════════════════════════════════ */
const LIGHT = {
  pageBg:        "#f1f3f9",
  cardBg:        "#ffffff",
  cardBorder:    "rgba(0,0,0,0.07)",
  cardShadow:    "0 2px 12px rgba(0,0,0,0.06)",
  cardShadowHov: "0 8px 28px rgba(0,0,0,0.13)",
  sidebarBg:     "#0f0f1a",
  sidebarBorder: "rgba(255,255,255,0.06)",
  sidebarText:   "#9294a8",
  sidebarHover:  "rgba(255,255,255,0.05)",
  sidebarActive: "rgba(255,255,255,0.10)",
  textPrimary:   "#0f172a",
  textSecondary: "#475569",
  textMuted:     "#94a3b8",
  headerBg:      "rgba(241,243,249,0.85)",
  divider:       "rgba(0,0,0,0.06)",
};
const DARK = {
  pageBg:        "#0d1117",
  cardBg:        "#161b27",
  cardBorder:    "rgba(255,255,255,0.07)",
  cardShadow:    "0 2px 12px rgba(0,0,0,0.4)",
  cardShadowHov: "0 8px 28px rgba(0,0,0,0.6)",
  sidebarBg:     "#090c12",
  sidebarBorder: "rgba(255,255,255,0.05)",
  sidebarText:   "#636878",
  sidebarHover:  "rgba(255,255,255,0.04)",
  sidebarActive: "rgba(255,255,255,0.09)",
  textPrimary:   "#e8eaf0",
  textSecondary: "#8892a4",
  textMuted:     "#4e5668",
  headerBg:      "rgba(13,17,23,0.88)",
  divider:       "rgba(255,255,255,0.05)",
};

/* ═══════════════════════════════════════════
   NAVIGATION SECTIONS
═══════════════════════════════════════════ */
const sections = [
  {
    name: "Personnel", key: "personnel", icon: FaUsers,
    items: [
      { title: "Parents",      link: "/core/parents",    icon: FaUsers },
      { title: "Étudiants",    link: "/core/students",   icon: FaUsers },
      { title: "Enseignants",  link: "/core/teachers",   icon: FaChalkboardTeacher },
    ],
  },
  {
    name: "Académique", key: "academic", icon: FaSchool,
    items: [
      { title: "Classes",               link: "/academics/school-classes",    icon: FaSchool },
      { title: "Matières / classe",     link: "/academics/class-subjects",    icon: FaFileAlt },
      { title: "Créneaux horaires",     link: "/academics/timeslots",         icon: FaClock },
      { title: "Emploi du temps",       link: "/academics/timetable",         icon: FaClock },
      { title: "Notes",                 link: "/academics/grades",            icon: FaPen },
      { title: "Saisie massive",        link: "/academics/grades/bulk-entry", icon: FaLayerGroup },
      { title: "Bulletins",             link: "/academics/reportcards",       icon: FaRegChartBar },
      { title: "Annonces",              link: "/academics/anouncementmgmt",   icon: FaRegChartBar },
      { title: "Présence",              link: "/academics/absences",          icon: FaLayerGroup },
      { title: "Gestion emplois",       link: "/academics/timetable-manager", icon: FaLayerGroup },
      { title: "Édition emplois",       link: "/academics/timetable-editor",  icon: FaLayerGroup },
      { title: "Attribution classe",    link: "/academics/class-assignment",  icon: FaChalkboardTeacher },
    ],
  },
  {
    name: "Finance", key: "finance", icon: FaMoneyBillWave,
    items: [
      { title: "Frais de scolarité", link: "/finance/fees",            icon: FaMoneyBillWave },
      { title: "Statistiques",       link: "/finance/fees-statistics", icon: FaChartPie },
    ],
  },
];

/* ═══════════════════════════════════════════
   SKELETON
═══════════════════════════════════════════ */
const SkeletonStatCard = () => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  return (
    <div className="rounded-2xl p-5 animate-pulse" style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}`, minHeight: 148 }}>
      <div className="w-12 h-12 rounded-xl mb-4" style={{ background: T.divider }} />
      <div className="h-7 w-16 rounded-lg mb-2" style={{ background: T.divider }} />
      <div className="h-3 w-24 rounded" style={{ background: T.divider }} />
      <div className="mt-5 h-1 w-2/5 rounded-full" style={{ background: T.divider }} />
    </div>
  );
};

/* ═══════════════════════════════════════════
   STAT CARD
═══════════════════════════════════════════ */
const StatCard = ({ title, value, subtitle, colorIdx, icon: IconComp, onClick }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const col = PALETTE.stats[colorIdx];
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="w-full text-left rounded-2xl p-5 transition-all duration-300 focus:outline-none"
      style={{
        background: T.cardBg,
        border: `1px solid ${hov ? col.from + "55" : T.cardBorder}`,
        boxShadow: hov ? T.cardShadowHov : T.cardShadow,
        transform: hov ? "translateY(-4px)" : "translateY(0)",
      }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{
          background: `linear-gradient(135deg, ${col.from}, ${col.to})`,
          boxShadow: `0 6px 20px ${col.from}55`,
          transform: hov ? "scale(1.1) rotate(-4deg)" : "scale(1)",
          transition: "transform 0.3s",
        }}
      >
        <IconComp className="w-5 h-5 text-white" />
      </div>
      <p className="text-2xl font-black tracking-tight" style={{ color: T.textPrimary }}>{value}</p>
      <p className="text-sm font-semibold mt-1" style={{ color: T.textSecondary }}>{title}</p>
      <p className="text-xs mt-0.5" style={{ color: T.textMuted }}>{subtitle}</p>
      <div
        className="mt-4 h-1 rounded-full"
        style={{
          background: `linear-gradient(90deg, ${col.from}, ${col.to})`,
          width: hov ? "100%" : "40%",
          opacity: hov ? 1 : 0.4,
          transition: "width 0.4s, opacity 0.3s",
        }}
      />
    </button>
  );
};

/* ═══════════════════════════════════════════
   ACTION CARD
═══════════════════════════════════════════ */
const ActionCard = ({ title, subtitle, icon: IconComp, onClick, paletteKey = "academic", featured }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const col = PALETTE[paletteKey];
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="w-full text-left flex items-center gap-3 p-3.5 rounded-xl transition-all duration-200 focus:outline-none"
      style={{
        background: featured
          ? dark ? col.darkBg : col.light
          : T.cardBg,
        border: `1px solid ${hov || featured ? col.from + "66" : T.cardBorder}`,
        boxShadow: hov ? T.cardShadowHov : T.cardShadow,
        transform: hov ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${col.from}, ${col.to})`,
          boxShadow: hov ? `0 6px 16px ${col.from}55` : `0 2px 8px ${col.from}33`,
          transform: hov ? "scale(1.12) rotate(-4deg)" : "scale(1)",
          transition: "transform 0.25s, box-shadow 0.25s",
        }}
      >
        <IconComp className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate" style={{ color: T.textPrimary }}>{title}</p>
        {subtitle && <p className="text-xs truncate mt-0.5" style={{ color: T.textMuted }}>{subtitle}</p>}
      </div>
      <FaAngleRight
        className="w-3 h-3 flex-shrink-0"
        style={{
          color: hov ? col.text : T.textMuted,
          transform: hov ? "translateX(2px)" : "translateX(0)",
          transition: "transform 0.2s, color 0.2s",
        }}
      />
    </button>
  );
};

/* ═══════════════════════════════════════════
   DARK MODE TOGGLE
═══════════════════════════════════════════ */
const DarkToggle = () => {
  const { dark, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={dark ? "Mode clair" : "Mode sombre"}
      className="relative w-14 h-7 rounded-full focus:outline-none transition-all duration-300 flex-shrink-0"
      style={{
        background: dark
          ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
          : "linear-gradient(135deg, #f59e0b, #f97316)",
        boxShadow: hov
          ? dark ? "0 0 18px #6366f199" : "0 0 18px #f59e0b99"
          : "0 2px 8px rgba(0,0,0,0.2)",
      }}
    >
      <div
        className="absolute top-0.5 w-6 h-6 rounded-full bg-white flex items-center justify-center transition-all duration-300"
        style={{
          left: dark ? "calc(100% - 26px)" : "2px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
        }}
      >
        {dark
          ? <FaMoon className="w-3 h-3" style={{ color: "#6366f1" }} />
          : <FaSun  className="w-3 h-3" style={{ color: "#f59e0b" }} />
        }
      </div>
    </button>
  );
};

/* ═══════════════════════════════════════════
   SIDEBAR SECTION (collapsible)
═══════════════════════════════════════════ */
const SidebarSection = React.memo(({ section, currentPath, navigate }) => {
  const col = PALETTE[section.key];
  const T = DARK;
  const isAnyActive = section.items.some((i) => i.link === currentPath);
  const [open, setOpen] = useState(isAnyActive || section.name === "Académique");

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 transition-all duration-150 focus:outline-none"
        style={{ color: T.sidebarText }}
        onMouseEnter={(e) => (e.currentTarget.style.background = T.sidebarHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${col.from}, ${col.to})`, boxShadow: `0 0 6px ${col.from}99` }}
        />
        <span className="text-xs font-bold uppercase tracking-widest flex-1 text-left">{section.name}</span>
        <FaAngleDown
          className="w-2.5 h-2.5"
          style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform 0.2s" }}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? `${section.items.length * 38}px` : "0px", opacity: open ? 1 : 0 }}
      >
        {section.items.map((item, idx) => {
          const isActive = currentPath === item.link;
          return (
            <button
              key={idx}
              onClick={() => navigate(item.link)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 focus:outline-none mb-0.5"
              style={{
                background: isActive ? T.sidebarActive : "transparent",
                color: isActive ? "#fff" : T.sidebarText,
              }}
              onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = T.sidebarHover)}
              onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = "transparent")}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{
                  background: isActive ? `linear-gradient(135deg, ${col.from}, ${col.to})` : "transparent",
                  boxShadow: isActive ? `0 0 6px ${col.from}` : "none",
                  transition: "all 0.2s",
                }}
              />
              <item.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isActive ? col.from : T.sidebarText }} />
              <span className="truncate">{item.title}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════
   SIDEBAR
═══════════════════════════════════════════ */
const Sidebar = React.memo(({ navigate }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const T = DARK;

  return (
    <aside
      className="w-64 h-screen fixed left-0 top-0 bottom-0 z-30 flex flex-col"
      style={{
        background: `linear-gradient(180deg, ${T.sidebarBg} 0%, #080b10 100%)`,
        borderRight: `1px solid ${T.sidebarBorder}`,
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex-shrink-0" style={{ borderBottom: `1px solid ${T.sidebarBorder}` }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #6366f1, #f97316)", boxShadow: "0 4px 14px #6366f166" }}
          >
            S3
          </div>
          <div>
            <p className="text-sm font-black text-white leading-none tracking-tight">Scol360</p>
            <p className="text-xs mt-0.5" style={{ color: T.sidebarText }}>Administration</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" style={{ scrollbarWidth: "none" }}>
        {/* Dashboard home */}
        {(() => {
          const isActive = currentPath === "/";
          return (
            <button
              onClick={() => navigate("/")}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm mb-4 transition-all duration-150 focus:outline-none"
              style={{ background: isActive ? T.sidebarActive : "transparent", color: isActive ? "#fff" : T.sidebarText }}
              onMouseEnter={(e) => !isActive && (e.currentTarget.style.background = T.sidebarHover)}
              onMouseLeave={(e) => !isActive && (e.currentTarget.style.background = "transparent")}
            >
              <FaHome className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isActive ? "#6366f1" : T.sidebarText }} />
              <span className="font-semibold">Tableau de bord</span>
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: "#6366f1", boxShadow: "0 0 8px #6366f1" }} />
              )}
            </button>
          );
        })()}

        {sections.map((sec, i) => (
          <SidebarSection key={i} section={sec} currentPath={currentPath} navigate={navigate} />
        ))}

        {/* Génération emploi */}
        <div className="pt-3 mt-2" style={{ borderTop: `1px solid ${T.sidebarBorder}` }}>
          {(() => {
            const isActive = currentPath === "/academics/generatetimetable";
            return (
              <button
                onClick={() => navigate("/academics/generatetimetable")}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm focus:outline-none transition-all duration-150"
                style={{ background: isActive ? T.sidebarActive : T.sidebarHover, color: "#fff" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = isActive ? T.sidebarActive : T.sidebarHover)}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)", boxShadow: "0 2px 8px #f59e0b55" }}
                >
                  <FaBolt className="w-2.5 h-2.5 text-white" />
                </div>
                <span className="font-semibold">Génération emploi</span>
              </button>
            );
          })()}
        </div>
      </nav>

      <div className="px-5 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${T.sidebarBorder}` }}>
        <p className="text-xs" style={{ color: T.sidebarText }}>© {new Date().getFullYear()} Scol360</p>
      </div>
    </aside>
  );
});

/* ═══════════════════════════════════════════
   SECTION HEADER
═══════════════════════════════════════════ */
const SectionHeader = ({ title, count, paletteKey }) => {
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  const col = PALETTE[paletteKey] || PALETTE.academic;

  return (
    <div className="flex items-center gap-3 mb-4">
      <span
        className="w-3 h-3 rounded-sm flex-shrink-0"
        style={{
          background: `linear-gradient(135deg, ${col.from}, ${col.to})`,
          boxShadow: `0 0 10px ${col.from}88`,
        }}
      />
      <h2 className="text-sm font-bold" style={{ color: T.textPrimary }}>{title}</h2>
      {count !== undefined && (
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: dark ? col.darkBg : col.light,
            color: col.text,
            border: `1px solid ${col.from}44`,
          }}
        >
          {count}
        </span>
      )}
      <div
        className="flex-1 h-px"
        style={{ background: `linear-gradient(90deg, ${col.from}55, transparent)` }}
      />
    </div>
  );
};

/* ═══════════════════════════════════════════
   DASHBOARD INNER
═══════════════════════════════════════════ */
const DashboardInner = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const T = dark ? DARK : LIGHT;
  usePreventTranslate([]);

  const [stats, setStats] = useState({
    students_count: null, teachers_count: null, parents_count: null,
    students_by_sex: {}, top_classes: [],
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await fetchData("/core/dashboard/stats/");
      setStats({
        students_count:  data?.students_count ?? 0,
        teachers_count:  data?.teachers_count ?? 0,
        parents_count:   data?.parents_count  ?? 0,
        students_by_sex: data?.students_by_sex ?? {},
        top_classes:     data?.top_classes     ?? [],
      });
    } catch (err) {
      console.error("fetchStats", err?.body ?? err?.message ?? err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleRefresh = async () => { setRefreshing(true); await fetchStats(); setRefreshing(false); };

  const male        = stats.students_by_sex?.M ?? 0;
  const female      = stats.students_by_sex?.F ?? 0;
  const totalSex    = male + female;
  const malePercent = totalSex ? Math.round((male / totalSex) * 100) : 0;
  const nice = (n) => (n === null || n === undefined ? "—" : n >= 1000 ? n.toLocaleString() : String(n));

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ background: T.pageBg, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      <Sidebar navigate={navigate} />

      <div className="ml-64">

        {/* ── Header ── */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between px-8 py-4 transition-colors duration-300"
          style={{
            background: T.headerBg,
            backdropFilter: "blur(16px)",
            borderBottom: `1px solid ${T.divider}`,
          }}
        >
          <div>
            <h1 className="text-xl font-black tracking-tight" style={{ color: T.textPrimary }}>
              🎓 Tableau de bord
            </h1>
            <p className="text-xs mt-0.5 capitalize" style={{ color: T.textMuted }}>
              {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <DarkToggle />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus:outline-none disabled:opacity-50"
              style={{
                background: T.cardBg,
                border: `1px solid ${T.cardBorder}`,
                color: T.textSecondary,
                boxShadow: T.cardShadow,
              }}
            >
              <FaSyncAlt className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>
        </header>

        <main className="px-8 py-7 space-y-10">

          {/* ── Stats ── */}
          <section>
            <SectionHeader title="Vue d'ensemble" paletteKey="academic" />
            {loadingStats ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard /><SkeletonStatCard />
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title="Étudiants"    value={nice(stats.students_count)} subtitle="Inscrits actifs"    colorIdx={0} icon={FaUsers}             onClick={() => navigate("/core/students")} />
                <StatCard title="Enseignants"  value={nice(stats.teachers_count)} subtitle="Corps enseignant"  colorIdx={1} icon={FaChalkboardTeacher} onClick={() => navigate("/core/teachers")} />
                <StatCard title="Parents"      value={nice(stats.parents_count)}  subtitle="Comptes connectés" colorIdx={2} icon={FaUsers}             onClick={() => navigate("/core/parents")} />
                <StatCard title="Répartition"  value={`${male} / ${female}`}      subtitle={`${malePercent}% garçons`} colorIdx={3} icon={FaRegChartBar} onClick={() => navigate("/core/students")} />
              </div>
            )}
          </section>

          {/* ── Personnel ── */}
          <section>
            <SectionHeader title="Personnel" count={sections[0].items.length} paletteKey="personnel" />
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {sections[0].items.map((c, i) => (
                <ActionCard key={i} title={c.title} icon={c.icon} paletteKey="personnel" onClick={() => navigate(c.link)} />
              ))}
            </div>
          </section>

          {/* ── Académique ── */}
          <section>
            <SectionHeader title="Académique" count={sections[1].items.length} paletteKey="academic" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {sections[1].items.map((c, i) => (
                <ActionCard key={i} title={c.title} icon={c.icon} paletteKey="academic" onClick={() => navigate(c.link)} />
              ))}
            </div>
          </section>

          {/* ── Finance + Outil ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <section className="lg:col-span-2">
              <SectionHeader title="Finance" count={sections[2].items.length} paletteKey="finance" />
              <div className="grid grid-cols-2 gap-3">
                {sections[2].items.map((c, i) => (
                  <ActionCard key={i} title={c.title} icon={c.icon} paletteKey="finance" onClick={() => navigate(c.link)} />
                ))}
              </div>
            </section>

            <section>
              <SectionHeader title="Outils" paletteKey="tool" />
              <ActionCard
                title="Générer emploi du temps"
                subtitle="Lancer la génération automatique"
                icon={FaBolt}
                paletteKey="tool"
                featured
                onClick={() => navigate("/academics/generatetimetable")}
              />
            </section>
          </div>

        </main>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════
   ROOT — ThemeCtx + persistance localStorage
═══════════════════════════════════════════ */
const Dashboard = () => {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem("scol360_dark") === "true"; } catch { return false; }
  });

  const toggle = useCallback(() => {
    setDark((v) => {
      const next = !v;
      try { localStorage.setItem("scol360_dark", String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <ThemeCtx.Provider value={{ dark, toggle }}>
      <DashboardInner />
    </ThemeCtx.Provider>
  );
};

export default Dashboard;