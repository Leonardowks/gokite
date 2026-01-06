import { memo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Smile } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  disabled?: boolean;
}

const emojiCategories = {
  frequentes: ['😀', '😂', '❤️', '👍', '🔥', '🎉', '😊', '🙏', '😍', '🤔', '😅', '👏'],
  rostos: ['😀', '😁', '😂', '🤣', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨'],
  gestos: ['👍', '👎', '👏', '🙌', '🤝', '✌️', '🤞', '👋', '🤙', '💪', '🙏', '✋', '🤚', '👌', '🤏', '👊', '🤛', '🤜', '👆', '👇', '👈', '👉', '☝️', '🖐️'],
  natureza: ['☀️', '🌊', '💨', '🌴', '🏄', '🪁', '⛵', '🏝️', '🌅', '🌤️', '⛱️', '🐬'],
  objetos: ['📱', '💰', '🏠', '🚗', '✈️', '🎁', '📧', '📅', '💳', '🎯', '📍', '⏰'],
  simbolos: ['✅', '❌', '⭐', '💯', '🆗', '🔴', '🟢', '🔵', '⚡', '💡', '🎵', '💬'],
};

export const EmojiPicker = memo(function EmojiPicker({ onEmojiSelect, disabled }: EmojiPickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          disabled={disabled}
          className="h-10 w-10 shrink-0"
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="start" 
        className="w-72 p-2"
        sideOffset={8}
      >
        <div className="space-y-2">
          {/* Frequentes */}
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1 px-1">
              Frequentes
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {emojiCategories.frequentes.map((emoji, i) => (
                <button
                  key={`freq-${i}`}
                  onClick={() => onEmojiSelect(emoji)}
                  className={cn(
                    'h-8 w-8 flex items-center justify-center rounded-md text-lg',
                    'hover:bg-muted transition-colors'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Natureza/Kite */}
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1 px-1">
              Natureza
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {emojiCategories.natureza.map((emoji, i) => (
                <button
                  key={`nat-${i}`}
                  onClick={() => onEmojiSelect(emoji)}
                  className={cn(
                    'h-8 w-8 flex items-center justify-center rounded-md text-lg',
                    'hover:bg-muted transition-colors'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Gestos */}
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1 px-1">
              Gestos
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {emojiCategories.gestos.slice(0, 16).map((emoji, i) => (
                <button
                  key={`gest-${i}`}
                  onClick={() => onEmojiSelect(emoji)}
                  className={cn(
                    'h-8 w-8 flex items-center justify-center rounded-md text-lg',
                    'hover:bg-muted transition-colors'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Símbolos */}
          <div>
            <p className="text-[10px] uppercase text-muted-foreground font-medium mb-1 px-1">
              Símbolos
            </p>
            <div className="grid grid-cols-8 gap-0.5">
              {emojiCategories.simbolos.map((emoji, i) => (
                <button
                  key={`simb-${i}`}
                  onClick={() => onEmojiSelect(emoji)}
                  className={cn(
                    'h-8 w-8 flex items-center justify-center rounded-md text-lg',
                    'hover:bg-muted transition-colors'
                  )}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});
