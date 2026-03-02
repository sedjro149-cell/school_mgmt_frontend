// src/pages/Dashboard.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUsers, FaChalkboardTeacher, FaSchool, FaClock, FaPen,
  FaFileAlt, FaRegChartBar, FaMoneyBillWave, FaLayerGroup,
  FaChartPie, FaHome, FaSyncAlt, FaBolt,
} from "react-icons/fa";
import { fetchData } from "./api";
import usePreventTranslate from "./hooks/usePreventTranslate";

/* ----------------------
   Navigation sections
   ---------------------- */
const sections = [
  {
    name: "Personnel",
    color: "from-pink-400 to-rose-500",
    items: [
      { title: "Parents",      link: "/core/parents",    icon: FaUsers },
      { title: "Étudiants",   link: "/core/students",   icon: FaChalkboardTeacher },
      { title: "Enseignants", link: "/core/teachers",   icon: FaChalkboardTeacher },
    ],
  },
  {
    name: "Académique",
    color: "from-indigo-400 to-blue-500",
    items: [
      { title: "Classes",                  link: "/academics/school-classes",     icon: FaSchool },
      { title: "Matières par classe",      link: "/academics/class-subjects",     icon: FaFileAlt },
      { title: "Créneaux horaires",        link: "/academics/timeslots",          icon: FaClock },
      { title: "Emploi du temps",          link: "/academics/timetable",          icon: FaClock },
      { title: "Notes",                    link: "/academics/grades",             icon: FaPen },
      { title: "Saisie massive",           link: "/academics/grades/bulk-entry",  icon: FaLayerGroup },
      { title: "Bulletins",                link: "/academics/reportcards",        icon: FaRegChartBar },
      { title: "Annonces",                 link: "/academics/anouncementmgmt",    icon: FaRegChartBar },
      { title: "Présence",                 link: "/academics/absences",           icon: FaLayerGroup },
      { title: "Gestion Emplois du temps", link: "/academics/timetable-manager", icon: FaLayerGroup },
      { title: "Edition Emplois du temps", link: "/academics/timetable-editor",  icon: FaLayerGroup },
    ],
  },
  {
    name: "Finance",
    color: "from-green-400 to-emerald-500",
    items: [
      { title: "Frais de scolarité", link: "/finance/fees",            icon: FaMoneyBillWave },
      { title: "Statistiques",       link: "/finance/fees-statistics", icon: FaChartPie },
    ],
  },
];

/* ----------------------
   Skeleton loader
   ---------------------- */
const SkeletonCard = () => (
  <div className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm min-h-[92px] animate-pulse">
    <div className="w-16 h-16 flex-shrink-0 rounded-xl bg-gray-200" />
    <div className="flex-1 space-y-2">
      <div className="h-3 w-24 bg-gray-200 rounded" />
      <div className="h-6 w-16 bg-gray-300 rounded" />
    </div>
  </div>
);

/* ----------------------
   UI Components
   ---------------------- */
const StatCard = ({ title, value, subtitle, gradient, icon: IconComp, onClick }) => (
  <div
    onClick={onClick}
    className="flex items-center gap-4 p-4 rounded-2xl bg-white shadow-sm hover:shadow-lg transition transform hover:-translate-y-1 cursor-pointer min-h-[92px]"
  >
    <div className={`w-16 h-16 flex-shrink-0 rounded-xl flex items-center justify-center bg-gradient-to-br ${gradient} shadow-md`}>
      <IconComp className="w-7 h-7 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <p className="text-2xl font-extrabold text-gray-900 mt-1 truncate">{value}</p>
    </div>
  </div>
);

const ActionCard = ({ title, subtitle, gradient, icon: IconComp, onClick }) => (
  <button
    onClick={onClick}
    className="w-full text-left flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm hover:shadow-lg transition transform hover:-translate-y-1"
  >
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-gradient-to-br ${gradient} text-white flex-shrink-0`}>
      <IconComp className="w-5 h-5" />
    </div>
    <div className="flex-1">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
    </div>
    <div className="ml-2 text-xs text-gray-400">Accéder</div>
  </button>
);

/* ----------------------
   Sidebar — mémoïsée
   ---------------------- */
const Sidebar = React.memo(({ navigate }) => (
  <aside className="w-72 h-screen fixed left-0 top-0 bottom-0 bg-white/90 border-r border-gray-100 shadow-sm z-30 overflow-y-auto">
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">
          S3
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900">Scol360</h3>
          <p className="text-xs text-gray-500">Admin</p>
        </div>
      </div>

      <nav className="space-y-6">
        <div className="mb-2">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition"
          >
            <FaHome className="text-indigo-500 w-4 h-4" />
            <span className="font-medium text-gray-700">Tableau de bord</span>
          </button>
        </div>

        {sections.map((sec, sidx) => (
          <div key={sidx}>
            <p className="text-xs uppercase text-gray-400 px-3 mb-2">{sec.name}</p>
            <div className="space-y-1">
              {sec.items.map((it, idx) => {
                const Icon = it.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => navigate(it.link)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700"
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br ${sec.color} text-white shadow-sm`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span>{it.title}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-6 px-3">
          <button
            onClick={() => navigate("/academics/generatetimetable")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition text-sm text-gray-700"
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-sm">
              <FaBolt className="w-4 h-4" />
            </div>
            <span>Génération emploi</span>
          </button>
        </div>
      </nav>
    </div>

    <div className="absolute bottom-6 left-6 right-6">
      <div className="text-xs text-gray-500">© {new Date().getFullYear()} Scol360</div>
    </div>
  </aside>
));

