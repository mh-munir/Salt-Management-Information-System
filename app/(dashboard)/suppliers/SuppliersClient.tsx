"use client";

import { FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import ActionDropdown from "@/components/ActionDropdown";
import LoadMoreTable from "@/components/LoadMoreTable";
import ModalShell from "@/components/ModalShell";
import CompactDateInput from "@/components/CompactDateInput";
import FloatingInput from "@/components/FloatingInput";
import { getBalanceSummary } from "@/lib/balance";
import { translate } from "@/lib/language";
import { emitTransactionsUpdated } from "@/lib/live-updates";
import { normalizeLocalizedDigits } from "@/lib/number-input";
import { compareByLatestInput } from "@/lib/record-order";
import type { SupplierListItem } from "@/lib/suppliers-data";
import { useLanguage } from "@/lib/useLanguage";
import { formatDisplayName, formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";

type Supplier = SupplierListItem;

const sortSuppliersByLatestInput = (items: Supplier[]) =>
  [...items].sort((left, right) =>
    compareByLatestInput(
      { id: left._id, date: left.lastActivityAt },
      { id: right._id, date: right.lastActivityAt }
    )
  );

const getLocalDateInputValue = () => {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().split("T")[0];
};

const getDateKey = (value?: string | Date | number | null) => {
  if (!value && value !== 0) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().split("T")[0];
};

type SuppliersClientProps = {
  initialData: Supplier[];
};

export default function SuppliersClient({ initialData }: SuppliersClientProps) {
  const { language } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const getPrintDateLabel = (value?: string) => formatLocalizedDate(value || new Date(), language);
  const formatAmount = (value: number, maximumFractionDigits = 2) =>
    formatLocalizedNumber(value, language, { maximumFractionDigits });
  const getEditorRoleLabel = (role?: string) => (role === "superadmin" ? "Super Admin" : "Admin");
  const getEditedByText = (item: Pick<Supplier, "editedByName" | "editedByRole">) => {
    const name = item.editedByName?.trim();
    const role = item.editedByRole?.trim();
    if (!name && !role) return translate(language, "notEditedYet");

    const roleLabel = getEditorRoleLabel(role);
    if (!name) return roleLabel;

    return `${name} (${roleLabel})`;
  };
  const formatBalanceText = (value: number) => {
    const balance = getBalanceSummary(value);
    if (balance.isAdvance) {
      return `${translate(language, "advanceBalance")} Tk ${formatAmount(balance.absoluteAmount)}`;
    }

    return `Tk ${formatAmount(balance.absoluteAmount)}`;
  };
  const formatTableBalanceStatus = (value: number) => {
    const balance = getBalanceSummary(value);
    if (balance.absoluteAmount === 0) return "0";

    if (balance.isAdvance) {
      return `${language === "bn" ? "অগ্রিম" : "Advance"} Tk ${formatAmount(balance.absoluteAmount)}`;
    }

    return `Tk ${formatAmount(balance.absoluteAmount)}`;
  };
  const getBalanceClassName = (value: number) =>
    getBalanceSummary(value).isAdvance ? "text-sky-600" : "text-rose-600";

        // Supplier form state
        const [name, setName] = useState("");
        const [phone, setPhone] = useState("");
        const [address, setAddress] = useState("");
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [error, setError] = useState("");

        // Helper: phone validation
        function isValidPhone(phone: string) {
          return /^\d{11}$/.test(normalizeLocalizedDigits(phone).trim());
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
          setPaymentDate(getLocalDateInputValue());
          setPaymentError("");
          if (requestedPaymentSupplierId) {
            router.replace(profileReturnPath ?? pathname, { scroll: false });
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
          refreshSuppliers();
          emitTransactionsUpdated();

          // optionally keep the selected supplier updated in UI
          setPaymentSupplierId(updatedSupplier._id);
          closePaymentPopup();
          toast.success("Payment Successful");
        }
      const [showPaymentPopup, setShowPaymentPopup] = useState(false);
      const [paymentSupplierId, setPaymentSupplierId] = useState<string | null>(null);
      const [paymentAmount, setPaymentAmount] = useState("");
      const [paymentDate, setPaymentDate] = useState(getLocalDateInputValue());
      const [paymentError, setPaymentError] = useState("");
      const requestedPaymentSupplierId = searchParams.get("paymentId");
      const returnTo = searchParams.get("returnTo");
      const isProfilePaymentFlow = Boolean(requestedPaymentSupplierId);
      const profileReturnPath = returnTo?.startsWith("/suppliers/") ? returnTo : null;
    const [suppliers, setSuppliers] = useState<Supplier[]>(() =>
      sortSuppliersByLatestInput(initialData.map((supplier) => ({ ...supplier, totalPaid: supplier.totalPaid ?? 0 })))
    );
  const [showForm, setShowForm] = useState(false);
  const [supplierName, setSupplierName] = useState("");
  const [buySaltQuantity, setBuySaltQuantity] = useState("");
  const [buyPricePerMaund, setBuyPricePerMaund] = useState("");
  const [buyTotalPrice, setBuyTotalPrice] = useState("");
  const [buyPaid, setBuyPaid] = useState("");
  const [buyDue, setBuyDue] = useState("");
  const [buyStatus, setBuyStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [buyPopupMessage, setBuyPopupMessage] = useState("");
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editTarget, setEditTarget] = useState<Supplier | null>(null);
  const [editName, setEditName] = useState("");
  const [editSaltAmount, setEditSaltAmount] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [tableFilterDate, setTableFilterDate] = useState("");

  // Add any other state and handlers that were previously misplaced here
  // ...existing code...

  const calculateDue = (total: string, paid: string) => {
    const totalValue = Number(total);
    const paidValue = Number(paid);
    if (total.trim() === "" || paid.trim() === "" || Number.isNaN(totalValue) || Number.isNaN(paidValue)) return "";
    return (totalValue - paidValue).toFixed(2);
  };

  const refreshSuppliers = () =>
    fetch("/api/suppliers", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setSuppliers(sortSuppliersByLatestInput(data.map((s: Supplier) => ({ ...s, totalPaid: s.totalPaid ?? 0 }))));
        }
      });

  useEffect(() => {
    if (!requestedPaymentSupplierId) return;

    const matchedSupplier = suppliers.find((supplier) => supplier._id === requestedPaymentSupplierId);
    if (!matchedSupplier) return;

    setPaymentSupplierId(matchedSupplier._id);
    setShowPaymentPopup(true);
  }, [requestedPaymentSupplierId, suppliers]);

  const filteredSuppliers = useMemo(
    () => (tableFilterDate ? suppliers.filter((supplier) => getDateKey(supplier.lastActivityAt) === tableFilterDate) : suppliers),
    [suppliers, tableFilterDate]
  );
  const deferredFilteredSuppliers = useDeferredValue(filteredSuppliers);
  const totalSalt = deferredFilteredSuppliers.reduce((sum, supplier) => sum + (supplier.saltAmount ?? 0), 0);
  const totalDue = deferredFilteredSuppliers.reduce((sum, supplier) => sum + (supplier.totalDue ?? 0), 0);
  const totalPaid = deferredFilteredSuppliers.reduce((sum, supplier) => sum + (supplier.totalPaid ?? 0), 0);
  const totalAmount = deferredFilteredSuppliers.reduce(
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
      toast.error("Supplier name is required and must match an existing supplier.");
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
        refreshSuppliers();
        emitTransactionsUpdated();
        setSupplierName("");
        setBuySaltQuantity("");
        setBuyPricePerMaund("");
        setBuyTotalPrice("");
        setBuyPaid("");
        setBuyDue("");
        toast.success("Purchase Recorded Successfully");
      })
      .catch(() => {
        setBuyStatus({ type: "error", message: translate(language, "failedToRecordPurchase") });
      });
  };

  const handleAddSupplier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const trimmedName = name.trim();
    const trimmedPhone = normalizeLocalizedDigits(phone).trim();
    if (!trimmedName) {
      setError("Name is required.");
      setIsSubmitting(false);
      return;
    }

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
      await createSupplier(trimmedName, trimmedPhone, trimmedAddress);
    } catch {
      setError(translate(language, "unableToAddSupplier"));
      setIsSubmitting(false);
    }
  };

  const createSupplier = async (supplierName: string, supplierPhone: string, supplierAddress: string) => {
    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: supplierName,
          phone: supplierPhone,
          address: supplierAddress,
        }),
      });

      const responseBody = await response.text();
      const data = responseBody ? JSON.parse(responseBody) : null;

      if (!response.ok) {
        const errorMessage = data?.message || translate(language, "unableToAddSupplier");
        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      if (data?._id) {
        setSuppliers((prev) =>
          sortSuppliersByLatestInput([...prev, { ...data, totalPaid: data.totalPaid ?? 0 }] as Supplier[])
        );
        setName("");
        setPhone("");
        setAddress("");
        setShowForm(false);
        toast.success("Supplier Added Successfully");
      }
    } catch {
      setError(translate(language, "unableToAddSupplier"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditPopup = (supplier: Supplier) => {
    if (!supplier.latestPurchaseId) return;

    setEditTarget(supplier);
    setEditName(supplier.name ?? "");
    setEditSaltAmount(supplier.latestPurchaseSaltAmount ? supplier.latestPurchaseSaltAmount.toFixed(2) : "0");
    setEditPrice(supplier.latestPricePerMaund ? supplier.latestPricePerMaund.toFixed(2) : "");
    setEditError("");
    setShowEditPopup(true);
  };

  const closeEditPopup = () => {
    setShowEditPopup(false);
    setEditTarget(null);
    setEditName("");
    setEditSaltAmount("");
    setEditPrice("");
    setEditError("");
    setIsSavingEdit(false);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editTarget?.latestPurchaseId) {
      setEditError("No purchase record found for this supplier.");
      return;
    }

    const nextPrice = Number(editPrice);
    const nextSaltAmount = Number(editSaltAmount);
    const nextName = editName.trim();

    if (!nextName) {
      setEditError("Enter a supplier name.");
      return;
    }

    if (editSaltAmount.trim() === "" || Number.isNaN(nextSaltAmount) || nextSaltAmount < 0) {
      setEditError("Enter a valid salt amount.");
      return;
    }

    if (editPrice.trim() === "" || Number.isNaN(nextPrice) || nextPrice < 0) {
      setEditError("Enter a valid price per Maund.");
      return;
    }

    setIsSavingEdit(true);
    setEditError("");

    try {
      const response = await fetch(`/api/suppliers/${editTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit-price",
          transactionId: editTarget.latestPurchaseId,
          supplierName: nextName,
          saltAmount: nextSaltAmount,
          pricePerMaund: nextPrice,
        }),
      });

      const responseBody = await response.text();
      const data = responseBody ? JSON.parse(responseBody) : null;

      if (!response.ok) {
        setEditError(data?.message ?? "Failed to update price.");
        return;
      }

      await refreshSuppliers();
      emitTransactionsUpdated();
      closeEditPopup();
    } catch {
      setEditError("Failed to update price.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const supplierRows = useMemo(
    () =>
      deferredFilteredSuppliers.map((supplier, index) => (
        <tr key={supplier._id} className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
          <td className="px-4 py-4 text-slate-800">{formatDisplayName(supplier.name, "Unnamed supplier")}</td>
          <td className="print-table-hidden px-4 py-4 text-center text-slate-600">{formatAmount(supplier.saltAmount ?? 0)}</td>
          <td className="px-4 py-4 text-center text-slate-600">Tk {formatAmount(supplier.totalPurchaseAmount ?? (supplier.totalPaid ?? 0) + (supplier.totalDue ?? 0))}</td>
          <td className="px-4 py-4 text-center text-slate-600">Tk {formatAmount(supplier.totalPaid ?? 0)}</td>
          <td className={`px-4 py-4 text-center ${getBalanceClassName(supplier.totalDue ?? 0)}`}>
            {formatTableBalanceStatus(supplier.totalDue ?? 0)}
          </td>
          <td className="print-table-hidden px-4 py-4 text-center text-slate-600">
            {supplier.latestPurchaseId ? (
              <div className="flex flex-col items-center gap-1">
                <span>Tk {formatAmount(supplier.latestPricePerMaund ?? 0, 2)}</span>
                <span className="text-xs text-slate-400">
                  {formatLocalizedDate(supplier.editedAt ?? supplier.latestPurchaseDate ?? undefined, language)}
                </span>
              </div>
            ) : (
              "-"
            )}
          </td>
          <td className="print-table-hidden px-4 py-4 text-center">
            <span className="inline-flex rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {getEditedByText(supplier)}
            </span>
          </td>
          <td className="print-table-hidden px-4 py-4 text-center">
            <ActionDropdown
              viewHref={`/suppliers/${supplier._id}`}
              onEdit={() => openEditPopup(supplier)}
              onPrint={() => {
                const invoiceWindow = window.open(`/invoices/suppliers/${supplier._id}`, "_blank");
                invoiceWindow?.addEventListener("load", () => {
                  invoiceWindow.print();
                });
              }}
              canEdit={!!supplier.latestPurchaseId}
              language={language}
            />
          </td>
        </tr>
      )),
    [deferredFilteredSuppliers, formatAmount, getEditedByText, language]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{translate(language, "suppliers")}</h1>
          <p className="mt-2 text-slate-500">{translate(language, "supplierSummary")}</p>
        </div>
        <div className="print-hidden flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#0077cc] px-5 py-3 text-base font-semibold text-white shadow hover:bg-[#005ea3] sm:w-auto"
          >
            {showForm ? translate(language, "cancel") : translate(language, "addSupplier")}
          </button>
          {firstSupplierId ? (
            <Link
              href={`/suppliers/${firstSupplierId}`}
              className="inline-flex w-full items-center justify-center rounded-lg bg-[#0077cc] px-5 py-3 text-base font-semibold text-white shadow hover:bg-[#005ea3] sm:w-auto"
            >
              {translate(language, "viewLatestSupplier")}
            </Link>
          ) : null}
        </div>
      </div>

      {showForm && (
        <div className="print-hidden rounded-lg bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">{translate(language, "newSupplier")}</h2>
          <form className="mt-5 space-y-4" onSubmit={handleAddSupplier}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FloatingInput
                name="supplierName"
                label={translate(language, "supplierNameLabel")}
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="off"
                inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                labelClassName="bg-slate-50 text-slate-500"
              />
              <FloatingInput
                name="supplierPhone"
                label={translate(language, "phoneLabelShort")}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={11}
                required
                autoComplete="off"
                inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                labelClassName="bg-slate-50 text-slate-500"
              />
              <FloatingInput
                name="supplierAddress"
                label={translate(language, "addressLabelShort")}
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                required
                autoComplete="off"
                inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                labelClassName="bg-slate-50 text-slate-500"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-lg bg-[#0077cc] px-5 py-3 text-base font-semibold text-white shadow hover:bg-[#005ea3] sm:w-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? translate(language, "addingEllipsis") : translate(language, "addSupplier")}
            </button>
          </form>
        </div>
      )}

      <div className="print-hidden rounded-lg bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">{translate(language, "newPurchaseEntry")}</h2>
        <p className="mt-2 text-xs text-slate-500">{translate(language, "recordSupplierPurchase")}</p>
        <p className="mt-2 text-xs text-slate-500">Date: {new Date(currentPurchaseDate).toLocaleDateString("en-GB")}</p>

        <form onSubmit={handleBuySubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <FloatingInput
              name="purchaseSupplierName"
              list="supplierNames"
              label={translate(language, "supplierNameLabel")}
              value={supplierName}
              onChange={(event) => setSupplierName(event.target.value)}
              autoComplete="off"
              inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              labelClassName="bg-slate-50 text-slate-500"
            />
              <datalist id="supplierNames">
                {suppliers.map((supplier) => (
                  <option key={supplier._id} value={supplier.name || ""} />
                ))}
              </datalist>
            <FloatingInput
              name="purchaseTotalMaund"
              type="number"
              step="1"
              min="0"
              label={translate(language, "totalMaund")}
              value={buySaltQuantity}
              onChange={(event) => {
                const value = event.target.value;
                setBuySaltQuantity(value);
                const updatedTotal = calculateTotalPrice(value, buyPricePerMaund);
                setBuyTotalPrice(updatedTotal);
                setBuyDue(calculateDue(updatedTotal, buyPaid));
              }}
              autoComplete="off"
              inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              labelClassName="bg-slate-50 text-slate-500"
            />
            <FloatingInput
              name="purchasePricePerMaund"
              type="number"
              step="1"
              min="0"
              label={translate(language, "pricePerMaund")}
              value={buyPricePerMaund}
              onChange={(event) => {
                const value = event.target.value;
                setBuyPricePerMaund(value);
                const updatedTotal = calculateTotalPrice(buySaltQuantity, value);
                setBuyTotalPrice(updatedTotal);
                setBuyDue(calculateDue(updatedTotal, buyPaid));
              }}
              autoComplete="off"
              inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              labelClassName="bg-slate-50 text-slate-500"
            />
            <FloatingInput
              name="purchaseTotalPrice"
              type="number"
              step="1"
              min="0"
              label={translate(language, "totalPriceTk")}
              value={buyTotalPrice}
              readOnly
              inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              labelClassName="bg-slate-50 text-slate-500"
            />
            <FloatingInput
              name="purchasePaidAmount"
              type="number"
              step="1"
              min="0"
              label={translate(language, "paidAmount")}
              value={buyPaid}
              onChange={(event) => {
                const value = event.target.value;
                setBuyPaid(value);
                setBuyDue(calculateDue(buyTotalPrice, value));
              }}
              inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              labelClassName="bg-slate-50 text-slate-500"
            />
            <FloatingInput
              name="purchaseDueAmount"
              type="number"
              step="1"
              label={translate(language, "dueAmount")}
              value={buyDue}
              readOnly
              inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              labelClassName="bg-slate-50 text-slate-500"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-lg bg-[#348CD4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2F7FC0] sm:w-auto"
            >
              {translate(language, "savePurchaseEntry")}
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
                className="inline-flex items-center justify-center rounded-lg bg-[#348CD4] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2F7FC0]"
              >
                {translate(language, "close")}
              </button>
            }
          >
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {buyPopupMessage}
            </div>
          </ModalShell>
        ) : null}
      </div>

      {/* Payment Now Button */}
      <div className="print-hidden mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-[15rem]">
          <CompactDateInput
            name="supplierTableFilterDate"
            label={translate(language, "dateLabel")}
            value={tableFilterDate}
            onChange={setTableFilterDate}
            max={getLocalDateInputValue()}
            inputClassName="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
          />
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          {tableFilterDate ? (
            <button
              type="button"
              onClick={() => setTableFilterDate("")}
              className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow hover:bg-slate-50 sm:w-auto"
            >
              {translate(language, "cancel")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#348CD4] px-5 py-3 text-sm font-semibold text-white shadow hover:bg-[#2F7FC0] sm:w-auto"
          >
            {translate(language, "printSupplierList")}
          </button>
          <button
            className="w-full rounded-lg bg-[#348CD4] px-6 py-3 text-base font-semibold text-white shadow hover:bg-[#2F7FC0] sm:w-auto"
            onClick={() => setShowPaymentPopup(true)}
          >
            {translate(language, "paymentNow")}
          </button>
        </div>
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
              <div>
                <FloatingInput
                  name="paymentSupplier"
                  list="paymentSupplierList"
                  label={translate(language, "selectSupplier")}
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
                  readOnly={isProfilePaymentFlow}
                  aria-readonly={isProfilePaymentFlow}
                  required
                  autoComplete="off"
                  inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                  labelClassName="bg-slate-50 text-slate-500"
                />
                {isProfilePaymentFlow ? null : (
                  <datalist id="paymentSupplierList">
                    {suppliers.map((s) => (
                      <option key={s._id} value={s.name || ""} />
                    ))}
                  </datalist>
                )}
              </div>

              <CompactDateInput
                name="supplierPaymentDate"
                label={translate(language, "paymentDate")}
                value={paymentDate}
                onChange={setPaymentDate}
                max={getLocalDateInputValue()}
                required
                inputClassName="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </div>

            <FloatingInput
              name="supplierPaymentAmount"
              type="number"
              min="1"
              label={translate(language, "paidAmount")}
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              required
              inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              labelClassName="bg-slate-50 text-slate-500"
            />

            {paymentSupplierId ? (
              <div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-700">
                {translate(language, "balanceLabel")}:{" "}
                <span className={getBalanceClassName(suppliers.find((s) => s._id === paymentSupplierId)?.totalDue ?? 0)}>
                  {formatBalanceText(suppliers.find((s) => s._id === paymentSupplierId)?.totalDue ?? 0)}
                </span>
              </div>
            ) : null}

            {paymentError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {paymentError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={closePaymentPopup}
              >
                {translate(language, "cancel")}
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-lg bg-[#348CD4] px-5 py-2.5 text-base font-semibold text-white transition hover:bg-[#2F7FC0]"
              >
                {translate(language, "savePayment")}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {showEditPopup && editTarget ? (
        <ModalShell
          title={translate(language, "editSupplierPriceTitle")}
          description={translate(language, "editSupplierPriceDescription")}
          tone="sky"
          widthClassName="max-w-lg"
          onClose={closeEditPopup}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{formatDisplayName(editTarget.name, "Unnamed supplier")}</p>
              <p className="mt-1">Current salt amount: {formatAmount(editTarget.latestPurchaseSaltAmount ?? 0, 2)} Maund</p>
              <p className="mt-1">Current price: Tk {formatAmount(editTarget.latestPricePerMaund ?? 0, 2)} per Maund</p>
              <p className="mt-1 text-xs text-slate-500">{getEditedByText(editTarget)}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <FloatingInput
                name="editSupplierName"
                type="text"
                label={translate(language, "supplierNameLabel")}
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                required
                autoComplete="off"
                containerClassName="sm:col-span-3"
                inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                labelClassName="bg-slate-50 text-slate-500"
              />

              <FloatingInput
                name="editSupplierSaltAmount"
                type="number"
                step="0.01"
                min="0"
                label={translate(language, "saltQuantityLabel")}
                value={editSaltAmount}
                onChange={(e) => setEditSaltAmount(e.target.value)}
                required
                inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                labelClassName="bg-slate-50 text-slate-500"
              />

              <FloatingInput
                name="editSupplierPrice"
                type="number"
                step="1"
                min="0"
                label={translate(language, "pricePerMaund")}
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                required
                containerClassName="sm:col-span-2"
                inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                labelClassName="bg-slate-50 text-slate-500"
              />
            </div>

            {editError ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {editError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={closeEditPopup}
              >
                {translate(language, "cancel")}
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="inline-flex items-center justify-center rounded-lg bg-[#348CD4] px-5 py-2.5 text-base font-semibold text-white transition hover:bg-[#2F7FC0] disabled:opacity-60"
              >
                {isSavingEdit ? translate(language, "updating") : translate(language, "updateDetails")}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      <div className="print-list-shell overflow-x-auto rounded-lg bg-white p-4 shadow-sm">
        <div className="print-only border-b border-slate-200 px-4 py-4">
          <h2 className="text-xl font-semibold text-slate-900">{translate(language, "printSupplierList")}</h2>
          <p className="mt-1 text-sm text-slate-500">Date: {getPrintDateLabel(tableFilterDate)}</p>
        </div>
        <table className="min-w-[60rem] w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-sm text-slate-500">
            <tr>
              <th className="px-4 py-3">{translate(language, "supplierNameLabel")}</th>
              <th className="print-table-hidden px-4 py-3 text-center">{translate(language, "saleStock")}</th>
              <th className="px-4 py-3 text-center">{translate(language, "totalSalesLabel")}</th>
              <th className="px-4 py-3 text-center">{translate(language, "totalReceived")}</th>
              <th className="px-4 py-3 text-center">{translate(language, "dueOrAdvance")}</th>
              <th className="print-table-hidden px-4 py-3 text-center">{translate(language, "pricePerMaund")}</th>
              <th className="print-table-hidden px-4 py-3 text-center">{translate(language, "editedBy")}</th>
              <th className="print-table-hidden px-4 py-3 text-center">{translate(language, "action")}</th>
            </tr>
          </thead>
          <tbody>
            <LoadMoreTable
              rows={supplierRows}
              colSpan={8}
              loadMoreLabel={language === "bn" ? "আরও দেখুন" : "Show more"}
              emptyState={
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    {translate(language, "noSupplierTransactions")}
                  </td>
                </tr>
              }
            />
            <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800">
                  <td className="px-4 py-4">{translate(language, "totals")}</td>
                  <td className="print-table-hidden px-4 py-4 text-center">{formatAmount(totalSalt)}</td>
                  <td className="px-4 py-4 text-center">Tk {formatAmount(totalAmount)}</td>
                  <td className="px-4 py-4 text-center">Tk {formatAmount(totalPaid)}</td>
                  <td className={`px-4 py-4 text-center ${getBalanceClassName(totalDue)}`}>{formatTableBalanceStatus(totalDue)}</td>
                  <td className="print-table-hidden px-4 py-4 text-center"></td>
                  <td className="print-table-hidden px-4 py-4 text-center"></td>
                  <td className="print-table-hidden px-4 py-4 text-center"></td>
              </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}





