import { signInAction } from "@/app/actions";
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
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
// import { AppleSignInButton } from "@/components/auth/apple-sign-in-button";

export default async function Login(props: { searchParams: Promise<Message> }) {
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
            <CardTitle className="text-2xl font-medium">Sign in</CardTitle>
            <CardDescription>
              Welcome back! Sign in to your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex flex-col">
              <div className="grid gap-6">
                <div className="flex flex-col gap-4">
                  {/* <AppleSignInButton /> */}
                  <GoogleSignInButton />
                </div>
                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                  <span className="relative z-10 bg-card px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      name="email"
                      id="email"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <Link
                        className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4"
                        href="/forgot-password"
                      >
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      type="password"
                      name="password"
                      id="password"
                      placeholder="Your password"
                      required
                    />
                  </div>
                  <SubmitButton
                    className="w-full mt-2"
                    pendingText="Signing In..."
                    formAction={signInAction}
                  >
                    Sign in
                  </SubmitButton>
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  Don&apos;t have an account?{" "}
                  <Link
                    className="text-primary font-medium underline underline-offset-4 hover:text-primary/90"
                    href="/sign-up"
                  >
                    Sign up
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
