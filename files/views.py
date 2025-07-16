import os
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from stats.utils import process_excel_file, file_hash_processor
from django.shortcuts import get_object_or_404
from .models import UserFile
from .utils import process_userfile_and_save_report
from rest_framework import viewsets, permissions
from .serializers import UserFileSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes

class UserFileViewSet(viewsets.ModelViewSet):
    serializer_class = UserFileSerializer
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        operation_id='create_user_file',
        summary='Create a new file upload',
        description='Upload a new file for processing',
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'file': {
                        'type': 'string',
                        'format': 'binary',
                        'description': 'Excel file to upload'
                    }
                },
                'required': ['file']
            }
        },
        responses={
            201: UserFileSerializer,
            400: {
                'type': 'object',
                'properties': {
                    'error': {'type': 'string'}
                }
            }
        }
    )
    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except Exception as e:
            # Handle duplicate file error
            if "File has already been processed recently" in str(e):
                return Response(
                    {'error': str(e)},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Re-raise other exceptions
            raise

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return UserFile.objects.all()
        return UserFile.objects.filter(user=user)

    def perform_create(self, serializer):
        # Get the uploaded file
        uploaded_file = serializer.validated_data['file']
        
        # Create a temporary file path to check for duplicates
        import tempfile
        import os
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as temp_file:
            # Write uploaded file content to temporary file
            for chunk in uploaded_file.chunks():
                temp_file.write(chunk)
            temp_file_path = temp_file.name
        
        try:
            # Check if file is a duplicate before saving
            file_hash = file_hash_processor.create_file_hash(temp_file_path)
            if file_hash_processor.is_file_recent(file_hash):
                # File is a duplicate - don't save it
                error_msg = f"File has already been processed recently (within {file_hash_processor.time_window.total_seconds() / 3600} hours)."
                raise Exception(error_msg)
            
            # File is not a duplicate - save it and process
            user_file_instance = serializer.save(user=self.request.user)
            
            # Now process the file to generate a report
            try:
                process_userfile_and_save_report(user_file_instance)
            except Exception as e:
                # Handle cases where report generation fails but file upload should succeed
                print(f"Could not generate report for file {user_file_instance.id}: {e}")
                
        finally:
            # Clean up temporary file
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
