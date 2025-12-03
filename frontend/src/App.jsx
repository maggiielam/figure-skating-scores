import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ScoreTable from './components/ScoreTable';
import ScoreAnalytics from './components/ScoreAnalytics';
import LandingPage from './components/LandingPage';
import { Analytics } from "@vercel/analytics/react"
import './App.css';
import './LandingPage.css';

function App() {
  const [view, setView] = useState('landing'); 
  const [selectedCompId, setSelectedCompId] = useState(null);
  const [programFilter, setProgramFilter] = useState(null); 
  const [categoryFilter, setCategoryFilter] = useState(null);
  
  // New state to store competition metadata for the title
  const [compMeta, setCompMeta] = useState({ name: '', year: '' });
  
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(false);

  // Updated signature to accept compName and compYear
  const handleNavigation = (compId, targetView, programType, category, compName, compYear) => {
    setLoading(true);
    setSelectedCompId(compId);
    setView(targetView);
    setProgramFilter(programType);
    setCategoryFilter(category);
    setCompMeta({ name: compName, year: compYear });

    // PASS CATEGORY to filter detailed protocols
    axios.get(`https://figure-skating-scores.onrender.com/performances/${compId}`, {
        params: { category: category }
    })
      .then(res => {
        setPerformances(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching data", err);
        setLoading(false);
      });
  };

  const goHome = () => {
    setView('landing');
    setSelectedCompId(null);
    setPerformances([]);
    setProgramFilter(null);
    setCategoryFilter(null);
    setCompMeta({ name: '', year: '' });
  };

  const filteredPerformances = performances.filter(p => {
      if (!programFilter) return true;
      return p.program_type === programFilter;
  });

  // Helper to format the title dynamically
  // e.g. "GP Skate America Men's Free Skate (25-26)"
  const getPageTitle = () => {
    if (!categoryFilter || !programFilter) return 'Competition View';

    const categoryDisplay = categoryFilter === 'Men' ? "Men's" : categoryFilter === 'Women' ? "Women's" : categoryFilter;
    const programDisplay = programFilter === 'Short' ? "Short Program" : programFilter === 'Free' ? "Free Skate" : programFilter;

    return `${compMeta.name} ${categoryDisplay} ${programDisplay} (${compMeta.year})`;
  };

  return (
    <div>
      {view === 'landing' && (
        <LandingPage onNavigate={handleNavigation} />
      )}

      {(view === 'scores' || view === 'analytics') && (
        <div className="container">
          <header style={{display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '30px'}}>
            <button 
              onClick={goHome}
              style={{border:'none', background:'transparent', fontSize:'1.2rem', cursor:'pointer', fontFamily:'PT Serif'}}
            >
              ← Back to Seasons
            </button>
            
            <div style={{flex: 1, textAlign:'center'}}>
               <h2 style={{margin:0, fontFamily:'PT Serif'}}>
                 {getPageTitle()}
               </h2>
            </div>

            <div className="controls">
              <button 
                className={view === 'scores' ? 'active' : ''} 
                onClick={() => setView('scores')}
              >
                Protocols
              </button>
              <button 
                className={view === 'analytics' ? 'active' : ''} 
                onClick={() => setView('analytics')}
              >
                Analytics
              </button>
            </div>
          </header>

          {loading ? (
             <div style={{textAlign:'center', padding:'50px'}}>Loading Scores...</div>
          ) : (
             <>
               {view === 'scores' && <ScoreTable performances={filteredPerformances} />}
               {view === 'analytics' && <ScoreAnalytics performances={filteredPerformances} />}
             </>
          )}
        </div>
      )}
      <Analytics />
    </div>
  );
}

export default App;