# Tom’s Video Editor

Open `index.html` in Chrome or Edge, or serve this folder on any static web host. Keep `app.js` and `style.css` beside it. No installation, build step, API key, or server processing is required.

## Features

- Import browser-supported video and image files.
- Arrange, trim, split, duplicate, and delete clips; undo edits.
- Cut, cross dissolve, fade through black, and wipe transitions.
- Clip speed, volume, color filters, frame fit, title cards, and text overlays.
- Landscape, portrait, and square canvases; 480p, 720p, and 1080p exports.
- Save and reopen editable JSON projects with embedded media.

## Export and media

Export uses browser MediaRecorder and runs in real time. Keep the tab visible until completion. WebM is preferred; MP4 is used only when supported and WebM is unavailable. Export quality depends on browser performance; this lightweight editor is intended for short projects. Large projects and embedded-media project files can use substantial memory. Save your project before closing or refreshing; it is not saved automatically. Media stays in the browser and is not uploaded.

## Verification

JavaScript syntax checked. Browser-tested sample title-card export, video import, duplicate clips, dissolve transition, project save, and video export with an audio track. Downloaded test export decoded as 1280×720 VP9 video with audible Opus audio.

Hosted app: https://toms-video-editor.game-changer-5377.chatgpt.site
