export const normalizeBdPhone = (input: string) => {
  let clean = (input || "").replace(/[^0-9]/g, "");
  if (!clean) return "";

  // Convert 8801XXXXXXXXX -> 01XXXXXXXXX
  if (clean.startsWith("880")) clean = "0" + clean.slice(3);

  // Ensure starts with 0
  if (!clean.startsWith("0")) clean = "0" + clean;

  return clean;
};

export const phoneToVirtualEmail = (input: string) => {
  const phone = normalizeBdPhone(input);
  return phone ? `${phone}@phone.local` : "";
};
