import React, { useMemo, useState, useEffect } from 'react';
import Plot from 'react-plotly.js';
import { Reorder } from 'framer-motion';

// Consistent Color Palette for Skaters
const COLORS = [
  '#2563eb', '#d97706', '#16a34a', '#dc2626', '#9333ea', 
  '#0891b2', '#db2777', '#4b5563', '#854d0e', '#0f766e'
];

// Helper to clean jump names
const cleanElementName = (name) => {
    if (!name) return "";
    let cleaned = name.replace(/[<!eq]/g, '');
    cleaned = cleaned.replace(/(?<!\d)F/g, '');
    return cleaned.trim();
};

// --- DRAGGABLE COLUMN COMPONENT (Updated with Framer Motion) ---
const DraggableColumnList = ({ items, onReorder }) => {
    return (
        <Reorder.Group 
            axis="x" 
            values={items} 
            onReorder={onReorder} 
            style={{ 
                display: 'flex', 
                gap: '8px', 
                flexWrap: 'wrap', 
                marginBottom: '15px', 
                padding: '10px', 
                background: '#f8fafc', 
                borderRadius: '6px', 
                border: '1px solid #e2e8f0',
                listStyle: 'none' // Remove default list styling
            }}
        >
            {items.map((item) => (
                <Reorder.Item 
                    key={item} 
                    value={item}
                    whileDrag={{ scale: 1.1, cursor: 'grabbing', zIndex: 10 }}
                    whileHover={{ scale: 1.02 }}
                    style={{
                        padding: '6px 12px',
                        backgroundColor: 'white',
                        border: '1px solid #cbd5e1',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        color: '#334155',
                        cursor: 'grab',
                        userSelect: 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    }}
                >
                   {item}
                </Reorder.Item>
            ))}
        </Reorder.Group>
    );
};


