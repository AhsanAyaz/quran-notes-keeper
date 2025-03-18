import { QuranSurah } from "./types";

export let SURAHS_LIST: QuranSurah[] = [];
const getSurahs = async () => {
  const res = await fetch("/data/surahs.json");
  SURAHS_LIST = await res.json();
};

getSurahs();
