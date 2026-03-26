import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight } from 'lucide-react';
import { Debt, Member } from '@/lib/types';
import { AvatarBubble } from './AvatarBubble';

interface LedgerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  debts: Debt[];
  members: Member[];
  currency: string;
  onSettleUp?: (fromId: string, toId: string, amount: number) => void;
}

export function LedgerDrawer({ isOpen, onClose, debts, members, currency, onSettleUp }: LedgerDrawerProps) {
  const getMember = (id: string) => members.find(m => m.id === id)!;

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
            className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t-1.5 border-foreground rounded-t-3xl max-h-[70vh] overflow-auto"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg">Ledger</h2>
                <button onClick={onClose} className="p-1.5 hover:bg-muted rounded-full transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {debts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  All Settled Up! 🎉
                </p>
              ) : (
                <div className="space-y-3">
                  {debts.map((debt, i) => {
                    const from = getMember(debt.from);
                    const to = getMember(debt.to);
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 bg-muted/50 rounded-xl p-3 border-1.5 border-foreground/10"
                      >
                        <AvatarBubble member={from} size="md" isActive />
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-sm text-foreground">{from.name}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm text-foreground">{to.name}</span>
                        </div>
                        <AvatarBubble member={to} size="md" isActive />
                        <span className="font-display text-negative">
                          {currency}{debt.amount.toFixed(2)}
                        </span>
                        <button
                          onClick={() => onSettleUp?.(debt.from, debt.to, debt.amount)}
                          className="ml-1 px-2 py-1 text-xs bg-primary/10 text-primary rounded-lg font-display hover:bg-primary/20 transition-colors active:scale-95"
                        >
                          Settle
                        </button>
                      </motion.div>
                    );
                  })}
              </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
