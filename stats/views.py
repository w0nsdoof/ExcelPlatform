from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .services import get_stats

class FileStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_stats()) 