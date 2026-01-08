import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export type PeriodFilter = 'today' | 'week' | 'month' | 'year' | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
}

export function getDateRangeForPeriod(period: PeriodFilter, customStart?: string, customEnd?: string): DateRange {
  const today = new Date();
  
  switch (period) {
    case 'today':
      return { start: today, end: today };
    case 'week':
      return { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    case 'month':
      return { start: startOfMonth(today), end: endOfMonth(today) };
    case 'year':
      return { start: startOfYear(today), end: endOfYear(today) };
    case 'custom':
      return {
        start: customStart ? new Date(customStart) : subDays(today, 30),
        end: customEnd ? new Date(customEnd) : today,
      };
    default:
      return { start: startOfMonth(today), end: endOfMonth(today) };
  }
}

export function formatDateRange(range: DateRange): string {
  return `${format(range.start, 'dd/MM/yyyy', { locale: fr })} - ${format(range.end, 'dd/MM/yyyy', { locale: fr })}`;
}

interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title: string;
  dateRange: string;
  total?: number;
  currency?: string;
}

export function exportToCSV(data: ExportData, filename: string): void {
  const csvContent = [
    // Title and date range
    [data.title],
    [`Période: ${data.dateRange}`],
    [],
    // Headers
    data.headers,
    // Data rows
    ...data.rows,
    [],
    // Total if provided
    ...(data.total !== undefined ? [[`Total: ${data.total} ${data.currency || 'CFA'}`]] : []),
  ]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, `${filename}.csv`);
}

export function exportToPDF(data: ExportData, filename: string): void {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.title, 14, 20);
  
  // Date range
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Période: ${data.dateRange}`, 14, 30);
  
  // Table
  doc.autoTable({
    head: [data.headers],
    body: data.rows,
    startY: 40,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  });
  
  // Total
  if (data.total !== undefined) {
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${data.total.toLocaleString('fr-FR')} ${data.currency || 'CFA'}`, 14, finalY + 15);
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Généré le ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr })} - Page ${i}/${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
  
  doc.save(`${filename}.pdf`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Income-specific export helpers
export function formatIncomeForExport(
  incomes: Array<{ date: string; amount: number; payment_method: string; notes?: string; vehicle_id?: string }>,
  vehicles: Array<{ id: string; model: string; plate_number: string }>,
  dateRange: DateRange
): ExportData {
  const getVehicleName = (vehicleId?: string) => {
    if (!vehicleId) return '-';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.model} (${vehicle.plate_number})` : '-';
  };

  const paymentLabels: Record<string, string> = {
    cash: 'Espèces',
    card: 'Carte',
    app: 'Application',
    other: 'Autre',
  };

  return {
    title: 'Rapport des Recettes',
    dateRange: formatDateRange(dateRange),
    headers: ['Date', 'Montant (CFA)', 'Véhicule', 'Paiement', 'Notes'],
    rows: incomes.map(income => [
      format(new Date(income.date), 'dd/MM/yyyy'),
      income.amount,
      getVehicleName(income.vehicle_id),
      paymentLabels[income.payment_method] || income.payment_method,
      income.notes || '-',
    ]),
    total: incomes.reduce((sum, i) => sum + Number(i.amount), 0),
    currency: 'CFA',
  };
}

// Expense-specific export helpers
export function formatExpenseForExport(
  expenses: Array<{ date: string; category: string; amount: number; description?: string; vehicle_id?: string }>,
  vehicles: Array<{ id: string; model: string; plate_number: string }>,
  dateRange: DateRange
): ExportData {
  const getVehicleName = (vehicleId?: string) => {
    if (!vehicleId) return '-';
    const vehicle = vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.model} (${vehicle.plate_number})` : '-';
  };

  const categoryLabels: Record<string, string> = {
    fuel: 'Carburant',
    maintenance: 'Entretien',
    insurance: 'Assurance',
    parking: 'Stationnement',
    tolls: 'Péages',
    yango: 'Recharge Yango',
    other: 'Autre',
  };

  return {
    title: 'Rapport des Dépenses',
    dateRange: formatDateRange(dateRange),
    headers: ['Date', 'Catégorie', 'Montant (CFA)', 'Description'],
    rows: expenses.map(expense => [
      format(new Date(expense.date), 'dd/MM/yyyy'),
      categoryLabels[expense.category] || expense.category,
      expense.amount,
      expense.description || '-',
    ]),
    total: expenses.reduce((sum, e) => sum + Number(e.amount), 0),
    currency: 'CFA',
  };
}
