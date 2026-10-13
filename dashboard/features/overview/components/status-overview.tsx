"use client"

import { Activity, MapPin, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useZoneStatus } from "../hooks/use-overview"
import { cn } from "@/lib/utils"

const iconMap: Record<string, React.ElementType> = {
  "All Clear":    CheckCircle2,
  "Under Watch":  Activity,
  "Active Alert": AlertCircle,
  "Critical":     MapPin,
}

const colorMap: Record<string, { icon: string; bar: string; num: string }> = {
  "All Clear":    { icon: "text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", num: "text-emerald-700 dark:text-emerald-400" },
  "Under Watch":  { icon: "text-blue-600 dark:text-blue-400",       bar: "bg-blue-500",   num: "text-blue-700 dark:text-blue-400" },
  "Active Alert": { icon: "text-amber-600 dark:text-amber-400",     bar: "bg-amber-500",  num: "text-amber-700 dark:text-amber-400" },
  "Critical":     { icon: "text-red-600 dark:text-red-400",         bar: "bg-red-500",    num: "text-red-700 dark:text-red-400" },
}

export function StatusOverview() {
  const { data: zoneData, isLoading } = useZoneStatus()

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl flex items-center justify-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  const total = (zoneData || []).reduce((sum: number, z: any) => sum + (z.value || 0), 0)

  return (
    <div className="bg-card border border-border rounded-xl flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-[15px] font-semibold text-foreground">Zone Status</h2>
        <p className="text-[12px] text-muted-foreground mt-0.5">Geographic monitoring breakdown</p>
      </div>

      {/* Zones */}
      <div className="px-5 py-4 space-y-4 flex-1">
        {(zoneData || []).map((item: any) => {
          const Icon  = iconMap[item.label] ?? AlertCircle
          const c     = colorMap[item.label] ?? { icon: "text-slate-500", bar: "bg-slate-400", num: "text-slate-600" }
          const pct   = total > 0 ? Math.round((item.value / total) * 100) : 0

          return (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4 shrink-0", c.icon)} strokeWidth={1.75} />
                  <span className="text-[13px] font-medium text-foreground">{item.label}</span>
                </div>
                <span className={cn("text-[13px] font-semibold tabular", c.num)}>
                  {item.value}
                  <span className="text-muted-foreground/50 font-normal text-[11px] ml-1">zones</span>
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", c.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Action */}
      <div className="px-5 pb-5">
        <button className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 active:bg-primary/80 transition-colors">
          Generate Report
        </button>
      </div>
    </div>
  )
}
