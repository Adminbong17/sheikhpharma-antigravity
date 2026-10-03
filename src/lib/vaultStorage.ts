/**
 * FileVault Storage Client
 * Integrates image & media uploads with vault.bongbangla.top
 * Keeps Supabase Database & Storage completely lean (0 MB media used on Supabase).
 */

const VAULT_API_URL = import.meta.env.VITE_VAULT_API_URL || "https://api.bongbangla.top/vault-api";
const VAULT_EMAIL = import.meta.env.VITE_VAULT_EMAIL || "shop@sheikhpharma.shop";
const VAULT_PASSWORD = import.meta.env.VITE_VAULT_PASSWORD || "Aktmtbar@1";

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Authenticates with the FileVault API and returns a valid Bearer token.
 */
export async function getVaultToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  try {
    const res = await fetch(`${VAULT_API_URL}/login.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: VAULT_EMAIL,
        password: VAULT_PASSWORD,
      }),
    });

    if (!res.ok) {
      throw new Error(`Vault authentication failed: ${res.statusText}`);
    }

    const data = await res.json();
    if (!data.token) {
      throw new Error(data.error || "Failed to retrieve Vault access token");
    }

    cachedToken = data.token;
    // Cache token for 23 hours
    tokenExpiresAt = now + 23 * 60 * 60 * 1000;
    return cachedToken;
  } catch (error) {
    console.error("Vault Login Error:", error);
    throw error;
  }
}

/**
 * Uploads a file (image, document, asset) to vault.bongbangla.top.
 * Returns the permanent public share URL as a string.
 */
export async function uploadToVault(
  file: File | Blob,
  fileName?: string
): Promise<string> {
  const meta = await uploadToVaultWithMeta(file, fileName);
  return meta.url;
}

/**
 * Uploads a file and returns full metadata (url, shareToken, fileId).
 */
export async function uploadToVaultWithMeta(
  file: File | Blob,
  fileName?: string
): Promise<{ url: string; shareToken: string; fileId: number }> {
  const token = await getVaultToken();
  const actualFileName = fileName || (file instanceof File ? file.name : `file-${Date.now()}.png`);
  const mime = file.type || "application/octet-stream";
  const fileSize = file.size;

  const uploadId = typeof crypto !== "undefined" && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const formData = new FormData();
  formData.append("upload_id", uploadId);
  formData.append("chunk_index", "0");
  formData.append("total_chunks", "1");
  formData.append("file_name", actualFileName);
  formData.append("file_size", String(fileSize));
  formData.append("mime", mime);
  formData.append("chunk", file, actualFileName);

  const res = await fetch(`${VAULT_API_URL}/upload-chunk.php`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Vault upload failed: ${errText || res.statusText}`);
  }

  const json = await res.json();
  const fileData = json?.file;
  if (!fileData?.share_token) {
    throw new Error(`Invalid response from Vault: ${JSON.stringify(json)}`);
  }

  const publicUrl = `${VAULT_API_URL}/share.php?t=${fileData.share_token}`;

  return {
    url: publicUrl,
    shareToken: fileData.share_token,
    fileId: fileData.id,
  };
}