// Helper to render rank table
const RankTable = ({ title, data, columns }) => (
  <div className="analytics-card">
    <h3>{title}</h3>
    {data.length === 0 ? (
        <div style={{padding:'20px', color:'#94a3b8', textAlign:'center'}}>No data available</div>
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

export default function ScoreAnalytics({ performances }) {
  // --- STATE ---
  const [radarSelectedIds, setRadarSelectedIds] = useState([]);
  
  // Column Orders
  const [categoryOrder, setCategoryOrder] = useState(['Toe Loop', 'Salchow', 'Loop', 'Flip', 'Lutz', 'Axel']);
  const [detailedOrder, setDetailedOrder] = useState([]);

  // Mapping for jump codes to labels to help regex matching
  const jumpCodeMap = {
      'Toe Loop': 'T', 'Salchow': 'S', 'Loop': 'Lo', 
      'Flip': 'F', 'Lutz': 'Lz', 'Axel': 'A'
  };

  // --- EFFECTS ---

  // 1. Initialize Radar selections
  useEffect(() => {
    if (performances.length > 0 && radarSelectedIds.length === 0) {
        const top3 = [...performances].sort((a, b) => b.total_score - a.total_score).slice(0, 3).map(p => p.id);
        setRadarSelectedIds(top3); 
    }
  }, [performances]);

  // 2. Initialize Detailed Order (Unique Elements)
  useEffect(() => {
      if (performances.length > 0 && detailedOrder.length === 0) {
          let allJumps = [];
          performances.forEach(p => {
            p.elements.forEach(el => {
                if (!el.element_name.includes('Sp') && !el.element_name.includes('StSq') && !el.element_name.includes('ChSq')) {
                    allJumps.push(el);
                }
            });
          });
          const uniqueNames = [...new Set(allJumps.map(j => cleanElementName(j.element_name)))].sort();
          setDetailedOrder(uniqueNames);
      }
  }, [performances]);

  const toggleRadarSkater = (id) => {
      if (radarSelectedIds.includes(id)) {
          setRadarSelectedIds(radarSelectedIds.filter(sid => sid !== id));
      } else {
          setRadarSelectedIds([...radarSelectedIds, id]);
      }
  };

  // --- CALCULATIONS ---
  const analyticsData = useMemo(() => {
    if (!performances || performances.length === 0) return null;

    // 1. SORTING / PREP
    const sortedTES = [...performances].sort((a, b) => b.tes_score - a.tes_score);
    const sortedPCS = [...performances].sort((a, b) => b.pcs_score - a.pcs_score);
    
    const withBV = performances.map(p => ({
      ...p,
      bv: p.elements.reduce((sum, el) => sum + el.base_value, 0)
    })).sort((a, b) => b.bv - a.bv);

    // Element Aggregation
    let allJumps = [], allSpins = [], allSteps = [], allChoreo = [];
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
    const spinsByScore = [...allSpins].sort((a, b) => b.panel_score - a.panel_score);
    const stepsByScore = [...allSteps].sort((a, b) => b.panel_score - a.panel_score);
    const choreoByScore = [...allChoreo].sort((a, b) => b.panel_score - a.panel_score);
    const hasChoreo = allChoreo.length > 0;

    const avgJumpGOE = performances.map(p => {
        const myJumps = p.elements.filter(el => !el.element_name.match(/(Sp|StSq|ChSq)/));
        const totalGOE = myJumps.reduce((acc, j) => acc + j.goe, 0);
        return { ...p, avg_jump_goe: myJumps.length > 0 ? totalGOE / myJumps.length : 0 };
    }).sort((a, b) => b.avg_jump_goe - a.avg_jump_goe);

    // 3. SCATTER PLOTS
    const scatterSkaters = performances; 
    const xValues = scatterSkaters.map(p => p.elements.reduce((sum, el) => sum + el.base_value, 0));
    const yValues = scatterSkaters.map(p => p.tes_score);
    const riskRewardData = {
      x: xValues, y: yValues,
      text: scatterSkaters.map(p => p.skater_name.split(' ').slice(-1)[0]), 
      mode: 'markers+text', textposition: 'top center', textfont: { family: 'Hind', size: 11, color: '#64748b' },
      type: 'scatter', marker: { size: 12, color: '#334155' },
      rangeX: [Math.floor(Math.min(...xValues) - 15), Math.ceil(Math.max(...xValues) + 15)],
      rangeY: [Math.floor(Math.min(...yValues) - 15), Math.ceil(Math.max(...yValues) + 15)]
    };

    const pcsValues = scatterSkaters.map(p => p.pcs_score);
    const tesValues = scatterSkaters.map(p => p.tes_score); 
    const tesPcsData = {
      x: pcsValues, y: tesValues,
      text: scatterSkaters.map(p => p.skater_name.split(' ').slice(-1)[0]),
      mode: 'markers+text', textposition: 'top center', textfont: { family: 'Hind', size: 11, color: '#64748b' },
      type: 'scatter', marker: { size: 12, color: '#0f766e' }, 
      rangeX: [Math.floor(Math.min(...pcsValues) - 5), Math.ceil(Math.max(...pcsValues) + 5)],
      rangeY: [Math.floor(Math.min(...tesValues) - 5), Math.ceil(Math.max(...tesValues) + 5)]
    };

    // 4. RADAR
    const radarSkaters = performances.filter(p => radarSelectedIds.includes(p.id));
    const getMetricStats = (extractor) => ({ min: Math.min(...performances.map(extractor)), max: Math.max(...performances.map(extractor)) });
    const normalize = (val, stats) => stats.max === stats.min ? 10 : 5 + ((val - stats.min) / (stats.max - stats.min)) * 5;

    const getComp = p => p.components.find(c => c.component_name.includes("Composition"))?.panel_score || 0;
    const getPres = p => p.components.find(c => c.component_name.includes("Presentation"))?.panel_score || 0;
    const getSkill = p => p.components.find(c => c.component_name.includes("Skating Skills"))?.panel_score || 0;
    const getBestSpin = p => p.elements.filter(el => el.element_name.includes('Sp')).sort((a,b) => b.panel_score - a.panel_score)[0]?.panel_score || 0;
    const getBestStep = p => p.elements.filter(el => el.element_name.includes('StSq')).sort((a,b) => b.panel_score - a.panel_score)[0]?.panel_score || 0;
    const getBestChoreo = p => p.elements.filter(el => el.element_name.includes('ChSq')).sort((a,b) => b.panel_score - a.panel_score)[0]?.panel_score || 0;
    const getAvgGOEVal = p => avgJumpGOE.find(s => s.id === p.id)?.avg_jump_goe || 0;

    const rangeComp = getMetricStats(getComp);
    const rangePres = getMetricStats(getPres);
    const rangeSkill = getMetricStats(getSkill);
    const rangeSpin = getMetricStats(getBestSpin);
    const rangeStep = getMetricStats(getBestStep);
    const rangeChoreo = getMetricStats(getBestChoreo);
    const rangeGOE = getMetricStats(getAvgGOEVal);

    const radarLabels = ['Composition', 'Presentation', 'Skating Skills', 'Best Spin', 'Best Step Seq.', ...(hasChoreo ? ['Best Choreo Seq.'] : []), 'Avg Jump GOE', 'Composition'];

    const radarData = radarSkaters.map(skater => {
        const skaterIdx = performances.findIndex(p => p.id === skater.id);
        const color = COLORS[skaterIdx % COLORS.length];
        const rawComp = getComp(skater), rawPres = getPres(skater), rawSkill = getSkill(skater);
        const rawSpin = getBestSpin(skater), rawStep = getBestStep(skater), rawChoreo = getBestChoreo(skater);
        const rawGOE = getAvgGOEVal(skater);

        const rValues = [
            normalize(rawComp, rangeComp), normalize(rawPres, rangePres), normalize(rawSkill, rangeSkill),
            normalize(rawSpin, rangeSpin), normalize(rawStep, rangeStep),
            ...(hasChoreo ? [normalize(rawChoreo, rangeChoreo)] : []),
            normalize(rawGOE, rangeGOE), normalize(rawComp, rangeComp)
        ];
        
        const hoverText = [
            `Comp: ${rawComp.toFixed(2)}`, `Pres: ${rawPres.toFixed(2)}`, `Skill: ${rawSkill.toFixed(2)}`,
            `Spin: ${rawSpin.toFixed(2)}`, `Step: ${rawStep.toFixed(2)}`,
            ...(hasChoreo ? [`Choreo: ${rawChoreo.toFixed(2)}`] : []), `GOE: ${rawGOE.toFixed(2)}`, `Comp: ${rawComp.toFixed(2)}`
        ];

        return {
            type: 'scatterpolar', r: rValues, theta: radarLabels, fill: 'toself', name: skater.skater_name.split(' ').slice(-1)[0],
            mode: 'lines+markers+text', text: rValues.map((val, i) => i === 2 ? skater.skater_name.split(' ').slice(-1)[0] : ""), 
            hovertext: hoverText, hoverinfo: 'text', textposition: 'top center',
            textfont: { color: color, size: 12, family: 'Hind', weight: 'bold' },
            opacity: 0.4, line: { width: 2, color: color }, marker: { color: color, size: 6 }
        };
    });

    // --- 5. CATEGORY HEATMAP (Dynamic Columns) ---
    // Sort skaters by rank (total score) for the Y-axis
    const heatmapSkaters = [...performances].sort((a, b) => a.total_score - b.total_score);

    const zValues = heatmapSkaters.map(p => {
        const rowHoverData = [];
        const rowValues = categoryOrder.map(label => {
            const typeCode = jumpCodeMap[label]; // Map 'Axel' -> 'A'
            const typeJumps = p.elements.filter(el => new RegExp(`[0-9]${typeCode}`).test(el.element_name));
            
            if (typeJumps.length === 0) { rowHoverData.push('N/A'); return null; }
            
            const sum = typeJumps.reduce((acc, el) => acc + el.goe, 0);
            rowHoverData.push(typeJumps.map(el => el.element_name).join(', '));
            return sum / typeJumps.length;
        });
        return { values: rowValues, hover: rowHoverData };
    });

    const heatmapData = {
        z: zValues.map(v => v.values),
        x: categoryOrder, // Dynamic X-Axis
        y: heatmapSkaters.map(p => p.skater_name.split(' ').slice(-1)[0]),
        customdata: zValues.map(v => v.hover),
        type: 'heatmap', colorscale: 'Sunset', showscale: true, xgap: 2, ygap: 2, hoverongaps: false,
        hovertemplate: '<b>%{y}</b><br>Jump Type: %{x}<br>GOE: %{z:.2f}<br>Executed: %{customdata}<extra></extra>'
    };

    // --- 6. DETAILED HEATMAP (Dynamic Columns) ---
    const detailedJumpZ = heatmapSkaters.map(p => {
        return detailedOrder.map(cleanName => {
            const specificJumps = p.elements.filter(el => cleanElementName(el.element_name) === cleanName);
            if (specificJumps.length === 0) return null;
            const totalGOE = specificJumps.reduce((acc, el) => acc + el.goe, 0);
            return totalGOE / specificJumps.length;
        });
    });

    const detailedHeatmapData = {
        z: detailedJumpZ,
        x: detailedOrder, // Dynamic X-Axis
        y: heatmapSkaters.map(p => p.skater_name.split(' ').slice(-1)[0]),
        type: 'heatmap', colorscale: 'Sunset', showscale: true, xgap: 2, ygap: 2, hoverongaps: false,
        hovertemplate: '<b>%{y}</b><br>Element: %{x}<br>GOE: %{z:.2f}<extra></extra>'
    };

    // --- 7. BOX PLOTS ---
    const boxTraces = [];
    const actualScoreTraces = [];
    [...performances].sort((a,b)=>a.rank-b.rank).forEach((p, idx) => {
        const judgeTotals = Array(9).fill(0);
        p.components.forEach(c => {
             const s = c.judges_scores.split(',').map(v=>parseFloat(v.trim()));
             s.forEach((val, i) => { if(i<9 && !isNaN(val)) judgeTotals[i] += val*c.factor; });
        });
        p.elements.forEach(el => {
             const s = el.judges_scores.split(',').map(v=>parseFloat(v.trim()));
             const valid = s.filter(n=>!isNaN(n));
             const goeVal = el.panel_score - el.base_value;
             const avgG = valid.reduce((a,b)=>a+b,0)/valid.length;
             const unit = Math.abs(avgG)>0.01 ? goeVal/avgG : el.base_value*0.1;
             s.forEach((val, i) => { if(i<9 && !isNaN(val)) judgeTotals[i] += el.base_value + (val*unit); });
        });
        for(let i=0;i<9;i++) judgeTotals[i] -= p.deductions;
        const color = COLORS[idx % COLORS.length];
        boxTraces.push({
            y: judgeTotals, type: 'box', name: `${p.rank}. ${p.skater_name}`, boxpoints: 'all', jitter: 0.5, pointpos: 0,
            marker: {size:4, color:color, opacity:0.8}, line:{width:1.5, color:color}, fillcolor:'rgba(0,0,0,0)', showlegend:false,
            text:['J1','J2','J3','J4','J5','J6','J7','J8','J9'], hovertemplate: 'Judge: %{text}<br>Est. Score: %{y:.2f}<extra></extra>'
        });
        actualScoreTraces.push({
            x: [`${p.rank}. ${p.skater_name}`], y: [p.total_score], mode: 'markers', marker: { symbol: 'line-ew', color: '#dc2626', size: 40, line: { width: 4 } },
            name: 'Awarded Score', showlegend: false, hoverinfo: 'y+name'
        });
    });

    return {
      sortedTES, sortedPCS, withBV, jumpsByScore, spinsByScore, stepsByScore, choreoByScore, avgJumpGOE,
      riskRewardData, tesPcsData, radarData, heatmapData, detailedHeatmapData, boxData: [...boxTraces, ...actualScoreTraces]
    };
  }, [performances, radarSelectedIds, categoryOrder, detailedOrder]);


  if (!analyticsData) return <div>No Data Available</div>;

  return (
    <div className="analytics-layout-vertical">
      
      {/* ROW 1 */}
      <div className="charts-grid">
          <div className="analytics-card"> 
              <h3>Risk vs. Reward</h3>
              <Plot data={[analyticsData.riskRewardData, {x:analyticsData.riskRewardData.rangeX, y:analyticsData.riskRewardData.rangeX, mode:'lines', line:{dash:'dot', color:'#cbd5e1'}, hoverinfo:'none'}]}
                  layout={{autosize:true, height:400, xaxis:{title:'Base Value', range:analyticsData.riskRewardData.rangeX}, yaxis:{title:'TES', range:analyticsData.riskRewardData.rangeY}, showlegend:false, margin:{t:20, r:20, b:30, l:50}}}
                  style={{width:'100%'}} useResizeHandler={true} />
          </div>
          <div className="analytics-card"> 
              <h3>TES vs. PCS</h3>
              <Plot data={[analyticsData.tesPcsData, {x:analyticsData.tesPcsData.rangeX, y:analyticsData.tesPcsData.rangeX, mode:'lines', line:{dash:'dot', color:'#cbd5e1'}, hoverinfo:'none'}]}
                  layout={{autosize:true, height:400, xaxis:{title:'PCS', range:analyticsData.tesPcsData.rangeX}, yaxis:{title:'TES', range:analyticsData.tesPcsData.rangeY}, showlegend:false, margin:{t:20, r:20, b:30, l:50}}}
                  style={{width:'100%'}} useResizeHandler={true} />
          </div>
      </div>

      {/* ROW 2: RADAR & CATEGORY HEATMAP */}
      <div className="charts-grid">
          <div className="analytics-card radar-card-layout">
              <div className="radar-chart-area">
                  <h3>Performance Profile</h3>
                  <Plot data={analyticsData.radarData} layout={{polar:{radialaxis:{visible:false, range:[0,10]}}, height:450, margin:{t:30, r:30, b:60, l:30}, showlegend:false}} style={{width:'100%'}} useResizeHandler={true}/>
              </div>
              <div className="radar-controls">
                  <h4>Select Skaters</h4>
                  <div className="radar-list">
                      {performances.map((p,idx) => (
                          <label key={p.id} className="radar-toggle-item">
                              <input type="checkbox" checked={radarSelectedIds.includes(p.id)} onChange={() => toggleRadarSkater(p.id)} />
                              <span className="radar-label-text"><span className="rank-badge" style={{backgroundColor:COLORS[idx%COLORS.length]}}>#{p.rank}</span>{p.skater_name.split(' ').slice(-1)[0]}</span>
                          </label>
                      ))}
                  </div>
              </div>
          </div>

          {/* CATEGORY HEATMAP (FULL WIDTH, NO SIDEBAR) */}
          <div className="analytics-card">
              <h3>Jump Arsenal (Avg. GOE)</h3>
              <p style={{fontSize:'0.85rem', color:'#64748b', marginTop:'-10px', marginBottom:'15px'}}>Drag tags to reorder columns</p>
              <DraggableColumnList items={categoryOrder} onReorder={setCategoryOrder} idPrefix="cat" />
              <Plot data={[analyticsData.heatmapData]}
                  layout={{autosize:true, height:400, margin:{t:10, r:20, b:40, l:80}, xaxis:{side:'bottom'}, yaxis:{automargin:true, tickfont:{family:'Hind', size:12, weight:600}}}}
                  style={{width:'100%'}} useResizeHandler={true} />
          </div>
      </div>

      {/* ROW 3: DETAILED HEATMAP (FULL WIDTH) */}
      <div className="analytics-row">
          <div className="analytics-card" style={{gridColumn:'1 / -1'}}>
              <h3>Detailed Jump Breakdown (GOE)</h3>
              <p style={{fontSize:'0.85rem', color:'#64748b', marginTop:'-10px', marginBottom:'15px'}}>Drag tags to reorder columns</p>
              <DraggableColumnList items={detailedOrder} onReorder={setDetailedOrder} idPrefix="det" />
              <Plot data={[analyticsData.detailedHeatmapData]}
                  layout={{autosize:true, height:500, margin:{t:10, r:20, b:80, l:100}, xaxis:{side:'bottom', tickangle:-45}, yaxis:{automargin:true, tickfont:{family:'Hind', size:12, weight:600}}}}
                  style={{width:'100%'}} useResizeHandler={true} />
          </div>
      </div>

      {/* ROW 4: BOX PLOT */}
      <div className="analytics-row">
          <div className="analytics-card" style={{gridColumn:'1 / -1'}}>
              <h3>Individual Judge TSS Tally Spreads</h3>
              <Plot data={analyticsData.boxData} layout={{autosize:true, height:500, yaxis:{title:'Total Segment Score'}, showlegend:false, margin:{t:30, r:30, b:80, l:60}}} style={{width:'100%'}} useResizeHandler={true}/>
          </div>
      </div>
      
      {/* TABLES */}
      <div className="analytics-row">
          <RankTable title="Highest Base Values" data={analyticsData.withBV} columns={[{header:'Skater', accessor:'skater_name', className:'bold-text'}, {header:'BV', accessor:'bv', render:r=>r.bv.toFixed(2)}]} />
          <RankTable title="Highest PCS" data={analyticsData.sortedPCS} columns={[{header:'Skater', accessor:'skater_name', className:'bold-text'}, {header:'PCS', accessor:'pcs_score', render:r=>r.pcs_score.toFixed(2)}]} />
          <RankTable title="Avg. Jump GOE" data={analyticsData.avgJumpGOE} columns={[{header:'Skater', accessor:'skater_name', className:'bold-text'}, {header:'Avg GOE', accessor:'avg_jump_goe', render:r=>`${r.avg_jump_goe.toFixed(2)}`}]} />
      </div>
      <div className="analytics-row">
          <RankTable title="Top Jumps" data={analyticsData.jumpsByScore} columns={[{header:'Skater', accessor:'skater', className:'bold-text'}, {header:'Element', accessor:'element_name'}, {header:'Score', accessor:'panel_score', render:r=>r.panel_score.toFixed(2)}]} />
          <RankTable title="Top Spins" data={analyticsData.spinsByScore} columns={[{header:'Skater', accessor:'skater', className:'bold-text'}, {header:'Element', accessor:'element_name'}, {header:'Score', accessor:'panel_score', render:r=>r.panel_score.toFixed(2)}]} />
      </div>
      <div className="analytics-row">
        <RankTable title="Top Step Sequences" data={analyticsData.stepsByScore} columns={[{header:'Skater', accessor:'skater', className:'bold-text'}, {header:'Element', accessor:'element_name'}, {header:'Score', accessor:'panel_score', render:r=>r.panel_score.toFixed(2)}]} />
        <RankTable title="Top Choreo Sequences" data={analyticsData.choreoByScore} columns={[{header:'Skater', accessor:'skater', className:'bold-text'}, {header:'Element', accessor:'element_name'}, {header:'Score', accessor:'panel_score', render:r=>r.panel_score.toFixed(2)}]} />
      </div>
    </div>
  );
}