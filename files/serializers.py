from rest_framework import serializers
from .models import UserFile

class UserFileSerializer(serializers.ModelSerializer):
    file_name = serializers.SerializerMethodField()
    file_size = serializers.SerializerMethodField()
    report_url = serializers.SerializerMethodField()

    class Meta:
        model = UserFile
        fields = ['id', 'file', 'uploaded_at', 'file_name', 'file_size', 'report', 'report_url']
        read_only_fields = ['report'] # Report is generated, not uploaded

    def get_file_name(self, obj):
        return obj.file.name.split('/')[-1] if obj.file else None

    def get_file_size(self, obj):
        return obj.file.size if obj.file else None

    def get_report_url(self, obj):
        if obj.report:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.report.url)
            return obj.report.url
        return None