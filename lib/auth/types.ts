import type { UserRole } from "@/lib/db/schema";

export type SessionUser = {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
};
