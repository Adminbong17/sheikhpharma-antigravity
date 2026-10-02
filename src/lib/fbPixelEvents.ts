/**
 * Facebook Pixel event helpers.
 * All events are safe to call even if fbq is not loaded.
 */

const fbq = (...args: any[]) => {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq(...args);
  }
};

export const trackViewContent = (params: {
  content_name: string;
  content_ids: string[];
  value: number;
  currency: string;
}) => {
  fbq("track", "ViewContent", {
    content_name: params.content_name,
    content_ids: params.content_ids,
    content_type: "product",
    value: params.value,
    currency: params.currency,
  });
};

export const trackAddToCart = (params: {
  content_name: string;
  content_ids: string[];
  value: number;
  currency: string;
}) => {
  fbq("track", "AddToCart", {
    content_name: params.content_name,
    content_ids: params.content_ids,
    content_type: "product",
    value: params.value,
    currency: params.currency,
  });
};

export const trackInitiateCheckout = (params: {
  value: number;
  currency: string;
}) => {
  fbq("track", "InitiateCheckout", {
    value: params.value,
    currency: params.currency,
  });
};

export const trackPurchase = (params: {
  order_id: string;
  value: number;
  currency: string;
}) => {
  fbq("track", "Purchase", {
    value: params.value,
    currency: params.currency,
    content_type: "product",
    order_id: params.order_id,
  });
};
