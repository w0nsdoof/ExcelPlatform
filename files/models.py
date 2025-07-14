from django.db import models
from django.contrib.auth.models import User

class UploadedFile(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    file = models.FileField(upload_to='uploads/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    original_name = models.CharField(max_length=255)
    parsed = models.BooleanField(default=False)

class ParsedData(models.Model):
    file = models.ForeignKey(UploadedFile, on_delete=models.CASCADE)
    row_data = models.JSONField() 