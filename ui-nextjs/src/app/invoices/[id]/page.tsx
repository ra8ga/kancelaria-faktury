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
                meta: { marginBottom: 10 },
                twoCol: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
                colBox: { width: '48%', borderWidth: 1, borderColor: '#000', padding: 8, borderRadius: 2 },
                colTitle: { fontSize: 12, fontWeight: 700, marginBottom: 4 },
                table: { marginTop: 10, borderWidth: 1, borderColor: '#000' },
                tableHeader: { flexDirection: 'row', backgroundColor: '#eee', borderBottomWidth: 1, borderColor: '#000' },
                thLarge: { flex: 3, padding: 6, fontWeight: 700, borderRightWidth: 1, borderColor: '#000' },
                th: { flex: 1, padding: 6, fontWeight: 700, borderRightWidth: 1, borderColor: '#000' },
                thLast: { flex: 1, padding: 6, fontWeight: 700 },
                row: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#000' },
                tdLarge: { flex: 3, padding: 6, borderRightWidth: 1, borderColor: '#000' },
                td: { flex: 1, padding: 6, borderRightWidth: 1, borderColor: '#000' },
                tdLast: { flex: 1, padding: 6 },
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

                    <View style={styles.meta}>
                      <Text>Data wystawienia: {new Date(invoice.issueDate).toLocaleDateString('pl-PL')}</Text>
                    </View>

                    {/* Sprzedawca / Nabywca w dwóch kolumnach */}
                    <View style={styles.twoCol}>
                      <View style={styles.colBox}>
                        <Text style={styles.colTitle}>Sprzedawca</Text>
                        <Text>{invoice.seller?.name} {invoice.seller?.nip ? `(NIP: ${invoice.seller.nip})` : ''}</Text>
                        {invoice.seller?.address ? <Text>Adres: {invoice.seller.address}</Text> : null}
                        {invoice.seller?.bankAccount ? <Text>Rachunek: {invoice.seller.bankAccount}</Text> : null}
                      </View>
                      <View style={styles.colBox}>
                        <Text style={styles.colTitle}>Nabywca</Text>
                        <Text>{invoice.buyer?.name} {invoice.buyer?.nip ? `(NIP: ${invoice.buyer.nip})` : ''}</Text>
                        {invoice.buyer?.address ? <Text>Adres: {invoice.buyer.address}</Text> : null}
                      </View>
                    </View>

                    {/* Tabela pozycji z obramowaniem */}
                    <View style={styles.table}>
                      <View style={styles.tableHeader}>
                        <Text style={styles.thLarge}>Pozycja</Text>
                        <Text style={styles.th}>Ilość</Text>
                        <Text style={styles.th}>J.m.</Text>
                        <Text style={styles.th}>Cena netto</Text>
                        <Text style={styles.th}>Stawka VAT</Text>
                        <Text style={styles.th}>Netto</Text>
                        <Text style={styles.thLast}>Brutto</Text>
                      </View>

                      {items.map((it, idx) => {
                        const lineNet = round2((it.unitPriceNet || 0) * (it.quantity || 0));
                        const lineVat = typeof it.vatRate === 'number' ? round2(lineNet * (Number(it.vatRate) / 100)) : 0;
                        const lineGross = round2(lineNet + lineVat);
                        const vatLabel = typeof it.vatRate === 'number' ? `${it.vatRate}%` : String(it.vatRate);
                        return (
                          <View key={idx} style={styles.row}>
                            <Text style={styles.tdLarge}>{it.name}</Text>
                            <Text style={styles.td}>{it.quantity}</Text>
                            <Text style={styles.td}>{it.unit}</Text>
                            <Text style={styles.td}>{formatPLN(it.unitPriceNet)}</Text>
                            <Text style={styles.td}>{vatLabel}</Text>
                            <Text style={styles.td}>{formatPLN(lineNet)}</Text>
                            <Text style={styles.tdLast}>{formatPLN(lineGross)}</Text>
                          </View>
                        );
                      })}
                    </View>

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
            // ... existing code ...
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
              alert('Nie udało się wygenerować PDF');
            }
          }}
        >Pobierz PDF</button>
      </div>
    </main>
  );
}