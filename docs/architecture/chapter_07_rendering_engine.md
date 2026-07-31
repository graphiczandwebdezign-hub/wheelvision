# Chapter 7 — Rendering Engine

## Goals

The renderer must load metadata and assets, compute wheel positions, and draw the vehicle without any vehicle-specific business logic in the renderer core.

## Rendering pipeline

1. Load vehicle metadata.
2. Load the base vehicle image.
3. Load the mask and shadow layers.
4. Resolve wheel and tyre asset selections.
5. Compute scale and placement using metadata coordinates.
6. Render wheels, tyres, and shadow layers on a Konva stage.

## Rendering contract

- The renderer takes a generic `RenderContext` object.
- The context contains `vehicle`, `wheel`, `tyre`, and `tenant` scope data.
- The renderer only relies on metadata keys such as `frontWheel`, `rearWheel`, and `wheelDiameter`.

## Component responsibilities

- `VehicleCanvas`: host container for the stage.
- `AssetLoader`: resolves image assets and handles load failure.
- `SceneComposer`: builds the layer stack.
- `RendererMath`: calculates positions, scaling, and wheel fit.
