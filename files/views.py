import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from stats.utils import process_excel_file
from django.shortcuts import get_object_or_404
from .models import UserFile
from .utils import process_userfile_and_save_report
from rest_framework import viewsets, permissions
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
        # First, save the file to create the UserFile instance
        user_file_instance = serializer.save(user=self.request.user)
        # Now, process the file to generate a report
        try:
            process_userfile_and_save_report(user_file_instance)
        except Exception as e:
            # Handle cases where report generation fails but file upload should succeed
            print(f"Could not generate report for file {user_file_instance.id}: {e}")
