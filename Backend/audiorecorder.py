import pyaudio
import keyboard
import audioop

CHUNK = 1024  # Record in chunks of 1024 samples
FORMAT = pyaudio.paInt16  # 16 bits per sample
CHANNELS = 1
RATE = 44100  # Record at 44100 samples per second

p = pyaudio.PyAudio()  # Create an interface to PortAudio

stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                frames_per_buffer=CHUNK,
                input=True)

frames = []  # Initialize array to store frames
volume_level = []  # Array to store volume level (for visualization purpose)

while True:

        # Read a chunk of data from the stream
        data = stream.read(CHUNK)
        frames.append(data)
        volume = audioop.rms(data, 2)
        volume_level.append(volume)

        print(volume) # Print volume level to console for visualization purpose

        # Check for quit command
        if keyboard.is_pressed('q'):

            stream.stop_stream()
            stream.close()
            p.terminate()

            break
