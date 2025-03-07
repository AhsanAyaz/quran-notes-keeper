import { useState, useEffect } from "react";
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
import { addDoc, collection, serverTimestamp, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import VoiceRecorder from "./VoiceRecorder";
import { extractSurahVerse, getMaxVerseNumber } from "@/lib/utils";
import { QuranNote } from "@/lib/types";
import { fetchQuranVerse } from "@/lib/quranApi";
import { Loader2, Book } from "lucide-react";

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
  onCancelEdit
}: NoteFormProps) => {
  const [transcription, setTranscription] = useState("");
  const [surah, setSurah] = useState<number | string>("");
  const [verse, setVerse] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maxVerse, setMaxVerse] = useState<number>(0);
  const [isTranscriberReady, setIsTranscriberReady] = useState<boolean | null>(null);
  const [versePreview, setVersePreview] = useState<{arabic: string, translation: string} | null>(null);
  const [isLoadingVerse, setIsLoadingVerse] = useState(false);
  const [shouldShowPlaceholder, setShouldShowPlaceholder] = useState(true);
  const { toast } = useToast();
  const isEditMode = Boolean(noteToEdit);

  useEffect(() => {
    if (noteToEdit) {
      setTranscription(noteToEdit.text);
      setSurah(noteToEdit.surah);
      setVerse(noteToEdit.verse);
      setMaxVerse(getMaxVerseNumber(noteToEdit.surah));
      setShouldShowPlaceholder(false);
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
    if (surah && verse) {
      setShouldShowPlaceholder(true);
      fetchVersePreview(Number(surah), Number(verse));
    } else {
      setVersePreview(null);
    }
  }, [surah, verse]);

  const fetchVersePreview = async (surahNum: number, verseNum: number) => {
    if (isNaN(surahNum) || isNaN(verseNum) || surahNum < 1 || surahNum > 114 || verseNum < 1) {
      return;
    }
    
    setIsLoadingVerse(true);
    try {
      const verseData = await fetchQuranVerse(surahNum, verseNum);
      setVersePreview({
        arabic: verseData.text,
        translation: verseData.translation
      });
      setShouldShowPlaceholder(false);
    } catch (error) {
      console.error("Error fetching verse:", error);
      setVersePreview(null);
      setShouldShowPlaceholder(false);
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
        description: "Please record or type your note",
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

      onNoteAdded(noteData as QuranNote);
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
    <form onSubmit={handleSubmit}>
      <Card className="glass-card animate-fade-in">
        <CardHeader>
          <CardTitle>{isEditMode ? "Edit Note" : "New Note"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {(isLoadingVerse || versePreview || shouldShowPlaceholder) && (
            <div className="rounded-lg p-4 bg-primary/10 space-y-2 min-h-[120px]">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Book className="h-4 w-4" />
                <span>
                  {surah && verse 
                    ? `Quran ${surah}:${verse}` 
                    : "Enter surah and verse to preview"}
                </span>
              </div>
              
              {isLoadingVerse ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : versePreview ? (
                <>
                  <p className="text-right font-medium leading-relaxed" dir="rtl" lang="ar">
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

          {!isEditMode && isTranscriberReady !== false && (
            <VoiceRecorder
              onTranscriptionComplete={handleTranscriptionComplete}
              onTranscriberStatus={(status) => {
                setIsTranscriberReady(status);
              }}
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="note">Your Note</Label>
            <Textarea
              id="note"
              placeholder={`Type your note here${
                !isEditMode && isTranscriberReady ? " or use the voice recorder above" : ""
              }...`}
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              className="min-h-[100px] resize-y"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                  setMaxVerse(getMaxVerseNumber(parseInt(e.target.value)));
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
        <CardFooter className="flex gap-2">
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
              ? (isEditMode ? "Updating..." : "Saving...") 
              : (isEditMode ? "Update Note" : "Save Note")}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default NoteForm;
