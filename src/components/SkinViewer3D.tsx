import { useEffect, useRef } from 'react';
import { SkinViewer, IdleAnimation } from 'skinview3d';

interface SkinViewer3DProps {
  skinUrl?: string | null;
  skinModel?: 'classic' | 'slim';
  width?: number;
  height?: number;
}

export default function SkinViewer3D({ skinUrl, skinModel = 'classic', width = 220, height = 220 }: SkinViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const viewer = new SkinViewer({
      canvas: canvasRef.current,
      width,
      height,
    });
    viewerRef.current = viewer;

    viewer.animation = new IdleAnimation();
    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = true;
    viewer.controls.enablePan = false;

    // Load default or provided skin with model
    viewer.loadSkin(skinUrl || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', {
      model: skinModel === 'slim' ? 'slim' : 'default',
    });

    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, [width, height, skinModel]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    if (skinUrl) {
      viewer.loadSkin(skinUrl, { model: skinModel === 'slim' ? 'slim' : 'default' });
    }
  }, [skinUrl, skinModel]);

  return (
    <canvas
      ref={canvasRef}
      className="rounded-2xl"
      style={{ width, height, imageRendering: 'pixelated' }}
    />
  );
}
