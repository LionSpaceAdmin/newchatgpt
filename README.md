# Lions of Zion — GPU Particle Intro

Standalone WebGL2 cinematic particle intro rebuilt from the supplied lion artwork.

The supplied artwork is used only offline to derive a compact structural seed. The deployed runtime contains no PNG/JPG lion asset, `<img>`, texture, or CanvasTexture.

- 12,000 baked anatomical seed samples expand deterministically into 120,000 GPU lion particles at startup.
- Per-particle home position, shallow depth, color, region, flow, blast direction, delay and deterministic variation are placed in GPU buffers.
- Vertex shaders control formation, relocation, gust, parallax, breathing, click/touch explosion and exact reassembly.
- Narrative text is rendered only as GPU particles using two reusable text buffers; DOM copy is accessibility-only.
- The text particle geometry is cached and pre-warmed during idle time so phrase transitions and keyboard seeking do not introduce avoidable frame spikes.
- Responsive cache keys distinguish desktop/mobile geometry, including orientation changes.
- Escape skips, Space pauses/resumes, Right Arrow advances, click/tap explodes and reassembles.

Finalization build: `2026.08.23-finalize-1`.
