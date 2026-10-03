import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { homeFor } from "@/lib/types";
import { AuthForm } from "@/components/auth-form";
export const metadata = { title: "Sign in" };
export default async function Login() {
  const user = await currentUser();
  if (user) redirect(homeFor(user.user_type));
  return <AuthForm />;
}
