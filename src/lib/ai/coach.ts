import type { CoachDraftMeal, CoachResponse } from "./schemas";

const nutritionRedirect =
  "I'm here to help with your food, nutrition, and progress tracking. Tell me what you ate or what you're aiming for today.";

export function sanitizeCoachText(text: string) {
  return text
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    .replace(/`+/g, "")
    .replace(/^[#>\-*\s]+/gm, "")
    .replace(/\s*[\u2013\u2014]\s*/g, ", ")
    .replace(/\s+\S+-[.!?]?$/g, ".")
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function sanitizeCoachResponse(coach: CoachResponse): CoachResponse {
  return {
    ...coach,
    reply: sanitizeCoachText(coach.reply),
    suggestedActions: coach.suggestedActions.map(sanitizeCoachText).filter(Boolean),
    checkInQuestion: sanitizeCoachText(coach.checkInQuestion),
  };
}

export function guardrailCoachResponse(message: string): CoachResponse | null {
  const lower = message.toLowerCase();
  const asksAboutProvider =
    /\b(chatgpt|openai|gpt|language model|llm|model provider|ai model)\b/.test(lower);
  const asksForCoding =
    /\b(python|javascript|typescript|script|code|function|regex|sql|leetcode|program)\b/.test(lower) &&
    !/\b(calorie|food|meal|protein|carb|fat|nutrition|weight|log|recipe)\b/.test(lower);

  if (!asksAboutProvider && !asksForCoding) return null;

  return {
    reply: asksAboutProvider
      ? "I'm Pace's nutrition coach. I can help with food logging, targets, habits, and progress."
      : nutritionRedirect,
    tone: "gentle_supportive",
    suggestedActions: ["Log a meal", "Review today's target"],
    checkInQuestion: "What did you eat or what are you aiming for today?",
    riskFlag: "none",
  };
}

export function inferDraftMealFromMessage(message: string): CoachDraftMeal | null {
  const lower = message.toLowerCase();
  const mentionsAte =
    /\b(i had|i ate|i drank|just had|just ate|add|log|logged)\b/.test(lower);
  const foodish =
    /\b(pizza|costco|coffee|latte|coke|cola|drink|beer|wine|banana|oats|rice|chicken|sandwich|burger|sweet|chocolate|yogurt|crisps|chips)\b/.test(lower);

  if (!mentionsAte || !foodish) return null;

  if (lower.includes("costco") && lower.includes("pizza")) {
    return {
      name: "Costco pizza slice",
      portion: "1 slice",
      calories: 710,
      proteinG: 34,
      carbsG: 78,
      fatG: 28,
      fiberG: 4,
      confidence: 0.65,
    };
  }

  if (lower.includes("pizza")) {
    return {
      name: "Pizza slice",
      portion: "1 slice",
      calories: 320,
      proteinG: 14,
      carbsG: 36,
      fatG: 13,
      fiberG: 2,
      confidence: 0.55,
    };
  }

  if (/\b(coffee|latte)\b/.test(lower)) {
    return {
      name: lower.includes("latte") ? "Latte" : "Coffee",
      portion: "1 drink",
      calories: lower.includes("latte") ? 140 : 5,
      proteinG: lower.includes("latte") ? 8 : 0,
      carbsG: lower.includes("latte") ? 12 : 0,
      fatG: lower.includes("latte") ? 5 : 0,
      fiberG: 0,
      confidence: 0.5,
    };
  }

  if (/\b(coke|cola|drink)\b/.test(lower)) {
    return {
      name: "Drink",
      portion: "1 serving",
      calories: 140,
      proteinG: 0,
      carbsG: 35,
      fatG: 0,
      fiberG: 0,
      confidence: 0.45,
    };
  }

  return {
    name: "Logged food",
    portion: "1 serving",
    calories: 250,
    proteinG: 10,
    carbsG: 25,
    fatG: 10,
    fiberG: 2,
    confidence: 0.35,
  };
}
