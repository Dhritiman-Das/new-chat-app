"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import Image from "next/image";
import { useQueryState } from "nuqs";
import { deploymentLogos } from "@/lib/bot-deployments";
import { useParams } from "next/navigation";
import Link from "next/link";

interface SettingItem {
  id: string;
  [key: string]: unknown;
}

export function DeploymentCard({
  id,
  logoId,
  name,
  short_description,
  description,
  settings,
  images,
  active,
  installed,
  category,
  userSettings,
}: {
  id: string;
  logoId: string;
  name: string;
  short_description: string;
  description: string;
  settings: Record<string, unknown> | SettingItem[];
  images: string[];
  active?: boolean;
  installed?: boolean;
  category: string;
  userSettings: Record<string, unknown> | SettingItem[];
}) {
  const [params, setParams] = useQueryState("app");
  const routeParams = useParams();
  const { orgId, botId } = routeParams as { orgId: string; botId: string };

  const LogoComponent = deploymentLogos[logoId as keyof typeof deploymentLogos];

  return (
    <Card key={id} className="w-full flex flex-col">
      <Sheet open={params === id} onOpenChange={() => setParams(null)}>
        <div className="pt-4 px-4 h-14 flex items-center justify-between">
          {LogoComponent ? (
            <LogoComponent />
          ) : (
            <div className="h-6 w-6 bg-muted rounded-md" />
          )}

          {installed && (
            <div className="text-green-600 bg-green-100 text-[10px] dark:bg-green-900 dark:text-green-300 px-3 py-1 rounded-full font-mono">
              Installed
            </div>
          )}
        </div>

        <CardHeader className="pb-0 pt-2 px-4">
          <div className="flex items-center space-x-2 pb-2">
            <CardTitle className="text-md font-medium leading-none p-0 m-0">
              {name}
            </CardTitle>
            {!active && (
              <span className="text-muted-foreground bg-muted text-[10px] px-3 py-1 rounded-full font-mono">
                Coming soon
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground pb-3 px-4">
          {short_description}
        </CardContent>

        <div className="px-4 pb-4 mt-auto">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={!active}
              onClick={() => setParams(id)}
            >
              Details
            </Button>

            {installed ? (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <Link
                  href={`/dashboard/${orgId}/bots/${botId}/deployments/${id}`}
                >
                  Settings
                </Link>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                disabled={!active}
                asChild
              >
                <Link
                  href={`/dashboard/${orgId}/bots/${botId}/deployments/${id}`}
                >
                  Install
                </Link>
              </Button>
            )}
          </div>
        </div>

        <SheetContent>
          <SheetHeader>
            <div className="mb-4">
              <Image
                src={images[0]}
                alt={name}
                width={465}
                height={290}
                quality={100}
              />
            </div>

            <div className="flex items-center justify-between border-b border-border pb-2">
              <div className="flex items-center space-x-2">
                {LogoComponent ? (
                  <LogoComponent />
                ) : (
                  <div className="h-6 w-6 bg-muted rounded-md" />
                )}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg leading-none">{name}</h3>
                    {installed && (
                      <div className="bg-green-600 text-[9px] dark:bg-green-300 rounded-full size-1" />
                    )}
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {category} • Published by Midday
                  </span>
                </div>
              </div>

              <div>
                {installed ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                  >
                    <Link
                      href={`/dashboard/${orgId}/bots/${botId}/deployments/${id}`}
                    >
                      Settings
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-primary"
                    disabled={!active}
                    asChild
                  >
                    <Link
                      href={`/dashboard/${orgId}/bots/${botId}/deployments/${id}`}
                    >
                      Install
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-530px)] pt-2">
            <Accordion
              type="multiple"
              defaultValue={[
                "description",
                ...(params === id ? ["settings"] : []),
              ]}
              className="mt-4"
            >
              <AccordionItem value="description" className="border-none">
                <AccordionTrigger>How it works</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm">
                  {description}
                </AccordionContent>
              </AccordionItem>

              {settings && (
                <AccordionItem value="settings" className="border-none">
                  <AccordionTrigger>Settings</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-sm">
                    {/* Placeholder for AppSettings - replace with actual component */}
                    <div className="p-2 border rounded">
                      <p>Settings panel for {id}</p>
                      <pre className="text-xs bg-muted p-2 rounded mt-2">
                        {JSON.stringify(
                          [
                            ...Object.values({
                              ...Object.fromEntries(
                                (Array.isArray(settings) ? settings : []).map(
                                  (setting: SettingItem) => [
                                    setting.id,
                                    setting,
                                  ]
                                )
                              ),
                              ...Object.fromEntries(
                                (Array.isArray(userSettings)
                                  ? userSettings
                                  : []
                                ).map((setting: SettingItem) => [
                                  setting.id,
                                  setting,
                                ])
                              ),
                            }),
                          ],
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </ScrollArea>

          <div className="absolute bottom-4 pt-8 border-t border-border">
            <p className="text-[10px] text-muted-foreground">
              All apps on the Midday App Store are open-source and
              peer-reviewed. Midday Labs AB maintains high standards but
              doesn&apos;t endorse third-party apps. Apps published by Midday
              are officially certified. Report any concerns about app content or
              behavior.
            </p>

            <a
              href="mailto:support@midday.dev"
              className="text-[10px] text-destructive"
            >
              Report app
            </a>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
