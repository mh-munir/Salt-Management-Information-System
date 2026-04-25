"use client";

import { ChangeEvent, useEffect, useId, useRef, useState } from "react";

type CompactDateInputProps = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: string;
  required?: boolean;
  inputClassName?: string;
  labelClassName?: string;
};

const pad = (value: number) => String(value).padStart(2, "0");

const formatCompactDate = (rawValue: string) => {
  const digits = rawValue.replace(/\D/g, "").slice(0, 8);

  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
};

const isoToCompactDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return "";

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};

const compactToIsoDate = (value: string) => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return "";

  const [, dayText, monthText, yearText] = match;
  const day = Number(dayText);
  const month = Number(monthText);
  const year = Number(yearText);

  if (month < 1 || month > 12 || day < 1) return "";

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }

  return `${year}-${pad(month)}-${pad(day)}`;
};

export default function CompactDateInput({
  name,
  label,
  value,
  onChange,
  max,
  required = false,
  inputClassName = "",
  labelClassName = "",
}: CompactDateInputProps) {
  const inputId = useId();
  const nativeDateInputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState(() => isoToCompactDate(value));
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  useEffect(() => {
    setDisplayValue(isoToCompactDate(value));
  }, [value]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 767.98px), (pointer: coarse)");
    const syncLayout = () => setIsMobileLayout(mediaQuery.matches);

    syncLayout();
    mediaQuery.addEventListener("change", syncLayout);

    return () => mediaQuery.removeEventListener("change", syncLayout);
  }, []);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const formattedValue = formatCompactDate(event.target.value);
    const isoValue = compactToIsoDate(formattedValue);

    setDisplayValue(formattedValue);

    if (!formattedValue) {
      onChange("");
      return;
    }

    if (!isoValue || (max && isoValue > max)) {
      onChange("");
      return;
    }

    onChange(isoValue);
  };

  const handleBlur = () => {
    if (!displayValue) return;

    const isoValue = compactToIsoDate(displayValue);
    if (isoValue && (!max || isoValue <= max)) {
      setDisplayValue(isoToCompactDate(isoValue));
    }
  };

  const handleNativeDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;

    if (!nextValue) {
      setDisplayValue("");
      onChange("");
      return;
    }

    setDisplayValue(isoToCompactDate(nextValue));
    onChange(nextValue);
  };

  const openCalendar = () => {
    const nativeInput = nativeDateInputRef.current;
    if (!nativeInput) return;

    if (typeof nativeInput.showPicker === "function") {
      nativeInput.showPicker();
      return;
    }

    nativeInput.focus();
    nativeInput.click();
  };

  if (isMobileLayout) {
    return (
      <label className="block">
        <span className={`mb-2 block text-sm font-semibold text-slate-600 ${labelClassName}`.trim()}>
          {label}
        </span>
        <input
          id={inputId}
          name={name}
          type="date"
          value={value}
          onChange={handleNativeDateChange}
          max={max}
          required={required}
          className={`${inputClassName} min-h-12 rounded-xl pr-4`.replace("mt-2", "").trim()}
        />
      </label>
    );
  }

  return (
    <label className="floating-field block">
      <div className="relative">
        <input
          id={inputId}
          name={`${name}Display`}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder=" "
          className={`floating-field__input ${inputClassName.replace("mt-2", "").trim()} pr-12`}
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          onClick={openCalendar}
          maxLength={10}
          pattern="\d{2}/\d{2}/\d{4}"
          title="Use dd/mm/yyyy format"
          required={required}
        />
        <input
          ref={nativeDateInputRef}
          name={name}
          type="date"
          value={value}
          onChange={handleNativeDateChange}
          max={max}
          required={required}
          tabIndex={-1}
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 h-full w-0 opacity-0"
        />
        <span className={`floating-field__label ${labelClassName || "bg-white text-slate-600"}`.trim()}>
          {label}
        </span>
        <button
          type="button"
          onClick={openCalendar}
          aria-label={`Open ${label.toLowerCase()} calendar`}
          className="button-utility absolute right-3 top-1/2 inline-flex -translate-y-1/2 items-center justify-center rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="h-5 w-5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v4M16 2v4M3.5 9.5h17M5 5.5h14A1.5 1.5 0 0 1 20.5 7v12A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V7A1.5 1.5 0 0 1 5 5.5Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 13h3v3H8z" />
          </svg>
        </button>
      </div>
    </label>
  );
}
