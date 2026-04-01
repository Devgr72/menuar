import React from 'react';

export default function ARFallback() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4 text-red-400">AR Not Available</h2>
        <p className="text-gray-400 mb-8 leading-relaxed">
          Either camera permission was denied or your device doesn't support WebAR right now.
        </p>
        
        <div className="w-full aspect-square bg-gray-800 rounded-xl flex items-center justify-center border border-gray-700 mb-8 shadow-inner overflow-hidden">
          <div className="w-32 h-32 relative">
             <div className="w-full h-full border-4 border-blue-500/20 rounded-lg animate-spin" style={{ animationDuration: '3s' }} />
             <div className="absolute inset-0 flex items-center justify-center">
               <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">2D Viewer</span>
             </div>
          </div>
        </div>

        <p className="text-sm text-gray-500">
          We will show an interactive 3D viewer here in the classic 2D interface as a fallback.
        </p>
      </div>
    </div>
  );
}
