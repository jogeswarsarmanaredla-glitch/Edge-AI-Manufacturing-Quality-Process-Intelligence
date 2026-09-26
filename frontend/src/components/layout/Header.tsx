import { Bell } from "lucide-react";

function Header() {
  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-6 py-4">
      
      {/* Left side */}
      <div>
        <p className="text-sm text-slate-400">
          Factory Operations
        </p>

        <h2 className="text-2xl font-bold">
          Manufacturing AI
        </h2>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">

        {/* Notification button */}
        <button
          className="relative rounded-lg border border-slate-700 p-2 hover:bg-slate-800"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />

          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px]">
            3
          </span>
        </button>

        {/* Current area */}
        <div className="hidden rounded-lg border border-slate-700 px-3 py-2 text-sm md:block">
          Production Floor
        </div>

      </div>

    </header>
  );
}

export default Header;