export type Category = "Veg" | "Non-Veg" | "Dairy" | "Oil" | "Grains"
export type ItemStatus = "critical" | "low" | "healthy"

export type Supplier = {
  name: string
  price: number
  best?: boolean
}

export type InventoryItem = {
  id: string
  name: string
  category: Category
  quantity: number
  unit: string
  daysRemaining: number
  status: ItemStatus
  avgDaily: number
  weekUsage: number
  suggestedPurchase: number
  suppliers: Supplier[]
  priceHistory: { day: string; price: number }[]
}

export type PurchaseOrder = {
  id: string
  supplier: string
  item: string
  quantity: number
  unit: string
  amount: number
  date: string
  status: "pending" | "approved" | "rejected" | "delivered"
}

export const restaurants = [
  { id: "r1", name: "The Good Bowl", area: "Koramangala", city: "Bengaluru" },
  { id: "r2", name: "The Good Bowl", area: "HSR Layout", city: "Bengaluru" },
  { id: "r3", name: "The Good Bowl", area: "Indiranagar", city: "Bengaluru" },
]

export const inventory: InventoryItem[] = [
  {
    id: "paneer",
    name: "Paneer",
    category: "Dairy",
    quantity: 12,
    unit: "kg",
    daysRemaining: 1,
    status: "critical",
    avgDaily: 10,
    weekUsage: 70,
    suggestedPurchase: 20,
    suppliers: [
      { name: "Supplier A", price: 230, best: true },
      { name: "Supplier B", price: 245 },
      { name: "Supplier C", price: 255 },
    ],
    priceHistory: [
      { day: "Mon", price: 220 },
      { day: "Tue", price: 224 },
      { day: "Wed", price: 226 },
      { day: "Thu", price: 228 },
      { day: "Fri", price: 230 },
      { day: "Sat", price: 232 },
      { day: "Sun", price: 230 },
    ],
  },
  {
    id: "chicken",
    name: "Chicken",
    category: "Non-Veg",
    quantity: 18,
    unit: "kg",
    daysRemaining: 2,
    status: "critical",
    avgDaily: 9,
    weekUsage: 63,
    suggestedPurchase: 20,
    suppliers: [
      { name: "Supplier A", price: 195, best: true },
      { name: "Supplier B", price: 205 },
      { name: "Supplier C", price: 215 },
    ],
    priceHistory: [
      { day: "Mon", price: 178 },
      { day: "Tue", price: 182 },
      { day: "Wed", price: 188 },
      { day: "Thu", price: 190 },
      { day: "Fri", price: 194 },
      { day: "Sat", price: 196 },
      { day: "Sun", price: 195 },
    ],
  },
  {
    id: "butter",
    name: "Butter",
    category: "Dairy",
    quantity: 3,
    unit: "kg",
    daysRemaining: 1,
    status: "critical",
    avgDaily: 2.5,
    weekUsage: 17,
    suggestedPurchase: 10,
    suppliers: [
      { name: "Supplier B", price: 480, best: true },
      { name: "Supplier A", price: 495 },
      { name: "Supplier C", price: 510 },
    ],
    priceHistory: [
      { day: "Mon", price: 460 },
      { day: "Tue", price: 465 },
      { day: "Wed", price: 470 },
      { day: "Thu", price: 472 },
      { day: "Fri", price: 476 },
      { day: "Sat", price: 480 },
      { day: "Sun", price: 480 },
    ],
  },
  {
    id: "tomato",
    name: "Tomato",
    category: "Veg",
    quantity: 8,
    unit: "kg",
    daysRemaining: 2,
    status: "low",
    avgDaily: 4,
    weekUsage: 28,
    suggestedPurchase: 15,
    suppliers: [
      { name: "Supplier C", price: 40, best: true },
      { name: "Supplier A", price: 44 },
      { name: "Supplier B", price: 48 },
    ],
    priceHistory: [
      { day: "Mon", price: 34 },
      { day: "Tue", price: 36 },
      { day: "Wed", price: 38 },
      { day: "Thu", price: 39 },
      { day: "Fri", price: 40 },
      { day: "Sat", price: 42 },
      { day: "Sun", price: 40 },
    ],
  },
  {
    id: "rice",
    name: "Rice",
    category: "Grains",
    quantity: 120,
    unit: "kg",
    daysRemaining: 12,
    status: "healthy",
    avgDaily: 10,
    weekUsage: 70,
    suggestedPurchase: 0,
    suppliers: [
      { name: "Supplier A", price: 62, best: true },
      { name: "Supplier B", price: 66 },
      { name: "Supplier C", price: 70 },
    ],
    priceHistory: [
      { day: "Mon", price: 60 },
      { day: "Tue", price: 60 },
      { day: "Wed", price: 61 },
      { day: "Thu", price: 61 },
      { day: "Fri", price: 62 },
      { day: "Sat", price: 62 },
      { day: "Sun", price: 62 },
    ],
  },
  {
    id: "oil",
    name: "Oil",
    category: "Oil",
    quantity: 25,
    unit: "L",
    daysRemaining: 15,
    status: "healthy",
    avgDaily: 1.6,
    weekUsage: 11,
    suggestedPurchase: 0,
    suppliers: [
      { name: "Supplier B", price: 145, best: true },
      { name: "Supplier A", price: 150 },
      { name: "Supplier C", price: 158 },
    ],
    priceHistory: [
      { day: "Mon", price: 140 },
      { day: "Tue", price: 142 },
      { day: "Wed", price: 143 },
      { day: "Thu", price: 144 },
      { day: "Fri", price: 145 },
      { day: "Sat", price: 146 },
      { day: "Sun", price: 145 },
    ],
  },
  {
    id: "onion",
    name: "Onion",
    category: "Veg",
    quantity: 60,
    unit: "kg",
    daysRemaining: 10,
    status: "healthy",
    avgDaily: 6,
    weekUsage: 42,
    suggestedPurchase: 0,
    suppliers: [
      { name: "Supplier A", price: 32, best: true },
      { name: "Supplier C", price: 35 },
      { name: "Supplier B", price: 38 },
    ],
    priceHistory: [
      { day: "Mon", price: 30 },
      { day: "Tue", price: 30 },
      { day: "Wed", price: 31 },
      { day: "Thu", price: 32 },
      { day: "Fri", price: 32 },
      { day: "Sat", price: 33 },
      { day: "Sun", price: 32 },
    ],
  },
  {
    id: "potato",
    name: "Potato",
    category: "Veg",
    quantity: 80,
    unit: "kg",
    daysRemaining: 14,
    status: "healthy",
    avgDaily: 5.5,
    weekUsage: 38,
    suggestedPurchase: 0,
    suppliers: [
      { name: "Supplier B", price: 28, best: true },
      { name: "Supplier A", price: 30 },
      { name: "Supplier C", price: 33 },
    ],
    priceHistory: [
      { day: "Mon", price: 26 },
      { day: "Tue", price: 26 },
      { day: "Wed", price: 27 },
      { day: "Thu", price: 27 },
      { day: "Fri", price: 28 },
      { day: "Sat", price: 28 },
      { day: "Sun", price: 28 },
    ],
  },
  {
    id: "milk",
    name: "Milk",
    category: "Dairy",
    quantity: 40,
    unit: "L",
    daysRemaining: 6,
    status: "healthy",
    avgDaily: 6,
    weekUsage: 42,
    suggestedPurchase: 0,
    suppliers: [
      { name: "Supplier A", price: 54, best: true },
      { name: "Supplier B", price: 56 },
      { name: "Supplier C", price: 60 },
    ],
    priceHistory: [
      { day: "Mon", price: 52 },
      { day: "Tue", price: 52 },
      { day: "Wed", price: 53 },
      { day: "Thu", price: 53 },
      { day: "Fri", price: 54 },
      { day: "Sat", price: 54 },
      { day: "Sun", price: 54 },
    ],
  },
]

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: "1234",
    supplier: "Supplier A",
    item: "Chicken",
    quantity: 20,
    unit: "kg",
    amount: 3900,
    date: "Today",
    status: "pending",
  },
  {
    id: "1233",
    supplier: "Supplier B",
    item: "Paneer",
    quantity: 10,
    unit: "kg",
    amount: 2600,
    date: "Yesterday",
    status: "pending",
  },
  {
    id: "1232",
    supplier: "Supplier C",
    item: "Oil",
    quantity: 15,
    unit: "L",
    amount: 2250,
    date: "2 May 2024",
    status: "pending",
  },
  {
    id: "1231",
    supplier: "Supplier A",
    item: "Rice",
    quantity: 50,
    unit: "kg",
    amount: 3100,
    date: "1 May 2024",
    status: "approved",
  },
  {
    id: "1230",
    supplier: "Supplier B",
    item: "Tomato",
    quantity: 25,
    unit: "kg",
    amount: 1000,
    date: "30 Apr 2024",
    status: "delivered",
  },
]

