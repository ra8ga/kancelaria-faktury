import InvoiceForm from "@/components/InvoiceForm";

export default function NewInvoicePage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold">Nowa faktura</h1>
      <InvoiceForm />
    </main>
  );
}