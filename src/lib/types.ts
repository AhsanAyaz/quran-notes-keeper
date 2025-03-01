
import { Timestamp } from "firebase/firestore";

export interface QuranNote {
  id: string;
  surah: number;
  verse: number;
  text: string;
  projectId: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  audioUrl?: string;
}

export interface QuranVerse {
  number: number;
  text: string;
  translation: string;
}

export interface QuranSurah {
  number: number;
  name: string;
  englishName: string;
  englishNameTranslation: string;
  numberOfAyahs: number;
  revelationType: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  color?: string;
}
