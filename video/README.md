# Product film

Source of the CipherComply film, made with [Remotion](https://www.remotion.dev).
The rendered film is at https://youtu.be/QPNuGXtu6nM.

```
npm install
npx remotion studio                        # preview and edit
npx remotion render Full out/film.mp4      # render the two-part film
```

Compositions: `CipherComply` (the product film), `LiveDemo` (narrated
screenshots of a real run) and `Full` (both, with chapter titles).

Generated assets:

- Music is synthesised by `node scripts/make-music.mjs <seconds> <file>` into
  `public/` and is not committed. Generate `music.wav` (127) and
  `music-demo.wav` (68) before rendering.
- Narration is generated with Gemini text-to-speech by
  `scripts/make-voiceover.mjs` (needs `GEMINI_API_KEY` in the repository's
  `.env`) and checked with `scripts/transcribe-voiceover.mjs`. The clips are
  committed, so rendering does not need the key.
