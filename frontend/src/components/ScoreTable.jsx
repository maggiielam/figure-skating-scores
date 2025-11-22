import React, { useMemo } from 'react';

// Helper to parse element names
// Logic:
// 1. Fall Detection: Find first 'F' not preceded by a digit. 
//    Everything before it is the Element Name. Everything after is discarded (or part of the fall).
// 2. Flag Extraction: Scan the Element Name for flags (!, <, etc) to populate the Info column.
const parseElementName = (rawName) => {
  if (!rawName) return { name: "", flags: "", isFall: false };
  
  let namePart = rawName;
  let isFall = false;

  // --- STEP 1: Detect Fall Split Point ---
  // Look for 'F' that is NOT preceded by a number (0-9)
  const fallMatch = rawName.match(/[^0-9](F)/);
  
  if (fallMatch) {
    // The match index points to the char *before* F.
    const splitIndex = fallMatch.index + 1;
    namePart = rawName.substring(0, splitIndex); // Keep everything up to the F
    isFall = true;
  }

  // --- STEP 2: Extract Flags from the Name Part ---
  // We want flags to appear in the Info column, but NOT be removed from the Name.
  const tokens = namePart.split('+');
  const extractedFlags = [];

  tokens.forEach(token => {
    const t = token.trim();
    // Ignore 'q' if it is part of a Sequence code
    const isSequence = t.includes("StSq") || t.includes("ChSq");
    
    // Match: <<, <, e (not Eu), !, q
    const pattern = isSequence 
      ? /(<<|<|e(?!u)|!)/g 
      : /(<<|<|e(?!u)|!|q)/g;
      
    const matches = t.match(pattern);
    if (matches) {
      extractedFlags.push(...matches);
    }
  });

  return { 
    name: namePart.trim(),    // Name contains flags (4F!<) but NO Fall
    flags: extractedFlags.join(', '), // Info contains flags (!, <)
    isFall                    // Boolean for the separate Fall marker
  };
};

