'use client';

import { useEffect, useRef, useState } from 'react';
import { Ellipse, Image as KonvaImage, Layer, Ring, Stage, Text } from 'react-konva';
import { useRenderer } from '@/features/preview/engine/renderer-provider';
import type { Scene, SceneNode } from '@/features/preview/engine/layer-types';

/**
 * VehicleCanvas — the drawing adapter. Render only.
 *
 * Consumes the declarative scene built from the RenderContext (via
 * RendererProvider) and maps it onto a Konva stage. No API calls, no
 * calculations beyond viewport fitting, no metadata parsing. Everything
 * meaningful was decided upstream by the composer.
 */
export function VehicleCanvas({ className }: { className?: string }) {
  const { scene } = useRenderer();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setWidth(entry.contentRect.width);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const scale = width > 0 ? width / scene.width : 0;
  const height = scene.height * scale;

  return (
    <div ref={containerRef} className={className} style={{ width: '100%' }}>
      {width > 0 ? (
        <Stage
          width={width}
          height={height}
          scaleX={scale}
          scaleY={scale}
          listening={false}
          aria-hidden="true"
        >
          {scene.layers.map((layer) =>
            layer.visible ? (
              <Layer key={layer.kind} listening={false}>
                {layer.nodes.map((node, index) => (
                  <SceneNodeView key={`${node.type}-${index}`} node={node} />
                ))}
              </Layer>
            ) : null,
          )}
        </Stage>
      ) : (
        <div style={{ paddingTop: '66.67%' }} aria-hidden="true" />
      )}
    </div>
  );
}

function SceneNodeView({ node }: { node: SceneNode }) {
  switch (node.type) {
    case 'image':
      return (
        <KonvaImage
          image={node.image.source as HTMLImageElement}
          x={node.x}
          y={node.y}
          width={node.width}
          height={node.height}
          rotation={node.rotation ?? 0}
          opacity={node.opacity ?? 1}
          listening={false}
        />
      );
    case 'ellipse':
      return (
        <Ellipse
          x={node.x}
          y={node.y}
          radiusX={node.radiusX}
          radiusY={node.radiusY}
          fill={node.fill}
          stroke={node.stroke}
          strokeWidth={node.strokeWidth ?? 0}
          opacity={node.opacity ?? 1}
          listening={false}
        />
      );
    case 'ring':
      return (
        <Ring
          x={node.x}
          y={node.y}
          innerRadius={node.innerRadius}
          outerRadius={node.outerRadius}
          fill={node.fill}
          opacity={node.opacity ?? 1}
          listening={false}
        />
      );
    case 'text':
      return (
        <Text
          x={node.x}
          y={node.y}
          text={node.text}
          fontSize={node.fontSize}
          fill={node.fill}
          opacity={node.opacity ?? 1}
          listening={false}
        />
      );
  }
}

export type { Scene };
