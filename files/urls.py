from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserFileViewSet

router = DefaultRouter()
router.register(r'files', UserFileViewSet, basename='files')

urlpatterns = [
    path('api/', include(router.urls)),
]