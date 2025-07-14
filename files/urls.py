from django.urls import path
from .views import UploadFileView, FileListView, FileDetailView, DownloadFileView, ParseFileView

urlpatterns = [
    path('upload/', UploadFileView.as_view(), name='file-upload'),
    path('list/', FileListView.as_view(), name='file-list'),
    path('<int:pk>/', FileDetailView.as_view(), name='file-detail'),
    path('<int:pk>/download/', DownloadFileView.as_view(), name='file-download'),
    path('<int:pk>/parse/', ParseFileView.as_view(), name='file-parse'),
] 