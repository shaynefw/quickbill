"use client";

import { useEffect, useState, useCallback } from "react";
import { localDateString } from "@/lib/dates";

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Appointment {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string | null;
  location: string;
  status: string;
  clientId: string | null;
  client: { id: string; name: string; email: string } | null;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

const statusColors: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};

export default function CalendarPage() {
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    const from = startOfMonth(viewMonth).toISOString();
    const to = endOfMonth(viewMonth).toISOString();
    const res = await fetch(`/api/appointments?from=${from}&to=${to}`);
    setAppointments(await res.json());
    setLoading(false);
  }, [viewMonth]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then(setClients);
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const startDate = form.get("startDate") as string;
    const startTime = form.get("startTime") as string;
    const endTime = form.get("endTime") as string;
    const body = {
      title: form.get("title") as string,
      description: form.get("description") as string,
      startTime: new Date(`${startDate}T${startTime}`).toISOString(),
      endTime: endTime
        ? new Date(`${startDate}T${endTime}`).toISOString()
        : null,
      location: form.get("location") as string,
      status: form.get("status") as string,
      clientId: (form.get("clientId") as string) || null,
    };

    if (editing) {
      await fetch(`/api/appointments/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setShowForm(false);
    setEditing(null);
    setSelectedDate(null);
    fetchAppointments();
  }

  async function deleteAppointment(id: string) {
    if (!confirm("Delete this appointment?")) return;
    await fetch(`/api/appointments/${id}`, { method: "DELETE" });
    fetchAppointments();
  }

  function openNew(date?: Date) {
    setEditing(null);
    setSelectedDate(date || new Date());
    setShowForm(true);
  }

  function openEdit(appt: Appointment) {
    setEditing(appt);
    setSelectedDate(new Date(appt.startTime));
    setShowForm(true);
  }

  // Build calendar grid (6 weeks max)
  const monthStart = startOfMonth(viewMonth);
  const firstWeekday = monthStart.getDay();
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - firstWeekday);

  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const today = new Date();

  // Get appointments grouped by day
  function appointmentsForDay(d: Date) {
    return appointments.filter((a) => sameDay(new Date(a.startTime), d));
  }

  const monthLabel = viewMonth.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  // Upcoming list (next 30 days, scheduled only)
  const upcoming = appointments
    .filter(
      (a) =>
        a.status === "scheduled" &&
        new Date(a.startTime) >= today
    )
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )
    .slice(0, 5);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 sm:mb-8 flex-wrap gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Calendar</h1>
        <button
          onClick={() => openNew()}
          className="px-3 sm:px-4 py-2 sm:py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark transition flex items-center gap-2 text-sm sm:text-base"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">New Appointment</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMonth(addMonths(viewMonth, -1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Previous month"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-semibold min-w-[160px] text-center">{monthLabel}</h2>
          <button
            onClick={() => setViewMonth(addMonths(viewMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg"
            title="Next month"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <button
          onClick={() => setViewMonth(startOfMonth(new Date()))}
          className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-gray-50"
        >
          Today
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-3 bg-card-bg rounded-xl border border-border overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-border bg-background">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="px-2 py-2 text-xs font-medium text-muted text-center">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((d, i) => {
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const isToday = sameDay(d, today);
              const dayAppts = appointmentsForDay(d);
              return (
                <div
                  key={i}
                  onClick={() => openNew(d)}
                  className={`min-h-[80px] sm:min-h-[110px] p-1.5 border-b border-r border-border last:border-r-0 cursor-pointer hover:bg-gray-50 ${
                    !inMonth ? "bg-background/50 text-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span
                      className={`text-xs inline-flex items-center justify-center ${
                        isToday
                          ? "w-6 h-6 rounded-full bg-primary text-white font-semibold"
                          : "font-medium"
                      }`}
                    >
                      {d.getDate()}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {dayAppts.slice(0, 3).map((a) => (
                      <button
                        key={a.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(a);
                        }}
                        className={`w-full text-left text-[10px] sm:text-xs px-1.5 py-0.5 rounded border truncate ${statusColors[a.status] || statusColors.scheduled}`}
                      >
                        {new Date(a.startTime).toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        {a.title}
                      </button>
                    ))}
                    {dayAppts.length > 3 && (
                      <p className="text-[10px] text-muted px-1">+{dayAppts.length - 3} more</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming list */}
        <div className="bg-card-bg rounded-xl border border-border p-4">
          <h3 className="font-semibold mb-3 text-sm">Upcoming</h3>
          {loading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-muted">No upcoming appointments.</p>
          ) : (
            <div className="space-y-2">
              {upcoming.map((a) => (
                <button
                  key={a.id}
                  onClick={() => openEdit(a)}
                  className="w-full text-left p-2 rounded-lg border border-border hover:bg-gray-50"
                >
                  <p className="text-sm font-medium truncate">{a.title}</p>
                  <p className="text-xs text-muted">
                    {new Date(a.startTime).toLocaleString([], {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                  {a.client && (
                    <p className="text-xs text-primary mt-0.5 truncate">{a.client.name}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card-bg rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">
              {editing ? "Edit Appointment" : "New Appointment"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  name="title"
                  required
                  defaultValue={editing?.title}
                  placeholder="e.g. Meeting with John"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
                <select
                  name="clientId"
                  defaultValue={editing?.clientId || ""}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
                >
                  <option value="">No client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Date *</label>
                  <input
                    name="startDate"
                    type="date"
                    required
                    defaultValue={
                      editing
                        ? localDateString(new Date(editing.startTime))
                        : selectedDate
                        ? localDateString(selectedDate)
                        : localDateString()
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Start *</label>
                  <input
                    name="startTime"
                    type="time"
                    required
                    defaultValue={
                      editing
                        ? new Date(editing.startTime).toTimeString().slice(0, 5)
                        : "09:00"
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End</label>
                  <input
                    name="endTime"
                    type="time"
                    defaultValue={
                      editing?.endTime
                        ? new Date(editing.endTime).toTimeString().slice(0, 5)
                        : ""
                    }
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  name="location"
                  defaultValue={editing?.location}
                  placeholder="Office, Zoom, address, etc."
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  name="status"
                  defaultValue={editing?.status || "scheduled"}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white"
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={editing?.description}
                  placeholder="Additional details..."
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
                {editing && (
                  <button
                    type="button"
                    onClick={() => {
                      deleteAppointment(editing.id);
                      setShowForm(false);
                      setEditing(null);
                    }}
                    className="px-4 py-2 text-danger border border-danger rounded-lg text-sm hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
                <div className="flex gap-3 sm:ml-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setEditing(null);
                    }}
                    className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary-dark"
                  >
                    {editing ? "Update" : "Create"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
