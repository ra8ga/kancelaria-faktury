import Link from "next/link";

export default function Home() {
  return (
    <main className="p-6 grid gap-6">
      <h1 className="text-2xl font-semibold">Kancelaria – Faktury</h1>
      <p className="text-sm text-gray-600">Prosta aplikacja do wystawiania faktur zgodnych z wymogami w Polsce.</p>

      <nav className="grid gap-2">
        <Link className="underline" href="/invoices/new">Nowa faktura</Link>
        <Link className="underline" href="/invoices">Lista faktur</Link>
        <Link className="underline" href="/settings">Ustawienia</Link>
      </nav>
    </main>
  );
}
