"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function WelcomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleContinue = () => {
    setIsLoading(true);
    router.push("/onboarding/organization");
  };

  return (
    <div className="container max-w-md px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full">
          <CardHeader className="text-center pb-4">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <CardTitle className="text-3xl font-bold mb-3">
                Welcome to Bonti!
              </CardTitle>
              <p className="text-muted-foreground">
                Let&apos;s get you set up with everything you need to start
                creating your AI bots.
              </p>
            </motion.div>
          </CardHeader>
          <CardContent className="text-center pb-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="space-y-4"
            >
              <p>In the next few steps, we&apos;ll:</p>
              <ul className="text-left ml-6 space-y-2">
                <li className="list-disc">Create your organization</li>
                <li className="list-disc">
                  Gather some information about your needs
                </li>
                <li className="list-disc">Set you up for success</li>
              </ul>
            </motion.div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleContinue}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? "Loading..." : "Let's get started"}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
