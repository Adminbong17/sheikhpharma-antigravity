import PosRegister from "@/components/pos/PosRegister";

export default function AdminPosRegister() {
  return (
    <div className="p-2 sm:p-4">
      <PosRegister scope="admin" />
    </div>
  );
}
