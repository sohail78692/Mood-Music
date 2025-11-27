# Mood-Music Player 🎵😊

Mood-Music Player is an interactive web application that detects your mood using your webcam and recommends Spotify playlists to match how you're feeling. It combines real-time face landmark detection with the Spotify Web API to deliver a personalized music experience.

## ✨ Features

- **Real-time Mood Detection**: Uses MediaPipe FaceLandmarker to analyze facial expressions via your webcam.
- **Mood-Based Recommendations**: Automatically suggests playlists based on detected moods (Happy, Sad, Calm, Energetic, Surprised, Neutral).
- **Multi-Language Support**: Filter music recommendations by language (English, Hindi, Urdu, Punjabi, Tamil, Telugu, Korean, Japanese, Arabic).
- **Spotify Integration**: Seamlessly searches and retrieves playlists from Spotify.
- **In-App Playback**: Play tracks directly within the app using the Spotify Embed player.

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **AI/ML**: [MediaPipe Tasks Vision](https://developers.google.com/mediapipe/solutions/vision/face_landmarker) (FaceLandmarker)
- **Backend**: Node.js, Express.js
- **API**: [Spotify Web API](https://developer.spotify.com/documentation/web-api)
- **Dependencies**: `dotenv`, `express`, `spotify-web-api-node`

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine.
- A [Spotify Developer](https://developer.spotify.com/dashboard/) account to get Client ID and Client Secret.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/mood-music-player.git
    cd mood-music-player
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables**
    Create a `.env` file in the root directory and add your Spotify credentials:
    ```env
    SPOTIFY_CLIENT_ID=your_spotify_client_id
    SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
    PORT=3000
    ```

### Running the Application

1.  **Start the server**
    ```bash
    npm start
    # or for development with nodemon
    npm run dev
    ```

2.  **Open in Browser**
    Visit `http://localhost:3000` to use the app.

## 📖 Usage

1.  **Grant Camera Access**: Allow the browser to access your webcam when prompted.
2.  **Select Language**: Choose your preferred music language from the dropdown menu.
3.  **Detect Mood**: The app will analyze your facial expressions and display your detected mood.
4.  **Listen**: Browse the recommended playlists and click on a track to play it.

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 💬 Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Contact: [sohail786akh@gmail.com]

## 🌟 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

**Made with ❤️ by Sohail and lots of ☕**
