import pyaudio
import audioop
import numpy as np
from scipy.fft import rfft, fft
from scipy.signal import find_peaks
from threading import Thread, Event
from queue import Queue
import time

CHUNK = 8192  # Record in chunks of 8192 samples
FORMAT = pyaudio.paInt16  # 16 bits per sample
CHANNELS = 1 # Record in mono
RATE = 44100  # Record at 44100 samples per second
VOLUME_THRESHOLD = 1000


def dominant_frequency(data, sampling_rate, volume, engineCfg):

    # disregard second channel
    # apply zero-padding
    samples_1D = np.zeros(RATE) 
    for x in range(0, len(data)):
        samples_1D[x] = data[x]

    yf = rfft(samples_1D[0:RATE-1])

    #transform from frequency space to sample space
    frq_int = [0, 1000]
    left_frq_boundary = int(frq_int[0] * len(yf) / (frq_int[1] - frq_int[0]))
    right_frq_boundary = int(frq_int[1] * len(yf) / (frq_int[1] - frq_int[0]))

    peaks = find_peaks(np.abs(yf[left_frq_boundary : right_frq_boundary]), height = 1, threshold = 1, distance = 10)
    if len(peaks) == 0:
        print("WHOOPS")
        return -1
    heights = peaks[1]['peak_heights']

    num_peaks = 1
    
    # find highest peak
    x_ind = np.argpartition(heights, -num_peaks)[-num_peaks:]
    if len(x_ind) == 0:
        print("WHOOPS")
        return -1
    frequency = np.round(peaks[0][x_ind[0]], 2)

    # Calculate rpm if frequency is below 400 and volume above threshold
    if volume > VOLUME_THRESHOLD and frequency < 400:
        rpm = frequency * 60 / (engineCfg / 2)
        print("calculated rpm: " + str(np.round(rpm)))

        return np.round(rpm)
    
    return -1


class RpmExtractor():

    NUMBER_OF_CYLINDERS = 0

    def __init__(self):
        self.event = Event()
        self.t_main = None
        self.data_sparseness = 2

    def main(self):
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
                    input_device_index = INPUT_DEVICE)  # Input device

        while True:

            if self.event.is_set():
                break

            data = stream.read(CHUNK)   # Read a chunk of data from the stream

            data_int = np.frombuffer(data, dtype=np.int16)   # Convert data to int16

            volume = audioop.rms(data, 2)  # Store volume of chunk

            # Calculate peak frequency
            rpm = dominant_frequency(data_int, RATE, volume, NUMBER_OF_CYLINDERS)

            # Data sparseness for graph

            for x in range(self.data_sparseness):
                data_int = np.delete(data_int, np.arange(0, data_int.size, 2))
            
            self.q_data.put((rpm, data_int))

    def startDiagnostics(self, engineCfg,inputDevice):
        self.q_data = Queue()
        self.t_main = Thread(target=self.main)
        self.t_main.start()

        global NUMBER_OF_CYLINDERS
        global INPUT_DEVICE
        INPUT_DEVICE = int(inputDevice)
        NUMBER_OF_CYLINDERS = int(engineCfg)

        print("\nRpxExtractor.py: beginning diagnostics with engineCfg: " + str(engineCfg) + "\n")

    def endDiagnostics(self):
        self.event.set()
        if self.t_main != None:
            self.t_main.join()
        
        self.event.clear()
        print("\nRpxExtractor.py: halting diagnostics\n")

    #data sparseness determines how much many times the data array should be halved in size
    #used to reduce amount of data sent to frontend
    def setSparseness(self, data_sparseness):
        self.data_sparseness = data_sparseness

    def getChunk(self):
        print(f'queue length: {self.q_data.qsize()}')
        return self.q_data.get()