export const foodCostTrend = [
  { day: "Mon", cost: 28400 },
  { day: "Tue", cost: 31200 },
  { day: "Wed", cost: 29800 },
  { day: "Thu", cost: 33100 },
  { day: "Fri", cost: 35600 },
  { day: "Sat", cost: 39200 },
  { day: "Sun", cost: 31400 },
]

export const topItemsByUsage = [
  { item: "Rice", usage: 70 },
  { item: "Chicken", usage: 63 },
  { item: "Onion", usage: 42 },
  { item: "Potato", usage: 38 },
  { item: "Tomato", usage: 28 },
]

export const aiRecommendations = [
  {
    id: "rec-paneer",
    title: "Order 20kg paneer today",
    reason: "Only 1.2 days remaining. Based on usage trend.",
    item: "Paneer",
    supplier: "Supplier A",
    pricePerUnit: 230,
    quantity: 20,
    unit: "kg",
  },
  {
    id: "rec-chicken",
    title: "Switch chicken supplier",
    reason: "Supplier A is 5% cheaper than your current supplier this week.",
    item: "Chicken",
    supplier: "Supplier A",
    pricePerUnit: 195,
    quantity: 20,
    unit: "kg",
  },
  {
    id: "rec-butter",
    title: "Butter usage 18% above normal",
    reason: "Consumption is trending higher than the 4-week average.",
    item: "Butter",
    supplier: "Supplier B",
    pricePerUnit: 480,
    quantity: 10,
    unit: "kg",
  },
]

export const attentionItems = [
  { id: "a1", label: "Paneer", note: "1 day remaining", level: "warning" as const },
  { id: "a2", label: "Chicken", note: "prices up 12%", level: "warning" as const },
  { id: "a3", label: "Oil", note: "consumption high", level: "danger" as const },
]

export const suggestedChips = [
  "What should I order tomorrow?",
  "Why did food cost increase?",
  "Which supplier is cheapest for chicken?",
  "Show unusual inventory movements",
]

export const wastageReasons = ["Spoiled", "Expired", "Overcooked", "Damaged", "Spillage", "Other"]
export const issueDestinations = ["Kitchen", "Bar", "Prep Station", "Catering"]
export const supplierNames = ["Supplier A", "Supplier B", "Supplier C"]

export function formatCurrency(value: number) {
  return "\u20B9" + value.toLocaleString("en-IN")
}
