import { supabase } from "@/integrations/supabase/client";

/**
 * Save a record to the trash table before deleting it.
 * Call this BEFORE the actual delete operation.
 */
export const moveToTrash = async (
  tableName: string,
  recordId: string,
  recordData: Record<string, any>
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    await supabase.from("trash" as any).insert({
      table_name: tableName,
      record_id: recordId,
      record_data: recordData,
      deleted_by: session.user.id,
    } as any);
  } catch (e) {
    console.error("moveToTrash error:", e);
  }
};

/**
 * Restore a record from trash (admin only). Calls edge function.
 */
export const restoreFromTrash = async (trashId: string) => {
  const { data, error } = await supabase.functions.invoke("restore-from-trash", {
    body: { trash_id: trashId },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};
