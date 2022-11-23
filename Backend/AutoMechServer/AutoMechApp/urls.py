from django.urls import path
from . import views

urlpatterns = [
    path('', views.home, name='home'),
    path('api/begin-diagnostics', views.begin_diagnostics, name='begin_diagnotics'),
    path('api/end-diagnostics', views.end_diagnostics, name='end_diagnostics')
]
