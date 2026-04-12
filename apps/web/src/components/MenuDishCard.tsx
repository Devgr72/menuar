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
        {dish.price > 0 && (
          <div className="absolute top-1 right-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-[#F1F5F9]">
            <p className="text-[10px] font-bold text-[#1E293B]">₹{dish.price}</p>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-1">
          {dish.isVeg !== undefined && (
             <div className={`w-3.5 h-3.5 border-2 rounded-sm flex items-center justify-center ${dish.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                <div className={`w-1.5 h-1.5 rounded-full ${dish.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
             </div>
          )}
          <h3 className="font-fraunces font-bold text-lg text-[#1E293B] truncate">{dish.name}</h3>
        </div>
        <p className="font-outfit text-xs text-[#64748B] line-clamp-2 leading-relaxed">
          {dish.description || 'Deliciously crafted for your table.'}
        </p>
      </div>

      <div className="flex-none flex items-center pr-2">
        <div className="w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center text-[#94A3B8] group-hover:bg-[#2C4A2C] group-hover:text-white transition-colors duration-300">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
}
