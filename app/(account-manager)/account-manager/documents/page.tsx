import { redirect } from "next/navigation";

/**
 * Account Managers must not access partner documents (identity / KYC privacy).
 */
export default function AccountManagerDocumentsPage() {
  redirect("/forbidden");
}
