import { Chart, registerables } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { formatCompactCurrency, formatFullCurrency, formatPercent } from './formatters.js';

Chart.register(...registerables, zoomPlugin);

export class PortfolioChart {
  constructor(canvasElement, options = {}) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext('2d');
    this.chart = null;
    this.viewMode = 'annual'; // 'annual' | 'monthly'
    this.compareScenarios = false;
    this.goalTarget = null;
    this.onSelectPeriod = options.onSelectPeriod || null;
    this.activeSimulation = null;
    this.scenarioSimulations = null; // { conservative, optimistic }
    this.seriesVisibility = {
      portfolio: true,
      invested: true,
      returns: true,
      real: false,
    };
    this.currentZoom = null;

    this.initChart();
  }

  initChart() {
    const gradientPortfolio = this.ctx.createLinearGradient(0, 0, 0, 450);
    gradientPortfolio.addColorStop(0, 'rgba(16, 185, 129, 0.35)');
    gradientPortfolio.addColorStop(0.8, 'rgba(16, 185, 129, 0.02)');
    gradientPortfolio.addColorStop(1, 'rgba(16, 185, 129, 0)');

    const gradientReturns = this.ctx.createLinearGradient(0, 0, 0, 450);
    gradientReturns.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
    gradientReturns.addColorStop(1, 'rgba(245, 158, 11, 0)');

    this.chart = new Chart(this.ctx, {
      type: 'line',
      data: {
        labels: [],
        datasets: [],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 650,
          easing: 'easeOutQuart',
        },
        interaction: {
          mode: 'index',
          intersect: false,
        },
        onClick: (event, activeElements) => {
          if (!activeElements || activeElements.length === 0) return;
          const firstElem = activeElements[0];
          const index = firstElem.index;
          if (this.onSelectPeriod && this.activeSimulation) {
            if (this.viewMode === 'annual') {
              const yearData = this.activeSimulation.annualData[index];
              if (yearData) {
                this.onSelectPeriod({
                  mode: 'annual',
                  index: index + 1,
                  data: yearData,
                });
              }
            } else {
              const monthData = this.activeSimulation.monthlyData[index];
              if (monthData) {
                this.onSelectPeriod({
                  mode: 'monthly',
                  index: index + 1,
                  data: monthData,
                });
              }
            }
          }
        },
        plugins: {
          zoom: {
            pan: {
              enabled: false,
            },
            zoom: {
              wheel: {
                enabled: false,
              },
              pinch: {
                enabled: false,
              },
            },
          },
          legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
              color: '#94a3b8',
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 12,
                weight: '500',
              },
              usePointStyle: true,
              pointStyleWidth: 10,
              boxHeight: 7,
              padding: 16,
            },
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(15, 23, 42, 0.92)',
            titleColor: '#f8fafc',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(51, 65, 85, 0.7)',
            borderWidth: 1,
            padding: 14,
            boxPadding: 6,
            cornerRadius: 10,
            usePointStyle: true,
            titleFont: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 13,
              weight: '700',
            },
            bodyFont: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 12,
              weight: '500',
            },
            callbacks: {
              title: (tooltipItems) => {
                const item = tooltipItems[0];
                if (this.viewMode === 'annual') {
                  return `📅 Year ${item.label.replace('Y', '')}`;
                }
                return `📅 Month ${item.label.replace('M', '')}`;
              },
              afterBody: (tooltipItems) => {
                const idx = tooltipItems[0].dataIndex;
                const lines = [];
                if (this.viewMode === 'annual' && this.activeSimulation?.annualData[idx]) {
                  const d = this.activeSimulation.annualData[idx];
                  if (d.sipAmount > 0) lines.push(`SIP: ${formatCompactCurrency(d.sipAmount)}`);
                  if (d.lumpsumAmount > 0) lines.push(`Lumpsum: +${formatCompactCurrency(d.lumpsumAmount)}`);
                  if (d.swpAmount > 0) lines.push(`SWP: -${formatCompactCurrency(d.swpAmount)}`);
                  lines.push(`Return: ${formatPercent(d.returnRate)} (Growth: +${d.growthPercent.toFixed(1)}%)`);
                } else if (this.viewMode === 'monthly' && this.activeSimulation?.monthlyData[idx]) {
                  const d = this.activeSimulation.monthlyData[idx];
                  if (d.sipAmount > 0) lines.push(`SIP: ${formatCompactCurrency(d.sipAmount)}`);
                  if (d.lumpsumAmount > 0) lines.push(`Lumpsum: +${formatCompactCurrency(d.lumpsumAmount)}`);
                  if (d.swpAmount > 0) lines.push(`SWP: -${formatCompactCurrency(d.swpAmount)}`);
                }
                lines.push('💡 Click point to inspect & edit');
                return lines;
              },
              label: (context) => {
                const label = context.dataset.label || '';
                const val = context.parsed.y;
                return `${label}: ${formatFullCurrency(val)} (${formatCompactCurrency(val)})`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(51, 65, 85, 0.25)',
              drawBorder: false,
            },
            ticks: {
              color: '#94a3b8',
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 11,
              },
              maxRotation: 0,
              autoSkip: true,
              maxTicksLimit: 14,
            },
          },
          y: {
            position: 'right',
            grid: {
              color: 'rgba(51, 65, 85, 0.25)',
              drawBorder: false,
            },
            ticks: {
              color: '#94a3b8',
              font: {
                family: "'Plus Jakarta Sans', sans-serif",
                size: 11,
              },
              callback: (value) => formatCompactCurrency(value),
            },
          },
        },
      },
      plugins: [
        {
          id: 'customBackgroundDecorations',
          beforeDraw: (chart) => {
            if (!this.activeSimulation) return;
            const { ctx, chartArea, scales } = chart;
            if (!chartArea) return;

            // Draw SWP Withdrawal Phase background highlight strictly from SWP timeline start
            const isAnnual = this.viewMode === 'annual';
            const dataArray = isAnnual
              ? this.activeSimulation.annualData
              : this.activeSimulation.monthlyData;

            let swpStartIndex = -1;
            let swpEndIndex = -1;
            for (let i = 0; i < dataArray.length; i++) {
              if (dataArray[i].swpAmount > 0) {
                if (swpStartIndex === -1) swpStartIndex = i;
                swpEndIndex = i;
              }
            }

            if (swpStartIndex >= 0 && scales.x) {
              // Calculate exact horizontal pixel position for SWP start
              let startX = scales.x.getPixelForValue(swpStartIndex);

              // Fallback to dataset meta x coordinate
              if (isNaN(startX) || startX === null) {
                for (let d = 0; d < chart.data.datasets.length; d++) {
                  const meta = chart.getDatasetMeta(d);
                  if (meta && meta.data && meta.data[swpStartIndex]) {
                    startX = meta.data[swpStartIndex].x;
                    break;
                  }
                }
              }

              if (isNaN(startX) || startX === null) {
                const fraction = swpStartIndex / Math.max(1, dataArray.length - 1);
                startX = chartArea.left + fraction * (chartArea.right - chartArea.left);
              }

              startX = Math.max(chartArea.left, Math.min(chartArea.right, startX));

              // Calculate endX if SWP ends before timeline horizon
              let endX = chartArea.right;
              if (swpEndIndex >= 0 && swpEndIndex < dataArray.length - 1) {
                let pEnd = scales.x.getPixelForValue(swpEndIndex);
                if (isNaN(pEnd) || pEnd === null) {
                  for (let d = 0; d < chart.data.datasets.length; d++) {
                    const meta = chart.getDatasetMeta(d);
                    if (meta && meta.data && meta.data[swpEndIndex]) {
                      pEnd = meta.data[swpEndIndex].x;
                      break;
                    }
                  }
                }
                if (!isNaN(pEnd) && pEnd > startX) {
                  endX = Math.min(chartArea.right, pEnd);
                }
              }

              // Display Accumulation Phase tag before SWP start
              if (startX > chartArea.left + 90) {
                ctx.save();
                ctx.fillStyle = 'rgba(16, 185, 129, 0.75)';
                ctx.font = '700 10px Plus Jakarta Sans, sans-serif';
                ctx.fillText('🌱 ACCUMULATION PHASE', chartArea.left + 10, chartArea.top + 18);
                ctx.restore();
              }

              // Draw Withdrawal Phase shading ONLY from startX to endX
              if (endX > startX) {
                ctx.save();
                const swpGrad = ctx.createLinearGradient(startX, 0, endX, 0);
                swpGrad.addColorStop(0, 'rgba(249, 115, 22, 0.12)');
                swpGrad.addColorStop(1, 'rgba(239, 68, 68, 0.18)');
                ctx.fillStyle = swpGrad;
                ctx.fillRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top);

                // Vertical boundary line marking exact SWP timeline start
                ctx.strokeStyle = 'rgba(249, 115, 22, 0.85)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(startX, chartArea.top);
                ctx.lineTo(startX, chartArea.bottom);
                ctx.stroke();

                // Phase tag positioned strictly at startX
                ctx.fillStyle = 'rgba(251, 146, 60, 0.95)';
                ctx.font = '700 10px Plus Jakarta Sans, sans-serif';
                const periodLabel = isAnnual ? `Y${swpStartIndex + 1}` : `M${swpStartIndex + 1}`;
                const textX = Math.min(startX + 8, chartArea.right - 180);
                ctx.fillText(`⚡ WITHDRAWAL (from ${periodLabel})`, Math.max(startX + 8, textX), chartArea.top + 18);
                ctx.restore();
              }
            }

            // Draw Target Goal Line if configured
            if (this.goalTarget && this.goalTarget > 0 && scales.y) {
              const yPixel = scales.y.getPixelForValue(this.goalTarget);
              if (yPixel >= chartArea.top && yPixel <= chartArea.bottom) {
                ctx.save();
                ctx.strokeStyle = 'rgba(236, 72, 153, 0.8)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([5, 4]);
                ctx.beginPath();
                ctx.moveTo(chartArea.left, yPixel);
                ctx.lineTo(chartArea.right, yPixel);
                ctx.stroke();

                // Target badge
                ctx.fillStyle = '#ec4899';
                ctx.font = '700 10px Plus Jakarta Sans, sans-serif';
                ctx.fillText(`🎯 Goal: ${formatCompactCurrency(this.goalTarget)}`, chartArea.left + 10, yPixel - 5);
                ctx.restore();
              }
            }
          },
        },
      ],
    });
  }

  updateData(simulation, scenarioSimulations = null) {
    this.activeSimulation = simulation;
    this.scenarioSimulations = scenarioSimulations;

    const isAnnual = this.viewMode === 'annual';
    const sourceData = isAnnual ? simulation.annualData : simulation.monthlyData;

    const labels = sourceData.map((d) => (isAnnual ? `Y${d.year}` : `M${d.month}`));
    const portfolioValues = sourceData.map((d) => d.closingBalance);
    const investedValues = sourceData.map((d) => d.cumulativeInvested);
    const returnsValues = sourceData.map((d) => d.cumulativeReturns);
    const realValues = sourceData.map((d) => d.realClosingBalance);

    const datasets = [];

    if (this.seriesVisibility.portfolio) {
      datasets.push({
        label: 'Portfolio Value',
        data: portfolioValues,
        borderColor: '#10b981', // Emerald
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 3.5,
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointRadius: isAnnual ? 5 : 2.5,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: '#34d399',
        pointHoverBorderColor: '#ffffff',
        pointHoverBorderWidth: 2,
        order: 1,
      });
    }

    if (this.seriesVisibility.invested) {
      datasets.push({
        label: 'Invested Capital',
        data: investedValues,
        borderColor: '#6366f1', // Indigo
        borderWidth: 2.2,
        tension: 0.25,
        fill: false,
        pointBackgroundColor: '#6366f1',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 1.5,
        pointRadius: isAnnual ? 4 : 1.5,
        pointHoverRadius: 6,
        order: 2,
      });
    }

    if (this.seriesVisibility.returns) {
      datasets.push({
        label: 'Estimated Returns',
        data: returnsValues,
        borderColor: '#f59e0b', // Amber
        borderWidth: 2,
        borderDash: [4, 4],
        tension: 0.3,
        fill: false,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 1.5,
        pointRadius: isAnnual ? 3.5 : 1,
        pointHoverRadius: 6,
        order: 3,
      });
    }

    if (this.seriesVisibility.real) {
      datasets.push({
        label: 'Inflation-Adjusted (Real)',
        data: realValues,
        borderColor: '#06b6d4', // Cyan
        borderWidth: 2,
        borderDash: [3, 3],
        tension: 0.3,
        fill: false,
        pointBackgroundColor: '#06b6d4',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 1.5,
        pointRadius: isAnnual ? 3.5 : 1,
        pointHoverRadius: 6,
        order: 4,
      });
    }

    // Multi-Scenario comparison lines
    if (this.compareScenarios && scenarioSimulations) {
      if (scenarioSimulations.conservative) {
        const cSource = isAnnual
          ? scenarioSimulations.conservative.annualData
          : scenarioSimulations.conservative.monthlyData;
        datasets.push({
          label: 'Conservative (8%)',
          data: cSource.map((d) => d.closingBalance),
          borderColor: '#94a3b8',
          borderWidth: 1.8,
          borderDash: [6, 4],
          tension: 0.3,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 4,
          order: 5,
        });
      }

      if (scenarioSimulations.optimistic) {
        const oSource = isAnnual
          ? scenarioSimulations.optimistic.annualData
          : scenarioSimulations.optimistic.monthlyData;
        datasets.push({
          label: 'Optimistic (15%)',
          data: oSource.map((d) => d.closingBalance),
          borderColor: '#38bdf8',
          borderWidth: 1.8,
          borderDash: [6, 4],
          tension: 0.3,
          fill: false,
          pointRadius: 0,
          pointHoverRadius: 4,
          order: 6,
        });
      }
    }

    this.chart.data.labels = labels;
    this.chart.data.datasets = datasets;
    if (this.currentZoom) {
      this.applyZoomBounds();
    } else {
      delete this.chart.options.scales.x.min;
      delete this.chart.options.scales.x.max;
    }
    this.chart.update();
  }

  setSeriesVisibility(key, visible) {
    if (this.seriesVisibility[key] !== undefined) {
      this.seriesVisibility[key] = visible;
      if (this.activeSimulation) {
        this.updateData(this.activeSimulation, this.scenarioSimulations);
      }
    }
  }

  setViewMode(mode) {
    this.viewMode = mode;
    if (this.activeSimulation) {
      this.updateData(this.activeSimulation, this.scenarioSimulations);
    }
  }

  setCompareScenarios(enable) {
    this.compareScenarios = enable;
    if (this.activeSimulation) {
      this.updateData(this.activeSimulation, this.scenarioSimulations);
    }
  }

  setGoalTarget(amount) {
    this.goalTarget = amount;
    if (this.chart) {
      this.chart.update('none');
    }
  }

  zoomToYearRange(fromYear, toYear) {
    const from = Math.min(Number(fromYear), Number(toYear));
    const to = Math.max(Number(fromYear), Number(toYear));
    this.currentZoom = { fromYear: from, toYear: to };
    this.applyZoomBounds();
    this.chart.update();
  }

  applyZoomBounds() {
    if (!this.chart || !this.currentZoom) return;
    const { fromYear, toYear } = this.currentZoom;
    const isAnnual = this.viewMode === 'annual';
    const labels = this.chart.data.labels || [];

    let minLabel = isAnnual ? `Y${fromYear}` : `M${(fromYear - 1) * 12 + 1}`;
    let maxLabel = isAnnual ? `Y${toYear}` : `M${toYear * 12}`;

    if (labels.length > 0) {
      if (!labels.includes(minLabel)) minLabel = labels[0];
      if (!labels.includes(maxLabel)) maxLabel = labels[labels.length - 1];
    }

    this.chart.options.scales.x.min = minLabel;
    this.chart.options.scales.x.max = maxLabel;
  }

  resetZoom() {
    this.currentZoom = null;
    if (this.chart) {
      delete this.chart.options.scales.x.min;
      delete this.chart.options.scales.x.max;
      if (this.chart.scales && this.chart.scales.x) {
        delete this.chart.scales.x.options.min;
        delete this.chart.scales.x.options.max;
        delete this.chart.scales.x.min;
        delete this.chart.scales.x.max;
      }
      this.chart.update();
    }
  }
}
