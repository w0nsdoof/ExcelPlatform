from rest_framework import viewsets, permissions
from .models import UserFile
from .serializers import UserFileSerializer

class UserFileViewSet(viewsets.ModelViewSet):
    serializer_class = UserFileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return UserFile.objects.all()
        return UserFile.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
