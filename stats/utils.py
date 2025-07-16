import os
import openpyxl
import io
import json
from django.core.files.base import ContentFile
from datetime import datetime, timedelta
import hashlib

class TimeHashProcessor:
    def __init__(self, time_window_hours=3, max_hashes=10000):
        """
        Initialize the hash processor with time window and memory limits.
        
        Args:
            time_window_hours (int): Hours to keep hashes in memory (default: 3)
            max_hashes (int): Maximum number of hashes to store (default: 10000)
        """
        self.time_window = timedelta(hours=time_window_hours)
        self.max_hashes = max_hashes
        self.hash_timestamps = {}  # hash -> timestamp
        self.last_cleanup = datetime.now()
    
    def create_row_hash(self, row, header_row=None):
        """Create anonymous hash from personal data."""
        # If header_row is provided, find indices
        if header_row:
            try:
                iin_idx = header_row.index('ИИН')
                fio_idx = header_row.index('ФИО')
                cert_idx = header_row.index('№ сертификата')
            except ValueError:
                # If headers not found, use default positions
                iin_idx, fio_idx, cert_idx = 6, 2, 11  # Based on sample data structure
        else:
            # Default positions based on sample data
            iin_idx, fio_idx, cert_idx = 6, 2, 11
        
        # Extract values safely
        iin = str(row[iin_idx] if iin_idx < len(row) else '')
        fio = str(row[fio_idx] if fio_idx < len(row) else '')
        cert = str(row[cert_idx] if cert_idx < len(row) else '')
        
        # Create hash
        personal_data = f"{iin}{fio}{cert}"
        return hashlib.sha256(personal_data.encode('utf-8')).hexdigest()
    
    def is_hash_recent(self, row_hash):
        """Check if hash was seen recently within time window."""
        if row_hash not in self.hash_timestamps:
            return False
        
        last_seen = self.hash_timestamps[row_hash]
        time_diff = datetime.now() - last_seen
        return time_diff <= self.time_window
    
    def add_hash(self, row_hash):
        """Add hash with current timestamp."""
        current_time = datetime.now()
        
        # Check memory limit
        if len(self.hash_timestamps) >= self.max_hashes:
            self.cleanup_old_hashes()
            
            # If still at limit after cleanup, remove oldest entry
            if len(self.hash_timestamps) >= self.max_hashes:
                oldest_hash = min(self.hash_timestamps.keys(), 
                                key=lambda h: self.hash_timestamps[h])
                del self.hash_timestamps[oldest_hash]
        
        self.hash_timestamps[row_hash] = current_time
    
    def cleanup_old_hashes(self):
        """Remove hashes older than time window."""
        current_time = datetime.now()
        cutoff_time = current_time - self.time_window
        
        # Remove old hashes
        old_hashes = [
            h for h, t in self.hash_timestamps.items() 
            if t < cutoff_time
        ]
        for h in old_hashes:
            del self.hash_timestamps[h]
        
        self.last_cleanup = current_time
    
    def get_stats(self):
        """Get current statistics."""
        return {
            "total_hashes": len(self.hash_timestamps),
            "max_hashes": self.max_hashes,
            "time_window_hours": self.time_window.total_seconds() / 3600,
            "last_cleanup": self.last_cleanup.isoformat(),
            "memory_usage_mb": len(self.hash_timestamps) * 0.0001  # Rough estimate
        }

# Global processor instance
hash_processor = TimeHashProcessor(time_window_hours=3, max_hashes=10000)

def is_xlsx_file(file_path):
    return file_path.lower().endswith('.xlsx')

def parse_nct_blocks_correct_header(file_path):
    wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    i = 0
    results = []
    while i < len(rows):
        row = rows[i]
        if any(cell and "Национальный Центр Тестирования" in str(cell) for cell in row):
            # Find the first header row with "Код группы ОП"
            j = i + 1
            categories = None
            header_row = None
            while j < len(rows):
                header_row = rows[j]
                if header_row and "Код группы ОП" in [str(c).strip() if c else "" for c in header_row]:
                    # Now, look for the next non-empty row (the ab-categories row)
                    k = j + 1
                    while k < len(rows) and not any(rows[k]):
                        k += 1
                    if k < len(rows):
                        categories = [c for c in rows[k]]
                        j = k + 1
                    else:
                        categories = [c for c in header_row]
                        j += 1
                    break
                j += 1
            # Now j is at the first data row
            data = []
            while j < len(rows):
                next_row = rows[j]
                if any(cell and "Национальный Центр Тестирования" in str(cell) for cell in next_row):
                    break
                if any(next_row):  # skip empty rows
                    data.append([c for c in next_row])
                j += 1
            results.append({
                "nct_row": i + 1,
                "categories": categories if categories else [],
                "header_row": header_row if header_row else [],
                "data": data
            })
            i = j
        else:
            i += 1
    return results

