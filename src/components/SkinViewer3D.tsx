import { useEffect, useRef, useState } from 'react';
import { SkinViewer, WalkingAnimation } from 'skinview3d';

interface SkinViewer3DProps {
  size?: number;
  skinUrl?: string | null;
  skinModel?: 'classic' | 'slim';
}

const STEVE_SKIN_URL = 'https://mc-heads.net/skin/Steve';

export default function SkinViewer3D({ size = 240, skinUrl, skinModel = 'classic' }: SkinViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const [loadError, setLoadError] = useState(false);

  const resolvedSkinUrl = skinUrl && skinUrl.trim().length > 0 ? skinUrl : STEVE_SKIN_URL;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setLoadError(false);

    const viewer = new SkinViewer({
      canvas,
      width: size,
      height: Math.round(size * 1.33),
      skin: resolvedSkinUrl,
      model: skinModel === 'slim' ? 'slim' : 'default',
      preserveDrawingBuffer: true,
    });

    viewer.controls.enableRotate = true;
    viewer.controls.enableZoom = false;
    viewer.controls.enablePan = false;

    viewer.fov = 38;
    viewer.camera.position.y = 22;
    viewer.camera.position.z = 57;

    viewer.playerWrapper.rotation.y = 0.53;

    viewer.globalLight.intensity = 2.5;
    viewer.cameraLight.intensity = 0.85;
    viewer.cameraLight.position.set(12, 25, 0);

    viewer.zoom = 0.86;

    const animation = new WalkingAnimation();
    animation.speed = 0.5;
    animation.headBobbing = false;
    viewer.animation = animation;

    viewer.background = null;
    viewer.nameTag = null;

    // Basic error handling: if the skin texture fails to load, the canvas
    // may remain blank. We re-render with the Steve fallback after a short
    // timeout if no pixels were drawn. skinview3d does not expose a load
    // callback, so we rely on a visual sanity check.
    const timeout = window.setTimeout(() => {
      try {
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const pixels = new Uint8Array(4);
          (gl as WebGLRenderingContext).readPixels(0, 0, 1, 1, (gl as WebGLRenderingContext).RGBA, (gl as WebGLRenderingContext).UNSIGNED_BYTE, pixels);
          // If the canvas is fully transparent/black, treat it as a load failure.
          if (pixels[0] === 0 && pixels[1] === 0 && pixels[2] === 0 && pixels[3] === 0) {
            setLoadError(true);
          }
        }
      } catch {
        // ignore
      }
    }, 2000);

    viewerRef.current = viewer;

    return () => {
      window.clearTimeout(timeout);
      viewer.dispose();
      viewerRef.current = null;
    };
  }, [size, resolvedSkinUrl, skinModel]);

  return (
    <div
      className="relative overflow-hidden flex-shrink-0"
      style={{
        width: '100%',
        maxWidth: size,
        height: Math.round(size * 1.33),
        borderRadius: 16,
        background: 'radial-gradient(circle at 50% 30%, rgba(74, 121, 255, 0.22), transparent 50%), #161b26',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          borderRadius: 14,
        }}
      />
      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-bg/80 rounded-2xl">
          <img
            src="https://mc-heads.net/avatar/Steve/128"
            alt="Steve fallback"
            className="w-24 h-24 rounded-xl"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
      )}
    </div>
  );
}
