import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AuthMessageProps {
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function AuthMessage({
  title,
  description,
  action,
  className,
}: AuthMessageProps) {
  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center",
        className,
      )}
    >
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <p className="text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

interface AuthPageShellProps {
  children: ReactNode;
}

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
      <div className="w-full max-w-lg rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
        {children}
      </div>
    </main>
  );
}

export function AuthPrimaryLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Button asChild>
      <a href={href}>{children}</a>
    </Button>
  );
}
