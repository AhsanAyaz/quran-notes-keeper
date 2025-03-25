import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  addDoc,
  collection,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/components/ui/use-toast";
import { Project } from "@/lib/types";

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

const PROJECT_COLORS = [
  "bg-sand-300",
  "bg-amber-300",
  "bg-emerald-300",
  "bg-sky-300",
  "bg-violet-300",
  "bg-rose-300",
];

export const NewProjectModal = ({
  isOpen,
  onClose,
  userId,
}: NewProjectModalProps) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PROJECT_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please provide a name for your project",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const projectRef = collection(db, "projects");
      const newProject = {
        name,
        description,
        userId,
        color,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(projectRef, newProject);
      toast({
        title: "Project created",
        description: `${name} has been created successfully`,
      });

      // Type assertion since serverTimestamp() returns FieldValue, not Timestamp
      onClose();

      // Reset form
      setName("");
      setDescription("");
      setColor(PROJECT_COLORS[0]);
    } catch (error: any) {
      console.error("Error creating project:", error);
      toast({
        title: "Failed to create project",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] glass-card animate-fade-in dark:bg-background">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Reading Pass</DialogTitle>
            <DialogDescription>
              Start a new Quran reading journey. Give your pass a name and
              description.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="e.g. Ramadan 2024 Reading"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="Add details about this reading pass"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Color</Label>
              <div className="flex flex-wrap gap-2 col-span-3">
                {PROJECT_COLORS.map((colorClass) => (
                  <button
                    key={colorClass}
                    type="button"
                    className={`w-8 h-8 rounded-full cursor-pointer transition-all ${
                      color === colorClass
                        ? "ring-2 ring-primary ring-offset-2"
                        : ""
                    } ${colorClass}`}
                    onClick={() => setColor(colorClass)}
                    disabled={isSubmitting}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewProjectModal;
