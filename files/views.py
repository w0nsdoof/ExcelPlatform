from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from .models import UploadedFile, ParsedData
from .serializers import UploadedFileSerializer, ParsedDataSerializer
from .parsers import parse_xlsx
from django.conf import settings
import os
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes

class UploadFileView(generics.CreateAPIView):
    queryset = UploadedFile.objects.all()
    serializer_class = UploadedFileSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        file_obj = self.request.FILES['file']
        serializer.save(user=self.request.user, original_name=file_obj.name)

    @extend_schema(
        request={
            'multipart/form-data': UploadedFileSerializer,
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

class FileListView(generics.ListAPIView):
    serializer_class = UploadedFileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UploadedFile.objects.filter(user=self.request.user)

class FileDetailView(generics.RetrieveAPIView):
    queryset = UploadedFile.objects.all()
    serializer_class = UploadedFileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UploadedFile.objects.filter(user=self.request.user)

class DownloadFileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        file_obj = get_object_or_404(UploadedFile, pk=pk, user=request.user)
        file_path = file_obj.file.path
        if not os.path.exists(file_path):
            raise Http404
        response = FileResponse(open(file_path, 'rb'), as_attachment=True, filename=file_obj.original_name)
        return response

class ParseFileView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        file_obj = get_object_or_404(UploadedFile, pk=pk, user=request.user)
        if file_obj.parsed:
            return Response({'detail': 'File already parsed.'}, status=status.HTTP_400_BAD_REQUEST)
        data = parse_xlsx(file_obj.file.path)
        for row in data:
            ParsedData.objects.create(file=file_obj, row_data=row)
        file_obj.parsed = True
        file_obj.save()
        return Response({'parsed_rows': len(data)}) 