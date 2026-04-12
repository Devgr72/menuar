import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { Dish } from '@menuar/types';
import { useMenu } from '../hooks/useMenu';
import DishStrip, { type DishPill } from '../components/DishStrip';
import DishInfoPanel from '../components/DishInfoPanel';
import { getPizzaModelUrl } from '../ar/pizzaModel';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DISH_EMOJIS: Record<string, string> = {
  margherita: '🍕', pepperoni: '🍕', bbq: '🍕', truffle: '🍕', fungi: '🍕',
  pasta: '🍝', carbonara: '🍝', ramen: '🍜', bunshin: '🍜',
  tiramisu: '🍮', panna: '🍮',
};

function toPill(dish: Dish): DishPill {
  const key = Object.keys(DISH_EMOJIS).find((k) => dish.name.toLowerCase().includes(k));
  return {
    id: dish.id,
    name: dish.name,
    emoji: key ? DISH_EMOJIS[key] : '🍽️',
    modelUrl: dish.modelUrl ?? '',
    thumbnailUrl: dish.thumbnailUrl ?? undefined,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MenuARPage() {
  const { restaurantSlug } = useParams<{ restaurantSlug?: string }>();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table');

  const { restaurant, dishes, loading, usingMockData } = useMenu(restaurantSlug);

  const [activeDish, setActiveDish] = useState<Dish | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [modelUrl, setModelUrl] = useState<string | null>(null);
  const [modelLoading, setModelLoading] = useState(false);
  const [arStatus, setArStatus] = useState<'idle' | 'placing' | 'placed' | 'unsupported'>('idle');
  const [hint, setHint] = useState<string | null>(null);

  const modelViewerRef = useRef<HTMLElement | null>(null);
  const prevDishId = useRef<string | null>(null);

  const currentDish = activeDish ?? dishes[0] ?? null;

  // ── Resolve model URL whenever selected dish changes ──────────────────────
  useEffect(() => {
    if (!currentDish || currentDish.id === prevDishId.current) return;
    prevDishId.current = currentDish.id;

    const ASTRONAUT = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

    // Use the dish's own model URL if it's a real GLB (not the old astronaut placeholder)
    if (currentDish.modelUrl && currentDish.modelUrl !== ASTRONAUT) {
      setModelUrl(currentDish.modelUrl);
      return;
    }

    // Fallback: procedurally generate a pizza GLB
    setModelLoading(true);
    setModelUrl(null);

    getPizzaModelUrl(currentDish.name)
      .then((url) => {
        setModelUrl(url);
        setModelLoading(false);
      })
      .catch(() => {
        setModelUrl(ASTRONAUT);
        setModelLoading(false);
      });
  }, [currentDish?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
        setHint(null);
      }
    };

    const onArTracking = (e: Event) => {
      const state = (e as CustomEvent).detail?.state as string | undefined;
      if (state === 'tracking') {
        setHint('Tap the surface to place the pizza');
      }
    };

    mv.addEventListener('ar-status', onArStatus);
    mv.addEventListener('ar-tracking', onArTracking);
    return () => {
      mv.removeEventListener('ar-status', onArStatus);
      mv.removeEventListener('ar-tracking', onArTracking);
    };
  }, []);

  // ── Dish selection ─────────────────────────────────────────────────────────
  const handleDishSelect = useCallback((pill: DishPill) => {
    const dish = dishes.find((d) => d.id === pill.id);
    if (dish) {
      setActiveDish(dish);
      setInfoOpen(false);
      setArStatus('idle');
    }
  }, [dishes]);

  // ── Activate AR ────────────────────────────────────────────────────────────
  const handleViewOnTable = () => {
    const mv = modelViewerRef.current as any;
    if (!mv) return;

    if (mv.canActivateAR) {
      mv.activateAR();
    } else {
      setArStatus('unsupported');
      setHint('AR is not supported on this device. Use the 3D preview instead.');
      setTimeout(() => setHint(null), 4000);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm tracking-wide">Loading menu…</p>
        </div>
      </div>
    );
  }

  if (!currentDish) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-gray-500 text-center">No dishes available.</p>
      </div>
    );
  }

  const pills = dishes.map(toPill);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden select-none">

      {/* ── model-viewer — full-screen 3D / AR host ───────────────────────── */}
      <model-viewer
        ref={modelViewerRef as React.RefObject<HTMLElement>}
        src={modelUrl ?? undefined}
        alt={`3D model of ${currentDish.name}`}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="auto"
        ar-placement="floor"
        scale="0.4 0.4 0.4"
        camera-orbit="0deg 70deg auto"
        camera-controls
        auto-rotate
        auto-rotate-delay={1500}
        rotation-per-second="20deg"
        shadow-intensity="2"
        shadow-softness="0.5"
        exposure="0.9"
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          backgroundColor: '#080808',
          // @ts-expect-error — CSS custom properties
          '--progress-bar-color': 'rgba(249,115,22,0.7)',
          '--poster-color': 'transparent',
        }}
      >
        {/* Invisible — AR is triggered programmatically via handleViewOnTable */}
        <button slot="ar-button" style={{ display: 'none' }} />
      </model-viewer>

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 z-20 px-4 pt-5 flex items-start justify-between pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-white/10">
          <p className="text-white text-sm font-semibold leading-tight">{restaurant.name}</p>
          {tableId && (
            <p className="text-gray-400 text-xs leading-tight">Table {tableId}</p>
          )}
        </div>

        {usingMockData && (
          <div className="bg-orange-500/15 border border-orange-500/30 px-3 py-1.5 rounded-full">
            <p className="text-orange-400 text-xs font-medium">Demo Mode</p>
          </div>
        )}
      </div>

      {/* ── Model loading spinner (center overlay) ────────────────────────── */}
      {modelLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            <p className="text-gray-500 text-xs">Building pizza…</p>
          </div>
        </div>
      )}

      {/* ── AR status hint ────────────────────────────────────────────────── */}
      {hint && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
          <div className="bg-black/75 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 max-w-[260px] text-center">
            <p className="text-white text-sm font-medium">{hint}</p>
          </div>
        </div>
      )}

      {/* ── Gradient fade behind bottom UI ────────────────────────────────── */}
      <div className="absolute inset-x-0 bottom-0 h-80 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-10 pointer-events-none" />

      {/* ── Dish info row  (sits above the View-on-Table button) ─────────── */}
      <div className="absolute left-0 right-0 z-20 px-4" style={{ bottom: 228 }}>
        <button
          onClick={() => setInfoOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 bg-white/8 backdrop-blur-md border border-white/10 px-4 py-3 rounded-2xl active:scale-[0.98] transition-transform"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-none">
              {pills.find((p) => p.id === currentDish.id)?.emoji ?? '🍕'}
            </span>
            <div className="min-w-0 text-left">
              <p className="text-white font-semibold text-sm leading-tight truncate">
                {currentDish.name}
              </p>
              <p className="text-gray-400 text-xs leading-tight truncate">
                {currentDish.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-none">
            <span className="text-white font-bold text-base">
              {currentDish.price > 0 ? `₹${currentDish.price.toFixed(0)}` : ''}
            </span>
            <span className="text-gray-500 text-xs bg-white/10 rounded-full w-6 h-6 flex items-center justify-center">
              {infoOpen ? '▾' : 'ℹ'}
            </span>
          </div>
        </button>
      </div>

      {/* ── View on Table button ──────────────────────────────────────────── */}
      <div className="absolute left-0 right-0 z-20 px-4" style={{ bottom: 160 }}>
        <button
          onClick={handleViewOnTable}
          disabled={modelLoading || !modelUrl}
          className={`
            w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2.5
            transition-all duration-200 active:scale-[0.97]
            ${modelLoading || !modelUrl
              ? 'bg-white/10 text-gray-600 cursor-not-allowed'
              : arStatus === 'unsupported'
                ? 'bg-gray-700 text-gray-400'
                : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/25'
            }
          `}
        >
          {modelLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white/70 rounded-full animate-spin" />
              <span>Preparing model…</span>
            </>
          ) : arStatus === 'unsupported' ? (
            <>
              <span>📺</span>
              <span>3D Preview Only</span>
            </>
          ) : (
            <>
              <span className="text-lg">📷</span>
              <span>View on Table</span>
            </>
          )}
        </button>
      </div>

      {/* ── Dish strip (self-positions at bottom-0 via its own absolute CSS) */}
      <DishStrip
        dishes={pills}
        activeDishId={currentDish.id}
        onSelect={handleDishSelect}
      />

      {/* ── Info panel ────────────────────────────────────────────────────── */}
      {infoOpen && (
        <DishInfoPanel dish={currentDish} onClose={() => setInfoOpen(false)} />
      )}
    </div>
  );
}
