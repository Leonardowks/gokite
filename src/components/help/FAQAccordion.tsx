import { FAQItem } from "@/lib/helpContent";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

interface FAQAccordionProps {
  items: FAQItem[];
  searchQuery?: string;
}

function highlightText(text: string, query: string) {
  if (!query) return text;
  
  const parts = text.split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) => 
    part.toLowerCase() === query.toLowerCase() 
      ? <mark key={i} className="bg-amber-500/30 text-foreground rounded px-0.5">{part}</mark>
      : part
  );
}

export function FAQAccordion({ items, searchQuery = "" }: FAQAccordionProps) {
  return (
    <Accordion type="single" collapsible className="space-y-2">
      {items.map((item) => (
        <AccordionItem 
          key={item.id} 
          value={item.id}
          className="border border-border/50 rounded-xl px-4 data-[state=open]:bg-muted/30"
        >
          <AccordionTrigger className="text-sm text-left hover:no-underline py-3">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-foreground">
                {highlightText(item.pergunta, searchQuery)}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground pl-7 pb-4">
            {highlightText(item.resposta, searchQuery)}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
