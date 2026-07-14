"use client"

import * as React from "react"
import {
  Camera,
  ImageIcon,
  MessageCircle,
  ArrowRight,
  Pencil,
  ChevronRight,
  Check,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { inventory, supplierNames, wastageReasons, issueDestinations, formatCurrency } from "@/lib/kosh-data"
import { useKosh } from "../store"
import { ScreenHeader } from "../parts"

function ActionShell({
  title,
  children,
  submitLabel,
  onSubmit,
}: {
  title: string
  children: React.ReactNode
  submitLabel: string
  onSubmit: () => void
}) {
  return (
    <div className="flex min-h-full flex-col gap-5">
      <ScreenHeader title={title} />
      <div className="flex-1">{children}</div>
      <Button size="lg" className="h-12 w-full rounded-lg text-base" onClick={onSubmit}>
        {submitLabel}
      </Button>
    </div>
  )
}

function ItemSelect({
  value,
  onValueChange,
  placeholder = "Select item",
}: {
  value: string
  onValueChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <Select value={value} onValueChange={(v) => onValueChange(v as string)}>
      <SelectTrigger className="h-10 w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {inventory.map((i) => (
            <SelectItem key={i.id} value={i.name}>
              {i.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function QtyInput({
  value,
  onChange,
  unit,
}: {
  value: string
  onChange: (v: string) => void
  unit: string
}) {
  return (
    <InputGroup className="h-10">
      <InputGroupInput inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{unit}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}

export function CreatePO({ params }: { params?: Record<string, unknown> }) {
  const { goBack } = useKosh()
  const [supplier, setSupplier] = React.useState((params?.supplier as string) ?? "Supplier A")
  const [item, setItem] = React.useState((params?.item as string) ?? "Chicken")
  const [qty, setQty] = React.useState(String(params?.quantity ?? 20))
  const [date, setDate] = React.useState("2024-05-08")
  const [notes, setNotes] = React.useState("")
  const unit = inventory.find((i) => i.name === item)?.unit ?? "kg"

  return (
    <ActionShell
      title="Create PO"
      submitLabel="Create Purchase"
      onSubmit={() => {
        toast.success(`Purchase order created for ${qty} ${unit} ${item}`)
        goBack()
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>Supplier</FieldLabel>
          <Select value={supplier} onValueChange={(v) => setSupplier(v as string)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Select supplier" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {supplierNames.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Item</FieldLabel>
          <ItemSelect value={item} onValueChange={setItem} />
        </Field>
        <Field>
          <FieldLabel>Quantity</FieldLabel>
          <QtyInput value={qty} onChange={setQty} unit={unit} />
        </Field>
        <Field>
          <FieldLabel>Expected Date</FieldLabel>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10" />
        </Field>
        <Field>
          <FieldLabel>Notes (optional)</FieldLabel>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note for the supplier" />
        </Field>
      </FieldGroup>
    </ActionShell>
  )
}

export function ReceiveDelivery({ params }: { params?: Record<string, unknown> }) {
  const { goBack } = useKosh()
  const [received, setReceived] = React.useState("20")
  const [hasPhoto, setHasPhoto] = React.useState(false)

  return (
    <ActionShell
      title="Receive Delivery"
      submitLabel="Confirm Receive"
      onSubmit={() => {
        toast.success(`Received ${received} kg — stock updated`)
        goBack()
      }}
    >
      <div className="flex flex-col gap-5">
        <Card className="rounded-xl shadow-sm">
          <CardContent className="flex flex-col gap-2 py-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">PO #{(params?.po as string) ?? "1234"}</span>
              <span className="text-sm text-muted-foreground">Supplier A</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ordered</span>
              <span className="font-medium">Chicken — 20 kg</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Expected</span>
              <span className="font-medium">08 May 2024</span>
            </div>
          </CardContent>
        </Card>

        <FieldGroup>
          <Field>
            <FieldLabel>Received Quantity</FieldLabel>
            <QtyInput value={received} onChange={setReceived} unit="kg" />
          </Field>
          <Field>
            <FieldLabel>Invoice Photo</FieldLabel>
            <button
              onClick={() => {
                setHasPhoto(true)
                toast("Invoice photo attached")
              }}
              className={cn(
                "flex h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-sm transition-colors",
                hasPhoto ? "border-primary bg-primary/5 text-primary" : "border-input text-muted-foreground hover:bg-muted/50",
              )}
            >
              {hasPhoto ? <Check className="size-6" /> : <Camera className="size-6" />}
              {hasPhoto ? "Invoice attached" : "Tap to capture invoice"}
            </button>
          </Field>
        </FieldGroup>
      </div>
    </ActionShell>
  )
}

export function RecordWastage({ params }: { params?: Record<string, unknown> }) {
  const { goBack } = useKosh()
  const [item, setItem] = React.useState((params?.item as string) ?? "Butter")
  const [qty, setQty] = React.useState("0.5")
  const [reason, setReason] = React.useState("Spoiled")
  const [notes, setNotes] = React.useState("")
  const unit = inventory.find((i) => i.name === item)?.unit ?? "kg"

  return (
    <ActionShell
      title="Record Wastage"
      submitLabel="Save"
      onSubmit={() => {
        toast.success(`Recorded ${qty} ${unit} ${item} wastage`)
        goBack()
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>Item</FieldLabel>
          <ItemSelect value={item} onValueChange={setItem} />
        </Field>
        <Field>
          <FieldLabel>Quantity</FieldLabel>
          <QtyInput value={qty} onChange={setQty} unit={unit} />
        </Field>
        <Field>
          <FieldLabel>Reason</FieldLabel>
          <Select value={reason} onValueChange={(v) => setReason(v as string)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Select reason" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {wastageReasons.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel>Notes (optional)</FieldLabel>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add details" />
        </Field>
      </FieldGroup>
    </ActionShell>
  )
}

export function IssueStock({ params }: { params?: Record<string, unknown> }) {
  const { goBack } = useKosh()
  const [item, setItem] = React.useState((params?.item as string) ?? "Chicken")
  const [qty, setQty] = React.useState("2")
  const [dest, setDest] = React.useState("Kitchen")
  const unit = inventory.find((i) => i.name === item)?.unit ?? "kg"

  return (
    <ActionShell
      title="Issue Stock"
      submitLabel="Save Issue"
      onSubmit={() => {
        toast.success(`Issued ${qty} ${unit} ${item} to ${dest}`)
        goBack()
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>Item</FieldLabel>
          <ItemSelect value={item} onValueChange={setItem} />
        </Field>
        <Field>
          <FieldLabel>Quantity</FieldLabel>
          <QtyInput value={qty} onChange={setQty} unit={unit} />
        </Field>
        <Field>
          <FieldLabel>To</FieldLabel>
          <Select value={dest} onValueChange={(v) => setDest(v as string)}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue placeholder="Select destination" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {issueDestinations.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>
    </ActionShell>
  )
}

export function AdjustStock({ params }: { params?: Record<string, unknown> }) {
  const { goBack } = useKosh()
  const [item, setItem] = React.useState((params?.item as string) ?? "Chicken")
  const [qty, setQty] = React.useState("18")
  const [reason, setReason] = React.useState("Stock count correction")
  const unit = inventory.find((i) => i.name === item)?.unit ?? "kg"

  return (
    <ActionShell
      title="Adjust Stock"
      submitLabel="Save Adjustment"
      onSubmit={() => {
        toast.success(`${item} stock adjusted to ${qty} ${unit}`)
        goBack()
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel>Item</FieldLabel>
          <ItemSelect value={item} onValueChange={setItem} />
        </Field>
        <Field>
          <FieldLabel>New Counted Quantity</FieldLabel>
          <QtyInput value={qty} onChange={setQty} unit={unit} />
        </Field>
        <Field>
          <FieldLabel>Reason</FieldLabel>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} className="h-10" />
        </Field>
      </FieldGroup>
    </ActionShell>
  )
}

export function UploadInvoice() {
  const { navigate } = useKosh()
  const steps = ["Send", "Review", "Confirm"]
  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader title="Upload Invoice" />

      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs font-semibold",
                  i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <span className={cn("text-sm", i === 0 ? "font-medium" : "text-muted-foreground")}>{s}</span>
            </div>
            {i < steps.length - 1 && <div className="h-px flex-1 bg-border" />}
          </React.Fragment>
        ))}
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageCircle className="size-6" />
          </span>
          <p className="font-medium">Send invoice photo on WhatsApp</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>WhatsApp</span>
            <ArrowRight className="size-4" />
            <span>OCR + Review</span>
            <ArrowRight className="size-4" />
            <span>Confirm</span>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground">
            <span className="size-2 animate-pulse rounded-full bg-accent" />
            Waiting for WhatsApp image...
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" size="lg" className="h-12 w-full rounded-lg" onClick={() => navigate("review-ocr")}>
        <ImageIcon data-icon="inline-start" />
        Upload from Gallery
      </Button>
    </div>
  )
}

const ocrItems = [
  { name: "Chicken", qty: 20, unit: "kg" },
  { name: "Paneer", qty: 10, unit: "kg" },
  { name: "Tomato", qty: 5, unit: "kg" },
  { name: "Onion", qty: 8, unit: "kg" },
]

export function ReviewOCR() {
  const { goBack } = useKosh()
  return (
    <ActionShell
      title="Review Items"
      submitLabel="Confirm & Save"
      onSubmit={() => {
        toast.success("Invoice items saved to inventory")
        goBack()
      }}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2">
          <span className="text-sm text-muted-foreground">Invoice</span>
          <span className="font-medium">#INV-1245</span>
        </div>
        <Card className="rounded-xl shadow-sm">
          <CardContent className="flex flex-col py-1">
            {ocrItems.map((it, i) => (
              <React.Fragment key={it.name}>
                {i > 0 && <Separator />}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{it.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {it.qty} {it.unit}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${it.name}`}
                    onClick={() => toast(`Edit ${it.name}`)}
                  >
                    <Pencil />
                  </Button>
                </div>
              </React.Fragment>
            ))}
            <Separator />
            <button className="flex items-center gap-2 py-3 text-sm text-muted-foreground" onClick={() => toast("Showing all items")}>
              <ChevronRight className="size-4" />
              View more items
            </button>
          </CardContent>
        </Card>
      </div>
    </ActionShell>
  )
}

const deliveries = [
  { po: "1234", supplier: "Supplier A", item: "Chicken — 20 kg", eta: "Expected today" },
  { po: "1229", supplier: "Supplier C", item: "Oil — 15 L", eta: "Expected today" },
]

export function ReceiveList() {
  const { navigate } = useKosh()
  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="Receive Deliveries" subtitle="2 deliveries pending" />
      {deliveries.map((d) => (
        <Card
          key={d.po}
          className="cursor-pointer rounded-xl shadow-sm transition-colors hover:bg-muted/40"
          onClick={() => navigate("receive-delivery", { po: d.po })}
        >
          <CardContent className="flex items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">PO #{d.po} · {d.supplier}</p>
              <p className="text-sm text-muted-foreground">{d.item}</p>
            </div>
            <span className="text-xs text-accent">{d.eta}</span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function Corrections() {
  const { navigate } = useKosh()
  const rows = [
    { item: "Paneer", note: "Count mismatch: -1.5 kg" },
    { item: "Rice", note: "Recount requested" },
  ]
  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="Pending Corrections" subtitle="2 corrections to review" />
      {rows.map((r) => (
        <Card
          key={r.item}
          className="cursor-pointer rounded-xl border-l-4 border-l-accent shadow-sm transition-colors hover:bg-muted/40"
          onClick={() => navigate("adjust-stock", { item: r.item })}
        >
          <CardContent className="flex items-center gap-3 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{r.item}</p>
              <p className="text-sm text-muted-foreground">{r.note}</p>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export function History({ params }: { params?: Record<string, unknown> }) {
  const name = (params?.item as string) ?? "Chicken"
  const rows = [
    { label: "Issued to Kitchen", qty: "-9 kg", date: "Today, 2:15 PM", tone: "text-destructive" },
    { label: "Received from Supplier A", qty: "+20 kg", date: "Today, 9:00 AM", tone: "text-primary" },
    { label: "Wastage — Spoiled", qty: "-0.5 kg", date: "Yesterday", tone: "text-destructive" },
    { label: "Issued to Kitchen", qty: "-8 kg", date: "Yesterday", tone: "text-destructive" },
  ]
  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title={`${name} History`} />
      <Card className="rounded-xl shadow-sm">
        <CardContent className="flex flex-col py-1">
          {rows.map((r, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Separator />}
              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="text-xs text-muted-foreground">{r.date}</p>
                </div>
                <span className={cn("text-sm font-semibold tabular-nums", r.tone)}>{r.qty}</span>
              </div>
            </React.Fragment>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
