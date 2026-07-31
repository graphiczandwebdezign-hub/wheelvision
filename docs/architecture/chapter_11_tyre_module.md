# Chapter 11 — Tyre Module

## Responsibilities

- Represent tyre dimensions by width, profile, and diameter.
- Maintain realistic rolling diameter calculations for visual consistency.

## Example values

- Width: 265 mm
- Profile: 65
- Diameter: 17 in

## Rolling diameter formula

$$
D_{rolling} = 2 \times \text{sidewall} + \text{rim diameter}
$$

where:

$$
\text{sidewall} = \frac{\text{width} \times \text{profile}}{1000}
$$

## Constraints

- The renderer uses the computed diameter to maintain realistic proportions.
- The tyre module must support future expansion into tyre brands and stock availability.
