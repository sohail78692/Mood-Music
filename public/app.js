import {
  FaceLandmarker,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";

let faceLandmarker;

// DOM refs
let video, overlay, ctx;
let toggleCameraBtn, cameraStatusEl, modelStatusEl, moodLabelEl;
let languageSelectEl, playlistContainerEl, trackListEl, nowPlayingEl, embedContainerEl;

// state
let running = false;
let selectedLanguage = "any";
const moodHistory = [];
const HISTORY_LEN = 10;
let lastMoodSentAt = 0;
const MOOD_SEND_INTERVAL = 4000;
let activeTrackId = null;

// ---------- init ----------
window.addEventListener("DOMContentLoaded", async () => {
  video = document.getElementById("video");
  overlay = document.getElementById("overlay");
  ctx = overlay.getContext("2d");

  toggleCameraBtn = document.getElementById("toggleCameraBtn");
  cameraStatusEl = document.getElementById("cameraStatus");
  modelStatusEl = document.getElementById("modelStatus");
  moodLabelEl = document.getElementById("moodLabel");
  languageSelectEl = document.getElementById("languageSelect");
  playlistContainerEl = document.getElementById("playlistContainer");
  trackListEl = document.getElementById("trackList");
  nowPlayingEl = document.getElementById("nowPlayingInfo");
  embedContainerEl = document.getElementById("embedContainer");

  toggleCameraBtn.addEventListener("click", onToggleCamera);
  languageSelectEl.addEventListener("change", (e) => {
    selectedLanguage = e.target.value;
  });

  await loadFaceModel();
});

async function loadFaceModel() {
  try {
    modelStatusEl.textContent = "Loading...";
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task"
      },
      runningMode: "VIDEO",
      numFaces: 1
    });

    modelStatusEl.textContent = "Ready";
    modelStatusEl.classList.remove("loading");
  } catch (err) {
    console.error("Error loading model:", err);
    modelStatusEl.textContent = "Error";
    modelStatusEl.classList.remove("loading");
  }
}

// ---------- Camera & detection ----------
async function onToggleCamera() {
  if (!running) {
    await startCamera();
  } else {
    stopCamera();
  }
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    alert("Camera not supported in this browser.");
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user" },
      audio: false
    });

    video.srcObject = stream;
    await new Promise((res) => (video.onloadeddata = res));

    overlay.width = video.videoWidth;
    overlay.height = video.videoHeight;

    running = true;
    cameraStatusEl.textContent = "ON";
    cameraStatusEl.classList.remove("off");

    toggleCameraBtn.textContent = "Stop Camera";
    toggleCameraBtn.classList.add("stop");

    detectLoop();
  } catch (err) {
    console.error("Camera error:", err);
    alert("Could not access camera. Check permissions.");
  }
}

function stopCamera() {
  running = false;
  if (video.srcObject) {
    video.srcObject.getTracks().forEach((t) => t.stop());
  }
  video.srcObject = null;
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  cameraStatusEl.textContent = "OFF";
  cameraStatusEl.classList.add("off");

  toggleCameraBtn.textContent = "Start Camera";
  toggleCameraBtn.classList.remove("stop");
}

async function detectLoop() {
  if (!running || !faceLandmarker) return;

  const result = faceLandmarker.detectForVideo(video, performance.now());
  ctx.clearRect(0, 0, overlay.width, overlay.height);

  if (result && result.faceLandmarks && result.faceLandmarks.length > 0) {
    const points = result.faceLandmarks[0];

    drawFace(points);

    const mood = inferMood(points);
    moodLabelEl.textContent = mood;
    maybeSendMoodToServer(mood);
  }

  requestAnimationFrame(detectLoop);
}

function drawFace(points) {
  ctx.fillStyle = "rgba(56,189,248,0.9)";
  points.forEach((p) => {
    ctx.fillRect(p.x * overlay.width, p.y * overlay.height, 3, 3);
  });
}

// ---------- Mood detection ----------
function inferMood(points) {
  if (!points || points.length < 153) return "neutral";

  const upperLip = points[13];
  const lowerLip = points[14];
  const forehead = points[10];
  const chin = points[152];

  const faceHeight = Math.abs(chin.y - forehead.y) || 0.001;
  const mouthOpenNorm = Math.abs(lowerLip.y - upperLip.y) / faceHeight;

  let mood = "neutral";
  if (mouthOpenNorm > 0.24) mood = "surprised";
  else if (mouthOpenNorm > 0.16) mood = "happy";
  else if (mouthOpenNorm < 0.07) mood = "calm";
  else mood = "neutral";

  moodHistory.push(mood);
  if (moodHistory.length > HISTORY_LEN) moodHistory.shift();

  const counts = {};
  for (const m of moodHistory) counts[m] = (counts[m] || 0) + 1;

  let bestMood = mood;
  let bestCount = 0;
  for (const [m, c] of Object.entries(counts)) {
    if (c > bestCount) {
      bestMood = m;
      bestCount = c;
    }
  }
  return bestMood;
}

