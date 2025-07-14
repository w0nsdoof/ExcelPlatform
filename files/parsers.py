import pandas as pd

def parse_xlsx(file_path):
    df = pd.read_excel(file_path)
    return df.to_dict(orient='records') 