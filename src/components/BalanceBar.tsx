import { motion } from 'framer-motion';

interface BalanceBarProps {
  balance: number;
  currency: string;
}

export function BalanceBar({ balance, currency }: BalanceBarProps) {
  const isPositive = balance >= 0;

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-card border-b-1.5 border-foreground px-4 py-2.5 flex items-center justify-between"
    >
      <span className="text-xs text-muted-foreground">your net balance</span>
      <span className={`font-display text-base ${isPositive ? 'text-positive' : 'text-negative'}`}>
        {isPositive ? '+' : '-'}{currency}{Math.abs(balance).toFixed(2)}
      </span>
    </motion.div>
  );
}
