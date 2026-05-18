"use server";

import { redirect } from "next/navigation";

import { adminPath } from "@/lib/admin-base-path";
import { destroySession } from "@/lib/auth";

export async function logoutAction() {
  await destroySession();
  redirect(adminPath("login"));
}
