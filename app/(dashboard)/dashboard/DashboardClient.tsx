"use client";
import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Card from "@/components/Card";
import { getBalanceSummary } from "@/lib/balance";
import type { DashboardPageData } from "@/lib/dashboard-data";
import { formatDisplayName } from "@/lib/display-format";
import { useLanguage } from "@/lib/useLanguage";
import { translate } from "@/lib/language";

const KG_PER_MAUND = 40;

type ProfitChartSegment = {
  color: string;
  label: string;
  value: number;
};

type ProfitDetailRow = ProfitChartSegment & {
  percent: number;
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

  const [dashboardData, setDashboardData] = useState<DashboardPageData>(initialData);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const {
    totalSales,
    todaySales,
    todaySalesSaltKg,
    todayBuy,
    todayBuySaltMaund,
    todayCost,
    totalCost,
    totalBuy,
    totalSaltBuy,
    customerDue,
    supplierDue,
    stockData,
    customers,
    suppliers,
  } = dashboardData;

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

  const estimatedStockValue = useMemo(() => {
    if (averagePurchasePricePerMaund <= 0 || stockData.stockMounds <= 0) return 0;

    return stockData.stockMounds * averagePurchasePricePerMaund;
  }, [averagePurchasePricePerMaund, stockData.stockMounds]);

  const totalBusinessInvestment = useMemo(
    () => Math.max(0, totalBuy + totalCost),
    [totalBuy, totalCost]
  );

  const totalBusinessReturn = useMemo(
    () => Math.max(0, totalSales + estimatedStockValue),
    [estimatedStockValue, totalSales]
  );

  const totalProfitAmount = useMemo(
    () => totalBusinessReturn - totalBusinessInvestment,
    [totalBusinessInvestment, totalBusinessReturn]
  );

  const totalProfitPercent = useMemo(() => {
    if (totalBusinessInvestment <= 0) return totalBusinessReturn > 0 ? 100 : 0;

    return (totalProfitAmount / totalBusinessInvestment) * 100;
  }, [totalBusinessInvestment, totalBusinessReturn, totalProfitAmount]);

  const returnMixSegments = useMemo<ProfitChartSegment[]>(
    () =>
      [
        {
          label: language === "bn" ? "মোট বিক্রি" : "Total Sale",
          value: totalSales,
          color: "#0ea5e9",
        },
        {
          label: language === "bn" ? "স্টকের মূল্য" : "Stock Value",
          value: estimatedStockValue,
          color: "#10b981",
        },
      ].filter((segment) => segment.value > 0),
    [estimatedStockValue, language, totalSales]
  );

  const investmentMixSegments = useMemo<ProfitChartSegment[]>(
    () =>
      [
        {
          label: language === "bn" ? "মোট ক্রয়" : "Total Purchase",
          value: totalBuy,
          color: "#7c3aed",
        },
        {
          label: language === "bn" ? "মোট খরচ" : "Total Cost",
          value: totalCost,
          color: "#f59e0b",
        },
      ].filter((segment) => segment.value > 0),
    [language, totalBuy, totalCost]
  );

  const profitChartSegments = useMemo<ProfitChartSegment[]>(() => {
    if (totalProfitAmount >= 0) {
      return [
        {
          label: language === "bn" ? "রিকভার হওয়া বিনিয়োগ" : "Recovered Investment",
          value: totalBusinessInvestment,
          color: "#7c3aed",
        },
        {
          label: language === "bn" ? "নিট লাভ" : "Net Profit",
          value: totalProfitAmount,
          color: "#10b981",
        },
      ].filter((segment) => segment.value > 0);
    }

    return [
      {
        label: language === "bn" ? "রিকভার হওয়া টাকা" : "Recovered Return",
        value: totalBusinessReturn,
        color: "#0ea5e9",
      },
      {
        label: language === "bn" ? "নিট ক্ষতি" : "Net Loss",
        value: Math.abs(totalProfitAmount),
        color: "#ef4444",
      },
    ].filter((segment) => segment.value > 0);
  }, [language, totalBusinessInvestment, totalBusinessReturn, totalProfitAmount]);

  const profitChartTotal = useMemo(
    () => profitChartSegments.reduce((sum, segment) => sum + segment.value, 0),
    [profitChartSegments]
  );

  const profitPieRingSegments = useMemo(() => {
    if (profitChartTotal <= 0) return [];

    let offset = 0;

    return profitChartSegments.map((segment) => {
      const percent = (segment.value / profitChartTotal) * 100;
      const ringSegment = {
        ...segment,
        percent,
        dashArray: `${percent} ${100 - percent}`,
        dashOffset: -offset,
      };

      offset += percent;
      return ringSegment;
    });
  }, [profitChartSegments, profitChartTotal]);

  const returnMixRows = useMemo<ProfitDetailRow[]>(() => {
    const total = totalBusinessReturn;
    if (total <= 0) return [];

    return returnMixSegments.map((segment) => ({
      ...segment,
      percent: (segment.value / total) * 100,
    }));
  }, [returnMixSegments, totalBusinessReturn]);

  const investmentMixRows = useMemo<ProfitDetailRow[]>(() => {
    const total = totalBusinessInvestment;
    if (total <= 0) return [];

    return investmentMixSegments.map((segment) => ({
      ...segment,
      percent: (segment.value / total) * 100,
    }));
  }, [investmentMixSegments, totalBusinessInvestment]);

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
          setDashboardData({
            totalSales: data.totalSales ?? 0,
            todaySales: data.todaySales ?? 0,
            todaySalesSaltKg: data.todaySalesSaltKg ?? 0,
            todayBuy: data.todayBuy ?? 0,
            todayBuySaltMaund: data.todayBuySaltMaund ?? 0,
            todayCost: data.todayCost ?? 0,
            totalCost: data.totalCost ?? 0,
            totalBuy: data.totalBuy ?? 0,
            totalSaltBuy: data.totalSaltBuy ?? 0,
            customerDue: data.customerDue ?? 0,
            supplierDue: data.supplierDue ?? 0,
            stockData: data.stockData ?? {
              stockMounds: 0,
              stockKg: 0,
              totalBought: 0,
            },
            customers: Array.isArray(data.customers) ? data.customers : [],
            suppliers: Array.isArray(data.suppliers) ? data.suppliers : [],
          });
        });
      } catch {
        // Keep the server-rendered snapshot when refresh fails.
      }
    };

    const scheduleRefresh = () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      refreshTimerRef.current = setTimeout(() => {
        void refreshDashboardData();
      }, 160);
    };

    const handleWindowFocus = () => {
      scheduleRefresh();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        scheduleRefresh();
      }
    };

    const handleCostAdded = () => {
      scheduleRefresh();
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'costUpdated') {
        scheduleRefresh();
      }
    };

    // BroadcastChannel for reliable cross-page communication
    let broadcastChannel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannel = new BroadcastChannel('dashboard-updates');
      broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'costAdded') {
          scheduleRefresh();
        }
      };
    }

    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("costAdded", handleCostAdded);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      isActive = false;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
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
            trendDetail={translate(language, "averagePerMaund")}
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
                : language === "bn"
                ? `${translate(language, "supplierDueApproxDetail")}: ${formatWeight(supplierDueEquivalentMaund)} ${translate(language, "maundUnit")}`
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
            <div className="rounded-lg border border-slate-200 bg-white/90 p-4 flex flex-col items-center">
              <h3 className="text-lg font-semibold mb-2">{language === "bn" ? "লাভের পাই চার্ট" : "Profit Pie Chart"}</h3>
              <div className="w-full flex flex-col items-center" style={{ minHeight: 260, maxWidth: 340 }}>
                {profitPieRingSegments.length > 0 ? (
                  <>
                    <div className="relative grid h-56 w-56 place-items-center">
                      <svg viewBox="0 0 120 120" className="h-56 w-56 -rotate-90">
                        <circle cx="60" cy="60" r="42" fill="none" stroke="#e2e8f0" strokeWidth="16" />
                        {profitPieRingSegments.map((segment) => (
                          <circle
                            key={segment.label}
                            cx="60"
                            cy="60"
                            r="42"
                            fill="none"
                            stroke={segment.color}
                            strokeWidth="16"
                            strokeLinecap="round"
                            pathLength="100"
                            strokeDasharray={segment.dashArray}
                            strokeDashoffset={segment.dashOffset}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                          {totalProfitAmount >= 0
                            ? language === "bn"
                              ? "নিট লাভ"
                              : "Net Profit"
                            : language === "bn"
                            ? "নিট ক্ষতি"
                            : "Net Loss"}
                        </span>
                        <span className={`mt-1 text-2xl font-bold ${totalProfitAmount >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {`${totalProfitAmount < 0 ? "-" : ""}${formatPercent(Math.abs(totalProfitPercent))}%`}
                        </span>
                        <span className="mt-1 text-xs text-slate-500">
                          {`${totalProfitAmount < 0 ? "-" : ""}Tk ${formatFullCurrency(Math.abs(totalProfitAmount))}`}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 grid w-full gap-2">
                      {profitPieRingSegments.map((segment) => (
                        <div
                          key={segment.label}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2 text-slate-700">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: segment.color }}
                              aria-hidden="true"
                            />
                            <span>{segment.label}</span>
                          </div>
                          <span className="font-medium text-slate-900">
                            {`Tk ${formatFullCurrency(segment.value)} (${formatPercent(segment.percent)}%)`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex h-56 w-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                    {language === "bn" ? "চার্ট দেখানোর মতো ডেটা নেই" : "No data available for chart"}
                  </div>
                )}
              </div>
              <div className="mt-4 grid w-full gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {language === "bn" ? "বিনিয়োগের হিসাব" : "Investment Mix"}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {`Tk ${formatFullCurrency(totalBusinessInvestment)}`}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2">
                    {investmentMixRows.map((segment) => (
                      <div key={segment.label} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-700">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: segment.color }}
                            aria-hidden="true"
                          />
                          <span>{segment.label}</span>
                        </div>
                        <span className="font-medium text-slate-900">
                          {`Tk ${formatFullCurrency(segment.value)} (${formatPercent(segment.percent)}%)`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      {language === "bn" ? "রিটার্নের হিসাব" : "Return Mix"}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {`Tk ${formatFullCurrency(totalBusinessReturn)}`}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2">
                    {returnMixRows.map((segment) => (
                      <div key={segment.label} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-slate-700">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: segment.color }}
                            aria-hidden="true"
                          />
                          <span>{segment.label}</span>
                        </div>
                        <span className="font-medium text-slate-900">
                          {`Tk ${formatFullCurrency(segment.value)} (${formatPercent(segment.percent)}%)`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {translate(language, "contactDirectory")}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{translate(language, "liveContactStream")}</p>
                </div>
                <span className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-600">
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
                          <span className={`rounded-lg px-3 py-1 text-[11px] font-semibold ${entry.accentClass}`}>
                            {entry.typeLabel}
                          </span>
                          {entry.href ? (
                            <Link
                              href={entry.href}
                              prefetch
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
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
