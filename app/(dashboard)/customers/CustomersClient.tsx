"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import toast from "react-hot-toast";
import ActionDropdown from "@/components/ActionDropdown";
import LoadMoreTable from "@/components/LoadMoreTable";
import ModalShell from "@/components/ModalShell";
import CompactDateInput from "@/components/CompactDateInput";
import { getBalanceSummary } from "@/lib/balance";
import type { CustomerListItem } from "@/lib/customers-data";
import { translate } from "@/lib/language";
import { compareByLatestInput } from "@/lib/record-order";
import { useLanguage } from "@/lib/useLanguage";
import { formatDisplayName, formatLocalizedNumber } from "@/lib/display-format";

type Customer = CustomerListItem;

const sortCustomersByLatestInput = (items: Customer[]) =>
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

type CustomersClientProps = {
  initialData: Customer[];
};

export default function CustomersClient({ initialData }: CustomersClientProps) {
  const { language } = useLanguage();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const formatAmount = (value: number, maximumFractionDigits = 0) =>
    formatLocalizedNumber(value, language, { maximumFractionDigits });
  const getEditorRoleLabel = (role?: string) => (role === "superadmin" ? "Super Admin" : "Admin");
  const getEditedByText = (item: Pick<Customer, "editedByName" | "editedByRole">) => {
    const name = item.editedByName?.trim();
    const role = item.editedByRole?.trim();
    if (!name && !role) return "Not edited yet";

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
    getBalanceSummary(value).isAdvance ? "text-emerald-600" : "text-slate-600";
  const [customers, setCustomers] = useState<Customer[]>(() =>
    sortCustomersByLatestInput(initialData.map((customer) => ({ ...customer, totalPaid: customer.totalPaid ?? 0 })))
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [duplicateWarningMessage, setDuplicateWarningMessage] = useState("");
  const [pendingCustomerData, setPendingCustomerData] = useState<{
    name: string;
    phone: string;
    address: string;
  } | null>(null);
  const [saleCustomerName, setSaleCustomerName] = useState("");
  const [saleSaltQuantity, setSaleSaltQuantity] = useState("");
  const [salePricePerKg, setSalePricePerKg] = useState("");
  const [saleHockExtendedSack, setSaleHockExtendedSack] = useState("");
  const [saleTrackExpenses, setSaleTrackExpenses] = useState("");
  const [saleTotalPrice, setSaleTotalPrice] = useState("");
  const [salePaid, setSalePaid] = useState("");
  const [saleDue, setSaleDue] = useState("");
  const [saleStatus, setSaleStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [salePopupMessage, setSalePopupMessage] = useState("");
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [editError, setEditError] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Payment popup states
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [paymentCustomerId, setPaymentCustomerId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(getLocalDateInputValue());
  const [paymentError, setPaymentError] = useState("");
  const requestedPaymentCustomerId = searchParams.get("paymentId");
  const returnTo = searchParams.get("returnTo");
  const isProfilePaymentFlow = Boolean(requestedPaymentCustomerId);
  const profileReturnPath = returnTo?.startsWith("/customers/") ? returnTo : null;

  // Payment popup handlers
  function closePaymentPopup() {
    setShowPaymentPopup(false);
    setPaymentCustomerId(null);
    setPaymentAmount("");
    setPaymentDate(getLocalDateInputValue());
    setPaymentError("");
    if (requestedPaymentCustomerId) {
      router.replace(profileReturnPath ?? pathname, { scroll: false });
    }
  }

  // Payment submit handler
  async function handlePaymentSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPaymentError("");

    if (!paymentCustomerId) {
      setPaymentError(translate(language, "pleaseSelectCustomer"));
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

    const customer = customers.find((c) => c._id === paymentCustomerId);
    if (!customer) {
      setPaymentError(translate(language, "customerNotFound"));
      return;
    }

    const response = await fetch(`/api/customers/${paymentCustomerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "payment", paymentAmount: amount, date: paymentDate }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      setPaymentError(errorData?.message || translate(language, "unableToSavePayment"));
      return;
    }

    // Update local state
    refreshCustomers();

    closePaymentPopup();
    toast.success("Payment Successful");
  }

  const totalSalt = customers.reduce((sum, customer) => sum + (customer.saltAmount ?? 0), 0);
  const totalHockExtendedSack = customers.reduce((sum, customer) => sum + (customer.totalHockExtendedSack ?? 0), 0);
  const totalTrackExpenses = customers.reduce((sum, customer) => sum + (customer.totalTrackExpenses ?? 0), 0);
  const totalDue = customers.reduce((sum, customer) => sum + (customer.totalDue ?? 0), 0);
  const totalPaid = customers.reduce((sum, customer) => sum + (customer.totalPaid ?? 0), 0);
  const totalAmount = customers.reduce((sum, customer) => sum + (customer.totalSalesAmount ?? 0), 0);
  const firstCustomerId = customers[0]?._id;

  const isValidPhone = (value: string) => /^\d{11}$/.test(value);

  const parseJson = async (res: Response) => {
    if (!res.ok) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  };

  const refreshCustomers = () =>
    fetch("/api/customers", { cache: "no-store" })
      .then(parseJson)
      .then((data) => {
        if (Array.isArray(data)) {
          setCustomers(
            sortCustomersByLatestInput(
              data.map((customer: Customer) => ({
                ...customer,
                totalPaid: customer.totalPaid ?? 0,
              }))
            )
          );
        }
      });

  const calculateTotalPrice = (quantity: string, price: string) => {
    const quantityValue = Number(quantity);
    const priceValue = Number(price);

    if (
      quantity.trim() === "" ||
      price.trim() === "" ||
      Number.isNaN(quantityValue) ||
      Number.isNaN(priceValue)
    ) {
      return "";
    }

    return (quantityValue * priceValue).toFixed(2);
  };

  const calculateAdjustedSaleTotal = (
    quantity: string,
    price: string,
    hockExtendedSack: string,
    trackExpenses: string
  ) => {
    const baseTotal = calculateTotalPrice(quantity, price);
    if (baseTotal === "") return "";

    const hockValue = hockExtendedSack.trim() === "" ? 0 : Number(hockExtendedSack);
    const trackValue = trackExpenses.trim() === "" ? 0 : Number(trackExpenses);

    if (Number.isNaN(hockValue) || Number.isNaN(trackValue)) {
      return "";
    }

    return (Number(baseTotal) + hockValue - trackValue).toFixed(2);
  };

  const updateSaleAmounts = (
    quantity: string,
    price: string,
    hockExtendedSack: string,
    trackExpenses: string,
    paid: string
  ) => {
    const updatedTotal = calculateAdjustedSaleTotal(quantity, price, hockExtendedSack, trackExpenses);
    setSaleTotalPrice(updatedTotal);
    setSaleDue(calculateDue(updatedTotal, paid));
  };

  const calculateDue = (total: string, paid: string) => {
    const totalValue = Number(total);
    const paidValue = Number(paid);
    if (total.trim() === "" || paid.trim() === "" || Number.isNaN(totalValue) || Number.isNaN(paidValue)) return "";
    return (totalValue - paidValue).toFixed(2);
  };

  useEffect(() => {
    if (!requestedPaymentCustomerId) return;

    const matchedCustomer = customers.find((customer) => customer._id === requestedPaymentCustomerId);
    if (!matchedCustomer) return;

    setPaymentCustomerId(matchedCustomer._id);
    setShowPaymentPopup(true);
  }, [customers, requestedPaymentCustomerId]);

  const handleAddCustomer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
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

    // Check for duplicates first
    try {
      const checkResponse = await fetch("/api/customers/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
        }),
      });

      if (checkResponse.status === 409) {
        const checkData = await checkResponse.json();
        setDuplicateWarningMessage(checkData.message);
        setPendingCustomerData({
          name: trimmedName,
          phone: trimmedPhone,
          address: trimmedAddress,
        });
        setShowDuplicateWarning(true);
        setIsSubmitting(false);
        return;
      }

      if (!checkResponse.ok) {
        const checkData = await checkResponse.json().catch(() => null);
        setError(checkData?.message || translate(language, "unableToAddCustomer"));
        setIsSubmitting(false);
        return;
      }

      // No duplicates, proceed with creation
      await createCustomer(trimmedName, trimmedPhone, trimmedAddress);
    } catch {
      setError(translate(language, "unableToAddCustomer"));
      setIsSubmitting(false);
    }
  };

  const createCustomer = async (
    customerName: string,
    customerPhone: string,
    customerAddress: string,
    allowDuplicate = false
  ) => {
    try {
      const response = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customerName,
          phone: customerPhone,
          address: customerAddress,
          allowDuplicate,
        }),
      });

      const responseBody = await response.text();
      const data = responseBody ? JSON.parse(responseBody) : null;

      if (!response.ok) {
        const errorMessage = data?.message || translate(language, "unableToAddCustomer");
        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      if (data?._id) {
        setCustomers((prev) =>
          sortCustomersByLatestInput([...prev, { ...data, totalPaid: data.totalPaid ?? 0 }] as Customer[])
        );
        setName("");
        setPhone("");
        setAddress("");
        setShowForm(false);
        toast.success("Customer Added Successfully");
      }
    } catch {
      setError(translate(language, "unableToAddCustomer"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDuplicateCustomer = async () => {
    if (pendingCustomerData) {
      setShowDuplicateWarning(false);
      setIsSubmitting(true);
      await createCustomer(pendingCustomerData.name, pendingCustomerData.phone, pendingCustomerData.address, true);
      setPendingCustomerData(null);
    }
  };

  const cancelDuplicateCustomer = () => {
    setShowDuplicateWarning(false);
    setPendingCustomerData(null);
    setIsSubmitting(false);
  };

  const openEditPopup = (customer: Customer) => {
    if (!customer.latestSaleId) return;

    setEditTarget(customer);
    setEditPrice(customer.latestPricePerKg ? customer.latestPricePerKg.toFixed(2) : "");
    setEditError("");
    setShowEditPopup(true);
  };

  const closeEditPopup = () => {
    setShowEditPopup(false);
    setEditTarget(null);
    setEditPrice("");
    setEditError("");
    setIsSavingEdit(false);
  };

  const handleEditSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editTarget?.latestSaleId) {
      setEditError("No sale record found for this customer.");
      return;
    }

    const nextPrice = Number(editPrice);
    if (editPrice.trim() === "" || Number.isNaN(nextPrice) || nextPrice < 0) {
      setEditError("Enter a valid price per KG.");
      return;
    }

    setIsSavingEdit(true);
    setEditError("");

    try {
      const response = await fetch(`/api/customers/${editTarget._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit-price",
          saleId: editTarget.latestSaleId,
          pricePerKg: nextPrice,
        }),
      });

      const responseBody = await response.text();
      const data = responseBody ? JSON.parse(responseBody) : null;

      if (!response.ok) {
        setEditError(data?.message ?? "Failed to update price.");
        return;
      }

      await refreshCustomers();
      closeEditPopup();
    } catch {
      setEditError("Failed to update price.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaleStatus(null);
    setSalePopupMessage("");

    const selectedCustomer = customers.find(
      (customer) => customer.name?.toLowerCase().trim() === saleCustomerName.trim().toLowerCase()
    );

    if (!saleCustomerName.trim() || !selectedCustomer) {
      setSaleStatus({ type: "error", message: translate(language, "customerNameRequired") });
      toast.error("Customer name is required and must match an existing customer.");
      return;
    }

    const quantity = Number(saleSaltQuantity);
    const price = Number(salePricePerKg);
    const hockExtendedSackValue = saleHockExtendedSack.trim() === "" ? 0 : Number(saleHockExtendedSack);
    const trackExpensesValue = saleTrackExpenses.trim() === "" ? 0 : Number(saleTrackExpenses);
    const total = Number(saleTotalPrice);
    const paidValue = Number(salePaid);

    if (Number.isNaN(quantity) || quantity < 0) {
      setSaleStatus({ type: "error", message: translate(language, "saltQuantityNonNegative") });
      return;
    }

    if (Number.isNaN(price) || price < 0) {
      setSaleStatus({ type: "error", message: translate(language, "pricePerKgNonNegative") });
      return;
    }

    if (Number.isNaN(hockExtendedSackValue) || hockExtendedSackValue < 0) {
      setSaleStatus({ type: "error", message: translate(language, "hockExtendedSackNonNegative") });
      return;
    }

    if (Number.isNaN(trackExpensesValue) || trackExpensesValue < 0) {
      setSaleStatus({ type: "error", message: translate(language, "trackExpensesNonNegative") });
      return;
    }

    if (Number.isNaN(total) || total < 0) {
      setSaleStatus({ type: "error", message: translate(language, "totalPriceNonNegative") });
      return;
    }

    if (Number.isNaN(paidValue) || paidValue < 0) {
      setSaleStatus({ type: "error", message: translate(language, "paidAmountNonNegative") });
      return;
    }

    const dueValue = Number(total - paidValue);
    if (Number.isNaN(dueValue)) {
      setSaleStatus({ type: "error", message: translate(language, "enterValidAmount") });
      return;
    }

    const response = await fetch(`/api/customers/${selectedCustomer._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "sale",
        saltAmount: quantity,
        hockExtendedSack: hockExtendedSackValue,
        trackExpenses: trackExpensesValue,
        total,
        paid: paidValue,
        due: dueValue,
      }),
    });

    const responseBody = await response.text();
    const data = responseBody ? JSON.parse(responseBody) : null;

    if (!response.ok) {
      setSaleStatus({ type: "error", message: data?.message || translate(language, "unableToSaveSale") });
      return;
    }

    setSaleStatus({ type: "success", message: translate(language, "saleRecordedSuccessfully") });
    setSaleCustomerName("");
    setSaleSaltQuantity("");
    setSalePricePerKg("");
    setSaleHockExtendedSack("");
    setSaleTrackExpenses("");
    setSaleTotalPrice("");
    setSalePaid("");
    setSaleDue("");

    refreshCustomers();
    toast.success("Sale Recorded Successfully");
  };

  const customerRows = customers.map((customer, index) => (
    <tr key={customer._id} className={`border-b border-slate-100 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
      <td className="print-table-hidden px-4 py-4 text-slate-800">{formatDisplayName(customer.name, "Unnamed customer")}</td>
      <td className="print-table-hidden px-4 py-4 text-center text-slate-600">{formatAmount(customer.saltAmount ?? 0)}</td>
      <td className="px-4 py-4 text-center text-slate-600">Tk {formatAmount(customer.totalSalesAmount ?? 0)}</td>
      <td className="print-table-hidden px-4 py-4 text-center text-slate-600">Tk {formatAmount(customer.totalHockExtendedSack ?? 0)}</td>
      <td className="print-table-hidden px-4 py-4 text-center text-slate-600">Tk {formatAmount(customer.totalTrackExpenses ?? 0)}</td>
      <td className="px-4 py-4 text-center text-slate-600">Tk {formatAmount(customer.totalPaid ?? 0)}</td>
      <td className={`px-4 py-4 text-center ${getBalanceClassName(customer.totalDue ?? 0)}`}>
        {formatTableBalanceStatus(customer.totalDue ?? 0)}
      </td>
      <td className="print-table-hidden px-4 py-4 text-center text-slate-600">
        {customer.latestSaleId ? `Tk ${formatAmount(customer.latestPricePerKg ?? 0, 2)}` : "-"}
      </td>
      <td className="print-table-hidden px-4 py-4 text-center">
        <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          {getEditedByText(customer)}
        </span>
      </td>
      <td className="print-table-hidden px-4 py-4 text-center">
        <ActionDropdown
          viewHref={`/customers/${customer._id}`}
          onEdit={() => openEditPopup(customer)}
          onPrint={() => {
            const invoiceWindow = window.open(`/invoices/customers/${customer._id}`, "_blank");
            invoiceWindow?.addEventListener("load", () => {
              invoiceWindow.print();
            });
          }}
          canEdit={!!customer.latestSaleId}
          language={language}
        />
      </td>
    </tr>
  ));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">{translate(language, "customers")}</h1>
          <p className="mt-2 text-slate-500">{translate(language, "customerSummary")}</p>
        </div>
        <div className="print-hidden flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => setShowForm((prev) => !prev)}
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#0077cc] px-5 py-3 text-base font-semibold text-white shadow hover:bg-[#005ea3] sm:w-auto"
          >
            {showForm ? translate(language, "cancel") : translate(language, "addCustomer")}
          </button>
          {firstCustomerId ? (
            <Link
              href={`/customers/${firstCustomerId}`}
              className="inline-flex w-full items-center justify-center rounded-lg bg-[#0077cc] px-5 py-3 text-base font-semibold text-white shadow hover:bg-[#005ea3] sm:w-auto"
            >
              {translate(language, "viewLatestCustomer")}
            </Link>
          ) : null}
        </div>
      </div>

      {showForm && (
        <div className="print-hidden rounded-lg bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-lg font-semibold text-slate-900">{translate(language, "newCustomer")}</h2>
          <form className="mt-5 space-y-4" onSubmit={handleAddCustomer}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <label className="space-y-2">
                <span className="text-base text-slate-600">{translate(language, "nameLabel")}</span>
                <input
                  name="customerName"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base"
                  placeholder={translate(language, "customerNameLabel")}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-base text-slate-600">{translate(language, "phoneLabelShort")}</span>
                <input
                  name="customerPhone"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base"
                  placeholder={translate(language, "phoneLabelShort")}
                  maxLength={11}
                  required
                />
              </label>
              <label className="space-y-2">
                <span className="text-base text-slate-600">{translate(language, "addressLabel")}</span>
                <input
                  name="customerAddress"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-base"
                  placeholder={translate(language, "addressLabel")}
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
              {isSubmitting ? translate(language, "addingEllipsis") : translate(language, "addCustomer")}
            </button>
          </form>
        </div>
      )}

      <div className="print-hidden rounded-lg bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-slate-900">{translate(language, "newSaleEntry")}</h2>
        <p className="mt-2 text-xs text-slate-500">{translate(language, "recordCustomerSale")}</p>

        <form onSubmit={handleSaleSubmit} className="mt-6 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="block">
              <span className="text-base font-medium text-slate-700">{translate(language, "customerNameLabel")}</span>
              <input
                name="saleCustomerName"
                list="customerNames"
                value={saleCustomerName}
                onChange={(event) => setSaleCustomerName(event.target.value)}
                placeholder={translate(language, "customerNameLabel")}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              />
              <datalist id="customerNames">
                {customers.map((customer) => (
                  <option key={customer._id} value={customer.name || ""} />
                ))}
              </datalist>
            </label>
            <label className="block">
              <span className="text-base font-medium text-slate-700">{translate(language, "saltQuantityLabel")}</span>
              <input
                name="saleSaltQuantity"
                value={saleSaltQuantity}
                onChange={(event) => {
                  const value = event.target.value;
                  setSaleSaltQuantity(value);
                  updateSaleAmounts(value, salePricePerKg, saleHockExtendedSack, saleTrackExpenses, salePaid);
                }}
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-base font-medium text-slate-700">{translate(language, "pricePerKg")}</span>
              <input
                name="salePricePerKg"
                value={salePricePerKg}
                onChange={(event) => {
                  const value = event.target.value;
                  setSalePricePerKg(value);
                  updateSaleAmounts(saleSaltQuantity, value, saleHockExtendedSack, saleTrackExpenses, salePaid);
                }}
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-base font-medium text-slate-700">{translate(language, "hockExtendedSack")}</span>
              <input
                name="saleHockExtendedSack"
                value={saleHockExtendedSack}
                onChange={(event) => {
                  const value = event.target.value;
                  setSaleHockExtendedSack(value);
                  updateSaleAmounts(saleSaltQuantity, salePricePerKg, value, saleTrackExpenses, salePaid);
                }}
                type="number"
                step="0.01"
                min="0"
                placeholder="0"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-base font-medium text-slate-700">{translate(language, "trackExpenses")}</span>
              <input
                name="saleTrackExpenses"
                value={saleTrackExpenses}
                onChange={(event) => {
                  const value = event.target.value;
                  setSaleTrackExpenses(value);
                  updateSaleAmounts(saleSaltQuantity, salePricePerKg, saleHockExtendedSack, value, salePaid);
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
                name="saleTotalPrice"
                value={saleTotalPrice}
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
                name="salePaidAmount"
                value={salePaid}
                onChange={(event) => {
                  const value = event.target.value;
                  setSalePaid(value);
                  setSaleDue(calculateDue(saleTotalPrice, value));
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
                name="saleDueAmount"
                value={saleDue}
                readOnly
                type="number"
                step="0.01"
                placeholder="0"
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-base text-slate-900 outline-none"
              />
            </label>
          </div>


          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#348CD4] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#2F7FC0] sm:w-auto"
            >
              {translate(language, "saveSaleEntry")}
            </button>
            {saleStatus ? (
              <p className={`text-sm ${saleStatus.type === "success" ? "text-emerald-600" : "text-rose-600"}`}>
                {saleStatus.message}
              </p>
            ) : null}
          </div>
        </form>

        {salePopupMessage ? (
          <ModalShell
            title={translate(language, "customerAlert")}
            description={translate(language, "somethingNeedsAttention")}
            tone="amber"
            widthClassName="max-w-md"
            onClose={() => setSalePopupMessage("")}
            footer={
              <button
                type="button"
                onClick={() => setSalePopupMessage("")}
                className="inline-flex items-center justify-center rounded-lg bg-[#348CD4] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2F7FC0]"
              >
                {translate(language, "close")}
              </button>
            }
          >
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {salePopupMessage}
            </div>
          </ModalShell>
        ) : null}
      </div>

      {/* Payment Now Button */}
      <div className="print-hidden mb-4 flex justify-between items-center">
        <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex w-full items-center justify-center rounded-lg bg-[#348CD4] px-5 py-3 text-sm font-semibold text-white shadow hover:bg-[#2F7FC0] sm:w-auto"
          >
            {translate(language, "printCustomerList")}
        </button>
        <button
          className="w-full rounded-lg bg-[#348CD4] px-6 py-2 text-base font-semibold text-white shadow hover:bg-[#2F7FC0] sm:w-auto"
          onClick={() => setShowPaymentPopup(true)}
        >
          {translate(language, "paymentNow")}
        </button>
      </div>

      {/* Payment Popup */}
      {showPaymentPopup && (
        <ModalShell
          title={translate(language, "recordCustomerPayment")}
          description={translate(language, "captureCustomerPaymentDescription")}
          tone="sky"
          widthClassName="max-w-xl"
          onClose={closePaymentPopup}
        >
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">{translate(language, "selectCustomer")}</span>
                <input
                  name="paymentCustomer"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                  list="paymentCustomerList"
                  value={
                    paymentCustomerId
                      ? customers.find((c) => c._id === paymentCustomerId)?.name || ""
                      : ""
                  }
                  onChange={(e) => {
                    if (isProfilePaymentFlow) return;
                    const name = e.target.value;
                    const found = customers.find(
                      (c) => c.name?.toLowerCase().trim() === name.toLowerCase().trim()
                    );
                    setPaymentCustomerId(found ? found._id : null);
                  }}
                  placeholder={translate(language, "typeOrSelectCustomer")}
                  readOnly={isProfilePaymentFlow}
                  aria-readonly={isProfilePaymentFlow}
                  required
                />
                {isProfilePaymentFlow ? null : (
                  <datalist id="paymentCustomerList">
                    {customers.map((c) => (
                      <option key={c._id} value={c.name || ""} />
                    ))}
                  </datalist>
                )}
              </label>

              <CompactDateInput
                name="paymentDate"
                label={translate(language, "paymentDateLabel")}
                value={paymentDate}
                onChange={setPaymentDate}
                max={getLocalDateInputValue()}
                required
                inputClassName="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">{translate(language, "paidAmountLabel")}</span>
              <input
                name="paymentAmount"
                type="number"
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                min="1"
                required
              />
            </label>

            {paymentCustomerId ? (
              <div className="rounded-lg border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-slate-700">
                {translate(language, "balanceLabel")}:{" "}
                <span className={getBalanceClassName(customers.find((c) => c._id === paymentCustomerId)?.totalDue ?? 0)}>
                  {formatBalanceText(customers.find((c) => c._id === paymentCustomerId)?.totalDue ?? 0)}
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
          title="Edit customer price"
          description="Update the latest sale price for this customer."
          tone="sky"
          widthClassName="max-w-lg"
          onClose={closeEditPopup}
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">{formatDisplayName(editTarget.name, "Unnamed customer")}</p>
              <p className="mt-1">Current price: Tk {formatAmount(editTarget.latestPricePerKg ?? 0, 2)} per KG</p>
              <p className="mt-1 text-xs text-slate-500">{getEditedByText(editTarget)}</p>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">New price per KG</span>
              <input
                name="editCustomerPrice"
                type="number"
                step="0.01"
                min="0"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                required
              />
            </label>

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
                {isSavingEdit ? "Updating..." : "Update price"}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {showDuplicateWarning && (
        <ModalShell
          title="Duplicate Entry Warning"
          description="A customer or supplier with similar details already exists."
          tone="amber"
          widthClassName="max-w-md"
          onClose={cancelDuplicateCustomer}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-medium">Warning: {duplicateWarningMessage}</p>
              <p className="mt-2">Are you sure you want to add this customer anyway?</p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-base font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                onClick={cancelDuplicateCustomer}
              >
                {translate(language, "cancel")}
              </button>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg bg-amber-600 px-5 py-2.5 text-base font-semibold text-white transition hover:bg-amber-700"
                onClick={confirmDuplicateCustomer}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Anyway"}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      <div className="print-list-shell overflow-x-auto rounded-lg bg-white p-4 shadow-sm">
        <table className="min-w-[60rem] w-full text-left">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="print-table-hidden px-4 py-3">{translate(language, "nameLabel")}</th>
              <th className="print-table-hidden px-4 py-3 text-center">{translate(language, "totalSaltKg")}</th>
              <th className="px-4 py-3 text-center">{translate(language, "totalSalesLabel")}</th>
              <th className="print-table-hidden px-4 py-3 text-center">{translate(language, "hockExtendedSack")}</th>
              <th className="print-table-hidden px-4 py-3 text-center">{translate(language, "trackExpenses")}</th>
              <th className="px-4 py-3 text-center">{translate(language, "totalReceived")}</th>
              <th className="px-4 py-3 text-center">{translate(language, "dueOrAdvance")}</th>
              <th className="print-table-hidden px-4 py-3 text-center">Latest price</th>
              <th className="print-table-hidden px-4 py-3 text-center">Edited by</th>
              <th className="print-table-hidden px-4 py-3 text-center">{translate(language, "action")}</th>
            </tr>
          </thead>
          <tbody>
            <LoadMoreTable
              rows={customerRows}
              colSpan={10}
              loadMoreLabel={language === "bn" ? "আরও দেখুন" : "Show more"}
              emptyState={
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    {translate(language, "noCustomersFound")}
                  </td>
                </tr>
              }
            />
            <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-800">
              <td className="print-table-hidden px-4 py-4">{translate(language, "totals")}</td>
              <td className="print-table-hidden px-4 py-4 text-center">{formatAmount(totalSalt)}</td>
              <td className="px-4 py-4 text-center">Tk {formatAmount(totalAmount)}</td>
              <td className="print-table-hidden px-4 py-4 text-center">Tk {formatAmount(totalHockExtendedSack)}</td>
              <td className="print-table-hidden px-4 py-4 text-center">Tk {formatAmount(totalTrackExpenses)}</td>
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





