import { Heart } from "lucide-react";

const AdminCustomerWishlist = () => (
  <div className="p-6">
    <h1 className="mb-6 text-xl font-bold">Wishlist</h1>
    <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
      <Heart className="h-14 w-14 opacity-20" />
      <p className="font-medium">Wishlist is empty</p>
    </div>
  </div>
);

export default AdminCustomerWishlist;
