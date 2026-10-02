import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BackButton from "@/components/BackButton";

const StaticPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading } = useQuery({
    queryKey: ["static-page", slug],
    queryFn: async () => {
      const { data, error } = await (supabase.from("static_pages" as any) as any)
        .select("*")
        .eq("slug", slug)
        .eq("is_active", true)
        .single();
      if (error) throw error;
      return data as { id: string; slug: string; title: string; content: string };
    },
    enabled: !!slug,
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <div className="mb-4"><BackButton /></div>
        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Loading...</div>
        ) : page ? (
          <article className="prose prose-sm sm:prose max-w-none" dangerouslySetInnerHTML={{ __html: page.content }} />
        ) : (
          <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Page not found</div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default StaticPage;
