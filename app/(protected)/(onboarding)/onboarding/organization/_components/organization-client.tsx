"use client";

import { motion } from "framer-motion";
import OrganizationForm from "@/components/organization-form";

interface OrganizationClientProps {
  redirectPath: string;
}

export default function OrganizationClient({
  redirectPath,
}: OrganizationClientProps) {
  return (
    <>
      <motion.div
        className="space-y-2 text-center mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">
          Create Your Organization
        </h1>
        <p className="text-muted-foreground">
          This is where you&apos;ll manage your bots and team members.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <OrganizationForm isOnboarding={true} redirectPath={redirectPath} />
      </motion.div>
    </>
  );
}
