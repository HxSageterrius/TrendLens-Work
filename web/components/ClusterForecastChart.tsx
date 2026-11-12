'use client';

import React from 'react';
import 'chart.js/auto';
import { Line } from 'react-chartjs-2';

interface ClusterForecastChartProps {
  domain: string;
  clusterName: string;
  label: string;
  history: { year: number; share: number }[];
  forecast: { year: number; yhat: number; lower: number; upper: number }[];
}

export default function ClusterForecastChart({
  domain,
  clusterName,
  label,
  history,
  forecast,
}: ClusterForecastChartProps) {
  const pad = (n: number) => Array(n).fill(null);
  const histShares = history.map((h) => h.share);
  const histYears = history.map((h) => h.year);
  const fcYears = forecast.map((f) => f.year);
  const allYears = [...histYears, ...fcYears];
  const n = histShares.length > 0 ? histShares.length - 1 : 0;
  const lastVal = histShares[n] ?? 0;

  const fcLine = (key: 'yhat' | 'lower' | 'upper') => [
    ...pad(n),
    lastVal,
    ...forecast.map((f) => f[key]),
  ];

  const accentColor =
    label === 'emerging'
      ? '#2E7D32'
      : label === 'declining'
      ? '#D32F2F'
      : '#393E46';

  const chartData = {
    labels: allYears,
    datasets: [
      {
        label: 'Historical Share (%)',
        data: [...histShares, ...pad(forecast.length)],
        borderColor: accentColor,
        backgroundColor: accentColor,
        borderWidth: 2.8,
        pointRadius: 4.5,
        pointHoverRadius: 6.5,
        tension: 0.25,
      },
      {
        label: 'Prophet Forecast (yhat)',
        data: fcLine('yhat'),
        borderColor: '#222831',
        borderDash: [5, 5],
        borderWidth: 2.2,
        pointRadius: 4,
        pointBackgroundColor: '#FFD369',
        pointBorderColor: '#222831',
        tension: 0.25,
      },
      {
        label: 'Lower 80% Bound',
        data: fcLine('lower'),
        borderWidth: 0,
        pointRadius: 0,
      },
      {
        label: 'Forecast 80% CI',
        data: fcLine('upper'),
        borderWidth: 0,
        pointRadius: 0,
        fill: '-1',
        backgroundColor: 'rgba(255, 211, 105, 0.22)',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(34, 40, 49, 0.06)' },
        ticks: { color: '#6B7280', font: { family: 'Plus Jakarta Sans', size: 11 } },
        title: {
          display: true,
          text: 'Share of Domain (%)',
          color: '#393E46',
          font: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' as const },
        },
      },
      x: {
        grid: { display: false },
        ticks: { color: '#6B7280', font: { family: 'Plus Jakarta Sans', size: 11 } },
      },
    },
    plugins: {
      legend: {
        labels: {
          color: '#222831',
          font: { family: 'Plus Jakarta Sans', size: 12, weight: 'bold' as const },
          filter: (item: any) => item.text !== 'Lower 80% Bound',
        },
      },
      tooltip: {
        backgroundColor: '#222831',
        titleColor: '#FFD369',
        bodyColor: '#FFFFFF',
        borderColor: '#393E46',
        borderWidth: 1,
        padding: 10,
      },
    },
  };

  return (
    <div style={{ width: '100%', height: 360 }}>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}
