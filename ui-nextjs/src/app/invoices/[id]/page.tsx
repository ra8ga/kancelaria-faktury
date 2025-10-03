"use client";
import Link from 'next/link';
import type { InvoiceData } from '@/lib/types/invoice';
import React, { useEffect, useState } from 'react';
import { formatPLN } from '@/lib/format/currency';
import { round2 } from '@/lib/format/round';
import { getInvoiceById } from '@/lib/api/invoices';

interface Props { params: { id: string } }
export default function InvoiceDetailPage({ params }: Props) {
  const { id } = params;
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const decodedId = (() => { try { return decodeURIComponent(id); } catch { return id; } })();
    (async () => {
      try {
        const inv = await getInvoiceById(decodedId);
        setInvoice(inv);
      } catch (e) {
        console.error('Nie udało się pobrać faktury z API', e);
        setInvoice(null);
      } finally {
        setLoaded(true);
      }
    })();
  }, [id]);

  if (!loaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Faktura #{id}</h1>
                <p className="text-gray-600 mt-1">Ładowanie danych...</p>
              </div>
              <Link href="/invoices" className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                ← Powrót
              </Link>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Ładowanie danych faktury...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Faktura #{id}</h1>
                <p className="text-gray-600 mt-1">Nie znaleziono faktury</p>
              </div>
              <Link href="/invoices" className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                ← Powrót
              </Link>
            </div>
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-xl p-8">
            <div className="flex items-center">
              <span className="text-red-600 text-2xl mr-3">⚠️</span>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Nie znaleziono faktury</h3>
                <p className="text-red-700 mt-1">Nie znaleziono faktury w systemie. Wróć do formularza i spróbuj zapisać ponownie.</p>
              </div>
            </div>
            <div className="mt-6">
              <Link href="/invoices/new" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Stwórz nową fakturę
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showMPPNote = !!invoice.mpp;
  const items = invoice.items || [];
  const totalNet = round2(items.reduce((acc, it) => acc + (it.unitPriceNet || 0) * (it.quantity || 0), 0));
  const totalVat = round2(items.reduce((acc, it) => {
    return acc + (typeof it.vatRate === 'number' ? (it.unitPriceNet || 0) * (it.quantity || 0) * (Number(it.vatRate) / 100) : 0);
  }, 0));
  const totalGross = round2(totalNet + totalVat);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Faktura #{invoice.number}</h1>
              <p className="text-gray-600 mt-1">Data: {new Date(invoice.issueDate).toLocaleDateString('pl-PL')}</p>
            </div>
            <Link href="/invoices" className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              ← Powrót
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mr-2 text-xs font-bold">S</span>
                Sprzedawca
              </h3>
              <div className="space-y-2 text-sm">
                <div className="font-medium text-gray-900">{invoice.seller?.name}</div>
                {invoice.seller?.nip && <div className="text-gray-600">NIP: {invoice.seller.nip}</div>}
                {invoice.seller?.address && <div className="text-gray-600">Adres: {invoice.seller.address}</div>}
                {invoice.seller?.bankAccount && <div className="text-gray-600">Rachunek: {invoice.seller.bankAccount}</div>}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-6 h-6 bg-green-100 text-green-600 rounded-full flex items-center justify-center mr-2 text-xs font-bold">N</span>
                Nabywca
              </h3>
              <div className="space-y-2 text-sm">
                <div className="font-medium text-gray-900">{invoice.buyer?.name}</div>
                {invoice.buyer?.nip && <div className="text-gray-600">NIP: {invoice.buyer.nip}</div>}
                {invoice.buyer?.address && <div className="text-gray-600">Adres: {invoice.buyer.address}</div>}
              </div>
            </div>
          </div>

          {showMPPNote && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8">
              <div className="flex items-center">
                <span className="text-amber-600 mr-3">⚠️</span>
                <div className="text-amber-800 text-sm">
                  <div className="font-semibold">Mechanizm Podzielonej Płatności (MPP)</div>
                  <div className="mt-1">Płatność podzielona na kwotę netto i VAT zgodnie z przepisami.</div>
                </div>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pozycje faktury</h3>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pozycja</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ilość</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">J.m.</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cena netto</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">VAT</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Netto</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Brutto</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((it, idx) => {
                    const lineNet = round2((it.unitPriceNet || 0) * (it.quantity || 0));
                    const lineVat = typeof it.vatRate === 'number' ? round2(lineNet * (Number(it.vatRate) / 100)) : 0;
                    const lineGross = round2(lineNet + lineVat);
                    const vatLabel = typeof it.vatRate === 'number' ? `${it.vatRate}%` : String(it.vatRate);

                    return (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-sm text-gray-900">{it.name}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 text-center">{it.quantity}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 text-center">{it.unit}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 text-right">{formatPLN(it.unitPriceNet)}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 text-center">{vatLabel}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 text-right font-medium">{formatPLN(lineNet)}</td>
                        <td className="px-4 py-4 text-sm text-gray-900 text-right font-semibold">{formatPLN(lineGross)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">Suma netto</div>
                <div className="text-xl font-bold text-gray-900">{formatPLN(totalNet)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-sm text-gray-600 mb-1">VAT</div>
                <div className="text-xl font-bold text-gray-900">{formatPLN(totalVat)}</div>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-center text-white">
                <div className="text-sm text-blue-100 mb-1">Suma brutto</div>
                <div className="text-xl font-bold">{formatPLN(totalGross)}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <button
              type="button"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center"
              onClick={() => window.print()}
            >
              🖨️ Drukuj
            </button>
            <button
              type="button"
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center"
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

                  const doc = (
                    <Document>
                      <Page size="A4" style={styles.page}>
                        <Text style={styles.h1}>Faktura {invoice.number}</Text>
                        <View style={styles.meta}>
                          <Text>Data wystawienia: {new Date(invoice.issueDate).toLocaleDateString('pl-PL')}</Text>
                        </View>
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
                } catch (error) {
                  alert('Nie udało się wygenerować PDF');
                }
              }}
            >
              📄 Pobierz PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}