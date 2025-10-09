1. Move the `safeOptions` computation outside of the `useMemo` callback so it is defined when the dependency array is evaluated.
2. Ensure the dependency array references the stable options object (falling back to a shared empty object) and keep the filtering logic unchanged.
3. Run targeted verification (e.g., unit tests or lint) to confirm the fix and avoid regressions in the memory panel.