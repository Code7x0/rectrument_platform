import { redirect } from "next/navigation";

/**
 * Public self-registration is disabled.
 * Only Admin can create users in Airtable.
 */
export default function SignUpPage() {
  redirect("/sign-in");
}
