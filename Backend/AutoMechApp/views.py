from django.shortcuts import render
from django.http import HttpResponse
import json
from json import JSONEncoder
import numpy as np
from AutoMechApp.RpmExtractor import RpmExtractor
import time
import pyaudio

# Create your views here.

rpmExtractor = RpmExtractor()

# https://pynative.com/python-serialize-numpy-ndarray-into-json/
class NumpyArrayEncoder(JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return JSONEncoder.default(self, obj)

def home(request):
    return render(request, 'AutoMech.html')

def begin_diagnostics(request):

    if request.method == 'PUT':
        jsonDict = json.loads(request.body)
        engineCfg = jsonDict['engineCfg']
        firingorder = jsonDict['firingorder']
        inputDevice = jsonDict['inputdevice']
        samplingRate = jsonDict['samplingRate']
        chunkSize = jsonDict['chunkSize']
        print(f'engine configuration: {engineCfg}\nfiring order: {firingorder}\ninputdevice: {inputDevice}\sampling rate: {samplingRate}\nchunk size {chunkSize}')

        rpmExtractor.startDiagnostics(engineCfg, inputDevice, samplingRate, chunkSize)

        return HttpResponse(f'beginning diagnostics on {engineCfg}-cylinder engine')

def get_diagnostics_data(request):

    data_sparseness = int(request.GET.get('data_sparseness')) 

    rpmExtractor.setSparseness(data_sparseness)
    data = rpmExtractor.getChunk()
    
    print(f'received sparseness: {data_sparseness}, computed sparseness: {rpmExtractor.data_sparseness}')

    jsonEncodedNumpyArray = json.dumps(data[1], cls=NumpyArrayEncoder)

    reponse_data = {
        "rpm": data[0],
        "wave": jsonEncodedNumpyArray
    }

    json_response_data = json.dumps(reponse_data)

    return HttpResponse(json_response_data)

def get_input_devices(request):
    p = pyaudio.PyAudio()  # Create an interface to PortAudio

    # Print audio devices to console
    info = p.get_host_api_info_by_index(0)
	
    reponse_data = "{"

    numdevices = info.get('deviceCount')
    for i in range(0, numdevices):
        if (p.get_device_info_by_host_api_device_index(0, i).get('maxInputChannels')) > 0:
            print ("Input Device id ", str(i), " - ", p.get_device_info_by_host_api_device_index(0, i).get('name'))
            reponse_data += '"'+str(i)+'": "'+p.get_device_info_by_host_api_device_index(0, i).get('name')+'",'

    #jsonEncodedNumpyArray = json.dumps(data[1], cls=NumpyArrayEncoder)
    reponse_data = reponse_data[:len(reponse_data)-1]
    reponse_data += "}"

    json_response_data = json.dumps(reponse_data)

    return HttpResponse(json_response_data)

def end_diagnostics(request):
    
    if request.method == 'PUT':
        rpmExtractor.endDiagnostics()
        return HttpResponse('diagnostics have halted')
