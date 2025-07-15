import openpyxl
import pandas as pd

data = "data.xlsx"

def is_header_row(row):
    # Heuristic: header rows have many None and/or known category names
    non_empty = [c for c in row if c]
    # If most non-empty cells are in ab_categories or known headers, it's a header
    ab_categories = {"АБ", "АГП", "ТиПО", "О, КНП, ИК, СС", "Сир", "Инв", "ВОВ", "Отл", "Село", "Кандас", "Многод. семья", "Неполная семья", "Семьи с инв."}
    known_headers = ab_categories | {"№", "ФИО", "ИИН", "ИКТ", "№ сертификата", "Средний балл аттестата (диплома)", "Имеющие преимущественные право", "Квота", "Форма обучения", "Код группы ОП", "Балл 1 твор. экзам.", "Балл 2 твор. экзам.", "Код технического секретаря", "Примечание"}
    return all(str(c).strip() in known_headers for c in non_empty)

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
                "data": data
            })
            i = j
        else:
            i += 1
    return results

def generate_custom_report(blocks):
    # Set of categories to count '+'
    ab_categories = {"АБ", "АГП", "ТиПО", "О, КНП, ИК, СС", "Сир", "Инв", "ВОВ", "Отл", "Село", "Кандас", "Многод. семья", "Неполная семья", "Семьи с инв."}
    ab_counts = {cat: 0 for cat in ab_categories}
    specialization_counts = {}

    for block in blocks:
        cats = block['categories']
        print("Categories in block:", cats)
        if block['data']:
            print("Sample data row:", block['data'][0])
        # Find indices for ab_categories and 'Код группы ОП'
        ab_indices = {cat: i for i, cat in enumerate(cats) if cat in ab_categories}
        try:
            group_code_idx = cats.index("Код группы ОП")
            print("Код группы ОП index:", group_code_idx)
            for row in block['data'][:5]:
                print("Код группы ОП value:", row[group_code_idx] if group_code_idx < len(row) else None)
        except ValueError:
            print("No 'Код группы ОП' in categories:", cats)

        for row in block['data']:
            # Count '+'
            for cat, idx in ab_indices.items():
                if idx < len(row) and row[idx] and str(row[idx]).strip() == "+":
                    ab_counts[cat] += 1

            # Count specializations for KBTU (421)
            if group_code_idx is not None and group_code_idx < len(row):
                group_val = row[group_code_idx]
                if isinstance(group_val, str) and " - " in group_val:
                    first_line = group_val.split('\n')[0].strip()
                    if " - " in first_line:
                        spec, univ = first_line.split(" - ")
                        spec = spec.strip()
                        univ = univ.strip()
                        if univ == "421":  # KBTU
                            specialization_counts[spec] = specialization_counts.get(spec, 0) + 1

    print("Category '+' counts:")
    for cat in sorted(ab_counts):
        print(f"{cat}: {ab_counts[cat]}")
    print("\nKBTU (421) specialization first-choice counts:")
    for spec, count in specialization_counts.items():
        print(f"{spec}: {count}")

# Usage:
# blocks = parse_nct_blocks('yourfile.xlsx')
# generate_custom_report(blocks)

# Usage
data = "data.xlsx"
blocks = parse_nct_blocks_correct_header(data)
generate_custom_report(blocks)
# for block in blocks:
#     print("Block at row:", block['nct_row'])
#     print("Categories:", block['categories'])
#     if block['data']:
#         print("First 2-3 data rows:")
#         for row in block['data'][:3]:
#             print(row)
#     else:
#         print("No data")
#     print("---")
