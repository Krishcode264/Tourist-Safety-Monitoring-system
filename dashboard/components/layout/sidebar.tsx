"use client"

import {
  LayoutDashboard,
  MapPin,
  AlertTriangle,
  Shield,
  BarChart2,
  Users,
  LogOut,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"
import { cn } from "@/lib/utils"

interface SidebarProps {
  userRole?: string
}

const navItems = [
  { href: "/",               label: "Overview",      icon: LayoutDashboard, exact: true },
  { href: "/map",            label: "Live Tracking", icon: MapPin },
  { href: "/incidents",      label: "Incidents",     icon: AlertTriangle },
  { href: "/id-verification",label: "Digital ID",    icon: Shield },
  { href: "/analytics",      label: "Analytics",     icon: BarChart2 },
  { href: "/users",          label: "Team",          icon: Users },
]

function getInitials(name?: string | null) {
  if (!name) return "OF"
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function Sidebar({ userRole = "L2" }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  return (
    <aside className="w-60 bg-sidebar border-r border-sidebar-border flex flex-col select-none shrink-0">
      {/* ── Brand ── */}
      <div className="h-[65px] px-5 flex items-center gap-3 border-b border-sidebar-border shrink-0">
        {/* Shield mark */}
        <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
          <Shield className="w-4.5 h-4.5 text-white" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-bold tracking-tight text-white leading-none">SafetyHub</p>
          <p className="text-[11px] text-sidebar-foreground/50 mt-0.5">Tourist Safety</p>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5" aria-label="Main navigation">
        <p className="px-3 mb-3 text-[10px] font-semibold tracking-widest uppercase text-sidebar-foreground/30">
          Operations
        </p>
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-100",
                isActive ? "nav-active" : "nav-inactive"
              )}
            >
              <Icon
                className={cn(
                  "w-[18px] h-[18px] shrink-0 transition-colors",
                  isActive ? "text-white" : "text-sidebar-foreground/50"
                )}
                strokeWidth={isActive ? 2 : 1.75}
              />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <ChevronRight className="ml-auto w-3.5 h-3.5 text-white/50 shrink-0" strokeWidth={2} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* ── Account footer ── */}
      <div className="px-3 pb-4 border-t border-sidebar-border pt-3 space-y-1">
        {/* User identity */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-sidebar-primary/30 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-semibold text-sidebar-primary-foreground">
              {getInitials(user?.fullName || user?.username)}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-white truncate leading-tight">
              {user?.fullName || user?.username || "Officer"}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate">
              {user?.roleName || userRole} · {user?.regionName || "Dispatch"}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm nav-inactive transition-colors"
          aria-label="Log out"
        >
          <LogOut className="w-4 h-4 shrink-0 text-sidebar-foreground/40" strokeWidth={1.75} />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  )
}
