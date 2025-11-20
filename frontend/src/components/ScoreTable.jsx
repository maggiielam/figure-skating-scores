import React, { useMemo } from 'react';

export default function ScoreTable({ performances }) {
  // 1. Pre-calculate Base Value and Ranks
  const processedData = useMemo(() => {
    const withBV = performances.map(p => ({
      ...p,
      computedBV: p.elements.reduce((acc, el) => acc + el.base_value, 0)
    }));

    const sortedByRank = [...withBV].sort((a, b) => a.rank - b.rank);
    const sortedByTES = [...withBV].sort((a, b) => b.tes_score - a.tes_score);
    const sortedByPCS = [...withBV].sort((a, b) => b.pcs_score - a.pcs_score);
    const sortedByBV  = [...withBV].sort((a, b) => b.computedBV - a.computedBV);

    const getRank = (id, list) => list.findIndex(item => item.id === id) + 1;

    return sortedByRank.map(skater => ({
      ...skater,
      rankTES: getRank(skater.id, sortedByTES),
      rankPCS: getRank(skater.id, sortedByPCS),
      rankBV: getRank(skater.id, sortedByBV)
    }));
  }, [performances]);

  const getScoreStyle = (val) => {
    if (val >= 4) return "text-green"; 
    return "";
  };

  const getJudgeScores = (scoreStr) => {
    if (!scoreStr) return Array(9).fill("-");
    const scores = scoreStr.split(',').map(s => s.trim());
    while (scores.length < 9) scores.push("-");
    return scores;
  };

  return (
    <div>
      {processedData.map(skater => (
        <div key={skater.id} style={{marginBottom: '60px'}}>
          
          <div className="skater-name">
            {skater.rank} &nbsp; {skater.skater_name} ({skater.nation})
          </div>

          {/* ELEMENTS TABLE */}
          <table className="tes">
            <thead>
              <tr>
                <th>Element</th>
                <th>Base Value</th>
                <th>GOE</th>
                <th>J1</th><th>J2</th><th>J3</th><th>J4</th><th>J5</th>
                <th>J6</th><th>J7</th><th>J8</th><th>J9</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {skater.elements.map((el, idx) => {
                 const jScores = getJudgeScores(el.judges_scores);
                 
                 const name = el.element_name;
                 // Red Row Logic: Negative GOE or Error Flags
                 const isRedRow = el.goe < 0 || 
                                  name.includes('<') || 
                                  name.includes('!') ||
                                  name.includes('e') ||
                                  (name.includes('q') && !name.includes('Sq'));

                 // Apply RED only to the row. 
                 // We removed the "row-green" logic so it doesn't override red.
                 const rowClass = isRedRow ? "row-red" : "";

                 return (
                  <tr key={idx} className={rowClass}>
                    <td>
                        {idx + 1}. {el.element_name}
                    </td>
                    
                    {/* BASE VALUE: Only this cell gets green if bonus exists */}
                    <td className={el.is_bonus ? "text-green" : ""}>
                        {el.base_value.toFixed(2)}
                        {el.is_bonus && " x"}
                    </td>
                    
                    <td>{el.goe.toFixed(2)}</td>
                    
                    {jScores.map((s, jIdx) => (
                      <td key={jIdx} className={getScoreStyle(Number(s))}>{s}</td>
                    ))}
                    
                    <td>{el.panel_score.toFixed(2)}</td>
                  </tr>
                 )
              })}
            </tbody>
          </table>

          {/* COMPONENTS TABLE */}
          <table className="pcs">
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
                 return (
                  <tr key={idx}>
                    <td>{comp.component_name}</td>
                    <td>{comp.factor.toFixed(2)}</td>
                    {jScores.map((s, jIdx) => (
                      <td key={jIdx}>{s}</td>
                    ))}
                    <td>{comp.panel_score.toFixed(2)}</td>
                  </tr>
                 )
              })}
            </tbody>
          </table>

          {/* SUMMARY FOOTER */}
          <table className="tot">
            <tbody>
              <tr>
                <td>
                  <div className="tot-label">TES BV</div>
                  <div className="tot-val">
                    {skater.computedBV.toFixed(2)} <small>({skater.rankBV})</small>
                  </div>
                </td>
                <td>
                  <div className="tot-label">Total TES</div>
                  <div className="tot-val">
                    {skater.tes_score.toFixed(2)} <small>({skater.rankTES})</small>
                  </div>
                </td>
                <td>
                  <div className="tot-label">Total PCS</div>
                  <div className="tot-val">
                    {skater.pcs_score.toFixed(2)} <small>({skater.rankPCS})</small>
                  </div>
                </td>
                <td>
                  <div className="tot-label">Deductions</div>
                  <div className="tot-val">{skater.deductions.toFixed(2)}</div>
                </td>
                <td>
                  <div className="total-score-box">
                    <div className="tot-label">Total Score</div>
                    <div className="tot-val">{skater.total_score.toFixed(2)}</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

        </div>
      ))}
    </div>
  );
}