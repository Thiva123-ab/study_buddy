import { createFileRoute, Outlet, redirect, Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sparkles, LogOut, Plus, Zap } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/theme-toggle";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getUserCreditsInfo } from "@/lib/study.functions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const loadCredits = useServerFn(getUserCreditsInfo);
  const [credits, setCredits] = useState<{ creditsRemaining: number; creditsTotal: number; resetsAt: string } | null>(null);

  useEffect(() => {
    loadCredits({}).then(setCredits).catch(console.error);
  }, [loadCredits]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <header className="border-b border-border/60 bg-background/40 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link to="/dashboard" className="flex min-w-0 items-center gap-2">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-display truncate text-base font-semibold sm:text-lg">LectureLens</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {credits && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors border cursor-default ${
                        credits.creditsRemaining / credits.creditsTotal > 0.5
                          ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                          : credits.creditsRemaining / credits.creditsTotal > 0.25
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                            : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400"
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      <span>{credits.creditsRemaining} / {credits.creditsTotal}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="font-semibold">{credits.creditsRemaining} of {credits.creditsTotal} daily credits remaining</p>
                    <p className="text-xs text-muted-foreground">Resets at midnight UTC</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <ThemeToggle />
            <Link to="/upload"><Button size="sm"><Plus className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">New</span></Button></Link>
            <Button size="sm" variant="ghost" onClick={signOut}><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  );
}