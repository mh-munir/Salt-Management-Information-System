"use client";
import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import SalesChart from "@/components/Chart";
import { getBalanceSummary } from "@/lib/balance";
import { formatDisplayName } from "@/lib/display-format";
import { useLanguage } from "@/lib/useLanguage";
import { translate } from "@/lib/language";

const KG_PER_MAUND = 40;

type TransactionItem = {
  amount?: number;
  saltAmount?: number;
  date?: string;
  type?: string;
  customerId?: string;
  supplierId?: string;
};

type PartyContact = {
  _id?: string;
  name?: string;
  phone?: string;
};

type RevenueChartPoint = {
  label: string;
  orders: number;
  refunds: number;
};

const getPercentChange = (current: number, previous: number) => {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const getSafeAmount = (amount?: number) => {
  const value = Number(amount ?? 0);
  return Number.isFinite(value) ? value : 0;
};

const getRatioPercent = (value: number, total: number) => {
  if (value <= 0 || total <= 0) return 0;

  const percent = (value / total) * 100;
  if (!Number.isFinite(percent)) return 0;

  return Math.max(0, Math.min(100, percent));
};

const toLocalIsoDate = (value?: string | Date | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  const { language } = useLanguage();
  const numberLocale = language === "bn" ? "bn-BD" : "en-BD";
  const formatFullCurrency = (amount: number) =>
    new Intl.NumberFormat(numberLocale, {
      maximumFractionDigits: 0,
    }).format(amount);

  const formatWeight = (amount: number) =>
    new Intl.NumberFormat(numberLocale, {
      maximumFractionDigits: 2,
    }).format(amount);

  const formatPercent = (amount: number) =>
    new Intl.NumberFormat(numberLocale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

  const [totalSales, setTotalSales] = useState<number>(0);
  const [todaySales, setTodaySales] = useState<number>(0);
  const [todaySalesSaltKg, setTodaySalesSaltKg] = useState<number>(0);
  const [todayBuy, setTodayBuy] = useState<number>(0);
  const [todayBuySaltMaund, setTodayBuySaltMaund] = useState<number>(0);
  const [todayCost, setTodayCost] = useState<number>(0);
  const [totalCost, setTotalCost] = useState<number>(0);
  const [totalBuy, setTotalBuy] = useState<number>(0);
  const [totalSaltBuy, setTotalSaltBuy] = useState<number>(0);
  const [customerDue, setCustomerDue] = useState<number>(0);
  const [supplierDue, setSupplierDue] = useState<number>(0);
  const [stockData, setStockData] = useState<{
    stockMounds: number;
    stockKg: number;
    totalBought: number;
  }>({
    stockMounds: 0,
    stockKg: 0,
    totalBought: 0,
  });
  const [customers, setCustomers] = useState<PartyContact[]>([]);
  const [suppliers, setSuppliers] = useState<PartyContact[]>([]);
  const [rawTransactions, setRawTransactions] = useState<TransactionItem[]>([]);
  const [rangeDays, setRangeDays] = useState<number>(90);

  const revenueSection = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const bucketCount = 15;
    const bucketSize = Math.max(1, Math.ceil(rangeDays / bucketCount));
    const points: RevenueChartPoint[] = Array.from({ length: bucketCount }, (_, index) => ({
      label: `${(index + 1) * bucketSize}D`,
      orders: 0,
      refunds: 0,
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let orders = 0;
    let refunds = 0;
    let previousOrders = 0;
    let previousRefunds = 0;

    for (const item of rawTransactions) {
      const parsed = new Date(item.date ?? "");
      if (Number.isNaN(parsed.getTime())) continue;

      parsed.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - parsed.getTime()) / dayMs);
      if (diffDays < 0) continue;

      const amount = getSafeAmount(item.amount);
      const isRefund = item.type?.startsWith("supplier") || Boolean(item.supplierId);

      if (diffDays < rangeDays) {
        const bucket = Math.floor(diffDays / bucketSize);
        if (bucket < bucketCount) {
          const pointIndex = bucketCount - 1 - bucket;
          if (isRefund) {
            points[pointIndex].refunds += amount;
            refunds += amount;
          } else {
            points[pointIndex].orders += amount;
            orders += amount;
          }
        }
      } else if (diffDays < rangeDays * 2) {
        if (isRefund) previousRefunds += amount;
        else previousOrders += amount;
      }
    }

    const net = orders - refunds;
    const previousNet = previousOrders - previousRefunds;
    const change = getPercentChange(net, previousNet);

    return {
      points,
      net,
      changePercent: Math.abs(change),
      isUp: change >= 0,
    };
  }, [rawTransactions, rangeDays]);

  const dailyRevenueSection = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todaySalesAmount = 0;
    let todayBuyAmount = 0;
    let yesterdaySales = 0;
    let yesterdayBuy = 0;
    let todaySaltSoldKg = 0;

    for (const item of rawTransactions) {
      const parsed = new Date(item.date ?? "");
      if (Number.isNaN(parsed.getTime())) continue;

      parsed.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - parsed.getTime()) / dayMs);
      if (diffDays < 0 || diffDays > 1) continue;

      const amount = getSafeAmount(item.amount);
      const saltAmount = getSafeAmount(item.saltAmount);
      const isSupplierTransaction = item.type?.startsWith("supplier") || Boolean(item.supplierId);

      if (diffDays === 0) {
        if (isSupplierTransaction) {
          todayBuyAmount += amount;
        } else {
          todaySalesAmount += amount;
          todaySaltSoldKg += saltAmount;
        }
      }

      if (diffDays === 1) {
        if (isSupplierTransaction) {
          yesterdayBuy += amount;
        } else {
          yesterdaySales += amount;
        }
      }
    }

    const net = todaySalesAmount + todayBuyAmount;
    const previousNet = yesterdaySales + yesterdayBuy;
    const change = getPercentChange(net, previousNet);

    return {
      net,
      changePercent: Math.abs(change),
      isUp: change >= 0,
      todaySaltSoldKg,
    };
  }, [rawTransactions]);

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
  const customerDuePercentLabel = `${formatPercent(customerDueRingPercent)}%`;
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
    const parseJson = async (res: Response) => {
      if (!res.ok) return null;
      const text = await res.text();
      return text ? JSON.parse(text) : null;
    };

    let isActive = true;

    const refreshDashboardData = async () => {
      const [dashboardData, stockDataResponse, transactionData, customersData, suppliersData, costsData] = await Promise.all([
        fetch("/api/dashboard", { cache: "no-store" }).then(parseJson),
        fetch("/api/stock", { cache: "no-store" }).then(parseJson),
        fetch("/api/transactions", { cache: "no-store" }).then(parseJson),
        fetch("/api/customers", { cache: "no-store" }).then(parseJson),
        fetch("/api/suppliers", { cache: "no-store" }).then(parseJson),
        fetch("/api/costs", { cache: "no-store" }).then(parseJson),
      ]);

      if (!isActive) return;

      startTransition(() => {
        setTotalSales(dashboardData?.totalSales || 0);
        setTodaySales(dashboardData?.todaySales || 0);
        setTodaySalesSaltKg(dashboardData?.todaySalesSaltKg || 0);
        setTodayBuy(dashboardData?.todayBuy || 0);
        setTodayBuySaltMaund(dashboardData?.todayBuySaltMaund || 0);
        setTotalBuy(dashboardData?.totalBuy || 0);
        setTotalSaltBuy(dashboardData?.totalSaltBuy || 0);
        setCustomerDue(dashboardData?.customerDue ?? 0);
        setSupplierDue(dashboardData?.supplierDue ?? 0);

        if (stockDataResponse) {
          setStockData({
            stockMounds: stockDataResponse.stockMounds || 0,
            stockKg: stockDataResponse.stockKg || 0,
            totalBought: stockDataResponse.totalBought || 0,
          });
        }

        setCustomers(Array.isArray(customersData) ? (customersData as PartyContact[]) : []);
        setSuppliers(Array.isArray(suppliersData) ? (suppliersData as PartyContact[]) : []);

        if (Array.isArray(transactionData)) {
          const txData = transactionData as TransactionItem[];
          setRawTransactions(txData);
        } else {
          setRawTransactions([]);
        }

        if (Array.isArray(costsData)) {
          const todayString = toLocalIsoDate(new Date());

          const todayCostAmount = costsData
            .filter((cost: any) => {
              const costDateString = toLocalIsoDate(cost.date ?? cost.createdAt);
              return costDateString === todayString;
            })
            .reduce((sum: number, cost: any) => sum + Number(cost.amount ?? 0), 0);

          const totalCostAmount = costsData.reduce((sum: number, cost: any) => sum + Number(cost.amount ?? 0), 0);

          setTodayCost(todayCostAmount);
          setTotalCost(totalCostAmount);
        } else {
          setTodayCost(0);
          setTotalCost(0);
        }
      });
    };

    void refreshDashboardData();

    // Check if there was a recent cost update while we were away
    const lastCostUpdate = localStorage.getItem('costUpdated');
    if (lastCostUpdate) {
      const updateTime = parseInt(lastCostUpdate);
      const now = Date.now();
      // If the update was within the last 5 minutes, refresh immediately
      if (now - updateTime < 5 * 60 * 1000) {
        void refreshDashboardData();
        // Clear the flag so we don't refresh again unnecessarily
        localStorage.removeItem('costUpdated');
      }
    }

    const intervalId = window.setInterval(() => {
      void refreshDashboardData();
    }, 30000);

    const handleWindowFocus = () => {
      void refreshDashboardData();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Check if there was a recent cost update when page becomes visible
        const lastCostUpdate = localStorage.getItem('costUpdated');
        if (lastCostUpdate) {
          const updateTime = parseInt(lastCostUpdate);
          const now = Date.now();
          // If the update was within the last 10 minutes, refresh immediately
          if (now - updateTime < 10 * 60 * 1000) {
            void refreshDashboardData();
            // Clear the flag so we don't refresh again unnecessarily
            localStorage.removeItem('costUpdated');
          }
        }
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
      window.clearInterval(intervalId);
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
            trendPercent="0.00%"
            trendDetail={translate(language, "todaysExpenses")}
            trendDirection="neutral"
            visual="ring"
            ringPercent={0}
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
            tone="amber"
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
                ? `ক্রয়: Tk ${formatFullCurrency(totalBuy)}\nখরচ: Tk ${formatFullCurrency(totalCost)}`
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
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-700">{translate(language, "dailyRevenue")}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-teal-500 text-white">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                        <path d="M4 7h16l-1.2 9a2 2 0 0 1-2 1.7H7.2a2 2 0 0 1-2-1.7L4 7Z" />
                        <path d="M9 7V5a3 3 0 1 1 6 0v2" />
                      </svg>
                    </span>
                    <p className="text-3xl font-semibold tracking-tight text-slate-700">
                      Tk {formatFullCurrency(dailyRevenueSection.net)}
                    </p>
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${
                        dailyRevenueSection.isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                      }`}
                    >
                      {dailyRevenueSection.isUp ? translate(language, "upLabel") : translate(language, "downLabel")} {formatPercent(dailyRevenueSection.changePercent)}%
                    </span>
                  </div>
                </div>

                <div className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 sm:w-auto">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
                    <rect x="3" y="5" width="18" height="16" rx="2" />
                    <path d="M16 3v4M8 3v4M3 10h18" />
                  </svg>
                  <select
                    name="rangeDays"
                    value={rangeDays}
                    onChange={(event) => setRangeDays(Number(event.target.value))}
                    className="bg-transparent font-medium outline-none"
                  >
                    <option value={15}>Last 15 Days</option>
                    <option value={30}>Last 30 Days</option>
                    <option value={90}>Last 90 Days</option>
                  </select>
                </div>
              </div>

              <div className="mt-5 min-w-0">
                <SalesChart data={revenueSection.points} />
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
