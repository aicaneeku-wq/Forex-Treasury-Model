import { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Shield, AlertTriangle, 
  Upload, DollarSign, BarChart3, PieChart, Activity,
  ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell
} from 'recharts';

// Types
interface Exposure {
  id: string;
  poNo: string;
  vendorName: string;
  businessUnit: string;
  project: string;
  exposureType: 'Import' | 'Export';
  currency: string;
  fcAmount: number;
  dueDate: Date;
  country: string;
  remarks: string;
  inrAmount: number;
  spotRate: number;
  daysToMaturity: number;
  maturityBucket: string;
}

interface FXRate {
  currency: string;
  spotRate: number;
  oneMonth: number;
  threeMonth: number;
  sixMonth: number;
  change: number;
}

// Mock FX Rates
const generateFXRates = (): FXRate[] => [
  { currency: 'USD', spotRate: 83.45, oneMonth: 83.55, threeMonth: 83.75, sixMonth: 84.10, change: 0.15 },
  { currency: 'EUR', spotRate: 90.25, oneMonth: 90.65, threeMonth: 91.45, sixMonth: 92.80, change: -0.22 },
  { currency: 'GBP', spotRate: 105.50, oneMonth: 105.90, threeMonth: 106.70, sixMonth: 108.00, change: 0.08 },
  { currency: 'JPY', spotRate: 0.56, oneMonth: 0.565, threeMonth: 0.57, sixMonth: 0.58, change: -0.05 },
  { currency: 'CNY', spotRate: 11.50, oneMonth: 11.55, threeMonth: 11.65, sixMonth: 11.80, change: 0.12 },
];

// Helper functions
const formatCurrency = (val: number) => `₹${(val/10000000).toFixed(2)} Cr`;

const getMaturityBucket = (days: number): string => {
  if (days <= 30) return '0-30 Days';
  if (days <= 90) return '31-90 Days';
  if (days <= 180) return '91-180 Days';
  if (days <= 365) return '181-365 Days';
  return 'Above 365 Days';
};

// CSV Parser
const parseCSV = (text: string, fxRates: FXRate[]): Exposure[] => {
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
  
  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    
    const getValue = (keys: string[]) => {
      for (const key of keys) {
        const idx = headers.findIndex(h => h.includes(key));
        if (idx !== -1 && values[idx]) return values[idx];
      }
      return '';
    };

    const poNo = getValue(['po', 'po no', 'pono']);
    const vendorName = getValue(['vendor', 'vendor name', 'supplier']);
    const businessUnit = getValue(['business', 'unit', 'bu']);
    const project = getValue(['project', 'project name']);
    const exposureType = getValue(['type', 'exposure', 'exposure type']) as 'Import' | 'Export';
    const currency = getValue(['currency', 'ccy', 'curr']).toUpperCase();
    const fcAmount = parseFloat(getValue(['amount', 'fc amount', 'foreign'])) || 0;
    const dueDateStr = getValue(['due', 'date', 'maturity', 'due date']);
    const country = getValue(['country']);
    const remarks = getValue(['remarks', 'notes']);

    let dueDate = new Date();
    if (dueDateStr) {
      const parsed = new Date(dueDateStr);
      if (!isNaN(parsed.getTime())) dueDate = parsed;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const daysToMaturity = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const rate = fxRates.find(f => f.currency === currency)?.spotRate || 83;
    const inrAmount = fcAmount * rate;

    return {
      id: `EXP-${index}`,
      poNo: poNo || `PO${index}`,
      vendorName: vendorName || 'Unknown',
      businessUnit: businessUnit || 'General',
      project: project || 'General',
      exposureType: exposureType || 'Import',
      currency: currency || 'USD',
      fcAmount: fcAmount || 0,
      dueDate,
      country: country || 'Unknown',
      remarks,
      inrAmount,
      spotRate: rate,
      daysToMaturity: daysToMaturity > 0 ? daysToMaturity : 0,
      maturityBucket: getMaturityBucket(daysToMaturity > 0 ? daysToMaturity : 0),
    };
  }).filter(exp => exp.fcAmount > 0);
};

// Components
const KPICard = ({ title, value, subtitle, icon: Icon, color }: any) => {
  const colorMap: any = {
    blue: '#3b82f6',
    green: '#10b981',
    red: '#ef4444',
    amber: '#f59e0b',
    purple: '#8b5cf6',
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className="kpi-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <p className="text-slate" style={{ fontSize: '14px' }}>{title}</p>
          <p className="kpi-value">{value}</p>
          {subtitle && <p className="text-slate" style={{ fontSize: '12px' }}>{subtitle}</p>}
        </div>
        <div className="kpi-icon">
          <Icon size={24} color={c} />
        </div>
      </div>
    </div>
  );
};

