"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Invoice, PlanType, BillingCycle } from "@/lib/generated/prisma";
import { format } from "date-fns";
import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import { Download, FileText, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { InvoicePDFViewer } from "./invoice-pdf-viewer";
import { fetchInvoicePDF } from "@/app/actions/invoice";
import { toast } from "sonner";

interface InvoicesTabProps {
  invoices: (Invoice & {
    subscription?: {
      planType: PlanType;
      billingCycle: BillingCycle;
    } | null;
  })[];
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
}

export function InvoicesTab({
  invoices,
  pagination,
  onPageChange,
}: InvoicesTabProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<
    | (Invoice & {
        subscription?: {
          planType: PlanType;
          billingCycle: BillingCycle;
        } | null;
      })
    | null
  >(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleViewInvoice = (
    invoice: Invoice & {
      subscription?: {
        planType: PlanType;
        billingCycle: BillingCycle;
      } | null;
    }
  ) => {
    setSelectedInvoice(invoice);
    setIsDrawerOpen(true);
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "paid":
        return (
          <Badge className="bg-green-50 text-green-700 border-green-200">
            Paid
          </Badge>
        );
      case "failed":
        return (
          <Badge className="bg-red-50 text-red-700 border-red-200">
            Failed
          </Badge>
        );
      case "open":
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200">
            Open
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice History</CardTitle>
        <CardDescription>View and download your past invoices</CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>
                    {invoice.createdAt
                      ? format(new Date(invoice.createdAt), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewInvoice(invoice)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            No invoices available
          </div>
        )}

        {pagination && pagination.totalPages > 1 && onPageChange && (
          <div className="flex items-center justify-end space-x-2 py-4 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>

      <InvoiceDetailsDrawer
        invoice={selectedInvoice}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </Card>
  );
}

interface InvoiceDetailsDrawerProps {
  invoice:
    | (Invoice & {
        subscription?: {
          planType: PlanType;
          billingCycle: BillingCycle;
        } | null;
      })
    | null;
  isOpen: boolean;
  onClose: () => void;
}

function InvoiceDetailsDrawer({
  invoice,
  isOpen,
  onClose,
}: InvoiceDetailsDrawerProps) {
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [pdfData, setPdfData] = useState<{
    pdfBase64: string;
    contentType: string;
  } | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  if (!invoice) return null;

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getMetadataValue = (key: string) => {
    try {
      if (!invoice.metadata) return null;
      const metadata =
        typeof invoice.metadata === "string"
          ? JSON.parse(invoice.metadata as string)
          : invoice.metadata;
      return metadata[key];
    } catch {
      return null;
    }
  };

  const handleDownloadInvoice = () => {
    if (invoice.invoiceUrl) {
      window.open(invoice.invoiceUrl, "_blank");
    }
  };

  const handleViewPdf = async () => {
    // If we already have the PDF data, just open the modal
    if (pdfData) {
      setIsPdfModalOpen(true);
      return;
    }

    // Get the payment ID from paymentIntent or externalId
    const paymentId = invoice.paymentIntent || invoice.externalId;

    if (!paymentId) {
      toast.error("Cannot view invoice: Missing payment reference");
      return;
    }

    setIsPdfLoading(true);

    try {
      const result = await fetchInvoicePDF({ paymentId });

      // Check if the result has the expected structure
      if (result?.data?.success) {
        const responseData = result.data.data;
        console.log({ responseData });
        // Check if responseData has the expected structure
        if (
          responseData &&
          typeof responseData === "object" &&
          "pdfBase64" in responseData &&
          "contentType" in responseData
        ) {
          setPdfData({
            pdfBase64: responseData.pdfBase64 as string,
            contentType: responseData.contentType as string,
          });
          setIsPdfModalOpen(true);
        } else {
          toast.error("Invalid PDF data format");
        }
      } else {
        // Extract error message if available
        let errorMessage = "Failed to load invoice PDF";
        if (result?.data?.error) {
          errorMessage = result.data.error.message;
        }
        toast.error(errorMessage);
      }
    } catch (error) {
      toast.error("An error occurred while loading the invoice PDF");
      console.error(error);
    } finally {
      setIsPdfLoading(false);
    }
  };

  return (
    <>
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent className="max-w-xl mx-auto">
          <div className="mx-auto w-full max-w-lg">
            <DrawerHeader>
              <DrawerTitle>Invoice {invoice.invoiceNumber}</DrawerTitle>
              <DrawerDescription>
                {invoice.description || "Invoice details"}
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Date
                  </h4>
                  <p className="text-sm">
                    {invoice.createdAt
                      ? format(new Date(invoice.createdAt), "MMMM d, yyyy")
                      : "-"}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Status
                  </h4>
                  <p className="text-sm capitalize">{invoice.status}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground">
                    Amount
                  </h4>
                  <p className="text-sm font-medium">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </p>
                </div>
                {invoice.subscription && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">
                      Plan
                    </h4>
                    <p className="text-sm">
                      {invoice.subscription.planType.charAt(0) +
                        invoice.subscription.planType
                          .slice(1)
                          .toLowerCase()}{" "}
                      (
                      {invoice.subscription.billingCycle === "MONTHLY"
                        ? "Monthly"
                        : "Yearly"}
                      )
                    </p>
                  </div>
                )}
              </div>

              <Separator className="my-4" />

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Invoice Details</h4>

                <div className="text-sm grid grid-cols-2 gap-2">
                  {invoice.paidAt && (
                    <>
                      <div className="text-muted-foreground">Payment Date</div>
                      <div>
                        {format(new Date(invoice.paidAt), "MMMM d, yyyy")}
                      </div>
                    </>
                  )}
                  {invoice.paymentIntent && (
                    <>
                      <div className="text-muted-foreground">Payment ID</div>
                      <div className="truncate">{invoice.paymentIntent}</div>
                    </>
                  )}
                  {getMetadataValue("planType") && (
                    <>
                      <div className="text-muted-foreground">Plan Type</div>
                      <div>
                        {getMetadataValue("planType").charAt(0) +
                          getMetadataValue("planType").slice(1).toLowerCase()}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <DrawerFooter className="pt-2 space-y-2">
              <Button
                onClick={handleViewPdf}
                className="w-full"
                disabled={isPdfLoading}
              >
                {isPdfLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading PDF...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    View Invoice
                  </>
                )}
              </Button>

              {invoice.invoiceUrl && (
                <Button
                  onClick={handleDownloadInvoice}
                  variant="outline"
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download Original
                </Button>
              )}

              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <Dialog open={isPdfModalOpen} onOpenChange={setIsPdfModalOpen}>
        <DialogContent className="max-w-4xl w-full">
          {pdfData ? (
            <InvoicePDFViewer
              pdfBase64={pdfData.pdfBase64}
              contentType={pdfData.contentType}
              invoiceNumber={invoice.invoiceNumber || undefined}
              onClose={() => setIsPdfModalOpen(false)}
            />
          ) : (
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
