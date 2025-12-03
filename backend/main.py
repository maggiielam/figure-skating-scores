from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from data_manager import load_data, FILES
import os

app = FastAPI()

# --- CORS CONFIGURATION ---
# This tells the backend to trust requests from your Vercel frontend
origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "*"  # Allow all for now to ensure connection works
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache data in memory on startup
class DataCache:
    competitions = []
    performances = []
    elements = []
    components = []

@app.on_event("startup")
def load_csv_data():
    # Load CSVs when server starts
    if os.path.exists(FILES["competitions"]):
        DataCache.competitions = pd.read_csv(FILES["competitions"]).fillna('').to_dict('records')
    if os.path.exists(FILES["performances"]):
        DataCache.performances = pd.read_csv(FILES["performances"]).fillna('').to_dict('records')
    if os.path.exists(FILES["elements"]):
        DataCache.elements = pd.read_csv(FILES["elements"]).fillna('').to_dict('records')
    if os.path.exists(FILES["components"]):
        DataCache.components = pd.read_csv(FILES["components"]).fillna('').to_dict('records')
    print("✅ CSV Data Loaded into Memory")

# --- NEW: Homepage Route ---
@app.get("/")
def read_root():
    return {"status": "online", "message": "The Skating Scores API is running!"}

@app.get("/competitions")
def get_competitions():
    return DataCache.competitions

@app.get("/competition/{competition_id}/summary")
def get_competition_summary(competition_id: int, category: str = None):
    perfs = [p for p in DataCache.performances if p['competition_id'] == competition_id]
    
    if category:
        perfs = [p for p in perfs if p['category'] == category]
    
    skaters = {}
    for p in perfs:
        name = p['skater_name']
        if name not in skaters:
            skaters[name] = {
                "name": name,
                "nation": p['nation'],
                "sp": {"score": 0, "rank": "-"},
                "fs": {"score": 0, "rank": "-"},
                "total": 0
            }
        
        # Robust check for program type
        p_type = str(p['program_type'])
        if "Short" in p_type:
            skaters[name]["sp"] = {"score": p['total_score'], "rank": p['rank']}
        elif "Free" in p_type:
            skaters[name]["fs"] = {"score": p['total_score'], "rank": p['rank']}

    summary_list = []
    for data in skaters.values():
        total = 0
        if data["sp"]["score"]: total += data["sp"]["score"]
        if data["fs"]["score"]: total += data["fs"]["score"]
        data["total"] = total
        if total > 0:
            summary_list.append(data)

    summary_list.sort(key=lambda x: x["total"], reverse=True)
    return summary_list[:3]

@app.get("/performances/{competition_id}")
def get_performances(competition_id: int, category: str = None):
    perfs = [p for p in DataCache.performances if p['competition_id'] == competition_id]
    if category:
        perfs = [p for p in perfs if p['category'] == category]
        
    perf_ids = [p['id'] for p in perfs]

    relevant_elements = [e for e in DataCache.elements if e['performance_id'] in perf_ids]
    relevant_components = [c for c in DataCache.components if c['performance_id'] in perf_ids]

    data = []
    for p in perfs:
        my_elements = [e for e in relevant_elements if e['performance_id'] == p['id']]
        my_components = [c for c in relevant_components if c['performance_id'] == p['id']]
        
        my_elements.sort(key=lambda x: x['element_index'])
        my_components.sort(key=lambda x: x['component_index'])

        p_dict = p.copy()
        p_dict["elements"] = my_elements
        p_dict["components"] = my_components
        data.append(p_dict)
        
    return data