import type { InvoiceData } from "@/lib/types/invoice";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(
  /\/+$/,
  ""
);
function buildUrl(path: string) {
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function createInvoice(
  invoice: InvoiceData
): Promise<InvoiceData> {
  const resp = await fetch(buildUrl("/api/invoices"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(invoice),
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`API error (${resp.status}): ${text || resp.statusText}`);
  }
  return await resp.json();
}

export async function getInvoiceById(id: string): Promise<InvoiceData> {
  const enc = encodeURIComponent(id);
  const resp = await fetch(buildUrl(`/api/invoices/${enc}`), {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`API error (${resp.status}): ${text || resp.statusText}`);
  }
  return await resp.json();
}