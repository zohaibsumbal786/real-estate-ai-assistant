/**
 * RTL/LTR aware utilities for bilingual support
 */

import type { Locale } from "./routing";

export function getDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

/**
 * Get RTL-aware class names based on direction
 * Usage: cn(rtlClasses(dir, "mr-4", "ml-4"))
 */
export function rtlClasses(
  dir: "rtl" | "ltr",
  rtlClass: string,
  ltrClass: string
): string {
  return dir === "rtl" ? rtlClass : ltrClass;
}

/**
 * Format number for display based on locale
 * In Arabic, numerals should be Eastern Arabic numerals (٠-٩)
 */
export function formatNumberForLocale(
  num: number | string,
  locale: Locale
): string {
  const numStr = typeof num === "string" ? num : num.toString();

  if (locale === "ar") {
    const arabicNumbers: Record<string, string> = {
      "0": "٠",
      "1": "١",
      "2": "٢",
      "3": "٣",
      "4": "٤",
      "5": "٥",
      "6": "٦",
      "7": "٧",
      "8": "٨",
      "9": "٩"
    };

    return numStr.replace(/\d/g, (digit) => arabicNumbers[digit] || digit);
  }

  return numStr;
}

/**
 * Format currency for display based on locale
 * Example: 1000 AED -> "1,000.00 د.إ" in Arabic, "$1,000.00" in English
 */
export function formatCurrencyForLocale(
  amount: number,
  locale: Locale,
  currency: string = "AED"
): string {
  const formatter = new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  return formatter.format(amount);
}

/**
 * Format date for display based on locale
 */
export function formatDateForLocale(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions
): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const formatter = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-AE" : "en-AE",
    options || {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );

  return formatter.format(dateObj);
}

/**
 * Get text alignment class based on direction
 */
export function getTextAlignClass(dir: "rtl" | "ltr"): string {
  return dir === "rtl" ? "text-right" : "text-left";
}

/**
 * Get margin class that respects RTL
 */
export function getMarginClass(
  dir: "rtl" | "ltr",
  rtlClass: string,
  ltrClass: string
): string {
  return dir === "rtl" ? rtlClass : ltrClass;
}

/**
 * Utility to swap left/right CSS values for RTL
 */
export function rtlValue<T>(
  dir: "rtl" | "ltr",
  rtlValue: T,
  ltrValue: T
): T {
  return dir === "rtl" ? rtlValue : ltrValue;
}
