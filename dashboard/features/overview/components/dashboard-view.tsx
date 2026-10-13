"use client"

import { useOverviewStats } from "../hooks/use-overview"
import { MapPin, AlertTriangle, Users, TrendingUp, Loader2, ArrowUpRight, ArrowDownRight, Minus, Timer } from "lucide-react"
import { RecentIncidents } from "./recent-incidents"
import { StatusOverview } from "./status-overview"
import { cn } from "@/lib/utils"

interface StatCardProps {
  label: string
  value: string | number
  trend: string
  trendDir?: "up" | "down" | "flat"
  icon: React.ElementType
  accent: "red" | "blue" | "teal" | "violet" | "amber"
  sub?: string   // optional smaller subscript under trend
}

const accentMap = {
  red:    { icon: "bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400",       border: "border-red-100   dark:border-red-900/50",    trend: "text-red-600 dark:text-red-400" },
  blue:   { icon: "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400",   border: "border-blue-100  dark:border-blue-900/50",   trend: "text-blue-600 dark:text-blue-400" },
  teal:   { icon: "bg-teal-50 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400",   border: "border-teal-100  dark:border-teal-900/50",   trend: "text-teal-600 dark:text-teal-400" },
  violet: { icon: "bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400", border: "border-violet-100 dark:border-violet-900/50", trend: "text-violet-600 dark:text-violet-400" },
  amber:  { icon: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400",  border: "border-amber-100  dark:border-amber-900/50",  trend: "text-amber-600 dark:text-amber-400" },
}

function StatCard({ label, value, trend, trendDir = "flat", icon: Icon, accent, sub }: StatCardProps) {
  const c = accentMap[accent]
  const TrendIcon = trendDir === "up" ? ArrowUpRight : trendDir === "down" ? ArrowDownRight : Minus
  return (
    <div className={cn("bg-card rounded-xl border p-5 flex flex-col gap-4", c.border)}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", c.icon)}>
          <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
        </div>
      </div>
      <div>
        <p className="text-[28px] font-bold text-foreground leading-none tabular">{value}</p>
        <p className={cn("mt-2 text-[12px] flex items-center gap-1", c.trend)}>
          <TrendIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
          <span>{trend}</span>
        </p>
        {sub && (
          <p className="mt-1 text-[11px] text-muted-foreground/60">{sub}</p>
        )}
      </div>
    </div>
  )
}

export function DashboardView() {
  const { data: statsData, isLoading, error } = useOverviewStats()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 text-sm text-destructive bg-destructive/5 rounded-lg border border-destructive/20 m-6">
        Failed to load dashboard data. Please make sure the backend is running.
      </div>
    )
  }

  const avgTime = statsData?.avgResponseTime
  const avgTimeDisplay =
    avgTime?.label   ? avgTime.label   :
    avgTime?.minutes === null ? "--"   : "--"

  const avgTimeTrend =
    avgTime?.sampleSize > 0
      ? `from ${avgTime.sampleSize} incident${avgTime.sampleSize !== 1 ? "s" : ""}`
      : "No data yet"

  const avgTimeDir: "up" | "down" | "flat" =
    avgTime?.minutes === null ? "flat" :
    avgTime?.minutes < 10    ? "up"   : // fast = good = up arrow
    avgTime?.minutes < 30    ? "flat" : "down"

  const rr = statsData?.responseRate
  const rrDir: "up" | "down" | "flat" =
    (rr?.value ?? 100) >= 80 ? "up" : (rr?.value ?? 100) >= 60 ? "flat" : "down"

  const stats: StatCardProps[] = [
    {
      label: "Active Incidents",
      value: statsData?.activeIncidents?.count ?? 0,
      icon: AlertTriangle,
      accent: "red",
      trendDir: statsData?.activeIncidents?.trend === "up" ? "up" : "flat",
      trend: statsData?.activeIncidents?.trend === "up"
        ? `+${statsData?.activeIncidents?.delta} this hour`
        : "Stable",
      sub: statsData?.activeIncidents?.total !== undefined
        ? `${statsData.activeIncidents.total} total in region`
        : undefined,
    },
    {
      label: "Officers Online",
      value: statsData?.officersOnline?.count ?? 0,
      icon: Users,
      accent: "blue",
      trendDir: "up",
      trend: `+${statsData?.officersOnline?.delta ?? 0} since morning`,
    },
    {
      label: "Tourists Monitored",
      value: statsData?.touristsMonitored?.count ?? 0,
      icon: MapPin,
      accent: "teal",
      trendDir: "up",
      trend: `+${statsData?.touristsMonitored?.delta ?? 0} today`,
    },
    {
      label: "Response Rate",
      value: `${rr?.value ?? "--"}%`,
      icon: TrendingUp,
      accent: (rr?.value ?? 100) >= 80 ? "violet" : (rr?.value ?? 100) >= 60 ? "amber" : "red",
      trendDir: rrDir,
      trend: rr?.label ?? "N/A",
      sub: rr?.total > 0
        ? `${rr.respondedCount} of ${rr.total} incidents responded`
        : undefined,
    },
    {
      label: "Avg Response Time",
      value: avgTimeDisplay,
      icon: Timer,
      accent: "amber",
      trendDir: avgTimeDir,
      trend: avgTimeTrend,
      sub: "incident created → first admin reply",
    },
  ]

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">
      {/* KPI strip — 5 cards: 2 on sm, 3 on lg, 5 on xl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat, idx) => (
          <StatCard key={idx} {...stat} />
        ))}
      </div>

      {/* Main content split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentIncidents />
        </div>
        <div>
          <StatusOverview />
        </div>
      </div>
    </div>
  )
}
