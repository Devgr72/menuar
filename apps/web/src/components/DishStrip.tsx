export interface DishPill {
  id: string;
  name: string;
  emoji?: string;
  modelUrl: string;
  thumbnailUrl?: string;
}

interface DishStripProps {
  dishes: DishPill[];
  activeDishId: string | null;
  onSelect: (dish: DishPill) => void;
}

export default function DishStrip({ dishes, activeDishId, onSelect }: DishStripProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 pb-8">
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />

      <div
        className="relative flex gap-3 overflow-x-auto px-4 pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {dishes.map((dish) => {
          const isActive = dish.id === activeDishId;
          return (
            <button
              key={dish.id}
              onClick={() => onSelect(dish)}
              className={`
                flex-none flex items-center gap-2 pl-1 pr-4 py-1 rounded-full
                text-sm font-semibold transition-all duration-200
                ${isActive
                  ? 'bg-white text-black shadow-lg scale-105'
                  : 'bg-black/60 text-white backdrop-blur-sm border border-white/20 active:scale-95'}
              `}
            >
              {dish.thumbnailUrl ? (
                <img
                  src={dish.thumbnailUrl}
                  alt={dish.name}
                  className="w-8 h-8 rounded-full object-cover flex-none border-2 border-white/20"
                />
              ) : (
                <span className="text-base flex-none px-1">{dish.emoji ?? '🍽️'}</span>
              )}
              {dish.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
