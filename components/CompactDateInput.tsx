"use client";

import { ChangeEvent, useEffect, useState } from "react";

type CompactDateInputProps = {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  max?: string;
  required?: boolean;
  inputClassName?: string;
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
}: CompactDateInputProps) {
  const [displayValue, setDisplayValue] = useState(() => isoToCompactDate(value));

  useEffect(() => {
    setDisplayValue(isoToCompactDate(value));
  }, [value]);

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

  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/yyyy"
        className={inputClassName}
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        maxLength={10}
        pattern="\d{2}/\d{2}/\d{4}"
        title="Use dd/mm/yyyy format"
        required={required}
      />
    </label>
  );
}
