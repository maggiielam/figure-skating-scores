import React, { useState, useEffect } from 'react';
import axios from 'axios';
// FIXED: Ensure CSS import path is correct and file exists in the same directory
import '../LandingPage.css';

// --- CONFIGURATION ---
// FIXED: Robust API_BASE_URL resolution that works in Vite (import.meta), 
// Create React App (process.env), and this preview environment.
let API_BASE_URL = 'http://localhost:8000';

try {
  // 1. Try Vite's import.meta (safely checked)
  const isVite = typeof import.meta !== 'undefined' && import.meta.env;
  
  if (isVite && import.meta.env.VITE_API_URL) {
    API_BASE_URL = import.meta.env.VITE_API_URL;
  } 
  // 2. Try Standard process.env (Create React App / Node)
  else if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL) {
    API_BASE_URL = process.env.REACT_APP_API_URL;
  }
} catch (e) {
  // If accessing these objects throws an error (e.g. strict mode or specific bundlers),
  // we silently fall back to the default localhost.
  console.log("Using default API URL:", API_BASE_URL);
}

// Remove trailing slash if present to avoid double slashes like '...com//competitions'
if (API_BASE_URL.endsWith('/')) {
    API_BASE_URL = API_BASE_URL.slice(0, -1);
}

const PodiumTable = ({ compId, discipline }) => {
  const [skaters, setSkaters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // UPDATED: Using API_BASE_URL
    axios.get(`${API_BASE_URL}/competition/${compId}/summary`, {
        params: { category: discipline }
    })
      .then(res => {
        setSkaters(res.data); 
        setLoading(false);
      })
      .catch(err => {
        console.error("Error loading summary:", err);
        setLoading(false);
      });
  }, [compId, discipline]);

  if (loading) return <div className="loading-text">Loading...</div>;
  if (skaters.length === 0) return <div className="no-data">Pending</div>;
  
  return (
    <table className="mini-podium">
      <thead>
        <tr>
          <th>Rank</th>
          <th style={{textAlign:'left'}}>Name</th>
          <th>SP</th>
          <th>FS</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        {skaters.slice(0, 3).map((s, idx) => (
          <tr key={s.name}>
            <td className={`rank rank-${idx + 1}`}>{idx + 1}</td>
            <td className="name">
              {s.name} <span className="nat">{s.nation}</span>
            </td>
            <td className="sub-score">
              {s.sp.score.toFixed(2)}<span className="sub-rank">({s.sp.rank})</span>
            </td>
            <td className="sub-score">
              {s.fs.score.toFixed(2)}<span className="sub-rank">({s.fs.rank})</span>
            </td>
            <td className="score">{s.total.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default function LandingPage({ onNavigate }) {
  const [seasons, setSeasons] = useState([]);
  const [expandedSeason, setExpandedSeason] = useState(null);
  const [openCompIds, setOpenCompIds] = useState([]);

  useEffect(() => {
    // UPDATED: Using API_BASE_URL
    console.log("Fetching competitions from:", `${API_BASE_URL}/competitions`);
    
    axios.get(`${API_BASE_URL}/competitions`)
      .then(res => {
        console.log("Competitions loaded:", res.data);
        const grouped = groupCompetitionsByYear(res.data);
        setSeasons(grouped);
        if(grouped.length > 0) {
            setExpandedSeason(grouped[0].year);
            // Open the first competition (which will now be the newest one)
            if(grouped[0].competitions.length > 0) {
                setOpenCompIds([grouped[0].competitions[0].id]);
            }
        }
      })
      .catch(err => console.error("Failed to load competitions", err));
  }, []);

  // Helper to parse date strings (e.g. "Nov 21-22" or ISO "2025-11-21")
  // Returns a number for sorting Descending (Newest First)
  const parseCompDate = (comp) => {
    // 1. If DB has ISO start_date, use it directly
    if (comp.start_date) return new Date(comp.start_date).getTime();

    // 2. Fallback: Parse text string "Nov 21-22"
    if (!comp.date) return 0;
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const parts = comp.date.split(' '); // ["Nov", "21-22"]
    
    if (parts.length < 2) return 0;

    const monthIdx = months.indexOf(parts[0]);
    if (monthIdx === -1) return 0;

    const day = parseInt(parts[1], 10) || 0;

    // SEASON LOGIC: 
    // In figure skating (e.g., 2025-26 season):
    // Aug-Dec (Months 7-11) are Year X (2025)
    // Jan-Jun (Months 0-5) are Year X+1 (2026)
    // We want Newest first, so Year X+1 > Year X.
    const yearBonus = monthIdx < 6 ? 1 : 0; 

    // Score = (YearBonus * 10000) + (Month * 100) + Day
    return (yearBonus * 10000) + (monthIdx * 100) + day;
  };

  const groupCompetitionsByYear = (comps) => {
    const groups = {};
    comps.forEach(comp => {
      if (!groups[comp.year]) {
        groups[comp.year] = { year: comp.year, competitions: [] };
      }
      groups[comp.year].competitions.push(comp);
    });

    // 1. Sort Seasons (Years) Descending
    const sortedSeasons = Object.values(groups).sort((a, b) => b.year.localeCompare(a.year));

    // 2. Sort Competitions within Season Descending (Newest Date First)
    sortedSeasons.forEach(season => {
        season.competitions.sort((a, b) => {
            return parseCompDate(b) - parseCompDate(a);
        });
    });

    return sortedSeasons;
  };

  const toggleComp = (id) => {
    if (openCompIds.includes(id)) {
      setOpenCompIds(openCompIds.filter(openId => openId !== id));
    } else {
      setOpenCompIds([...openCompIds, id]);
    }
  };

  return (
    <div className="landing-container">
      <div className="landing-header">
        <h1>Figure Skating Scores</h1>
      </div>

      {seasons.length === 0 && (
        <div style={{textAlign:'center', color:'#64748b'}}>
            <p>No data found.</p>
            <p style={{fontSize:'0.8em'}}>Attempting to fetch from: {API_BASE_URL}</p>
        </div>
      )}

      {seasons.map((season) => (
        <div key={season.year} className="season-block">
          <button 
            className={`season-toggle ${expandedSeason === season.year ? 'active' : ''}`}
            onClick={() => setExpandedSeason(expandedSeason === season.year ? null : season.year)}
          >
            <span>{season.year} Season</span>
            <span>{expandedSeason === season.year ? '▼' : '▶'}</span>
          </button>

          {expandedSeason === season.year && (
            <div className="competition-grid">
              {season.competitions.map(comp => {
                const isOpen = openCompIds.includes(comp.id);

                return (
                  <div key={comp.id} className={`comp-card ${isOpen ? 'open' : ''}`}>
                    <div className="comp-header" onClick={() => toggleComp(comp.id)}>
                      <div>
                        <h2>{comp.name}</h2>
                        {/* Display Location and Date if available */}
                        {(comp.location || comp.date) && (
                            <div className="comp-meta">
                                {comp.location} {comp.location && comp.date && '•'} {comp.date}
                            </div>
                        )}
                      </div>
                      <span className="toggle-icon">▼</span>
                    </div>

                    {isOpen && (
                      <div className="comp-body">
                        
                        {/* MEN */}
                        <div className="discipline-wrapper">
                          <div className="discipline-section">
                            <h3>Men</h3>
                            <PodiumTable compId={comp.id} discipline="Men" />
                            <div className="button-grid">
                              <div className="btn-group">
                                <button onClick={() => onNavigate(comp.id, 'scores', 'Short', 'Men', comp.name, comp.year)}>Short Protocols</button>
                                <button className="btn-outline" onClick={() => onNavigate(comp.id, 'analytics', 'Short', 'Men', comp.name, comp.year)}>Analysis</button>
                              </div>
                              <div className="btn-group">
                                <button onClick={() => onNavigate(comp.id, 'scores', 'Free', 'Men', comp.name, comp.year)}>Free Protocols</button>
                                <button className="btn-outline" onClick={() => onNavigate(comp.id, 'analytics', 'Free', 'Men', comp.name, comp.year)}>Analysis</button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* WOMEN */}
                        <div className="discipline-wrapper">
                          <div className="discipline-section">
                            <h3>Women</h3>
                            <PodiumTable compId={comp.id} discipline="Women" />
                            <div className="button-grid">
                              <div className="btn-group">
                                <button onClick={() => onNavigate(comp.id, 'scores', 'Short', 'Women', comp.name, comp.year)}>Short Protocols</button>
                                <button className="btn-outline" onClick={() => onNavigate(comp.id, 'analytics', 'Short', 'Women', comp.name, comp.year)}>Analysis</button>
                              </div>
                              <div className="btn-group">
                                <button onClick={() => onNavigate(comp.id, 'scores', 'Free', 'Women', comp.name, comp.year)}>Free Protocols</button>
                                <button className="btn-outline" onClick={() => onNavigate(comp.id, 'analytics', 'Free', 'Women', comp.name, comp.year)}>Analysis</button>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}