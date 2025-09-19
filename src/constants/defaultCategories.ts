// src/constants/defaultCategories.ts
// Default categories for expenses, used if the user has no custom categories.

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  subcategories?: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
  }>;
};

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "food",
    name: "Food & Dining",
    icon: "🍔",
    color: "#FF7043",
    subcategories: [
      { id: "groceries", name: "Groceries", icon: "🛒", color: "#FFB300" },
      { id: "restaurants", name: "Restaurants", icon: "🍽️", color: "#FF7043" },
      { id: "coffee", name: "Coffee", icon: "☕", color: "#8D6E63" },
    ],
  },
  {
    id: "transport",
    name: "Transport",
    icon: "🚗",
    color: "#29B6F6",
    subcategories: [
      { id: "fuel", name: "Fuel", icon: "⛽", color: "#FFA726" },
      { id: "taxi", name: "Taxi", icon: "🚕", color: "#FFD600" },
      { id: "public", name: "Public Transit", icon: "🚌", color: "#66BB6A" },
    ],
  },
  {
    id: "shopping",
    name: "Shopping",
    icon: "🛍️",
    color: "#AB47BC",
    subcategories: [
      { id: "clothes", name: "Clothes", icon: "👗", color: "#EC407A" },
      { id: "electronics", name: "Electronics", icon: "💻", color: "#42A5F5" },
      { id: "other", name: "Other", icon: "🛒", color: "#BDBDBD" },
    ],
  },
  {
    id: "bills",
    name: "Bills & Utilities",
    icon: "💡",
    color: "#FFA726",
    subcategories: [
      { id: "electricity", name: "Electricity", icon: "🔌", color: "#FFD600" },
      { id: "water", name: "Water", icon: "💧", color: "#29B6F6" },
      { id: "internet", name: "Internet", icon: "🌐", color: "#66BB6A" },
    ],
  },
  {
    id: "health",
    name: "Health",
    icon: "🏥",
    color: "#66BB6A",
    subcategories: [
      { id: "pharmacy", name: "Pharmacy", icon: "💊", color: "#AB47BC" },
      { id: "doctor", name: "Doctor", icon: "🩺", color: "#29B6F6" },
      { id: "fitness", name: "Fitness", icon: "🏋️", color: "#FFA726" },
    ],
  },
  {
    id: "entertainment",
    name: "Entertainment",
    icon: "🎬",
    color: "#EC407A",
    subcategories: [
      { id: "movies", name: "Movies", icon: "🎥", color: "#AB47BC" },
      { id: "games", name: "Games", icon: "🎮", color: "#42A5F5" },
      { id: "music", name: "Music", icon: "🎵", color: "#66BB6A" },
    ],
  },
  {
    id: "travel",
    name: "Travel",
    icon: "✈️",
    color: "#42A5F5",
    subcategories: [
      { id: "flights", name: "Flights", icon: "🛫", color: "#29B6F6" },
      { id: "hotels", name: "Hotels", icon: "🏨", color: "#AB47BC" },
      { id: "other", name: "Other", icon: "🧳", color: "#FFA726" },
    ],
  },
  {
    id: "other",
    name: "Other",
    icon: "🔖",
    color: "#BDBDBD",
    subcategories: [
      { id: "other", name: "Other", icon: "🔖", color: "#BDBDBD" },
    ],
  },
];
