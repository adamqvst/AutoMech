from asyncio.windows_events import NULL
from django.shortcuts import render
from django.http import HttpResponse
import json

# Create your views here.

engineCfg = NULL
firingorder = NULL
running_diagnostics = False


def home(request):
    return render(request, 'AutoMech.html')

def begin_diagnostics(request):

    if request.method == 'PUT':
        running_diagnostics = True

        jsonDict = json.loads(request.body)
        engineCfg = jsonDict['engineCfg']
        firingorder = jsonDict['firingorder']
        print(f'engine configuration: {engineCfg}\nfiring order: {firingorder}')
        return HttpResponse(f'beginning diagnostics on {engineCfg}-cylinder engine')

def send_diagnostics_data(request):
    return HttpResponse('data')

def end_diagnostics(request):
    
    if request.method == 'PUT':

        running_diagnostics = False
        return HttpResponse('diagnostics has ended')
