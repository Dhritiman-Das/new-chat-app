"use client";

import { motion } from "framer-motion";
import SurveyForm from "@/components/survey-form";

export interface SurveyClientProps {
  redirectPath?: string;
}

export default function SurveyClient({
  redirectPath = "/onboarding/complete",
}: SurveyClientProps) {
  return (
    <div className="container max-w-md px-4">
      <motion.div
        className="space-y-2 text-center mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-3xl font-bold tracking-tight mb-6">
          Help us understand you better
        </h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <SurveyForm redirectPath={redirectPath} />
      </motion.div>
    </div>
  );
}
