
import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  writeBatch,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Project } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, BookOpen, Loader2, Trash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import NewProjectModal from "./NewProjectModal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProjectListProps {
  userId: string;
}

export const ProjectList = ({ userId }: ProjectListProps) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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
        toast({
          title: "Failed to load projects",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, toast]);

  const handleProjectClick = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const handleAddProject = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
  };

  const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    setProjectToDelete(project);
  };

  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;
    
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      
      // Delete all notes associated with this project - fixed: get all docs first
      const notesQuery = query(
        collection(db, "notes"),
        where("projectId", "==", projectToDelete.id)
      );
      
      // Get all notes matching the query
      const notesSnapshot = await getDocs(notesQuery);
      
      // Add delete operations to batch
      notesSnapshot.docs.forEach((noteDoc) => {
        batch.delete(doc(db, "notes", noteDoc.id));
      });
      
      // Delete the project itself
      batch.delete(doc(db, "projects", projectToDelete.id));
      
      // Commit the batch
      await batch.commit();
      
      setProjects((prev) => prev.filter(p => p.id !== projectToDelete.id));
      
      toast({
        title: "Reading Pass Deleted",
        description: `"${projectToDelete.name}" and all associated notes have been deleted`,
      });
    } catch (error: any) {
      console.error("Error deleting project:", error);
      toast({
        title: "Failed to delete reading pass",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
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
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Reading Passes</h2>
        <Button
          variant="outline"
          size="sm"
          className="flex gap-1 items-center"
          onClick={() => setIsModalOpen(true)}
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Pass</span>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="border-dashed border-2 glass-card">
          <CardContent className="flex flex-col items-center justify-center p-6 h-48 text-center space-y-4">
            <div className="rounded-full bg-primary/10 p-4">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-lg">No reading passes yet</h3>
              <p className="text-sm text-muted-foreground">
                Create your first Quran reading pass to start taking notes
              </p>
            </div>
            <Button onClick={() => setIsModalOpen(true)}>
              Create Reading Pass
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:ring-1 hover:ring-primary/20 transition-all glass-card animate-fade-in"
              onClick={() => handleProjectClick(project.id)}
            >
              <CardHeader
                className={`${project.color || "bg-sand-300"} rounded-t-lg`}
              >
                <div className="flex justify-between items-start">
                  <CardTitle className="truncate h-8">{project.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-white/20 hover:bg-white/30"
                    onClick={(e) => handleDeleteClick(e, project)}
                  >
                    <Trash className="h-4 w-4 text-foreground" />
                  </Button>
                </div>
                <CardDescription className="text-foreground truncate">
                  {project.description || "No description"}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="text-sm text-muted-foreground">
                  Created{" "}
                  {formatDistanceToNow(project.createdAt.toDate(), {
                    addSuffix: true,
                  })}
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => handleProjectClick(project.id)}
                >
                  Open
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onProjectCreated={handleAddProject}
        userId={userId}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent className="glass-card animate-fade-in">
          <DialogHeader>
            <DialogTitle>Delete Reading Pass</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{projectToDelete?.name}"? This will permanently remove this reading pass and ALL notes associated with it. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setProjectToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Reading Pass"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectList;
