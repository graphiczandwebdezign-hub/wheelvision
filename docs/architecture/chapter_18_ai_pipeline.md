# Chapter 18 — AI Asset Pipeline

## Internal-only pipeline

1. Upload image.
2. Background removal.
3. Wheel detection.
4. Metadata generation.
5. Admin review.
6. Publish.

## Objectives

- Reduce the manual effort of onboarding new vehicle packages.
- Produce valid metadata and asset packaging as a first-pass automation.
- Preserve human review before publication.

## Guardrails

- AI-generated metadata must be validated by schema rules.
- The pipeline cannot publish without admin approval.
- Generated intermediate assets are quarantined until reviewed.
