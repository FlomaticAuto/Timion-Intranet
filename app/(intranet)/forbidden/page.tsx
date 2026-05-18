import Link from "next/link";
import { SectionHeader } from "@/components/SectionHeader";

export const metadata = { title: "Access Restricted — Timion HQ" };

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-6xl mb-6 leading-none">🚫</div>

      <SectionHeader
        eyebrow="Access Restricted"
        title="You don't have access to this section"
        subtitle="If you need access, ask an admin to update your permissions from the Access Policy page."
      />

      <Link
        href="/"
        className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-semibold hover:bg-accent/20 transition-colors"
      >
        ← Back to Home
      </Link>
    </div>
  );
}
