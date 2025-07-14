from rest_framework import serializers
from .models import UploadedFile, ParsedData

class UploadedFileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UploadedFile
        fields = ['id', 'user', 'file', 'uploaded_at', 'original_name', 'parsed']
        read_only_fields = ['id', 'user', 'uploaded_at', 'parsed', 'original_name']

class ParsedDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParsedData
        fields = ['id', 'file', 'row_data']
        read_only_fields = ['id', 'file', 'row_data'] 