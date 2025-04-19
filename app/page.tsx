import { requireAuth } from "@/utils/auth";
import { redirect } from "next/navigation";
export default async function Home() {
  const user = await requireAuth();

  if (!user) {
    return redirect("/sign-in");
  }

  return null;
}
