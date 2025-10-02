"use client";
import type { InvoiceData } from '@/lib/types/invoice';
import React from 'react';
import { formatPLN } from '@/lib/format/currency';
import { round2 } from '@/lib/format/round';

interface Props { params: { id: string } }
export default function InvoiceDetailPage({ params }: Props) {
  const id = params.id;
  let invoice: InvoiceData | null = null;
  try {
    const raw = localStorage.getItem(`invoice:${id}`);
    if (raw) invoice = JSON.parse(raw) as InvoiceData;
  } catch {}

  if (!invoice) {
    return (
      <main className="p-6 grid gap-4">
        <h1 className="text-2xl font-semibold">Faktura #{id}</h1>
        <div className="p-3 border rounded bg-red-50 text-red-700">
          Nie znaleziono szkicu faktury w przeglądarce. Wróć do formularza i zapisz szkic ponownie.
        </div>
      </main>
    );
  }

  const showMPPNote = !!invoice.mpp;

  return (
    <main className="p-6 grid gap-4">
      <h1 className="text-2xl font-semibold">Faktura #{invoice.number}</h1>
      <section className="text-sm text-gray-700">
        <div><span className="font-semibold">Sprzedawca:</span> {invoice.seller?.name} {invoice.seller?.nip ? `(NIP: ${invoice.seller.nip})` : ''}</div>
        {invoice.seller?.address && (
          <div><span className="font-semibold">Adres:</span> {invoice.seller.address}</div>
        )}
        {invoice.seller?.bankAccount && (
          <div><span className="font-semibold">Rachunek:</span> {invoice.seller.bankAccount}</div>
        )}
        <div className="mt-2"><span className="font-semibold">Nabywca:</span> {invoice.buyer?.name} {invoice.buyer?.nip ? `(NIP: ${invoice.buyer.nip})` : ''}</div>
        {invoice.buyer?.address && (
          <div><span className="font-semibold">Adres:</span> {invoice.buyer.address}</div>
        )}
      </section>
      {showMPPNote && (
        <div className="p-3 border rounded bg-yellow-50 text-yellow-800">
          Mechanizm Podzielonej Płatności (MPP) — płatność podzielona na kwotę netto i VAT.
        </div>
      )}
      <div className="flex gap-2">
        <button type="button" className="px-3 py-2 border rounded" onClick={() => window.print()}>Drukuj</button>
        <button
          type="button"
          className="px-3 py-2 border rounded"
          onClick={async () => {
            try {
              const { pdf, Document, Page, Text, View, StyleSheet } = await import('@react-pdf/renderer');
              const styles = StyleSheet.create({
                page: { padding: 24, fontSize: 12 },
                h1: { fontSize: 16, marginBottom: 12 },
                section: { marginBottom: 10 },
                row: { flexDirection: 'row', justifyContent: 'space-between' },
                tableHeader: { flexDirection: 'row', borderBottomWidth: 1, paddingBottom: 4, marginTop: 8 },
                cell: { width: '16%' },
                cellWide: { width: '36%' },
                totals: { marginTop: 12 },
                note: { marginTop: 10 }
              });

              const items = invoice.items || [];
              const totalNet = round2(items.reduce((acc, it) => acc + (it.unitPriceNet || 0) * (it.quantity || 0), 0));
              const totalVat = round2(items.reduce((acc, it) => {
                return acc + (typeof it.vatRate === 'number' ? (it.unitPriceNet || 0) * (it.quantity || 0) * (Number(it.vatRate) / 100) : 0);
              }, 0));
              const totalGross = round2(totalNet + totalVat);

              const doc = (
                <Document>
                  <Page size="A4" style={styles.page}>
                    <Text style={styles.h1}>Faktura {invoice.number}</Text>

                    <View style={styles.section}>
                      <Text>Data wystawienia: {new Date(invoice.issueDate).toLocaleDateString('pl-PL')}</Text>
                    </View>

                    <View style={styles.section}>
                      <Text>Sprzedawca: {invoice.seller?.name} {invoice.seller?.nip ? `(NIP: ${invoice.seller.nip})` : ''}</Text>
                      {invoice.seller?.address ? <Text>Adres: {invoice.seller.address}</Text> : null}
                      {invoice.seller?.bankAccount ? <Text>Rachunek: {invoice.seller.bankAccount}</Text> : null}
                    </View>

                    <View style={styles.section}>
                      <Text>Nabywca: {invoice.buyer?.name} {invoice.buyer?.nip ? `(NIP: ${invoice.buyer.nip})` : ''}</Text>
                      {invoice.buyer?.address ? <Text>Adres: {invoice.buyer.address}</Text> : null}
                    </View>

                    <View style={styles.tableHeader}>
                      <Text style={styles.cellWide}>Pozycja</Text>
                      <Text style={styles.cell}>Ilość</Text>
                      <Text style={styles.cell}>J.m.</Text>
                      <Text style={styles.cell}>Cena netto</Text>
                      <Text style={styles.cell}>Stawka VAT</Text>
                      <Text style={styles.cell}>Netto</Text>
                      <Text style={styles.cell}>VAT</Text>
                      <Text style={styles.cell}>Brutto</Text>
                    </View>

                    {items.map((it, idx) => {
                      const lineNet = round2((it.unitPriceNet || 0) * (it.quantity || 0));
                      const lineVat = typeof it.vatRate === 'number' ? round2(lineNet * (Number(it.vatRate) / 100)) : 0;
                      const lineGross = round2(lineNet + lineVat);
                      const vatLabel = typeof it.vatRate === 'number' ? `${it.vatRate}%` : String(it.vatRate);
                      return (
                        <View key={idx} style={styles.row}>
                          <Text style={styles.cellWide}>{it.name}</Text>
                          <Text style={styles.cell}>{it.quantity}</Text>
                          <Text style={styles.cell}>{it.unit}</Text>
                          <Text style={styles.cell}>{formatPLN(it.unitPriceNet)}</Text>
                          <Text style={styles.cell}>{vatLabel}</Text>
                          <Text style={styles.cell}>{formatPLN(lineNet)}</Text>
                          <Text style={styles.cell}>{formatPLN(lineVat)}</Text>
                          <Text style={styles.cell}>{formatPLN(lineGross)}</Text>
                        </View>
                      );
                    })}

                    <View style={styles.totals}>
                      <Text>Suma netto: {formatPLN(totalNet)}</Text>
                      <Text>VAT: {formatPLN(totalVat)}</Text>
                      <Text>Suma brutto: {formatPLN(totalGross)}</Text>
                    </View>

                    {invoice.mpp ? (
                      <View style={styles.note}>
                        <Text>Mechanizm Podzielonej Płatności (MPP) — płatność podzielona na kwotę netto i VAT.</Text>
                      </View>
                    ) : null}
                  </Page>
                </Document>
              );

              const blob = await pdf(doc).toBlob();
              const filename = `Faktura-${invoice.number}.pdf`;
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = filename;
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            } catch (e) {
              alert('Nie udało się wygenerować PDF');
            }
          }}
        >Pobierz PDF</button>
      </div>
    </main>
  );
}