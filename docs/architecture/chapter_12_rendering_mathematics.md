# Chapter 12 — Rendering Mathematics

## Coordinate system

The renderer uses a normalized 2D coordinate system based on the source vehicle image dimensions.

## Wheel placement

Wheel placement is based on the metadata coordinates:

- front wheel: `(x_front, y_front)`
- rear wheel: `(x_rear, y_rear)`

The wheel image is scaled relative to the vehicle metadata wheel diameter.

## Scale calculation

$$
\text{scale} = \frac{\text{metadata wheel diameter}}{\text{asset wheel diameter}}
$$

This approach allows the renderer to position wheels at the correct spots for any vehicle package.

## Why it is generic

The mathematics are independent of the vehicle brand and model because they rely solely on metadata values and asset dimensions.
