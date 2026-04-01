import type { Dish } from '@menuar/types';

interface DishInfoPanelProps {
  dish: Dish;
  onClose: () => void;
}

const SPICE_LABELS = ['No spice', 'Mild', 'Medium', 'Hot'];
const SPICE_COLORS = ['text-gray-400', 'text-yellow-400', 'text-orange-400', 'text-red-400'];

export default function DishInfoPanel({ dish, onClose }: DishInfoPanelProps) {
  return (
    <div className="absolute inset-x-0 bottom-0 z-20 bg-gray-900 rounded-t-2xl p-6 pb-10 shadow-2xl">
      {/* Drag handle */}
      <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-5" />

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1">
            {dish.isVeg ? (
              <span className="text-xs bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-full">VEG</span>
            ) : (
              <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full">NON-VEG</span>
            )}
            {dish.spiceLevel > 0 && (
              <span className={`text-xs font-medium ${SPICE_COLORS[dish.spiceLevel]}`}>
                {'🌶'.repeat(dish.spiceLevel)} {SPICE_LABELS[dish.spiceLevel]}
              </span>
            )}
          </div>
          <h2 className="text-white text-xl font-bold">{dish.name}</h2>
        </div>
        <div className="text-right">
          <p className="text-white text-xl font-bold">${dish.price.toFixed(2)}</p>
          <button onClick={onClose} className="text-gray-500 text-xs mt-1">✕ close</button>
        </div>
      </div>

      <p className="text-gray-300 text-sm leading-relaxed mb-4">{dish.description}</p>

      {dish.allergens.length > 0 && (
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1.5">Contains</p>
          <div className="flex flex-wrap gap-1.5">
            {dish.allergens.map((a) => (
              <span key={a} className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-md capitalize border border-gray-700">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
