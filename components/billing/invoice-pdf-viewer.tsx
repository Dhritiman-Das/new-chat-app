"use client";

import React, { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { cn } from "@/lib/utils";

interface InvoicePDFViewerProps {
  pdfBase64: string;
  contentType?: string;
  onClose?: () => void;
  invoiceNumber?: string;
}

export function InvoicePDFViewer({
  pdfBase64,
  contentType = "application/pdf",
  onClose,
  invoiceNumber,
}: InvoicePDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [windowWidth, setWindowWidth] = useState<number>(0);

  // Initialize PDF.js worker
  useEffect(() => {
    // Only run in client-side
    if (typeof window === "undefined") return;

    // Dynamic import to avoid SSR issues
    const loadPdfWorker = async () => {
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        // Use a simpler approach that works with Next.js
        pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
      }
    };

    loadPdfWorker();
  }, []);

  // Effect to handle window resize for responsive rendering
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Initial setup
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Create a data URL from the base64 string
  const pdfDataUrl = `data:${contentType};base64,${pdfBase64}`;

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  function handlePreviousPage() {
    setPageNumber((prevPage) => Math.max(prevPage - 1, 1));
  }

  function handleNextPage() {
    setPageNumber((prevPage) =>
      numPages ? Math.min(prevPage + 1, numPages) : prevPage
    );
  }

  function handleDownload() {
    const link = document.createElement("a");
    link.href = pdfDataUrl;
    link.download = `Invoice-${invoiceNumber || "document"}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col space-y-4">
      {isLoading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      <div
        className={cn(
          "border rounded-lg overflow-hidden bg-white",
          isLoading ? "hidden" : "block"
        )}
      >
        <Document
          file={pdfDataUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center min-h-[400px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
          error={
            <div className="flex items-center justify-center min-h-[400px] text-destructive">
              <p>Failed to load PDF. Please try again later.</p>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="mx-auto"
            width={windowWidth > 768 ? 600 : Math.min(windowWidth - 40, 400)}
          />
        </Document>
      </div>

      <div className="flex justify-between items-center px-2">
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Prev
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={numPages !== null && pageNumber >= numPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          {numPages ? `Page ${pageNumber} of ${numPages}` : "Loading..."}
        </div>

        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>

          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
