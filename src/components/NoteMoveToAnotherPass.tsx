import { Project, QuranNote } from "@/lib/types";
import { Move } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface NoteMoveToAnotherPassProps {
  note: QuranNote;
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NoteMoveToAnotherPass = ({
  note,
  userId,
  open,
  onOpenChange,
}: NoteMoveToAnotherPassProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isMoving, setIsMoving] = useState(false);
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);

  // Fetch projects when component mounts or userId changes
  useEffect(() => {
    if (!userId) return;

    const projectsQuery = query(
      collection(db, "projects"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      projectsQuery,
      (snapshot) => {
        const projectList: Project[] = snapshot.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
            } as Project)
        );
        setProjects(projectList);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching projects:", error);
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        toast({
          title: "Failed to load projects",
          description: errorMessage,
          variant: "destructive",
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, toast]);

  const handleMoveToProject = async (projectId: string) => {
    if (projectId === note.projectId) return;

    setIsMoving(true);
    try {
      const noteRef = doc(db, "notes", note.id);
      await updateDoc(noteRef, {
        projectId: projectId,
        updatedAt: new Date().toISOString(),
      });

      toast({
        title: "Note moved successfully",
        description: "Your note has been moved to the selected pass",
        variant: "default",
      });

      onOpenChange(false);
    } catch (error: Error | unknown) {
      console.error("Error moving note:", error);
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error moving note",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card animate-fade-in max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle>Move Your Note</DialogTitle>
          <DialogDescription className="flex justify-between items-center gap-4">
            <span className="h-fit">
              Move this note to one of your other passes
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-2 relative">
          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p>Loading passes...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              No other passes found
            </div>
          ) : (
            <div className="w-full space-y-2">
              {projects.map((project) => (
                <Button
                  key={project.id}
                  variant="outline"
                  className="w-full text-left flex justify-between items-center"
                  onClick={() => handleMoveToProject(project.id)}
                  disabled={project.id === note.projectId || isMoving}
                >
                  <span>{project.name}</span>
                  {project.id === note.projectId && (
                    <span className="text-sm text-muted-foreground">
                      (Current)
                    </span>
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isMoving}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
