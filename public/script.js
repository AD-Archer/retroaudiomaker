// Global variables
let currentSource = null; // Tracks the currently playing audio source
let isProcessing = false;

// -----------------------
// Playback and Download
// -----------------------

function playAudio(audioContext, buffer) {
  // Stop any previous playback
  if (currentSource) {
    currentSource.stop();
    currentSource = null;
  }

  // Trim any extra silence from the buffer before playing
  const trimmedBuffer = trimBuffer(audioContext, buffer);

  // Create a new source node with the trimmed buffer
  const source = audioContext.createBufferSource();
  source.buffer = trimmedBuffer;
  source.connect(audioContext.destination);
  currentSource = source;
  source.start();

  // Create a WAV blob from the trimmed buffer and set it as the audio player's source
  const wavBlob = new Blob([bufferToWav(trimmedBuffer)], { type: "audio/wav" });
  const audioPlayer = document.getElementById("audio-player");
  audioPlayer.src = URL.createObjectURL(wavBlob);
  audioPlayer.style.display = "block";
}

function createDownloadLink(buffer) {
  const blob = new Blob([bufferToWav(buffer)], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.getElementById("download-link");
  downloadLink.href = url;
  downloadLink.download = "retro_output.wav";
  downloadLink.style.display = "block";
}

// -----------------------
// WAV Conversion Helpers
// -----------------------

function bufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataLength = buffer.length * numChannels * 2;

  const bufferArray = new ArrayBuffer(44 + dataLength);
  const view = new DataView(bufferArray);

  // Write WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      let sample = buffer.getChannelData(channel)[i];
      sample = Math.max(-1, Math.min(1, sample)); // clamp the sample
      let intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  return bufferArray;
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// -----------------------
// Event Listeners
// -----------------------

document.getElementById("audio-upload").addEventListener("change", (e) => {
  document.getElementById("process-button").disabled = !e.target.files[0];
});

document.getElementById("process-button").addEventListener("click", processAudio);

// -----------------------
// Audio Processing Chain
// -----------------------

async function processAudio() {
  if (isProcessing) return;
  isProcessing = true;

  const fileInput = document.getElementById("audio-upload");
  if (!fileInput.files[0]) {
    alert("Please upload an audio file first!");
    isProcessing = false;
    return;
  }

  const file = fileInput.files[0];
  const reader = new FileReader();

  // Show loading bar
  const loadingBar = document.getElementById("loading-bar");
  const loadingProgress = document.getElementById("loading-progress");
  loadingBar.style.display = "block";
  loadingProgress.style.width = "0%";

  reader.onload = async function (e) {
    // Create a new AudioContext
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();

    try {
      // 1. Decode the audio file
      const originalBuffer = await audioContext.decodeAudioData(e.target.result);
      loadingProgress.style.width = "30%";

      // 2. Downsample (downgrade) the audio to a lower sample rate (e.g., 8000Hz)
      const downgradedBuffer = await downgradeQuality(originalBuffer, 8000);

      // 3. Apply retro effects (lowpass, bit crusher, and distortion)
      const processedBuffer = await applyRetroEffects(downgradedBuffer);
      loadingProgress.style.width = "100%";

      // 4. Play the processed audio and create a download link
      playAudio(audioContext, processedBuffer);
      createDownloadLink(processedBuffer);
    } catch (error) {
      console.error("Error processing audio:", error);
      alert("Failed to process audio. Please try again.");
    } finally {
      loadingBar.style.display = "none";
      isProcessing = false;
    }
  };

  reader.readAsArrayBuffer(file);
}

// Downsample audio quality using an OfflineAudioContext
async function downgradeQuality(buffer, targetSampleRate) {
  const numberOfChannels = buffer.numberOfChannels;
  const duration = buffer.duration;
  const offlineContext = new OfflineAudioContext(
    numberOfChannels,
    Math.floor(duration * targetSampleRate),
    targetSampleRate
  );

  const source = offlineContext.createBufferSource();
  source.buffer = buffer;

  // Add a lowpass filter to prevent aliasing during downsampling
  const filter = offlineContext.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = (targetSampleRate / 2) * 0.8;

  source.connect(filter);
  filter.connect(offlineContext.destination);
  source.start();

  return offlineContext.startRendering();
}

// Apply retro effects to the audio using an OfflineAudioContext
async function applyRetroEffects(buffer) {
  const duration = buffer.duration;
  const targetSampleRate = 8000;
  // Calculate the new sample count based on the target sample rate
  const newLength = Math.floor(duration * targetSampleRate);
  const offlineContext = new OfflineAudioContext(1, newLength, targetSampleRate);

  const source = offlineContext.createBufferSource();
  source.buffer = buffer;

  // Retro lowpass filter
  const lowPassFilter = offlineContext.createBiquadFilter();
  lowPassFilter.type = "lowpass";
  lowPassFilter.frequency.value = 3000;

  // Bit crusher effect using an AudioWorklet (ensure the file exists)
  await offlineContext.audioWorklet.addModule("bit-crusher-processor.js");
  const bitCrusher = new AudioWorkletNode(offlineContext, "bit-crusher-processor", {
    parameterData: {
      bitDepth: 4,
      frequencyReduction: 0.8
    }
  });

  // Wave shaper for additional distortion
  const waveShaper = offlineContext.createWaveShaper();
  waveShaper.curve = makeDistortionCurve(400);

  // Connect the chain: source -> lowpass -> bit crusher -> distortion -> destination
  source.connect(lowPassFilter);
  lowPassFilter.connect(bitCrusher);
  bitCrusher.connect(waveShaper);
  waveShaper.connect(offlineContext.destination);

  source.start();
  return offlineContext.startRendering();
}

// Generate a distortion curve for the wave shaper node
function makeDistortionCurve(amount) {
  const k = typeof amount === "number" ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;

  for (let i = 0; i < n_samples; i++) {
    const x = (i * 2) / n_samples - 1;
    curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
  }
  return curve;
}

// -----------------------
// Utility: Trim Silence
// -----------------------

// Trims silence from the start and end of an AudioBuffer
function trimBuffer(audioContext, buffer) {
  const rawData = buffer.getChannelData(0);
  let trimStart = 0;
  let trimEnd = rawData.length;

  // Find the first sample above a very low threshold
  while (trimStart < trimEnd && Math.abs(rawData[trimStart]) < 0.0001) {
    trimStart++;
  }

  // Find the last sample above the threshold
  while (trimEnd > trimStart && Math.abs(rawData[trimEnd - 1]) < 0.0001) {
    trimEnd--;
  }

  const newLength = trimEnd - trimStart;
  const newBuffer = audioContext.createBuffer(buffer.numberOfChannels, newLength, buffer.sampleRate);

  for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
    const channelData = buffer.getChannelData(channel).slice(trimStart, trimEnd);
    newBuffer.copyToChannel(channelData, channel);
  }
  return newBuffer;
}
