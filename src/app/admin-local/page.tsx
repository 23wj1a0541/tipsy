import { Metadata } from "next";
import AdminLocalApp from "@/components/admin/AdminLocalApp";

export const metadata: Metadata = {
  title: "Hidden Admin",
  description: "Local-only admin controls",
};

export default function AdminLocalPage() {
  return <AdminLocalApp />;
}