from scraper import scrape_pdf, init_db

# ---------------------------------------------------------
# HAND LABEL YOUR FILES HERE
# Format: (pdf_path, competition_name, season, program_type, category, location, date)
# ---------------------------------------------------------
TASKS = [
    (
        "/Users/maggie/Downloads/m_free.pdf", 
        "GP de France", 
        "2025-2026", 
        "Free", 
        "Men", 
        "Angers, FRA",
        "Oct 17-19"
    ),
    (
        "/Users/maggie/Downloads/m_short.pdf", 
        "GP de France", 
        "2025-2026", 
        "Short", 
        "Men", 
        "Angers, FRA",
        "Oct 17-19"
    ),
    (
        "/Users/maggie/Downloads/w_free.pdf", 
        "GP de France", 
        "2025-2026", 
        "Free", 
        "Women", 
        "Angers, FRA",
        "Oct 17-19"
    ),
    (
        "/Users/maggie/Downloads/w_short.pdf", 
        "GP de France", 
        "2025-2026", 
        "Short", 
        "Women", 
        "Angers, FRA",
        "Oct 17-19"
    )
]

def main():
    print("Starting Batch Import...")
    
    # Initialize Database once
    init_db()
    
    for i, task in enumerate(TASKS):
        # Unpack all 7 arguments
        path, name, szn, prog, cat, loc, date = task
        
        print(f"\n[{i+1}/{len(TASKS)}] Importing: {cat} {prog}...")
        try:
            # Call scrape_pdf with all arguments
            scrape_pdf(
                pdf_path=path, 
                competition_name=name, 
                comp_year=szn, 
                program_type=prog, 
                category=cat, 
                location=loc, 
                date=date
            )
        except Exception as e:
            print(f"❌ Error processing {path}: {e}")

    print("\n🏁 Batch Job Complete!")

if __name__ == "__main__":
    main()