/* ----------------------
   Action cards — calculées une fois au module level, mémoïsées
   ---------------------- */
const allCards = sections.flatMap((sec) =>
  sec.items.map((it) => ({ ...it, color: sec.color }))
);

const ActionCardList = React.memo(({ navigate }) => (
  <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
    {allCards.map((card, idx) => (
      <ActionCard
        key={idx}
        title={card.title}
        subtitle="Voir la page"
        gradient={card.color}
        icon={card.icon}
        onClick={() => navigate(card.link)}
      />
    ))}
  </section>
));

/* ----------------------
   Main Dashboard
   ---------------------- */
const Dashboard = () => {
  const navigate = useNavigate();
  usePreventTranslate([]);

  // ✅ Exactement les mêmes noms et structure que la page originale
  const [stats, setStats] = useState({
    students_count: null,
    teachers_count: null,
    parents_count: null,
    students_by_sex: {},
    top_classes: [],
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [refreshing, setRefreshing]     = useState(false);

  // ✅ Fetch identique à l'original qui fonctionnait — aucune modification
  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await fetchData("/core/dashboard/stats/");
      setStats({
        students_count: data?.students_count ?? 0,
        teachers_count: data?.teachers_count ?? 0,
        parents_count:  data?.parents_count  ?? 0,
        students_by_sex: data?.students_by_sex ?? {},
        top_classes:     data?.top_classes     ?? [],
      });
    } catch (err) {
      console.error("fetchStats", err?.body ?? err?.message ?? err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const male        = stats.students_by_sex?.M ?? 0;
  const female      = stats.students_by_sex?.F ?? 0;
  const totalSex    = male + female;
  const malePercent = totalSex ? Math.round((male / totalSex) * 100) : 0;
  const nice = (n) => (n === null || n === undefined ? "—" : n >= 1000 ? n.toLocaleString() : String(n));

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-gray-800">
      <Sidebar navigate={navigate} />

      <div className="ml-72">
        <header className="flex items-center justify-between px-8 py-6 border-b border-gray-100/60">
          <h1 className="text-3xl font-extrabold tracking-tight">🎓 Admin Dashboard</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-md bg-white shadow-sm hover:shadow-md transition disabled:opacity-50"
          >
            <FaSyncAlt className={refreshing ? "animate-spin" : ""} />
            <span className="text-sm text-gray-700">Rafraîchir</span>
          </button>
        </header>

        <main className="p-8">

          {/* Stat cards — skeleton pendant le fetch, données dès qu'elles arrivent */}
          {loadingStats ? (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
            </section>
          ) : (
            <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Students" value={nice(stats.students_count)} subtitle="Active students"
                gradient="from-indigo-400 to-purple-500" icon={FaUsers}
                onClick={() => navigate("/core/students")}
              />
              <StatCard
                title="Teachers" value={nice(stats.teachers_count)} subtitle="Active teachers"
                gradient="from-cyan-400 to-blue-500" icon={FaChalkboardTeacher}
                onClick={() => navigate("/core/teachers")}
              />
              <StatCard
                title="Parents" value={nice(stats.parents_count)} subtitle="Connected accounts"
                gradient="from-pink-400 to-rose-500" icon={FaUsers}
                onClick={() => navigate("/core/parents")}
              />
              <StatCard
                title="Gender ratio" value={`${male} / ${female}`} subtitle={`${malePercent}% male`}
                gradient="from-emerald-400 to-green-500" icon={FaRegChartBar}
                onClick={() => navigate("/core/students")}
              />
            </section>
          )}

          {/* Action cards — aucune dépendance réseau, rendues immédiatement */}
          <ActionCardList navigate={navigate} />

          {/* Outils rapides */}
          <section className="mb-8">
            <h2 className="text-lg font-semibold mb-3">Outils rapides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <ActionCard
                title="Générer emploi du temps"
                subtitle="Lancer la génération et visualiser le rapport"
                gradient="from-yellow-400 to-orange-500"
                icon={FaBolt}
                onClick={() => navigate("/academics/generatetimetable")}
              />
            </div>
          </section>

        </main>
      </div>
    </div>
  );
};

export default Dashboard;