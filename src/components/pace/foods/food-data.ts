/**
 * Full TransformHub 6-Week Challenge food list, tagged for diet filtering.
 * Tags: "meat" | "fish" | "dairy" | "egg" | "plant"
 */
type FoodTag = "meat" | "fish" | "dairy" | "egg" | "plant";

export type FoodDietPref = "omnivore" | "pescatarian" | "vegetarian" | "vegan";

type FoodCatKey = "proteins" | "fats" | "carbs" | "fruit" | "veg";

export interface FoodItem {
  e: string;
  n: string;
  t?: FoodTag[];
}

export interface FoodCategory {
  cat: FoodCatKey;
  emoji: string;
  name: string;
  sub: string;
  items: FoodItem[];
}

export const foodGroups: FoodCategory[] = [
  {
    cat: "proteins",
    emoji: "🥩",
    name: "Proteins",
    sub: "Palm-sized · 1 per meal",
    items: [
      { e: "🥩", n: "Lean beef mince", t: ["meat"] },
      { e: "🦃", n: "Turkey breast", t: ["meat"] },
      { e: "🦃", n: "Turkey mince", t: ["meat"] },
      { e: "🥓", n: "Turkey rashers", t: ["meat"] },
      { e: "🍗", n: "Chicken breast", t: ["meat"] },
      { e: "🍗", n: "Chicken mince", t: ["meat"] },
      { e: "🌭", n: "Chicken sausages", t: ["meat"] },
      { e: "🥩", n: "Lean steak", t: ["meat"] },
      { e: "🍔", n: "Hamburger 80%", t: ["meat"] },
      { e: "🌭", n: "Reduced-fat sausages", t: ["meat"] },
      { e: "🍖", n: "Lamb shank", t: ["meat"] },
      { e: "🍖", n: "Lamb chops", t: ["meat"] },
      { e: "🍖", n: "Lamb shoulder", t: ["meat"] },
      { e: "🥓", n: "Pork loin", t: ["meat"] },
      { e: "🥩", n: "Pork steak", t: ["meat"] },
      { e: "🥩", n: "Pork chops", t: ["meat"] },
      { e: "🦆", n: "Duck breast", t: ["meat"] },
      { e: "🦆", n: "Duck leg", t: ["meat"] },
      { e: "🦌", n: "Venison", t: ["meat"] },
      { e: "🐟", n: "Tuna", t: ["fish"] },
      { e: "🐟", n: "Salmon fillet", t: ["fish"] },
      { e: "🐟", n: "Smoked salmon", t: ["fish"] },
      { e: "🐟", n: "Trout", t: ["fish"] },
      { e: "🐟", n: "Halibut", t: ["fish"] },
      { e: "🐟", n: "Haddock", t: ["fish"] },
      { e: "🐟", n: "Cod", t: ["fish"] },
      { e: "🐟", n: "Pollock", t: ["fish"] },
      { e: "🐟", n: "Tilapia", t: ["fish"] },
      { e: "🐟", n: "Seabass", t: ["fish"] },
      { e: "🐟", n: "Snapper", t: ["fish"] },
      { e: "🦪", n: "Scallops", t: ["fish"] },
      { e: "🐟", n: "Mackerel", t: ["fish"] },
      { e: "🐟", n: "Sardines", t: ["fish"] },
      { e: "🐟", n: "Anchovies", t: ["fish"] },
      { e: "🐟", n: "Basa", t: ["fish"] },
      { e: "🐟", n: "Monkfish", t: ["fish"] },
      { e: "🐟", n: "Eel", t: ["fish"] },
      { e: "🐟", n: "Sole", t: ["fish"] },
      { e: "🐟", n: "Skate", t: ["fish"] },
      { e: "🐟", n: "Swordfish", t: ["fish"] },
      { e: "🐙", n: "Octopus", t: ["fish"] },
      { e: "🍤", n: "Shrimp", t: ["fish"] },
      { e: "🍤", n: "Prawns", t: ["fish"] },
      { e: "🦪", n: "Oysters", t: ["fish"] },
      { e: "🦞", n: "Lobster", t: ["fish"] },
      { e: "🦀", n: "Crab", t: ["fish"] },
      { e: "🦪", n: "Mussels", t: ["fish"] },
      { e: "🦪", n: "Clams", t: ["fish"] },
      { e: "🧀", n: "Cottage cheese", t: ["dairy"] },
      { e: "🥛", n: "Whey protein", t: ["dairy"] },
      { e: "🧀", n: "Fat-free cream cheese", t: ["dairy"] },
      { e: "🥛", n: "0% Greek yogurt", t: ["dairy"] },
      { e: "🥛", n: "Quark", t: ["dairy"] },
      { e: "🥚", n: "Eggs", t: ["egg"] },
      { e: "🧈", n: "Tofu", t: ["plant"] },
      { e: "🧈", n: "Tempeh", t: ["plant"] },
      { e: "🍖", n: "Quorn", t: ["egg"] },
    ],
  },
  {
    cat: "fats",
    emoji: "🫒",
    name: "Fats",
    sub: "Thumb-tip portion · 1.5 per meal",
    items: [
      { e: "🧈", n: "Butter", t: ["dairy"] },
      { e: "🧀", n: "Cheddar", t: ["dairy"] },
      { e: "🧀", n: "Blue cheese", t: ["dairy"] },
      { e: "🧀", n: "Mozzarella", t: ["dairy"] },
      { e: "🧀", n: "Parmesan", t: ["dairy"] },
      { e: "🧀", n: "Feta", t: ["dairy"] },
      { e: "🧀", n: "Halloumi", t: ["dairy"] },
      { e: "🧀", n: "Goat cheese", t: ["dairy"] },
      { e: "🧈", n: "Ghee", t: ["dairy"] },
      { e: "🥥", n: "Coconut oil", t: ["plant"] },
      { e: "🥥", n: "Coconut milk (cooking)", t: ["plant"] },
      { e: "🥛", n: "Cream", t: ["dairy"] },
      { e: "🥚", n: "Mayonnaise", t: ["egg"] },
      { e: "🥛", n: "Crème fraîche", t: ["dairy"] },
      { e: "🥛", n: "Sour cream", t: ["dairy"] },
      { e: "🥑", n: "Avocado", t: ["plant"] },
      { e: "🥛", n: "Full-fat yogurt", t: ["dairy"] },
      { e: "🧀", n: "Vegan cheese", t: ["plant"] },
      { e: "🥜", n: "Nut butter", t: ["plant"] },
      { e: "🌰", n: "Almonds", t: ["plant"] },
      { e: "🥜", n: "Peanuts", t: ["plant"] },
      { e: "🌰", n: "Pecans", t: ["plant"] },
      { e: "🌰", n: "Walnuts", t: ["plant"] },
      { e: "🌰", n: "Brazil nuts", t: ["plant"] },
      { e: "🌰", n: "Pine nuts", t: ["plant"] },
      { e: "🎃", n: "Pumpkin seeds", t: ["plant"] },
      { e: "🌱", n: "Chia seeds", t: ["plant"] },
      { e: "🌻", n: "Sunflower seeds", t: ["plant"] },
      { e: "🌱", n: "Flax seeds", t: ["plant"] },
      { e: "🫒", n: "Olive oil", t: ["plant"] },
      { e: "🫒", n: "Olives", t: ["plant"] },
    ],
  },
  {
    cat: "carbs",
    emoji: "🌾",
    name: "Carbs",
    sub: "Cupped hand · 1.5 breakfast/lunch · 0 dinner",
    items: [
      { e: "🍚", n: "Rice" },
      { e: "🌾", n: "Bulgar wheat" },
      { e: "🍞", n: "Rye bread" },
      { e: "🍞", n: "Sourdough (1 slice)" },
      { e: "🍠", n: "Sweet potato" },
      { e: "🥔", n: "Potato" },
      { e: "🎃", n: "Butternut squash" },
      { e: "🫘", n: "Chickpeas" },
      { e: "🌾", n: "Cous cous" },
      { e: "🥕", n: "Cooked carrots" },
      { e: "🌾", n: "Quinoa" },
      { e: "🟣", n: "Beetroot" },
      { e: "🥕", n: "Raw carrot" },
      { e: "🌽", n: "Sweetcorn" },
      { e: "🟢", n: "Peas" },
      { e: "🍈", n: "Jackfruit" },
      { e: "🍆", n: "Aubergine" },
      { e: "🥕", n: "Parsnip" },
      { e: "🥣", n: "Oats" },
      { e: "🌾", n: "Buckwheat" },
      { e: "🫘", n: "Lentils" },
      { e: "🟢", n: "Split peas" },
      { e: "🫘", n: "Adzuki beans" },
      { e: "🫘", n: "Cannellini beans" },
      { e: "🫘", n: "Kidney beans" },
      { e: "🫘", n: "Black beans" },
      { e: "🫘", n: "Soy beans" },
      { e: "🫘", n: "Mung beans" },
      { e: "🫛", n: "Edamame" },
    ],
  },
  {
    cat: "fruit",
    emoji: "🍎",
    name: "Fruit",
    sub: "Cupped hand · class as your carb portion",
    items: [
      { e: "🍌", n: "Banana" },
      { e: "🍓", n: "Strawberries" },
      { e: "🍒", n: "Cherries" },
      { e: "🫐", n: "Blueberries" },
      { e: "🫐", n: "Blackberries" },
      { e: "🫐", n: "Raspberries" },
      { e: "🥭", n: "Mango" },
      { e: "🥝", n: "Kiwi" },
      { e: "🍑", n: "Apricot" },
      { e: "🍑", n: "Plum" },
      { e: "🍊", n: "Grapefruit" },
      { e: "🍉", n: "Watermelon" },
      { e: "🍈", n: "Melon" },
      { e: "🍍", n: "Pineapple" },
      { e: "🍎", n: "Apple" },
      { e: "🍊", n: "Orange" },
      { e: "🍈", n: "Papaya" },
      { e: "🍑", n: "Peach" },
      { e: "🍑", n: "Nectarine" },
      { e: "🍐", n: "Pear" },
    ],
  },
  {
    cat: "veg",
    emoji: "🥬",
    name: "Green & leafy veg",
    sub: "Fist-sized · as much as you want",
    items: [
      { e: "🍅", n: "Tomato" },
      { e: "🧅", n: "Onion" },
      { e: "🧅", n: "Spring onion" },
      { e: "🌶️", n: "Radish" },
      { e: "🫑", n: "Red pepper" },
      { e: "🫑", n: "Yellow pepper" },
      { e: "🫑", n: "Green pepper" },
      { e: "🥗", n: "Salad leaves" },
      { e: "🥬", n: "Rocket" },
      { e: "🥬", n: "Iceberg lettuce" },
      { e: "🥦", n: "Broccoli" },
      { e: "🥦", n: "Cauliflower" },
      { e: "🥬", n: "Kale" },
      { e: "🥬", n: "Cabbage" },
      { e: "🥬", n: "Red cabbage" },
      { e: "🌱", n: "Celeriac" },
      { e: "🥬", n: "Pak choi" },
      { e: "🥒", n: "Courgette" },
      { e: "🥬", n: "Spinach" },
      { e: "🌱", n: "Mangetout" },
      { e: "🌱", n: "Green beans" },
      { e: "🥬", n: "Brussels sprouts" },
      { e: "🥒", n: "Cucumber" },
      { e: "🌱", n: "Alfalfa sprouts" },
      { e: "🎋", n: "Bamboo shoots" },
      { e: "🌱", n: "Artichoke hearts" },
      { e: "🌱", n: "Fennel" },
      { e: "🌱", n: "Asparagus" },
      { e: "🌱", n: "Celery" },
      { e: "🍄", n: "Mushrooms" },
      { e: "🌱", n: "Beansprouts" },
      { e: "🌶️", n: "Okra" },
      { e: "🌱", n: "Rhubarb" },
      { e: "🌶️", n: "Chilli" },
      { e: "🥬", n: "Chicory" },
      { e: "🥬", n: "Leeks" },
      { e: "🧅", n: "Shallots" },
    ],
  },
];

