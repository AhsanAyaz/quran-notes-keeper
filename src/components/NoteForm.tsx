import { useState, useEffect, useRef } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { FirebaseError } from "firebase/app";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
// import VoiceRecorder from "./VoiceRecorder";
import { extractSurahVerse, getMaxVerseNumber } from "@/lib/utils";
import { QuranNote } from "@/lib/types";
import { fetchQuranVerse } from "@/lib/quranApi";
import { useTranslationStore } from "@/lib/stores/translationStore";
import { Loader2, Book } from "lucide-react";
import { SURAHS_LIST } from "@/lib/surahs-list";

interface NoteFormProps {
  projectId: string;
  userId: string;
  onNoteAdded: (note?: QuranNote) => void;
  noteToEdit?: QuranNote | null;
  onCancelEdit?: () => void;
}

export const NoteForm = ({
  projectId,
  userId,
  onNoteAdded,
  noteToEdit = null,
  onCancelEdit,
}: NoteFormProps) => {
  const [transcription, setTranscription] = useState("");
  const [surah, setSurah] = useState<number | string>("");
  const [verse, setVerse] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maxVerse, setMaxVerse] = useState<number>(0);
  const [isTranscriberReady, setIsTranscriberReady] = useState<boolean | null>(
    null
  );
  const [versePreview, setVersePreview] = useState<{
    arabic: string;
    translation: string;
    verse: number;
    surah: number;
  } | null>(null);
  const [isLoadingVerse, setIsLoadingVerse] = useState(false);
  const [shouldShowPlaceholder, setShouldShowPlaceholder] = useState(true);
  const { toast } = useToast();
  const isEditMode = Boolean(noteToEdit);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { translation } = useTranslationStore();

  // Handle initial scroll position
  useEffect(() => {
    // Add slight delay to ensure dialog is fully rendered
    const timeoutId = setTimeout(() => {
      if (textareaRef.current) {
        const yOffset = -100; // Adjust this value to control scroll position
        const y =
          textareaRef.current.getBoundingClientRect().top +
          window.pageYOffset +
          yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (noteToEdit) {
      setTranscription(noteToEdit.text);
      setSurah(noteToEdit.surah);
      setVerse(noteToEdit.verse);
      setMaxVerse(getMaxVerseNumber(noteToEdit.surah, SURAHS_LIST));
    }
  }, [noteToEdit]);

  useEffect(() => {
    if (transcription && !isEditMode) {
      const { surah, verse } = extractSurahVerse(transcription);
      if (surah) setSurah(surah);
      if (verse) setVerse(verse);
    }
  }, [transcription, isEditMode]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (surah && verse) {
      setShouldShowPlaceholder(true);

      timeoutId = setTimeout(() => {
        const surahMaxVerse = getMaxVerseNumber(Number(surah), SURAHS_LIST);
        if (Number(verse) > surahMaxVerse) {
          setVerse(surahMaxVerse);
          return;
        }
        fetchVersePreview(Number(surah), Number(verse));
      }, 500);
    } else {
      setVersePreview(null);
    }

    return () => clearTimeout(timeoutId);
  }, [surah, verse, translation]);

  const fetchVersePreview = async (surahNum: number, verseNum: number) => {
    if (
      isNaN(surahNum) ||
      isNaN(verseNum) ||
      surahNum < 1 ||
      surahNum > 114 ||
      verseNum < 1
    ) {
      return;
    }

    setIsLoadingVerse(true);
    try {
      const verseData = await fetchQuranVerse(surahNum, verseNum, translation);
      setVersePreview({
        arabic: verseData.text,
        translation: verseData.translation,
        verse: verseData.verse,
        surah: verseData.surah,
      });
    } catch (error) {
      console.error("Error fetching verse:", error);
      setVersePreview(null);
    } finally {
      setIsLoadingVerse(false);
    }
  };

  const handleTranscriptionComplete = (text: string) => {
    setTranscription(text);
  };

  const resetForm = () => {
    setTranscription("");
    setSurah("");
    setVerse("");
    setVersePreview(null);
    setShouldShowPlaceholder(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!transcription.trim()) {
      toast({
        title: "Note Required",
        description: "Please type your note before saving",
        variant: "destructive",
      });
      return;
    }

    if (!surah || !verse) {
      toast({
        title: "Surah and Verse Required",
        description: "Please specify the Surah and Verse number",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let noteData;

      if (isEditMode && noteToEdit) {
        const noteRef = doc(db, "notes", noteToEdit.id);
        await updateDoc(noteRef, {
          surah: Number(surah),
          verse: Number(verse),
          text: transcription.trim(),
          updatedAt: serverTimestamp(),
        });

        noteData = {
          ...noteToEdit,
          surah: Number(surah),
          verse: Number(verse),
          text: transcription.trim(),
        };

        toast({
          title: "Note Updated",
          description: `Note for Surah ${surah}:${verse} has been updated`,
        });

        if (onCancelEdit) onCancelEdit();
      } else {
        const newNoteData = {
          surah: Number(surah),
          verse: Number(verse),
          text: transcription.trim(),
          projectId,
          userId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "notes"), newNoteData);

        noteData = {
          id: docRef.id,
          ...newNoteData,
        };

        toast({
          title: "Note Saved",
          description: `Note for Surah ${surah}:${verse} has been saved`,
        });

        resetForm();
      }

      onNoteAdded();
    } catch (error) {
      const firebaseError = error as FirebaseError;
      console.error("Error saving note:", error);
      toast({
        title: isEditMode ? "Failed to update note" : "Failed to save note",
        description: firebaseError.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (onCancelEdit) {
      onCancelEdit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="h-full">
      <Card className="glass-card animate-fade-in border-0 rounded-none sm:border sm:rounded-lg">
        <CardHeader className="px-4 py-3 sm:p-6">
          <CardTitle>{isEditMode ? "Edit Note" : "New Note"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6">
          {(isLoadingVerse || versePreview || shouldShowPlaceholder) && (
            <div className="rounded-lg p-3 bg-primary/10 space-y-2 h-48 sm:h-72 overflow-y-auto">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Book className="h-4 w-4" />
                <span>
                  {versePreview?.surah && versePreview?.verse
                    ? `Quran ${versePreview.surah}:${versePreview.verse}`
                    : "Enter surah and verse to preview"}
                </span>
              </div>
              {isLoadingVerse ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : versePreview ? (
                <>
                  <p
                    className="text-right font-kitab text-xl font-medium leading-relaxed"
                    dir="rtl"
                    lang="ar"
                  >
                    {versePreview.arabic}
                  </p>
                  <p className="text-sm text-muted-foreground italic">
                    {versePreview.translation}
                  </p>
                </>
              ) : shouldShowPlaceholder ? (
                <div className="flex flex-col gap-2 py-3 opacity-50">
                  <div className="w-full h-6 bg-muted/30 rounded text-right"></div>
                  <div className="w-full h-12 bg-muted/20 rounded"></div>
                </div>
              ) : null}
            </div>
          )}

          {/* {!isEditMode && isTranscriberReady !== false && (
            <VoiceRecorder
              onTranscriptionComplete={handleTranscriptionComplete}
              onTranscriberStatus={(status) => {
                setIsTranscriberReady(status);
              }}
            />
          )} */}

          <div className="space-y-1.5">
            <Label htmlFor="note">Your Note</Label>
            <Textarea
              id="note"
              placeholder={`Type your note here${
                !isEditMode && isTranscriberReady
                  ? " or use the voice recorder above"
                  : ""
              }...`}
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              ref={textareaRef}
              className="min-h-[120px] resize-none sm:resize-y"
              disabled={isSubmitting}
              autoFocus={false}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="surah">Surah (Chapter)</Label>
              <Input
                id="surah"
                type="number"
                min="1"
                max="114"
                value={surah}
                onChange={(e) => {
                  setSurah(e.target.value);
                  setVerse("");
                  setMaxVerse(
                    getMaxVerseNumber(parseInt(e.target.value), SURAHS_LIST)
                  );
                  setVerse("");
                }}
                placeholder="1-114"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verse">Verse (Ayah)</Label>
              <Input
                id="verse"
                type="number"
                min="1"
                value={verse}
                max={maxVerse}
                onChange={(e) => setVerse(e.target.value)}
                placeholder="Verse number"
                disabled={isSubmitting || !surah}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 px-4 py-3 sm:p-6 mt-auto">
          {isEditMode && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? isEditMode
                ? "Updating..."
                : "Saving..."
              : isEditMode
              ? "Update Note"
              : "Save Note"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default NoteForm;
