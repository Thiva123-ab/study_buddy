import type { SupabaseClient } from "@supabase/supabase-js";

export const CREDIT_COSTS: Record<string, number> = {
  generate_summary: 2,
  generate_flashcards: 2,
  generate_quiz: 2,
  generate_paper: 3,
  generate_multi_paper: 4,
  translate: 3,
  chat: 1,
  image_extract: 1,
};

export async function getUserCredits(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return {
      creditsRemaining: 20,
      creditsTotal: 20,
      plan: "free",
      resetsAt: getNextResetDate().toISOString(),
    };
  }

  return {
    creditsRemaining: data.credits_remaining,
    creditsTotal: data.credits_total,
    plan: data.plan,
    resetsAt: getNextResetDate().toISOString(),
  };
}

export async function checkAndDeductCredits(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  documentId?: string
): Promise<{ creditsRemaining: number; creditsUsed: number }> {
  const cost = CREDIT_COSTS[action] ?? 1;

  // 1. Get current credits
  let { data: credits, error } = await supabase
    .from("user_credits")
    .select("*")
    .eq("user_id", userId)
    .single();

  // If missing, auto-create a fallback row (trigger should handle this, but for safety)
  if (error || !credits) {
    const { data: newRow, error: insertErr } = await supabase
      .from("user_credits")
      .insert({ user_id: userId, credits_remaining: 20, credits_total: 20 })
      .select("*")
      .single();
    if (insertErr) throw new Error("Failed to initialize user credits");
    credits = newRow;
  }

  let remaining = credits.credits_remaining;
  const total = credits.credits_total;
  const lastReset = new Date(credits.last_reset_at);
  const now = new Date();

  // 2. Auto-reset daily at midnight UTC
  if (isBeforeTodayUTC(lastReset, now)) {
    remaining = total;
    await supabase
      .from("user_credits")
      .update({
        credits_remaining: remaining,
        last_reset_at: now.toISOString(),
      })
      .eq("user_id", userId);
  }

  // 3. Check sufficient balance
  if (remaining < cost) {
    throw new Error(
      `Insufficient credits. You have ${remaining} remaining, but this action requires ${cost}. Your daily credits reset at midnight UTC.`
    );
  }

  // 4. Deduct and update
  remaining -= cost;
  const { error: updateErr } = await supabase
    .from("user_credits")
    .update({ credits_remaining: remaining })
    .eq("user_id", userId);

  if (updateErr) throw new Error("Failed to update credit balance");

  // 5. Log usage
  await supabase.from("credit_usage_log").insert({
    user_id: userId,
    action,
    credits_used: cost,
    document_id: documentId || null,
  });

  return { creditsRemaining: remaining, creditsUsed: cost };
}

function getNextResetDate() {
  const now = new Date();
  const reset = new Date(now);
  reset.setUTCHours(24, 0, 0, 0); // Next midnight UTC
  return reset;
}

function isBeforeTodayUTC(date: Date, now: Date) {
  // Returns true if 'date' is on a previous UTC day than 'now'
  const dateStr = date.toISOString().slice(0, 10);
  const nowStr = now.toISOString().slice(0, 10);
  return dateStr < nowStr;
}
