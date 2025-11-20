import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ScoreTable from './components/ScoreTable';
import Analytics from './components/Analytics';
import LandingPage from './components/LandingPage';
import './App.css';
import './LandingPage.css';

function App() {
  const [view, setView] = useState('landing'); 
  const [selectedCompId, setSelectedCompId] = useState(null);
  const [programFilter, setProgramFilter] = useState(null); 
  const [categoryFilter, setCategoryFilter] = useState(null);
  
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleNavigation = (compId, targetView, programType, category) => {
    setLoading(true);
    setSelectedCompId(compId);
    setView(targetView);
    setProgramFilter(programType);
    setCategoryFilter(category);

    // PASS CATEGORY to filter detailed protocols
    axios.get(`http://localhost:8000/performances/${compId}`, {
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
  };

  const filteredPerformances = performances.filter(p => {
      if (!programFilter) return true;
      return p.program_type === programFilter;
  });

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
              style={{border:'none', background:'transparent', fontSize:'1.2rem', cursor:'pointer'}}
            >
              ← Back to Seasons
            </button>
            
            <div style={{flex: 1, textAlign:'center'}}>
               <h2 style={{margin:0, fontFamily:'PT Serif'}}>
                 {categoryFilter} {programFilter ? `${programFilter} Program` : 'Competition View'}
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
               {view === 'analytics' && <Analytics performances={filteredPerformances} />}
             </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;