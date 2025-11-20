from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

DATABASE_URL = "sqlite:///./skating_scores.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Competition(Base):
    __tablename__ = "competitions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    year = Column(String)
    location = Column(String) # <--- RESTORED
    date = Column(String)     # <--- RESTORED

class SkaterPerformance(Base):
    __tablename__ = "performances"
    id = Column(Integer, primary_key=True, index=True)
    competition_id = Column(Integer, ForeignKey("competitions.id"))
    skater_name = Column(String)
    nation = Column(String)
    rank = Column(Integer)
    program_type = Column(String) # "Short" or "Free"
    category = Column(String)     # "Men" or "Women"
    total_score = Column(Float)
    tes_score = Column(Float)
    pcs_score = Column(Float)
    deductions = Column(Float)
    
    elements = relationship("Element", back_populates="performance")
    components = relationship("Component", back_populates="performance")

class Element(Base):
    __tablename__ = "elements"
    id = Column(Integer, primary_key=True, index=True)
    performance_id = Column(Integer, ForeignKey("performances.id"))
    element_index = Column(Integer) 
    element_name = Column(String)
    base_value = Column(Float)
    goe = Column(Float)
    panel_score = Column(Float)
    judges_scores = Column(String)
    is_bonus = Column(Boolean, default=False)
    
    performance = relationship("SkaterPerformance", back_populates="elements")

class Component(Base):
    __tablename__ = "components"
    id = Column(Integer, primary_key=True, index=True)
    performance_id = Column(Integer, ForeignKey("performances.id"))
    component_index = Column(Integer)
    component_name = Column(String)
    factor = Column(Float)
    panel_score = Column(Float)
    judges_scores = Column(String)

    performance = relationship("SkaterPerformance", back_populates="components")

def init_db():
    Base.metadata.create_all(bind=engine)