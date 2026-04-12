import React from 'react';
import type { Dish } from '@menuar/types';

interface DishInfoPanelProps {
  dish: Dish;
  onClose: () => void;
  onViewAR: () => void;
}

export default function DishInfoPanel({ dish, onClose, onViewAR }: DishInfoPanelProps) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300" 
        onClick={onClose}
      />
      
      {/* Content Side Drawer/Modal */}
      <div className="relative bg-[#FAFAFA] rounded-t-[3rem] shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-500 ease-out">
        {/* Header / Grabber */}
        <div className="flex-none p-4 flex justify-center">
            <div className="w-12 h-1.5 bg-[#E8DDBF] rounded-full" />
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white shadow-md border border-[#F1F5F9] flex items-center justify-center text-[#94A3B8] z-10 active:scale-90 transition-transform"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex-1 overflow-y-auto px-8 pb-10">
          {/* 3D Model Viewer Container */}
          <div className="relative w-full aspect-square rounded-[2rem] bg-white border border-[#F1F5F9] shadow-inner mb-8 overflow-hidden group">
            <model-viewer
              src={dish.modelUrl}
              alt={dish.name}
              camera-controls
              auto-rotate
              shadow-intensity="1"
              environment-image="neutral"
              exposure="1"
              style={{ width: '100%', height: '100%', background: 'transparent' }}
            />
             <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#F1F5F9] pointer-events-none">
                <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                  Interactive 3D
                </p>
             </div>
          </div>

          {/* Dish Details */}
          <div className="space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                   {dish.isVeg !== undefined && (
                      <div className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center ${dish.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                         <div className={`w-2 h-2 rounded-full ${dish.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                      </div>
                   )}
                   <span className="font-outfit text-xs font-bold text-[#94A3B8] uppercase tracking-widest">
                     {dish.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                   </span>
                </div>
                <h2 className="font-fraunces text-3xl font-bold text-[#1E293B] leading-tight">{dish.name}</h2>
              </div>
              <div className="bg-[#FFFBEB] px-4 py-2 rounded-2xl border border-[#FEF3C7]">
                <p className="font-fraunces font-bold text-2xl text-[#B45309]">₹{dish.price}</p>
              </div>
            </div>

            <div className="space-y-3">
               <h4 className="font-outfit text-xs font-bold text-[#94A3B8] uppercase tracking-widest">About this dish</h4>
               <p className="font-outfit text-[#64748B] leading-relaxed text-base">
                 {dish.description || 'A gourmet preparation crafted with high-quality ingredients, designed to provide a rich and authentic flavor experience.'}
               </p>
            </div>

            {/* AR Button */}
            <button 
              onClick={onViewAR}
              className="w-full flex items-center justify-center gap-3 py-5 rounded-[1.5rem] bg-[#1E293B] hover:bg-[#2C4A2C] text-white shadow-xl shadow-[#1e293b20] transition-all duration-300 transform active:scale-[0.98]"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-outfit font-bold text-lg">View on Table (AR)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
