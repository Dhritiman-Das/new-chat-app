"use client";

import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { UseFormReturn } from "react-hook-form";
import { TimeSlot } from "./types";

// Define the schema for the form values
interface FormValues {
  appointmentDuration: number;
  availabilityWindowDays: number;
  availableTimeSlots: TimeSlot[];
  defaultCalendarId?: string;
  bufferTimeBetweenMeetings?: number;
  timeZone: string;
}

interface TimeSlotListProps {
  form: UseFormReturn<FormValues>;
  daysOfWeek: ReadonlyArray<{ id: string; label: string }>;
}

export function TimeSlotList({ form, daysOfWeek }: TimeSlotListProps) {
  return (
    <div>
      <h3 className="text-md font-medium mb-2">Available Time Slots</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Select which days you are available for appointments and set your
        available hours
      </p>

      <div className="space-y-6 mb-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {daysOfWeek.map((day) => {
            const isSelected = form
              .watch("availableTimeSlots")
              ?.some((slot: TimeSlot) => slot.day === day.id);

            return (
              <Button
                key={day.id}
                type="button"
                variant={isSelected ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const currentSlots = form.watch("availableTimeSlots") || [];

                  if (isSelected) {
                    // Remove this day
                    form.setValue(
                      "availableTimeSlots",
                      currentSlots.filter(
                        (slot: TimeSlot) => slot.day !== day.id
                      )
                    );
                  } else {
                    // Add this day with default 9-5 hours
                    form.setValue("availableTimeSlots", [
                      ...currentSlots,
                      {
                        day: day.id as TimeSlot["day"],
                        startTime: "09:00",
                        endTime: "17:00",
                      },
                    ]);
                  }
                }}
                className="flex items-center gap-2"
              >
                {isSelected ? (
                  <Icons.Check className="h-4 w-4" />
                ) : (
                  <Icons.Add className="h-4 w-4" />
                )}
                <span>{day.label}</span>
              </Button>
            );
          })}
        </div>

        {form.watch("availableTimeSlots")?.length === 0 && (
          <div className="p-4 border border-dashed rounded-md flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              Select at least one day to set your availability
            </p>
          </div>
        )}

        {form
          .watch("availableTimeSlots")
          ?.sort((a: TimeSlot, b: TimeSlot) => {
            const dayOrder =
              daysOfWeek.findIndex((d) => d.id === a.day) -
              daysOfWeek.findIndex((d) => d.id === b.day);
            return dayOrder;
          })
          .map((slot: TimeSlot, index: number) => {
            const dayObj = daysOfWeek.find((d) => d.id === slot.day);

            return (
              <div
                key={`${slot.day}-${index}`}
                className="p-4 border rounded-md"
              >
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">{dayObj?.label}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const currentSlots = form.watch("availableTimeSlots");
                      form.setValue(
                        "availableTimeSlots",
                        currentSlots.filter((_, i: number) => {
                          const slotToRemove = currentSlots[index];
                          return !(
                            slotToRemove.day === slot.day && i === index
                          );
                        })
                      );
                    }}
                    className="h-8 w-8 p-0 text-destructive"
                  >
                    <Icons.Trash className="h-4 w-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name={`availableTimeSlots.${index}.startTime`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`availableTimeSlots.${index}.endTime`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
