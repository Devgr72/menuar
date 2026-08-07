import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { Dish } from '@menuar/types';
import { useMenu } from '../hooks/useMenu';
import MenuDishCard from '../components/MenuDishCard';
import DishInfoPanel from '../components/DishInfoPanel';

export default function MenuARPage() {
  const { restaurantSlug } = useParams<{ restaurantSlug?: string }>();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table');
  const isPreview = searchParams.get('preview') === '1';

  const { restaurant, categories, loading } = useMenu(restaurantSlug, { skipScanTracking: isPreview });
  const dishCount = categories.reduce((sum, c) => sum + c.dishes.length, 0);

  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [arStatus, setArStatus] = useState<'idle' | 'placing' | 'placed' | 'unsupported'>('idle');
  const [hint, setHint] = useState<string | null>(null);

  const modelViewerRef = useRef<HTMLElement | null>(null);

  // ── Listen to model-viewer AR lifecycle events ────────────────────────────
  useEffect(() => {
    const mv = modelViewerRef.current;
    if (!mv) return;

    const onArStatus = (e: Event) => {
      const status = (e as CustomEvent).detail?.status as string | undefined;
      if (status === 'session-started') {
        setArStatus('placing');
        setHint('Move your phone slowly over the table');
      } else if (status === 'object-placed') {
        setArStatus('placed');
        setHint('Pinch to resize  •  Drag to move');
        setTimeout(() => setHint(null), 3000);
      } else if (status === 'failed') {
        setArStatus('unsupported');
        setHint('AR is not supported on this device.');
        setTimeout(() => setHint(null), 4000);
      }
    };

    mv.addEventListener('ar-status', onArStatus);
    return () => {
      mv.removeEventListener('ar-status', onArStatus);
    };
  }, []);

  const handleOpenDetail = (dish: Dish) => {
    setSelectedDish(dish);
  };

  const handleLaunchAR = () => {
    const mv = modelViewerRef.current as any;
    if (!mv) return;

    if (mv.canActivateAR) {
      mv.activateAR();
    } else {
      setHint('AR is not supported on this device.');
      setTimeout(() => setHint(null), 4000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="text-center">
          <img src="/dishdekho-logo.png" alt="DishDekho" className="w-36 h-auto mx-auto mb-8" />
          <div className="w-12 h-12 border-4 border-[#0F2747]/10 border-t-[#0F2747] rounded-full animate-spin mx-auto mb-6" />
          <p className="font-outfit text-[#64748B] text-sm font-medium tracking-wide">Preparing your menu…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] sm:bg-slate-100 flex sm:items-center sm:justify-center font-outfit select-none sm:py-8">
      {/* ── Desktop Phone Frame Wrapper ── */}
      <div className="w-full sm:max-w-[400px] min-h-screen sm:min-h-[800px] sm:h-[85vh] bg-[#FAFAFA] sm:rounded-[3rem] sm:shadow-2xl sm:border-[12px] sm:border-slate-800 relative flex flex-col overflow-hidden">
        
        {/* ── Scrollable Content Area ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-12 relative">
          
          {/* ── Background AR Host (Invisible until triggered) ────────────────── */}
          <model-viewer
            ref={modelViewerRef as React.RefObject<HTMLElement>}
            src={selectedDish?.modelUrl ?? ''}
            ar
            ar-modes="webxr scene-viewer quick-look"
            ar-scale="auto"
            ar-placement="floor"
            style={{ display: 'none' }}
          >
            <button slot="ar-button" style={{ display: 'none' }} />
          </model-viewer>

          {/* ── Sticky Header ─────────────────────────────────────────────────── */}
          <header className="sticky top-0 z-50 bg-[#FAFAFA]/80 backdrop-blur-xl border-b border-[#F1F5F9] px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white border border-[#F1F5F9] shadow-sm flex items-center justify-center overflow-hidden">
                <img src={restaurant.logoUrl || '/dishdekho-icon.png'} alt={restaurant.name} className="w-full h-full object-contain p-1.5" />
              </div>
              <div>
                <h1 className="font-fraunces font-bold text-lg text-[#0F2747] leading-none">{restaurant.name}</h1>
                <p className="font-outfit text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest mt-1">Live digital menu</p>
              </div>
            </div>
            {tableId && (
              <div className="bg-[#0F2747] px-3 py-1.5 rounded-xl border border-[#334155] shadow-lg">
                <p className="text-white text-[10px] font-black tracking-widest uppercase">Table {tableId}</p>
              </div>
            )}
          </header>

          {/* ── Hero / Welcome ────────────────────────────────────────────────── */}
          <section className="px-6 pt-6 pb-6">
            <span className="inline-block px-3 py-1 rounded-full bg-[#FF6B00]/5 text-[#FF6B00] text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
              {restaurant.heroTagline || 'Interactive Dining'}
            </span>
            <h2 className="font-fraunces text-[2rem] leading-tight font-bold text-[#0F2747] mb-3">
              {restaurant.heroHeading1 || 'Experience Food'} <br />
              <span className="text-[#FF6B00] whitespace-nowrap">{restaurant.heroHeading2 || 'Before You Order.'}</span>
            </h2>
            <p className="text-[#64748B] text-sm leading-relaxed max-w-[280px]">
              {restaurant.heroDescription || 'Scan, view, and interact with our signature dishes in augmented reality.'}
            </p>
          </section>

          {/* ── Menu List ───────────────────────────────────────────────────── */}
          <main className="px-6 pt-4 space-y-10">
            <div className="flex items-center justify-between -mb-6">
              <h3 className="font-fraunces font-bold text-xl text-[#0F2747]">Our Menu</h3>
            </div>

            {dishCount > 0 ? (
              categories
                .filter((category) => category.dishes.length > 0)
                .map((category) => (
                  <div key={category.id} className="space-y-4">
                    <h4 className="font-fraunces font-bold text-lg text-[#0F2747]/80 uppercase tracking-wide">
                      {category.name}
                    </h4>
                    {category.dishes.map((dish) => (
                      <MenuDishCard
                        key={dish.id}
                        dish={dish}
                        onClick={() => handleOpenDetail(dish)}
                      />
                    ))}
                  </div>
                ))
            ) : (
              <div className="py-20 text-center space-y-4 bg-white rounded-[2.5rem] border border-dashed border-[#E2E8F0]">
                <div className="w-16 h-16 bg-[#F8FAFC] rounded-full flex items-center justify-center mx-auto text-2xl">🍽️</div>
                <p className="text-[#94A3B8] font-medium italic">Our chefs are preparing the menu...</p>
              </div>
            )}
          </main>

          {/* ── Footer Branding ──────────────────────────────────────────────── */}
          <footer className="mt-12 px-6 pb-8 text-center">
            <div className="flex flex-col items-center gap-3 opacity-50">
               <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-[0.3em]">Powered by</p>
               <img src="/dishdekho-logo.png" alt="DishDekho — Scan. Explore in AR. Order. Enjoy." className="w-32 h-auto" />
            </div>
          </footer>
        </div>

        {/* ── AR Status Hint ────────────────────────────────────────────────── */}
        {hint && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 text-center shadow-2xl">
              <p className="text-white text-sm font-medium">{hint}</p>
            </div>
          </div>
        )}

        {/* ── Detail Panel ─────────────────────────────────────────────────── */}
        {selectedDish && (
          <DishInfoPanel 
            dish={selectedDish} 
            onClose={() => setSelectedDish(null)}
            onViewAR={handleLaunchAR}
          />
        )}
      </div>
    </div>
  );
}
