from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('api/begin-diagnostics', views.begin_diagnostics, name='begin_diagnostics'),
    path('api/end-diagnostics', views.end_diagnostics, name='end_diagnostics'),
    path('api/get-diagnostics-data', views.get_diagnostics_data, name='get_diagnostics_data'),
    path('api/get_input_devices', views.get_input_devices, name='get_input_devices')
]
