"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Megaphone, Inbox,
  BarChart3, Settings, LogOut, Zap, UserCircle, Contact,
} from "lucide-react";
import { clearSession } from "@/lib/auth";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/app/leads", label: "Leads", icon: Users },
  { href: "/app/contacts", label: "Contacts", icon: Contact },
  { href: "/app/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/app/inbox", label: "Inbox / Replies", icon: Inbox },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/account", label: "Account", icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function logout() {
    clearSession();
    router.push("/auth/login");
  }

  return (
    <aside
      className="flex flex-col w-64 min-h-screen border-r border-white/[0.06]"
      style={{
        background: "linear-gradient(180deg, #0e0b2e 0%, #080520 60%, #06041a 100%)",
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-white/[0.06]">
        <div className="w-8 h-8 bg-gradient-to-br from-brand-400 to-brand-700 rounded-xl flex items-center justify-center shadow-lg shadow-brand-600/40">
          <Zap size={14} className="text-white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-[15px] tracking-tight text-white">Purleads</span>
      </div>

      {/* Workspace switcher */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <WorkspaceSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-gradient-to-r from-brand-600/80 to-brand-500/60 text-white shadow-lg shadow-brand-600/20 border border-brand-400/20"
                  : "text-white/40 hover:bg-white/[0.06] hover:text-white/80"
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/[0.06]">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/35 hover:bg-white/[0.06] hover:text-white/70 transition-all w-full"
        >
          <LogOut size={16} strokeWidth={2} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
