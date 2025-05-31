"use client";

import { useEffect, useState } from "react";
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
import { Icons } from "@/components/icons";

interface Organization {
  id: string;
  name: string;
}

interface CompleteClientProps {
  organization: Organization;
}

export default function CompleteClient({ organization }: CompleteClientProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router, organization.id]);

  // Add a separate effect to handle navigation when countdown reaches 0
  useEffect(() => {
    if (countdown === 0) {
      router.push(`/dashboard/${organization.id}`);
    }
  }, [countdown, router, organization.id]);

  const handleContinue = () => {
    router.push(`/dashboard/${organization.id}`);
  };

  return (
    <div className="container max-w-md px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full">
          <CardHeader className="text-center pb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.2,
              }}
              className="w-20 h-20 mx-auto mb-6 text-primary"
            >
              <Icons.CheckCircle className="w-full h-full" />
            </motion.div>

            <CardTitle className="text-2xl font-bold">
              Setup Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-2">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-muted-foreground"
            >
              Your organization &quot;{organization.name}&quot; has been created
              successfully.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-sm text-muted-foreground"
            >
              You&apos;ll be redirected to your dashboard in {countdown}{" "}
              seconds...
            </motion.p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleContinue} className="w-full">
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
