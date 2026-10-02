import { useState, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut } from "lucide-react";

interface Props {
  /** Render prop: receives the function that opens the confirmation dialog. */
  children: (open: () => void) => ReactNode;
}

/**
 * Wraps any logout trigger with a confirmation prompt.
 * Usage: <LogoutConfirm>{(ask) => <Button onClick={ask}>Sign Out</Button>}</LogoutConfirm>
 */
const LogoutConfirm = ({ children }: Props) => {
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      {children(() => setOpen(true))}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <LogOut className="h-4 w-4" />
              </span>
              লগ আউট করবেন?
            </AlertDialogTitle>
            <AlertDialogDescription>
              আপনি কি নিশ্চিতভাবে অ্যাকাউন্ট থেকে বের হতে চান? আবার ব্যবহার করতে হলে পুনরায় লগইন করতে হবে।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel className="mt-0">না, থাকি</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => signOut()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              হ্যাঁ, লগ আউট
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default LogoutConfirm;
