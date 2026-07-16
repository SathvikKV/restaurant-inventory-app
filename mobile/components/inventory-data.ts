export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  buffer: number;
  img: string;
  cost: number;
  supplier?: string;
  sku?: string;
};

export const INVENTORY: InventoryItem[] = [
  { id: "paneer", name: "Paneer", category: "Dairy", unit: "kg", quantity: 18, buffer: 12, img: "🧀", cost: 420, supplier: "Fresh Dairy", sku: "PNR-001" },
  { id: "chk-brst", name: "Chicken Breast", category: "Meat", unit: "kg", quantity: 4, buffer: 15, img: "🍗", cost: 280, supplier: "United Meats", sku: "CHK-002" },
  { id: "basmati", name: "Basmati Rice", category: "Dry Goods", unit: "kg", quantity: 42, buffer: 20, img: "🍚", cost: 90, supplier: "APMC Traders", sku: "RIC-003" },
  { id: "sun-oil", name: "Sunflower Oil", category: "Dry Goods", unit: "L", quantity: 12, buffer: 10, img: "🫙", cost: 140, supplier: "APMC Traders", sku: "OIL-004" },
  { id: "tomato", name: "Tomatoes", category: "Produce", unit: "kg", quantity: 3, buffer: 10, img: "🍅", cost: 50, supplier: "Local Market", sku: "TOM-005" },
  { id: "onion", name: "Onions", category: "Produce", unit: "kg", quantity: 22, buffer: 15, img: "🧅", cost: 40, supplier: "Local Market", sku: "ONI-006" },
  { id: "garlic", name: "Garlic", category: "Produce", unit: "kg", quantity: 2.5, buffer: 3, img: "🧄", cost: 120, supplier: "Local Market", sku: "GAR-007" },
  { id: "milk", name: "Full Cream Milk", category: "Dairy", unit: "L", quantity: 10, buffer: 8, img: "🥛", cost: 65, supplier: "Fresh Dairy", sku: "MLK-008" },
  { id: "cream", name: "Heavy Cream", category: "Dairy", unit: "L", quantity: 2, buffer: 5, img: "🍶", cost: 220, supplier: "Fresh Dairy", sku: "CRM-009" },
  { id: "butter", name: "Butter", category: "Dairy", unit: "kg", quantity: 5.5, buffer: 4, img: "🧈", cost: 550, supplier: "Fresh Dairy", sku: "BTR-010" },
  { id: "salt", name: "Salt", category: "Spices", unit: "kg", quantity: 12, buffer: 5, img: "🧂", cost: 25, supplier: "APMC Traders", sku: "SLT-011" },
  { id: "chilli", name: "Red Chilli Powder", category: "Spices", unit: "kg", quantity: 1.5, buffer: 2, img: "🌶️", cost: 350, supplier: "APMC Traders", sku: "CHL-012" },
  { id: "turmeric", name: "Turmeric Powder", category: "Spices", unit: "kg", quantity: 1.2, buffer: 2, img: "🌿", cost: 280, supplier: "APMC Traders", sku: "TRM-013" },
  { id: "coriander", name: "Coriander Leaves", category: "Produce", unit: "kg", quantity: 0.2, buffer: 1, img: "🌱", cost: 80, supplier: "Local Market", sku: "CRD-014" },
  { id: "lemon", name: "Lemons", category: "Produce", unit: "pcs", quantity: 15, buffer: 50, img: "🍋", cost: 5, supplier: "Local Market", sku: "LMN-015" },
  { id: "coke", name: "Coca-Cola 330ml", category: "Beverages", unit: "pcs", quantity: 12, buffer: 48, img: "🥤", cost: 35, supplier: "Beverage Dist", sku: "COK-016" },
  { id: "water", name: "Mineral Water 1L", category: "Beverages", unit: "pcs", quantity: 24, buffer: 24, img: "💧", cost: 20, supplier: "Beverage Dist", sku: "H2O-017" },
  { id: "mutton", name: "Mutton (Curry Cut)", category: "Meat", unit: "kg", quantity: 0, buffer: 5, img: "🫕", cost: 850, supplier: "United Meats", sku: "MTN-018" },
  { id: "cashew", name: "Cashews", category: "Dry Goods", unit: "kg", quantity: 5, buffer: 4, img: "🥜", cost: 800, supplier: "APMC Traders", sku: "CSH-019" },
  { id: "sugar", name: "White Sugar", category: "Dry Goods", unit: "kg", quantity: 20, buffer: 10, img: "🍬", cost: 45, supplier: "APMC Traders", sku: "SGR-020" },
];

export function getStatus(item: InventoryItem): "Out of Stock" | "Critical" | "Low" | "Healthy" {
  if (item.quantity === 0) return "Out of Stock";
  if (item.quantity <= item.buffer * 0.3) return "Critical";
  if (item.quantity <= item.buffer * 0.6) return "Low";
  return "Healthy";
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "Out of Stock": return "#EF4444";
    case "Critical": return "#F97316";
    case "Low": return "#EAB308";
    default: return "#22C55E";
  }
}

export const CATEGORIES = ["All", "Produce", "Meat", "Dairy", "Dry Goods", "Spices", "Beverages"];
