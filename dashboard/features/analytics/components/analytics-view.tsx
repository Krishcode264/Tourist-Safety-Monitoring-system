"use client"

import { useAnalytics } from "../hooks/use-analytics"
import { TrendingUp, TrendingDown, Calendar, Download, Loader2, AlertCircle } from "lucide-react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"

/* Restrained, accessible series palette tied to CSS vars */
const PIE_COLORS = ["#2563EB", "#0F766E", "#B45309", "#7C3AED", "#B91C1C"]

export function AnalyticsView() {
  const { data: analyticsData, isLoading, error } = useAnalytics()

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
        Failed to load analytics data.
      </div>
    )
  }

  const kpiItems = [
    {
      label: "Total Incidents",
      value: analyticsData?.kpis?.totalIncidents?.value ?? 0,
      change: `+${analyticsData?.kpis?.totalIncidents?.delta ?? 0}%`,
      up: analyticsData?.kpis?.totalIncidents?.trend === "up",
    },
    {
      label: "Resolution Rate",
      value: `${analyticsData?.kpis?.resolutionRate?.value ?? "--"}%`,
      change: `${analyticsData?.kpis?.resolutionRate?.delta ?? 0}%`,
      up: analyticsData?.kpis?.resolutionRate?.trend === "up",
    },
    {
      label: "Avg Response Time",
      value: analyticsData?.kpis?.avgResponseTime?.value ?? "N/A",
      change: `${analyticsData?.kpis?.avgResponseTime?.delta ?? 0}`,
      up: analyticsData?.kpis?.avgResponseTime?.trend !== "up",
    },
    {
      label: "Safety Score",
      value: `${analyticsData?.kpis?.safetyScore?.value ?? "--"}/10`,
      change: `+${analyticsData?.kpis?.safetyScore?.delta ?? 0}`,
      up: analyticsData?.kpis?.safetyScore?.trend === "up",
    },
  ]

  const incidentsByTypeData = analyticsData?.charts?.incidentsByType || []
  const weeklyTrendData = analyticsData?.charts?.weeklyTrend || []

  const tooltipStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    fontSize: "13px",
    color: "var(--foreground)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-xl">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-muted border border-border">
            <Calendar className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
          </div>
          <select className="text-sm bg-transparent border-none outline-none text-muted-foreground font-medium cursor-pointer">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>Last 90 Days</option>
            <option>This Year</option>
          </select>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpiItems.map((item, idx) => {
          const TrendIcon = item.up ? TrendingUp : TrendingDown
          return (
            <div key={idx} className="bg-card border border-border rounded-xl p-5">
              <p className="section-label">{item.label}</p>
              <p className="mt-2 text-[28px] font-bold text-foreground leading-none tabular">{item.value}</p>
              <p className={`mt-2 text-[12px] flex items-center gap-1 ${item.up ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                <TrendIcon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
                {item.change} vs last month
              </p>
            </div>
          )
        })}
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut — Incidents by Type */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-[380px]">
          <h2 className="text-[15px] font-semibold text-foreground mb-1">Incidents by Type</h2>
          <p className="text-[12px] text-muted-foreground mb-5">Distribution across incident categories</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incidentsByTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="count"
                  nameKey="type"
                  animationBegin={0}
                  animationDuration={900}
                >
                  {incidentsByTypeData.map((_: any, index: number) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={PIE_COLORS[index % PIE_COLORS.length]}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  formatter={(value) => (
                    <span style={{ color: "var(--foreground)", fontSize: "12px" }}>{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Area — Weekly trend */}
        <div className="bg-card border border-border rounded-xl p-6 flex flex-col h-[380px]">
          <h2 className="text-[15px] font-semibold text-foreground mb-1">Weekly Incident Trend</h2>
          <p className="text-[12px] text-muted-foreground mb-5">Number of incidents reported per day</p>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyTrendData} margin={{ left: -16, right: 8 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  dy={8}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#2563EB"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#areaGrad)"
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
