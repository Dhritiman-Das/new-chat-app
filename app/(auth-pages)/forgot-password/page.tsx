import { forgotPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icons } from "@/components/icons";

export default async function ForgotPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="flex flex-col gap-6 w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-2">
              <div className="bg-primary/10 p-3 rounded-full">
                <Icons.LogoIcon className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-medium">
              Reset your password
            </CardTitle>
            <CardDescription>
              Enter your email address and we&apos;ll send you a link to reset
              your password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col">
              <div className="grid gap-6">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      name="email"
                      id="email"
                      placeholder="you@example.com"
                      type="email"
                      required
                    />
                  </div>
                  <SubmitButton
                    className="w-full mt-2"
                    pendingText="Sending reset link..."
                    formAction={forgotPasswordAction}
                  >
                    Send reset link
                  </SubmitButton>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Remember your password?{" "}
                  <Link
                    className="text-primary font-medium underline underline-offset-4 hover:text-primary/90"
                    href="/sign-in"
                  >
                    Sign in
                  </Link>
                </div>
                <FormMessage message={searchParams} />
              </div>
            </form>
          </CardContent>
        </Card>
        <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary">
          By continuing, you agree to our{" "}
          <a href="https://www.bonti.co/terms">Terms of Service</a> and{" "}
          <a href="https://www.bonti.co/privacy-policy">Privacy Policy</a>.
        </div>
      </div>
    </div>
  );
}
