from rest_framework import serializers
from .models import UserFile

class UserFileSerializer(serializers.ModelSerializer):
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()

    class Meta:
        model = UserFile
        fields = ['id', 'file', 'uploaded_at', 'file_name', 'file_size']

    def get_file_name(self, obj):
        return obj.file.name.split('/')[-1] if obj.file else None

    def get_file_size(self, obj):
        return obj.file.size if obj.file else None