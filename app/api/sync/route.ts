import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = process.env.GITHUB_SYNC_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Sync not configured — add GITHUB_SYNC_TOKEN to environment variables" },
      { status: 503 },
    );
  }

  const resp = await fetch(
    "https://api.github.com/repos/FlomaticAuto/Timion-Intranet/actions/workflows/sync-zoho.yml/dispatches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "main" }),
    },
  );

  if (!resp.ok) {
    const text = await resp.text();
    return NextResponse.json(
      { error: `GitHub API ${resp.status}: ${text.slice(0, 200)}` },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
