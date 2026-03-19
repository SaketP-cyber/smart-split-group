import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Camera, Plus, Send, FileText } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  onUploadReceipt: (file: File) => void;
  onManualBill: () => void;
  isScanning?: boolean;
  scanLimitReached?: boolean;
}

export function ChatInput({ onSendMessage, onUploadReceipt, isScanning }: ChatInputProps) {
  const [text, setText] = useState('');
  const [showActions, setShowActions] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadReceipt(file);
      setShowActions(false);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-card border-t-1.5 border-foreground px-3 py-2 safe-area-pb">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex items-end gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowActions(!showActions)}
          className="h-9 w-9 rounded-full bg-muted flex items-center justify-center shrink-0 mb-0.5"
          disabled={isScanning}
        >
          <Plus className={`h-5 w-5 transition-transform ${showActions ? 'rotate-45' : ''}`} />
        </motion.button>

        {showActions && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mb-0.5 disabled:opacity-50"
          >
            <Camera className="h-5 w-5" />
          </motion.button>
        )}

        <div className="flex-1 bg-muted rounded-2xl border-1.5 border-foreground/10 px-3 py-2 flex items-end">
          <textarea
            className="flex-1 bg-transparent resize-none text-sm outline-none max-h-24 leading-snug placeholder:text-muted-foreground"
            placeholder="message..."
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={handleSend}
          disabled={!text.trim()}
          className="h-9 w-9 rounded-full bg-foreground text-background flex items-center justify-center shrink-0 mb-0.5 disabled:opacity-30"
        >
          <Send className="h-4 w-4" />
        </motion.button>
      </div>
    </div>
  );
}
