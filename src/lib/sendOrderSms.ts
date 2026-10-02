import { supabase } from "@/integrations/supabase/client";

/**
 * Call this whenever an order status changes to trigger SMS notifications.
 * It calls the order-sms-notify edge function which handles all SMS logic.
 */
export const sendOrderSmsNotify = async (orderId: string, status: string) => {
  try {
    const { error } = await supabase.functions.invoke("order-sms-notify", {
      body: { order_id: orderId, status },
    });
    if (error) console.error("SMS notify error:", error);
  } catch (err) {
    console.error("SMS notify exception:", err);
  }
};
