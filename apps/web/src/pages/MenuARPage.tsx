import React, { useRef } from 'react';
import { useARScene } from '../ar/useARScene';
import CameraPermissionScreen from '../components/CameraPermissionScreen';
import ARFallback from '../components/ARFallback';

export default function MenuARPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { permission, requestPermission, isSupported } = useARScene(containerRef);

  if (!isSupported) {
    return <ARFallback />;
  }

  if (permission === 'prompt') {
    return <CameraPermissionScreen onRequestPermission={requestPermission} />;
  }

  if (permission === 'denied') {
    return <ARFallback />;
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
       {/* The AR container */}
       <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />
       
       {/* Overlay UI */}
       <div className="absolute top-4 left-4 z-10 text-white bg-black/50 p-2 rounded pointer-events-none">
          <p className="font-semibold">AR Scene Active</p>
          <p className="text-xs text-gray-300">Point at a target or surface to see the 3D cube</p>
       </div>
    </div>
  );
}
