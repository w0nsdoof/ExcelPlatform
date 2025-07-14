from django.urls import path
from .views import FileStatsView

urlpatterns = [
    path('files/', FileStatsView.as_view(), name='file-stats'),
] 