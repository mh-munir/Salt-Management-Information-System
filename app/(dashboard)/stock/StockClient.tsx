"use client";

import { useCallback, useMemo, useState } from "react";
import Card from "@/components/Card";
import { formatLocalizedNumber } from "@/lib/display-format";
import type { StockPageData } from "@/lib/stock-data";
import { useLanguage } from "@/lib/useLanguage";
import { translate } from "@/lib/language";

interface StockData {
  stockKg: number;
  stockMounds: number;
  totalBought: number;
  totalSoldKg: number;
  totalPurchaseStock?: number;
  totalSaleStock?: number;
  totalSaleStockMaund?: number;
  conversionKgPerMound?: number;
}

type TransactionItem = {
  date?: string | Date;
  supplierId?: string;
  customerId?: string;
  saltAmount?: number;
};

const getSafeNumber = (value: unknown) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getPercentChange = (current: number, previous: number) => {
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

const KG_PER_MOUND = 40;

const sum = (values: number[]) => values.reduce((acc, value) => acc + value, 0);

type StockClientProps = {
  initialData: StockPageData;
};

export default function StockClient({ initialData }: StockClientProps) {
  const { language } = useLanguage();
  const formatNumber = (value: number, options?: Intl.NumberFormatOptions) =>
    formatLocalizedNumber(value, language, options);
  const [stock, setStock] = useState<StockData | null>({
    stockKg: initialData.stockKg,
    stockMounds: initialData.stockMounds,
    totalBought: initialData.totalBought,
    totalSoldKg: initialData.totalSoldKg,
    totalPurchaseStock: initialData.totalPurchaseStock,
    totalSaleStock: initialData.totalSaleStock,
    totalSaleStockMaund: initialData.totalSaleStockMaund,
    conversionKgPerMound: initialData.conversionKgPerMound,
  });
  const [transactions, setTransactions] = useState<TransactionItem[]>(initialData.transactions);
  const [refreshing, setRefreshing] = useState(false);
  const fetchData = useCallback(async () => {
    setRefreshing(true);

    try {
      const response = await fetch("/api/stock", { cache: "no-store" });
      if (response.status === 401) {
        window.location.assign("/login");
        return;
      }

      if (!response.ok) {
        setStock(null);
        setTransactions([]);
        return;
      }

      const data = (await response.json()) as StockPageData;
      setStock({
        stockKg: data.stockKg,
        stockMounds: data.stockMounds,
        totalBought: data.totalBought,
        totalSoldKg: data.totalSoldKg,
        totalPurchaseStock: data.totalPurchaseStock,
        totalSaleStock: data.totalSaleStock,
        totalSaleStockMaund: data.totalSaleStockMaund,
        conversionKgPerMound: data.conversionKgPerMound,
      });
      setTransactions(Array.isArray(data.transactions) ? data.transactions : []);
    } catch (error) {
      console.error("Error fetching stock page data:", error);
      setStock(null);
      setTransactions([]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const analytics = useMemo(() => {
    const days = 14;
    const purchaseByDay = Array.from({ length: days }, () => 0);
    const saleByDay = Array.from({ length: days }, () => 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayMs = 24 * 60 * 60 * 1000;

    for (const item of transactions) {
      const date = new Date(item.date ?? "");
      if (Number.isNaN(date.getTime())) continue;

      date.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - date.getTime()) / dayMs);
      if (diffDays < 0 || diffDays >= days) continue;

      const bucketIndex = days - 1 - diffDays;
      const quantity = getSafeNumber(item.saltAmount);

      if (item.supplierId) purchaseByDay[bucketIndex] += quantity;
      if (item.customerId) saleByDay[bucketIndex] += quantity / KG_PER_MOUND;
    }

    const recentPurchase = sum(purchaseByDay.slice(7));
    const previousPurchase = sum(purchaseByDay.slice(0, 7));
    const recentSale = sum(saleByDay.slice(7));
    const previousSale = sum(saleByDay.slice(0, 7));

    const recentNetStock = recentPurchase - recentSale;
    const previousNetStock = previousPurchase - previousSale;

    const stockLine = purchaseByDay.slice(6).map((_, index) => {
      const pointPurchase = purchaseByDay.slice(0, index + 7);
      const pointSale = saleByDay.slice(0, index + 7);
      return Math.max(0, sum(pointPurchase) - sum(pointSale));
    });

    const purchaseLine = purchaseByDay.slice(6);
    const saleLine = saleByDay.slice(6);

    return {
      stockLine,
      purchaseLine,
      saleLine,
      purchaseDelta: recentPurchase - previousPurchase,
      purchaseChangePercent: Math.abs(getPercentChange(recentPurchase, previousPurchase)),
      saleDelta: recentSale - previousSale,
      saleChangePercent: Math.abs(getPercentChange(recentSale, previousSale)),
      netDelta: recentNetStock - previousNetStock,
      netChangePercent: Math.abs(getPercentChange(recentNetStock, previousNetStock)),
    };
  }, [transactions]);

  if (!stock) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">{translate(language, "stockPageTitle")}</h1>
        <p className="text-sm text-rose-600">{translate(language, "errorLoadingStockData")}</p>
      </div>
    );
  }

  const conversionKgPerMound = getSafeNumber(stock.conversionKgPerMound ?? KG_PER_MOUND);
  const totalPurchaseStock = getSafeNumber(stock.totalPurchaseStock ?? stock.totalBought);
  const totalSaleStockKg = getSafeNumber(stock.totalSaleStock ?? stock.totalSoldKg);
  const availableStockKg = Math.max(0, getSafeNumber(stock.stockKg));
  const availableStockMounds = Math.max(0, getSafeNumber(stock.stockMounds));
  const stockCoverage = totalPurchaseStock > 0 ? (availableStockMounds / totalPurchaseStock) * 100 : 0;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">{translate(language, "stockPageTitle")}</h1>
          <button
            onClick={() => void fetchData()}
            disabled={refreshing}
            className="rounded-lg bg-[#348CD4] px-4 py-2 text-sm font-medium text-white hover:bg-[#2F7FC0] disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {translate(language, "stockPageDescription")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card
          title={translate(language, "currentStock")}
          value={`${formatNumber(availableStockMounds)} maund`}
          trendPercent={`${analytics.netChangePercent.toFixed(2)}%`}
          trendDirection={analytics.netDelta >= 0 ? "up" : "down"}
          visual="sparkline"
          sparklinePoints={analytics.stockLine}
          icon="activity"
          tone="sky"
        />
        <Card
          title={translate(language, "purchaseStock")}
          value={`${formatNumber(totalPurchaseStock)} maund`}
          trendPercent={`${analytics.purchaseChangePercent.toFixed(2)}%`}
          trendDirection={analytics.purchaseDelta >= 0 ? "up" : "down"}
          visual="sparkline"
          sparklinePoints={analytics.purchaseLine}
          icon="suppliers"
          tone="emerald"
        />
        <Card
          title={translate(language, "saleStock")}
          value={`${formatNumber(totalSaleStockKg)} kg`}
          trendPercent={`${analytics.saleChangePercent.toFixed(2)}%`}
          trendDirection={analytics.saleDelta >= 0 ? "up" : "down"}
          visual="sparkline"
          sparklinePoints={analytics.saleLine}
          icon="sales"
          tone="amber"
        />
        <Card
          title={translate(language, "stockCoverage")}
          value={`${stockCoverage.toFixed(1)}%`}
          trendPercent={`${stockCoverage.toFixed(1)}%`}
          trendDetail={`${formatNumber(availableStockMounds)} / ${formatNumber(totalPurchaseStock)} maund`}
          trendDirection={stockCoverage >= 50 ? "up" : "down"}
          visual="ring"
          ringPercent={clampPercent(stockCoverage)}
          icon="users"
          tone="violet"
        />
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Stock Summary</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-lg text-slate-700">
            Current stock: <span className="font-semibold">{formatNumber(availableStockMounds)} maund</span> (
            {formatNumber(availableStockKg)} kg)
          </p>
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-lg text-slate-700">
            Purchased from suppliers: <span className="font-semibold">{formatNumber(totalPurchaseStock)} maund</span>
          </p>
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-lg text-slate-700">
            Sold to customers: <span className="font-semibold">{formatNumber(totalSaleStockKg)} kg</span>
          </p>
          <p className="rounded-lg bg-slate-50 px-4 py-3 text-lg text-slate-700">
            Conversion: <span className="font-semibold">1 maund = {formatNumber(conversionKgPerMound)} kg</span>
          </p>
        </div>
      </section>
    </div>
  );
}
