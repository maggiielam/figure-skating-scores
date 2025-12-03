from pydantic import BaseModel
from typing import List, Optional

# These models define the structure of our data
# We will use them to ensure our CSV data is valid when reading/writing

class Competition(BaseModel):
    id: int
    name: str
    year: str
    location: Optional[str] = None
    date: Optional[str] = None

class SkaterPerformance(BaseModel):
    id: int
    competition_id: int
    skater_name: str
    nation: str
    rank: int
    program_type: str # "Short" or "Free"
    category: str     # "Men" or "Women"
    total_score: float
    tes_score: float
    pcs_score: float
    deductions: float

class Element(BaseModel):
    id: int
    performance_id: int
    element_index: int
    element_name: str
    base_value: float
    goe: float
    panel_score: float
    judges_scores: str # Stored as "1,2,3,-1..." string in CSV
    is_bonus: bool

class Component(BaseModel):
    id: int
    performance_id: int
    component_index: int
    component_name: str
    factor: float
    panel_score: float
    judges_scores: str