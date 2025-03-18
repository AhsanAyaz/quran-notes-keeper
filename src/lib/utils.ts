import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { QuranSurah } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Extract surah and verse numbers from text using regex
export function extractSurahVerse(text: string): {
  surah: number | null;
  verse: number | null;
} {
  // Look for patterns like "Surah 2 verse 255" or "2:255" or "Chapter 2, Verse 255"
  const patterns = [
    /surah\s+(\d+)\s+(?:verse|ayah)\s+(\d+)/i,
    /chapter\s+(\d+)\s+(?:verse|ayah)\s+(\d+)/i,
    /(\d+):(\d+)/,
    /(\d+)[\s,]+(?:verse|ayah)\s+(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return {
        surah: parseInt(match[1], 10),
        verse: parseInt(match[2], 10),
      };
    }
  }

  return { surah: null, verse: null };
}

// Format display name for Surah
export function formatSurahName(
  number: number,
  name: string,
  englishName: string
): string {
  return `${number}. ${englishName} (${name})`;
}

// Get user initials from name or email
export function getUserInitials(
  name: string | null,
  email: string | null
): string {
  if (name) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }

  if (email) {
    return email.substring(0, 2).toUpperCase();
  }

  return "UN";
}

/**
 * Retrieves the maximum verse number for a given Surah (chapter) in the Quran.
 *
 * @param {number} surahNumber The Surah number (1 to 114).
 * @param {QuranSurah[]} surahs list of surahs (containing relevant info).
 * @returns {number | null} The maximum verse number in the given Surah. Returns null if the Surah number is invalid.
 */

export function getMaxVerseNumber(surahNumber: number, surahs: QuranSurah[]) {
  // Quran verse counts per surah. This data is consistent across reliable sources.
  const matchingSurah = surahs.find((surah) => {
    return surah.number === surahNumber;
  });

  if (matchingSurah) {
    return matchingSurah.numberOfAyahs;
  } else {
    console.warn("Invalid Surah number. Must be between 1 and 114.");
    return null;
  }
}