const ExposureTable = ({ data }: { data: Exposure[] }) => (
  <div className="card">
    <div className="card-header">
      <h3 className="card-title">
        <BarChart3 size={20} className="text-blue" />
        Open Exposure Details ({data.length} Records)
      </h3>
    </div>
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>PO No</th>
            <th>Vendor</th>
            <th>Type</th>
            <th>Currency</th>
            <th style={{ textAlign: 'right' }}>FC Amount</th>
            <th style={{ textAlign: 'right' }}>INR Value</th>
            <th>Due Date</th>
            <th>Maturity</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                No exposure data. Please upload a file.
              </td>
            </tr>
          ) : (
            data.map((exp) => (
              <tr key={exp.id}>
                <td style={{ fontWeight: 500 }}>{exp.poNo}</td>
                <td>{exp.vendorName}</td>
                <td>
                  <span className={`badge ${exp.exposureType === 'Import' ? 'badge-red' : 'badge-green'}`}>
                    {exp.exposureType}
                  </span>
                </td>
                <td>
                  <span className="badge badge-blue">{exp.currency}</span>
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                  {exp.fcAmount.toLocaleString('en-IN')}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 600, fontFamily: 'monospace' }}>
                  {formatCurrency(exp.inrAmount)}
                </td>
                <td style={{ fontSize: '13px' }}>
                  {exp.dueDate.toLocaleDateString('en-IN')}
                </td>
                <td>
                  <span className={`badge ${
                    exp.daysToMaturity <= 30 ? 'badge-red' :
                    exp.daysToMaturity <= 90 ? 'badge-amber' :
                    'badge-blue'
                  }`}>
                    {exp.maturityBucket}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const ForecastChart = ({ data }: { data: any[] }) => (
  <div className="card">
    <h3 className="card-title mb-4">
      <Activity size={20} className="text-purple" />
      USD/INR Forecast (30 Days)
    </h3>
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
          <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={12} />
          <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
          <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const MaturityChart = ({ data }: { data: any[] }) => {
  const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6'];
  
  return (
    <div className="card">
      <h3 className="card-title mb-4">
        <PieChart size={20} className="text-amber" />
        Exposure by Maturity
      </h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPie>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}
              formatter={(value: any) => [formatCurrency(value), '']}
            />
          </RechartsPie>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const HedgeRecommendation = ({ exposures }: { exposures: Exposure[] }) => {
  const policy = [
    { bucket: '0-30 Days', hedge: 100 },
    { bucket: '31-90 Days', hedge: 75 },
    { bucket: '91-180 Days', hedge: 50 },
    { bucket: '181-365 Days', hedge: 25 },
    { bucket: 'Above 365 Days', hedge: 10 },
  ];

  const recommendations = useMemo(() => {
    return exposures.map(exp => {
      const policyItem = policy.find(p => p.bucket === exp.maturityBucket);
      const hedgePct = policyItem?.hedge || 0;
      return {
        ...exp,
        hedgePct,
        hedgeAmount: exp.inrAmount * (hedgePct / 100),
        unhedged: exp.inrAmount * (1 - hedgePct / 100),
      };
    });
  }, [exposures]);

  const totalHedge = recommendations.reduce((s, r) => s + r.hedgeAmount, 0);
  const totalUnhedged = recommendations.reduce((s, r) => s + r.unhedged, 0);

  return (
    <div className="card">
      <h3 className="card-title mb-4">
        <Shield size={20} className="text-green" />
        Hedge Recommendations
      </h3>
      
      <div className="grid-2" style={{ marginBottom: '16px' }}>
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '8px', padding: '16px' }}>
          <p className="text-green" style={{ fontSize: '12px' }}>Recommended Hedge</p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#34d399' }}>{formatCurrency(totalHedge)}</p>
        </div>
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', padding: '16px' }}>
          <p className="text-red" style={{ fontSize: '12px' }}>Unhedged Risk</p>
          <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171' }}>{formatCurrency(totalUnhedged)}</p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {recommendations.slice(0, 5).map((rec) => (
          <div key={rec.id} style={{ background: '#0f172a', borderRadius: '8px', padding: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 500 }}>{rec.poNo}</span>
              <span className="text-slate" style={{ fontSize: '12px' }}>{rec.currency}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="text-slate" style={{ fontSize: '12px' }}>Exposure: {formatCurrency(rec.inrAmount)}</span>
              <span className={`font-medium ${rec.hedgePct >= 75 ? 'text-green' : rec.hedgePct >= 50 ? 'text-amber' : 'text-red'}`} style={{ fontSize: '12px' }}>
                {rec.hedgePct}% Hedge
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${rec.hedgePct}%` }}></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FXRateTable = ({ rates }: { rates: FXRate[] }) => (
  <div className="card">
    <div className="card-header">
      <h3 className="card-title">
        <DollarSign size={20} className="text-green" />
        Live FX Rates (INR)
      </h3>
    </div>
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Currency</th>
            <th style={{ textAlign: 'right' }}>Spot</th>
            <th style={{ textAlign: 'right' }}>1M Fwd</th>
            <th style={{ textAlign: 'right' }}>3M Fwd</th>
            <th style={{ textAlign: 'right' }}>6M Fwd</th>
            <th style={{ textAlign: 'right' }}>Change</th>
          </tr>
        </thead>
        <tbody>
          {rates.map((rate) => (
            <tr key={rate.currency}>
              <td><span className="badge badge-blue" style={{ fontWeight: 'bold' }}>{rate.currency}</span></td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{rate.spotRate.toFixed(2)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{rate.oneMonth.toFixed(2)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{rate.threeMonth.toFixed(2)}</td>
              <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>{rate.sixMonth.toFixed(2)}</td>
              <td style={{ textAlign: 'right' }}>
                <span className={`flex items-center justify-end gap-1 ${rate.change >= 0 ? 'text-green' : 'text-red'}`} style={{ fontSize: '13px' }}>
                  {rate.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {Math.abs(rate.change).toFixed(2)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const ExecutiveSummary = ({ exposures }: { exposures: Exposure[] }) => {
  const totalExposure = exposures.reduce((s, e) => s + e.inrAmount, 0);
  const importExposure = exposures.filter(e => e.exposureType === 'Import').reduce((s, e) => s + e.inrAmount, 0);
  const exportExposure = exposures.filter(e => e.exposureType === 'Export').reduce((s, e) => s + e.inrAmount, 0);
  const netExposure = importExposure - exportExposure;

  return (
    <div className="card" style={{ background: 'linear-gradient(135deg, #1e3a8a, #581c87)' }}>
      <h3 className="card-title mb-4">
        <AlertTriangle size={20} className="text-amber" />
        Executive Summary
      </h3>
      <p style={{ color: '#e2e8f0', lineHeight: 1.6, fontSize: '14px' }}>
        Total forex exposure stands at <strong style={{ color: 'white' }}>{formatCurrency(totalExposure)}</strong>. 
        Import exposure of <span style={{ color: '#fca5a5' }}>{formatCurrency(importExposure)}</span> is partially 
        offset by export inflows of <span style={{ color: '#86efac' }}>{formatCurrency(exportExposure)}</span>, 
        resulting in a net payable position of <strong style={{ color: 'white' }}>{formatCurrency(netExposure)}</strong>.
      </p>
    </div>
  );
};

// File Upload Component
const FileUpload = ({ onFileLoad }: { onFileLoad: (data: Exposure[]) => void }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const text = await file.text();
      const fxRates = generateFXRates();
      const parsedData = parseCSV(text, fxRates);
      
      if (parsedData.length === 0) {
        setError('No valid data found. Please check the file format.');
      } else {
        onFileLoad(parsedData);
      }
    } catch (err) {
      setError('Failed to read file. Please ensure it is a valid CSV file.');
    }
    
    setIsProcessing(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="card">
      <h2 className="card-title mb-4">
        <Upload size={20} className="text-blue" />
        Upload Open Exposure File
      </h2>
      
      <div 
        className="upload-zone"
        style={{ 
          borderColor: isDragging ? '#3b82f6' : '#334155',
          background: isDragging ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isProcessing ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #334155', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <p className="text-slate">Processing file...</p>
          </div>
        ) : (
          <>
            <Upload size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p className="text-slate">Drag & drop your exposure file here</p>
            <p className="text-slate" style={{ fontSize: '12px', marginTop: '8px' }}>Supports CSV format</p>
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileInput}
              style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', cursor: 'pointer' }}
            />
          </>
        )}
      </div>

      {error && (
        <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', borderRadius: '8px', color: '#f87171' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '20px', padding: '16px', background: '#0f172a', borderRadius: '8px' }}>
        <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>Expected File Format:</h4>
        <div className="table-container">
          <table style={{ fontSize: '12px' }}>
            <thead>
              <tr>
                <th>PO No</th>
                <th>Vendor Name</th>
                <th>Business Unit</th>
                <th>Project</th>
                <th>Exposure Type</th>
                <th>Currency</th>
                <th>FC Amount</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>PO001</td>
                <td>SMS Group</td>
                <td>Projects</td>
                <td>Blast Furnace</td>
                <td>Import</td>
                <td>EUR</td>
                <td>500000</td>
                <td>31-Aug-2026</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Main App
export default function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const [exposures, setExposures] = useState<Exposure[]>([]);
  
  const fxRates = useMemo(() => generateFXRates(), []);

  const maturityData = useMemo(() => {
    const buckets = ['0-30 Days', '31-90 Days', '91-180 Days', '181-365 Days', 'Above 365 Days'];
    return buckets.map(bucket => ({
      name: bucket,
      value: exposures.filter(e => e.maturityBucket === bucket).reduce((s, e) => s + e.inrAmount, 0)
    }));
  }, [exposures]);

  const forecastData = useMemo(() => {
    const data = [];
    let rate = 83.45;
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const forecast = rate + (Math.random() - 0.5) * 0.5;
      data.push({
        date: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
        actual: i < 5 ? rate + (Math.random() - 0.5) * 0.2 : null,
        forecast: i >= 5 ? forecast : null,
      });
      rate = forecast;
    }
    return data;
  }, []);

  const totalExposure = exposures.reduce((s, e) => s + e.inrAmount, 0);
  const importExposure = exposures.filter(e => e.exposureType === 'Import').reduce((s, e) => s + e.inrAmount, 0);
  const exportExposure = exposures.filter(e => e.exposureType === 'Export').reduce((s, e) => s + e.inrAmount, 0);

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Header */}
      <header className="header">
        <div className="logo">
          <div className="logo-icon">
            <TrendingUp size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold' }}>Forex Treasury Management</h1>
            <p className="text-slate" style={{ fontSize: '12px' }}>Enterprise Risk & Hedging Model</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => setActiveTab('upload')}>
            <Upload size={16} />
            Upload Exposure
          </button>
          <div style={{ textAlign: 'right' }}>
            <p className="text-slate" style={{ fontSize: '12px' }}>Last Updated</p>
            <p style={{ fontSize: '14px' }}>{new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="nav">
        {['upload', 'dashboard', 'exposures', 'hedging', 'forecast'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`nav-btn ${activeTab === tab ? 'active' : ''}`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="container">
        {activeTab === 'upload' && (
          <FileUpload onFileLoad={(data) => { setExposures(data); setActiveTab('dashboard'); }} />
        )}

        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {exposures.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
                <Upload size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <h2 style={{ marginBottom: '12px' }}>No Exposure Data</h2>
                <p className="text-slate" style={{ marginBottom: '20px' }}>Please upload your exposure file to view the dashboard.</p>
                <button className="btn btn-primary" onClick={() => setActiveTab('upload')}>
                  Upload File
                </button>
              </div>
            ) : (
              <>
                <div className="kpi-grid">
                  <KPICard title="Total Forex Exposure" value={formatCurrency(totalExposure)} subtitle="Across all currencies" icon={DollarSign} color="blue" />
                  <KPICard title="Import Payables" value={formatCurrency(importExposure)} subtitle="Net outflow requirement" icon={TrendingDown} color="red" />
                  <KPICard title="Export Receivables" value={formatCurrency(exportExposure)} subtitle="Natural hedge" icon={TrendingUp} color="green" />
                  <KPICard title="Hedge Coverage" value="52%" subtitle="Policy compliance" icon={Shield} color="purple" />
                </div>

                <ExecutiveSummary exposures={exposures} />

                <div className="grid-2">
                  <ForecastChart data={forecastData} />
                  <MaturityChart data={maturityData} />
                </div>

                <div className="grid-2">
                  <FXRateTable rates={fxRates} />
                  <HedgeRecommendation exposures={exposures} />
                </div>

                <ExposureTable data={exposures} />
              </>
            )}
          </div>
        )}

        {activeTab === 'exposures' && <ExposureTable data={exposures} />}
        
        {activeTab === 'hedging' && <HedgeRecommendation exposures={exposures} />}
        
        {activeTab === 'forecast' && <ForecastChart data={forecastData} />}
      </main>
    </div>
  );
}