from scraper import scrape_pdf

# ---------------------------------------------------------
# HAND LABEL YOUR FILES HERE
# Format: (pdf_path, competition_name, season, program_type, category, location, date)
# ---------------------------------------------------------
TASKS = [
    # (
    #     "/Users/maggie/Downloads/chn_m_free.pdf", 
    #     "GP Cup of China", 
    #     "2025-2026", 
    #     "Free", 
    #     "Men", 
    #     "Chongqing, CHN",
    #     "Oct 24-26"
    # ),
    # (
    #     "/Users/maggie/Downloads/chn_m_short.pdf", 
    #     "GP Cup of China", 
    #     "2025-2026", 
    #     "Short", 
    #     "Men", 
    #     "Chongqing, CHN",
    #     "Oct 24-26"
    # ),
    # (
    #     "/Users/maggie/Downloads/chn_w_free.pdf", 
    #     "GP Cup of China", 
    #     "2025-2026", 
    #     "Free", 
    #     "Women", 
    #     "Chongqing, CHN",
    #     "Oct 24-26"
    # ),
    # (
    #     "/Users/maggie/Downloads/chn_w_short.pdf", 
    #     "GP Cup of China", 
    #     "2025-2026", 
    #     "Short", 
    #     "Women", 
    #     "Chongqing, CHN",
    #     "Oct 24-26"
    # ),
    #     (
    #     "/Users/maggie/Downloads/can_m_free.pdf", 
    #     "GP Skate Canada", 
    #     "2025-2026", 
    #     "Free", 
    #     "Men", 
    #     "Saskatoon, CAN",
    #     "Oct 31-Nov 2"
    # ),
    # (
    #     "/Users/maggie/Downloads/can_m_short.pdf", 
    #     "GP Skate Canada", 
    #     "2025-2026", 
    #     "Short", 
    #     "Men", 
    #     "Saskatoon, CAN",
    #     "Oct 31-Nov 2"
    # ),
    # (
    #     "/Users/maggie/Downloads/can_w_free.pdf", 
    #     "GP Skate Canada", 
    #     "2025-2026", 
    #     "Free", 
    #     "Women", 
    #     "Saskatoon, CAN",
    #     "Oct 31-Nov 2"
    # ),
    # (
    #     "/Users/maggie/Downloads/can_w_short.pdf", 
    #     "GP Skate Canada", 
    #     "2025-2026", 
    #     "Short", 
    #     "Women", 
    #     "Saskatoon, CAN",
    #     "Oct 31-Nov 2"
    # ),
            (
        "/Users/maggie/Downloads/fin_m_free.pdf", 
        "GP Finlandia Trophy", 
        "2025-2026", 
        "Free", 
        "Men", 
        "Helsinki, FIN",
        "Nov 21-22"
    ),
    (
        "/Users/maggie/Downloads/fin_m_short.pdf", 
        "GP Finlandia Trophy", 
        "2025-2026", 
        "Short", 
        "Men", 
        "Helsinki, FIN",
        "Nov 21-22"
    ),
    (
        "/Users/maggie/Downloads/fin_w_free.pdf", 
        "GP Finlandia Trophy", 
        "2025-2026", 
        "Free", 
        "Women", 
        "Helsinki, FIN",
        "Nov 21-22"
    ),
    (
        "/Users/maggie/Downloads/fin_w_short.pdf", 
        "GP Finlandia Trophy", 
        "2025-2026", 
        "Short", 
        "Women", 
        "Helsinki, FIN",
        "Nov 21-22"
    ),

]

def main():
    print("Starting Batch Import...")
    
    # # Initialize Database once
    # init_db()
    
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