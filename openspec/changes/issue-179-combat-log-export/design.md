# Design

## Context

The HUD receives ordered events from each accepted presentation. Its current 40-line buffer drives filtering and uses the existing native Battle log modal.

## Goals / Non-Goals

Attach context to each retained event so a filtered or truncated group remains interpretable. Keep the model inside the presentation path. Save/replay logic, run records, telemetry and combat resolution are outside this change.

## Decisions

- Use the accepted presentation's before-state for the command number, actor and round. Read the leading event to identify the action. The tail turn-start marker uses its own actor and round. Contiguous entries share their action context so grouping does not depend on a retained heading or on parsing display text.
- Use the same retained snapshot for the grouped view and download. Export explicit event and result fields with the build and battle versions already available to the scene. Use a single indented JSON file and the existing browser download and keep-open dialog patterns.
- Reset the model on scene reconstruction. Export the resumed and truncated flags so readers can interpret a partial history.

## Risks / Trade-offs

Expiry, healing and damage events can affect units other than the actor. Keep those unit identifiers separate and verify turn rollover and partial groups. Check download content and modal focus through real desktop and emulated touch interactions on both engines.
