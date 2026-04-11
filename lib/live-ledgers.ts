type NumericFallbacks = {
  totalSaltKg?: unknown;
  saltAmount?: unknown;
  totalPaidAmount?: unknown;
  totalPaid?: unknown;
  totalDueAmount?: unknown;
  totalDue?: unknown;
  totalPurchaseAmount?: unknown;
};

type SaleLike = {
  total?: unknown;
  paid?: unknown;
  saltAmount?: unknown;
  items?: Array<{ quantity?: unknown }>;
};

type PaymentLike = {
  amount?: unknown;
};

type SupplierRecordLike = {
  type?: unknown;
  amount?: unknown;
  saltAmount?: unknown;
  totalAmount?: unknown;
};

export const toNumber = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sumSaleQuantity = (sale: SaleLike) => {
  if (Array.isArray(sale.items) && sale.items.length > 0) {
    return sale.items.reduce((total, item) => total + toNumber(item?.quantity), 0);
  }

  return toNumber(sale.saltAmount);
};

export function summarizeCustomerLedger(
  sales: SaleLike[],
  payments: PaymentLike[],
  fallback: NumericFallbacks = {}
) {
  const totalSalesAmount = sales.reduce((sum, sale) => sum + toNumber(sale.total), 0);
  const paidWithSalesAmount = sales.reduce((sum, sale) => sum + toNumber(sale.paid), 0);
  const paidWithPaymentsAmount = payments.reduce((sum, payment) => sum + toNumber(payment.amount), 0);
  const totalReceivedAmount = paidWithSalesAmount + paidWithPaymentsAmount;

  const calculatedSaltKg = sales.reduce((sum, sale) => sum + sumSaleQuantity(sale), 0);
  const fallbackSaltKg = toNumber(fallback.totalSaltKg ?? fallback.saltAmount);
  const totalSaltKg = calculatedSaltKg > 0 || fallbackSaltKg === 0 ? calculatedSaltKg : fallbackSaltKg;

  const calculatedDueAmount = Math.max(0, totalSalesAmount - totalReceivedAmount);
  const fallbackDueAmount = toNumber(fallback.totalDueAmount ?? fallback.totalDue);
  const totalDueAmount =
    totalSalesAmount > 0 || totalReceivedAmount > 0 ? calculatedDueAmount : fallbackDueAmount;

  const fallbackPaidAmount = toNumber(fallback.totalPaidAmount ?? fallback.totalPaid);
  const totalPaidAmount =
    totalReceivedAmount > 0 || fallbackPaidAmount === 0 ? totalReceivedAmount : fallbackPaidAmount;

  return {
    totalSaltKg,
    totalSalesAmount,
    paidWithSalesAmount,
    paidWithPaymentsAmount,
    totalReceivedAmount,
    totalPaidAmount,
    totalDueAmount,
  };
}

export function summarizeSupplierLedger(
  records: SupplierRecordLike[],
  fallback: NumericFallbacks = {}
) {
  let calculatedSaltKg = 0;
  let calculatedPaidAmount = 0;
  let calculatedPurchaseAmount = 0;
  let hasKnownPurchaseAmount = false;
  let hasLegacyPurchaseRecord = false;

  for (const record of records) {
    calculatedPaidAmount += toNumber(record.amount);

    if (record.type === "supplier-buy") {
      calculatedSaltKg += toNumber(record.saltAmount);

      const purchaseAmount = toNumber(record.totalAmount);
      if (purchaseAmount > 0) {
        calculatedPurchaseAmount += purchaseAmount;
        hasKnownPurchaseAmount = true;
      } else {
        hasLegacyPurchaseRecord = true;
      }
    }
  }

  const fallbackSaltKg = toNumber(fallback.totalSaltKg ?? fallback.saltAmount);
  const totalSaltKg = calculatedSaltKg > 0 || fallbackSaltKg === 0 ? calculatedSaltKg : fallbackSaltKg;

  const fallbackPaidAmount = toNumber(fallback.totalPaidAmount ?? fallback.totalPaid);
  const totalPaidAmount =
    calculatedPaidAmount > 0 || fallbackPaidAmount === 0 ? calculatedPaidAmount : fallbackPaidAmount;

  const fallbackDueAmount = toNumber(fallback.totalDueAmount ?? fallback.totalDue);
  const fallbackPurchaseAmount =
    toNumber(fallback.totalPurchaseAmount) || fallbackPaidAmount + fallbackDueAmount;

  const canUseCalculatedPurchase = hasKnownPurchaseAmount && !hasLegacyPurchaseRecord;
  const totalPurchaseAmount = canUseCalculatedPurchase
    ? calculatedPurchaseAmount
    : Math.max(calculatedPurchaseAmount, fallbackPurchaseAmount);

  const totalDueAmount = canUseCalculatedPurchase
    ? Math.max(0, totalPurchaseAmount - totalPaidAmount)
    : fallbackDueAmount;

  return {
    totalSaltKg,
    totalPaidAmount,
    totalPurchaseAmount,
    totalDueAmount,
  };
}
