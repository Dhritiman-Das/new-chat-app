import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GoHighLevelScopeDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" className="underline px-0">
          here
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>GoHighLevel Calendar Integration</DialogTitle>
          <DialogDescription>
            This integration connects your bot to GoHighLevel Calendar for
            appointment scheduling
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>
              The GoHighLevel Calendar integration requires access to your
              GoHighLevel account to:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your calendar information</li>
              <li>View available time slots</li>
              <li>Schedule appointments</li>
              <li>View and manage existing appointments</li>
            </ul>
          </div>

          <Card>
            <CardHeader className="">
              <CardTitle className="text-base">Integration Features</CardTitle>
              <CardDescription>
                What this tool can do for your bot
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4 pt-0">
              <ul className="grid gap-3 text-sm">
                <li className="flex gap-2 items-start">
                  <span className="bg-primary/10 text-primary rounded-full p-1 size-6 flex items-center justify-center">
                    ✓
                  </span>
                  <span>
                    <span className="font-medium block">Book Appointments</span>
                    Schedule new appointments with your contacts
                  </span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="bg-primary/10 text-primary rounded-full p-1 size-6 flex items-center justify-center">
                    ✓
                  </span>
                  <span>
                    <span className="font-medium block">
                      List Available Time Slots
                    </span>
                    Find times when you&apos;re available for appointments
                  </span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="bg-primary/10 text-primary rounded-full p-1 size-6 flex items-center justify-center">
                    ✓
                  </span>
                  <span>
                    <span className="font-medium block">List Appointments</span>
                    View upcoming and past appointments
                  </span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="bg-primary/10 text-primary rounded-full p-1 size-6 flex items-center justify-center">
                    ✓
                  </span>
                  <span>
                    <span className="font-medium block">
                      Cancel Appointments
                    </span>
                    Cancel existing appointments when needed
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <div className="text-sm">
            <p className="text-muted-foreground">
              To use this integration, you must have a GoHighLevel account with
              access to calendar features. You&apos;ll need to connect your
              GoHighLevel account and configure the calendar settings.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
