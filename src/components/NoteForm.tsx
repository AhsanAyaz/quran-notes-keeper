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
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import VoiceRecorder from "./VoiceRecorder";
import { extractSurahVerse, getMaxVerseNumber } from "@/lib/utils";

interface NoteFormProps {
  projectId: string;
  userId: string;
  onNoteAdded: () => void;
}

export const NoteForm = ({ projectId, userId, onNoteAdded }: NoteFormProps) => {
  const [transcription, setTranscription] = useState("");
  const [surah, setSurah] = useState<number | string>("");
  const [verse, setVerse] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [maxVerse, setMaxVerse] = useState<number>(0);
  const [isTranscriberReady, setIsTranscriberReady] = useState<boolean | null>(
    null
  );
  const { toast } = useToast();

  // Extract Surah and verse information when transcription changes
  useEffect(() => {
    if (transcription) {
      const { surah, verse } = extractSurahVerse(transcription);
      if (surah) setSurah(surah);
      if (verse) setVerse(verse);
    }
  }, [transcription]);

  const handleTranscriptionComplete = (text: string) => {
    setTranscription(text);
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
      const noteData = {
        surah: Number(surah),
        verse: Number(verse),
        text: transcription.trim(),
        projectId,
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "notes"), noteData);

      toast({
        title: "Note Saved",
        description: `Note for Surah ${surah}:${verse} has been saved`,
      });

      // Reset form
      setTranscription("");
      setSurah("");
      setVerse("");

      // Notify parent component
      onNoteAdded();
    } catch (error) {
      const firebaseError = error as FirebaseError;
      console.error("Error saving note:", error);
      toast({
        title: "Failed to save note",
        description: firebaseError.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card className="glass-card animate-fade-in">
        <CardHeader>
          <CardTitle>Add New Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isTranscriberReady !== false && (
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
              placeholder="Type your note here or use the voice recorder above..."
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
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save Note"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default NoteForm;