export function isFoodAllowed(item: FoodItem, diet: FoodDietPref): boolean {
  const tags = item.t ?? ["plant"];
  if (diet === "omnivore") return true;
  if (diet === "pescatarian") return !tags.includes("meat");
  if (diet === "vegetarian")
    return !tags.includes("meat") && !tags.includes("fish");
  if (diet === "vegan")
    return !tags.some((t) => (["meat", "fish", "dairy", "egg"] as FoodTag[]).includes(t));
  return true;
}

/** Recipe library for the week view. */
export interface Recipe {
  kcal: number;
  p: number;
  c: number;
  f: number;
  time: string;
  ingredients: { e: string; n: string; q: string }[];
  steps: string[];
}

export const recipes: Record<string, Recipe> = {
  "Yogurt + oats + berries": {
    kcal: 555, p: 42, c: 54, f: 20, time: "5 min",
    ingredients: [
      { e: "🥛", n: "Greek yogurt (0%)", q: "200g" },
      { e: "🥣", n: "Rolled oats", q: "60g" },
      { e: "🫐", n: "Mixed berries", q: "100g" },
      { e: "🥜", n: "Almond butter", q: "1 tbsp" },
      { e: "🍯", n: "Honey (optional)", q: "1 tsp" },
    ],
    steps: [
      "Tip oats into a bowl.",
      "Spoon yogurt over the oats and stir.",
      "Top with berries and a drizzle of almond butter.",
      "Add a teaspoon of honey if you want it sweeter.",
    ],
  },
  "Eggs on toast": {
    kcal: 540, p: 32, c: 48, f: 22, time: "10 min",
    ingredients: [
      { e: "🥚", n: "Eggs", q: "3" },
      { e: "🍞", n: "Wholegrain bread", q: "2 slices" },
      { e: "🥑", n: "Avocado", q: "½" },
      { e: "🥬", n: "Spinach", q: "1 handful" },
      { e: "🫒", n: "Olive oil", q: "1 tsp" },
    ],
    steps: [
      "Toast the bread.",
      "Heat oil in a non-stick pan, fry the eggs how you like them.",
      "Mash the avocado on the toast, scatter spinach on top.",
      "Slide the eggs onto the toast and season.",
    ],
  },
  "Chicken & rice bowl": {
    kcal: 650, p: 49, c: 63, f: 22, time: "25 min",
    ingredients: [
      { e: "🍗", n: "Chicken breast", q: "150g" },
      { e: "🍚", n: "Brown rice (cooked)", q: "200g" },
      { e: "🥦", n: "Broccoli", q: "1 fist" },
      { e: "🫒", n: "Olive oil", q: "1 tbsp" },
      { e: "🧂", n: "Salt, pepper, paprika", q: "to taste" },
    ],
    steps: [
      "Cook the rice (or microwave a pouch).",
      "Steam the broccoli for 4 min, set aside.",
      "Slice chicken thin, season, sear in oil for 3 min each side.",
      "Build the bowl: rice → broccoli → chicken → drizzle pan juices.",
    ],
  },
  "Salmon & sweet potato": {
    kcal: 660, p: 45, c: 58, f: 25, time: "30 min",
    ingredients: [
      { e: "🐟", n: "Salmon fillet", q: "130g" },
      { e: "🍠", n: "Sweet potato", q: "250g" },
      { e: "🥬", n: "Spinach", q: "2 fists" },
      { e: "🫒", n: "Olive oil", q: "1 tbsp" },
      { e: "🍋", n: "Lemon", q: "½" },
    ],
    steps: [
      "Heat oven to 200°C. Cube the sweet potato, toss in oil, roast 25 min.",
      "Pat salmon dry, season, add to the tray for the last 12 min.",
      "Wilt spinach in a pan with a splash of water.",
      "Plate everything, squeeze lemon over the salmon.",
    ],
  },
  "Tofu stir-fry + rice": {
    kcal: 620, p: 35, c: 70, f: 20, time: "20 min",
    ingredients: [
      { e: "🧈", n: "Firm tofu", q: "200g" },
      { e: "🍚", n: "Brown rice", q: "200g" },
      { e: "🥦", n: "Mixed veg (broccoli, peppers)", q: "2 fists" },
      { e: "🫒", n: "Olive oil", q: "1 tbsp" },
      { e: "🥢", n: "Soy sauce + garlic", q: "to taste" },
    ],
    steps: [
      "Press tofu, cube it, toss in cornflour for crispness.",
      "Heat oil hot, fry tofu until golden — about 6 min.",
      "Add the veg and stir-fry 4 min, then garlic + soy.",
      "Serve over rice.",
    ],
  },
  "Tuna jacket potato": {
    kcal: 580, p: 40, c: 70, f: 14, time: "8 min",
    ingredients: [
      { e: "🥔", n: "Large potato", q: "350g" },
      { e: "🥫", n: "Tinned tuna (in water)", q: "1 tin" },
      { e: "🥬", n: "Side salad", q: "2 handfuls" },
      { e: "🥑", n: "Avocado or yogurt", q: "2 tbsp" },
      { e: "🌽", n: "Sweetcorn (optional)", q: "2 tbsp" },
    ],
    steps: [
      "Pierce the potato, microwave 8 min on high (or oven 1 hr).",
      "Drain the tuna, mix with avocado/yogurt and corn.",
      "Split the potato, fluff the inside, pile tuna on top.",
      "Serve with the salad on the side.",
    ],
  },
  "Chicken wrap + greens": {
    kcal: 600, p: 45, c: 55, f: 20, time: "15 min",
    ingredients: [
      { e: "🍗", n: "Chicken breast", q: "150g" },
      { e: "🌯", n: "Wholegrain wrap", q: "1" },
      { e: "🥬", n: "Spinach + rocket", q: "2 handfuls" },
      { e: "🍅", n: "Cherry tomatoes", q: "1 fist" },
      { e: "🥑", n: "Avocado", q: "¼" },
    ],
    steps: [
      "Slice chicken, season, pan-fry 3 min each side.",
      "Warm the wrap for 20 sec.",
      "Layer greens, tomatoes, avocado, then chicken.",
      "Roll tight, slice in half.",
    ],
  },
};

export const recipeKeys = Object.keys(recipes);

export function mealIcoFor(key: string): string {
  const k = key.toLowerCase();
  if (k.includes("yogurt")) return "🥣";
  if (k.includes("egg")) return "🍳";
  if (k.includes("tofu")) return "🥦";
  if (k.includes("salmon")) return "🐟";
  if (k.includes("tuna")) return "🥪";
  if (k.includes("wrap")) return "🌯";
  return "🍗";
}

/** All known food names — used to seed "all liked" defaults. */
export const allFoodNames: string[] = foodGroups.flatMap((g) =>
  g.items.map((it) => it.n),
);
