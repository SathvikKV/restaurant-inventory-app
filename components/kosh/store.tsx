"use client"

import * as React from "react"

export type Role = "owner" | "manager"
export type Stage = "landing" | "auth" | "app"
export type AuthStep = "mobile" | "otp" | "restaurant"
export type Tab = "home" | "inventory" | "purchases" | "ai" | "more"

export type View = { screen: string; params?: Record<string, unknown> }

type KoshState = {
  stage: Stage
  authStep: AuthStep
  role: Role
  restaurantId: string
  tab: Tab
  stack: View[]
  quickActionsOpen: boolean
}

type KoshContextValue = KoshState & {
  setStage: (stage: Stage) => void
  setAuthStep: (step: AuthStep) => void
  setRole: (role: Role) => void
  setRestaurantId: (id: string) => void
  setTab: (tab: Tab) => void
  navigate: (screen: string, params?: Record<string, unknown>) => void
  goBack: () => void
  resetStack: () => void
  setQuickActionsOpen: (open: boolean) => void
  login: () => void
  logout: () => void
}

const KoshContext = React.createContext<KoshContextValue | null>(null)

export function KoshProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = React.useState<Stage>("landing")
  const [authStep, setAuthStep] = React.useState<AuthStep>("mobile")
  const [role, setRole] = React.useState<Role>("owner")
  const [restaurantId, setRestaurantId] = React.useState("r1")
  const [tab, setTabState] = React.useState<Tab>("home")
  const [stack, setStack] = React.useState<View[]>([])
  const [quickActionsOpen, setQuickActionsOpen] = React.useState(false)

  const setTab = React.useCallback((next: Tab) => {
    setStack([])
    setTabState(next)
  }, [])

  const navigate = React.useCallback((screen: string, params?: Record<string, unknown>) => {
    setStack((prev) => [...prev, { screen, params }])
  }, [])

  const goBack = React.useCallback(() => {
    setStack((prev) => prev.slice(0, -1))
  }, [])

  const resetStack = React.useCallback(() => setStack([]), [])

  const login = React.useCallback(() => {
    setStage("app")
    setTabState("home")
    setStack([])
  }, [])

  const logout = React.useCallback(() => {
    setStage("landing")
    setAuthStep("mobile")
    setTabState("home")
    setStack([])
  }, [])

  const value: KoshContextValue = {
    stage,
    authStep,
    role,
    restaurantId,
    tab,
    stack,
    quickActionsOpen,
    setStage,
    setAuthStep,
    setRole,
    setRestaurantId,
    setTab,
    navigate,
    goBack,
    resetStack,
    setQuickActionsOpen,
    login,
    logout,
  }

  return <KoshContext.Provider value={value}>{children}</KoshContext.Provider>
}

export function useKosh() {
  const ctx = React.useContext(KoshContext)
  if (!ctx) throw new Error("useKosh must be used within KoshProvider")
  return ctx
}
