import pdfplumber
import re
import sys
import argparse
from sqlalchemy.orm import Session
from database import SessionLocal, Competition, SkaterPerformance, Element, Component, init_db

SKATER_LINE_REGEX = re.compile(r"(\d+)\s+(.+?)\s+([A-Z]{3})\s+(\d+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([-]?[\d\.]+)")
ELEMENT_REGEX = re.compile(r"^\s*(\d+)\s+(.+?)\s+(\d+\.\d{2}(?:\s*[xX])?)\s+([-]?\d+\.\d{2})\s+(.+)\s+(\d+\.\d{2})\s*$")
COMPONENT_REGEX = re.compile(r"(Composition|Presentation|Skating Skills|Transitions|Performance)\s+(\d+\.\d{2})\s+(.*)\s+(\d+\.\d{2})")

def clean_element_name(raw_name):
    parts = raw_name.split()
    if len(parts) > 1:
        if any(char in parts[1] for char in ['!', '<', 'q', 'e', 'V']):
            return parts[0]
        if "SEQ" in parts[1]:
             return "".join(parts)
    return raw_name.replace(" ", "")

def parse_judges_scores(score_str):
    cleaned = re.sub(r"[^\d\s\.-]", "", score_str)
    return ",".join(cleaned.split())

# UPDATED SIGNATURE: Added location and date
def scrape_pdf(pdf_path, competition_name, comp_year, program_type, category, location=None, date=None):
    print(f"📄 Processing {pdf_path} as {category} {program_type}...")
    db: Session = SessionLocal()
    
    # Update Competition Record if location/date provided
    comp = db.query(Competition).filter_by(name=competition_name).first()
    if not comp:
        comp = Competition(name=competition_name, year=comp_year, location=location, date=date)
        db.add(comp)
        db.commit()
        db.refresh(comp)
    else:
        # Update existing if new info is passed
        if location: comp.location = location
        if date: comp.date = date
        db.commit()

    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                full_text += page.extract_text(layout=True) + "\n"
    except Exception as e:
        print(f"❌ Error opening PDF: {e}")
        return

    lines = full_text.split('\n')
    current_skater = None
    state = "FIND_SKATER"
    
    skater_count = 0
    element_count = 0
    comp_index_counter = 1

    for line in lines:
        line = line.strip()
        if not line: continue

        skater_match = SKATER_LINE_REGEX.search(line)
        if skater_match and "Rank Name" not in line:
            if current_skater:
                db.add(current_skater)
                db.commit()
            
            name = skater_match.group(2).strip()
            print(f"   Found Skater: {name}")
            
            current_skater = SkaterPerformance(
                competition_id=comp.id,
                rank=int(skater_match.group(1)),
                skater_name=name,
                nation=skater_match.group(3),
                program_type=program_type,
                category=category,
                total_score=float(skater_match.group(5)),
                tes_score=float(skater_match.group(6)),
                pcs_score=float(skater_match.group(7)),
                deductions=float(skater_match.group(8))
            )
            skater_count += 1
            state = "READ_ELEMENTS"
            comp_index_counter = 1
            continue

        if state == "READ_ELEMENTS" and current_skater:
            if "Program Components" in line:
                state = "READ_COMPONENTS"
                continue
            
            elem_match = ELEMENT_REGEX.search(line)
            if elem_match:
                el_index = int(elem_match.group(1))
                raw_name = elem_match.group(2).strip()
                clean_name = clean_element_name(raw_name)
                
                raw_bv_str = elem_match.group(3)
                is_bonus = 'x' in raw_bv_str.lower()
                clean_bv_str = re.sub(r'[xX\s]', '', raw_bv_str)
                
                element = Element(
                    element_index=el_index,
                    element_name=clean_name,
                    base_value=float(clean_bv_str),
                    goe=float(elem_match.group(4)),
                    judges_scores=parse_judges_scores(elem_match.group(5)),
                    panel_score=float(elem_match.group(6)),
                    is_bonus=is_bonus
                )
                current_skater.elements.append(element)
                element_count += 1

        if state == "READ_COMPONENTS" and current_skater:
            if "Judges Total Program Component" in line or "Deductions" in line:
                state = "FIND_SKATER"
                continue
            comp_match = COMPONENT_REGEX.search(line)
            if comp_match:
                component = Component(
                    component_index=comp_index_counter,
                    component_name=comp_match.group(1),
                    factor=float(comp_match.group(2)),
                    judges_scores=parse_judges_scores(comp_match.group(3)),
                    panel_score=float(comp_match.group(4))
                )
                current_skater.components.append(component)
                comp_index_counter += 1

    if current_skater:
        db.add(current_skater)
        db.commit()
    
    print(f"✅ Import Complete! Added {skater_count} skaters and {element_count} elements.")

if __name__ == "__main__":
    init_db()
    parser = argparse.ArgumentParser(description='Scrape Figure Skating PDF Protocol.')
    
    parser.add_argument('--pdf', required=True, help='Path to the PDF file')
    parser.add_argument('--szn', required=True, help='Season (e.g., "2025-2026")')
    parser.add_argument('--name', required=True, help='Competition Name')
    parser.add_argument('--program', required=True, choices=['Short', 'Free'], help='Program Type')
    parser.add_argument('--gender', required=True, choices=['m', 'w'], help='Gender (m=Men, w=Women)')
    
    # RESTORED ARGS
    parser.add_argument('--location', required=False, help='City, Country (e.g., "Lake Placid, NY")')
    parser.add_argument('--date', required=False, help='Date Range (e.g., "Nov 14-16")')

    args = parser.parse_args()
    
    cat_map = {'m': 'Men', 'w': 'Women'}
    category = cat_map[args.gender]

    scrape_pdf(args.pdf, args.name, args.szn, args.program, category, args.location, args.date)

"""
[Image of command line interface example]

### How to Run It

Now, instead of `python3 -c ...`, you can run clean, readable commands directly in your terminal.

**Example 1: Women's Short Program**
```bash
python3 scraper.py --pdf "/path/to/Short_Program.pdf" --szn "2025-2026" --name "Skate America" --program "Short" --gender "w"
```

**Example 2: Women's Free Skate**
```bash
python3 scraper.py --pdf "/path/to/Free_Skate.pdf" --szn "2025-2026" --name "Skate America" --program "Free" --gender "w"
"""