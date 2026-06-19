import { useEffect, useRef } from 'react';
import { SkinViewer, WalkingAnimation } from 'skinview3d';

interface SkinViewer3DProps {
  size?: number;
  skinUrl?: string | null;
  skinModel?: 'classic' | 'slim';
}

const STEVE_UUID = 'fe008fc7387e4477a8260219bd8c0c13';

export default function SkinViewer3D({ size = 240, skinUrl, skinModel = 'classic' }: SkinViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resolvedSkinUrl = skinUrl ?? `https://mc-heads.net/skin/${STEVE_UUID}`;

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

    viewerRef.current = viewer;

    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, [size, skinUrl, skinModel]);

  return (
    <div
      className="relative overflow-hidden flex-shrink-0"
      style={{
        width: '100%',
        maxWidth: size,
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
          aspectRatio: `${size} / ${Math.round(size * 1.33)}`,
        }}
      />
    </div>
  );
}
