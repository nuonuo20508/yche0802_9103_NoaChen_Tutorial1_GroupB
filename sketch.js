// Brush options, base dimensions and scaling variables
let strokeOption;
let baseSize;
let scale;
let canvas = 800; // Base canvas size

// Audio-related variables
let amplitude;
let soundFile;
let isPlaying = false;
let hasUploadedAudio = false;
let isVideo = false;
let audioStarted = false;

// Microphone-related variables
let mic;               
let isUsingMic = false;    
let micStarted = false;    

// Web Audio API relevant variables(For video and audio analysis)
let audioContext;
let analyser;
let source;

// Adjust brush thickness and scaling ratio according to the current window size
function adjustStrokeAndScale() {

  baseSize = min(windowWidth, windowHeight);
  // Calculate the scaling ratio relative to the base canvas size
  scale = baseSize / canvas;
  // Foundational brush thickness for aesthetically pleasing line patterns
  strokeOption = [0.4, 0.8, 1, 2, 3.5];

  for (let i = 0; i < strokeOption.length; i++) {
    strokeOption[i] *= scale;
  }
}

// Draw a set of parallel lines inclined at 30 degrees, positioned at random
// Audio response: Parameters vary according to sound amplitude
function drawLineGroup() {
  // Retrieve the current audio level (0 to 1)
  let level = amplitude ? amplitude.getLevel() : 0;

  // Mapping audio levels to visual parameters
  // The greater the volume = the more lines, the longer the lines, the denser the spacing
  let minLines = map(level, 0, 1, 5, 15);
  let maxLines = map(level, 0, 1, 15, 50);
  let minLength = map(level, 0, 1, 50, 150) * scale;
  let maxLength = map(level, 0, 1, 150, 300) * scale;
  let minSpacing = map(level, 0, 1, 2, 6);
  let maxSpacing = map(level, 0, 1, 6, 12);

  // Randomly select the starting point (x1, y1)
  // The origin is at the centre of the canvas.
  const x1 = random(-width / 2, width / 2);
  const y1 = random(-height / 2, height / 2);
  // Determine horizontal and vertical offsets
  // Using the ternary operator
  const signX = random() > 0.5 ? 1 : -1;
  const signY = random() > 0.5 ? 1 : -1;
  // Line length using audio mapping
  const lineLength = random(minLength, maxLength);
  // 30-degree incline
  const angle = tan(30);
  // Horizontal and vertical offset
  const hShift = lineLength * signX;
  const vShift = lineLength * angle * signY;
  //  End of the line（x2, y2）
  const x2 = x1 + hShift;
  const y2 = y1 + vShift;
  // Number of lines and spacing when using audio mapping
  const numLines = floor(random(minLines, maxLines));
  const spacing = random(minSpacing, maxSpacing);

  // Draw each line with a vertical offset
  for (let i = 0; i < numLines; i++) {
    const offset = i * spacing;
    strokeWeight(random(strokeOption));
    // The y-coordinate of the current line
    let Y1 = y1 + offset;
    let Y2 = y2 + offset;

    line(x1, Y1, x2, Y2);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);

  adjustStrokeAndScale();

  // Initialise audio
  amplitude = new p5.Amplitude();
  amplitude.smooth(0.8); // Smooth amplitude readings

  // Using an oscillator as a backup
  soundFile = new p5.Oscillator();
  soundFile.amp(0);
  soundFile.start();

  // Configure the file upload handler
  setupFileUpload();

  background(247, 241, 219);
  // Move the origin to the centre of the canvas
  translate(width / 2, height / 2);
}

