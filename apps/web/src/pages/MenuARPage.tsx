import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import type { Dish } from '@menuar/types';
import { useMenu } from '../hooks/useMenu';
import DishStrip, { type DishPill } from '../components/DishStrip';
import DishInfoPanel from '../components/DishInfoPanel';

// Map Dish → DishPill for the strip
function toPill(dish: Dish): DishPill {
  const DISH_EMOJIS: Record<string, string> = {
    margherita: '🍕', pepperoni: '🍕', bbq: '🍕', truffle: '🍕', fungi: '🍕',
    pasta: '🍝', carbonara: '🍝', arrabbiata: '🍝',
    tiramisu: '🍮', panna: '🍮', dessert: '🍮',
  };
  const key = Object.keys(DISH_EMOJIS).find((k) =>
    dish.name.toLowerCase().includes(k)
  );
  return {
    id: dish.id,
    name: dish.name,
    emoji: key ? DISH_EMOJIS[key] : '🍽️',
    modelUrl: dish.modelUrl ?? 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  };
}

export default function MenuARPage() {
  const { restaurantSlug } = useParams<{ restaurantSlug?: string }>();
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get('table');

  const { restaurant, dishes, loading, usingMockData } = useMenu(restaurantSlug);

  const [activeDish, setActiveDish] = useState<Dish | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const currentDish = activeDish ?? dishes[0] ?? null;

  const handleDishSelect = (pill: DishPill) => {
    const dish = dishes.find((d) => d.id === pill.id);
    if (dish) {
      setActiveDish(dish);
      setInfoOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-10 h-10 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (!currentDish) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-white text-center">No dishes available.</p>
      </div>
    );
  }

  const modelUrl = currentDish.modelUrl ?? 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
  const pills = dishes.map(toPill);

  return (
    <div className="relative w-full h-screen bg-black flex flex-col overflow-hidden">

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-safe px-4 pt-4 flex items-center justify-between pointer-events-none">
        <div className="bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <p className="text-white text-sm font-semibold">{restaurant.name}</p>
          {tableId && <p className="text-gray-400 text-xs">Table {tableId}</p>}
        </div>
        {usingMockData && (
          <div className="bg-yellow-500/20 border border-yellow-500/40 px-2 py-1 rounded-full">
            <p className="text-yellow-400 text-xs">Demo mode</p>
          </div>
        )}
      </div>

      {/* model-viewer — takes the full screen, handles AR launch */}
      <model-viewer
        src={modelUrl}
        alt={`3D model of ${currentDish.name}`}
        ar
        ar-modes="webxr scene-viewer quick-look"
        ar-scale="auto"
        ar-placement="floor"
        camera-controls
        auto-rotate
        auto-rotate-delay={2000}
        shadow-intensity="1"
        exposure="1"
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0a',
        }}
      >
        {/* Custom AR launch button */}
        <button
          slot="ar-button"
          className="absolute bottom-32 right-4 bg-white text-black font-bold text-sm px-5 py-3 rounded-full shadow-xl flex items-center gap-2 z-10"
        >
          <span>📱</span> View on Table
        </button>

        {/* Loading poster */}
        <div slot="progress-bar" />
      </model-viewer>

      {/* Dish name + info toggle */}
      <div className="absolute left-4 right-4 z-10" style={{ bottom: '130px' }}>
        <button
          onClick={() => setInfoOpen((o) => !o)}
          className="flex items-center gap-2 bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10"
        >
          <span className="text-white font-semibold text-sm">{currentDish.name}</span>
          <span className="text-white font-bold text-base">${currentDish.price.toFixed(2)}</span>
          <span className="text-gray-400 text-xs ml-auto">{infoOpen ? '▼' : 'ℹ'}</span>
        </button>
      </div>

      {/* Dish strip */}
      <DishStrip
        dishes={pills}
        activeDishId={currentDish.id}
        onSelect={handleDishSelect}
      />

      {/* Info panel slide-up */}
      {infoOpen && (
        <DishInfoPanel
          dish={currentDish}
          onClose={() => setInfoOpen(false)}
        />
      )}
    </div>
  );
}
