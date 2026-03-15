import { motion } from 'framer-motion';
import { ArrowRight, Receipt, Users, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background max-w-md mx-auto">
      {/* Hero */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        >
          <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium mb-6">
            <Zap className="h-3 w-3" /> ai-powered splitting
          </div>
          <h1 className="font-display text-5xl leading-[0.95] text-foreground mb-3">
            smart<br />split
          </h1>
          <p className="text-muted-foreground text-lg text-pretty max-w-xs">
            scan a receipt. tap your avatar. done. no spreadsheets, no math.
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
          className="mt-8 space-y-2.5"
        >
          {[
            { icon: Receipt, label: 'ai receipt scanning', desc: 'snap → split in seconds' },
            { icon: Users, label: 'group chat', desc: 'splits live in conversation' },
            { icon: Zap, label: 'smart ledger', desc: 'who owes whom, simplified' },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3 bg-card border-1.5 border-foreground rounded-xl px-4 py-3 shadow-card-sm">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className="px-6 pb-8"
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/chat')}
          className="w-full bg-foreground text-background rounded-2xl py-4 font-display text-base flex items-center justify-center gap-2 shadow-card active:shadow-card-sm transition-shadow"
        >
          try the demo <ArrowRight className="h-4 w-4" />
        </motion.button>
        <p className="text-center text-xs text-muted-foreground mt-3">
          no sign up needed · works on any device
        </p>
      </motion.div>
    </div>
  );
}
