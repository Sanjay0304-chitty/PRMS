/** Six calendar months of collected payments, grouped in Malaysia time. */
export function monthlyPaidRevenue(payments: { amount: number; paid_at: Date | null }[], now = new Date()) {
  const dateParts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit' });
  const keyOf = (date: Date) => {
    const parts = dateParts.formatToParts(date);
    return `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
  };
  const [year, month] = keyOf(now).split('-').map(Number);
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 6 + i, 1));
    return { month: date.toISOString().slice(0, 7), amount: 0 };
  });
  for (const payment of payments) {
    if (!payment.paid_at) continue;
    const index = months.findIndex(m => m.month === keyOf(payment.paid_at!));
    if (index >= 0 && payment.paid_at <= now) months[index].amount += payment.amount;
  }
  return months.map(m => ({ ...m, amount: Math.round(m.amount * 100) / 100 }));
}
