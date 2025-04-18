"use client";

import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { RefreshCcw } from "lucide-react";

export function ThemeSelector() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState(theme || "system");
  const [mounted, setMounted] = useState(false);

  // After mounting, we can safely access the theme values
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (value: string) => {
    setSelectedTheme(value);
    setTheme(value);
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return <div className="h-[260px]" />; // placeholder with approximately the same height
  }

  const currentSystemTheme = systemTheme || "light";

  return (
    <div className="space-y-6">
      <RadioGroup
        defaultValue={selectedTheme}
        onValueChange={handleThemeChange}
        className="grid grid-cols-1 gap-8 sm:grid-cols-3"
      >
        <div className="space-y-2">
          <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
          <Label
            htmlFor="dark"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
          >
            <div className="rounded-md border border-border overflow-hidden w-full mb-2">
              <div className="bg-black">
                <div className="flex items-center p-1">
                  <div className="h-1.5 w-6 bg-emerald-500 rounded mr-1"></div>
                  <div className="h-1.5 w-6 bg-gray-700 rounded mr-1"></div>
                  <div className="h-1.5 w-6 bg-gray-700 rounded"></div>
                </div>
                <div className="p-2">
                  <div className="h-2 w-12 bg-gray-700 rounded mb-2"></div>
                  <div className="flex justify-between mb-2">
                    <div className="h-2 w-8 bg-blue-500 rounded"></div>
                    <div className="h-2 w-6 bg-gray-700 rounded"></div>
                  </div>
                  <div className="h-2 w-full bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
            <span className="text-sm font-medium">Dark</span>
          </Label>
        </div>

        <div className="space-y-2">
          <RadioGroupItem value="light" id="light" className="peer sr-only" />
          <Label
            htmlFor="light"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
          >
            <div className="rounded-md border border-border overflow-hidden w-full mb-2">
              <div className="bg-white">
                <div className="flex items-center p-1">
                  <div className="h-1.5 w-6 bg-emerald-500 rounded mr-1"></div>
                  <div className="h-1.5 w-6 bg-gray-300 rounded mr-1"></div>
                  <div className="h-1.5 w-6 bg-gray-300 rounded"></div>
                </div>
                <div className="p-2">
                  <div className="h-2 w-12 bg-gray-300 rounded mb-2"></div>
                  <div className="flex justify-between mb-2">
                    <div className="h-2 w-8 bg-orange-400 rounded"></div>
                    <div className="h-2 w-6 bg-gray-300 rounded"></div>
                  </div>
                  <div className="h-2 w-full bg-gray-300 rounded"></div>
                </div>
              </div>
            </div>
            <span className="text-sm font-medium">Light</span>
          </Label>
        </div>

        <div className="space-y-2">
          <RadioGroupItem value="system" id="system" className="peer sr-only" />
          <Label
            htmlFor="system"
            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
          >
            <div className="rounded-md border border-border overflow-hidden w-full mb-2">
              <div
                className={`${
                  currentSystemTheme === "dark" ? "bg-black" : "bg-white"
                }`}
              >
                <div className="flex items-center p-1">
                  <div className="h-1.5 w-6 bg-emerald-500 rounded mr-1"></div>
                  <div className="h-1.5 w-6 bg-gray-400 rounded mr-1"></div>
                  <div className="h-1.5 w-6 bg-gray-400 rounded"></div>
                </div>
                <div className="p-2">
                  <div className="h-2 w-12 bg-gray-400 rounded mb-2"></div>
                  <div className="flex justify-between mb-2">
                    <div className="h-2 w-8 bg-blue-400 rounded"></div>
                    <div className="h-2 w-6 bg-gray-400 rounded"></div>
                  </div>
                  <div className="h-2 w-full bg-gray-400 rounded"></div>
                </div>
              </div>
            </div>
            <div className="flex items-center text-sm font-medium">
              <span>System</span>
              <span className="ml-1 text-xs text-muted-foreground">
                ({currentSystemTheme})
              </span>
            </div>
          </Label>
        </div>
      </RadioGroup>

      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTheme("system")}
          className="text-xs"
        >
          <RefreshCcw className="h-3.5 w-3.5 mr-1" />
          Reset to system
        </Button>
        <span className="text-xs text-muted-foreground">
          Current theme:{" "}
          {selectedTheme === "system"
            ? `System (${currentSystemTheme})`
            : selectedTheme}
        </span>
      </div>
    </div>
  );
}
