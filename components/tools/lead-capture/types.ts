// Interface for Lead data
export interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: string | null;
  triggerKeyword: string | null;
  properties: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  conversationId?: string;
}

// Interface for serialized tool object
export interface SerializableTool {
  id: string;
  name: string;
  description: string;
  type: string;
  integrationType?: string;
  version: string;
  defaultConfig?: Record<string, unknown>;
  functionsMeta: Record<string, { description: string }>;
  beta?: boolean;
}

export interface LeadsResponse {
  leads: Lead[];
  totalCount: number;
  page: number;
  totalPages: number;
  limit: number;
}

export interface ExportResponse {
  downloadUrl: string;
  message: string;
}

export const FIELD_OPTIONS = [
  { id: "name", label: "Name" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "company", label: "Company" },
] as const;
