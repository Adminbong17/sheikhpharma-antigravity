import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Loader2 } from "lucide-react";

const ExternalCart = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { clearCart, addItem } = useCart();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setError("Invalid cart link.");
      setLoading(false);
      return;
    }

    const loadCart = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from("external_carts" as any)
          .select("items, expires_at")
          .eq("cart_token", token)
          .single();

        if (fetchError || !data) {
          setError("Cart not found or has expired.");
          setLoading(false);
          return;
        }

        const cart = data as any;

        // Check expiry
        if (new Date(cart.expires_at) < new Date()) {
          setError("This cart link has expired.");
          setLoading(false);
          return;
        }

        // Clear existing cart and populate with external items
        clearCart();
        const items = cart.items as any[];
        for (const item of items) {
          for (let i = 0; i < (item.quantity || 1); i++) {
            addItem({
              id: item.product_id,
              name: item.name || "Product",
              price: item.price || 0,
              image_url: item.image_url || null,
            });
          }
        }

        // Redirect to checkout
        navigate("/checkout", { replace: true });
      } catch {
        setError("Something went wrong loading your cart.");
        setLoading(false);
      }
    };

    loadCart();
  }, [token]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-destructive text-lg font-medium">{error}</p>
          <button
            onClick={() => navigate("/")}
            className="text-primary underline"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        <p className="text-muted-foreground">Loading your cart...</p>
      </div>
    </div>
  );
};

export default ExternalCart;
