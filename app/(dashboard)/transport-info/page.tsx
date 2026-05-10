"use client";

import { type ChangeEvent, type FormEvent, startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import CompactDateInput from "@/components/CompactDateInput";
import FloatingInput from "@/components/FloatingInput";
import LoadMoreTable from "@/components/LoadMoreTable";
import ModalShell from "@/components/ModalShell";
import { formatDisplayName, formatLocalizedDate, formatLocalizedNumber } from "@/lib/display-format";
import { translate } from "@/lib/language";
import { emitTransactionsUpdated } from "@/lib/live-updates";
import { useLanguage } from "@/lib/useLanguage";

type TransportEntry = {
  _id: string;
  driverName: string;
  driverMobileNumber: string;
  helperName: string;
  customerName: string;
  trackNumber: string;
  drivingLicensePreviewUrl: string;
  drivingLicensePreviewKind: "image" | "pdf" | "file" | "none";
  drivingLicenseFileName: string;
  helperIdCardPreviewUrl: string;
  helperIdCardPreviewKind: "image" | "pdf" | "file" | "none";
  helperIdCardFileName: string;
  driverIdCardPreviewUrl: string;
  driverIdCardPreviewKind: "image" | "pdf" | "file" | "none";
  driverIdCardFileName: string;
  hasDrivingLicense: boolean;
  hasHelperIdCard: boolean;
  hasDriverIdCard: boolean;
  date?: string | Date;
  createdAt?: string | Date;
};

type CustomerOption = {
  _id: string;
  name: string;
};

type TransportEntryFiles = {
  drivingLicenseDataUrl: string;
  drivingLicenseFileName: string;
  helperIdCardDataUrl: string;
  helperIdCardFileName: string;
  driverIdCardDataUrl: string;
  driverIdCardFileName: string;
};

type PreviewableField = "drivingLicense" | "helperIdCard" | "driverIdCard";
type PreviewFileState = {
  src: string;
  name: string;
  isLoading: boolean;
  error: string;
};

const MAX_LICENSE_UPLOAD_BYTES = 1_500_000;
const MAX_RAW_IMAGE_UPLOAD_BYTES = 12_000_000;
const MAX_IMAGE_DIMENSION = 1400;
const IMAGE_EXPORT_QUALITY = 0.78;

const todayIso = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateKey = (value?: string | Date) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toISOString().split("T")[0];
};

const parseJson = async (res: Response) => {
  if (!res.ok) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const isPdfFile = (value: string) => value.startsWith("data:application/pdf");
const isImageFile = (value: string) => value.startsWith("data:image/");

const compressImageFile = async (file: File) => {
  const fileDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        reject(new Error("Could not read the selected image."));
        return;
      }
      resolve(result);
    };
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new window.Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("Could not process the selected image."));
    nextImage.src = fileDataUrl;
  });

  const maxSide = Math.max(image.width, image.height);
  const scale = maxSide > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / maxSide : 1;
  const targetWidth = Math.max(1, Math.round(image.width * scale));
  const targetHeight = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not process the selected image.");
  }

  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  return canvas.toDataURL("image/jpeg", IMAGE_EXPORT_QUALITY);
};

