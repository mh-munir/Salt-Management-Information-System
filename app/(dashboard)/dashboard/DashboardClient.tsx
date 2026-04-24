"use client";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import { getBalanceSummary } from "@/lib/balance";
import type { DashboardPageData } from "@/lib/dashboard-data";
import { formatDisplayName } from "@/lib/display-format";
import { useLanguage } from "@/lib/useLanguage";
import { translate } from "@/lib/language";

const KG_PER_MAUND = 40;

type PartyContact = {
  _id?: string;
  name?: string;
  phone?: string;
};

const getRatioPercent = (value: number, total: number) => {
  if (value <= 0 || total <= 0) return 0;

  const percent = (value / total) * 100;
  if (!Number.isFinite(percent)) return 0;

  return Math.max(0, Math.min(100, percent));
};

type DashboardClientProps = {
  initialData: DashboardPageData;
};

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const { language } = useLanguage();
  const numberLocale = language === "bn" ? "bn-BD" : "en-BD";
  const formatFullCurrency = useCallback(
    (amount: number) =>
      new Intl.NumberFormat(numberLocale, {
        maximumFractionDigits: 0,
      }).format(amount),
    [numberLocale]
  );

  const formatWeight = (amount: number) =>
    new Intl.NumberFormat(numberLocale, {
      maximumFractionDigits: 2,
    }).format(amount);

  const formatPercent = (amount: number) =>
    new Intl.NumberFormat(numberLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const [totalSales, setTotalSales] = useState<number>(initialData.totalSales);
  const [todaySales, setTodaySales] = useState<number>(initialData.todaySales);
  const [todaySalesSaltKg, setTodaySalesSaltKg] = useState<number>(initialData.todaySalesSaltKg);
  const [todayBuy, setTodayBuy] = useState<number>(initialData.todayBuy);
  const [todayBuySaltMaund, setTodayBuySaltMaund] = useState<number>(initialData.todayBuySaltMaund);
  const [todayCost, setTodayCost] = useState<number>(initialData.todayCost);
  const [totalCost, setTotalCost] = useState<number>(initialData.totalCost);
  const [totalBuy, setTotalBuy] = useState<number>(initialData.totalBuy);
  const [totalSaltBuy, setTotalSaltBuy] = useState<number>(initialData.totalSaltBuy);
  const [customerDue, setCustomerDue] = useState<number>(initialData.customerDue);
  const [supplierDue, setSupplierDue] = useState<number>(initialData.supplierDue);
  const [stockData, setStockData] = useState<{
    stockMounds: number;
    stockKg: number;
    totalBought: number;
  }>(initialData.stockData);
  const [customers, setCustomers] = useState<PartyContact[]>(initialData.customers);
  const [suppliers, setSuppliers] = useState<PartyContact[]>(initialData.suppliers);

  const dailyTransactionSection = useMemo(
    () => ({
      amount: todaySales + todayBuy,
      customerAmount: todaySales,
      supplierAmount: todayBuy,
    }),
    [todaySales, todayBuy]
  );

  const supplierDueEquivalentMaund = useMemo(() => {
    const dueAmount = getBalanceSummary(supplierDue).dueAmount;
    if (dueAmount <= 0 || totalBuy <= 0 || totalSaltBuy <= 0) return 0;

    const averagePurchasePricePerMaund = totalBuy / totalSaltBuy;
    if (!Number.isFinite(averagePurchasePricePerMaund) || averagePurchasePricePerMaund <= 0) return 0;

    return dueAmount / averagePurchasePricePerMaund;
  }, [supplierDue, totalBuy, totalSaltBuy]);

  const stockOfPurchasePercent = useMemo(() => {
    if (stockData.totalBought <= 0) return 0;

    const percent = (stockData.stockMounds / stockData.totalBought) * 100;
    if (!Number.isFinite(percent)) return 0;

    return Math.max(0, Math.min(100, percent));
  }, [stockData.stockMounds, stockData.totalBought]);

  const averagePurchasePricePerMaund = useMemo(() => {
    if (totalBuy <= 0 || totalSaltBuy <= 0) return 0;

    const average = totalBuy / totalSaltBuy;
    return Number.isFinite(average) ? average : 0;
  }, [totalBuy, totalSaltBuy]);

  const totalPurchaseCost = useMemo(() => Math.max(0, totalBuy + totalCost), [totalBuy, totalCost]);
  const totalCostSharePercent = useMemo(
    () => getRatioPercent(totalCost, totalPurchaseCost),
    [totalCost, totalPurchaseCost]
  );

  const totalSoldMaund = useMemo(
    () => Math.max(0, stockData.totalBought - stockData.stockMounds),
    [stockData.stockMounds, stockData.totalBought]
  );

  const soldSaltPurchaseCost = useMemo(() => {
    if (averagePurchasePricePerMaund <= 0 || totalSoldMaund <= 0) return 0;

    return totalSoldMaund * averagePurchasePricePerMaund;
  }, [averagePurchasePricePerMaund, totalSoldMaund]);

  const totalSalesCostBasis = useMemo(
    () => Math.max(0, soldSaltPurchaseCost + totalCost),
    [soldSaltPurchaseCost, totalCost]
  );

  const totalProfitAmount = useMemo(
    () => totalSales - totalSalesCostBasis,
    [totalSales, totalSalesCostBasis]
  );

  const totalProfitPercent = useMemo(() => {
    if (totalSalesCostBasis <= 0) return totalSales > 0 ? 100 : 0;

    return (totalProfitAmount / totalSalesCostBasis) * 100;
  }, [totalProfitAmount, totalSales, totalSalesCostBasis]);

  const profitChartSegments = useMemo(
    () =>
      [
        {
          label: language === "bn" ? "ক্রয় মূল্য" : "Purchase Cost",
          value: soldSaltPurchaseCost,
          color: "#7c3aed",
          valueLabel: `Tk ${formatFullCurrency(soldSaltPurchaseCost)}`,
        },
        {
          label: language === "bn" ? "খরচ" : "Cost",
          value: totalCost,
          color: "#f59e0b",
          valueLabel: `Tk ${formatFullCurrency(totalCost)}`,
        },
        {
          label: totalProfitAmount >= 0 ? (language === "bn" ? "লাভ" : "Profit") : language === "bn" ? "ক্ষতি" : "Loss",
          value: Math.abs(totalProfitAmount),
          color: totalProfitAmount >= 0 ? "#10b981" : "#ef4444",
          valueLabel: `Tk ${formatFullCurrency(Math.abs(totalProfitAmount))}`,
        },
      ].filter((segment) => segment.value > 0),
    [formatFullCurrency, language, soldSaltPurchaseCost, totalCost, totalProfitAmount]
  );

  const todaySalesMaund = useMemo(
    () => Math.max(0, todaySalesSaltKg / KG_PER_MAUND),
    [todaySalesSaltKg]
  );

  const totalTradeVolume = totalBuy + totalSales;
  const todayTradeVolume = dailyTransactionSection.amount;
  const supplierBalance = getBalanceSummary(supplierDue);
  const customerBalance = getBalanceSummary(customerDue);
  const totalPurchaseRingPercent = getRatioPercent(totalBuy, totalTradeVolume);
  const totalSalesRingPercent = getRatioPercent(totalSales, totalTradeVolume);
  const supplierDueRingPercent = getRatioPercent(supplierBalance.dueAmount, totalBuy);
  const customerDueRingPercent = getRatioPercent(customerBalance.dueAmount, totalSales);
  const dailySalesRingPercent = getRatioPercent(todaySales, todayTradeVolume);
  const dailyPurchaseRingPercent = getRatioPercent(todayBuy, todayTradeVolume);
  const dailyTransactionRingPercent = getRatioPercent(todayTradeVolume, totalTradeVolume);
  const dailyCostRingPercent = getRatioPercent(todayCost, todayBuy);
  const customerDuePercentLabel = `${formatPercent(customerDueRingPercent)}%`;
  const dailyCostPercentLabel = `${formatPercent(dailyCostRingPercent)}%`;
  const dailyPurchaseAndCostTotal = todayBuy + todayCost;
  const customerDueTrendDetail =
    language === "bn"
      ? `মোট বিক্রয়ের ${customerDuePercentLabel} এখনো গ্রাহকদের কাছে পাওনা আছে`
      : `${customerDuePercentLabel} of total sales is still receivable from customers`;

  const stockMixSegments = [
    {
      label: language === "bn" ? "মজুদ" : "Available",
      value: stockData.stockMounds,
      color: "#f59e0b",
      valueLabel: `${formatWeight(stockData.stockMounds)} ${translate(language, "maundUnit")}`,
    },
    {
      label: language === "bn" ? "বিক্রি" : "Sold",
      value: totalSoldMaund,
      color: "#22c55e",
      valueLabel: `${formatWeight(totalSoldMaund)} ${translate(language, "maundUnit")}`,
    },
    {
      label: language === "bn" ? "আজকের ক্রয়" : "Today Buy",
      value: todayBuySaltMaund,
      color: "#7b6cf4",
      valueLabel: `${formatWeight(todayBuySaltMaund)} ${translate(language, "maundUnit")}`,
    },
    {
      label: language === "bn" ? "আজকের বিক্রি" : "Today Sale",
      value: todaySalesMaund,
      color: "#ffb15c",
      valueLabel: `${formatWeight(todaySalesMaund)} ${translate(language, "maundUnit")}`,
    },
  ].filter((segment) => segment.value > 0);

  void stockMixSegments;

  const contactStream = useMemo(() => {
    const customerItems = customers.map((customer) => ({
      id: `customer-${String(customer._id ?? customer.name ?? customer.phone ?? "unknown")}`,
      href: customer._id ? `/customers/${String(customer._id)}` : "",
      typeLabel: translate(language, "customersLabel"),
      accentClass: "bg-emerald-50 text-emerald-700",
      name: formatDisplayName(customer.name, translate(language, "unnamedCustomer")),
      phone: String(customer.phone ?? "").trim() || "-",
    }));

    const supplierItems = suppliers.map((supplier) => ({
      id: `supplier-${String(supplier._id ?? supplier.name ?? supplier.phone ?? "unknown")}`,
      href: supplier._id ? `/suppliers/${String(supplier._id)}` : "",
      typeLabel: translate(language, "suppliersLabel"),
      accentClass: "bg-sky-50 text-sky-700",
      name: formatDisplayName(supplier.name, translate(language, "unnamedSupplier")),
      phone: String(supplier.phone ?? "").trim() || "-",
    }));

    return [...customerItems, ...supplierItems].sort((left, right) => left.name.localeCompare(right.name));
  }, [customers, suppliers, language]);

  useEffect(() => {
    let isActive = true;

    const refreshDashboardData = async () => {
      try {
        const response = await fetch("/api/dashboard", { cache: "no-store" });
        if (response.status === 401) {
          window.location.assign("/login");
          return;
        }

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as DashboardPageData;
        if (!isActive) return;

        startTransition(() => {
          setTotalSales(data.totalSales ?? 0);
          setTodaySales(data.todaySales ?? 0);
          setTodaySalesSaltKg(data.todaySalesSaltKg ?? 0);
          setTodayBuy(data.todayBuy ?? 0);
          setTodayBuySaltMaund(data.todayBuySaltMaund ?? 0);
          setTodayCost(data.todayCost ?? 0);
          setTotalCost(data.totalCost ?? 0);
          setTotalBuy(data.totalBuy ?? 0);
          setTotalSaltBuy(data.totalSaltBuy ?? 0);
          setCustomerDue(data.customerDue ?? 0);
          setSupplierDue(data.supplierDue ?? 0);
          setStockData(
            data.stockData ?? {
              stockMounds: 0,
              stockKg: 0,
              totalBought: 0,
            }
          );
          setCustomers(Array.isArray(data.customers) ? data.customers : []);
          setSuppliers(Array.isArray(data.suppliers) ? data.suppliers : []);
        });
      } catch {
        // Keep the server-rendered snapshot when refresh fails.
      }
    };

    const handleWindowFocus = () => {
      void refreshDashboardData();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void refreshDashboardData();
      }
    };

    const handleCostAdded = () => {
      void refreshDashboardData();
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'costUpdated') {
        void refreshDashboardData();
      }
    };

    // BroadcastChannel for reliable cross-page communication
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('dashboard-updates');
      broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'costAdded') {
          void refreshDashboardData();
        }
      };
    }

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("costAdded", handleCostAdded);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      isActive = false;
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("costAdded", handleCostAdded);
      window.removeEventListener("storage", handleStorageChange);
      if (broadcastChannel) {
        broadcastChannel.close();
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{translate(language, "dailyCalculationSection")}</h2>
          <p className="mt-1 text-sm text-slate-500">{translate(language, "dailyTransaction")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          
          <Card
            title={translate(language, "dailyPurchase")}
            value={`Tk ${formatFullCurrency(todayBuy)}`}
            trendPercent={`${formatWeight(todayBuySaltMaund)} ${translate(language, "maundUnit")}`}
            trendDetail={translate(language, "dailyPurchaseDetail")}
            trendDirection="neutral"
            visual="ring"
            ringPercent={dailyPurchaseRingPercent}
            icon="suppliers"
            tone="violet"
          />
          <Card
            title={translate(language, "dailySales")}
            value={`Tk ${formatFullCurrency(todaySales)}`}
            trendPercent={`${formatWeight(todaySalesSaltKg)} ${translate(language, "kgUnit")}`}
            trendDetail={translate(language, "dailySalesDetail")}
            trendDirection="neutral"
            visual="ring"
            ringPercent={dailySalesRingPercent}
            icon="sales"
            tone="sky"
          />
          <Card
            title={translate(language, "dailyTransaction")}
            value={`Tk ${formatFullCurrency(dailyTransactionSection.amount)}`}
            trendPercent={`Tk ${formatFullCurrency(dailyTransactionSection.customerAmount)} ${translate(language, "customerSuffix")}`}
            trendDetail={`Tk ${formatFullCurrency(dailyTransactionSection.supplierAmount)} ${translate(language, "supplierTodaySuffix")}`}
            trendDirection="neutral"
            visual="ring"
            ringPercent={dailyTransactionRingPercent}
            icon="activity"
            tone="rose"
          />
          <Card
            title={translate(language, "dailyCost")}
            value={`Tk ${formatFullCurrency(todayCost)}`}
            trendPercent={`Tk ${formatFullCurrency(dailyPurchaseAndCostTotal)}`}
            trendDetail={
              language === "bn"
                ? `ক্রয় + খরচ মোট, এর মধ্যে ${dailyCostPercentLabel} খরচ হয়েছে`
                : `Purchase + cost total, where ${dailyCostPercentLabel} went to cost`
            }
            trendDirection="neutral"
            visual="ring"
            ringPercent={dailyCostRingPercent}
            icon="warning"
            tone="amber"
          />
        </div>
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">{translate(language, "totalCalculationSection")}</h2>
          <p className="mt-1 text-sm text-slate-500">{translate(language, "totalSalesDetail")}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Card
            title={translate(language, "totalStock")}
            value={`${formatFullCurrency(stockData.stockMounds)} ${translate(language, "maundUnit")}`}
            trendPercent={`${formatPercent(stockOfPurchasePercent)}%`}
            trendDetail={`${translate(language, "totalPurchase")}: ${formatFullCurrency(stockData.totalBought)} ${translate(language, "maundUnit")}`}
            trendDirection="neutral"
            visual="ring"
            ringPercent={stockOfPurchasePercent}
            icon="activity"
            tone="emerald"
            accentValue
          />
          <Card
            title={translate(language, "totalPurchase")}
            value={`Tk ${formatFullCurrency(totalBuy)}`}
            trendPercent={`Tk ${formatWeight(averagePurchasePricePerMaund)}`}
            trendDetail={`Average / ${translate(language, "maundUnit")}`}
            trendDirection="neutral"
            visual="ring"
            ringPercent={totalPurchaseRingPercent}
            icon="suppliers"
            tone="rose"
          />
          <Card
            title={translate(language, "totalCost")}
            value={`Tk ${formatFullCurrency(totalPurchaseCost)}`}
            trendPercent={`Tk ${formatFullCurrency(totalCost)}`}
            trendDetail={
              language === "bn"
                ? `ক্রয়: Tk ${formatFullCurrency(totalBuy)}\nখরচ: Tk ${formatFullCurrency(totalCost)}`
                : `Purchase: Tk ${formatFullCurrency(totalBuy)}\nCost: Tk ${formatFullCurrency(totalCost)}`
            }
            trendDirection="neutral"
            visual="ring"
            ringPercent={totalCostSharePercent}
            icon="warning"
            tone="amber"
            accentValue
          />
          <Card
            title={supplierBalance.isAdvance ? translate(language, "advanceBalance") : translate(language, "suppliersDue")}
            value={`Tk ${formatFullCurrency(supplierBalance.absoluteAmount)}`}
            trendPercent={`Tk ${formatWeight(averagePurchasePricePerMaund)}`}
            trendDetail={
              supplierBalance.isAdvance
                ? language === "bn"
                  ? `সরবরাহকারীদের কাছে অগ্রিম Tk ${formatFullCurrency(supplierBalance.absoluteAmount)}`
                  : `Advance already paid to suppliers Tk ${formatFullCurrency(supplierBalance.absoluteAmount)}`
                : `Approx. ${formatWeight(supplierDueEquivalentMaund)} ${translate(language, "maundUnit")} due`
            }
            trendDirection="neutral"
            visual="ring"
            ringPercent={supplierDueRingPercent}
            icon="warning"
            tone="amber"
            accentValue
          />
          <Card
            title={translate(language, "totalSalesTransactions")}
            value={`Tk ${formatFullCurrency(totalSales)}`}
            trendPercent="0.00%"
            trendDetail={translate(language, "totalSalesDetail")}
            trendDirection="neutral"
            visual="ring"
            ringPercent={totalSalesRingPercent}
            icon="sales"
            tone="emerald"
          />
          <Card
            title={customerBalance.isAdvance ? translate(language, "advanceBalance") : translate(language, "customerDueCard")}
            value={`Tk ${formatFullCurrency(customerBalance.absoluteAmount)}`}
            trendPercent={customerDuePercentLabel}
            trendDetail={customerDueTrendDetail}
            trendDirection="neutral"
            visual="ring"
            ringPercent={customerDueRingPercent}
            icon="users"
            tone="violet"
          />
        </div>
      </section>

      <div>
        <section className="space-y-4">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card
              title={language === "bn" ? "লাভের পাই চার্ট" : "Profit Pie Chart"}
              value={`${totalProfitAmount < 0 ? "-" : ""}Tk ${formatFullCurrency(Math.abs(totalProfitAmount))}`}
              trendPercent={`${formatPercent(Math.abs(totalProfitPercent))}% ${
                totalProfitAmount >= 0 ? (language === "bn" ? "লাভ" : "profit") : language === "bn" ? "ক্ষতি" : "loss"
              }`}
              trendDetail={
                language === "bn"
                  ? `বিক্রিত লবণের ক্রয় মূল্য ও মোট খরচ বাদ দিয়ে এই ${totalProfitAmount >= 0 ? "লাভ" : "ক্ষতি"} হিসাব করা হয়েছে`
                  : `This ${totalProfitAmount >= 0 ? "profit" : "loss"} is calculated after sold-salt purchase cost and total cost`
              }
              trendDirection={totalProfitAmount >= 0 ? "up" : "down"}
              pieSegments={profitChartSegments}
              icon="sales"
              tone={totalProfitAmount >= 0 ? "emerald" : "rose"}
              accentValue
            />

            <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {translate(language, "contactDirectory")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{translate(language, "liveContactStream")}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {contactStream.length}
                </span>
              </div>

              <div className="scroll-pause-shell relative mt-4 h-72 overflow-hidden">
                {contactStream.length > 0 ? (
                  <div className="vertical-scroll-up space-y-3">
                    {[...contactStream, ...contactStream].map((entry, index) => (
                      <div
                        key={`${entry.id}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{entry.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{entry.phone}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${entry.accentClass}`}>
                            {entry.typeLabel}
                          </span>
                          {entry.href ? (
                            <Link
                              href={entry.href}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              {translate(language, "view")}
                            </Link>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 text-center text-sm text-slate-500">
                    {translate(language, "noContactsFound")}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

