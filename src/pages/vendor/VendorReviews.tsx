import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useVendor } from "@/contexts/VendorContext";
import { Star, MessageSquare, Store, ChevronDown, ChevronUp, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";

const StarRow = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={`h-3.5 w-3.5 ${s <= rating ? "fill-yellow-400 text-yellow-400" : "fill-muted text-muted-foreground"}`}
      />
    ))}
  </div>
);

const VendorReviews = () => {
  const { vendorId } = useVendor();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyLoading, setReplyLoading] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["vendor-reviews", vendorId],
    queryFn: async () => {
      if (!vendorId) return [];
      // Get all product IDs for this vendor
      const { data: products } = await supabase
        .from("products")
        .select("id, name, image_url")
        .eq("vendor_id", vendorId);

      if (!products || products.length === 0) return [];

      const productIds = products.map((p) => p.id);
      const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

      const { data: reviewsData } = await (supabase as any)
        .from("product_reviews")
        .select("*")
        .in("product_id", productIds)
        .not("order_id", "is", null)
        .order("created_at", { ascending: false });

      return (reviewsData || []).map((r: any) => ({
        ...r,
        product: productMap[r.product_id] || null,
      }));
    },
    enabled: !!vendorId,
  });

  const handleReplySubmit = async (reviewId: string) => {
    const text = replyText[reviewId]?.trim();
    if (!text) return;
    setReplyLoading(reviewId);
    try {
      const { error } = await (supabase as any)
        .from("product_reviews")
        .update({ vendor_reply: text, vendor_replied_at: new Date().toISOString() })
        .eq("id", reviewId);
      if (error) throw error;
      toast.success("Reply sent!");
      setReplyOpen(null);
      setReplyText((prev) => ({ ...prev, [reviewId]: "" }));
      queryClient.invalidateQueries({ queryKey: ["vendor-reviews", vendorId] });
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setReplyLoading(null);
    }
  };

  const filtered = reviews.filter((r: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (r.reviewer_name || "").toLowerCase().includes(q) ||
      (r.review_text || "").toLowerCase().includes(q) ||
      (r.product?.name || "").toLowerCase().includes(q)
    );
  });

  const pending = reviews.filter((r: any) => !r.vendor_reply).length;
  const replied = reviews.filter((r: any) => !!r.vendor_reply).length;

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 max-w-4xl">
      <BackButton className="mb-2" />
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Customer Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">Reply to customer reviews for all your products</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{reviews.length}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-yellow-600">{pending}</p>
          <p className="text-xs text-muted-foreground">Pending Reply</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{replied}</p>
          <p className="text-xs text-muted-foreground">Replied</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by customer name, review text or product..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Reviews List */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center text-muted-foreground">
          {reviews.length === 0 ? "No reviews yet for your products." : "No reviews match your search."}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((review: any) => {
            const name = review.reviewer_name || "Customer";
            const isReplying = replyOpen === review.id;

            return (
              <div key={review.id} className="rounded-xl border bg-card p-4 space-y-3">
                {/* Product info */}
                {review.product && (
                  <div className="flex items-center gap-2 pb-2 border-b">
                    {review.product.image_url ? (
                      <img src={review.product.image_url} alt={review.product.name} className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="h-8 w-8 rounded bg-muted" />
                    )}
                    <span className="text-xs font-medium text-muted-foreground">{review.product.name}</span>
                    {!review.vendor_reply && (
                      <Badge variant="outline" className="ml-auto text-xs border-yellow-300 text-yellow-700 bg-yellow-50">
                        Needs Reply
                      </Badge>
                    )}
                    {review.vendor_reply && (
                      <Badge variant="outline" className="ml-auto text-xs border-green-300 text-green-700 bg-green-50">
                        Replied
                      </Badge>
                    )}
                  </div>
                )}

                {/* Reviewer header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary uppercase shrink-0">
                      {name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <StarRow rating={review.rating} />
                </div>

                {/* Review text */}
                {review.review_text && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{review.review_text}</p>
                )}

                {/* Review images */}
                {(review.image_url_1 || review.image_url_2) && (
                  <div className="flex gap-2">
                    {review.image_url_1 && (
                      <a href={review.image_url_1} target="_blank" rel="noreferrer">
                        <img src={review.image_url_1} alt="Review" className="h-16 w-16 rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                      </a>
                    )}
                    {review.image_url_2 && (
                      <a href={review.image_url_2} target="_blank" rel="noreferrer">
                        <img src={review.image_url_2} alt="Review" className="h-16 w-16 rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                      </a>
                    )}
                  </div>
                )}

                {/* Existing vendor reply */}
                {review.vendor_reply && (
                  <div className="rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Store className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary">Your Reply</span>
                    </div>
                    <p className="text-sm leading-relaxed">{review.vendor_reply}</p>
                    {review.vendor_replied_at && (
                      <p className="text-xs text-muted-foreground">
                        {new Date(review.vendor_replied_at).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                )}

                {/* Reply / Edit Reply button */}
                <div className="space-y-2">
                  {!isReplying && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                      onClick={() => {
                        if (review.vendor_reply) {
                          setReplyText((prev) => ({ ...prev, [review.id]: review.vendor_reply }));
                        }
                        setReplyOpen(review.id);
                      }}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      {review.vendor_reply ? "Edit Reply" : "Reply"}
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  )}

                  {isReplying && (
                    <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                      <Textarea
                        placeholder="Write your reply to this customer..."
                        rows={3}
                        value={replyText[review.id] || ""}
                        onChange={(e) =>
                          setReplyText((prev) => ({ ...prev, [review.id]: e.target.value }))
                        }
                        className="text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="h-8 text-xs"
                          disabled={replyLoading === review.id || !replyText[review.id]?.trim()}
                          onClick={() => handleReplySubmit(review.id)}
                        >
                          {replyLoading === review.id ? (
                            <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Sending...</>
                          ) : review.vendor_reply ? "Save" : "Send Reply"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => { setReplyOpen(null); }}
                        >
                          <ChevronUp className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VendorReviews;
