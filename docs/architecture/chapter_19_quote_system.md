# Chapter 19 — Quote System

## Capabilities

- Save configuration as a quote draft.
- Print or export a quote.
- Send by email or WhatsApp.
- Link quote to dealer and tenant context.

## Flow

1. Dealer selects vehicle, wheel, and tyre values.
2. Renderer produces a preview.
3. Quote draft is saved.
4. Quote is shared through print, PDF, email, or WhatsApp.

## Data model

- `Quote`
- `QuoteLine`
- `QuoteAttachment`
- `QuoteStatus`

## Requirements

- Quote generation must preserve the selected configuration as a snapshot.
- Historical quotes remain immutable after publishing.
