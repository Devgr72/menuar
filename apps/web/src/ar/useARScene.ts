// @ts-ignore
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';

export function useARScene(containerRef: React.RefObject<HTMLDivElement>) {
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  const mindarRef = useRef<any>(null);

  const requestPermission = async () => {
    try {
      if (navigator.permissions && navigator.permissions.query) {
         try {
           const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
           if (result.state === 'granted') {
             setPermission('granted');
             return true;
           }
         } catch(e) {}
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach(track => track.stop());
      setPermission('granted');
      return true;
    } catch (err) {
      console.error("Camera permission denied", err);
      setPermission('denied');
      return false;
    }
  };

  useEffect(() => {
    let renderer: THREE.WebGLRenderer;
    let mindarThree: any;
    let stopRequested = false;

    const startAR = async () => {
      if (permission !== 'granted' || !containerRef.current) return;

      try {
        mindarThree = new MindARThree({
          container: containerRef.current,
          // Using a public default target for initial surface detection & demo purposes
          imageTargetSrc: 'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.0/examples/image-tracking/assets/card-example/card.mind',
          maxTrack: 1,
        });

        mindarRef.current = mindarThree;

        const { scene, camera } = mindarThree;
        renderer = mindarThree.renderer;

        const anchor = mindarThree.addAnchor(0);
        
        // Add a rotating cube as requested for MVP phase 1
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshNormalMaterial();
        const cube = new THREE.Mesh(geometry, material);
        anchor.group.add(cube);

        await mindarThree.start();
        
        if (stopRequested) {
           mindarThree.stop();
           return;
        }

        renderer.setAnimationLoop(() => {
          cube.rotation.x += 0.01;
          cube.rotation.y += 0.01;
          renderer.render(scene, camera);
        });

      } catch (err) {
        console.error("Failed to start AR", err);
        setIsSupported(false);
      }
    };

    if (permission === 'granted') {
      startAR();
    }

    return () => {
      stopRequested = true;
      if (renderer) {
        renderer.setAnimationLoop(null);
      }
      if (mindarThree) {
        try {
          mindarThree.stop();
          if (mindarThree.renderer) {
             mindarThree.renderer.dispose();
          }
        } catch (e) {
          console.warn('Error during AR cleanup', e);
        }
      }
    };
  }, [permission, containerRef]);

  return {
    permission,
    requestPermission,
    isSupported
  };
}
