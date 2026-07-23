import { redirect } from "next/navigation";

import { getAppSession } from "@/lib/auth";

/**
 * Account Manager settings → notification preferences.
 * Platform Settings remain at /settings (Admin / Super Admin).
 */
export default async function AccountManagerSettingsPage() {
  const session = await getAppSession();
  if (!session) {
    redirect("/unauthorized");
  }
  if (session.role !== "account_manager") {
    redirect("/forbidden");
  }
  redirect("/notifications/preferences");
}
