import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Camera, X, Loader2, ChevronLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  productImage?: string | null;
  orderId: string;
  orderItemId: string;
  onReviewed: () => void;
}

const ratingLabels = ["", "Very Bad", "Bad", "Okay", "Good", "Excellent"];

const ReviewDialog = ({
  open,
  onOpenChange,
  productId,
  productName,
  productImage,
  orderId,
  orderItemId,
  onReviewed,
}: ReviewDialogProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [images, setImages] = useState<(File | null)[]>([null, null]);
  const [previews, setPreviews] = useState<(string | null)[]>([null, null]);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (index: number, file: File | null) => {
    const newImages = [...images];
    const newPreviews = [...previews];
    newImages[index] = file;
    newPreviews[index] = file ? URL.createObjectURL(file) : null;
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const uploadImage = async (file: File, path: string): Promise<string | null> => {
    const { error } = await supabase.storage
      .from("review-images")
      .upload(path, file, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from("review-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setLoading(true);
    try {
      let imageUrl1: string | null = null;
      let imageUrl2: string | null = null;

      if (images[0]) {
        imageUrl1 = await uploadImage(images[0], `${user.id}/${orderItemId}_1_${Date.now()}`);
      }
      if (images[1]) {
        imageUrl2 = await uploadImage(images[1], `${user.id}/${orderItemId}_2_${Date.now()}`);
      }

      const { error } = await (supabase as any).from("product_reviews").insert({
        product_id: productId,
        user_id: user.id,
        order_id: orderId,
        order_item_id: orderItemId,
        rating,
        review_text: reviewText.trim() || null,
        image_url_1: imageUrl1,
        image_url_2: imageUrl2,
      });

      if (error) throw error;

      toast.success("Review submitted successfully!");
      onReviewed();
      onOpenChange(false);
      setRating(0);
      setReviewText("");
      setImages([null, null]);
      setPreviews([null, null]);
    } catch (err: any) {
      toast.error("Failed to submit review: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const charCount = reviewText.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-xl">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-background">
          <button onClick={() => onOpenChange(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h2 className="text-lg font-bold">Write Review</h2>
        </div>

        {/* Product Info */}
        <div className="flex items-center gap-3 px-4 py-3 bg-background">
          {productImage ? (
            <img src={productImage} alt={productName} className="h-14 w-14 rounded-lg object-cover border" />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center text-xl">📦</div>
          )}
          <p className="text-sm font-medium line-clamp-2 flex-1">{productName}</p>
        </div>

        {/* Overall Rating */}
        <div className="flex items-center justify-between px-4 py-3 border-y bg-background">
          <span className="text-base font-semibold">Overall Rating</span>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110 active:scale-95"
              >
                <Star
                  className={`h-7 w-7 transition-colors ${
                    star <= rating
                      ? "fill-amber-400 text-amber-400"
                      : "fill-muted text-muted-foreground/40"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Rating label */}
        {rating > 0 && (
          <div className="px-4 pt-1 pb-0">
            <span className="text-xs font-medium text-amber-600">{ratingLabels[rating]}</span>
          </div>
        )}

        {/* Review Text */}
        <div className="px-4 pt-3 pb-1 space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Please enter at least 30 characters
          </p>
          <Textarea
            placeholder="What do you think of the quality and appearance?"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            rows={5}
            className="resize-none text-sm border-muted bg-muted/30 focus:bg-background"
          />
          {charCount > 0 && (
            <p className={`text-xs text-right ${charCount >= 30 ? "text-green-600" : "text-muted-foreground"}`}>
              {charCount} characters
            </p>
          )}
        </div>

        {/* Upload Photos */}
        <div className="px-4 pt-2 pb-4 space-y-2">
          <p className="text-sm text-muted-foreground">Upload photos</p>
          <div className="flex gap-3">
            {[0, 1].map((idx) => (
              <div key={idx} className="relative">
                {previews[idx] ? (
                  <div className="relative h-24 w-24 rounded-xl overflow-hidden border bg-muted">
                    <img src={previews[idx]!} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() => handleImageChange(idx, null)}
                      className="absolute top-1 right-1 rounded-full bg-foreground/70 text-background p-0.5 hover:bg-foreground transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 bg-muted/40 hover:bg-muted/60 hover:border-muted-foreground/50 transition-colors gap-1">
                    <Camera className="h-6 w-6 text-muted-foreground/60" />
                    <span className="text-[10px] text-muted-foreground/70 font-medium leading-tight text-center">
                      Upload<br />Photo
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageChange(idx, e.target.files?.[0] || null)}
                    />
                  </label>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button - Fixed at bottom */}
        <div className="px-4 py-3 border-t bg-muted/20">
          <Button
            onClick={handleSubmit}
            disabled={loading || rating === 0}
            className="w-full h-11 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/90"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Submitting...
              </>
            ) : (
              rating === 0 ? "Select a rating" : "Submit Review"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
