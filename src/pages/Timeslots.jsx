// src/pages/TimeSlots.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FaEdit,
  FaTrash,
  FaPlus,
  FaSearch,
  FaChevronDown,
  FaChevronUp,
} from "react-icons/fa";
import { fetchData, postData, putData, deleteData } from "./api";

const DAYS = [
  { id: "1", name: "Lundi" },
  { id: "2", name: "Mardi" },
  { id: "3", name: "Mercredi" },
  { id: "4", name: "Jeudi" },
  { id: "5", name: "Vendredi" },
  { id: "6", name: "Samedi" },
  { id: "7", name: "Dimanche" },
];

const dayName = (d) => {
  if (d === null || d === undefined) return "Autre";
  const found = DAYS.find((x) => String(x.id) === String(d));
  return found ? found.name : "Autre";
};

export default function TimeSlots() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentSlot, setCurrentSlot] = useState(null);
  const [form, setForm] = useState({ day: "", start_time: "", end_time: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedDays, setExpandedDays] = useState(() => new Set());

  const fetchSlots = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await fetchData("/academics/time-slots/");
      // API may return array or paginated; handle both
      //Api son babièèèère
      const arr = Array.isArray(data) ? data : data?.results ?? [];
      setSlots(arr);
    } catch (err) {
      console.error("fetchSlots", err);
      setError("Erreur lors du chargement des créneaux.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSlots();
  }, []);

  const openModal = (slot = null, presetDay = "") => {
    setCurrentSlot(slot);
    if (slot) {
      setForm({
        day: String(slot.day ?? ""),
        start_time: slot.start_time || "",
        end_time: slot.end_time || "",
      });
    } else {
      setForm({ day: String(presetDay || ""), start_time: "", end_time: "" });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setCurrentSlot(null);
    setForm({ day: "", start_time: "", end_time: "" });
  };

  const handleSubmit = async () => {
    if (!form.day || !form.start_time || !form.end_time) {
      alert("Tous les champs sont obligatoires !");
      return;
    }
    try {
      if (currentSlot) {
        await putData(`/academics/time-slots/${currentSlot.id}/`, {
          day: form.day,
          start_time: form.start_time,
          end_time: form.end_time,
        });
      } else {
        await postData("/academics/time-slots/", {
          day: form.day,
          start_time: form.start_time,
          end_time: form.end_time,
        });
      }
      await fetchSlots();
      closeModal();
    } catch (err) {
      console.error("handleSubmit", err);
      alert("Erreur lors de l'opération !");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Voulez-vous vraiment supprimer ce créneau ?")) return;
    try {
      await deleteData(`/academics/time-slots/${id}/`);
      await fetchSlots();
    } catch (err) {
      console.error("handleDelete", err);
      alert("Erreur lors de la suppression !");
    }
  };

  // filtering
  const filteredSlots = useMemo(() => {
    const term = (searchTerm || "").trim().toLowerCase();
    if (!term) return slots;
    return slots.filter((s) => {
      const d = (s.day_display || dayName(s.day) || "").toString().toLowerCase();
      return (
        d.includes(term) ||
        (s.start_time || "").toString().toLowerCase().includes(term) ||
        (s.end_time || "").toString().toLowerCase().includes(term)
      );
    });
  }, [slots, searchTerm]);

  // group by day in order
  const grouped = useMemo(() => {
    const map = new Map();
    // init day buckets in order
    DAYS.forEach((d) => map.set(String(d.id), []));
    map.set("other", []); // for slots without a known day

    (filteredSlots || []).forEach((s) => {
      const key = s.day ? String(s.day) : "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(s);
    });

    // sort each day's slots by start_time
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => {
        if (!a.start_time) return 1;
        if (!b.start_time) return -1;
        return a.start_time.localeCompare(b.start_time);
      });
    }

    // build final ordered array
    const ordered = [];
    DAYS.forEach((d) => {
      ordered.push({ dayId: String(d.id), dayLabel: d.name, slots: map.get(String(d.id)) || [] });
    });
    const other = map.get("other") || [];
    if (other.length) ordered.push({ dayId: "other", dayLabel: "Autre", slots: other });
    return ordered;
  }, [filteredSlots]);

  const toggleDay = (dayId) => {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  };

  const renderTimeRange = (s) => `${s.start_time || "—"} → ${s.end_time || "—"}`;

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">🕒 Créneaux horaires</h1>
          <p className="text-gray-600">Afficher les créneaux par jour — clique sur un jour pour déplier et voir / gérer ses créneaux.</p>
        </div>

        <div className="flex gap-3 items-center">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Recherche par jour ou heure"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-3 py-2 rounded-full border border-gray-300 bg-white shadow-sm focus:ring-2 focus:ring-indigo-400 focus:outline-none w-72"
            />
          </div>

          <button
            onClick={() => openModal(null)}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-teal-500 text-white font-medium flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105 transition-all"
            title="Ajouter un créneau global"
          >
            <FaPlus /> Ajouter
          </button>
        </div>
      </header>

      {/* Days grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full bg-white rounded-2xl shadow p-6 text-center text-gray-500">Chargement...</div>
        ) : error ? (
          <div className="col-span-full bg-white rounded-2xl shadow p-6 text-center text-red-500">{error}</div>
        ) : (
          grouped.map(({ dayId, dayLabel, slots: daySlots }) => {
            const isExpanded = expandedDays.has(dayId);
            return (
              <div key={dayId} className="bg-white border rounded-2xl shadow-sm overflow-hidden">
                {/* header */}
                <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-semibold">
                      {dayLabel[0]}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800">{dayLabel}</div>
                      <div className="text-xs text-gray-500">{daySlots.length} créneau{daySlots.length > 1 ? "x" : ""}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openModal(null, dayId === "other" ? "" : dayId)}
                      className="px-3 py-1 rounded-full bg-green-50 border text-green-700 text-sm hover:bg-green-100"
                      title={`Ajouter un créneau pour ${dayLabel}`}
                    >
                      <FaPlus /> <span className="hidden sm:inline">Ajouter</span>
                    </button>

                    <button
                      onClick={() => toggleDay(dayId)}
                      aria-expanded={isExpanded}
                      className="p-2 rounded-full hover:bg-gray-100"
                      title={isExpanded ? "Replier" : "Déplier"}
                    >
                      {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  </div>
                </div>

                {/* collapse / content */}
                <div
                  className={`px-4 pt-2 pb-4 transition-all ${isExpanded ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}
                  aria-hidden={!isExpanded}
                >
                  {daySlots.length === 0 ? (
                    <div className="text-sm text-gray-500 italic py-4">Aucun créneau pour ce jour.</div>
                  ) : (
                    <ul className="space-y-3">
                      {daySlots.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg p-3">
                          <div>
                            <div className="font-medium text-gray-800">{renderTimeRange(s)}</div>
                            <div className="text-xs text-gray-500">{s.day_display ?? dayName(s.day)}</div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => openModal(s)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-sm shadow-sm"
                              title="Modifier"
                            >
                              <FaEdit /> Modifier
                            </button>
                            <button
                              onClick={() => handleDelete(s.id)}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-sm shadow-sm"
                              title="Supprimer"
                            >
                              <FaTrash /> Supprimer
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm z-50 p-4">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-2xl">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
              {currentSlot ? "Modifier un créneau" : "Ajouter un créneau"}
            </h2>

            <div className="space-y-3">
              <label className="text-sm text-gray-600 block">Jour</label>
              <select
                value={form.day}
                onChange={(e) => setForm({ ...form, day: e.target.value })}
                className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-400"
              >
                <option value="">Sélectionne un jour</option>
                {DAYS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                <option value="">Autre</option>
              </select>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-sm text-gray-600 block">Début</label>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-sm text-gray-600 block">Fin</label>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-800 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-white font-medium hover:scale-105 transition"
              >
                {currentSlot ? "Modifier" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
