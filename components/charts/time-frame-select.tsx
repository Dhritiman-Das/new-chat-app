"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function TimeFrameSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const timeFrame = searchParams.get("timeFrame") || "30d";

  const handleValueChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("timeFrame", value);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <Tabs
      defaultValue={timeFrame}
      className="w-[200px]"
      onValueChange={handleValueChange}
    >
      <TabsList className="grid grid-cols-3">
        <TabsTrigger value="7d">7d</TabsTrigger>
        <TabsTrigger value="30d">30d</TabsTrigger>
        <TabsTrigger value="90d">90d</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}
