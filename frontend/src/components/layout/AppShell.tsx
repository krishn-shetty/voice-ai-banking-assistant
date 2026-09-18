import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Header } from './Header';
import { SidebarNav } from './Sidebar';
import { Footer } from './Footer';
import { useCall } from '../../contexts/CallContext';

export function AppShell({ children }: {children: React.ReactNode;}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { assistant } = useCall();

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-canvas">
      <Header onOpenMenu={() => setMenuOpen(true)} />

      <div className="flex min-h-0 w-full flex-1">
        <aside className="hidden w-[196px] shrink-0 border-r border-line md:block">
          <div className="sticky top-16 h-[calc(100vh-4rem)]">
            <SidebarNav />
          </div>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
      </div>

      <Footer />

      <AnimatePresence>
        {menuOpen &&
        <div className="fixed inset-0 z-40 md:hidden">
            <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-ink/20"
            onClick={() => setMenuOpen(false)} />
          
            <motion.div
            role="dialog"
            aria-label="Navigation menu"
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            className="absolute inset-y-0 left-0 w-[264px] border-r border-line bg-white">
            
              <div className="flex items-center justify-between px-4 py-4">
                <p className="text-base font-bold text-ink">{assistant.name}</p>
                <button
                type="button"
                aria-label="Close navigation menu"
                onClick={() => setMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-muted hover:bg-slate-50">
                
                  <X className="h-[18px] w-[18px]" aria-hidden="true" />
                </button>
              </div>
              <SidebarNav onNavigate={() => setMenuOpen(false)} />
            </motion.div>
          </div>
        }
      </AnimatePresence>
    </div>);

}
