from rest_framework import viewsets
from .models import UserFile
from .serializers import UserFileSerializer

class UserFileViewSet(viewsets.ModelViewSet):
    serializer_class = UserFileSerializer
    queryset = UserFile.objects.all()
