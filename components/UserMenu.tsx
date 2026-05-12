import { signOut } from "@/app/(auth)/login/actions";

interface UserMenuProps {
  email: string;
  fullName?: string | null;
  role?: string | null;
}

/**
 * Compact "you are signed in as X" cluster for the site header,
 * with a sign-out button wired to a Server Action.
 */
export function UserMenu({ email, fullName, role }: UserMenuProps) {
  const displayName = fullName?.trim() || email;
  const initials = (displayName[0] ?? "?").toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <div className="hidden md:flex flex-col items-end leading-tight">
        <span className="text-[12px] font-semibold text-text">{displayName}</span>
        {role && (
          <span className="text-[10px] uppercase tracking-wider text-text-muted">
            {role.replace(/_/g, " ")}
          </span>
        )}
      </div>

      <div
        title={email}
        className="w-9 h-9 rounded-full grid place-items-center text-xs font-bold text-white timion-gradient shadow-[0_3px_10px_rgba(124,92,252,0.4)]"
      >
        {initials}
      </div>

      <form action={signOut}>
        <button
          type="submit"
          className="rounded-lg border border-border-bright bg-surface-2 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted hover:text-accent hover:border-accent/40 hover:bg-accent/10 transition-colors"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
