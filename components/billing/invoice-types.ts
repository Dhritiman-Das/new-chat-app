import {
  Invoice as PrismaInvoice,
  PlanType,
  BillingCycle,
} from "@/lib/generated/prisma";

// Client-side simplified invoice interface for the BillingClient
export interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  downloadUrl?: string;
}

// Type to adapt between BillingClient and InvoicesTab
export type InvoiceWithSubscription = PrismaInvoice & {
  subscription?: {
    planType: PlanType;
    billingCycle: BillingCycle;
  } | null;
};

// Helper function to convert client invoices to the format expected by InvoicesTab
export function adaptClientInvoicesToInvoicesTab(
  clientInvoices: ClientInvoice[]
): InvoiceWithSubscription[] {
  return clientInvoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.amount,
    currency: invoice.currency,
    status: invoice.status,
    createdAt: new Date(invoice.date),
    invoiceUrl: invoice.downloadUrl || null,
    // Default values for required fields
    metadata: null,
    organizationId: "",
    subscriptionId: null,
    dueDate: new Date(),
    paidAt: null,
    paymentIntent: null,
    externalId: null,
    description: null,
    updatedAt: new Date(),
  })) as InvoiceWithSubscription[];
}
