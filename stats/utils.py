import os
import openpyxl
import io
import json
from django.core.files.base import ContentFile

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
            for cat, indices in ab_indices.items():
                for idx in indices:
                    if idx < len(row) and row[idx] and str(row[idx]).strip() == "+":
                        quota_counts[cat] += 1
            # Count Примечание values
            if prim_idx is not None and prim_idx < len(row):
                val = row[prim_idx]
                if isinstance(val, str) and val.strip():
                    for item in val.split(","):
                        item = item.strip()
                        if item:
                            prim_counts[item] = prim_counts.get(item, 0) + 1
            # Look for specialization data in the row - it seems to be in a specific column
            # Based on the sample data, it appears to be around index 30-31
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
                            break  # Only count the first choice
                    break  # Only process the first specialization cell found
    if prim_counts:
        quota_counts["Примечание"] = prim_counts
    return {
        "quota_counts": quota_counts,
        "specialization_counts": specialization_counts
    }

def process_excel_file(file_path):
    if not is_xlsx_file(file_path):
        return None, "Not an Excel file"
    if not is_nct_excel(file_path):
        return None, "File does not match expected NCT pattern"
    blocks = parse_nct_blocks_correct_header(file_path)
    report = generate_custom_report(blocks)
    return report, None

