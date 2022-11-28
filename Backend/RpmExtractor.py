import pyaudio
import audioop
import numpy as np
from scipy.fft import rfft, fft
from scipy.signal import find_peaks

CHUNK = 8192  # Record in chunks of 8192 samples
FORMAT = pyaudio.paInt16  # 16 bits per sample
CHANNELS = 1 # Record in mono
RATE = 44100  # Record at 44100 samples per second

NUMBER_OF_CYLINDERS = 4

VOLUME_THRESHOLD = 1000

def dominant_frequency(data, sampling_rate, volume):

    # disregard second channel
    samples_1D = np.empty(len(data)) 
    for x in range(0, len(data)):
        samples_1D[x] = data[x]

    n = CHUNK
    k = np.arange(n)
    T = n / sampling_rate
    xf = k / T
    xf = xf[range(int(n / 2))] # Single sided frequency range
    yf = rfft(samples_1D[0:n-1])

    #transform from frequency space to sample space
    frq_int = [0, 1000]
    left_frq_boundary = int(frq_int[0] * len(yf) / (frq_int[1] - frq_int[0]))
    right_frq_boundary = int(frq_int[1] * len(yf) / (frq_int[1] - frq_int[0]))

    peaks = find_peaks(np.abs(yf[left_frq_boundary : right_frq_boundary]), height = 1, threshold = 1, distance = 10)
    heights = peaks[1]['peak_heights']

    num_peaks = 1
    
    # find highest peak
    x_ind = np.argpartition(heights, -num_peaks)[-num_peaks:]
    frequency = np.round(peaks[0][x_ind[0]] * (sampling_rate / n), 2)

    # Calculate rpm if frequency is below 400 and volume above threshold
    if volume > VOLUME_THRESHOLD and frequency < 400:
        rpm = frequency * 60 / (NUMBER_OF_CYLINDERS / 2)
        print("calculated rpm: " + str(np.round(rpm)))


def main():
    
    p = pyaudio.PyAudio()  # Create an interface to PortAudio

    # Print audio devices to console
    info = p.get_host_api_info_by_index(0)
    numdevices = info.get('deviceCount')
    for i in range(0, numdevices):
        if (p.get_device_info_by_host_api_device_index(0, i).get('maxInputChannels')) > 0:
            print ("Input Device id ", i, " - ", p.get_device_info_by_host_api_device_index(0, i).get('name'))

    stream = p.open(format=FORMAT,
                channels=CHANNELS,
                rate=RATE,
                input=True,
                frames_per_buffer=CHUNK,
                input_device_index = 1)  # Input device

    while True:

        data = stream.read(CHUNK)   # Read a chunk of data from the stream
        data_int = np.frombuffer(data, dtype=np.int16)   # Convert data to int16
        volume = audioop.rms(data, 2)  # Store volume of chunk

        # Calculate peak frequency
        dominant_frequency(data_int, RATE, volume)


if __name__ == "__main__":
    main()