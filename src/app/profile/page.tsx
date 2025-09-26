export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <p className="text-muted-foreground">
        Sign in to view and manage your profile. You can update your details and access your dashboard based on your role.
      </p>
      <div className="mt-6 rounded-xl border bg-card p-6 space-y-3">
        <p className="text-sm text-muted-foreground">
          Coming soon: role-aware profile with links to Worker / Owner dashboards and your tipping links.
        </p>
      </div>
    </div>
  );
}