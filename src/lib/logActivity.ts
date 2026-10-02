import { supabase } from "@/integrations/supabase/client";

interface LogParams {
  action: string;
  details?: string;
  entity_type?: string;
  entity_id?: string;
}

const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let device = "Unknown Device";

  if (/Android/i.test(ua)) {
    const match = ua.match(/Android[^;]*;\s*([^)]+)\)/);
    device = match ? `Android - ${match[1].trim()}` : "Android Device";
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const match = ua.match(/(iPhone|iPad|iPod)[^;]*;/);
    device = match ? match[1] : "iOS Device";
  } else if (/Windows/i.test(ua)) {
    device = "Windows PC";
  } else if (/Mac/i.test(ua)) {
    device = "Mac";
  } else if (/Linux/i.test(ua)) {
    device = "Linux PC";
  }

  // Add browser info
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) device += " (Chrome)";
  else if (/Firefox/i.test(ua)) device += " (Firefox)";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) device += " (Safari)";
  else if (/Edg/i.test(ua)) device += " (Edge)";

  return device;
};

export const logActivity = async (params: LogParams) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const device_info = getDeviceInfo();

    await supabase.functions.invoke("log-activity", {
      body: {
        action: params.action,
        details: params.details,
        entity_type: params.entity_type,
        entity_id: params.entity_id,
        device_info,
      },
    });
  } catch (e) {
    console.error("Activity log error:", e);
  }
};
