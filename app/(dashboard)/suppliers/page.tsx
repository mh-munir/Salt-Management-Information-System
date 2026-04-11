"use client";

import { FormEvent, useEffect, useState } from "react";
import React from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import CompactDateInput from "@/components/CompactDateInput";
import ModalShell from "@/components/ModalShell";
import { translate } from "@/lib/language";
import { useLanguage } from "@/lib/useLanguage";
import { formatDisplayName, formatLocalizedNumber } from "@/lib/display-format";

type Supplier = {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  totalDue?: number;
  saltAmount?: number;
  lastPurchaseDate?: string;
  totalPaid?: number;
  totalPurchaseAmount?: number;
};

export default function SuppliersPage() {
  const { language } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formatAmount = (value: number, maximumFractionDigits = 2) =>
    formatLocalizedNumber(value, language, { maximumFractionDigits });

        // Supplier form state
        const [name, setName] = useState("");
        const [phone, setPhone] = useState("");
        const [address, setAddress] = useState("");
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [error, setError] = useState("");

        // Helper: phone validation
        function isValidPhone(phone: string) {
          return /^\d{11}$/.test(phone);
        }

        // Helper: calculate total price
        function calculateTotalPrice(quantity: string, price: string) {
          const q = Number(quantity);
          const p = Number(price);
          if (Number.isNaN(q) || Number.isNaN(p)) return "";
          return (q * p).toFixed(2);
        }

        // Payment popup handlers
        function closePaymentPopup() {
          setShowPaymentPopup(false);
          setPaymentSupplierId(null);
          setPaymentAmount("");
          setPaymentDate(new Date().toISOString().split("T")[0]);
          setPaymentError("");
          if (requestedPaymentSupplierId) {
            router.replace(pathname, { scroll: false });
          }
        }

        // Payment submit stub
        async function handlePaymentSubmit(e: FormEvent<HTMLFormElement>) {
          e.preventDefault();
          setPaymentError("");

          if (!paymentSupplierId) {
            setPaymentError(translate(language, "pleaseSelectSupplier"));
            return;
          }

          if (!paymentDate) {
            setPaymentError(translate(language, "pleaseSelectPaymentDate"));
            return;
          }

          const amount = Number(paymentAmount);
          if (!paymentAmount || Number.isNaN(amount) || amount <= 0) {
            setPaymentError(translate(language, "enterValidAmount"));
            return;
          }

          const supplier = suppliers.find((s) => s._id === paymentSupplierId);
          if (!supplier) {
            setPaymentError(translate(language, "supplierNotFound"));
            return;
          }

          const currentDue = supplier.totalDue ?? 0;
          if (amount > currentDue) {
            setPaymentError(translate(language, "paidAmountCannotExceedDue"));
            return;
          }

          const response = await fetch(`/api/suppliers/${paymentSupplierId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentAmount: amount, date: paymentDate }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            setPaymentError(errorData?.message || translate(language, "unableToSavePayment"));
            return;
          }

          const updatedSupplier = await response.json();
          fetch("/api/suppliers", { cache: "no-store" })
            .then((res) => res.json())
            .then((data) => {
              if (Array.isArray(data)) {
                setSuppliers(data.map((s: Supplier) => ({ ...s, totalPaid: s.totalPaid ?? 0 })));
              }
            });

          // optionally keep the selected supplier updated in UI
          setPaymentSupplierId(updatedSupplier._id);
          closePaymentPopup();
        }
      const [showPaymentPopup, setShowPaymentPopup] = useState(false);
      const [paymentSupplierId, setPaymentSupplierId] = useState<string | null>(null);
      const [paymentAmount, setPaymentAmount] = useState("");
      const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
      const [paymentError, setPaymentError] = useState("");
      const requestedPaymentSupplierId = searchParams.get("paymentId");
      const isProfilePaymentFlow = Boolean(requestedPaymentSupplierId);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [buySaltQuantity, setBuySaltQuantity] = useState("");
  const [buyPricePerMaund, setBuyPricePerMaund] = useState("");
  const [buyTotalPrice, setBuyTotalPrice] = useState("");
  const [buyPaid, setBuyPaid] = useState("");
  const [buyDue, setBuyDue] = useState("");
  const [buyStatus, setBuyStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [buyPopupMessage, setBuyPopupMessage] = useState("");

  // Add any other state and handlers that were previously misplaced here
  // ...existing code...

  const calculateDue = (total: string, paid: string) => {
    const totalValue = Number(total);
    const paidValue = Number(paid);
    if (total.trim() === "" || paid.trim() === "" || Number.isNaN(totalValue) || Number.isNaN(paidValue)) return "";
    return (totalValue - paidValue).toFixed(2);
  };

  useEffect(() => {
    fetch("/api/suppliers", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSuppliers(data.map((s: Supplier) => ({ ...s, totalPaid: s.totalPaid ?? 0 })));
        }
      });
  }, []);

  useEffect(() => {
    if (!requestedPaymentSupplierId) return;

    const matchedSupplier = suppliers.find((supplier) => supplier._id === requestedPaymentSupplierId);
    if (!matchedSupplier) return;

    setPaymentSupplierId(matchedSupplier._id);
    setShowPaymentPopup(true);
  }, [requestedPaymentSupplierId, suppliers]);

  const totalSalt = suppliers.reduce((sum, supplier) => sum + (supplier.saltAmount ?? 0), 0);
  const totalDue = suppliers.reduce((sum, supplier) => sum + (supplier.totalDue ?? 0), 0);
  const totalPaid = suppliers.reduce((sum, supplier) => sum + (supplier.totalPaid ?? 0), 0);
  const totalAmount = suppliers.reduce(
    (sum, supplier) => sum + (supplier.totalPurchaseAmount ?? (supplier.totalPaid ?? 0) + (supplier.totalDue ?? 0)),
    0
  );
  const firstSupplierId = suppliers[0]?._id;

  const currentPurchaseDate = new Date().toISOString();

  const handleBuySubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBuyStatus(null);
    setBuyPopupMessage("");

    if (!supplierName.trim()) {
      setBuyStatus({ type: "error", message: "Supplier name is required." });
      return;
    }

    const selectedSupplier = suppliers.find(
      (supplier) => supplier.name?.toLowerCase().trim() === supplierName.trim().toLowerCase()
    );

    if (!selectedSupplier) {
      setBuyPopupMessage("Supplier not found.");
      return;
    }

    const quantity = Number(buySaltQuantity);
    const price = Number(buyPricePerMaund);
    const total = Number(buyTotalPrice);
    const paidValue = Number(buyPaid);

    if (Number.isNaN(quantity) || quantity < 0) {
      setBuyStatus({ type: "error", message: "Salt quantity must be a non-negative number." });
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      setBuyStatus({ type: "error", message: "Price per Maund must be a non-negative number." });
      return;
    }
    if (Number.isNaN(total) || total < 0) {
      setBuyStatus({ type: "error", message: "Total price must be a non-negative number." });
      return;
    }
    if (Number.isNaN(paidValue) || paidValue < 0) {
      setBuyStatus({ type: "error", message: translate(language, "paidAmountNonNegative") });
      return;
    }
    if (paidValue > total) {
      setBuyStatus({ type: "error", message: translate(language, "paidAmountCannotExceedTotal") });
      return;
    }

    const purchaseDate = new Date().toISOString();

    // Call new API to record purchase and update supplier
    fetch("/api/suppliers/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        supplierId: selectedSupplier?._id,
        supplierName: supplierName.trim(),
        saltAmount: quantity,
        totalPrice: total,
        paid: paidValue,
        date: purchaseDate,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json();
          setBuyStatus({ type: "error", message: data?.message || "Failed to record purchase." });
          return;
        }
        setBuyStatus({ type: "success", message: translate(language, "purchaseRecordedSuccessfully") });
        // Refresh supplier list
        fetch("/api/suppliers", { cache: "no-store" })
          .then((res) => res.json())
          .then((data) => {
            if (Array.isArray(data)) {
              setSuppliers(data.map((s: Supplier) => ({ ...s, totalPaid: s.totalPaid ?? 0 })));
            }
          });
        setSupplierName("");
        setBuySaltQuantity("");
        setBuyPricePerMaund("");
        setBuyTotalPrice("");
        setBuyPaid("");
        setBuyDue("");
      })
      .catch(() => {
        setBuyStatus({ type: "error", message: translate(language, "failedToRecordPurchase") });
      });
  };

  const handleAddSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const trimmedPhone = phone.trim();
    if (!isValidPhone(trimmedPhone)) {
      setError(translate(language, "phoneMustBe11Digits"));
      setIsSubmitting(false);
      return;
    }

    const trimmedAddress = address.trim();
    if (!trimmedAddress) {
      setError(translate(language, "addressRequired"));
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: trimmedPhone,
          address: trimmedAddress,
        }),
      });

      const responseBody = await response.text();
      const data = responseBody ? JSON.parse(responseBody) : null;

      if (!response.ok) {
        setError(data?.message || translate(language, "unableToAddSupplier"));
        return;
      }

      if (data?._id) {
        setSuppliers((prev) => [...prev, { ...data, totalPaid: data.totalPaid ?? 0 }] as Supplier[]);
        setName("");
        setPhone("");
        setAddress("");
        setShowForm(false);
      }
    } catch {
      setError(translate(language, "unableToAddSupplier"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900">{translate(language, "suppliers")}</h1>
          <p className="mt-2 text-slate-500">{translate(language, "supplierSummary")}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex w-full items-center justify-center rounded-full bg-[#0077cc] px-5 py-3 text-base font-semibold text-white shadow hover:bg-[#005ea3] sm:w-auto"
          >
            {showForm ? translate(language, "cancel") : translate(language, "addSupplier")}
          </button>
          {firstSupplierId ? (
            <Link
              href={`/suppliers/${firstSupplierId}`}
              className="inline-flex w-full items-center justify-center rounded-full bg-[#003366] px-5 py-3 text-sm font-semibold text-white shadow hover:bg-[#022749] sm:w-auto"
            >
              {translate(language, "viewLatestSupplier")}
            </Link>
          ) : null}
        </div>
      </div>

      {showForm && (
        <div className="rounded-md bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">{translate(language, "newSupplier")}</h2>
          <form className="mt-5 space-y-4" onSubmit={handleAddSupplier}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-base text-slate-600">{translate(language, "nameLabel")}</span>
                <input
                  name="supplierName"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base"
                  placeholder={translate(language, "supplierNameLabel")}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-base text-slate-600">{translate(language, "phoneLabelShort")}</span>
                <input
                  name="supplierPhone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base"
                  placeholder={translate(language, "phoneLabelShort")}
                  maxLength={11}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-base text-slate-600">{translate(language, "addressLabelShort")}</span>
                <input
                  name="supplierAddress"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base"
                  placeholder={translate(language, "addressLabelShort")}
                  required
                />
              </label>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-[#003366] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#022749] disabled:opacity-50 sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? translate(language, "addingEllipsis") : translate(language, "addSupplier")}
            </button>
          </form>
        </div>
      )}

      <div className="rounded-md bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">{translate(language, "newPurchaseEntry")}</h2>
        <p className="mt-2 text-xs text-slate-500">{translate(language, "recordSupplierPurchase")}</p>
        <p className="mt-2 text-xs text-slate-500">Date: {new Date(currentPurchaseDate).toLocaleDateString("en-GB")}</p>

        <form onSubmit={handleBuySubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <label className="block">
              <span className="text-base font-medium text-slate-700">{translate(language, "supplierNameLabel")}</span>
              <input
                name="purchaseSupplierName"
                list="supplierNames"
                value={supplierName}
                onChange={(event) => setSupplierName(event.target.value)}
                placeholder={translate(language, "supplierNameLabel")}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              />
              <datalist id="supplierNames">
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier.name || ""} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="text-base font-medium text-slate-700">{translate(language, "totalMaund")}</span>
              <input
                name="purchaseTotalMaund"
                value={buySaltQuantity}
                onChange={(event) => {
                  const value = event.target.value;
                  setBuySaltQuantity(value);
                  const updatedTotal = calculateTotalPrice(value, buyPricePerMaund);
                  setBuyTotalPrice(updatedTotal);
                  setBuyDue(calculateDue(updatedTotal, buyPaid));
                }}
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-base font-medium text-slate-700">{translate(language, "pricePerMaund")}</span>
              <input
                name="purchasePricePerMaund"
                value={buyPricePerMaund}
                onChange={(event) => {
                  const value = event.target.value;
                  setBuyPricePerMaund(value);
                  const updatedTotal = calculateTotalPrice(buySaltQuantity, value);
                  setBuyTotalPrice(updatedTotal);
                  setBuyDue(calculateDue(updatedTotal, buyPaid));
                }}
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              />
            </label>
            
            <label className="block">
              <span className="text-base font-medium text-slate-700">{translate(language, "totalPriceTk")}</span>
              <input
                name="purchaseTotalPrice"
                value={buyTotalPrice}
                readOnly
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-900 outline-none"
              />
            </label>
            <label className="block">
              <span className="text-base font-medium text-slate-700">{translate(language, "paidAmount")}</span>
              <input
                name="purchasePaidAmount"
                value={buyPaid}
                onChange={(event) => {
                  const value = event.target.value;
                  setBuyPaid(value);
                  setBuyDue(calculateDue(buyTotalPrice, value));
                }}
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-base font-medium text-slate-700">{translate(language, "dueAmount")}</span>
              <input
                name="purchaseDueAmount"
                value={buyDue}
                readOnly
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-900 outline-none"
              />
            </label>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
            >
              Save purchase entry
            </button>
            {buyStatus ? (
              <p className={`text-sm ${buyStatus.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                {buyStatus.message}
              </p>
            ) : null}
          </div>
        </form>

        {buyPopupMessage ? (
          <ModalShell
          title={translate(language, "supplierAlert")}
          description={translate(language, "reviewMessageBeforeContinuing")}
            tone="amber"
            widthClassName="max-w-md"
            onClose={() => setBuyPopupMessage("")}
            footer={
              <button
                type="button"
                onClick={() => setBuyPopupMessage("")}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {translate(language, "close")}
              </button>
            }
          >
            <div className="rounded-3xl border border-amber-100 bg-amber-50/70 px-4 py-4 text-sm leading-6 text-slate-700">
              {buyPopupMessage}
            </div>
          </ModalShell>
        ) : null}
      </div>

      {/* Payment Now Button */}
      <div className="mb-4 flex justify-stretch sm:justify-end">
        <button
          className="w-full rounded-lg bg-blue-600 px-6 py-2 text-base font-semibold text-white shadow hover:bg-blue-700 sm:w-auto"
          onClick={() => setShowPaymentPopup(true)}
        >
          {translate(language, "paymentNow")}
        </button>
      </div>

      {/* Payment Popup */}
      {showPaymentPopup && (
        <ModalShell
          title={translate(language, "recordSupplierPayment")}
          description={translate(language, "captureSupplierPaymentDescription")}
          tone="sky"
          widthClassName="max-w-xl"
          onClose={closePaymentPopup}
        >
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{translate(language, "selectSupplier")}</span>
                <input
                  name="paymentSupplier"
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                  list="paymentSupplierList"
                  value={
                    paymentSupplierId
                      ? suppliers.find((s) => s._id === paymentSupplierId)?.name || ""
                      : ""
                  }
                  onChange={(e) => {
                    if (isProfilePaymentFlow) return;
                    const name = e.target.value;
                    const found = suppliers.find((s) => s.name === name);
                    setPaymentSupplierId(found ? found._id : null);
                  }}
                  placeholder="Type or select supplier"
                  readOnly={isProfilePaymentFlow}
                  aria-readonly={isProfilePaymentFlow}
                  required
                />
                {isProfilePaymentFlow ? null : (
                  <datalist id="paymentSupplierList">
                    {suppliers.map((s) => (
                      <option key={s._id} value={s.name || ""} />
                    ))}
                  </datalist>
                )}
              </label>

              <CompactDateInput
                name="supplierPaymentDate"
                label={translate(language, "paymentDate")}
                value={paymentDate}
                onChange={setPaymentDate}
                max={new Date().toISOString().split("T")[0]}
                required
                inputClassName="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">{translate(language, "paidAmount")}</span>
              <input
                name="supplierPaymentAmount"
                type="number"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="1"
                required
              />
            </label>

            {paymentError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {paymentError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={closePaymentPopup}
              >
                {translate(language, "cancel")}
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-sky-600 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-sky-700"
              >
                {translate(language, "savePayment")}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      <div className="overflow-x-auto rounded-md bg-white p-4 shadow-sm">
        <table className="w-full text-left">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3">{translate(language, "supplierNameLabel")}</th>
              <th className="px-4 py-3">{translate(language, "phoneLabelShort")}</th>
              <th className="px-4 py-3">{translate(language, "saleStock")}</th>
              <th className="px-4 py-3">{translate(language, "totalSalesLabel")}</th>
              <th className="px-4 py-3">{translate(language, "totalReceived")}</th>
              <th className="px-4 py-3">{translate(language, "totalDue")}</th>
              <th className="px-4 py-3">{translate(language, "action")}</th>
              <th className="px-4 py-3">{translate(language, "printInvoice")}</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  {translate(language, "noSupplierTransactions")}
                </td>
              </tr>
            ) : (
              <>
                {suppliers.map((supplier, index) => (
                  <tr key={supplier._id} className={`border-b border-slate-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-4 text-slate-800">{formatDisplayName(supplier.name, "Unnamed supplier")}</td>
                    <td className="px-4 py-4 text-slate-600">{supplier.phone || "-"}</td>
                    <td className="px-4 py-4 text-slate-600">{formatAmount(supplier.saltAmount ?? 0)}</td>
                    <td className="px-4 py-4 text-slate-600">Tk {formatAmount(supplier.totalPurchaseAmount ?? (supplier.totalPaid ?? 0) + (supplier.totalDue ?? 0))}</td>
                    <td className="px-4 py-4 text-slate-600">Tk {formatAmount(supplier.totalPaid ?? 0)}</td>
                    <td className="px-4 py-4 text-slate-600">Tk {formatAmount(supplier.totalDue ?? 0)}</td>
                    <td className="px-4 py-4">
                      <Link href={`/suppliers/${supplier._id}`} className="text-[#003366] font-medium hover:underline">
                        {translate(language, "view")}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        onClick={() => {
                          const invoiceWindow = window.open(`/invoices/suppliers/${supplier._id}`, '_blank');
                          invoiceWindow?.addEventListener('load', () => {
                            invoiceWindow.print();
                          });
                        }}
                        style={{
                          cursor: 'pointer',
                          color: '#059669',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: 500
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                        onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
                      >
                        {translate(language, "print")}
                      </span>
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800">
                  <td className="px-4 py-4">{translate(language, "totals")}</td>
                  <td className="px-4 py-4"></td>
                  <td className="px-4 py-4">{formatAmount(totalSalt)}</td>
                  <td className="px-4 py-4">Tk {formatAmount(totalAmount)}</td>
                  <td className="px-4 py-4">Tk {formatAmount(totalPaid)}</td>
                  <td className="px-4 py-4">Tk {formatAmount(totalDue)}</td>
                  <td className="px-4 py-4"></td>
                  <td className="px-4 py-4"></td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}





