"use client"

import { Search, Bell, Wifi, WifiOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { LiveNotifications } from "./live-notifications"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const routeTitles: Record<string, { label: string; description: string }> = {
  "/":                { label: "Overview",           description: "Real-time operational summary" },
  "/map":             { label: "Live Tracking",      description: "Tourist location & zone monitoring" },
  "/incidents":       { label: "Incidents",          description: "Active and historical incident log" },
  "/id-verification": { label: "Digital ID",         description: "Tourist identity verification" },
  "/analytics":       { label: "Analytics",          description: "Performance metrics & trends" },
  "/users":           { label: "Team",               description: "Officers and dispatch roster" },
  "/chat":            { label: "Communications",     description: "Incident messaging channel" },
}

function usePageMeta() {
  const pathname = usePathname()
  // Longest matching prefix wins
  let best = { label: "SafetyHub", description: "" }
  let bestLen = -1
  for (const [route, meta] of Object.entries(routeTitles)) {
    if (pathname.startsWith(route) && route.length > bestLen) {
      best = meta
      bestLen = route.length
    }
  }
  return best
}

export function TopBar() {
  const meta = usePageMeta()

  return (
    <header className="h-[65px] border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
      {/* Page identity */}
      <div className="flex items-baseline gap-3 min-w-0">
        <h1 className="text-[17px] font-semibold text-foreground leading-tight truncate">
          {meta.label}
        </h1>
        {meta.description && (
          <span className="hidden sm:inline text-sm text-muted-foreground truncate">
            {meta.description}
          </span>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 shrink-0 ml-4">
        {/* System status pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-background text-xs text-muted-foreground">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Operational</span>
        </div>

        {/* Global search */}
        <div className="relative hidden lg:block">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search incidents…"
            className="pl-8 h-8 w-52 text-sm bg-background"
          />
        </div>

        {/* Live notifications */}
        <LiveNotifications />
      </div>
    </header>
  )
}
