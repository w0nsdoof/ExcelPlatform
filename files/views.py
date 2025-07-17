import os
import json
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from django.conf import settings
from stats.utils import process_excel_file, file_hash_processor
from django.shortcuts import get_object_or_404
from .models import UserFile
from .utils import process_userfile_and_save_report
from rest_framework import viewsets, permissions
from .serializers import UserFileSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from datetime import datetime, timedelta

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

    @extend_schema(
        operation_id='get_reports_summary',
        summary='Get summary of all reports',
        description='Aggregates data from all processed reports and returns summary statistics',
        parameters=[
            OpenApiParameter(
                name='days',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                description='Number of days to look back (default: 30)',
                required=False
            ),
            OpenApiParameter(
                name='user_only',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                description='Include only current user files (default: true for non-staff)',
                required=False
            )
        ],
        responses={
            200: {
                'type': 'object',
                'properties': {
                    'summary': {
                        'type': 'object',
                        'properties': {
                            'total_files': {'type': 'integer'},
                            'total_quota_counts': {'type': 'object'},
                            'total_specialization_counts': {'type': 'object'},
                            'processing_stats': {'type': 'object'},
                            'file_upload_timeline': {'type': 'array'},
                            'most_active_days': {'type': 'array'},
                            'average_processing_time': {'type': 'number'}
                        }
                    },
                    'metadata': {
                        'type': 'object',
                        'properties': {
                            'generated_at': {'type': 'string'},
                            'time_range_days': {'type': 'integer'},
                            'files_included': {'type': 'integer'}
                        }
                    }
                }
            }
        }
    )
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get aggregated summary of all reports."""
        try:
            # Get query parameters
            days = int(request.query_params.get('days', 30))
            user_only = request.query_params.get('user_only', 'true').lower() == 'true'
            
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Get files in date range
            queryset = self.get_queryset()
            if user_only and not request.user.is_staff:
                queryset = queryset.filter(user=request.user)
            
            files_in_range = queryset.filter(
                uploaded_at__gte=start_date,
                uploaded_at__lte=end_date,
                report__isnull=False
            ).order_by('uploaded_at')
            
            print(f"Found {files_in_range.count()} files with reports")
            
            # Initialize summary data
            total_quota_counts = {}
            total_specialization_counts = {}
            processing_times = []
            upload_timeline = []
            daily_uploads = {}
            
            # Process each file's report
            for user_file in files_in_range:
                print(f"Processing file {user_file.id}: {user_file.file.name}")
                print(f"Report path: {user_file.report.name if user_file.report else 'None'}")
                
                try:
                    # Read report file
                    if user_file.report and user_file.report.storage.exists(user_file.report.name):
                        print(f"Report file exists, reading...")
                        with user_file.report.open('rb') as f:
                            report_content = f.read().decode('utf-8')
                            print(f"Report content length: {len(report_content)}")
                            report_data = json.loads(report_content)
                        
                        print(f"Report data keys: {list(report_data.keys())}")
                        
                        # Aggregate quota counts
                        if 'quota_counts' in report_data:
                            print(f"Found quota_counts: {report_data['quota_counts']}")
                            for category, count in report_data['quota_counts'].items():
                                if category == 'Примечание' and isinstance(count, dict):
                                    # Handle nested Примечание data
                                    if category not in total_quota_counts:
                                        total_quota_counts[category] = {}
                                    for sub_category, sub_count in count.items():
                                        total_quota_counts[category][sub_category] = \
                                            total_quota_counts[category].get(sub_category, 0) + sub_count
                                else:
                                    total_quota_counts[category] = total_quota_counts.get(category, 0) + count
                        
                        # Aggregate specialization counts
                        if 'specialization_counts' in report_data:
                            print(f"Found specialization_counts: {report_data['specialization_counts']}")
                            for specialization, count in report_data['specialization_counts'].items():
                                total_specialization_counts[specialization] = \
                                    total_specialization_counts.get(specialization, 0) + count
                        
                        # Collect processing statistics
                        if 'metadata' in report_data:
                            metadata = report_data['metadata']
                            if 'processing_duration_seconds' in metadata:
                                processing_times.append(metadata['processing_duration_seconds'])
                        
                        # Track upload timeline
                        upload_timeline.append({
                            'file_id': user_file.id,
                            'file_name': user_file.file.name.split('/')[-1],
                            'uploaded_at': user_file.uploaded_at.isoformat(),
                            'quota_count': sum(v for v in report_data.get('quota_counts', {}).values() 
                                             if isinstance(v, (int, float))),
                            'specialization_count': sum(report_data.get('specialization_counts', {}).values())
                        })
                        
                        # Track daily uploads
                        date_key = user_file.uploaded_at.date().isoformat()
                        daily_uploads[date_key] = daily_uploads.get(date_key, 0) + 1
                        
                    else:
                        print(f"Report file does not exist or is None")
                        
                except Exception as e:
                    print(f"Error processing report for file {user_file.id}: {e}")
                    import traceback
                    traceback.print_exc()
                    continue
            
            # Calculate summary statistics
            total_files = len(files_in_range)
            avg_processing_time = sum(processing_times) / len(processing_times) if processing_times else 0
            
            # Get most active days
            most_active_days = sorted(
                daily_uploads.items(), 
                key=lambda x: x[1], 
                reverse=True
            )[:10]
            
            # Prepare response
            summary_data = {
                'summary': {
                    'total_files': total_files,
                    'total_quota_counts': total_quota_counts,
                    'total_specialization_counts': total_specialization_counts,
                    'processing_stats': {
                        'average_processing_time_seconds': round(avg_processing_time, 3),
                        'total_processing_time_seconds': round(sum(processing_times), 3),
                        'files_with_processing_data': len(processing_times)
                    },
                    'file_upload_timeline': upload_timeline,
                    'most_active_days': [
                        {'date': date, 'uploads': count} 
                        for date, count in most_active_days
                    ]
                },
                'metadata': {
                    'generated_at': datetime.now().isoformat(),
                    'time_range_days': days,
                    'files_included': total_files,
                    'date_range': {
                        'start': start_date.isoformat(),
                        'end': end_date.isoformat()
                    }
                }
            }
            
            return Response(summary_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'Failed to generate summary: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
