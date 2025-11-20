import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../LandingPage.css';

// ... (Keep PodiumTable component exactly the same) ...
const PodiumTable = ({ compId, discipline }) => {
  const [skaters, setSkaters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`http://localhost:8000/competition/${compId}/summary`, {
        params: { category: discipline }
    })
      .then(res => {
        setSkaters(res.data); 
        setLoading(false);
      })
      .catch(err => {
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
    axios.get('http://localhost:8000/competitions')
      .then(res => {
        const grouped = groupCompetitionsByYear(res.data);
        setSeasons(grouped);
        if(grouped.length > 0) {
            setExpandedSeason(grouped[0].year);
            if(grouped[0].competitions.length > 0) {
                setOpenCompIds([grouped[0].competitions[0].id]);
            }
        }
      })
      .catch(err => console.error("Failed to load competitions", err));
  }, []);

  const groupCompetitionsByYear = (comps) => {
    const groups = {};
    comps.forEach(comp => {
      if (!groups[comp.year]) {
        groups[comp.year] = { year: comp.year, competitions: [] };
      }
      groups[comp.year].competitions.push(comp);
    });
    return Object.values(groups).sort((a, b) => b.year.localeCompare(a.year));
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
        <div style={{textAlign:'center', color:'#64748b'}}>No data found.</div>
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
                                <button onClick={() => onNavigate(comp.id, 'scores', 'Short', 'Men')}>Short Protocols</button>
                                <button className="btn-outline" onClick={() => onNavigate(comp.id, 'analytics', 'Short', 'Men')}>Analysis</button>
                              </div>
                              <div className="btn-group">
                                <button onClick={() => onNavigate(comp.id, 'scores', 'Free', 'Men')}>Free Protocols</button>
                                <button className="btn-outline" onClick={() => onNavigate(comp.id, 'analytics', 'Free', 'Men')}>Analysis</button>
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
                                <button onClick={() => onNavigate(comp.id, 'scores', 'Short', 'Women')}>Short Protocols</button>
                                <button className="btn-outline" onClick={() => onNavigate(comp.id, 'analytics', 'Short', 'Women')}>Analysis</button>
                              </div>
                              <div className="btn-group">
                                <button onClick={() => onNavigate(comp.id, 'scores', 'Free', 'Women')}>Free Protocols</button>
                                <button className="btn-outline" onClick={() => onNavigate(comp.id, 'analytics', 'Free', 'Women')}>Analysis</button>
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