def is_nct_excel(file_path):
    """Check if the Excel file contains at least one NCT block with categories."""
    try:
        blocks = parse_nct_blocks_correct_header(file_path)
        return bool(blocks and any(block['categories'] for block in blocks))
    except Exception:
        return False

def generate_custom_report(blocks):
    ab_categories = {"АБ", "АГП", "ТиПО", "О, КНП, ИК, СС", "Сир", "Инв", "ВОВ", "Отл", "Село", "Кандас", "Многод. семья", "Неполная семья", "Семьи с инв."}
    quota_counts = {cat: 0 for cat in ab_categories}
    specialization_counts = {}
    prim_counts = {}  # For Примечание values
    
    # Metadata tracking
    from datetime import datetime
    start_time = datetime.now()
    
    metadata = {
        "total_rows_processed": 0,
        "rows_with_quotas": 0,
        "rows_with_specializations": 0,
        "rows_with_prim": 0,
        "blocks_processed": len(blocks),
        "processing_start": start_time.isoformat(),
        "processing_end": None,
        "processing_duration_seconds": None,
        "deduplication_stats": {
            "duplicate_rows_skipped": 0,
            "unique_rows_processed": 0,
            "hash_processor_stats": None
        }
    }
    
    for block in blocks:
        cats = block['categories']
        header_row = block.get('header_row', [])
        # Find all indices for each ab-category
        ab_indices = {cat: [i for i, c in enumerate(cats) if c == cat] for cat in ab_categories}
        # Find index for Примечание in header row
        try:
            prim_idx = header_row.index("Примечание")
        except ValueError:
            prim_idx = None
        for row in block['data']:
            metadata["total_rows_processed"] += 1
            
            # Create row hash for deduplication
            row_hash = hash_processor.create_row_hash(row, header_row)
            
            # Check if this row is a duplicate
            if hash_processor.is_hash_recent(row_hash):
                metadata["deduplication_stats"]["duplicate_rows_skipped"] += 1
                continue  # Skip this row
            
            # Process unique row
            metadata["deduplication_stats"]["unique_rows_processed"] += 1
            hash_processor.add_hash(row_hash)
            
            # Track quota rows
            has_quota = False
            for cat, indices in ab_indices.items():
                for idx in indices:
                    if idx < len(row) and row[idx] and str(row[idx]).strip() == "+":
                        quota_counts[cat] += 1
                        has_quota = True
            if has_quota:
                metadata["rows_with_quotas"] += 1
            
            # Track Примечание rows
            if prim_idx is not None and prim_idx < len(row):
                val = row[prim_idx]
                if isinstance(val, str) and val.strip():
                    metadata["rows_with_prim"] += 1
                    for item in val.split(","):
                        item = item.strip()
                        if item:
                            prim_counts[item] = prim_counts.get(item, 0) + 1
            
            # Track specialization rows
            has_specialization = False
            for idx, cell in enumerate(row):
                if isinstance(cell, str) and " - " in cell and "\n" in cell:
                    # This looks like specialization data
                    lines = cell.split('\n')
                    for line in lines:
                        line = line.strip()
                        if " - " in line:
                            spec, univ = line.split(" - ")
                            spec = spec.strip()
                            univ = univ.strip()
                            if univ == "421":  # KBTU
                                specialization_counts[spec] = specialization_counts.get(spec, 0) + 1
                                has_specialization = True
                            break  # Only count the first choice
                    break  # Only process the first specialization cell found
            if has_specialization:
                metadata["rows_with_specializations"] += 1
    
    if prim_counts:
        quota_counts["Примечание"] = prim_counts
    
    # Calculate processing duration
    end_time = datetime.now()
    duration = (end_time - start_time).total_seconds()
    
    metadata["processing_end"] = end_time.isoformat()
    metadata["processing_duration_seconds"] = round(duration, 3)
    
    # Add hash processor stats
    metadata["deduplication_stats"]["hash_processor_stats"] = hash_processor.get_stats()
    
    return {
        "quota_counts": quota_counts,
        "specialization_counts": specialization_counts,
        "metadata": metadata
    }

def process_excel_file(file_path):
    if not is_xlsx_file(file_path):
        return None, "Not an Excel file"
    if not is_nct_excel(file_path):
        return None, "File does not match expected NCT pattern"
    blocks = parse_nct_blocks_correct_header(file_path)
    report = generate_custom_report(blocks)
    return report, None

