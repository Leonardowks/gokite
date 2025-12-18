import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppButtonProps {
  phone?: string;
  message?: string;
  className?: string;
}

export function WhatsAppButton({ 
  phone = "5548984091618", 
  message = "Olá! Gostaria de mais informações.",
  className = ""
}: WhatsAppButtonProps) {
  const handleClick = () => {
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${phone}?text=${encodedMessage}`, "_blank");
  };

  return (
    <Button
      onClick={handleClick}
      className={`fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-[#25D366] hover:bg-[#128C7E] text-white ${className}`}
      size="icon"
    >
      <MessageCircle className="h-6 w-6" />
    </Button>
  );
}
