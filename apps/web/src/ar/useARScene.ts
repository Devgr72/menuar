// @ts-ignore
import { MindARThree } from 'mind-ar/dist/mindar-image-three.prod.js';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadModel, disposeModel } from './modelLoader';

export function useARScene(
  containerRef: React.RefObject<HTMLDivElement>,
  modelUrl?: string
) {
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isSupported, setIsSupported] = useState(true);
  const [arReady, setArReady] = useState(false);

  const mindarRef = useRef<any>(null);
  const anchorGroupRef = useRef<THREE.Group | null>(null);
  const activeModelRef = useRef<THREE.Group | null>(null);

  const requestPermission = async (): Promise<boolean> => {
    try {
      if (navigator.permissions?.query) {
        try {
          const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
          if (result.state === 'granted') {
            setPermission('granted');
            return true;
          }
        } catch (_) {}
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stream.getTracks().forEach((t) => t.stop());
      setPermission('granted');
      return true;
    } catch {
      setPermission('denied');
      return false;
    }
  };

  // AR scene initialization — runs once camera permission is granted
  useEffect(() => {
    if (permission !== 'granted' || !containerRef.current) return;

    let stopRequested = false;
    let renderer: THREE.WebGLRenderer;
    let mindarThree: any;

    const startAR = async () => {
      try {
        mindarThree = new MindARThree({
          container: containerRef.current,
          imageTargetSrc:
            'https://cdn.jsdelivr.net/gh/hiukim/mind-ar-js@1.2.0/examples/image-tracking/assets/card-example/card.mind',
          maxTrack: 1,
          filterMinCF: 0.001,
          filterBeta: 1000,
          warmupTolerance: 5,
          missTolerance: 5,
        });

        mindarRef.current = mindarThree;

        const { scene, camera } = mindarThree;
        renderer = mindarThree.renderer;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        const anchor = mindarThree.addAnchor(0);
        anchorGroupRef.current = anchor.group;

        await mindarThree.start();
        if (stopRequested) {
          mindarThree.stop();
          return;
        }

        setArReady(true);

        renderer.setAnimationLoop(() => {
          // Gently rotate the active dish model
          if (activeModelRef.current) {
            activeModelRef.current.rotation.y += 0.008;
          }
          renderer.render(scene, camera);
        });
      } catch (err) {
        console.error('Failed to start AR:', err);
        setIsSupported(false);
      }
    };

    startAR();

    return () => {
      stopRequested = true;
      setArReady(false);
      anchorGroupRef.current = null;

      if (renderer) renderer.setAnimationLoop(null);

      if (mindarThree) {
        try {
          mindarThree.stop();
          mindarThree.renderer?.dispose();
        } catch (e) {
          console.warn('AR cleanup error:', e);
        }
      }
    };
  }, [permission, containerRef]);

  // Model swap — runs whenever modelUrl or arReady changes
  useEffect(() => {
    if (!arReady || !anchorGroupRef.current) return;

    // Remove and dispose the previous model
    if (activeModelRef.current) {
      anchorGroupRef.current.remove(activeModelRef.current);
      disposeModel(activeModelRef.current);
      activeModelRef.current = null;
    }

    if (!modelUrl) return;

    let cancelled = false;

    loadModel(modelUrl)
      .then((model) => {
        if (cancelled || !anchorGroupRef.current) return;

        // Fit model to a reasonable AR size (~15cm)
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 0.15 / maxDim;
        model.scale.setScalar(scale);

        // Center model above anchor origin
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center.multiplyScalar(scale));
        model.position.y += 0.08; // float slightly above surface

        anchorGroupRef.current.add(model);
        activeModelRef.current = model;
      })
      .catch((err) => {
        if (!cancelled) console.error('Model load failed:', err);
      });

    return () => {
      cancelled = true;
    };
  }, [modelUrl, arReady]);

  return { permission, requestPermission, isSupported };
}
