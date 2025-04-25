"use client";

import { useState, useEffect, useCallback } from "react";
import { Icons } from "@/components/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { getLeads, exportLeads } from "@/app/actions/lead-capture";
import { Lead, LeadsResponse } from "./types";
import { getAllLeadFieldKeys } from "./utils";

interface LeadsTabProps {
  botId: string;
  openLeadDetails: (lead: Lead) => void;
  activeTab: string;
}

export function LeadsTab({ botId, openLeadDetails, activeTab }: LeadsTabProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch leads function
  const fetchLeads = useCallback(async () => {
    try {
      setLeadsLoading(true);
      const result = await getLeads({
        botId,
        page: currentPage,
        limit: 10,
      });

      if (result?.data?.success && result.data?.data) {
        const leadsData = result.data.data as LeadsResponse;
        setLeads(leadsData.leads);
        setTotalPages(leadsData.totalPages);
      } else {
        toast.error("Failed to fetch leads");
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error("Failed to fetch leads");
    } finally {
      setLeadsLoading(false);
    }
  }, [botId, currentPage]);

  // Fetch leads when the leads tab is activated
  useEffect(() => {
    if (activeTab === "leads") {
      fetchLeads();
    }
  }, [activeTab, currentPage, fetchLeads]);

  // Add a function to copy lead data to clipboard
  const copyLeadToClipboard = (lead: Lead) => {
    // Create a formatted object with lead data
    const leadData: Record<string, string | number | boolean | object> = {
      name: lead.name || "—",
      email: lead.email || "—",
      phone: lead.phone || "—",
      company: lead.company || "—",
      source: lead.source || "—",
      status: lead.status || "—",
      triggerKeyword: lead.triggerKeyword || "—",
      date: new Date(lead.createdAt).toLocaleString(),
    };

    // Add custom properties
    if (lead.properties) {
      Object.entries(lead.properties).forEach(([key, value]) => {
        leadData[key] = value === null || value === undefined ? "—" : value;
      });
    }

    // Convert to JSON string with formatting
    const leadString = JSON.stringify(
      leadData,
      (key, value) => {
        // Handle null and undefined values
        if (value === null || value === undefined) {
          return "—";
        }
        return value;
      },
      2
    );

    // Copy to clipboard
    navigator.clipboard
      .writeText(leadString)
      .then(() => {
        toast.success("Lead data copied to clipboard");
      })
      .catch((err) => {
        console.error("Could not copy text: ", err);
        toast.error("Failed to copy lead data");
      });
  };

  // Handle exporting leads
  const handleExportLeads = async (format: "csv" | "json" = "csv") => {
    try {
      setIsExporting(true);
      const result = await exportLeads({
        botId,
        format,
      });

      if (result?.data?.success && result.data?.data) {
        toast.success("Leads exported successfully");
      } else {
        toast.error("Failed to export leads");
      }
    } catch (error) {
      console.error("Error exporting leads:", error);
      toast.error("Failed to export leads");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Captured Leads</CardTitle>
        <CardDescription>
          View and manage leads collected by your bot
        </CardDescription>
      </CardHeader>
      <CardContent>
        {leadsLoading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Icons.Spinner className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-sm text-muted-foreground">Loading leads...</p>
          </div>
        ) : leads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Icons.User className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
            <h3 className="text-lg font-semibold mb-1">No leads yet</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Once your bot captures leads, they will appear here for you to
              manage.
            </p>
          </div>
        ) : (
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[180px]">Name</TableHead>
                <TableHead className="w-[200px]">Email</TableHead>
                <TableHead className="w-[150px]">Phone</TableHead>
                {/* Dynamically add columns for custom properties */}
                {leads.length > 0 &&
                  getAllLeadFieldKeys(leads)
                    .filter(
                      (key) =>
                        ![
                          "name",
                          "email",
                          "phone",
                          "id",
                          "createdAt",
                          "updatedAt",
                          "metadata",
                        ].includes(key)
                    )
                    .map((key) => (
                      <TableHead key={key} className="w-[120px]">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </TableHead>
                    ))}
                <TableHead className="w-[120px]">Date Captured</TableHead>
                <TableHead className="w-[60px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell className="font-medium truncate">
                    {lead.name || "—"}
                  </TableCell>
                  <TableCell className="truncate">
                    {lead.email || "—"}
                  </TableCell>
                  <TableCell className="truncate">
                    {lead.phone || "—"}
                  </TableCell>
                  {/* Render custom property cells */}
                  {getAllLeadFieldKeys(leads)
                    .filter(
                      (key) =>
                        ![
                          "name",
                          "email",
                          "phone",
                          "id",
                          "createdAt",
                          "updatedAt",
                          "metadata",
                        ].includes(key)
                    )
                    .map((key) => (
                      <TableCell key={key} className="truncate">
                        {key === "company"
                          ? lead.company || "—"
                          : key === "source"
                          ? lead.source || "—"
                          : key === "status"
                          ? lead.status || "—"
                          : key === "triggerKeyword"
                          ? lead.triggerKeyword || "—"
                          : lead.properties &&
                            lead.properties[key] !== undefined
                          ? typeof lead.properties[key] === "object"
                            ? lead.properties[key]
                              ? JSON.stringify(lead.properties[key])
                              : "—"
                            : String(lead.properties[key] || "—")
                          : "—"}
                      </TableCell>
                    ))}
                  <TableCell>
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Icons.MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openLeadDetails(lead)}>
                          <Icons.Info className="mr-2 h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => copyLeadToClipboard(lead)}
                        >
                          <Icons.Copy className="mr-2 h-4 w-4" />
                          Copy Data
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() =>
                            window.open(`mailto:${lead.email}`, "_blank")
                          }
                          disabled={!lead.email}
                        >
                          <Icons.Mail className="mr-2 h-4 w-4" />
                          Email Lead
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => handleExportLeads()}
          disabled={isExporting || leads.length === 0}
        >
          {isExporting ? (
            <>
              <Icons.Spinner className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            "Export to CSV"
          )}
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage <= 1 || leadsLoading}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            <Icons.ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={currentPage >= totalPages || leadsLoading}
            onClick={() =>
              setCurrentPage((prev) => Math.min(totalPages, prev + 1))
            }
          >
            <Icons.ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