export default function ScoreTable({ performances }) {
  
  const processedData = useMemo(() => {
    const withBV = performances.map(p => ({
      ...p,
      computedBV: p.elements.reduce((acc, el) => acc + el.base_value, 0)
    }));

    // Sort for ranks
    const sortedByRank = [...withBV].sort((a, b) => a.rank - b.rank);
    const sortedByTES = [...withBV].sort((a, b) => b.tes_score - a.tes_score);
    const sortedByPCS = [...withBV].sort((a, b) => b.pcs_score - a.pcs_score);

    const getRank = (id, list) => list.findIndex(item => item.id === id) + 1;

    // --- NEW: Calculate Individual Component Ranks ---
    // 1. Collect all scores by component name
    const compScores = {}; // { "Composition": [{id, score}, ...], ... }

    withBV.forEach(p => {
        p.components.forEach(c => {
            if (!compScores[c.component_name]) {
                compScores[c.component_name] = [];
            }
            compScores[c.component_name].push({ id: p.id, score: c.panel_score });
        });
    });

    // 2. Sort and assign ranks
    const compRanks = {}; // { "Composition": { skaterId: 1, ... }, ... }
    Object.keys(compScores).forEach(compName => {
        // Sort descending by score
        const sorted = compScores[compName].sort((a, b) => b.score - a.score);
        compRanks[compName] = {};
        sorted.forEach((item, index) => {
            compRanks[compName][item.id] = index + 1;
        });
    });

    return sortedByRank.map(skater => {
        // Helper to get rank for this specific skater's components
        const myCompRanks = {};
        skater.components.forEach(c => {
            if (compRanks[c.component_name]) {
                myCompRanks[c.component_name] = compRanks[c.component_name][skater.id];
            }
        });

        return {
            ...skater,
            rankTES: getRank(skater.id, sortedByTES),
            rankPCS: getRank(skater.id, sortedByPCS),
            componentRanks: myCompRanks // Attach the map of component ranks
        };
    });
  }, [performances]);

  const getJudgeScores = (scoreStr) => {
    if (!scoreStr) return Array(9).fill("-");
    const scores = scoreStr.split(',').map(s => s.trim());
    while (scores.length < 9) scores.push("-");
    return scores;
  };

  const getElementJudgeScoreClass = (val) => {
    const num = parseFloat(val);
    if (!isNaN(num) && (num >= 4)) return "text-green"; 
    return "judge-cell"; 
  };

  return (
    <div className="protocols-container">
      {processedData.map(skater => (
        <div key={skater.id} className="skater-card">
          
          {/* --- HEADER --- */}
          <div className="card-header">
            <div className="header-left">
              <div className="rank-badge-square">{skater.rank}</div>
              <div className="skater-identity">
                <h2 className="name">{skater.skater_name}</h2>
                <span className="nation-tag">{skater.nation}</span>
              </div>
            </div>

            <div className="header-right">
              <div className="stat-box">
                <div className="stat-label">TES</div>
                <div className="stat-value">
                  {skater.tes_score.toFixed(2)}
                  <span className="stat-rank">({skater.rankTES})</span>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">PCS</div>
                <div className="stat-value">
                  {skater.pcs_score.toFixed(2)}
                  <span className="stat-rank">({skater.rankPCS})</span>
                </div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Deductions</div>
                <div className="stat-value">{skater.deductions.toFixed(2)}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Total Score</div>
                <div className="stat-value">{skater.total_score.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="table-content">
            <h4 className="section-title">Executed Elements</h4>
            <table className="protocol-table tes">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Element</th>
                  <th>Info</th>
                  <th>Base</th>
                  <th>GOE</th>
                  <th>J1</th><th>J2</th><th>J3</th><th>J4</th><th>J5</th>
                  <th>J6</th><th>J7</th><th>J8</th><th>J9</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {skater.elements.map((el, idx) => {
                   const jScores = getJudgeScores(el.judges_scores);
                   const { name: displayName, flags: flagsString, isFall } = parseElementName(el.element_name);
                   const isNegative = el.goe < 0;
                   const hasX = el.is_bonus;

                   return (
                    <tr key={idx} className={isNegative ? "row-negative" : ""}>
                      <td className="index-col">{idx + 1}</td>
                      <td className="element-name-col">{displayName}</td>
                      
                      <td className="info-cell">
                        <div className="info-split-container">
                           <span className="fall-marker">{isFall ? 'F' : ''}</span>
                           <span className="tech-flags">{flagsString}</span>
                        </div>
                      </td>
                      
                      <td className={`base-value-cell ${hasX ? "text-green" : ""}`}>
                          {el.base_value.toFixed(2)}
                          {hasX && " x"}
                      </td>
                      
                      <td>{el.goe > 0 ? "+" : ""}{el.goe.toFixed(2)}</td>
                      
                      {jScores.map((s, jIdx) => (
                        <td key={jIdx} className={getElementJudgeScoreClass(s)}>{s}</td>
                      ))}
                      
                      <td className="score-col">{el.panel_score.toFixed(2)}</td>
                    </tr>
                   )
                })}
              </tbody>
            </table>

            <h4 className="section-title mt-6">Program Components</h4>
            <table className="protocol-table pcs">
              <thead>
                <tr>
                  <th>Component</th>
                  <th>Factor</th>
                  <th>J1</th><th>J2</th><th>J3</th><th>J4</th><th>J5</th>
                  <th>J6</th><th>J7</th><th>J8</th><th>J9</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {skater.components.map((comp, idx) => {
                   const jScores = getJudgeScores(comp.judges_scores);
                   const rank = skater.componentRanks[comp.component_name];

                   return (
                    <tr key={idx}>
                      <td className="component-name-col">{comp.component_name}</td>
                      <td className="factor-col">{comp.factor.toFixed(2)}</td>
                      {jScores.map((s, jIdx) => (
                        <td key={jIdx} className="judge-cell">{s}</td>
                      ))}
                      <td className="score-col">
                        {comp.panel_score.toFixed(2)}
                        {/* Display Rank e.g. (2) */}
                        {rank && (
                            <span style={{
                                fontSize: '13px', 
                                fontWeight: '500', 
                                color: '#94a3b8', 
                                marginLeft: '6px'
                            }}>
                                ({rank})
                            </span>
                        )}
                      </td>
                    </tr>
                   )
                })}
              </tbody>
            </table>
          </div>

          {skater.deductions > 0 && (
             <div className="card-footer-note">
                Deductions: -{skater.deductions.toFixed(2)}
             </div>
          )}

        </div>
      ))}
    </div>
  );
}