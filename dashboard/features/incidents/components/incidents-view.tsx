"use client"

import { useIncidents } from "../hooks/use-incidents"
import { Button } from "@/components/ui/button"
import {
  Loader2, AlertCircle, MapPin, Clock, ChevronRight,
  RefreshCcw, Siren, ShieldAlert, Filter
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useAuth } from "@/components/providers/auth-provider"
import { cn } from "@/lib/utils"

/* ── Helpers ── */
function severityClass(s: string) {
  switch (s?.toUpperCase()) {
    case "CRITICAL": return "badge-critical border"
    case "HIGH":     return "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/40"
    case "WARNING":  return "badge-warning border"
    case "LOW":      return "badge-success border"
    default:         return "badge-info border"
  }
}

function statusClass(s: string) {
  switch (s?.toUpperCase()) {
    case "OPEN":       return "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/40"
    case "ACTIVE":     return "bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/40"
    case "RESPONDING": return "badge-warning border"
    case "RESOLVED":   return "badge-success border"
    default:           return "badge-info border"
  }
}

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded", className)}>
      {children}
    </span>
  )
}

const isSOS = (inc: any) => inc.type?.toUpperCase() === "SOS"

/* ── SOS Banner Card ── */
function SOSCard({ incident }: { incident: any }) {
  const router = useRouter()
  return (
    <div
      onClick={() => router.push(`/incidents/${incident.id}`)}
      className="cursor-pointer flex items-start gap-4 p-4 rounded-xl border-2 border-red-400 bg-red-50 dark:bg-red-950/30 dark:border-red-700 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors group"
    >
      {/* Pulsing icon */}
      <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-red-500 shadow-lg shadow-red-200 dark:shadow-red-900">
        <Siren className="w-5 h-5 text-white" strokeWidth={2} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
            🆘 SOS Emergency
          </span>
          <Badge className={statusClass(incident.status)}>{incident.status}</Badge>
          {incident.status !== "RESOLVED" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-500 dark:text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        <p className="text-[13px] font-semibold text-red-900 dark:text-red-200 truncate">
          {incident.description || "Emergency assistance requested"}
        </p>
        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
          {incident.tourist && (
            <span className="text-[12px] text-red-700 dark:text-red-300 font-medium">
              {incident.tourist.fullName || "Tourist"} · {incident.tourist.phoneNumber}
            </span>
          )}
          {incident.region && (
            <span className="flex items-center gap-1 text-[11px] text-red-600/80 dark:text-red-400/80">
              <MapPin className="w-3 h-3" strokeWidth={1.75} />
              {incident.region.name}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-red-500/70 dark:text-red-400/70">
            <Clock className="w-3 h-3" strokeWidth={1.75} />
            {new Date(incident.createdAt).toLocaleString()}
          </span>
        </div>
      </div>

      <ChevronRight className="w-4 h-4 text-red-400 shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />
    </div>
  )
}

/* ── Main View ── */
type TabType = "all" | "sos" | "assigned"

export function IncidentsView() {
  const router = useRouter()
  const { data: incidents, isLoading, error, refetch } = useIncidents() as any
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>("all")

  const all = incidents || []
  const sosList = all.filter(isSOS)
  const normalList = all.filter((i: any) => !isSOS(i))
  const assignedList = all.filter((inc: any) =>
    inc.assignments?.some((a: any) => a.userId === user?.id)
  )

  const activeSOS = sosList.filter((i: any) => i.status !== "RESOLVED")

  const filtered =
    activeTab === "sos"      ? sosList :
    activeTab === "assigned" ? assignedList :
    normalList  // "all" tab shows non-SOS incidents; SOS has its own section above

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="m-6 p-5 flex items-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive text-sm">
        <AlertCircle className="w-5 h-5 shrink-0" strokeWidth={1.5} />
        <span>Failed to load incidents. Please make sure the backend is running.</span>
        {refetch && (
          <button onClick={refetch} className="ml-auto flex items-center gap-1.5 text-xs underline underline-offset-2">
            <RefreshCcw className="w-3.5 h-3.5" />
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">

      {/* ══ SOS Section — always visible when there are active SOS ══ */}
      {activeTab !== "sos" && activeSOS.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-[13px] font-bold uppercase tracking-widest text-red-600 dark:text-red-400">
                Active SOS Emergencies
              </h2>
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold">
                {activeSOS.length}
              </span>
            </div>
            <button
              onClick={() => setActiveTab("sos")}
              className="text-[12px] text-red-500 hover:text-red-700 font-medium underline underline-offset-2"
            >
              View all SOS
            </button>
          </div>
          <div className="space-y-2">
            {activeSOS.map((inc: any) => <SOSCard key={inc.id} incident={inc} />)}
          </div>
          <div className="border-t border-border" />
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/60 border border-border w-max">
          {([
            { key: "all" as const,      label: "All Incidents",   count: normalList.length,  danger: false },
            { key: "sos" as const,      label: "SOS Only",        count: sosList.length,     danger: true  },
            { key: "assigned" as const, label: "Assigned to Me",  count: assignedList.length, danger: false },
          ]).map(({ key, label, count, danger }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                "relative px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5",
                activeTab === key
                  ? danger
                    ? "bg-red-500 shadow-sm text-white border border-red-600"
                    : "bg-card shadow-sm text-foreground border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {key === "sos" && <Siren className="w-3.5 h-3.5" strokeWidth={2} />}
              {label}
              {count > 0 && (
                <span className={cn(
                  "inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold",
                  activeTab === key && danger
                    ? "bg-white/20 text-white"
                    : danger
                    ? "bg-red-500 text-white"
                    : "bg-primary/10 text-primary"
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="sm:ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-sm">
            <Filter className="w-3.5 h-3.5" />
            Filter
          </Button>
          <Button size="sm" className="gap-1.5 text-sm">
            + Manual Report
          </Button>
        </div>
      </div>

      {/* ── SOS tab full list ── */}
      {activeTab === "sos" && (
        <div className="space-y-2">
          {sosList.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldAlert className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-muted-foreground text-sm">No SOS incidents on record.</p>
            </div>
          ) : (
            sosList.map((inc: any) => <SOSCard key={inc.id} incident={inc} />)
          )}
        </div>
      )}

      {/* ── Normal incident table (all / assigned tabs) ── */}
      {activeTab !== "sos" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  {["Type & Description", "Severity", "Status", "Region", "Reported At", ""].map((h, i) => (
                    <th
                      key={i}
                      className={cn(
                        "px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                        i === 5 && "text-right"
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <p className="text-muted-foreground text-sm">
                        {activeTab === "all" ? "No incidents found." : "No incidents assigned to you."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((incident: any) => (
                    <tr
                      key={incident.id}
                      className="hover:bg-muted/30 transition-colors cursor-pointer group"
                      onClick={() => router.push(`/incidents/${incident.id}`)}
                    >
                      {/* Type */}
                      <td className="px-4 py-3.5">
                        <p className="text-[14px] font-medium text-foreground">{incident.type}</p>
                        {incident.description && (
                          <p className="text-[12px] text-muted-foreground truncate max-w-[220px] mt-0.5">
                            {incident.description}
                          </p>
                        )}
                      </td>
                      {/* Severity */}
                      <td className="px-4 py-3.5">
                        <Badge className={severityClass(incident.severity)}>{incident.severity}</Badge>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <Badge className={statusClass(incident.status)}>{incident.status}</Badge>
                      </td>
                      {/* Region */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.75} />
                          {incident.region?.name || "Unknown"}
                        </div>
                      </td>
                      {/* Time */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                          <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                          {new Date(incident.createdAt).toLocaleString()}
                        </div>
                      </td>
                      {/* CTA */}
                      <td className="px-4 py-3.5 text-right">
                        <span className="inline-flex items-center text-[13px] font-medium text-primary gap-1 group-hover:gap-2 transition-all">
                          View
                          <ChevronRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center">
              <span className="text-[12px] text-muted-foreground">
                {filtered.length} incident{filtered.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
