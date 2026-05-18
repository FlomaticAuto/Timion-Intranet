import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/profile";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/permissions";
import { UserRow } from "./UserRow";
import { InviteModal } from "./InviteModal";

export const metadata = { title: "Users — Admin — Timion HQ" };

interface ProfileRow {
  id:          string;
  email:       string;
  full_name:   string | null;
  role:        Role | null;
  is_active:   boolean;
  created_at:  string;
}

export default async function UsersPage() {
  const me       = await getCurrentProfile();
  const supabase = await createClient();

  const { data: rawProfiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, created_at")
    .order("created_at", { ascending: true });

  const profiles = (rawProfiles ?? []) as ProfileRow[];

  // Per-role counts for the summary chips.
  const counts: Record<Role | "unassigned", number> = {
    unassigned:         0,
    admin:              0,
    management:         0,
    production_manager: 0,
    carpenter:          0,
    therapist:          0,
    office:             0,
    auditor:            0,
    board:              0,
  };
  for (const p of profiles) {
    counts[p.role ?? "unassigned"]++;
  }

  return (
    <>
      <div className="text-[12px] text-text-muted mb-3">
        <Link href="/admin" className="hover:text-accent">Admin</Link>
        <span className="px-2 text-text-dim">/</span>
        <span className="text-text">Users</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-0">
        <SectionHeader
          eyebrow="Admin"
          title="Users"
          subtitle="Everyone with access to Timion HQ. Invite new staff, assign roles, and toggle active status."
        />
        <div className="shrink-0 pt-1">
          <InviteModal />
        </div>
      </div>

      {/* Summary chips */}
      <div className="grid gap-3 mb-7 [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="font-[family-name:var(--font-sora)] text-2xl font-bold text-white">{profiles.length}</div>
          <div className="text-[11px] uppercase tracking-wider text-text-muted">Total users</div>
        </div>
        {(["unassigned", ...ROLES] as const).map((key) => {
          const label = key === "unassigned" ? "Unassigned" : ROLE_LABELS[key];
          const value = counts[key];
          if (value === 0 && key !== "unassigned") return null;
          return (
            <div key={key} className="rounded-2xl border border-border bg-surface p-4">
              <div className="font-[family-name:var(--font-sora)] text-2xl font-bold text-white">{value}</div>
              <div className="text-[11px] uppercase tracking-wider text-text-muted">{label}</div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-6 rounded-lg border border-[rgba(255,75,110,0.3)] bg-[rgba(255,75,110,0.10)] px-4 py-3 text-[13px] text-[#ff4b6e]">
          Failed to load profiles: {error.message}
        </div>
      )}

      {profiles.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface p-8 text-center text-text-muted">
          No users yet. Add one in Supabase → Authentication → Users.
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <table className="w-full text-left">
            <thead className="text-[10px] font-bold uppercase tracking-[0.12em] text-text-muted">
              <tr className="border-b border-border">
                <th className="py-3 px-4 pl-4">User</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Created</th>
                <th className="py-3 pr-4 text-right">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p) => (
                <UserRow
                  key={p.id}
                  profile={{
                    id:        p.id,
                    email:     p.email,
                    fullName:  p.full_name,
                    role:      p.role,
                    isActive:  p.is_active,
                    createdAt: p.created_at,
                  }}
                  isSelf={p.id === me?.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 text-[12px] text-text-muted">
        Use <span className="text-text font-semibold">Add User</span> above to invite staff by email — they&apos;ll receive a link to set their password.
        Requires <code className="text-text">SUPABASE_SERVICE_ROLE_KEY</code> in Vercel env vars and the Supabase Site URL set to the production URL.
      </div>
    </>
  );
}
