import { redirect } from "next/navigation";

export default async function DashboardPage() {
  return redirect("/dashboard/bots");
}
