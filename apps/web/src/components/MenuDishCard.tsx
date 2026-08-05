import React from 'react';
import type { Dish } from '@menuar/types';

interface MenuDishCardProps {
  dish: Dish;
  onClick: () => void;
}

export default function MenuDishCard({ dish, onClick }: MenuDishCardProps) {
  return (
    <div 
      onClick={onClick}
      className="group bg-white rounded-[2rem] p-4 flex gap-4 border border-[#F1F5F9] active:scale-[0.98] transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
    >
      <div className="flex-none w-24 h-24 rounded-2xl overflow-hidden bg-[#F8FAFC] border border-[#F1F5F9] relative">
        {dish.thumbnailUrl ? (
          <img 
            src={dish.thumbnailUrl} 
            alt={dish.name} 
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-[#94A3B8]">
            🍽️
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5">
        <div className="flex items-center gap-2">
          {dish.isVeg !== undefined && (
             <div className={`w-3.5 h-3.5 border-2 rounded-sm flex items-center justify-center ${dish.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${dish.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
             </div>
          )}
          <h3 className="font-fraunces font-bold text-lg text-[#0F2747] truncate">{dish.name}</h3>
        </div>
        <p className="font-outfit text-sm font-bold text-[#0F2747]/70">
          ₹{dish.price}
        </p>
        <p className="font-outfit text-[10px] text-[#94A3B8] font-bold uppercase tracking-widest">
          Tap for details
        </p>
      </div>

      <div className="flex-none flex items-center pr-2">
        <div className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8] group-hover:bg-[#FF6B00] group-hover:text-white transition-colors duration-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
