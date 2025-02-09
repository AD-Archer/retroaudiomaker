# Retro Audio Maker

Retro Audio Maker is a web-based tool that transforms your uploaded audio files into retro, 90s game-style sound effects. I built this project because I needed a way to generate retro audio for a project I'm working on. The app applies a series of audio processing effects—including downsampling, low-pass filtering, bit crushing, and distortion—to give your audio that vintage feel.

Live Demo: https://retroaudiomaker.vercel.app/

GitHub Repository: https://github.com/AD-Archer/retroaudiomaker

# Features:
- Audio Upload: Supports WAV, MP3, and OGG formats.
- Retro Processing: Applies effects such as downsampling to a lower sample rate (e.g., 8000Hz), low-pass filtering, bit crushing, and distortion using a custom wave shaper.
- Playback & Download: Listen to the processed audio and download it as a WAV file.

# Tools & Technologies:
- Node.js
- Express
- JavaScript
- HTML & CSS
- Web Audio API
- AudioWorklet API
- OfflineAudioContext
- FileReader API

# Getting Started:
Prerequisites: Node.js (v14 or later) and npm (or yarn)

# Installation:

1. Clone the repository:
   ```sh
   git clone https://github.com/AD-Archer/retroaudiomaker.git
   cd retroaudiomaker
   ```

2. Install dependencies (use either npm or yarn):
   ```sh
   npm install
   ```
   or
   ```sh
   yarn install
   ```

3. Start the server:
   ```sh
   npm start
   ```

   The application should now be running at [http://localhost:3000](http://localhost:3000).

# Usage:
1. Open your browser and navigate to http://localhost:3000.
2. Upload an audio file using the provided file input.
3. Click on the Process Audio button to apply the retro effects.
4. Listen to your processed audio in the browser.
5. Download the processed audio file by clicking the download link.

# Customization:
Modify script.js to tweak parameters such as the target sample rate, filter frequencies, and bit crusher settings.
Customize the look and feel by editing the CSS.
Adjust the custom audio processing by editing bit-crusher-processor.js.

# Contributing:
Contributions are welcome! Fork the repository and submit a pull request.
For issues, open an issue on GitHub.

# License:
This project is licensed under the MIT License.

# Acknowledgments:
Thanks to the developers and maintainers of the Web Audio API and AudioWorklet API.
Special thanks to the community for providing valuable resources and documentation.
