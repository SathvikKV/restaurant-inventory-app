"use client"

import * as React from "react"
import Image from "next/image"
import { ChevronLeft, Check, Plus, Delete, Sparkles, Package, TrendingDown, ShoppingCart, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { restaurants } from "@/lib/kosh-data"
import { useKosh } from "./store"

const features = [
  {
    icon: Package,
    title: "Real-Time Inventory",
    desc: "Track stock levels across all your locations in one place.",
  },
  {
    icon: ShoppingCart,
    title: "Smart Purchase Orders",
    desc: "Create, approve, and track POs with supplier price comparisons.",
  },
  {
    icon: TrendingDown,
    title: "Wastage Tracking",
    desc: "Log and analyse wastage to cut food cost and boost profitability.",
  },
  {
    icon: Sparkles,
    title: "AI Recommendations",
    desc: "Get smart ordering suggestions based on usage trends and supplier prices.",
  },
]

export function Landing() {
  const { setStage, setAuthStep } = useKosh()
  const [learnOpen, setLearnOpen] = React.useState(false)

  return (
    <>
      <div className="flex min-h-dvh flex-col items-center justify-center bg-card px-6 py-12 text-center">
        <div className="flex w-full max-w-sm flex-col items-center gap-6">
          <div>
            <h1 className="text-5xl font-semibold tracking-tight text-primary">Kosh</h1>
            <p className="mt-2 text-base text-muted-foreground">Smart Inventory for Restaurants</p>
          </div>
          <div className="relative aspect-square w-full max-w-[280px] overflow-hidden rounded-2xl">
            <Image
              src="/kosh-hero.png"
              alt="Illustration of fresh restaurant kitchen ingredients"
              fill
              priority
              className="object-cover"
              sizes="280px"
            />
          </div>
          <div className="flex w-full flex-col gap-3">
            <Button
              size="lg"
              className="h-12 w-full rounded-lg text-base"
              onClick={() => {
                setAuthStep("mobile")
                setStage("auth")
              }}
            >
              Login / Sign Up
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 w-full rounded-lg text-base"
              onClick={() => setLearnOpen(true)}
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={learnOpen} onOpenChange={setLearnOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl max-h-[85dvh] overflow-y-auto">
          <div className="flex items-center justify-between px-4 pt-2 pb-4">
            <div>
              <p className="text-lg font-semibold tracking-tight text-primary">Kosh</p>
              <p className="text-sm text-muted-foreground">Everything you need to manage restaurant inventory</p>
            </div>
            <button
              onClick={() => setLearnOpen(false)}
              className="flex size-8 items-center justify-center rounded-full bg-muted text-muted-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex flex-col gap-3 px-4 pb-8">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4 rounded-xl bg-muted/50 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="size-5" />
                </span>
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
            <Button
              size="lg"
              className="mt-2 h-12 w-full rounded-lg text-base"
              onClick={() => {
                setLearnOpen(false)
                setAuthStep("mobile")
                setStage("auth")
              }}
            >
              Get Started Free
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

function AuthShell({ children, onBack }: { children: React.ReactNode; onBack: () => void }) {
  return (
    <div className="min-h-dvh bg-card px-6 py-8">
      <div className="mx-auto flex w-full max-w-sm flex-col">
        <Button variant="ghost" size="icon-sm" className="-ml-1 mb-6 self-start" onClick={onBack} aria-label="Go back">
          <ChevronLeft />
        </Button>
        {children}
      </div>
    </div>
  )
}

function EnterMobile() {
  const { setStage, setAuthStep } = useKosh()
  const [phone, setPhone] = React.useState("98765 43210")
  return (
    <AuthShell onBack={() => setStage("landing")}>
      <h1 className="text-2xl font-semibold tracking-tight">Enter Mobile Number</h1>
      <p className="mt-1 text-sm text-muted-foreground">We&apos;ll send you an OTP</p>
      <div className="mt-8 flex items-center gap-2 rounded-lg border border-input bg-background px-3">
        <span className="text-sm font-medium text-muted-foreground">+91</span>
        <div className="h-6 w-px bg-border" />
        <Input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="numeric"
          placeholder="Mobile number"
          className="border-0 px-0 shadow-none focus-visible:ring-0"
        />
      </div>
      <Button
        size="lg"
        className="mt-6 h-12 w-full rounded-lg text-base"
        onClick={() => setAuthStep("otp")}
      >
        Send OTP
      </Button>
    </AuthShell>
  )
}

function EnterOtp() {
  const { setAuthStep, login } = useKosh()
  const [digits, setDigits] = React.useState<string[]>(Array(6).fill(""))
  const [seconds, setSeconds] = React.useState(25)

  React.useEffect(() => {
    if (seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  const filled = digits.filter(Boolean).length

  function press(key: string) {
    setDigits((prev) => {
      const next = [...prev]
      if (key === "back") {
        const last = next.map(Boolean).lastIndexOf(true)
        if (last >= 0) next[last] = ""
        return next
      }
      const idx = next.findIndex((d) => d === "")
      if (idx >= 0) next[idx] = key
      return next
    })
  }

  React.useEffect(() => {
    if (filled === 6) {
      const t = setTimeout(() => {
        toast.success("Phone verified")
        setAuthStep("restaurant")
      }, 350)
      return () => clearTimeout(t)
    }
  }, [filled, setAuthStep])

  const pad = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"]

  return (
    <AuthShell onBack={() => setAuthStep("mobile")}>
      <h1 className="text-2xl font-semibold tracking-tight">Enter OTP</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We&apos;ve sent a 6 digit code to +91 98765 43210
      </p>
      <div className="mt-8 flex justify-between gap-2">
        {digits.map((d, i) => (
          <div
            key={i}
            className={cn(
              "flex h-12 w-11 items-center justify-center rounded-lg border bg-background text-lg font-semibold tabular-nums",
              i === filled ? "border-primary ring-3 ring-primary/20" : "border-input",
            )}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="mt-4 text-center text-sm text-muted-foreground">
        {seconds > 0 ? (
          <span>Resend OTP in 0:{seconds.toString().padStart(2, "0")}</span>
        ) : (
          <button className="font-medium text-primary" onClick={() => setSeconds(25)}>
            Resend OTP
          </button>
        )}
      </div>
      <div className="mt-8 grid grid-cols-3 gap-3">
        {pad.map((key, i) =>
          key === "" ? (
            <div key={i} />
          ) : (
            <Button
              key={i}
              variant="ghost"
              className="h-14 rounded-lg bg-muted text-xl font-medium hover:bg-secondary/30"
              onClick={() => press(key)}
              aria-label={key === "back" ? "Backspace" : key}
            >
              {key === "back" ? <Delete className="size-5" /> : key}
            </Button>
          ),
        )}
      </div>
      <Button variant="link" className="mt-4 self-center" onClick={login}>
        Skip for demo
      </Button>
    </AuthShell>
  )
}

function SelectRestaurant() {
  const { setAuthStep, restaurantId, setRestaurantId, login } = useKosh()
  return (
    <AuthShell onBack={() => setAuthStep("otp")}>
      <h1 className="text-2xl font-semibold tracking-tight">Select Restaurant</h1>
      <p className="mt-1 text-sm text-muted-foreground">Choose a restaurant to continue</p>
      <div className="mt-6 flex flex-col gap-3">
        {restaurants.map((r) => {
          const active = r.id === restaurantId
          return (
            <Card
              key={r.id}
              className={cn(
                "flex cursor-pointer flex-row items-center justify-between gap-3 rounded-xl border p-4 shadow-sm transition-colors",
                active ? "border-primary bg-primary/5" : "border-transparent",
              )}
              onClick={() => setRestaurantId(r.id)}
            >
              <div className="min-w-0">
                <p className="font-medium">{r.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {r.area}, {r.city}
                </p>
              </div>
              {active && (
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-4" />
                </span>
              )}
            </Card>
          )
        })}
      </div>
      <Button
        variant="outline"
        size="lg"
        className="mt-4 h-11 w-full rounded-lg"
        onClick={() => toast("Add new restaurant flow coming soon")}
      >
        <Plus data-icon="inline-start" />
        Add New Restaurant
      </Button>
      <Button size="lg" className="mt-6 h-12 w-full rounded-lg text-base" onClick={login}>
        Continue
      </Button>
    </AuthShell>
  )
}

export function AuthFlow() {
  const { authStep } = useKosh()
  if (authStep === "mobile") return <EnterMobile />
  if (authStep === "otp") return <EnterOtp />
  return <SelectRestaurant />
}
