/**
 * Indian Rupee and Balance Formatting Utility
 */

export function formatINR(amount, includeDecimals = false) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  
  const num = Math.abs(Number(amount));
  const formatted = num.toLocaleString('en-IN', {
    maximumFractionDigits: includeDecimals ? 2 : (num % 1 === 0 ? 0 : 2),
    minimumFractionDigits: includeDecimals ? 2 : 0,
  });

  return `₹${formatted}`;
}

export function getBalanceInfo(balance) {
  const num = Number(balance) || 0;
  
  if (num > 0) {
    return {
      status: 'UDHAAR',
      label: 'Udhaar (Gave)',
      subLabel: 'Aapko Lena Hai',
      amount: num,
      formattedAmount: formatINR(num),
      colorClass: 'text-rose-600',
      bgClass: 'bg-rose-50 border-rose-200',
      badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
      isDue: true,
    };
  } else if (num < 0) {
    const absVal = Math.abs(num);
    return {
      status: 'ADVANCE',
      label: 'Advance (Got)',
      subLabel: 'Aapko Dena Hai',
      amount: absVal,
      formattedAmount: formatINR(absVal),
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50 border-emerald-200',
      badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      isAdvance: true,
    };
  } else {
    return {
      status: 'SETTLED',
      label: 'Settled',
      subLabel: 'Hisab Barabar',
      amount: 0,
      formattedAmount: '₹0',
      colorClass: 'text-slate-600',
      bgClass: 'bg-slate-50 border-slate-200',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
      isSettled: true,
    };
  }
}
