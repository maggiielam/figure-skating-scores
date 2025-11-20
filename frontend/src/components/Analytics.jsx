import React, { useMemo, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

// Consistent Color Palette for Skaters
const COLORS = [
  '#2563eb', // Blue
  '#d97706', // Orange
  '#16a34a', // Green
  '#dc2626', // Red
  '#9333ea', // Purple
  '#0891b2', // Cyan
  '#db2777', // Pink
  '#4b5563', // Grey
  '#854d0e', // Brown
  '#0f766e'  // Teal
];

// Helper to render a simple rank table
const RankTable = ({ title, data, columns }) => (
  <div className="analytics-card">
    <h3>{title}</h3>
    {data.length === 0 ? (
        <div style={{padding:'20px', color:'#94a3b8', textAlign:'center'}}>No ChSq data available for short program</div>
    ) : (
        <table>
        <thead>
            <tr>
            <th>Rank</th>
            {columns.map((col, i) => <th key={i}>{col.header}</th>)}
            </tr>
        </thead>
        <tbody>
            {data.slice(0, 10).map((row, i) => (
            <tr key={i}>
                <td className="rank-cell">{i + 1}.</td>
                {columns.map((col, j) => (
                <td key={j} className={col.className || ''}>
                    {col.render ? col.render(row) : row[col.accessor]}
                </td>
                ))}
            </tr>
            ))}
        </tbody>
        </table>
    )}
  </div>
);

export default function Analytics({ performances }) {
  // LOCAL RADAR FILTER - specific to the radar chart
  const [radarSelectedIds, setRadarSelectedIds] = useState([]);

  // Initialize selections to Top 3
  useEffect(() => {
    if (performances.length > 0) {
        const top3 = [...performances]
            .sort((a, b) => b.total_score - a.total_score)
            .slice(0, 3)
            .map(p => p.id);
        setRadarSelectedIds(top3); 
    }
  }, [performances]);

  const toggleRadarSkater = (id) => {
      if (radarSelectedIds.includes(id)) {
          setRadarSelectedIds(radarSelectedIds.filter(sid => sid !== id));
      } else {
          setRadarSelectedIds([...radarSelectedIds, id]);
      }
  };

  // CALCULATIONS
  const analyticsData = useMemo(() => {
    if (!performances || performances.length === 0) return null;

    // 1. GLOBAL RANKINGS
    const sortedTES = [...performances].sort((a, b) => b.tes_score - a.tes_score);
    const sortedPCS = [...performances].sort((a, b) => b.pcs_score - a.pcs_score);
    
    const withBV = performances.map(p => ({
      ...p,
      bv: p.elements.reduce((sum, el) => sum + el.base_value, 0)
    })).sort((a, b) => b.bv - a.bv);

    // 2. ELEMENT AGGREGATION
    let allJumps = [];
    let allSpins = [];
    let allSteps = [];
    let allChoreo = [];

    performances.forEach(p => {
      p.elements.forEach(el => {
        const item = { ...el, skater: p.skater_name, nation: p.nation };
        const name = el.element_name;

        if (name.includes('Sp')) allSpins.push(item);
        else if (name.includes('StSq')) allSteps.push(item);
        else if (name.includes('ChSq')) allChoreo.push(item);
        else allJumps.push(item); 
      });
    });

    const jumpsByScore = [...allJumps].sort((a, b) => b.panel_score - a.panel_score);
    const jumpsByGOE = [...allJumps].sort((a, b) => b.goe - a.goe);
    const spinsByScore = [...allSpins].sort((a, b) => b.panel_score - a.panel_score);
    const stepsByScore = [...allSteps].sort((a, b) => b.panel_score - a.panel_score);
    const choreoByScore = [...allChoreo].sort((a, b) => b.panel_score - a.panel_score);

    const avgJumpGOE = performances.map(p => {
        const myJumps = p.elements.filter(el => {
            const n = el.element_name;
            return !n.includes('Sp') && !n.includes('StSq') && !n.includes('ChSq');
        });
        const totalGOE = myJumps.reduce((acc, j) => acc + j.goe, 0);
        const avg = myJumps.length > 0 ? totalGOE / myJumps.length : 0;
        return { ...p, avg_jump_goe: avg };
    }).sort((a, b) => b.avg_jump_goe - a.avg_jump_goe);


    // --- 3. SCATTER PLOT DATA (Shows All) ---
    const scatterSkaters = performances; 

    const xValues = scatterSkaters.map(p => p.elements.reduce((sum, el) => sum + el.base_value, 0));
    const yValues = scatterSkaters.map(p => p.tes_score);
    
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    const buffer = 15;
    const rangeX = [Math.floor(minX - buffer), Math.ceil(maxX + buffer)];
    const rangeY = [Math.floor(minY - buffer), Math.ceil(maxY + buffer)];

    const riskRewardData = {
      x: xValues,
      y: yValues,
      text: scatterSkaters.map(p => p.skater_name.split(' ').slice(-1)[0]), 
      mode: 'markers+text', 
      textposition: 'top center',
      textfont: { family: 'Hind, sans-serif', size: 11, color: '#64748b' },
      type: 'scatter',
      marker: { size: 12, color: '#334155' },
      rangeX: rangeX,
      rangeY: rangeY
    };

    // --- 4. RADAR CHART DATA (Normalized) ---
    const radarSkaters = performances.filter(p => radarSelectedIds.includes(p.id));
    
    // PRE-CALCULATE GLOBAL MIN/MAX FOR EACH METRIC TO NORMALIZE (0 to 10 Scale)
    const getMetricStats = (extractor) => {
        const values = performances.map(extractor);
        return { min: Math.min(...values), max: Math.max(...values) };
    };

    const normalize = (val, stats) => {
        if (stats.max === stats.min) return 10; // Avoid division by zero
        // Scale to 5-10 range to look nice on chart (avoids tiny dots in center)
        return 5 + ((val - stats.min) / (stats.max - stats.min)) * 5;
    };

    // Metrics Extractors
    const getComp = p => p.components.find(c => c.component_name.includes("Composition"))?.panel_score || 0;
    const getPres = p => p.components.find(c => c.component_name.includes("Presentation"))?.panel_score || 0;
    const getSkill = p => p.components.find(c => c.component_name.includes("Skating Skills"))?.panel_score || 0;
    
    const getBestSpin = p => {
        const spins = p.elements.filter(el => el.element_name.includes('Sp')).sort((a,b) => b.panel_score - a.panel_score);
        return spins.length > 0 ? spins[0].panel_score : 0;
    };
    const getBestStep = p => {
        const steps = p.elements.filter(el => el.element_name.includes('StSq')).sort((a,b) => b.panel_score - a.panel_score);
        return steps.length > 0 ? steps[0].panel_score : 0;
    };
    const getBestChoreo = p => {
        const choreo = p.elements.filter(el => el.element_name.includes('ChSq')).sort((a,b) => b.panel_score - a.panel_score);
        return choreo.length > 0 ? choreo[0].panel_score : 0;
    };
    const getAvgGOE = p => avgJumpGOE.find(s => s.id === p.id)?.avg_jump_goe || 0;

    // Calculate Ranges
    const rangeComp = getMetricStats(getComp);
    const rangePres = getMetricStats(getPres);
    const rangeSkill = getMetricStats(getSkill);
    const rangeSpin = getMetricStats(getBestSpin);
    const rangeStep = getMetricStats(getBestStep);
    const rangeChoreo = getMetricStats(getBestChoreo);
    const rangeGOE = getMetricStats(getAvgGOE);

    const radarData = radarSkaters.map(skater => {
        const skaterIdx = performances.findIndex(p => p.id === skater.id);
        const color = COLORS[skaterIdx % COLORS.length];
        const lastName = skater.skater_name.split(' ').slice(-1)[0];

        // Get Raw Values
        const rawComp = getComp(skater);
        const rawPres = getPres(skater);
        const rawSkill = getSkill(skater);
        const rawSpin = getBestSpin(skater);
        const rawStep = getBestStep(skater);
        const rawChoreo = getBestChoreo(skater);
        const rawGOE = getAvgGOE(skater);

        // Normalize (0-10 Scale)
        const rValues = [
            normalize(rawComp, rangeComp),
            normalize(rawPres, rangePres),
            normalize(rawSkill, rangeSkill),
            normalize(rawSpin, rangeSpin),
            normalize(rawStep, rangeStep),
            normalize(rawChoreo, rangeChoreo),
            normalize(rawGOE, rangeGOE),
            normalize(rawComp, rangeComp) // Loop back
        ];
        
        // Text on Hover shows REAL value, not normalized
        const hoverText = [
            `Comp: ${rawComp.toFixed(2)}`,
            `Pres: ${rawPres.toFixed(2)}`,
            `Skill: ${rawSkill.toFixed(2)}`,
            `Spin: ${rawSpin.toFixed(2)}`,
            `Step: ${rawStep.toFixed(2)}`,
            `Choreo: ${rawChoreo.toFixed(2)}`,
            `GOE: ${rawGOE.toFixed(2)}`,
            `Comp: ${rawComp.toFixed(2)}`
        ];

        // Persistent Label only on top vertex
        const textValues = rValues.map((val, i) => i === 2 ? lastName : ""); 

        return {
            type: 'scatterpolar',
            r: rValues, 
            theta: ['Composition', 'Presentation', 'Skating Skills', 'Best Spin', 'Best Step Seq.', 'Best Choreo Seq.', 'Avg Jump GOE', 'Composition'],
            fill: 'toself',
            name: lastName,
            mode: 'lines+markers+text', 
            text: textValues,
            hovertext: hoverText, // Show real numbers on hover
            hoverinfo: 'text',
            textposition: 'top center',
            textfont: { color: color, size: 12, family: 'Hind, sans-serif', weight: 'bold' },
            opacity: 0.4,
            line: { width: 2, color: color },
            marker: { color: color, size: 6 }
        };
    });

    return {
      sortedTES, sortedPCS, withBV,
      jumpsByScore, spinsByScore, stepsByScore, choreoByScore,
      avgJumpGOE,
      riskRewardData,
      radarData
    };
  }, [performances, radarSelectedIds]);

  if (!analyticsData) return <div>No ChSq Data Available For Short Programs</div>;

  return (
    <div className="analytics-layout-vertical">
      
      <div className="charts-grid">
          {/* SCATTER */}
          <div className="analytics-card"> 
              <h3>Risk vs. Reward</h3>
              <Plot
                  data={[
                      analyticsData.riskRewardData,
                      { 
                        x: analyticsData.riskRewardData.rangeX, 
                        y: analyticsData.riskRewardData.rangeX, 
                        mode: 'lines', 
                        line: {dash: 'dot', color: '#cbd5e1'}, 
                        hoverinfo: 'none' 
                      } 
                  ]}
                  layout={{
                      autosize: true, height: 400, 
                      xaxis: { title: 'Base Value', range: analyticsData.riskRewardData.rangeX, zeroline: false },
                      yaxis: { title: 'TES', range: analyticsData.riskRewardData.rangeY, zeroline: false },
                      hovermode: 'closest',
                      margin: {t: 20, r: 20, b: 30, l: 50},
                      showlegend: false
                  }}
                  style={{width: '100%'}}
                  useResizeHandler={true}
              />
          </div>

          {/* RADAR */}
          <div className="analytics-card radar-card-layout">
              <div className="radar-chart-area">
                  <h3>Performance Profile (Normalized)</h3>
                  <Plot
                      data={analyticsData.radarData}
                      layout={{
                          polar: { 
                              radialaxis: { visible: false, range: [0, 10] } // Hide numbers since they are normalized
                          },
                          height: 400,
                          margin: {t: 30, r: 30, b: 60, l: 30},
                          showlegend: false, 
                      }}
                      style={{width: '100%'}}
                      useResizeHandler={true}
                  />
              </div>
              
              {/* TOGGLE BOX */}
              <div className="radar-controls">
                  <h4>Select Skaters</h4>
                  <div className="radar-list">
                      {performances.map((p, idx) => (
                          <label key={p.id} className="radar-toggle-item">
                              <input 
                                  type="checkbox" 
                                  checked={radarSelectedIds.includes(p.id)}
                                  onChange={() => toggleRadarSkater(p.id)}
                              />
                              <span className="radar-label-text">
                                  <span 
                                    className="rank-badge" 
                                    style={{backgroundColor: COLORS[idx % COLORS.length], color: '#fff'}}
                                  >
                                    #{p.rank}
                                  </span>
                                  {p.skater_name.split(' ').slice(-1)[0]}
                              </span>
                          </label>
                      ))}
                  </div>
              </div>
          </div>
      </div>
      
      {/* TABLES */}
      <div className="analytics-row">
          <RankTable 
            title="Highest Base Values" 
            data={analyticsData.withBV}
            columns={[{ header: 'Skater', accessor: 'skater_name', className: 'bold-text' }, { header: 'BV', accessor: 'bv', render: r => r.bv.toFixed(2) }]}
          />
          <RankTable 
            title="Highest PCS" 
            data={analyticsData.sortedPCS}
            columns={[{ header: 'Skater', accessor: 'skater_name', className: 'bold-text' }, { header: 'PCS', accessor: 'pcs_score', render: r => r.pcs_score.toFixed(2) }]}
          />
          <RankTable 
            title="Avg. Jump GOE" 
            data={analyticsData.avgJumpGOE}
            columns={[{ header: 'Skater', accessor: 'skater_name', className: 'bold-text' }, { header: 'Avg GOE', accessor: 'avg_jump_goe', render: r => `${r.avg_jump_goe.toFixed(2)}` }]}
          />
      </div>

      <div className="analytics-row">
          <RankTable 
            title="Top Jumps" 
            data={analyticsData.jumpsByScore}
            columns={[{ header: 'Skater', accessor: 'skater', className: 'bold-text' }, { header: 'Element', accessor: 'element_name' }, { header: 'Score', accessor: 'panel_score', render: r => r.panel_score.toFixed(2) }]}
          />
          <RankTable 
            title="Top Spins" 
            data={analyticsData.spinsByScore}
            columns={[{ header: 'Skater', accessor: 'skater', className: 'bold-text' }, { header: 'Element', accessor: 'element_name' }, { header: 'Score', accessor: 'panel_score', render: r => r.panel_score.toFixed(2) }]}
          />
      </div>

      <div className="analytics-row">
        <RankTable 
            title="Top Step Sequences" 
            data={analyticsData.stepsByScore}
            columns={[{ header: 'Skater', accessor: 'skater', className: 'bold-text' }, { header: 'Element', accessor: 'element_name' }, { header: 'Score', accessor: 'panel_score', render: r => r.panel_score.toFixed(2) }]}
          />
          <RankTable 
          title="Top Choreo Sequences" 
          data={analyticsData.choreoByScore}
          columns={[{ header: 'Skater', accessor: 'skater', className: 'bold-text' }, { header: 'Element', accessor: 'element_name' }, { header: 'Score', accessor: 'panel_score', render: r => r.panel_score.toFixed(2) }]}
        />


      </div>

    </div>
  );
}