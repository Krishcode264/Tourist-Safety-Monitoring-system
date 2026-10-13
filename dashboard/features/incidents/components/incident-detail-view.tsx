"use client"

import { useIncidentDetail, useUpdateIncidentStatus, useUpdateIncident, useAssignOfficers } from "../hooks/use-incidents"
import { useUsers } from "../../users/hooks/use-users"
import { useAuth } from "@/components/providers/auth-provider"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle, MapPin, Clock, Edit2, Users, AlertTriangle, ArrowLeft, MessageSquare, CheckCircle2, Radio } from "lucide-react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface IncidentDetailViewProps {
  id: string
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    CRITICAL: "badge-critical border",
    HIGH:     "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/40",
    WARNING:  "badge-warning border",
    LOW:      "badge-success border",
    INFO:     "badge-info border",
  }
  return (
    <span className={cn("inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded", map[severity?.toUpperCase()] ?? "badge-info border")}>
      {severity}
    </span>
  )
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="section-label">{label}</p>
      <div className="text-[14px] font-medium text-foreground">{children}</div>
    </div>
  )
}

export function IncidentDetailView({ id }: IncidentDetailViewProps) {
  const router = useRouter()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [selectedOfficerIds, setSelectedOfficerIds] = useState<string[]>([])

  const { data: incident, isLoading, error } = useIncidentDetail(id)
  const { data: users } = useUsers()
  const { user: currentUser } = useAuth()

  const updateStatusMutation = useUpdateIncidentStatus()
  const updateIncidentMutation = useUpdateIncident()
  const assignOfficersMutation = useAssignOfficers()

  const handleUpdateDetails = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!incident) return
    const formData = new FormData(e.currentTarget)
    await updateIncidentMutation.mutateAsync({
      id: incident.id,
      description: formData.get("description"),
      severity: formData.get("severity"),
      type: formData.get("type"),
    })
    setIsEditModalOpen(false)
  }

  const handleAssign = async () => {
    if (!incident) return
    await assignOfficersMutation.mutateAsync({ id: incident.id, officerIds: selectedOfficerIds })
    setIsAssignModalOpen(false)
    setSelectedOfficerIds([])
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-12">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    )
  }

  if (error || !incident) {
    return (
      <div className="m-6 flex flex-col items-center gap-4 py-12 text-center">
        <AlertCircle className="w-8 h-8 text-destructive" strokeWidth={1.5} />
        <p className="text-sm text-destructive">Failed to load incident details.</p>
        <Button variant="outline" size="sm" onClick={() => router.back()}>
          Go Back
        </Button>
      </div>
    )
  }

  const ROLE_LEVELS: Record<string, number> = { L1: 1, L2: 2, L3: 3, L4: 4 }
  const officers = (users || []).filter((u: any) => {
    if (!currentUser || u.id === currentUser.id) return false
    if (incident?.assignments?.some((a: any) => a.userId === u.id)) return false
    return (ROLE_LEVELS[u.roleName] || 0) < (ROLE_LEVELS[currentUser.roleName] || 0)
  })

  const isResolved = incident.status === "RESOLVED"
  const isResponding = incident.status === "RESPONDING"

  return (
    <div className="p-6 space-y-6 max-w-screen-lg">
      {/* ── Breadcrumb / back ── */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={2} />
          Incidents
        </button>
        <span className="text-border">/</span>
        <span className="text-foreground font-medium truncate">{incident.type}</span>
      </div>

      {/* ── Incident card ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header band */}
        <div className="px-6 py-5 border-b border-border flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-[20px] font-semibold text-foreground">{incident.type}</h1>
              <SeverityBadge severity={incident.severity} />
            </div>
            <p className="text-[13px] text-muted-foreground mt-1">
              #{incident.id} &nbsp;·&nbsp; Reported {new Date(incident.createdAt).toLocaleString()}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
              onClick={() => router.push(`/incidents/${incident.id}/chat`)}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Chat
            </Button>

            {/* Edit dialog */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-sm">
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update Incident</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUpdateDetails} className="space-y-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="type">Incident Type</Label>
                    <Input id="type" name="type" defaultValue={incident.type} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="severity">Severity</Label>
                    <select
                      id="severity"
                      name="severity"
                      defaultValue={incident.severity}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="INFO">INFO</option>
                      <option value="WARNING">WARNING</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" defaultValue={incident.description} required />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                    <Button type="submit">Save Changes</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Assign dialog */}
            <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 text-sm">
                  <Users className="w-3.5 h-3.5" />
                  Assign
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Assign Officers</DialogTitle>
                </DialogHeader>
                <div className="py-3 space-y-1 max-h-72 overflow-y-auto">
                  {officers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No available officers to assign.</p>
                  ) : officers.map((officer: any) => (
                    <label
                      key={officer.id}
                      htmlFor={`off-${officer.id}`}
                      className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <Checkbox
                        id={`off-${officer.id}`}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedOfficerIds(prev => [...prev, officer.id])
                          else setSelectedOfficerIds(prev => prev.filter(i => i !== officer.id))
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium">{officer.fullName || officer.username}</p>
                        <p className="text-[12px] text-muted-foreground">
                          {officer.role?.name || "Officer"} · {officer.region?.name || "Unknown"}
                        </p>
                      </div>
                      <span className={cn(
                        "text-[11px] font-medium px-1.5 py-0.5 rounded",
                        officer.isOnline ? "badge-success" : "bg-muted text-muted-foreground"
                      )}>
                        {officer.isOnline ? "Online" : "Offline"}
                      </span>
                    </label>
                  ))}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAssignModalOpen(false)} disabled={assignOfficersMutation.isPending}>Cancel</Button>
                  <Button
                    onClick={handleAssign}
                    disabled={assignOfficersMutation.isPending || selectedOfficerIds.length === 0}
                  >
                    {assignOfficersMutation.isPending ? "Assigning…" : `Assign (${selectedOfficerIds.length})`}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* ── Left: Info ── */}
          <div className="lg:col-span-3 p-6 space-y-6">
            {/* Description */}
            <div>
              <p className="section-label mb-2">Description</p>
              <p className="text-[14px] leading-relaxed text-foreground bg-muted/40 px-4 py-3 rounded-lg border border-border">
                {incident.description || "—"}
              </p>
            </div>

            {/* Meta grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <MetaField label="Status">
                <span className={cn(
                  "inline-block text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded border",
                  isResolved ? "badge-success" : isResponding ? "badge-warning" : "badge-critical"
                )}>
                  {incident.status}
                </span>
              </MetaField>
              <MetaField label="Region">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.75} />
                  {incident.region?.name || "Main Region"}
                </span>
              </MetaField>
              <MetaField label="Reported">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />
                  {new Date(incident.createdAt).toLocaleDateString()}
                </span>
              </MetaField>
            </div>

            {/* Tourist card */}
            {incident.tourist && (
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-[13px] font-semibold flex items-center gap-2 text-foreground">
                    <Users className="w-4 h-4 text-primary" strokeWidth={1.75} />
                    Tourist
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[12px] gap-1.5 text-primary hover:text-primary px-2"
                    onClick={() =>
                      router.push(`/map?touristId=${incident.tourist?.id}&lat=${incident.latitude}&lng=${incident.longitude}&label=${encodeURIComponent(incident.tourist?.fullName ?? "")}`)
                    }
                  >
                    <MapPin className="w-3 h-3" />
                    Show on map
                  </Button>
                </div>
                <p className="text-[14px] font-medium mt-2">{incident.tourist.fullName}</p>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {incident.tourist.phoneNumber} · {incident.tourist.nationality}
                </p>
              </div>
            )}

            {/* Status action bar */}
            <div className="flex gap-3 pt-2 border-t border-border">
              <Button
                className="flex-1 gap-2"
                onClick={() => updateStatusMutation.mutate({ id: incident.id, status: "RESOLVED" })}
                disabled={isResolved || updateStatusMutation.isPending}
                variant={isResolved ? "outline" : "default"}
              >
                <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                {isResolved ? "Resolved" : "Mark Resolved"}
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={() => updateStatusMutation.mutate({ id: incident.id, status: "RESPONDING" })}
                disabled={isResponding || isResolved || updateStatusMutation.isPending}
                variant="secondary"
              >
                <Radio className="w-4 h-4" strokeWidth={2} />
                Dispatch Response
              </Button>
            </div>
          </div>

          {/* ── Right: Timeline ── */}
          <div className="lg:col-span-2 p-6">
            <h3 className="text-[15px] font-semibold text-foreground mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
              Activity Timeline
            </h3>

            {incident.actions && incident.actions.length > 0 ? (
              <div className="relative pl-5">
                {/* Spine */}
                <div className="absolute left-1.5 top-2 bottom-2 w-px bg-border" />
                <div className="space-y-5">
                  {incident.actions.map((action: any) => (
                    <div key={action.id} className="relative">
                      {/* Dot */}
                      <div className="absolute -left-[15px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-card" />
                      <div className="bg-muted/40 p-3 rounded-lg border border-border">
                        <p className="text-[13px] font-medium text-foreground">{action.details || action.actionType}</p>
                        <div className="flex items-center justify-between mt-1.5 gap-2">
                          <span className="text-[11px] text-muted-foreground">
                            {new Date(action.timestamp).toLocaleString()}
                          </span>
                          {action.user && (
                            <span className="text-[11px] text-muted-foreground truncate">
                              by {action.user.fullName || action.user.username}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <AlertTriangle className="w-6 h-6 text-muted-foreground/40" strokeWidth={1.5} />
                <p className="text-[13px] text-muted-foreground">No activity logged yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
