"use client"

import * as React from "react"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useKosh } from "./store"
import type { ItemStatus } from "@/lib/kosh-data"

export function ScreenHeader({
  title,
  subtitle,
  showBack = true,
  right,
}: {
  title: string
  subtitle?: string
  showBack?: boolean
  right?: React.ReactNode
}) {
  const { goBack } = useKosh()
  return (
    <header className="flex items-start gap-2">
      {showBack && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="-ml-1 mt-0.5 shrink-0"
          onClick={goBack}
          aria-label="Go back"
        >
          <ChevronLeft />
        </Button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold tracking-tight text-balance">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground text-pretty">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-medium uppercase tracking-wide text-muted-foreground", className)}>
      {children}
    </p>
  )
}

const statusStyles: Record<ItemStatus, { dot: string; border: string; label: string }> = {
  critical: { dot: "bg-destructive", border: "border-l-destructive", label: "Critical" },
  low: { dot: "bg-accent", border: "border-l-accent", label: "Low" },
  healthy: { dot: "bg-primary", border: "border-l-primary", label: "Healthy" },
}

export function StatusDot({ status }: { status: ItemStatus }) {
  return <span className={cn("inline-block size-2 rounded-full", statusStyles[status].dot)} aria-hidden />
}

export function statusBorder(status: ItemStatus) {
  return statusStyles[status].border
}

export function DaysRemaining({ days, status }: { days: number; status: ItemStatus }) {
  const tone =
    status === "critical"
      ? "text-destructive"
      : status === "low"
        ? "text-accent"
        : "text-muted-foreground"
  return (
    <span className={cn("text-xs font-medium tabular-nums", tone)}>
      {days} {days === 1 ? "day" : "days"}
    </span>
  )
}