function setupFileUpload() {
  let fileInput = document.getElementById('audioFile');
  let fileNameDiv = document.getElementById('fileName');
  let startAudioBtn = document.getElementById('startAudio');
  let playPauseBtn = document.getElementById('playPauseBtn');

  fileInput.addEventListener('change', function(e) {
    let file = e.target.files[0];
    if (file) {
      // Check file size (issue warnings for large video files)
      let fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > 100) {
        fileNameDiv.textContent = 'Warning: Large file (' + fileSizeMB.toFixed(1) + 'MB), loading may take time';
        fileNameDiv.style.color = 'orange';
      }

      // Determine the file type
      let fileExtension = file.name.split('.').pop().toLowerCase();
      let audioExtensions = ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'];
      let videoExtensions = ['mp4', 'avi', 'mov', 'mkv', 'webm'];

      if (!audioExtensions.includes(fileExtension) && !videoExtensions.includes(fileExtension)) {
        fileNameDiv.textContent = 'Error: Unsupported file format';
        fileNameDiv.style.color = 'red';
        return;
      }

      fileNameDiv.textContent = 'Loading: ' + file.name;
      fileNameDiv.style.color = '#333';

      // Stop the current audio/video
      if (soundFile) {
        soundFile.stop();
      }

      // Generate a URL for the uploaded file
      let fileURL = URL.createObjectURL(file);

      // Load according to file type
      if (videoExtensions.includes(fileExtension)) {
        // Loading as video
        soundFile = createVideo(fileURL, function() {
          console.log('Video file loaded successfully!');
          fileNameDiv.textContent = 'Loaded: ' + file.name + ' (video) ✓';
          fileNameDiv.style.color = 'green';
          hasUploadedAudio = true;
          isVideo = true;

          // Hide video elements
          soundFile.hide();

          // Set the volume but do not play for the time being
          soundFile.volume(1.0);

          // Hide the audio playback button
          startAudioBtn.style.display = 'none';
          playPauseBtn.style.display = 'block';
          playPauseBtn.disabled = false;
          playPauseBtn.style.background = '#4CAF50';
          playPauseBtn.style.color = 'white';
          playPauseBtn.style.cursor = 'pointer';
          fileNameDiv.textContent += ' - Please click "Enable Audio Permission"';

          // Initialise the Web Audio API for video and audio analysis
          audioContext = getAudioContext();
          analyser = audioContext.createAnalyser();
          source = audioContext.createMediaElementSource(soundFile.elt);
          source.connect(analyser);
          analyser.connect(audioContext.destination);

        }, function(error) {
          console.error('Video file loading failed:', error);
          fileNameDiv.textContent = 'Loading failed: Please check video file format';
          fileNameDiv.style.color = 'red';
          resetToFallback();
        });
      } else {
        // As audio loading
        soundFile = loadSound(fileURL, function() {
          console.log('Audio file loaded successfully!');
          fileNameDiv.textContent = 'Loaded: ' + file.name + ' (audio) ✓';
          fileNameDiv.style.color = 'green';
          hasUploadedAudio = true;
          isVideo = false;

          // Hide the audio playback button
          startAudioBtn.style.display = 'none';
          playPauseBtn.style.display = 'block';
          playPauseBtn.disabled = false;
          playPauseBtn.style.background = '#4CAF50';
          playPauseBtn.style.color = 'white';
          playPauseBtn.style.cursor = 'pointer';
          fileNameDiv.textContent += ' - Please click "Enable Audio Permission"';

        }, function(error) {
          console.error('Audio file loading failed:', error);
          fileNameDiv.textContent = 'Loading failed: Please check audio file format';
          fileNameDiv.style.color = 'red';
          resetToFallback();
        });
      }
    }
  });
}

// User initiates audio context (browser requirement)
function userStartAudio() {
  console.log('userStartAudio called, current state:', getAudioContext().state);

  // If the audio context is not running, restore it.
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume().then(() => {
      console.log('Audio context started');
      audioStarted = true;

      // Important: Reconnect the amplitude analyser after audio context restoration.
      // Applies only to audio files; not applicable to video (video uses the Web Audio API analyser)
      if (soundFile && amplitude && !isVideo) {
        amplitude.setInput(soundFile);
        console.log('Audio analyser reconnected to audio file');
      }

      // Debugging: Check whether the video contains an audio track
      if (isVideo && soundFile.elt) {
        console.log('Video audio track count:', soundFile.elt.audioTracks ? soundFile.elt.audioTracks.length : 'Cannot detect');
      }
    }).catch(err => {
      console.error('Audio context startup failed:', err);
    });
  } else {
    console.log('Audio context is already running');
    audioStarted = true;

    if (soundFile && amplitude && !isVideo) {
      amplitude.setInput(soundFile);
      console.log('Audio analyser reconnected to audio file');
    }
  }

  // Always hide the audio playback button and update the display
  document.getElementById('startAudio').style.display = 'none';

  // Update filename display
  let fileNameDiv = document.getElementById('fileName');
  if (fileNameDiv.textContent.includes('Please click')) {
    fileNameDiv.textContent = fileNameDiv.textContent.replace(' - Please click "Enable Audio Permission"', ' - Audio started ✓');
  }
}

function resetToFallback() {
  // Revert to oscillator
  soundFile = new p5.Oscillator();
  soundFile.amp(0);
  soundFile.start();
  hasUploadedAudio = false;
  isVideo = false;
}

// Switch microphone input
function toggleMicrophone() {
  let micBtn = document.getElementById('micBtn');
  let fileNameDiv = document.getElementById('fileName');
  let playPauseBtn = document.getElementById('playPauseBtn');
  let startAudioBtn = document.getElementById('startAudio');

  if (!isUsingMic) {
    // Activate microphone
    startMicrophone();
  } else {
    // Disable the microphone and switch back to file mode
    stopMicrophone();
  }
}

function startMicrophone() {
  let micBtn = document.getElementById('micBtn');
  let fileNameDiv = document.getElementById('fileName');
  let playPauseBtn = document.getElementById('playPauseBtn');
  let startAudioBtn = document.getElementById('startAudio');

  // First stop any audio or video currently playing
  if (soundFile && isPlaying) {
    if (isVideo) {
      soundFile.pause();
    } else {
      soundFile.stop();
    }
    isPlaying = false;
  }

  // Hidden file mode play/pause button
  playPauseBtn.style.display = 'none';

  //  If required, initialise the audio context
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume().then(() => {
      console.log('Audio context started (microphone mode)');
      audioStarted = true;
      initializeMicrophone();
    }).catch(err => {
      console.error('Audio context startup failed:', err);
      fileNameDiv.textContent = 'Microphone startup failed: ' + err.message;
      fileNameDiv.style.color = 'red';
    });
  } else {
    audioStarted = true;
    initializeMicrophone();
  }
}

