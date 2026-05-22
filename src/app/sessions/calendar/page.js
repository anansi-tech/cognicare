import CalendarView from "@/app/components/sessions/CalendarView";
import Link from "next/link";

export default function CalendarPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Session Calendar</h1>
        <Link
          href="/sessions/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          New Session
        </Link>
      </div>
      <div className="bg-white rounded-lg shadow">
        <CalendarView />
      </div>
    </div>
  );
}
