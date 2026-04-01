import { useRef, useState } from 'react';
import { useARScene } from '../ar/useARScene';
import CameraPermissionScreen from '../components/CameraPermissionScreen';
import ARFallback from '../components/ARFallback';
import DishStrip, { type DishPill } from '../components/DishStrip';

// Placeholder dishes — all use the same GLB for now.
// Replace modelUrl values with real dish GLBs in Sprint 2.
const PLACEHOLDER_DISHES: DishPill[] = [
  {
    id: '1',
    name: 'Margherita Pizza',
    emoji: '🍕',
    modelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  },
  {
    id: '2',
    name: 'Pasta Carbonara',
    emoji: '🍝',
    modelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  },
  {
    id: '3',
    name: 'Bruschetta',
    emoji: '🥖',
    modelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  },
  {
    id: '4',
    name: 'Tiramisu',
    emoji: '🍮',
    modelUrl: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  },
];

export default function MenuARPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeDish, setActiveDish] = useState(PLACEHOLDER_DISHES[0]);

  const { permission, requestPermission, isSupported } = useARScene(
    containerRef,
    activeDish.modelUrl
  );

  if (!isSupported) return <ARFallback />;

  if (permission === 'prompt') {
    return <CameraPermissionScreen onRequestPermission={requestPermission} />;
  }

  if (permission === 'denied') return <ARFallback />;

  return (
    <div className="relative w-full h-screen overflow-hidden bg-black">
      {/* AR canvas — MindAR renders inside here */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Top status bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
        <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <p className="text-white text-xs font-medium">Point camera at menu card</p>
        </div>
        <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <p className="text-white text-xs">{activeDish.emoji} {activeDish.name}</p>
        </div>
      </div>

      {/* Dish selection strip */}
      <DishStrip
        dishes={PLACEHOLDER_DISHES}
        activeDishId={activeDish.id}
        onSelect={setActiveDish}
      />
    </div>
  );
}
