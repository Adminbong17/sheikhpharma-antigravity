import Navbar from "@/components/Navbar";
import { Ticket, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const Vouchers = () => {
  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <div className="container mx-auto px-4 py-4">
        <div className="mb-4 flex items-center gap-2">
          <Link to="/dashboard" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </div>
        <h1 className="mb-6 text-xl font-bold">My Vouchers</h1>
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Ticket className="h-14 w-14 opacity-20" />
          <p className="font-medium">No vouchers available</p>
          <p className="text-sm text-center">You don't have any vouchers right now. Check back later for great deals!</p>
          <Link to="/" className="mt-2 rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors">
            Shop Now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Vouchers;
