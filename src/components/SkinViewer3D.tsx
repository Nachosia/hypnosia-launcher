import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { SkinViewer, WalkingAnimation } from 'skinview3d';

interface SkinViewer3DProps {
  size?: number;
  skinUrl?: string | null;
  skinModel?: 'classic' | 'slim';
}

const STEVE_SKIN_URL = 'https://mc-heads.net/skin/Steve';

async function resolveSkinUrl(url?: string | null): Promise<string> {
  if (!url || url.trim().length === 0) return STEVE_SKIN_URL;

  // If it's already a data URL or a reliable CORS-friendly host, use directly.
  if (url.startsWith('data:')) return url;
  if (url.startsWith('blob:')) return url;

  // For our own site, fetch the image through the Rust backend to bypass CORS.
  if (url.includes('nachosia.site')) {
    try {
      const dataUrl = await invoke<string>('fetch_image_as_base64', { url });
      if (dataUrl && dataUrl.startsWith('data:')) return dataUrl;
    } catch (err) {
      console.warn('[SkinViewer3D] failed to fetch skin via backend:', err);
    }
  }

  return url;
}

export default function SkinViewer3D({ size = 240, skinUrl, skinModel = 'classic' }: SkinViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<SkinViewer | null>(null);
  const [resolvedSkin, setResolvedSkin] = useState<string>(STEVE_SKIN_URL);

  useEffect(() => {
    let cancelled = false;
    resolveSkinUrl(skinUrl).then((url) => {
      if (!cancelled) setResolvedSkin(url);
    });
    return () => {
      cancelled = true;
    };
  }, [skinUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const viewer = new SkinViewer({
      canvas,
      width: size,
      height: Math.round(size * 1.33),
      skin: resolvedSkin,
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
  }, [size, resolvedSkin, skinModel]);

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
    </div>
  );
}
