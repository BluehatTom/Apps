# Looplab — Audio Playground

A browser-based synthesizer, drum sequencer, and six-channel mixer. No build step, backend, or API key is required.

## Run

Open `index.html` in a modern browser, or serve this directory with any static HTTP server. Click Play to enable audio and start the beat.

## Controls

- Program five drum voices on the 16-step sequencer; load House, Hip-hop, or Breakbeat presets, randomize, or clear the grid.
- Set tempo (50–200 BPM), swing, key, and master volume.
- Choose sine, triangle, sawtooth, or square synthesis and adjust attack, release, low-pass filter, and delay.
- Play the piano with A S D F G H J K, or click the keys. Enable the bassline to layer it under the drums.
- Balance or mute Kick, Snare, Hi-hat, Clap, Perc, and Bass independently. The synth uses the Bass channel.
- Save project stores one session in this browser. Restore it from My projects.
- Export WAV renders four bars of the current sequenced mix plus a two-second effects tail. Live keyboard notes are not recorded.
- Press Space to play or stop when focus is outside an input or button.

Audio is generated locally with Web Audio. Project storage is browser-local. Google Fonts is optional; system fonts are used when unavailable.

## Files

- `index.html`: app interface
- `style.css`: responsive studio layout
- `app.js`: audio engine, sequencer, local storage, and WAV export

## Verification

JavaScript syntax validation and local browser checks of loading, playback, stopping, project saving, and WAV export completed before upload.
