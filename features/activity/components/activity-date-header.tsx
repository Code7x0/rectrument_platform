"use client";

interface ActivityDateHeaderProps {
  label: string;
}

export function ActivityDateHeader({ label }: ActivityDateHeaderProps) {
  return (
    <h3 className="sticky top-0 z-10 bg-[#F8FAFC]/95 py-2 text-xs font-semibold uppercase tracking-wide text-[#64748B] backdrop-blur">
      {label}
    </h3>
  );
}
