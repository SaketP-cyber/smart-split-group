import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Trash2 } from 'lucide-react';
import { Member } from '@/lib/types';
import { AvatarBubble } from './AvatarBubble';

interface ManualBillDialogProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  currentUserId: string;
  onSubmit: (items: { name: string; price: number }[], tax: number, tip: number, payerId: string) => void;
}

export function ManualBillDialog({ isOpen, onClose, members, currentUserId, onSubmit }: ManualBillDialogProps) {
  const [items, setItems] = useState<{ name: string; price: string }[]>([{ name: '', price: '' }]);
  const [tax, setTax] = useState('');
  const [tip, setTip] = useState('');
  const [payerId, setPayerId] = useState(currentUserId);

  const addItem = () => setItems(prev => [...prev, { name: '', price: '' }]);

  const removeItem = (i: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateItem = (i: number, field: 'name' | 'price', value: string) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));
  };

  const handleSubmit = () => {
    const parsed = items
      .filter(i => i.name.trim() && parseFloat(i.price) > 0)
      .map(i => ({ name: i.name.trim(), price: parseFloat(i.price) }));
    if (parsed.length === 0) return;
    onSubmit(parsed, parseFloat(tax) || 0, parseFloat(tip) || 0, payerId);
    setItems([{ name: '', price: '' }]);
    setTax('');
    setTip('');
    setPayerId(currentUserId);
    onClose();
  };

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.price) || 0), 0);
  const total = subtotal + (parseFloat(tax) || 0) + (parseFloat(tip) || 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-foreground/30 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t-1.5 border-foreground rounded-t-3xl max-h-[85vh] overflow-auto"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg">add bill manually</h2>
                <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Items */}
              <div className="space-y-2 mb-4">
                <label className="text-xs text-muted-foreground font-medium">items</label>
                {items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className="flex-1 text-sm bg-muted rounded-lg px-3 py-2 border-1.5 border-foreground/10 focus:border-foreground outline-none"
                      placeholder="item name"
                      value={item.name}
                      onChange={(e) => updateItem(i, 'name', e.target.value)}
                    />
                    <input
                      className="w-24 text-sm font-mono-data bg-muted rounded-lg px-3 py-2 border-1.5 border-foreground/10 focus:border-foreground outline-none"
                      placeholder="0.00"
                      value={item.price}
                      onChange={(e) => updateItem(i, 'price', e.target.value)}
                      type="number"
                      step="0.01"
                    />
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={addItem}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                >
                  <Plus className="h-3 w-3" /> add item
                </button>
              </div>

              {/* Tax & Tip */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <label className="text-xs text-muted-foreground font-medium">tax</label>
                  <input
                    className="w-full text-sm font-mono-data bg-muted rounded-lg px-3 py-2 border-1.5 border-foreground/10 focus:border-foreground outline-none mt-1"
                    placeholder="0.00"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    type="number"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground font-medium">tip</label>
                  <input
                    className="w-full text-sm font-mono-data bg-muted rounded-lg px-3 py-2 border-1.5 border-foreground/10 focus:border-foreground outline-none mt-1"
                    placeholder="0.00"
                    value={tip}
                    onChange={(e) => setTip(e.target.value)}
                    type="number"
                    step="0.01"
                  />
                </div>
              </div>

              {/* Paid by */}
              <div className="mb-4">
                <label className="text-xs text-muted-foreground font-medium mb-2 block">paid by</label>
                <div className="flex gap-1 flex-wrap">
                  {members.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setPayerId(m.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all border-1.5 ${
                        payerId === m.id
                          ? 'bg-primary/15 border-primary/40 text-primary font-medium'
                          : 'bg-muted/50 border-transparent text-muted-foreground hover:border-foreground/20'
                      }`}
                    >
                      <AvatarBubble member={m} size="sm" isActive={payerId === m.id} />
                      <span className="max-w-[60px] truncate">{m.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-muted/50 rounded-xl p-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">total</span>
                  <span className="font-display text-foreground">${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={items.every(i => !i.name.trim() || !parseFloat(i.price))}
                className="w-full bg-foreground text-background rounded-xl py-3 font-display text-sm active:scale-[0.98] transition-transform disabled:opacity-40"
              >
                <Check className="h-4 w-4 inline mr-1" />
                add bill
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
