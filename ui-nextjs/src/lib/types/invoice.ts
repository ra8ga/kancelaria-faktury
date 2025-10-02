export type VATRate = 0 | 5 | 8 | 23 | "ZW" | "NP";
export interface InvoiceItem {
  name: string;
  quantity: number;
  unit: string;
  unitPriceNet: number; // PLN
  vatRate: VATRate;
}
export interface Party {
  name: string;
  nip?: string;
  address?: string;
  bankAccount?: string;
}
export interface InvoiceData {
  number: string;
  seller: Party;
  buyer: Party;
  items: InvoiceItem[];
  issueDate: string; // ISO
  saleDate?: string; // ISO
  dueDate?: string; // ISO
  mpp?: boolean;
  notes?: string;
  currency?: string; // default PLN
}