import { lazy, Suspense } from "react";

const PosReports = lazy(() => import("@/pages/pos/PosReports"));

export default function AdminPosReports() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading reports...</div>}>
      <PosReports scope="admin" />
    </Suspense>
  );
}
