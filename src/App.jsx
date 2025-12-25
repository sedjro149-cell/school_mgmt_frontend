import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

// Pages
import Dashboard from "./pages/Dashboard";
import Parents from "./pages/Parents";
import TimetableEditor from "./pages/TimetableEditor";

import Students from "./pages/Students";
import Teachers from "./pages/Teachers";
import Levels from "./pages/Levels";
import SchoolClasses from "./pages/SchoolClasses";
import Subjects from "./pages/Subjects";
import ClassSubjects from "./pages/ClassSubjects";
import TimeSlots from "./pages/TimeSlots";
import Timetable from "./pages/Timetable";
import TimetableManager from "./pages/TimetableManager";
import AnnouncementManagement from './pages/AnnouncementManagement';
import Absences from './pages/Absences';


import GenerateTimetable from "./pages/GenerateTimetable";
import Grades from "./pages/Grades";
import GradesBulkEntry from "./pages/GradesBulkEntry";
import ReportCards from "./pages/ReportCards";
import Login from "./pages/Login";
import Fees from "./pages/Fees";
import FeesStatistics from "./pages/FeesStatistics";

// 🔹 Composant pour protéger les routes
const PrivateRoute = ({ element }) => {
  const token = localStorage.getItem("access_token");
  return token ? element : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* 🔹 Route publique */}
        <Route path="/login" element={<Login />} />

        {/* 🔹 Routes protégées */}
        <Route path="/" element={<PrivateRoute element={<Dashboard />} />} />
        <Route path="/core/parents" element={<PrivateRoute element={<Parents />} />} />
        <Route path="/core/students" element={<PrivateRoute element={<Students />} />} />
        <Route path="/core/teachers" element={<PrivateRoute element={<Teachers />} />} />
        <Route path="/academics/levels" element={<PrivateRoute element={<Levels />} />} />
        <Route path="/academics/school-classes" element={<PrivateRoute element={<SchoolClasses />} />} />
        <Route path="/academics/subjects" element={<PrivateRoute element={<Subjects />} />} />
        <Route path="/academics/class-subjects" element={<PrivateRoute element={<ClassSubjects />} />} />
        <Route path="/academics/timeslots" element={<PrivateRoute element={<TimeSlots />} />} />
        <Route path="/academics/timetable-editor" element={<PrivateRoute element={<TimetableEditor />} />} />
        <Route path="/academics/timetable-manager" element={<PrivateRoute element={<TimetableManager />} />} />

        <Route path="/academics/generatetimetable" element={<PrivateRoute element={<GenerateTimetable />} />} />
        <Route path="/academics/timetable" element={<PrivateRoute element={<Timetable />} />} />
        <Route path="/academics/grades" element={<PrivateRoute element={<Grades />} />} />
        <Route path="/academics/grades/bulk-entry" element={<PrivateRoute element={<GradesBulkEntry />} />} />
        <Route path="/academics/reportcards" element={<PrivateRoute element={<ReportCards />} />} />
        <Route path="/finance/fees" element={<PrivateRoute element={<Fees />} />} />
        <Route path="/finance/fees-statistics" element={<PrivateRoute element={<FeesStatistics />} />} />
        <Route path="/academics/anouncementmgmt" element={<PrivateRoute element={<AnnouncementManagement />} />} />
        <Route path="/academics/absences" element={<PrivateRoute element={<Absences />} />} />


        {/* 🔹 Redirection par défaut */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
