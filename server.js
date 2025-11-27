// server.js
require("dotenv").config();
const express = require("express");
const path = require("path");
const SpotifyWebApi = require("spotify-web-api-node");

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- Spotify Setup ----------
const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

let tokenExpiresAt = 0;

async function refreshSpotifyToken() {
  try {
    const data = await spotifyApi.clientCredentialsGrant();
    const accessToken = data.body.access_token;
    const expiresIn = data.body.expires_in;

    spotifyApi.setAccessToken(accessToken);
    tokenExpiresAt = Date.now() + (expiresIn - 60) * 1000;
    console.log("🔐 Spotify token refreshed");
  } catch (err) {
    console.error("❌ Error refreshing Spotify token:", err.message || err);
  }
}

refreshSpotifyToken();
setInterval(refreshSpotifyToken, 1000 * 60 * 30);

// ---------- Middleware ----------
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Mood + Language → Playlists ----------
app.post("/api/recommendations", async (req, res) => {
  try {
    const { mood, language } = req.body;
    if (!mood) {
      return res.status(400).json({ error: "Mood is required" });
    }

    const moodQuery = {
      happy: "happy upbeat",
      sad: "sad emotional",
      calm: "calm chill relax",
      energetic: "energetic workout cardio",
      surprised: "party dance",
      neutral: "lofi chill beats"
    };

    const languageQuery = {
      any: "",
      english: "english",
      hindi: "hindi bollywood",
      urdu: "urdu",
      punjabi: "punjabi",
      tamil: "tamil",
      telugu: "telugu",
      korean: "kpop korean",
      japanese: "jpop japanese anime",
      arabic: "arabic"
    };

    const mq = moodQuery[mood] || "mood booster";
    const lq = languageQuery[language] || "";
    const query = `${mq} ${lq}`.trim();

    if (Date.now() >= tokenExpiresAt) {
      await refreshSpotifyToken();
    }

    const data = await spotifyApi.searchPlaylists(query, { limit: 12 })
      .catch(() => ({ body: { playlists: { items: [] } } }));

    const playlists = (data.body.playlists.items || [])
      .filter(p => p && p.id)
      .map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        owner: p.owner?.display_name || "Unknown",
        image: p.images?.[0]?.url || null,
        url: p.external_urls?.spotify || null
      }));

    res.json({ mood, language, query, playlists });
  } catch (err) {
    console.error("❌ Error fetching recommendations:", err);
    res.status(500).json({ error: "Failed to fetch playlists" });
  }
});

// ---------- Playlist → Tracks (for embed) ----------
app.get("/api/playlists/:id/tracks", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Playlist ID required" });

    if (Date.now() >= tokenExpiresAt) {
      await refreshSpotifyToken();
    }

    const data = await spotifyApi.getPlaylistTracks(id, { limit: 50 })
      .catch(() => ({ body: { items: [] } }));

    const tracks = (data.body.items || [])
      .filter(item => item && item.track && item.track.id)
      .map(item => {
        const t = item.track;
        return {
          id: t.id,
          name: t.name,
          artists: (t.artists || []).map(a => a.name).join(", "),
          spotify_url: t.external_urls?.spotify || null
        };
      });

    res.json({ tracks });
  } catch (err) {
    console.error("❌ Error fetching playlist tracks:", err);
    res.status(500).json({ error: "Failed to fetch tracks" });
  }
});

// ---------- Start server ----------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
