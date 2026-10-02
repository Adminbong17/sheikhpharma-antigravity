import { supabase } from "@/integrations/supabase/client";

export async function sendToCashBook(params: {
  type: "cash_in" | "cash_out";
  amount: number;
  transaction_id: string;
  description: string;
  category: string;
  transaction_date: string;
  created_by?: string | null;
}) {
  // Check if this transaction_id already exists in cash_transactions
  const { data: existing } = await (supabase.from("cash_transactions" as any) as any)
    .select("id")
    .eq("transaction_id", params.transaction_id)
    .limit(1);

  if (existing && existing.length > 0) {
    throw new Error("ইতিমধ্যে Cash Book এ পাঠানো হয়েছে!");
  }

  const { error } = await (supabase.from("cash_transactions" as any) as any).insert({
    type: params.type,
    amount: params.amount,
    transaction_id: params.transaction_id,
    description: params.description,
    category: params.category,
    transaction_date: params.transaction_date,
    created_by: params.created_by || null,
  });
  if (error) throw error;
}
