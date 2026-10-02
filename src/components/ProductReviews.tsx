import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Star, MessageSquare, Store, ChevronDown, ChevronUp, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface ProductReviewsProps {
  productId: string;
  vendorUserId?: string | null;
  vendorName?: string | null;
}

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

const ProductReviews = ({ productId, vendorUserId, vendorName }: ProductReviewsProps) => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const isVendor = !!user && user.id === vendorUserId;

  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyLoading, setReplyLoading] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    setDeleteLoading(reviewId);
    try {
      const { error } = await (supabase as any).from("product_reviews").delete().eq("id", reviewId);
      if (error) throw error;
      toast.success("Review deleted");
      queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
    } catch {
      toast.error("Failed to delete review");
    } finally {
      setDeleteLoading(null);
    }
  };

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!productId,
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
      queryClient.invalidateQueries({ queryKey: ["product-reviews", productId] });
    } catch (err: any) {
      toast.error("Failed to send reply");
    } finally {
      setReplyLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        No reviews yet for this product.
      </div>
    );
  }

  const avgRating = (reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length).toFixed(1);

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-bold text-foreground">Customer Reviews</h3>
        <div className="flex items-center gap-1.5 rounded-full bg-yellow-50 border border-yellow-200 px-3 py-0.5">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-sm font-semibold text-yellow-700">{avgRating}</span>
          <span className="text-xs text-muted-foreground">({reviews.length} reviews)</span>
        </div>
      </div>

      <div className="space-y-4">
        {reviews.map((review: any) => {
          const name = review.reviewer_name || "Customer";
          const isReplying = replyOpen === review.id;

          return (
            <div key={review.id} className="rounded-xl border bg-card p-4 space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary uppercase shrink-0">
                    {name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.created_at).toLocaleDateString("en-US", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                <StarRow rating={review.rating} />
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    disabled={deleteLoading === review.id}
                    onClick={() => handleDeleteReview(review.id)}
                  >
                    {deleteLoading === review.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </Button>
                )}
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
                      <img src={review.image_url_1} alt="Review image 1" className="h-20 w-20 rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                    </a>
                  )}
                  {review.image_url_2 && (
                    <a href={review.image_url_2} target="_blank" rel="noreferrer">
                      <img src={review.image_url_2} alt="Review image 2" className="h-20 w-20 rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                    </a>
                  )}
                </div>
              )}

              {/* Vendor reply (existing) */}
              {review.vendor_reply && (
                <div className="rounded-lg border-l-4 border-primary bg-primary/5 px-4 py-3 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">{vendorName || "Seller"}'s Reply</span>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{review.vendor_reply}</p>
                  {review.vendor_replied_at && (
                    <p className="text-xs text-muted-foreground">
                      {new Date(review.vendor_replied_at).toLocaleDateString("en-US", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </p>
                  )}
                </div>
              )}

              {/* Vendor reply button (only for vendor, only if not already replied) */}
              {isVendor && !review.vendor_reply && (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-primary hover:bg-primary/10"
                    onClick={() => setReplyOpen(isReplying ? null : review.id)}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    Reply
                    {isReplying ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>

                  {isReplying && (
                    <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                      <Textarea
                        placeholder="Write your reply..."
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
                            <><Loader2 className="h-3 w-3 animate-spin" /> Sending...</>
                          ) : "Send Reply"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => setReplyOpen(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Vendor edit reply button */}
              {isVendor && review.vendor_reply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 text-muted-foreground hover:text-primary"
                  onClick={() => {
                    setReplyText((prev) => ({ ...prev, [review.id]: review.vendor_reply }));
                    setReplyOpen(review.id);
                  }}
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Edit Reply
                </Button>
              )}

              {/* Edit reply textarea for already-replied */}
              {isVendor && review.vendor_reply && replyOpen === review.id && (
                <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                  <Textarea
                    placeholder="Edit your reply..."
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
                        <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>
                      ) : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => setReplyOpen(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProductReviews;
