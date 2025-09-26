import type { Metadata } from "next";
import AdminUsersManager from "@/components/admin/AdminUsersManager";
import FeatureTogglesManager from "@/components/admin/FeatureTogglesManager";

export const metadata: Metadata = {
  title: "Admin • Users",
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <p className="text-sm text-muted-foreground">Manage users and roles</p>
      </div>
      <AdminUsersManager />

      <div className="space-y-2 pt-6 border-t">
        <h2 className="text-xl font-semibold">Feature Toggles</h2>
        <p className="text-sm text-muted-foreground">Enable/disable features and set audience</p>
      </div>
      <FeatureTogglesManager />
    </div>
  );
}