function initializeMicrophone() {
  let micBtn = document.getElementById('micBtn');
  let fileNameDiv = document.getElementById('fileName');

  // Create and activate the microphone
  mic = new p5.AudioIn();
  mic.start(() => {
    console.log('Microphone started');
    micStarted = true;
    isUsingMic = true;
    
    // Connect the microphone to the amplitude analyser
    amplitude.setInput(mic);
    
    // Update the UI
    micBtn.textContent = '🔴 Stop Microphone';
    micBtn.style.background = '#F44336';
    fileNameDiv.textContent = 'Microphone started - Listening for sound...';
    fileNameDiv.style.color = 'green';
    
    // Start playing the visualisation
    isPlaying = true;
    
  }, (error) => {
    console.error('Microphone startup failed:', error);
    fileNameDiv.textContent = 'Microphone startup failed: Please check microphone permissions';
    fileNameDiv.style.color = 'red';
  });
}

function stopMicrophone() {
  let micBtn = document.getElementById('micBtn');
  let fileNameDiv = document.getElementById('fileName');
  let playPauseBtn = document.getElementById('playPauseBtn');

  if (mic && micStarted) {
    mic.stop();
    micStarted = false;
  }

  isUsingMic = false;
  isPlaying = false;

  // Reset amplitude input
  if (soundFile && !isVideo) {
    amplitude.setInput(soundFile);
  }

  // Update UI
  micBtn.textContent = '🎤 Use Microphone';
  micBtn.style.background = '#FF9800';
  fileNameDiv.textContent = 'Microphone stopped';

  // If a file is loaded, display the play/pause button
  if (hasUploadedAudio) {
    playPauseBtn.style.display = 'block';
    fileNameDiv.textContent = 'Switched to file mode';
  }
}
// Use the button to toggle play/pause
function togglePlayPause() {
  let playPauseBtn = document.getElementById('playPauseBtn');

  // If no file has been uploaded, the button will be disabled; therefore, this situation should not occur
  if (!soundFile || !hasUploadedAudio) {
    return;
  }

  userStartAudio();

  if (isPlaying) {
    // pause
    if (isVideo) {
      soundFile.pause();
      console.log('Video paused');
    } else {
      soundFile.amp(0, 0.5);
      console.log('Audio faded out');
    }
    isPlaying = false;
    playPauseBtn.textContent = '▶ Play';
    playPauseBtn.style.background = '#4CAF50';
  } else {
    // Play
    if (isVideo) {
      soundFile.loop(); // Set to loop during playback
      soundFile.play();
      console.log('Video playing, time:', soundFile.time());
      soundFile.volume(1.0);
    } else {
      soundFile.play();
      console.log('Audio file playing');
    }
    isPlaying = true;
    playPauseBtn.textContent = '⏸ Pause';
    playPauseBtn.style.background = '#FF5722';
  }
}

function draw() {
  background(247, 241, 219, 25); // Slight transparency to produce a trail effect
  // Move the origin to the centre of the canvas
  translate(width / 2, height / 2);

  // Draw line groups based on audio levels
  let level;

  // video uses Web Audio API，audio and microphone use p5.Amplitude
  if (isVideo && analyser && !isUsingMic) {
    // Retrieving audio levels from the Web Audio API analyser
    let dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);

    // Calculate the average level from frequency data
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    level = sum / dataArray.length / 255; // Normalised to 0-1
  } else {
    // Audio files and microphone usage with p5.Amplitude
    level = amplitude ? amplitude.getLevel() : 0;
  }

  // Debugging: Display the current level on the console
  if (frameCount % 10 === 0) { // Record once every 10 frames to obtain more frequent updates.
    console.log('Audio level:', level.toFixed(4), 'Is playing:', isPlaying, 'Is video:', isVideo, 'Has uploaded:', hasUploadedAudio, 'Using mic:', isUsingMic);
  }

  // Animation only occurs when actual audio is playing.
  let numGroups = 0; // Default: No animation
  let isActive = (isUsingMic && micStarted) || isPlaying;
  if (isActive && level > 0.001) { // The threshold for video, audio, and microphone has been reduced to 0.001.
    numGroups = floor(map(level, 0, 1, 1, 8));
    console.log('Animating with', numGroups, 'groups, level:', level.toFixed(4));
  }

  for (let g = 0; g < numGroups; g++) {
    drawLineGroup();
  }
}

// Switch audio/video playback upon mouse click
function mousePressed() {
  // Check whether the click is on the button - if so, do not process here
  if (event && event.target && event.target.tagName === 'BUTTON') {
    return; // Have the button's onclick handler handle it
  }

  // Switch only when a file has been uploaded and no UI element is being clicked
  if (hasUploadedAudio) {
    togglePlayPause();
  }
}

// Window resizing
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  setup();
}