async function maybeSendMoodToServer(mood) {
  const now = Date.now();
  if (now - lastMoodSentAt < MOOD_SEND_INTERVAL) return;
  lastMoodSentAt = now;

  await fetchRecommendations(mood, selectedLanguage);
}

// ---------- Playlists & tracks ----------
async function fetchRecommendations(mood, language) {
  try {
    const res = await fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mood, language })
    });

    if (!res.ok) {
      console.error("Recommendations HTTP error:", res.status);
      return;
    }

    const data = await res.json();
    renderPlaylists(data.playlists || []);
  } catch (err) {
    console.error("Error fetching recommendations:", err);
  }
}

function renderPlaylists(playlists) {
  playlistContainerEl.innerHTML = "";
  trackListEl.innerHTML = "";
  embedContainerEl.innerHTML = "";
  nowPlayingEl.textContent = "No track selected.";
  activeTrackId = null;

  if (!playlists.length) {
    playlistContainerEl.innerHTML = "<p>No playlists found for this mood + language.</p>";
    return;
  }

  playlists.forEach((pl) => {
    const card = document.createElement("div");
    card.className = "playlist-card";

    const img = document.createElement("img");
    img.className = "playlist-image";
    img.src = pl.image || "https://placehold.co/300x300?text=Spotify";
    img.alt = pl.name || "Playlist";

    const title = document.createElement("div");
    title.className = "playlist-title";
    title.textContent = pl.name;

    const owner = document.createElement("div");
    owner.className = "playlist-owner";
    owner.textContent = `by ${pl.owner}`;

    card.appendChild(img);
    card.appendChild(title);
    card.appendChild(owner);

    card.addEventListener("click", () => openPlaylist(pl));

    playlistContainerEl.appendChild(card);
  });
}

async function openPlaylist(playlist) {
  nowPlayingEl.textContent = `Loading tracks from "${playlist.name}"...`;
  trackListEl.innerHTML = "";
  embedContainerEl.innerHTML = "";
  activeTrackId = null;

  try {
    const res = await fetch(`/api/playlists/${playlist.id}/tracks`);
    if (!res.ok) {
      nowPlayingEl.textContent = "Failed to load tracks.";
      return;
    }

    const data = await res.json();
    renderTracks(data.tracks || [], playlist.name);
  } catch (err) {
    console.error("Error fetching tracks:", err);
    nowPlayingEl.textContent = "Failed to load tracks.";
  }
}

function renderTracks(tracks, playlistName) {
  trackListEl.innerHTML = "";

  if (!tracks.length) {
    nowPlayingEl.textContent = `No tracks in "${playlistName}".`;
    return;
  }

  nowPlayingEl.textContent = `Tracks from "${playlistName}". Click a track to play via Spotify embed.`;

  tracks.forEach((track) => {
    const li = document.createElement("li");
    li.className = "track-item";
    li.dataset.trackId = track.id;

    const meta = document.createElement("div");
    meta.className = "track-meta";

    const nameEl = document.createElement("div");
    nameEl.className = "track-name";
    nameEl.textContent = track.name;

    const artistEl = document.createElement("div");
    artistEl.className = "track-artist";
    artistEl.textContent = track.artists;

    meta.appendChild(nameEl);
    meta.appendChild(artistEl);

    const btn = document.createElement("button");
    btn.className = "track-play-btn";
    btn.textContent = "Play";

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      playViaSpotifyEmbed(track, li);
    });

    li.appendChild(meta);
    li.appendChild(btn);

    trackListEl.appendChild(li);
  });
}

function playViaSpotifyEmbed(track, li) {
  // highlight active track
  document.querySelectorAll(".track-item").forEach((item) =>
    item.classList.remove("active")
  );
  li.classList.add("active");

  activeTrackId = track.id;
  nowPlayingEl.textContent = `Playing: ${track.name} — ${track.artists} (via Spotify embed)`;

  // Inject Spotify embed iframe for this track
  embedContainerEl.innerHTML = `
    <iframe
      src="https://open.spotify.com/embed/track/${track.id}"
      loading="lazy"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture">
    </iframe>
  `;
}
