"use client";

import { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./CalendarView.css";

const DnDCalendar = withDragAndDrop(Calendar);

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

export default function CalendarView() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState("week");
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch("/api/sessions");
      if (!response.ok) {
        throw new Error("Failed to fetch sessions");
      }
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEventUpdate = async (sessionId, updates) => {
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update session");
      }

      const updatedSession = await response.json();
      // Update local state
      setSessions((prevSessions) =>
        prevSessions.map((session) => (session._id === sessionId ? updatedSession : session))
      );
    } catch (err) {
      console.error("Error updating session:", err);
      setError(err.message);
    }
  };

  const getEventStyle = (event) => {
    const backgroundColor =
      {
        scheduled: "#3b82f6", // blue
        "in-progress": "#f59e0b", // yellow
        completed: "#10b981", // green
        cancelled: "#6b7280", // gray
        "no-show": "#ef4444", // red
      }[event.status] || "#3b82f6";

    return {
      style: {
        backgroundColor,
        borderRadius: "4px",
        opacity: 0.8,
        color: "white",
        border: "0px",
        display: "block",
      },
    };
  };

  const events = sessions.map((session) => ({
    id: session._id,
    title: `${session.clientId.name} - ${session.type}`,
    start: new Date(session.date),
    end: new Date(new Date(session.date).getTime() + session.duration * 60000),
    status: session.status,
    type: session.type,
    format: session.format,
  }));

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{error}</span>
        <button
          onClick={fetchSessions}
          className="mt-2 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="h-[600px] p-4">
      <DnDCalendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: "100%" }}
        eventPropGetter={getEventStyle}
        views={["month", "week", "day"]}
        view={view}
        onView={setView}
        date={date}
        onNavigate={setDate}
        defaultView="week"
        selectable
        resizable
        onEventDrop={({ event, start, end }) => {
          // Handle event drop - update session date and duration
          const sessionId = event.id;
          const duration = Math.round((end - start) / (1000 * 60)); // Convert to minutes
          handleEventUpdate(sessionId, {
            date: start.toISOString(),
            duration: duration,
          });
        }}
        onEventResize={({ event, start, end }) => {
          // Handle event resize - update session duration
          const sessionId = event.id;
          const duration = Math.round((end - start) / (1000 * 60)); // Convert to minutes
          handleEventUpdate(sessionId, { duration });
        }}
        onSelectEvent={(event) => {
          // Handle event click - navigate to session detail
          window.location.href = `/sessions/${event.id}`;
        }}
        onSelectSlot={(slotInfo) => {
          // Handle slot selection - create new session
          window.location.href = `/sessions/new?date=${slotInfo.start.toISOString()}`;
        }}
      />
    </div>
  );
}
