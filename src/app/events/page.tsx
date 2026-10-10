import Link from "next/link";
import { getAllEvents } from "@/lib/events";

export const metadata = {
  title: "Events & Workshops | Coding Club",
  description: "Browse upcoming hackathons, guest lectures, and coding workshops.",
};

export default function EventsPage() {
  const events = getAllEvents();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-8 sm:flex-row sm:items-end dark:border-gray-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl dark:text-white">
            Workshops &amp; Hackathons
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Meet fellow developers, sharpen skills, and build projects together.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 self-start rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
        >
          <span>Manage Events</span>
          <span className="font-mono text-xs opacity-80">/admin</span>
        </Link>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {events.length === 0 ? (
          <div className="col-span-2 rounded-xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
            No events scheduled yet. Add one in <Link href="/admin" className="text-blue-600 underline">/admin</Link>!
          </div>
        ) : (
          events.map((event) => (
            <div
              key={event.slug}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                  {event.location}
                </div>
                <h2 className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                  {event.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {event.description}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
                <span className="text-xs text-gray-400">
                  {event.date ? new Date(event.date).toLocaleDateString() : "Date TBA"}
                </span>
                {event.registrationUrl ? (
                  <a
                    href={event.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    Register &rarr;
                  </a>
                ) : (
                  <span className="text-xs font-medium text-gray-500">Free Entry</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
