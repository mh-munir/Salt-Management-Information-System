"use client";

import { useState } from "react";
import Link from "next/link";

interface ActionDropdownProps {
  viewHref: string;
  onEdit?: () => void;
  onPrint: () => void;
  canEdit?: boolean;
  language: string;
}

export default function ActionDropdown({ viewHref, onEdit, onPrint, canEdit = true, language }: ActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const translate = (lang: string, key: string) => {
    // Simple translation function - you might want to use your existing translation system
    const translations: Record<string, Record<string, string>> = {
      en: {
        view: "View",
        edit: "Edit",
        print: "Print Invoice",
        actions: "Actions"
      },
      bn: {
        view: "দেখুন",
        edit: "সম্পাদনা",
        print: "ইনভয়েস প্রিন্ট",
        actions: "ক্রিয়া"
      }
    };
    return translations[lang]?.[key] || key;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center rounded-lg border border-gray-300 bg-[#348CD4] px-3 py-2 text-sm font-medium text-white capitalize shadow-sm hover:bg-[#2F7FC0] focus:outline-none"
      >
        {translate(language, "action")}
        <svg
          className={`-mr-1 ml-2 h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown menu */}
          <div className="absolute left-0 right-0 z-20 top-100% text-center w-full rounded-lg bg-white shadow-lg focus:outline-none overflow-hidden">
            <Link
              href={viewHref}
              className="block px-4 py-2 border-b border-[#2F7FC0] text-sm bg-[#348CD4] text-white hover:bg-[#2F7FC0]"
              onClick={() => setIsOpen(false)}
            >
              {translate(language, "view")}
            </Link>

            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit();
                  setIsOpen(false);
                }}
                className="block w-full border-b border-[#2F7FC0] px-4 py-2 text-sm bg-[#348CD4] text-white hover:bg-[#2F7FC0]"
              >
                {translate(language, "edit")}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onPrint();
                setIsOpen(false);
              }}
              className="block px-4 py-2 w-full border-b border-[#2F7FC0] text-sm bg-[#348CD4] text-white hover:bg-[#2F7FC0]"
            >
              {translate(language, "print")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}