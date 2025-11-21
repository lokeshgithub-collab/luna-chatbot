import React, { useState, useEffect, useRef } from 'react'; 
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler, 
} from 'chart.js';


ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler 
);

const MOOD_STORAGE_KEY = 'lunaMoodTracker';


const getLast7Days = () => {
  const dates = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' }));
  }
  return dates;
};

const Tracker = () => {
  const [moods, setMoods] = useState([]);
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const chartRef = useRef(null); 

  
  useEffect(() => {
    const storedMoods = localStorage.getItem(MOOD_STORAGE_KEY);
    let allMoods = [];
    if (storedMoods) {
      allMoods = JSON.parse(storedMoods);
    }
    setMoods(allMoods);
    
  }, []);

  
  const processChartData = (allMoods) => {
    const labels = getLast7Days();
    const data = [];
    const chart = chartRef.current; 

    
    let gradient = 'rgba(233, 69, 96, 0.1)'; 
    if (chart) { 
      const ctx = chart.ctx; 
      gradient = ctx.createLinearGradient(0, 0, 0, chart.height);
      gradient.addColorStop(0, 'rgba(233, 69, 96, 0.6)');   
      gradient.addColorStop(1, 'rgba(233, 69, 96, 0.05)'); 
    }

    const moodMap = new Map();
    allMoods.forEach(mood => {
        const date = new Date(mood.timestamp).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });
        if (!moodMap.has(date)) {
            moodMap.set(date, mood.value);
        }
    });

    labels.forEach(label => {
        data.push(moodMap.get(label) || null);
    });

    setChartData({
      labels,
      datasets: [
        {
          label: 'My Mood',
          data: data,
          fill: true, 
          backgroundColor: gradient, 
          borderColor: 'rgb(233, 69, 96)',
          pointBackgroundColor: '#fff',
          pointBorderColor: 'rgb(233, 69, 96)',
          pointHoverRadius: 7,
          spanGaps: true,
          tension: 0.3 
        },
      ],
    });
  };

  useEffect(() => {
    
    if (chartRef.current) {
      processChartData(moods);
    }
    
  }, [moods, chartRef.current]); 

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
        y: {
            min: 0.5,
            max: 3.5,
            ticks: {
                color: '#e3e3e3',
                stepSize: 1,
                callback: function(value) {
                    if (value === 1) return 'Sad';
                    if (value === 2) return 'Neutral';
                    if (value === 3) return 'Happy';
                    return '';
                }
            },
            grid: { color: 'rgba(227, 227, 227, 0.2)' }
        },
        x: {
            ticks: { color: '#e3e3e3' },
            grid: { color: 'rgba(227, 227, 227, 0.1)' }
        }
    },
    plugins: {
        legend: { display: false },
        title: {
            display: true,
            text: 'My Mood Over the Last 7 Days',
            color: '#e3e3e3',
            font: { size: 16 }
        },
    }
  };

  return (
    <div className="tracker-container">
      <h2>My Automatic Mood Log</h2>
      <p className="tracker-subtitle">Your daily mood is logged automatically based on our conversation.</p>
      
      <div className="chart-container">
        {}
        <Line ref={chartRef} options={chartOptions} data={chartData} />
      </div>
    </div>
  );
};

export default Tracker;