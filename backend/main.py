from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from data_manager import load_data, FILES
import os

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Cache data in memory on startup so it's super fast
# In production, if you update CSVs, the server usually restarts, refreshing this cache
class DataCache:
    competitions = []
    performances = []
    elements = []
    components = []

@app.on_event("startup")
def load_csv_data():
    if os.path.exists(FILES["competitions"]):
        DataCache.competitions = pd.read_csv(FILES["competitions"]).to_dict('records')
    if os.path.exists(FILES["performances"]):
        DataCache.performances = pd.read_csv(FILES["performances"]).to_dict('records')
    if os.path.exists(FILES["elements"]):
        DataCache.elements = pd.read_csv(FILES["elements"]).to_dict('records')
    if os.path.exists(FILES["components"]):
        DataCache.components = pd.read_csv(FILES["components"]).to_dict('records')
    print("✅ CSV Data Loaded into Memory")

@app.get("/competitions")
def get_competitions():
    return DataCache.competitions

@app.get("/competition/{competition_id}/summary")
def get_competition_summary(competition_id: int, category: str = None):
    # Filter performances using list comprehension (fast for small/medium datasets)
    perfs = [p for p in DataCache.performances if p['competition_id'] == competition_id]
    
    if category:
        perfs = [p for p in perfs if p['category'] == category]
    
    # Grouping Logic
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
        
        if "Short" in p['program_type']:
            skaters[name]["sp"] = {"score": p['total_score'], "rank": int(p['rank'])}
        elif "Free" in p['program_type']:
            skaters[name]["fs"] = {"score": p['total_score'], "rank": int(p['rank'])}

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
    # 1. Filter Performances
    perfs = [p for p in DataCache.performances if p['competition_id'] == competition_id]
    if category:
        perfs = [p for p in perfs if p['category'] == category]
        
    perf_ids = [p['id'] for p in perfs]

    # 2. Filter Elements & Components (Optimized with Sets)
    relevant_elements = [e for e in DataCache.elements if e['performance_id'] in perf_ids]
    relevant_components = [c for c in DataCache.components if c['performance_id'] in perf_ids]

    data = []
    for p in perfs:
        # Join data manually
        my_elements = [e for e in relevant_elements if e['performance_id'] == p['id']]
        my_components = [c for c in relevant_components if c['performance_id'] == p['id']]
        
        # Sort
        my_elements.sort(key=lambda x: x['element_index'])
        my_components.sort(key=lambda x: x['component_index'])

        p_dict = p.copy()
        p_dict["elements"] = my_elements
        p_dict["components"] = my_components
        data.append(p_dict)
        
    return data