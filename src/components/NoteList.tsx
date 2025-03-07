import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { QuranNote } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Search, Loader2, SortAsc, Filter } from "lucide-react";
import Note from "./Note";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NoteListProps {
  userId: string;
  projectId?: string; // Optional - if not provided, show all notes across projects
  refreshTrigger?: number; // Use to trigger a refresh from parent
}

export const NoteList = ({
  userId,
  projectId,
  refreshTrigger = 0,
}: NoteListProps) => {
  const [notes, setNotes] = useState<QuranNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<QuranNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<
    "surah-asc" | "surah-desc" | "recent" | "oldest"
  >("recent");
  const { toast } = useToast();

  // Fetch notes from Firestore
  useEffect(() => {
    if (!userId) return;

    const constraints: QueryConstraint[] = [where("userId", "==", userId)];

    if (projectId) {
      constraints.push(where("projectId", "==", projectId));
    }

    // Add default sorting by creation time (most recent first)
    constraints.push(orderBy("createdAt", "desc"));

    const notesQuery = query(collection(db, "notes"), ...constraints);

    const unsubscribe = onSnapshot(
      notesQuery,
      (snapshot) => {
        const notesList = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as QuranNote)
        );

        setNotes(notesList);
        setFilteredNotes(notesList);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching notes:", error);
        toast({
          title: "Failed to load notes",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, projectId, refreshTrigger, toast]);

  // Filter and sort notes when search query or sort option changes
  useEffect(() => {
    if (!notes.length) return;

    let filtered = [...notes];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (note) =>
          note.text.toLowerCase().includes(query) ||
          `surah ${note.surah}`.includes(query) ||
          `verse ${note.verse}`.includes(query) ||
          `${note.surah}:${note.verse}`.includes(query)
      );
    }

    // Apply sorting
    switch (sortOption) {
      case "surah-asc":
        filtered.sort((a, b) =>
          a.surah === b.surah ? a.verse - b.verse : a.surah - b.surah
        );
        break;
      case "surah-desc":
        filtered.sort((a, b) =>
          a.surah === b.surah ? b.verse - a.verse : b.surah - a.surah
        );
        break;
      case "recent":
        filtered.sort(
          (a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis()
        );
        break;
      case "oldest":
        filtered.sort(
          (a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis()
        );
        break;
    }

    setFilteredNotes(filtered);
  }, [notes, searchQuery, sortOption]);

  const handleDeleteNote = (noteId: string) => {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
    setFilteredNotes((prevNotes) =>
      prevNotes.filter((note) => note.id !== noteId)
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search notes by text, surah, or verse..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {filteredNotes.length}{" "}
            {filteredNotes.length === 1 ? "note" : "notes"} found
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <SortAsc className="h-4 w-4" />
                <span>Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-card">
              <DropdownMenuLabel>Sort Notes By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setSortOption("surah-asc")}
                className={
                  sortOption === "surah-asc"
                    ? "bg-accent text-accent-foreground"
                    : ""
                }
              >
                Surah & Verse (Ascending)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortOption("surah-desc")}
                className={
                  sortOption === "surah-desc"
                    ? "bg-accent text-accent-foreground"
                    : ""
                }
              >
                Surah & Verse (Descending)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortOption("recent")}
                className={
                  sortOption === "recent"
                    ? "bg-accent text-accent-foreground"
                    : ""
                }
              >
                Most Recent
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortOption("oldest")}
                className={
                  sortOption === "oldest"
                    ? "bg-accent text-accent-foreground"
                    : ""
                }
              >
                Oldest First
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center p-8 bg-secondary/30 rounded-lg">
          <Filter className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <h3 className="text-lg font-medium mb-1">No notes found</h3>
          <p className="text-muted-foreground text-sm">
            {searchQuery
              ? "Try adjusting your search query or filters"
              : "Add your first note using the form above"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note) => (
            <Note
              key={note.id}
              note={note}
              onDelete={handleDeleteNote}
              onUpdate={() => {}}
              projectId={projectId || ""}
              userId={userId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default NoteList;
