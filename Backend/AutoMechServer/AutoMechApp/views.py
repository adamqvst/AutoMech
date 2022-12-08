from asyncio.windows_events import NULL
from django.shortcuts import render
from django.http import HttpResponse
import json
from json import JSONEncoder
import numpy as np
from AutoMechApp.RpmExtractor import RpmExtractor
import time

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
        print(f'engine configuration: {engineCfg}\nfiring order: {firingorder}')

        rpmExtractor.startDiagnostics(engineCfg)

        return HttpResponse(f'beginning diagnostics on {engineCfg}-cylinder engine')

def get_diagnostics_data(request):

    data_sparseness = int(request.GET.get('data_sparseness')) 

    rpmExtractor.setSparseness(data_sparseness)
    data = rpmExtractor.getChunk()

    print(f'received sparseness: {data_sparseness}, computed sparseness: {rpmExtractor.data_sparseness}')

    jsonEncodedNumpyArray = json.dumps(data[1], cls=NumpyArrayEncoder)

    reponse_data = {
        "rpm": data[0],
        "wave": jsonEncodedNumpyArray,
    }

    json_response_data = json.dumps(reponse_data)

    return HttpResponse(json_response_data)

def end_diagnostics(request):
    
    if request.method == 'PUT':
        rpmExtractor.endDiagnostics()
        return HttpResponse('diagnostics have halted')
