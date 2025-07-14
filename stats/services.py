from files.models import UploadedFile, ParsedData
from django.contrib.auth.models import User

def get_stats():
    total_files = UploadedFile.objects.count()
    parsed_files = UploadedFile.objects.filter(parsed=True).count()
    total_rows = ParsedData.objects.count()
    by_user = {}
    for user in User.objects.all():
        by_user[user.email or user.username] = UploadedFile.objects.filter(user=user).count()
    return {
        'total_files': total_files,
        'parsed_files': parsed_files,
        'total_rows': total_rows,
        'by_user': by_user,
    } 