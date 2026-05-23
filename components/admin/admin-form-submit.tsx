"use client";

import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type Props = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
};

export function AdminFormSubmit({
  children,
  pendingLabel = "Čuva se…",
  className,
}: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(className, pending && "opacity-70")}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
