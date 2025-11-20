from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload
from database import SessionLocal, SkaterPerformance, Competition

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/competitions")
def get_competitions(db: Session = Depends(get_db)):
    return db.query(Competition).all()

# --- SUMMARY (PODIUM) ENDPOINT ---
@app.get("/competition/{competition_id}/summary")
def get_competition_summary(competition_id: int, category: str = None, db: Session = Depends(get_db)):
    query = db.query(SkaterPerformance).filter(SkaterPerformance.competition_id == competition_id)
    
    # 1. Filter by Category (Men vs Women)
    if category:
        query = query.filter(SkaterPerformance.category == category)
    
    results = query.all()
    
    # 2. Group SP + FS
    skaters = {}
    for p in results:
        if p.skater_name not in skaters:
            skaters[p.skater_name] = {
                "name": p.skater_name,
                "nation": p.nation,
                "sp": {"score": 0, "rank": "-"},
                "fs": {"score": 0, "rank": "-"},
                "total": 0
            }
        
        if "Short" in p.program_type:
            skaters[p.skater_name]["sp"] = {"score": p.total_score, "rank": p.rank}
        elif "Free" in p.program_type:
            skaters[p.skater_name]["fs"] = {"score": p.total_score, "rank": p.rank}

    # 3. Sum and Sort
    summary_list = []
    for name, data in skaters.items():
        total_score = 0
        if data["sp"]["score"]: total_score += data["sp"]["score"]
        if data["fs"]["score"]: total_score += data["fs"]["score"]
        
        data["total"] = total_score
        if total_score > 0:
            summary_list.append(data)

    summary_list.sort(key=lambda x: x["total"], reverse=True)
    return summary_list[:3]

# --- PROTOCOLS ENDPOINT ---
@app.get("/performances/{competition_id}")
def get_performances(competition_id: int, category: str = None, db: Session = Depends(get_db)):
    query = db.query(SkaterPerformance)\
        .options(joinedload(SkaterPerformance.elements))\
        .options(joinedload(SkaterPerformance.components))\
        .filter(SkaterPerformance.competition_id == competition_id)

    # Filter here too so you don't load Women when looking at Men
    if category:
        query = query.filter(SkaterPerformance.category == category)

    results = query.all()
    
    data = []
    for p in results:
        p_dict = {
            "id": p.id,
            "skater_name": p.skater_name,
            "nation": p.nation,
            "rank": p.rank,
            "program_type": p.program_type,
            "total_score": p.total_score,
            "tes_score": p.tes_score,
            "pcs_score": p.pcs_score,
            "deductions": p.deductions,
            "elements": [],
            "components": []
        }
        
        for e in p.elements:
            p_dict["elements"].append({
                "element_index": e.element_index,
                "element_name": e.element_name,
                "base_value": e.base_value,
                "goe": e.goe,
                "panel_score": e.panel_score,
                "judges_scores": e.judges_scores,
                "is_bonus": e.is_bonus
            })
        p_dict["elements"].sort(key=lambda x: x["element_index"])

        for c in p.components:
            p_dict["components"].append({
                "component_index": c.component_index,
                "component_name": c.component_name,
                "factor": c.factor,
                "panel_score": c.panel_score,
                "judges_scores": c.judges_scores
            })
        p_dict["components"].sort(key=lambda x: x["component_index"])
            
        data.append(p_dict)
    return data