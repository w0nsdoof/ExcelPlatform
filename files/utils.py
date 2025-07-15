import os
import json
from django.core.files import File
from django.core.files.base import ContentFile
from django.conf import settings
from stats.utils import process_excel_file

def process_userfile_and_save_report(userfile):
    file_path = userfile.file.path
    report, error = process_excel_file(file_path)
    if error:
        return None, error
    # Save report as in-memory file
    report_filename = os.path.splitext(os.path.basename(userfile.file.name))[0] + '.report.json'
    report_content = json.dumps(report, ensure_ascii=False, indent=2)
    userfile.report.save(report_filename, ContentFile(report_content.encode('utf-8')), save=True)
    return report, None
