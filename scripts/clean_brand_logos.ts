async function cleanBrandLogos() {
  const SUPABASE_URL = "https://vkfloynvxqkxbqpdlzbd.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmxveW52eHFreGJxcGRsemJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzQ0NzMyNSwiZXhwIjoyMDg5MDIzMzI1fQ.KGfBZMEqiEykX6emQp-pOqZTaZfnjQXBzfsrEUTsQK4";

  const res = await fetch(`${SUPABASE_URL}/rest/v1/brands?select=id,name,logo_url`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  const brands: any[] = await res.json();
  let cleaned = 0;

  for (const b of brands) {
    if (b.logo_url && b.logo_url.startsWith('{')) {
      try {
        const parsed = JSON.parse(b.logo_url);
        const realUrl = parsed.url || parsed.publicUrl || b.logo_url;
        await fetch(`${SUPABASE_URL}/rest/v1/brands?id=eq.${b.id}`, {
          method: 'PATCH',
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ logo_url: realUrl }),
        });
        cleaned++;
      } catch (e) {}
    }
  }
  console.log(`Cleaned ${cleaned} brand logos to plain URLs.`);
}

cleanBrandLogos();
