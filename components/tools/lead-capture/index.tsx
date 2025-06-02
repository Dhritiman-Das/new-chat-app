"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Lead } from "./types";
import { SerializableTool } from "./types";
import { SettingsTab } from "./settings-tab";
import { FunctionsTab } from "./functions-tab";
import { LeadsTab } from "./leads-tab";
import { LeadDetailsDialog } from "./lead-details-dialog";

interface LeadCaptureToolProps {
  tool: SerializableTool;
  botId: string;
  orgId: string;
}

export default function LeadCaptureTool({
  tool,
  botId,
  orgId,
}: LeadCaptureToolProps) {
  const [activeTab, setActiveTab] = useState("settings");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isLeadDetailsOpen, setIsLeadDetailsOpen] = useState(false);

  // Function to open lead details dialog
  const openLeadDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setIsLeadDetailsOpen(true);
  };

  return (
    <div>
      <Tabs
        defaultValue="settings"
        onValueChange={setActiveTab}
        value={activeTab}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="settings" className="w-[150px]">
            Settings
          </TabsTrigger>
          <TabsTrigger value="functions" className="w-[150px]">
            Functions
          </TabsTrigger>
          <TabsTrigger value="leads" className="w-[150px]">
            Captured Leads
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <SettingsTab tool={tool} botId={botId} />
        </TabsContent>

        <TabsContent value="functions">
          <FunctionsTab tool={tool} />
        </TabsContent>

        <TabsContent value="leads">
          <LeadsTab
            botId={botId}
            openLeadDetails={openLeadDetails}
            activeTab={activeTab}
          />
        </TabsContent>
      </Tabs>

      {/* Lead Details Dialog */}
      <LeadDetailsDialog
        isOpen={isLeadDetailsOpen}
        setIsOpen={setIsLeadDetailsOpen}
        lead={selectedLead}
        orgId={orgId}
        botId={botId}
      />
    </div>
  );
}
