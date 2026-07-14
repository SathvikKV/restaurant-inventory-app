"use client"

import * as React from "react"
import { Search, SlidersHorizontal, ChevronRight, X, Plus } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { inventory, type InventoryItem } from "@/lib/kosh-data"
import { useKosh } from "../store"
import { DaysRemaining, statusBorder } from "../parts"

// ─── Shared Components ─────────────────────────────────────────────────────

type FilterState = {
  status: string
  sortBy: string
}

function FilterSheet({
  open,
  onClose,
  filter,
  onApply,
}: {
  open: boolean
  onClose: () => void
  filter: FilterState
  onApply: (f: FilterState) => void
}) {
  const [local, setLocal] = React.useState(filter)

  const statusOptions = ["All", "Critical", "Low Stock", "Healthy"]
  const sortOptions = ["Name A–Z", "Days Remaining ↑", "Days Remaining ↓", "Quantity ↑", "Quantity ↓"]

  function apply() {
    onApply(local)
    onClose()
  }

  function reset() {
    const cleared: FilterState = { status: "All", sortBy: "Days Remaining ↑" }
    setLocal(cleared)
    onApply(cleared)
    onClose()
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Filter & Sort</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-5 px-4 pb-8">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setLocal((p) => ({ ...p, status: s }))}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    local.status === s
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sort By</p>
            <div className="flex flex-col gap-2">
              {sortOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => setLocal((p) => ({ ...p, sortBy: s }))}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-left transition-colors",
                    local.sortBy === s ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-full border",
                      local.sortBy === s ? "border-primary bg-primary" : "border-border",
                    )}
                  >
                    {local.sortBy === s && <span className="size-1.5 rounded-full bg-white" />}
                  </span>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={reset}>
              Reset
            </Button>
            <Button className="flex-1" onClick={apply}>
              Apply
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function applySort(items: InventoryItem[], sortBy: string) {
  const sorted = [...items]
  switch (sortBy) {
    case "Name A–Z":
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case "Days Remaining ↑":
      return sorted.sort((a, b) => a.daysRemaining - b.daysRemaining)
    case "Days Remaining ↓":
      return sorted.sort((a, b) => b.daysRemaining - a.daysRemaining)
    case "Quantity ↑":
      return sorted.sort((a, b) => a.quantity - b.quantity)
    case "Quantity ↓":
      return sorted.sort((a, b) => b.quantity - a.quantity)
    default:
      return sorted
  }
}

