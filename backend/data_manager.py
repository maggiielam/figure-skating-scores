import pandas as pd
import os
from models import Competition, SkaterPerformance, Element, Component

DATA_DIR = "data"
os.makedirs(DATA_DIR, exist_ok=True)

FILES = {
    "competitions": f"{DATA_DIR}/competitions.csv",
    "performances": f"{DATA_DIR}/performances.csv",
    "elements": f"{DATA_DIR}/elements.csv",
    "components": f"{DATA_DIR}/components.csv"
}

def get_model_fields(model_class):
    """Compat helper for Pydantic v1 and v2"""
    if hasattr(model_class, 'model_fields'):
        return list(model_class.model_fields.keys())
    return list(model_class.__fields__.keys())

def init_csvs():
    """Create empty CSVs with headers if they don't exist"""
    for name, path in FILES.items():
        if not os.path.exists(path):
            if name == "competitions":
                cols = get_model_fields(Competition)
            elif name == "performances":
                cols = get_model_fields(SkaterPerformance)
            elif name == "elements":
                cols = get_model_fields(Element)
            elif name == "components":
                cols = get_model_fields(Component)
            
            df = pd.DataFrame(columns=cols)
            df.to_csv(path, index=False)

def get_next_id(file_key):
    """Robust auto-increment logic"""
    path = FILES[file_key]
    
    # If file doesn't exist, start at 1
    if not os.path.exists(path): 
        return 1
    
    # Read CSV, ensuring 'id' column is treated as numeric
    try:
        df = pd.read_csv(path)
        
        if df.empty: 
            return 1
            
        # Force conversion to numeric, turning errors into NaN
        max_id = pd.to_numeric(df['id'], errors='coerce').max()
        
        # If max_id is NaN (e.g. file has header but no data), start at 1
        if pd.isna(max_id):
            return 1
            
        return int(max_id) + 1
        
    except pd.errors.EmptyDataError:
        return 1
    except Exception as e:
        print(f"⚠️ Error calculating ID for {file_key}: {e}")
        # In a script, we might want to crash here, but for now we fallback
        return 1

def save_records(file_key, records: list):
    """Append a list of objects to the CSV"""
    if not records: return
    
    path = FILES[file_key]
    
    # Convert Pydantic models to dicts (Handle V1 and V2)
    data = []
    for r in records:
        if hasattr(r, 'model_dump'):
            data.append(r.model_dump()) # V2
        else:
            data.append(r.dict()) # V1

    new_df = pd.DataFrame(data)
    
    # Check if file exists and has content (header)
    file_exists = os.path.exists(path) and os.path.getsize(path) > 0
    
    new_df.to_csv(path, mode='a', header=not file_exists, index=False)

def load_data(file_key):
    """Load data from CSV into a list of dictionaries"""
    path = FILES[file_key]
    if not os.path.exists(path): return []
    try:
        # Use simple read_csv; fillna('') helps handle empty values gracefully in some contexts
        return pd.read_csv(path).fillna('').to_dict('records')
    except Exception as e:
        print(f"⚠️ Error loading {file_key}: {e}")
        return []