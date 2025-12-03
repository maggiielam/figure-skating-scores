import pdfplumber
import re
import argparse
from models import Competition, SkaterPerformance, Element, Component
from data_manager import init_csvs, get_next_id, save_records, load_data
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

def scrape_pdf(pdf_path, competition_name, comp_year, program_type, category, location=None, date=None):
    print(f"📄 Processing {pdf_path}...")
    init_csvs()

    # 1. Check if competition exists, else create
    comps = load_data("competitions")
    existing_comp = next((c for c in comps if c['name'] == competition_name), None)
    
    if existing_comp:
        comp_id = existing_comp['id']
    else:
        comp_id = get_next_id("competitions")
        new_comp = Competition(
            id=comp_id, name=competition_name, year=comp_year, location=location, date=date
        )
        save_records("competitions", [new_comp])

    # Buffers for batch saving
    perf_buffer = []
    elem_buffer = []
    comp_buffer = []

    try:
        with pdfplumber.open(pdf_path) as pdf:
            full_text = ""
            for page in pdf.pages:
                full_text += page.extract_text(layout=True) + "\n"
    except Exception as e:
        print(f"❌ Error opening PDF: {e}")
        return

    lines = full_text.split('\n')
    current_perf_id = None
    
    # IDs need to be managed manually since we aren't using a DB with autoincrement
    next_perf_id = get_next_id("performances")
    next_elem_id = get_next_id("elements")
    next_comp_id = get_next_id("components")

    state = "FIND_SKATER"
    comp_index_counter = 1

    for line in lines:
        line = line.strip()
        if not line: continue

        skater_match = SKATER_LINE_REGEX.search(line)
        if skater_match and "Rank Name" not in line:
            current_perf_id = next_perf_id
            next_perf_id += 1
            
            name = skater_match.group(2).strip()
            print(f"   Found Skater: {name}")
            
            p = SkaterPerformance(
                id=current_perf_id,
                competition_id=comp_id,
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
            perf_buffer.append(p)
            state = "READ_ELEMENTS"
            comp_index_counter = 1
            continue

        if state == "READ_ELEMENTS" and current_perf_id:
            if "Program Components" in line:
                state = "READ_COMPONENTS"
                continue
            
            elem_match = ELEMENT_REGEX.search(line)
            if elem_match:
                el = Element(
                    id=next_elem_id,
                    performance_id=current_perf_id,
                    element_index=int(elem_match.group(1)),
                    element_name=clean_element_name(elem_match.group(2).strip()),
                    base_value=float(re.sub(r'[xX\s]', '', elem_match.group(3))),
                    goe=float(elem_match.group(4)),
                    judges_scores=parse_judges_scores(elem_match.group(5)),
                    panel_score=float(elem_match.group(6)),
                    is_bonus='x' in elem_match.group(3).lower()
                )
                elem_buffer.append(el)
                next_elem_id += 1

        if state == "READ_COMPONENTS" and current_perf_id:
            if "Judges Total Program Component" in line or "Deductions" in line:
                state = "FIND_SKATER"
                continue
            comp_match = COMPONENT_REGEX.search(line)
            if comp_match:
                c = Component(
                    id=next_comp_id,
                    performance_id=current_perf_id,
                    component_index=comp_index_counter,
                    component_name=comp_match.group(1),
                    factor=float(comp_match.group(2)),
                    judges_scores=parse_judges_scores(comp_match.group(3)),
                    panel_score=float(comp_match.group(4))
                )
                comp_buffer.append(c)
                next_comp_id += 1
                comp_index_counter += 1

    # Save all to CSVs
    save_records("performances", perf_buffer)
    save_records("elements", elem_buffer)
    save_records("components", comp_buffer)
    
    print(f"✅ Import Complete! Added {len(perf_buffer)} skaters.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Scrape Figure Skating PDF Protocol.')
    parser.add_argument('--pdf', required=True)
    parser.add_argument('--szn', required=True)
    parser.add_argument('--name', required=True)
    parser.add_argument('--program', required=True)
    parser.add_argument('--gender', required=True)
    parser.add_argument('--location', required=False)
    parser.add_argument('--date', required=False)

    args = parser.parse_args()
    cat_map = {'m': 'Men', 'w': 'Women'}
    category = cat_map[args.gender]

    scrape_pdf(args.pdf, args.name, args.szn, args.program, category, args.location, args.date)