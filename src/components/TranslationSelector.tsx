import { useTranslationStore } from "@/lib/stores/translationStore";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Book, ChevronDown } from "lucide-react";

const TranslationSelector = () => {
  const { translation, setTranslation } = useTranslationStore();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-1">
          <Book className="h-4 w-4" />
          <span className="hidden sm:inline">Translation:</span>
          <span>{translation === "en.daryabadi" ? "Daryabadi" : "Hilali"}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTranslation("en.daryabadi")}>
          Daryabadi
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTranslation("en.hilali")}>
          Hilali
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TranslationSelector;
