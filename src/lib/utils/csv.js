import { format } from 'date-fns';

/**
 * Escape and format field for CSV
 */
function escapeCSV(field) {
  if (field === null || field === undefined) return '""';
  const stringField = String(field);
  return `"${stringField.replace(/"/g, '""')}"`;
}

/**
 * Trigger download of CSV in browser
 */
export function downloadCSV(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate Customer Statement CSV
 */
export function generateCustomerStatementCSV({
  shop,
  customer,
  transactions,
  startDate = null,
  endDate = null,
}) {
  let csv = [];
  
  // Header Info
  csv.push([escapeCSV(`SHOP: ${shop.shop_name}`), escapeCSV(`OWNER: ${shop.owner_name}`), escapeCSV(`PHONE: ${shop.phone || 'N/A'}`)].join(','));
  csv.push([escapeCSV(`CUSTOMER: ${customer.name}`), escapeCSV(`CUSTOMER PHONE: ${customer.phone || 'N/A'}`), escapeCSV(`STATEMENT DATE: ${format(new Date(), 'dd-MMM-yyyy')}`)].join(','));
  csv.push('');
  
  // Table Headers
  csv.push(['Date & Time', 'Transaction Type', 'Note', 'GAVE (Diya / Udhaar)', 'GOT (Liya / Jama)', 'Running Balance'].map(escapeCSV).join(','));

  let totalGave = 0;
  let totalGot = 0;

  transactions.forEach((tx) => {
    const txDate = format(new Date(tx.created_at), 'dd-MMM-yyyy hh:mm a');
    const isGave = tx.type === 'GAVE';
    const gaveAmount = isGave ? Number(tx.amount).toFixed(2) : '0.00';
    const gotAmount = !isGave ? Number(tx.amount).toFixed(2) : '0.00';
    
    if (isGave) totalGave += Number(tx.amount);
    else totalGot += Number(tx.amount);

    csv.push([
      escapeCSV(txDate),
      escapeCSV(isGave ? 'GAVE (Udhaar)' : 'GOT (Jama)'),
      escapeCSV(tx.note || ''),
      escapeCSV(gaveAmount),
      escapeCSV(gotAmount),
      escapeCSV(tx.running_balance !== undefined ? Number(tx.running_balance).toFixed(2) : ''),
    ].join(','));
  });

  csv.push('');
  csv.push(['TOTALS', '', '', escapeCSV(totalGave.toFixed(2)), escapeCSV(totalGot.toFixed(2)), ''].join(','));
  csv.push(['CURRENT NET BALANCE', '', '', '', '', escapeCSV(Number(customer.balance).toFixed(2))].join(','));

  return csv.join('\n');
}

/**
 * Generate Customers Summary CSV
 */
export function generateCustomersSummaryCSV(shop, customers) {
  let csv = [];
  csv.push([escapeCSV(`SHOP: ${shop.shop_name}`), escapeCSV(`GENERATED: ${format(new Date(), 'dd-MMM-yyyy')}`)].join(','));
  csv.push('');
  csv.push(['Customer Name', 'Phone', 'Balance (₹)', 'Status', 'Notes', 'Created Date'].map(escapeCSV).join(','));

  customers.forEach((c) => {
    const num = Number(c.balance);
    const status = num > 0 ? 'Udhaar (Gave)' : (num < 0 ? 'Advance (Got)' : 'Settled');
    csv.push([
      escapeCSV(c.name),
      escapeCSV(c.phone || ''),
      escapeCSV(num.toFixed(2)),
      escapeCSV(status),
      escapeCSV(c.notes || ''),
      escapeCSV(format(new Date(c.created_at), 'dd-MMM-yyyy')),
    ].join(','));
  });

  return csv.join('\n');
}
