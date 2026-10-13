"use client"

import { useRecentIncidentsOverview } from "../hooks/use-overview"
import { ChevronRight, Loader2, AlertCircle, AlertTriangle, Info, CheckCircle2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

function SeverityDot({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500",
    high:     "bg-orange-500",
    warning:  "bg-amber-500",
    medium:   "bg-amber-500",
    low:      "bg-emerald-500",
    info:     "bg-blue-500",
  }
  return (
    <span
      className={cn(
        "inline-block w-1.5 h-1.5 rounded-full shrink-0 mt-[6px]",
        map[severity?.toLowerCase()] ?? "bg-slate-400"
      )}
    />
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "badge-critical border",
    high:     "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50",
    warning:  "badge-warning border",
    medium:   "badge-warning border",
    low:      "badge-success border",
    info:     "badge-info border",
  }
  return (
    <span
      className={cn(
        "inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded",
        map[severity?.toLowerCase()] ?? "bg-muted text-muted-foreground"
      )}
    >
      {severity}
    </span>
  )
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    open:       "text-red-600 dark:text-red-400",
    active:     "text-red-600 dark:text-red-400",
    responding: "text-amber-600 dark:text-amber-400",
    resolved:   "text-emerald-600 dark:text-emerald-400",
  }
  return (
    <span className={cn("text-[11px] font-medium capitalize", map[status?.toLowerCase()] ?? "text-muted-foreground")}>
      {status}
    </span>
  )
}

export function RecentIncidents() {
  const router = useRouter()
  const { data: incidents, isLoading, error } = useRecentIncidentsOverview()

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex justify-center items-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center items-center h-64 gap-2 text-destructive">
        <AlertCircle className="w-6 h-6" strokeWidth={1.5} />
        <p className="text-sm">Failed to load incidents</p>
      </div>
    )
  }

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-border">
        <div>
          <h2 className="text-[15px] font-semibold text-foreground">Recent Incidents</h2>
          <p className="text-[12px] text-muted-foreground mt-0.5">Latest activity across all zones</p>
        </div>
        <button
          onClick={() => router.push("/incidents")}
          className="text-[13px] text-primary font-medium hover:text-primary/80 transition-colors"
        >
          View all →
        </button>
      </div>

      {/* Incident rows */}
      <div className="divide-y divide-border">
        {(incidents ?? []).map((incident: any) => (
          <button
            key={incident.id}
            type="button"
            className="w-full flex items-start gap-3 px-5 py-4 hover:bg-muted/40 transition-colors text-left"
            onClick={() => router.push(`/incidents/${incident.id}`)}
          >
            <SeverityDot severity={incident.severity} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[14px] font-medium text-foreground truncate">{incident.type}</span>
                <SeverityBadge severity={incident.severity} />
              </div>
              <p className="text-[13px] text-muted-foreground mt-0.5 truncate">{incident.locationMsg}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[11px] text-muted-foreground">{incident.timeSinceReported} ago</span>
                <span className="text-muted-foreground/40">·</span>
                <StatusChip status={incident.status} />
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-1" strokeWidth={2} />
          </button>
        ))}

        {(!incidents || incidents.length === 0) && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" strokeWidth={1.5} />
            <p className="text-sm text-muted-foreground">No recent incidents</p>
          </div>
        )}
      </div>
    </div>
  )
}