function SearchBar({
  value,
  onChange,
  onFilterClick,
  activeFilters,
}: {
  value: string
  onChange: (v: string) => void
  onFilterClick: () => void
  activeFilters: number
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-1 items-center gap-2 rounded-lg border border-input bg-card px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search items"
          className="border-0 px-0 shadow-none focus-visible:ring-0"
        />
        {value && (
          <button onClick={() => onChange("")} className="shrink-0 text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        )}
      </div>
      <Button
        variant="outline"
        size="icon"
        className={cn(
          "relative size-9 shrink-0 rounded-lg",
          activeFilters > 0 && "border-primary bg-primary/5 text-primary",
        )}
        aria-label="Filter"
        onClick={onFilterClick}
      >
        <SlidersHorizontal />
        {activeFilters > 0 && (
          <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {activeFilters}
          </span>
        )}
      </Button>
    </div>
  )
}

function Pills({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
            value === o
              ? "bg-primary text-primary-foreground"
              : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground",
          )}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function ItemCard({ item, borderClass }: { item: InventoryItem; borderClass: string }) {
  const { navigate } = useKosh()
  return (
    <Card
      className={cn(
        "cursor-pointer rounded-xl border-l-4 py-3 shadow-sm transition-colors hover:bg-muted/40",
        borderClass,
      )}
      onClick={() => navigate("item-detail", { id: item.id })}
    >
      <div className="flex items-center gap-3 px-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            {item.quantity} {item.unit} left
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <DaysRemaining days={item.daysRemaining} status={item.status} />
          <span className="text-xs text-muted-foreground">remaining</span>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>
    </Card>
  )
}

// ─── Owner Inventory ────────────────────────────────────────────────────────

export function OwnerInventory() {
  const { navigate } = useKosh()
  const [query, setQuery] = React.useState("")
  const [cat, setCat] = React.useState("All")
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [filter, setFilter] = React.useState<FilterState>({ status: "All", sortBy: "Days Remaining ↑" })

  const cats = ["All", "Veg", "Non-Veg", "Dairy", "Oil"]

  const activeFilters = (filter.status !== "All" ? 1 : 0) + (filter.sortBy !== "Days Remaining ↑" ? 1 : 0)

  const filtered = inventory.filter((i) => {
    const matchesQuery = i.name.toLowerCase().includes(query.toLowerCase())
    const matchesCat = cat === "All" || i.category === cat
    const matchesStatus =
      filter.status === "All" ||
      (filter.status === "Critical" && i.status === "critical") ||
      (filter.status === "Low Stock" && i.status === "low") ||
      (filter.status === "Healthy" && i.status === "healthy")
    return matchesQuery && matchesCat && matchesStatus
  })

  const sorted = applySort(filtered, filter.sortBy)
  const critical = sorted.filter((i) => i.status !== "healthy")
  const healthy = sorted.filter((i) => i.status === "healthy")

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Inventory</h1>
        <Button size="sm" onClick={() => navigate("create-po")}>
          <Plus className="size-4" />
          Add Item
        </Button>
      </div>

      <SearchBar value={query} onChange={setQuery} onFilterClick={() => setFilterOpen(true)} activeFilters={activeFilters} />
      <Pills options={cats} value={cat} onChange={setCat} />

      {activeFilters > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filters active:</span>
          {filter.status !== "All" && (
            <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary text-xs">
              {filter.status}
              <button onClick={() => setFilter((f) => ({ ...f, status: "All" }))} aria-label="Clear status filter">
                <X className="size-3" />
              </button>
            </Badge>
          )}
          {filter.sortBy !== "Days Remaining ↑" && (
            <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary text-xs">
              {filter.sortBy}
              <button
                onClick={() => setFilter((f) => ({ ...f, sortBy: "Days Remaining ↑" }))}
                aria-label="Clear sort"
              >
                <X className="size-3" />
              </button>
            </Badge>
          )}
        </div>
      )}

      {critical.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-destructive">
            Critical ({critical.length} items)
          </p>
          <div className="flex flex-col gap-3">
            {critical.map((i) => (
              <ItemCard key={i.id} item={i} borderClass={statusBorder(i.status)} />
            ))}
          </div>
        </section>
      )}

      {healthy.length > 0 && (
        <section className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Healthy ({healthy.length} items)
          </p>
          <div className="flex flex-col gap-3">
            {healthy.map((i) => (
              <ItemCard key={i.id} item={i} borderClass={statusBorder(i.status)} />
            ))}
          </div>
        </section>
      )}

      {sorted.length === 0 && (
        <Card className="rounded-xl shadow-sm">
          <div className="py-12 text-center text-sm text-muted-foreground">
            No items match your filters
          </div>
        </Card>
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filter={filter}
        onApply={setFilter}
      />
    </div>
  )
}

// ─── Manager Inventory ─────────────────────────────────────────────────────

export function ManagerInventory() {
  const { navigate } = useKosh()
  const [query, setQuery] = React.useState("")
  const [filterPill, setFilterPill] = React.useState("All")
  const [filterOpen, setFilterOpen] = React.useState(false)
  const [filter, setFilter] = React.useState<FilterState>({ status: "All", sortBy: "Days Remaining ↑" })

  const pills = ["All", "Low Stock", "All Items"]

  const filtered = inventory.filter((i) => {
    const matchesQuery = i.name.toLowerCase().includes(query.toLowerCase())
    const matchesPill = filterPill === "Low Stock" ? i.status !== "healthy" : true
    return matchesQuery && matchesPill
  })

  const sorted = applySort(filtered, filter.sortBy)
  const activeFilters = filter.sortBy !== "Days Remaining ↑" ? 1 : 0

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight">Inventory</h1>
      <SearchBar
        value={query}
        onChange={setQuery}
        onFilterClick={() => setFilterOpen(true)}
        activeFilters={activeFilters}
      />
      <Pills options={pills} value={filterPill} onChange={setFilterPill} />
      <div className="flex flex-col gap-3">
        {sorted.map((i) => (
          <ItemCard
            key={i.id}
            item={i}
            borderClass={i.status !== "healthy" ? "border-l-accent" : "border-l-transparent"}
          />
        ))}
        {sorted.length === 0 && (
          <Card className="rounded-xl shadow-sm">
            <div className="py-12 text-center text-sm text-muted-foreground">
              No items found
            </div>
          </Card>
        )}
      </div>
      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filter={filter}
        onApply={setFilter}
      />
    </div>
  )
}
