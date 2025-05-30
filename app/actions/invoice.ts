"use server";

import { DodoPayments } from "dodopayments";
import { createSafeActionClient } from "next-safe-action";
import { z } from "zod";
import type { ActionResponse } from "@/app/actions/types";
import { env } from "@/src/env";

const action = createSafeActionClient();

// Create a DodoPayments client
const getDodoClient = () => {
  const apiKey = env.DODO_PAYMENTS_API_KEY;
  if (!apiKey) {
    throw new Error("DODO_PAYMENTS_API_KEY environment variable is not set");
  }

  return new DodoPayments({
    bearerToken: apiKey,
    environment: "test_mode", // Change to production for live environment
  });
};

// Schema for fetching invoice PDF
const fetchInvoicePDFSchema = z.object({
  paymentId: z.string().min(1),
});

// Action to fetch an invoice PDF by payment ID
export const fetchInvoicePDF = action
  .schema(fetchInvoicePDFSchema)
  .action(async ({ parsedInput }): Promise<ActionResponse> => {
    try {
      const { paymentId } = parsedInput;
      const client = getDodoClient();

      // Retrieve the payment/invoice data
      const payment = await client.invoices.payments.retrieve(paymentId);

      // Get the PDF blob content
      const content = await payment.blob();

      // Convert the blob to base64 for sending to the client
      const buffer = Buffer.from(await content.arrayBuffer());
      const base64 = buffer.toString("base64");

      return {
        success: true,
        data: {
          pdfBase64: base64,
          contentType: content.type,
        },
      };
    } catch (error) {
      console.error("Error fetching invoice PDF:", error);
      return {
        success: false,
        error: {
          code: "INVOICE_PDF_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch invoice PDF",
        },
      };
    }
  });
