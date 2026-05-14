/**
 * Source of truth for role-based access in the Timion intranet.
 *
 * Two things live here:
 *   1. The list of roles + their display labels
 *   2. The map of role → which sections they're allowed to see
 *
 * The /admin/access page reads this and renders it as a matrix.
 * When we later turn on enforcement, the proxy and the TabNav read
 * the same map — so changing access is a single-file edit.
 */

export const ROLES = [
  "admin",
  "management",
  "production_manager",
  "carpenter",
  "therapist",
  "office",
  "auditor",
  "board",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin:              "Admin",
  management:         "Management",
  production_manager: "Production Manager",
  carpenter:          "Carpenter",
  therapist:          "Therapist",
  office:             "Office",
  auditor:            "Auditor",
  board:              "Board",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  admin:              "Full access including user management.",
  management:         "Cross-functional view — KPIs, finances, board reporting.",
  production_manager: "Workshop oversight — schedule, stock, full inventory.",
  carpenter:          "Workshop staff — today's job, mark complete.",
  therapist:          "Field therapists — visits, equipment-per-patient.",
  office:             "Reception & finance assistant — SOPs, documents.",
  auditor:            "External auditor — scoped read-only view of compliance.",
  board:              "Board members — annual report, board pack, KPIs.",
};

/* ──────────────────────────────────────────────────────────
   Sections (top-level tabs)
   ────────────────────────────────────────────────────────── */
export const SECTIONS = [
  { path: "/",           label: "Home",               icon: "🏠" },
  { path: "/crm",        label: "CRM",                icon: "👥" },
  { path: "/inventory",  label: "Inventory",          icon: "📦" },
  { path: "/books",      label: "Books",              icon: "💰" },
  { path: "/workshop",   label: "Workshop",           icon: "🛠️" },
  { path: "/hr",         label: "HR",                 icon: "🧑‍💼" },
  { path: "/iso",        label: "ISO / Compliance",   icon: "✅" },
  { path: "/documents",  label: "Documents",          icon: "📁" },
  { path: "/board",      label: "Board & Reporting",  icon: "📈" },
  { path: "/admin",      label: "Admin",              icon: "⚙️" },
] as const;

export type SectionPath = (typeof SECTIONS)[number]["path"];

/* ──────────────────────────────────────────────────────────
   Access levels per (role, section)
   ────────────────────────────────────────────────────────── */
export type AccessLevel =
  | "full"      // can see + use everything in the section
  | "read"      // can see but not modify
  | "scoped"    // partial / row-scoped access (e.g., therapist sees their patients only)
  | "none";     // hidden

/** Full role → section → access map. Stored in Supabase, editable from /admin/access. */
export type AccessPolicy = Record<Role, Partial<Record<SectionPath, AccessLevel>>>;

/**
 * Default access policy. Used to seed the app_settings row on first
 * setup and as the target of the "Reset to defaults" button. The
 * live policy is in Supabase — see `lib/access.ts`.
 */
export const DEFAULT_SECTION_ACCESS: AccessPolicy = {
  admin: {
    "/":          "full",
    "/crm":       "full",
    "/inventory": "full",
    "/books":     "full",
    "/workshop":  "full",
    "/hr":        "full",
    "/iso":       "full",
    "/documents": "full",
    "/board":     "full",
    "/admin":     "full",
  },
  management: {
    "/":          "full",
    "/crm":       "full",
    "/inventory": "full",
    "/books":     "full",
    "/workshop":  "full",
    "/hr":        "full",
    "/iso":       "full",
    "/documents": "full",
    "/board":     "full",
  },
  production_manager: {
    "/":          "full",
    "/inventory": "full",
    "/workshop":  "full",
    "/hr":        "read",
    "/documents": "read",
  },
  carpenter: {
    "/":          "full",
    "/workshop":  "full",
    "/inventory": "read",
    "/documents": "read",
  },
  therapist: {
    "/":          "full",
    "/crm":       "scoped",
    "/documents": "read",
  },
  office: {
    "/":          "full",
    "/books":     "read",
    "/hr":        "full",
    "/iso":       "full",
    "/documents": "full",
  },
  auditor: {
    "/":          "full",
    "/iso":       "scoped",
    "/documents": "read",
  },
  board: {
    "/":          "full",
    "/hr":        "read",
    "/board":     "full",
    "/documents": "read",
  },
};

/**
 * Get the access level a role has on a section, defaulting to "none".
 * Pass the live policy from `getAccessPolicy()` to honour admin edits;
 * omit to use the static default (useful for tests or fallback paths).
 */
export function accessFor(
  role: Role | null,
  path: SectionPath,
  policy: AccessPolicy = DEFAULT_SECTION_ACCESS,
): AccessLevel {
  if (!role) return "none";
  return policy[role]?.[path] ?? "none";
}

/** Does this role have any access (read or better) to the section? */
export function canAccess(
  role: Role | null,
  path: SectionPath,
  policy: AccessPolicy = DEFAULT_SECTION_ACCESS,
): boolean {
  return accessFor(role, path, policy) !== "none";
}