export default function TransportInfoPage() {
  const { language } = useLanguage();
  const [entries, setEntries] = useState<TransportEntry[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [filterDate, setFilterDate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverMobileNumber, setDriverMobileNumber] = useState("");
  const [helperName, setHelperName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [trackNumber, setTrackNumber] = useState("");
  const [date, setDate] = useState(todayIso());
  const [drivingLicenseDataUrl, setDrivingLicenseDataUrl] = useState("");
  const [drivingLicenseFileName, setDrivingLicenseFileName] = useState("");
  const [helperIdCardDataUrl, setHelperIdCardDataUrl] = useState("");
  const [helperIdCardFileName, setHelperIdCardFileName] = useState("");
  const [driverIdCardDataUrl, setDriverIdCardDataUrl] = useState("");
  const [driverIdCardFileName, setDriverIdCardFileName] = useState("");
  const [previewFile, setPreviewFile] = useState<PreviewFileState | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const detailCacheRef = useRef<Record<string, TransportEntryFiles>>({});
  const detailRequestCacheRef = useRef<Record<string, Promise<TransportEntryFiles | null>>>({});

  const refreshEntries = useCallback(
    () =>
      fetch("/api/transport-info", { cache: "no-store" })
        .then(parseJson)
        .then((data) => {
          startTransition(() => {
            setEntries(Array.isArray(data) ? data : []);
          });
        }),
    []
  );

  const refreshCustomers = useCallback(
    () =>
      fetch("/api/customers", { cache: "no-store" })
        .then(parseJson)
        .then((data) => {
          const nextCustomers = Array.isArray(data)
            ? data
                .map((item) => ({
                  _id: String(item?._id ?? ""),
                  name: String(item?.name ?? "").trim(),
                }))
                .filter((item) => item._id && item.name)
            : [];

          startTransition(() => {
            setCustomers(nextCustomers);
          });
        }),
    []
  );

  useEffect(() => {
    void refreshEntries();
    void refreshCustomers();
  }, [refreshCustomers, refreshEntries]);

  const filteredEntries = useMemo(
    () => (filterDate ? entries.filter((entry) => getDateKey(entry.date) === filterDate) : entries),
    [entries, filterDate]
  );
  const deferredFilteredEntries = useDeferredValue(filteredEntries);
  const totalEntries = deferredFilteredEntries.length;
  const customerOptions = useMemo(() => {
    const seenNames = new Set<string>();

    return customers.filter((customer) => {
      const normalizedName = customer.name.toLowerCase();
      if (seenNames.has(normalizedName)) return false;
      seenNames.add(normalizedName);
      return true;
    });
  }, [customers]);
  const uniqueTracks = useMemo(
    () => new Set(deferredFilteredEntries.map((entry) => entry.trackNumber.trim()).filter(Boolean)).size,
    [deferredFilteredEntries]
  );

  const readUploadFile = (
    event: ChangeEvent<HTMLInputElement>,
    onSuccess: (dataUrl: string, fileName: string) => void
  ) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (file.type.startsWith("image/")) {
      if (file.size > MAX_RAW_IMAGE_UPLOAD_BYTES) {
        setError(translate(language, "transportLicenseFileTooLarge"));
        input.value = "";
        return;
      }

      void compressImageFile(file)
        .then((result) => {
          onSuccess(result, file.name);
          setError("");
          input.value = "";
        })
        .catch(() => {
          setError(translate(language, "transportLicenseReadError"));
          input.value = "";
        });
      return;
    }

    if (file.size > MAX_LICENSE_UPLOAD_BYTES) {
      setError(translate(language, "transportLicenseFileTooLarge"));
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        setError(translate(language, "transportLicenseReadError"));
        input.value = "";
        return;
      }

      onSuccess(result, file.name);
      setError("");
      input.value = "";
    };
    reader.readAsDataURL(file);
  };

  const onPickLicense = (event: ChangeEvent<HTMLInputElement>) => {
    readUploadFile(event, (dataUrl, fileName) => {
      setDrivingLicenseDataUrl(dataUrl);
      setDrivingLicenseFileName(fileName);
    });
  };

  const onPickHelperIdCard = (event: ChangeEvent<HTMLInputElement>) => {
    readUploadFile(event, (dataUrl, fileName) => {
      setHelperIdCardDataUrl(dataUrl);
      setHelperIdCardFileName(fileName);
    });
  };

  const onPickDriverIdCard = (event: ChangeEvent<HTMLInputElement>) => {
    readUploadFile(event, (dataUrl, fileName) => {
      setDriverIdCardDataUrl(dataUrl);
      setDriverIdCardFileName(fileName);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!driverName.trim()) {
      setError(translate(language, "driverNameRequired"));
      return;
    }

    if (!helperName.trim()) {
      setError(translate(language, "helperNameRequired"));
      return;
    }

    if (!/^\d{11}$/.test(driverMobileNumber.trim())) {
      setError(translate(language, "driverMobileNumberRequired"));
      return;
    }

    if (!customerName.trim()) {
      setError(translate(language, "transportCustomerNameRequired"));
      return;
    }

    if (!trackNumber.trim()) {
      setError(translate(language, "trackNumberRequired"));
      return;
    }

    if (!drivingLicenseDataUrl || !drivingLicenseFileName) {
      setError(translate(language, "transportLicenseFileRequired"));
      return;
    }

    if (!date) {
      setError(translate(language, "pleaseSelectPaymentDate"));
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/transport-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driverName: driverName.trim(),
          driverMobileNumber: driverMobileNumber.trim(),
          helperName: helperName.trim(),
          customerName: customerName.trim(),
          trackNumber: trackNumber.trim(),
          drivingLicenseDataUrl,
          drivingLicenseFileName,
          helperIdCardDataUrl,
          helperIdCardFileName,
          driverIdCardDataUrl,
          driverIdCardFileName,
          date,
        }),
      });

      const responseBody = await response.text();
      const data = responseBody ? JSON.parse(responseBody) : null;

      if (!response.ok) {
        setError(data?.message ?? translate(language, "transportSaveFailed"));
        return;
      }

      await refreshEntries();
      setDriverName("");
      setDriverMobileNumber("");
      setHelperName("");
      setCustomerName("");
      setTrackNumber("");
      setDate(todayIso());
      setDrivingLicenseDataUrl("");
      setDrivingLicenseFileName("");
      setHelperIdCardDataUrl("");
      setHelperIdCardFileName("");
      setDriverIdCardDataUrl("");
      setDriverIdCardFileName("");
      setSuccessMessage(translate(language, "transportSavedSuccessfully"));
      emitTransactionsUpdated();
    } catch {
      setError(translate(language, "transportSaveFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEntryFiles = useCallback(async (entryId: string) => {
    const cached = detailCacheRef.current[entryId];
    if (cached) return cached;

    const pendingRequest = detailRequestCacheRef.current[entryId];
    if (pendingRequest) return pendingRequest;

    const request = fetch(`/api/transport-info/${entryId}`, { cache: "no-store" })
      .then(parseJson)
      .then((data) => {
        const normalized = data as TransportEntryFiles | null;
        if (normalized) {
          detailCacheRef.current[entryId] = normalized;
        }
        return normalized;
      })
      .finally(() => {
        delete detailRequestCacheRef.current[entryId];
      });

    detailRequestCacheRef.current[entryId] = request;
    return request;
  }, []);

  const prefetchEntryFiles = useCallback((entryId: string) => {
    void getEntryFiles(entryId);
  }, [getEntryFiles]);

  const openPreview = useCallback(
    async (entry: TransportEntry, field: PreviewableField, fallbackName: string) => {
      const previewMap: Record<PreviewableField, { src: string; name: string; kind: TransportEntry["drivingLicensePreviewKind"] }> = {
        drivingLicense: {
          src: entry.drivingLicensePreviewUrl,
          name: entry.drivingLicenseFileName || fallbackName,
          kind: entry.drivingLicensePreviewKind,
        },
        helperIdCard: {
          src: entry.helperIdCardPreviewUrl,
          name: entry.helperIdCardFileName || fallbackName,
          kind: entry.helperIdCardPreviewKind,
        },
        driverIdCard: {
          src: entry.driverIdCardPreviewUrl,
          name: entry.driverIdCardFileName || fallbackName,
          kind: entry.driverIdCardPreviewKind,
        },
      };

      const preview = previewMap[field];

      if (preview.kind === "image" && preview.src) {
        setPreviewFile({ src: preview.src, name: preview.name, isLoading: false, error: "" });
        return;
      }

      setPreviewFile({ src: "", name: fallbackName, isLoading: true, error: "" });

      try {
        const data = await getEntryFiles(entry._id);

        if (!data) {
          setPreviewFile({
            src: "",
            name: fallbackName,
            isLoading: false,
            error: translate(language, "transportLicenseReadError"),
          });
          return;
        }

        const fileMap: Record<PreviewableField, { src: string; name: string }> = {
          drivingLicense: {
            src: data.drivingLicenseDataUrl,
            name: data.drivingLicenseFileName || fallbackName,
          },
          helperIdCard: {
            src: data.helperIdCardDataUrl,
            name: data.helperIdCardFileName || fallbackName,
          },
          driverIdCard: {
            src: data.driverIdCardDataUrl,
            name: data.driverIdCardFileName || fallbackName,
          },
        };

        const selectedFile = fileMap[field];

        if (!selectedFile.src) {
          setPreviewFile({
            src: "",
            name: selectedFile.name,
            isLoading: false,
            error: translate(language, "transportLicenseReadError"),
          });
          return;
        }

        setPreviewFile({
          src: selectedFile.src,
          name: selectedFile.name,
          isLoading: false,
          error: "",
        });
      } catch {
        setPreviewFile({
          src: "",
          name: fallbackName,
          isLoading: false,
          error: translate(language, "transportLicenseReadError"),
        });
      }
    },
    [getEntryFiles, language]
  );

  const rows = useMemo(
    () =>
      deferredFilteredEntries.map((entry) => (
        <tr key={entry._id}>
          <td className="px-4 py-4 text-slate-700">{formatLocalizedDate(entry.date, language)}</td>
          <td className="px-4 py-4 text-slate-900 font-semibold">
            {formatDisplayName(entry.driverName, translate(language, "unknownPerson"))}
          </td>
          <td className="px-4 py-4 text-slate-700">{entry.driverMobileNumber}</td>
          <td className="px-4 py-4 text-slate-700">
            {formatDisplayName(entry.helperName, translate(language, "unknownPerson"))}
          </td>
          <td className="px-4 py-4 text-slate-700">
            {formatDisplayName(entry.customerName, translate(language, "unknownPerson"))}
          </td>
          <td className="px-4 py-4 text-slate-700">{entry.trackNumber}</td>
          <td className="px-4 py-4 text-slate-700">
            {entry.hasDrivingLicense ? (
              <button
                type="button"
                onClick={() => openPreview(entry, "drivingLicense", entry.drivingLicenseFileName || translate(language, "viewLicense"))}
                onMouseEnter={() => prefetchEntryFiles(entry._id)}
                onFocus={() => prefetchEntryFiles(entry._id)}
                className="button-utility inline-flex items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 p-2 transition hover:bg-sky-100"
                aria-label={entry.drivingLicenseFileName || translate(language, "viewLicense")}
              >
                {entry.drivingLicensePreviewKind === "image" && entry.drivingLicensePreviewUrl ? (
                  <img
                    src={entry.drivingLicensePreviewUrl}
                    alt={entry.drivingLicenseFileName || "Driving license"}
                    className="h-12 w-12 rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-xs font-bold text-sky-700">
                    {entry.drivingLicensePreviewKind === "pdf" ? "PDF" : "FILE"}
                  </span>
                )}
              </button>
            ) : "-"}
          </td>
          <td className="px-4 py-4 text-slate-700">
            {entry.hasHelperIdCard ? (
              <button
                type="button"
                onClick={() => openPreview(entry, "helperIdCard", entry.helperIdCardFileName || translate(language, "viewIdCard"))}
                onMouseEnter={() => prefetchEntryFiles(entry._id)}
                onFocus={() => prefetchEntryFiles(entry._id)}
                className="button-utility inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-2 transition hover:bg-slate-100"
                aria-label={entry.helperIdCardFileName || translate(language, "viewIdCard")}
              >
                {entry.helperIdCardPreviewKind === "image" && entry.helperIdCardPreviewUrl ? (
                  <img
                    src={entry.helperIdCardPreviewUrl}
                    alt={entry.helperIdCardFileName || "Helper ID card"}
                    className="h-12 w-12 rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-xs font-bold text-slate-700">
                    {entry.helperIdCardPreviewKind === "pdf" ? "PDF" : "FILE"}
                  </span>
                )}
              </button>
            ) : "-"}
          </td>
          <td className="px-4 py-4 text-slate-700">
            {entry.hasDriverIdCard ? (
              <button
                type="button"
                onClick={() => openPreview(entry, "driverIdCard", entry.driverIdCardFileName || translate(language, "viewIdCard"))}
                onMouseEnter={() => prefetchEntryFiles(entry._id)}
                onFocus={() => prefetchEntryFiles(entry._id)}
                className="button-utility inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-2 transition hover:bg-slate-100"
                aria-label={entry.driverIdCardFileName || translate(language, "viewIdCard")}
              >
                {entry.driverIdCardPreviewKind === "image" && entry.driverIdCardPreviewUrl ? (
                  <img
                    src={entry.driverIdCardPreviewUrl}
                    alt={entry.driverIdCardFileName || "Driver ID card"}
                    className="h-12 w-12 rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-white text-xs font-bold text-slate-700">
                    {entry.driverIdCardPreviewKind === "pdf" ? "PDF" : "FILE"}
                  </span>
                )}
              </button>
            ) : "-"}
          </td>
        </tr>
      )),
    [deferredFilteredEntries, language, openPreview, prefetchEntryFiles]
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        <section className="dashboard-card-shell relative overflow-hidden rounded-lg border border-slate-200 bg-white/95 p-6 shadow-sm">
          <div className="pointer-events-none absolute -right-12 top-0 h-32 w-32 rounded-full bg-sky-200/35 blur-3xl" />
          <div className="relative">
            <h1 className="text-2xl font-semibold text-slate-900">{translate(language, "transportInfo")}</h1>
            <p className="mt-2 text-slate-500">{translate(language, "transportInfoDescription")}</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{translate(language, "entries")}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">
                  {formatLocalizedNumber(totalEntries, language, { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/85 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{translate(language, "transportTrackCount")}</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900">
                  {formatLocalizedNumber(uniqueTracks, language, { maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 lg:grid-cols-3">
                <FloatingInput
                  name="driverName"
                  label={translate(language, "driverName")}
                  value={driverName}
                  onChange={(event) => setDriverName(event.target.value)}
                  inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  labelClassName="bg-slate-50 text-slate-500"
                />
                <FloatingInput
                  name="driverMobileNumber"
                  label={translate(language, "driverMobileNumber")}
                  value={driverMobileNumber}
                  onChange={(event) => setDriverMobileNumber(event.target.value)}
                  inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  labelClassName="bg-slate-50 text-slate-500"
                />
                <FloatingInput
                  name="helperName"
                  label={translate(language, "helperName")}
                  value={helperName}
                  onChange={(event) => setHelperName(event.target.value)}
                  inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  labelClassName="bg-slate-50 text-slate-500"
                />
                <FloatingInput
                  name="customerName"
                  list="transportCustomerNames"
                  label={translate(language, "customerNameLabel")}
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  autoComplete="off"
                  inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-bold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  labelClassName="bg-slate-50 text-slate-500"
                />
                <datalist id="transportCustomerNames">
                  {customerOptions.map((customer) => (
                    <option key={customer._id} value={customer.name} />
                  ))}
                </datalist>
                <FloatingInput
                  name="trackNumber"
                  label={translate(language, "trackNumber")}
                  value={trackNumber}
                  onChange={(event) => setTrackNumber(event.target.value)}
                  inputClassName="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 text-base font-semibold text-slate-900 outline-none focus:border-slate-400 focus:bg-white"
                  labelClassName="bg-slate-50 text-slate-500"
                />
                 <CompactDateInput
                  name="transportDate"
                  label={translate(language, "dateLabel")}
                  value={date}
                  onChange={setDate}
                  max={todayIso()}
                  inputClassName="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
                />
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
                  <label htmlFor="driving-license-upload" className="block text-sm font-semibold text-slate-700">
                    {translate(language, "drivingLicenseUpload")}
                  </label>
                  <input
                    id="driving-license-upload"
                    type="file"
                    onChange={onPickLicense}
                    className="mt-3 block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:font-semibold file:text-sky-700 hover:file:bg-sky-100"
                  />
                  <p className="mt-2 text-xs text-slate-500">{translate(language, "transportLicenseUploadHint")}</p>
                  {drivingLicenseFileName ? (
                    <p className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">
                      {drivingLicenseFileName}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
                  <label htmlFor="helper-id-card-upload" className="block text-sm font-semibold text-slate-700">
                    {translate(language, "helperIdCardUpload")}
                  </label>
                  <input
                    id="helper-id-card-upload"
                    type="file"
                    onChange={onPickHelperIdCard}
                    className="mt-3 block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <p className="mt-2 text-xs text-slate-500">{translate(language, "transportLicenseUploadHint")}</p>
                  {helperIdCardFileName ? (
                    <p className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700">
                      {helperIdCardFileName}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4">
                  <label htmlFor="driver-id-card-upload" className="block text-sm font-semibold text-slate-700">
                    {translate(language, "driverIdCardUpload")}
                  </label>
                  <input
                    id="driver-id-card-upload"
                    type="file"
                    onChange={onPickDriverIdCard}
                    className="mt-3 block w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                  />
                  <p className="mt-2 text-xs text-slate-500">{translate(language, "transportLicenseUploadHint")}</p>
                  {driverIdCardFileName ? (
                    <p className="mt-3 inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-700">
                      {driverIdCardFileName}
                    </p>
                  ) : null}
                </div>
              </div>

              {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
              {successMessage ? <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</p> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center rounded-lg bg-[#0077cc] px-5 py-3 text-base font-semibold text-white shadow hover:bg-[#005ea3] sm:w-auto"
              >
                {isSubmitting ? translate(language, "savingEllipsis") : translate(language, "saveTransportInfo")}
              </button>
            </form>
          </div>
        </section>

        <section className="dashboard-card-shell relative overflow-hidden rounded-lg border border-slate-200 bg-white/95 p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{translate(language, "transportInfoTableTitle")}</h2>
              <p className="mt-2 text-slate-500">{translate(language, "transportInfoTableDescription")}</p>
            </div>
            <div className="min-w-[13rem]">
              <CompactDateInput
                name="transportInfoFilterDate"
                label={translate(language, "dateLabel")}
                value={filterDate}
                onChange={setFilterDate}
                max={todayIso()}
                inputClassName="mt-2 w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-base text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white"
              />
            </div>
          </div>

          <div className="app-table-shell mt-6">
            <div className="app-table-scroll">
              <table className="app-table min-w-[84rem] w-full text-left text-sm">
                <thead className="text-slate-500">
                  <tr>
                    <th className="px-4 py-4">{translate(language, "dateLabel")}</th>
                    <th className="px-4 py-4">{translate(language, "driverName")}</th>
                    <th className="px-4 py-4">{translate(language, "driverMobileNumber")}</th>
                    <th className="px-4 py-4">{translate(language, "helperName")}</th>
                    <th className="px-4 py-4">{translate(language, "transportCustomerName")}</th>
                    <th className="px-4 py-4">{translate(language, "trackNumber")}</th>
                    <th className="px-4 py-4">{translate(language, "drivingLicense")}</th>
                    <th className="px-4 py-4">{translate(language, "helperIdCardUpload")}</th>
                    <th className="px-4 py-4">{translate(language, "driverIdCardUpload")}</th>
                  </tr>
                </thead>
                <tbody>
                  <LoadMoreTable
                    rows={rows}
                    colSpan={9}
                    loadMoreLabel={language === "bn" ? "আরও দেখুন" : "Show more"}
                    emptyState={
                      <tr>
                        <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                          {translate(language, "noTransportInfoFound")}
                        </td>
                      </tr>
                    }
                  />
                </tbody>
                <tfoot>
                  <tr className="app-table-total">
                    <td colSpan={7} className="px-4 py-4">{translate(language, "totals")}</td>
                    <td className="px-4 py-4">
                      {formatLocalizedNumber(uniqueTracks, language, { maximumFractionDigits: 0 })} {translate(language, "transportTracks")}
                    </td>
                    <td className="px-4 py-4">
                      {formatLocalizedNumber(totalEntries, language, { maximumFractionDigits: 0 })} {translate(language, "entries")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>
      </div>

      {previewFile ? (
        <ModalShell
          title={previewFile.name}
          description={isPdfFile(previewFile.src) ? "PDF preview" : "Image preview"}
          onClose={() => setPreviewFile(null)}
          widthClassName="max-w-4xl"
          tone="slate"
        >
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            {previewFile.isLoading ? (
              <div className="flex min-h-[18rem] items-center justify-center bg-white p-8 text-center text-sm font-semibold text-slate-600">
                Loading...
              </div>
            ) : previewFile.error ? (
              <div className="flex min-h-[18rem] items-center justify-center bg-white p-8 text-center text-sm font-semibold text-rose-600">
                {previewFile.error}
              </div>
            ) : isPdfFile(previewFile.src) ? (
              <iframe src={previewFile.src} title={previewFile.name} className="h-[75vh] w-full bg-white" />
            ) : isImageFile(previewFile.src) ? (
              <img src={previewFile.src} alt={previewFile.name} className="max-h-[75vh] w-full object-contain bg-white" />
            ) : (
              <div className="flex min-h-[18rem] flex-col items-center justify-center gap-4 bg-white p-8 text-center">
                <div className="grid h-20 w-20 place-items-center rounded-3xl bg-slate-100 text-sm font-bold text-slate-700">
                  FILE
                </div>
                <p className="text-base font-semibold text-slate-900">{previewFile.name}</p>
                <a
                  href={previewFile.src}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Open file
                </a>
              </div>
            )}
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
