import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, Receipt, Users, Zap, Camera, Shield, Smartphone, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';

const stats = [
  { value: '10K+', label: 'Bills Split' },
  { value: '₹2Cr+', label: 'Money Tracked' },
  { value: '4.9★', label: 'User Rating' },
];

const features = [
  {
    icon: Camera,
    title: 'Snap & Split',
    desc: 'Point your camera at any receipt. AI reads every item and splits it instantly.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Users,
    title: 'Group Chat Built-In',
    desc: 'No more switching apps. Splits live right inside your group conversation.',
    color: 'bg-destructive/10 text-destructive',
  },
  {
    icon: Zap,
    title: 'Smart Ledger',
    desc: 'See who owes whom at a glance. One-tap settle up. Zero confusion.',
    color: 'bg-primary/10 text-primary',
  },
  {
    icon: Shield,
    title: 'Fair & Transparent',
    desc: 'Every split is visible to everyone. No hidden charges, no disputes.',
    color: 'bg-muted-foreground/10 text-muted-foreground',
  },
];

const steps = [
  { step: '01', title: 'Create A Group', desc: 'Add your friends, roommates, or travel buddies.' },
  { step: '02', title: 'Scan Or Add Bills', desc: 'Snap a receipt or enter amounts manually.' },
  { step: '03', title: 'Tap To Assign', desc: 'Tap avatars to assign items. Done in seconds.' },
  { step: '04', title: 'Settle Up', desc: 'See simplified debts. Pay and mark as settled.' },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } },
};

export default function Landing() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  const goToAuth = () => navigate('/auth');

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Sticky Nav */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between px-5 h-14">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-primary/10 border-1.5 border-primary/30 flex items-center justify-center">
              <Receipt className="h-4 w-4 text-primary" />
            </div>
            <span className="font-bold text-foreground tracking-tight">Smart Split</span>
          </div>
          <Button onClick={goToAuth} size="sm" className="rounded-xl bg-foreground text-background hover:bg-foreground/90 font-semibold text-xs px-5">
            Get Started
          </Button>
        </div>
      </motion.nav>

      {/* Hero */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-[100dvh] flex flex-col items-center justify-center text-center px-5 pt-14"
      >
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-destructive/5 rounded-full blur-3xl" />
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={stagger}
          className="relative z-10 max-w-2xl"
        >
          <motion.div variants={fadeUp} className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-semibold mb-6 border border-primary/20">
            <Zap className="h-3 w-3" /> AI-Powered Bill Splitting
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-5xl sm:text-7xl font-black leading-[0.9] tracking-tight mb-5">
            Stop Doing<br />
            <span className="text-primary">Math</span> After<br />
            Dinner
          </motion.h1>

          <motion.p variants={fadeUp} className="text-muted-foreground text-lg sm:text-xl max-w-md mx-auto mb-8 leading-relaxed">
            Scan A Receipt. Tap Avatars. Done.<br className="hidden sm:block" />
            No Spreadsheets. No Awkward Conversations.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              onClick={goToAuth}
              className="h-13 px-8 rounded-2xl bg-foreground text-background font-bold text-base shadow-lg hover:bg-foreground/90 hover:shadow-xl transition-all"
            >
              Start Splitting Free <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div variants={fadeUp} className="flex items-center justify-center gap-8 mt-12">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-2xl font-black text-foreground font-mono">{value}</p>
                <p className="text-xs text-muted-foreground font-medium">{label}</p>
              </div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute bottom-8 text-muted-foreground"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </motion.section>

      {/* How It Works */}
      <section className="py-24 px-5">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold mb-2 uppercase tracking-widest">How It Works</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-black mb-12">
              Four Steps. Zero Hassle.
            </motion.h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {steps.map(({ step, title, desc }) => (
                <motion.div
                  key={step}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  className="bg-card border-1.5 border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <span className="text-4xl font-black text-primary/20 font-mono">{step}</span>
                  <h3 className="text-lg font-bold mt-2 mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-5 bg-muted/30">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            <motion.p variants={fadeUp} className="text-primary text-sm font-semibold mb-2 uppercase tracking-widest">Features</motion.p>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-black mb-12">
              Everything You Need.<br />Nothing You Don't.
            </motion.h2>

            <div className="grid sm:grid-cols-2 gap-4">
              {features.map(({ icon: Icon, title, desc, color }) => (
                <motion.div
                  key={title}
                  variants={fadeUp}
                  whileHover={{ y: -4 }}
                  className="bg-card border-1.5 border-border rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`h-11 w-11 rounded-xl ${color} flex items-center justify-center mb-4`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Social Proof / Testimonial */}
      <section className="py-24 px-5">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-100px' }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="flex justify-center mb-6">
              <div className="flex -space-x-3">
                {['bg-primary', 'bg-destructive', 'bg-ring', 'bg-muted-foreground', 'bg-primary/70'].map((c, i) => (
                  <motion.div
                    key={i}
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1, type: 'spring', stiffness: 300 }}
                    className={`h-10 w-10 rounded-full ${c} border-3 border-background`}
                  />
                ))}
              </div>
            </motion.div>
            <motion.blockquote variants={fadeUp} className="text-2xl sm:text-3xl font-bold leading-snug mb-4">
              "We Used To Fight Over Bills After Every Trip. Now It Takes 30 Seconds."
            </motion.blockquote>
            <motion.p variants={fadeUp} className="text-muted-foreground font-medium">
              — A Group Of 6 Friends Who Traveled Goa Together
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-5">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-100px' }}
          variants={stagger}
          className="max-w-2xl mx-auto text-center"
        >
          <motion.div variants={fadeUp} className="bg-foreground text-background rounded-3xl p-10 sm:p-14 shadow-2xl">
            <Smartphone className="h-10 w-10 mx-auto mb-4 text-primary" />
            <h2 className="text-3xl sm:text-4xl font-black mb-3">Ready To Split?</h2>
            <p className="text-background/70 mb-8 text-lg">
              Join Thousands Who Stopped Doing Bill Math. It's Free.
            </p>
            <Button
              onClick={goToAuth}
              className="h-13 px-10 rounded-2xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 shadow-lg"
            >
              Get Started Now <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">Smart Split</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Smart Split. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
