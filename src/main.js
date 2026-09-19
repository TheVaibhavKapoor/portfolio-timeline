import { simulatePortfolio, solveRequiredSIP } from './engine.js';
import { PortfolioChart } from './chart.js';
import { PortfolioTimeline } from './timeline.js';
import { PRESETS } from './presets.js';
import { initScrollytelling } from './scrollytelling.js';
import {
  formatCompactCurrency,
  formatFullCurrency,
  formatPercent,
  formatMonthTime,
  setCurrency,
  currentCurrency,
} from './formatters.js';

// Application State
const state = {
  config: JSON.parse(JSON.stringify(PRESETS[0].config)),
  simulation: null,
  scenarioSimulations: null,
  selectedPeriod: null, // { mode: 'annual' | 'monthly', index: number, data: object }
  editingEventId: null,
  activeEventType: 'lumpsum',
  viewMode: 'annual',
  compareScenarios: false,
  goalTarget: 10000000, // ₹1 Cr
  showGoalTarget: false,
  useRealCorpus: false,
};

// DOM References
const elements = {
  // Header controls
  currInrBtn: document.getElementById('currInrBtn'),
  currUsdBtn: document.getElementById('currUsdBtn'),
  presetSelect: document.getElementById('presetSelect'),
  resetDefaultsBtn: document.getElementById('resetDefaultsBtn'),
  openGoalModalBtn: document.getElementById('openGoalModalBtn'),

  // Assumptions & Accordion Dropdown
  parametersPanel: document.getElementById('parametersPanel'),
  parametersToggleBtn: document.getElementById('parametersToggleBtn'),
  parametersToggleLabel: document.getElementById('parametersToggleLabel'),
  chipHorizon: document.getElementById('chipHorizon'),
  chipReturn: document.getElementById('chipReturn'),
  chipLumpsum: document.getElementById('chipLumpsum'),
  chipSip: document.getElementById('chipSip'),
  chipInflation: document.getElementById('chipInflation'),
  horizonInput: document.getElementById('horizonInput'),
  horizonLabel: document.getElementById('horizonLabel'),
  returnInput: document.getElementById('returnInput'),
  compoundingSelect: document.getElementById('compoundingSelect'),
  inflationInput: document.getElementById('inflationInput'),
  realCorpusToggle: document.getElementById('realCorpusToggle'),
  initialInvestmentInput: document.getElementById('initialInvestmentInput'),
  topSipInput: document.getElementById('topSipInput'),
  topSipFormatted: document.getElementById('topSipFormatted'),
  topSipStepUpInput: document.getElementById('topSipStepUpInput'),
  topSipStepUpStartYear: document.getElementById('topSipStepUpStartYear'),
  topSipStepUpAddon: document.getElementById('topSipStepUpAddon'),
  sipTopUpTypePercentBtn: document.getElementById('sipTopUpTypePercentBtn'),
  sipTopUpTypeAbsoluteBtn: document.getElementById('sipTopUpTypeAbsoluteBtn'),
  scenarioPills: document.querySelectorAll('.scenario-pill'),

  // Metric Cards
  metricFinalCorpus: document.getElementById('metricFinalCorpus'),
  metricGrowthMultiple: document.getElementById('metricGrowthMultiple'),
  metricRealCorpusNote: document.getElementById('metricRealCorpusNote'),
  metricTotalInvested: document.getElementById('metricTotalInvested'),
  metricInvestedBreakdown: document.getElementById('metricInvestedBreakdown'),
  metricWealthCreated: document.getElementById('metricWealthCreated'),
  metricProfitPercent: document.getElementById('metricProfitPercent'),
  metricTotalWithdrawn: document.getElementById('metricTotalWithdrawn'),
  metricWithdrawalCount: document.getElementById('metricWithdrawalCount'),
  metricXirr: document.getElementById('metricXirr'),
  depletionAlert: document.getElementById('depletionAlert'),
  depletionAlertMsg: document.getElementById('depletionAlertMsg'),
  fixDepletionBtn: document.getElementById('fixDepletionBtn'),

  // Chart
  chartCanvas: document.getElementById('portfolioChart'),
  chartHorizonBadge: document.getElementById('chartHorizonBadge'),
  viewAnnualBtn: document.getElementById('viewAnnualBtn'),
  viewMonthlyBtn: document.getElementById('viewMonthlyBtn'),
  toggleCompareScenariosBtn: document.getElementById('toggleCompareScenariosBtn'),
  toggleGoalMarkerBtn: document.getElementById('toggleGoalMarkerBtn'),
  toggleSeriesPortfolio: document.getElementById('toggleSeriesPortfolio'),
  toggleSeriesInvested: document.getElementById('toggleSeriesInvested'),
  toggleSeriesReturns: document.getElementById('toggleSeriesReturns'),
  toggleSeriesReal: document.getElementById('toggleSeriesReal'),
  openZoomRangeBtn: document.getElementById('openZoomRangeBtn'),
  resetZoomBtn: document.getElementById('resetZoomBtn'),
  zoomRangePopover: document.getElementById('zoomRangePopover'),
  closeZoomPopoverBtn: document.getElementById('closeZoomPopoverBtn'),
  zoomFromSelect: document.getElementById('zoomFromSelect'),
  zoomToSelect: document.getElementById('zoomToSelect'),
  zoomPresetPills: document.querySelectorAll('.zoom-preset-pill'),
  resetZoomInnerBtn: document.getElementById('resetZoomInnerBtn'),
  applyZoomRangeBtn: document.getElementById('applyZoomRangeBtn'),

  // Timeline
  timelineContainer: document.getElementById('timelineContainer'),
  openAddEventModalBtn: document.getElementById('openAddEventModalBtn'),
  openAddEventBtn2: document.getElementById('openAddEventBtn2'),

  // Events List & Ledger
  eventsListContainer: document.getElementById('eventsListContainer'),
  ledgerGranularitySelect: document.getElementById('ledgerGranularitySelect'),
  ledgerHeaderRow: document.getElementById('ledgerHeaderRow'),
  ledgerTableBody: document.getElementById('ledgerTableBody'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),

  // Slide-over Drawer
  drawerBackdrop: document.getElementById('drawerBackdrop'),
  drawerPanel: document.getElementById('drawerPanel'),
  drawerTitle: document.getElementById('drawerTitle'),
  drawerSubtitle: document.getElementById('drawerSubtitle'),
  closeDrawerBtn: document.getElementById('closeDrawerBtn'),
  cancelDrawerBtn: document.getElementById('cancelDrawerBtn'),
  applyDrawerBtn: document.getElementById('applyDrawerBtn'),
  drawerOpeningCorpus: document.getElementById('drawerOpeningCorpus'),
  drawerClosingCorpus: document.getElementById('drawerClosingCorpus'),
  drawerGrowthPercent: document.getElementById('drawerGrowthPercent'),
  drawerLumpsumInput: document.getElementById('drawerLumpsumInput'),
  drawerLumpsumMonthLabel: document.getElementById('drawerLumpsumMonthLabel'),
  drawerSipInput: document.getElementById('drawerSipInput'),
  drawerSipHint: document.getElementById('drawerSipHint'),
  drawerSwpInput: document.getElementById('drawerSwpInput'),
  drawerReturnOverrideInput: document.getElementById('drawerReturnOverrideInput'),

  // Modal
  eventModal: document.getElementById('eventModal'),
  modalTitle: document.getElementById('modalTitle'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelModalBtn: document.getElementById('cancelModalBtn'),
  saveEventModalBtn: document.getElementById('saveEventModalBtn'),
  segmentedOptions: document.querySelectorAll('.segmented-option'),
  modalEventName: document.getElementById('modalEventName'),
  modalEventAmount: document.getElementById('modalEventAmount'),
  modalAmountLabel: document.getElementById('modalAmountLabel'),
  modalAmountAddon: document.getElementById('modalAmountAddon'),
  modalLumpsumFields: document.getElementById('modalLumpsumFields'),
  modalLumpsumMonth: document.getElementById('modalLumpsumMonth'),
  modalLumpsumMonthHint: document.getElementById('modalLumpsumMonthHint'),
  modalSipFields: document.getElementById('modalSipFields'),
  modalSipStart: document.getElementById('modalSipStart'),
  modalSipEnd: document.getElementById('modalSipEnd'),
  modalSipStepUpType: document.getElementById('modalSipStepUpType'),
  modalSipStepUpStartYear: document.getElementById('modalSipStepUpStartYear'),
  modalSipStepUp: document.getElementById('modalSipStepUp'),
  modalSipStepUpLabel: document.getElementById('modalSipStepUpLabel'),
  modalSipStepUpAddon: document.getElementById('modalSipStepUpAddon'),
  modalSwpFields: document.getElementById('modalSwpFields'),
  modalSwpStart: document.getElementById('modalSwpStart'),
  modalSwpDuration: document.getElementById('modalSwpDuration'),
  modalSwpStepUp: document.getElementById('modalSwpStepUp'),

  // Goal Seeker
  goalModal: document.getElementById('goalModal'),
  closeGoalModalBtn: document.getElementById('closeGoalModalBtn'),
  cancelGoalModalBtn: document.getElementById('cancelGoalModalBtn'),
  goalTargetAmountInput: document.getElementById('goalTargetAmountInput'),
  goalTargetFormatted: document.getElementById('goalTargetFormatted'),
  goalTargetYearsInput: document.getElementById('goalTargetYearsInput'),
  goalSolvedSipAmount: document.getElementById('goalSolvedSipAmount'),
  applyGoalSipBtn: document.getElementById('applyGoalSipBtn'),
};

// Initialize Chart and Timeline components
let chartInstance = null;
let timelineInstance = null;

function init() {
  initScrollytelling();

  chartInstance = new PortfolioChart(elements.chartCanvas, {
    onSelectPeriod: (periodInfo) => {
      openPeriodDrawer(periodInfo);
    },
  });

  timelineInstance = new PortfolioTimeline(elements.timelineContainer, {
    onEditEvent: (event) => {
      openEventModal('edit', event);
    },
    onAddEventAtMonth: (month) => {
      openEventModal('add', null, month);
    },
    onSelectYear: (yearIndex, data) => {
      openPeriodDrawer({
        mode: 'annual',
        index: yearIndex,
        data: data,
      });
    },
  });

  populatePresetsDropdown();
  bindEventListeners();
  recalculateAll();
}

function populatePresetsDropdown() {
  elements.presetSelect.innerHTML = '<option value="" disabled selected>⚡ Load Preset Journey...</option>';
  PRESETS.forEach((preset) => {
    const opt = document.createElement('option');
    opt.value = preset.id;
    opt.textContent = `${preset.title}`;
    elements.presetSelect.appendChild(opt);
  });
}

function populateZoomSelects(horizonYears) {
  if (!elements.zoomFromSelect || !elements.zoomToSelect) return;
  const hYears = horizonYears || state.config.horizonYears || 30;

  const activeZoom = chartInstance && chartInstance.currentZoom ? chartInstance.currentZoom : null;
  const targetFrom = activeZoom ? activeZoom.fromYear : 1;
  const targetTo = activeZoom ? activeZoom.toYear : hYears;

  elements.zoomFromSelect.innerHTML = '';
  elements.zoomToSelect.innerHTML = '';

  for (let y = 1; y < hYears; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = `Year ${y}`;
    if (y === targetFrom) opt.selected = true;
    elements.zoomFromSelect.appendChild(opt);
  }

  for (let y = 2; y <= hYears; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = `Year ${y}`;
    if (y === targetTo) opt.selected = true;
    elements.zoomToSelect.appendChild(opt);
  }
}

function syncTopSipField() {
  if (!elements.topSipInput) return;
  const primarySip = state.config.events.find((e) => e.type === 'sip' && e.enabled !== false);
  const isAbsolute = primarySip ? (primarySip.topUpType === 'absolute' || (primarySip.topUpAmount > 0 && !primarySip.stepUpPercent)) : false;
  const startYear = primarySip?.topUpStartYear !== undefined && primarySip?.topUpStartYear !== null ? Math.max(1, parseInt(primarySip.topUpStartYear)) : 2;
  const stepUpPct = primarySip?.stepUpPercent || 0;
  const topUpAmt = primarySip?.topUpAmount || 0;
  const activeVal = isAbsolute ? topUpAmt : stepUpPct;

  // Mode buttons
  if (elements.sipTopUpTypePercentBtn && elements.sipTopUpTypeAbsoluteBtn) {
    elements.sipTopUpTypePercentBtn.classList.toggle('active', !isAbsolute);
    elements.sipTopUpTypeAbsoluteBtn.classList.toggle('active', isAbsolute);
  }

  // Addon label
  if (elements.topSipStepUpAddon) {
    elements.topSipStepUpAddon.textContent = isAbsolute ? (currentCurrency === 'USD' ? '$/yr' : '₹/yr') : '% / yr';
  }

  // Start Year input
  if (elements.topSipStepUpStartYear && document.activeElement !== elements.topSipStepUpStartYear) {
    elements.topSipStepUpStartYear.value = startYear;
  }

  // Value input
  if (elements.topSipStepUpInput && document.activeElement !== elements.topSipStepUpInput) {
    elements.topSipStepUpInput.value = activeVal;
    elements.topSipStepUpInput.step = isAbsolute ? '500' : '1';
  }

  if (primarySip) {
    if (!primarySip.endMonth || primarySip.id.startsWith('sip-core') || primarySip.name === 'Monthly Core SIP') {
      primarySip.endMonth = state.config.horizonYears * 12;
    }
    if (document.activeElement !== elements.topSipInput) {
      elements.topSipInput.value = primarySip.amount;
    }
    if (elements.topSipFormatted) {
      elements.topSipFormatted.textContent = `${formatCompactCurrency(primarySip.amount)}/mo`;
    }
  } else {
    if (document.activeElement !== elements.topSipInput) {
      elements.topSipInput.value = 0;
    }
    if (elements.topSipFormatted) {
      elements.topSipFormatted.textContent = `${formatCompactCurrency(0)}/mo`;
    }
  }
}

function syncParametersSummaryChips() {
  if (!elements.chipHorizon) return;
  const h = state.config.horizonYears;
  elements.chipHorizon.textContent = `${h} Yrs (${h * 12} Mo)`;
  elements.chipReturn.textContent = `${state.config.expectedAnnualReturn.toFixed(1)}% Return`;
  elements.chipLumpsum.textContent = `${formatCompactCurrency(state.config.initialInvestment)} Seed`;

  const primarySip = state.config.events.find((e) => e.type === 'sip' && e.enabled !== false);
  const sipAmt = primarySip ? primarySip.amount : 0;
  const isAbsolute = primarySip ? (primarySip.topUpType === 'absolute' || (primarySip.topUpAmount > 0 && !primarySip.stepUpPercent)) : false;
  const startYr = primarySip?.topUpStartYear !== undefined && primarySip?.topUpStartYear !== null ? Math.max(1, parseInt(primarySip.topUpStartYear)) : 2;
  const stepUp = primarySip?.stepUpPercent || 0;
  const flatUp = primarySip?.topUpAmount || 0;

  let topUpSuffix = '';
  if (isAbsolute && flatUp > 0) {
    topUpSuffix = ` (+${formatCompactCurrency(flatUp)} from Y${startYr})`;
  } else if (!isAbsolute && stepUp > 0) {
    topUpSuffix = ` (+${stepUp}% from Y${startYr})`;
  }
  elements.chipSip.textContent = `${formatCompactCurrency(sipAmt)}/mo SIP${topUpSuffix}`;

  elements.chipInflation.textContent = `${state.config.inflationRate.toFixed(1)}% Infl${state.useRealCorpus ? ' (Real)' : ''}`;
}

function recalculateAll() {
  // Base simulation
  state.simulation = simulatePortfolio(state.config);

  // Scenario simulations for comparison
  const conservativeConfig = { ...state.config, expectedAnnualReturn: 8.0, yearReturnOverrides: {} };
  const optimisticConfig = { ...state.config, expectedAnnualReturn: 15.0, yearReturnOverrides: {} };
  state.scenarioSimulations = {
    conservative: simulatePortfolio(conservativeConfig),
    optimistic: simulatePortfolio(optimisticConfig),
  };

  // Sync top bar SIP input & live summary chips
  syncTopSipField();
  syncParametersSummaryChips();

  // Update visual components
  updateMetricCards();
  updateChart();
  updateTimeline();
  renderEventsList();
  renderLedgerTable();
}

function updateMetricCards() {
  const sim = state.simulation;
  const summary = sim.summary;

  const displayCorpus = state.useRealCorpus ? summary.realFinalCorpus : summary.finalCorpus;
  elements.metricFinalCorpus.textContent = formatCompactCurrency(displayCorpus);
  elements.metricFinalCorpus.title = formatFullCurrency(displayCorpus);

  elements.metricRealCorpusNote.textContent = state.useRealCorpus ? 'Inflation Adjusted (Real)' : 'Nominal Value';

  const multiple = summary.totalInvested > 0 ? (summary.finalCorpus / summary.totalInvested).toFixed(1) : 0;
  elements.metricGrowthMultiple.textContent = `${multiple}x Multiple`;

  elements.metricTotalInvested.textContent = formatCompactCurrency(summary.totalInvested);
  elements.metricTotalInvested.title = formatFullCurrency(summary.totalInvested);

  elements.metricWealthCreated.textContent = formatCompactCurrency(summary.wealthCreated);
  elements.metricWealthCreated.title = formatFullCurrency(summary.wealthCreated);

  const profitPct = summary.totalInvested > 0 ? (summary.wealthCreated / summary.totalInvested) * 100 : 0;
  elements.metricProfitPercent.textContent = `${profitPct >= 0 ? '+' : ''}${profitPct.toFixed(1)}%`;

  elements.metricTotalWithdrawn.textContent = formatCompactCurrency(summary.totalWithdrawn);
  elements.metricTotalWithdrawn.title = formatFullCurrency(summary.totalWithdrawn);

  const swpMonths = sim.monthlyData.filter((m) => m.swpAmount > 0).length;
  elements.metricWithdrawalCount.textContent = `${swpMonths} active withdrawal months`;

  elements.metricXirr.textContent = formatPercent(summary.xirr);

  // Depletion warning
  if (summary.isDepleted && summary.depletionMonth !== null) {
    elements.depletionAlert.style.display = 'flex';
    const year = Math.ceil(summary.depletionMonth / 12);
    elements.depletionAlertMsg.textContent = `Portfolio depleted by Month ${summary.depletionMonth} (Year ${year}). Withdrawals exceed remaining corpus and growth.`;
  } else {
    elements.depletionAlert.style.display = 'none';
  }
}

function updateChart() {
  elements.chartHorizonBadge.textContent = `${state.config.horizonYears} Years (${state.config.horizonYears * 12} Mo)`;
  chartInstance.setCompareScenarios(state.compareScenarios);
  chartInstance.setGoalTarget(state.showGoalTarget ? state.goalTarget : null);
  chartInstance.updateData(state.simulation, state.scenarioSimulations);
}

function updateTimeline() {
  timelineInstance.render(state.config, state.simulation);
}

function renderEventsList() {
  elements.eventsListContainer.innerHTML = '';

  if (state.config.events.length === 0) {
    elements.eventsListContainer.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.85rem;">
        No events configured. Click "+ Add" to create an investment or withdrawal event.
      </div>
    `;
    return;
  }

  state.config.events.forEach((event) => {
    const card = document.createElement('div');
    card.className = 'event-row-card';

    let iconClass = 'type-icon-sip';
    let iconChar = '🟢';
    let typeLabel = 'SIP';
    let detailsText = '';

    if (event.type === 'sip') {
      iconClass = 'type-icon-sip';
      iconChar = '🟢';
      typeLabel = 'SIP';
      const isAbsolute = event.topUpType === 'absolute' || (event.topUpAmount > 0 && !event.stepUpPercent);
      const startYr = event.topUpStartYear !== undefined && event.topUpStartYear !== null ? Math.max(1, parseInt(event.topUpStartYear)) : 2;
      let stepStr = '';
      if (isAbsolute && event.topUpAmount > 0) {
        stepStr = ` • +${formatCompactCurrency(event.topUpAmount)}/yr Top-Up (from Y${startYr})`;
      } else if (event.stepUpPercent > 0) {
        stepStr = ` • +${event.stepUpPercent}%/yr Top-Up (from Y${startYr})`;
      }
      detailsText = `${formatFullCurrency(event.amount)}/month (M${event.startMonth} to M${event.endMonth})${stepStr}`;
    } else if (event.type === 'lumpsum') {
      iconClass = 'type-icon-lumpsum';
      iconChar = '🔵';
      typeLabel = 'Lumpsum';
      detailsText = `${formatFullCurrency(event.amount)} at ${formatMonthTime(event.month)}`;
    } else if (event.type === 'swp') {
      iconClass = 'type-icon-swp';
      iconChar = '🟠';
      typeLabel = 'SWP';
      const durStr = event.durationMonths > 0 ? `${event.durationMonths} months` : 'Until depleted';
      const stepStr = event.stepUpPercent > 0 ? ` • +${event.stepUpPercent}%/yr raise` : '';
      detailsText = `-${formatFullCurrency(event.amount)}/month from Month ${event.startMonth} (${durStr})${stepStr}`;
    }

    card.innerHTML = `
      <div class="event-row-left">
        <div class="event-type-icon ${iconClass}">${iconChar}</div>
        <div class="event-row-info">
          <h4>${event.name || typeLabel}</h4>
          <p>${detailsText}</p>
        </div>
      </div>
      <div class="event-row-actions">
        <button class="icon-btn edit-btn" title="Edit Event">✏️</button>
        <button class="icon-btn dup-btn" title="Duplicate Event">📋</button>
        <button class="icon-btn delete delete-btn" title="Delete Event">🗑️</button>
      </div>
    `;

    card.querySelector('.edit-btn').addEventListener('click', () => openEventModal('edit', event));
    card.querySelector('.dup-btn').addEventListener('click', () => duplicateEvent(event));
    card.querySelector('.delete-btn').addEventListener('click', () => deleteEvent(event.id));

    elements.eventsListContainer.appendChild(card);
  });
}

function renderLedgerTable() {
  const isAnnual = elements.ledgerGranularitySelect.value === 'annual';
  const data = isAnnual ? state.simulation.annualData : state.simulation.monthlyData;

  elements.ledgerHeaderRow.innerHTML = isAnnual
    ? `
      <th>Year</th>
      <th>Opening</th>
      <th>Invested</th>
      <th>Returns</th>
      <th>SWP</th>
      <th>Closing</th>
    `
    : `
      <th>Month</th>
      <th>Opening</th>
      <th>Invested</th>
      <th>Returns</th>
      <th>SWP</th>
      <th>Closing</th>
    `;

  elements.ledgerTableBody.innerHTML = '';

  data.forEach((row) => {
    const tr = document.createElement('tr');
    const periodLabel = isAnnual ? `Year ${row.year}` : `Month ${row.month}`;
    tr.innerHTML = `
      <td style="font-weight: 700; color: #f1f5f9;">${periodLabel}</td>
      <td>${formatCompactCurrency(row.openingBalance)}</td>
      <td style="color: var(--accent-cyan);">${row.totalInvested > 0 ? '+' + formatCompactCurrency(row.totalInvested) : '—'}</td>
      <td style="color: var(--accent-amber);">${row.returnsEarned > 0 ? '+' + formatCompactCurrency(row.returnsEarned) : '—'}</td>
      <td style="color: var(--accent-rose);">${row.swpAmount > 0 ? '-' + formatCompactCurrency(row.swpAmount) : '—'}</td>
      <td style="font-weight: 700; color: var(--accent-emerald);">${formatCompactCurrency(row.closingBalance)}</td>
    `;
    elements.ledgerTableBody.appendChild(tr);
  });
}

// Slide-Over Period Drawer (Signature UX: Click Graph Point to Edit!)
function openPeriodDrawer(periodInfo) {
  state.selectedPeriod = periodInfo;
  const { mode, index, data } = periodInfo;

  if (mode === 'annual') {
    elements.drawerTitle.textContent = `YEAR ${index} OVERVIEW`;
    elements.drawerSubtitle.textContent = `Months ${(index - 1) * 12 + 1}–${index * 12} • Interactive Planning & Recalculation`;
    elements.drawerLumpsumMonthLabel.textContent = `Month ${(index - 1) * 12 + 6} (Mid-Year)`;
    elements.drawerOpeningCorpus.textContent = formatFullCurrency(data.openingBalance);
    elements.drawerClosingCorpus.textContent = formatFullCurrency(data.closingBalance);
    elements.drawerGrowthPercent.textContent = `+${data.growthPercent.toFixed(1)}% (${formatFullCurrency(data.returnsEarned)})`;

    // Find any lumpsum in this year
    const yearStart = (index - 1) * 12 + 1;
    const yearEnd = index * 12;
    const existingLump = state.config.events.find((e) => e.type === 'lumpsum' && e.month >= yearStart && e.month <= yearEnd);
    elements.drawerLumpsumInput.value = existingLump ? existingLump.amount : 0;

    // Find active SIP in this year
    const activeSip = state.config.events.find(
      (e) => e.type === 'sip' && e.enabled !== false && (e.startMonth || 1) <= yearEnd && (e.endMonth || state.config.horizonYears * 12) >= yearStart
    );
    if (elements.drawerSipInput) {
      if (activeSip) {
        const sipStartYear = Math.ceil((activeSip.startMonth || 1) / 12);
        const eventYear = index - sipStartYear + 1;
        const topUpStartYear = activeSip.topUpStartYear !== undefined && activeSip.topUpStartYear !== null ? Math.max(1, parseInt(activeSip.topUpStartYear)) : 2;
        const topUpYears = eventYear >= topUpStartYear ? (eventYear - topUpStartYear + 1) : 0;
        const isAbsolute = activeSip.topUpType === 'absolute' || (activeSip.topUpAmount > 0 && !activeSip.stepUpPercent);
        const stepUp = activeSip.stepUpPercent || 0;
        const flatTopUp = activeSip.topUpAmount || 0;

        let effectiveMonthly = activeSip.amount;
        if (isAbsolute && flatTopUp > 0) {
          effectiveMonthly = Math.round(activeSip.amount + flatTopUp * topUpYears);
        } else if (stepUp > 0) {
          effectiveMonthly = Math.round(activeSip.amount * Math.pow(1 + stepUp / 100, topUpYears));
        }
        elements.drawerSipInput.value = effectiveMonthly;
        if (elements.drawerSipHint) {
          if (topUpYears > 0) {
            elements.drawerSipHint.textContent = isAbsolute
              ? `Year ${index}: Base ${formatCompactCurrency(activeSip.amount)} + ${formatCompactCurrency(flatTopUp)}/yr top-up (${topUpYears} yrs applied)`
              : `Year ${index}: Base ${formatCompactCurrency(activeSip.amount)} + ${stepUp}%/yr top-up (${topUpYears} yrs applied)`;
          } else if (stepUp > 0 || flatTopUp > 0) {
            elements.drawerSipHint.textContent = `Year ${index}: Base ${formatCompactCurrency(activeSip.amount)} (Top-Up kicks in Year ${topUpStartYear})`;
          } else {
            elements.drawerSipHint.textContent = `Active monthly contribution across Year ${index}`;
          }
        }
      } else {
        elements.drawerSipInput.value = 0;
        if (elements.drawerSipHint) {
          elements.drawerSipHint.textContent = `No active SIP scheduled for Year ${index}`;
        }
      }
    }

    // Find any SWP active in this year
    const swpStartsThisYear = state.config.events.find(
      (e) => e.type === 'swp' && Math.ceil(e.startMonth / 12) === index
    );
    if (swpStartsThisYear) {
      elements.drawerSwpInput.value = swpStartsThisYear.amount;
    } else if (data.swpAmount > 0) {
      elements.drawerSwpInput.value = Math.round(data.swpAmount / 12);
    } else {
      elements.drawerSwpInput.value = 0;
    }

    // Return override for this year
    const yearReturn = state.config.yearReturnOverrides[index] !== undefined
      ? state.config.yearReturnOverrides[index]
      : state.config.expectedAnnualReturn;
    elements.drawerReturnOverrideInput.value = yearReturn;
  } else {
    // Monthly mode
    elements.drawerTitle.textContent = `MONTH ${index} OVERVIEW`;
    elements.drawerSubtitle.textContent = `Year ${Math.ceil(index / 12)} • Month in Year ${((index - 1) % 12) + 1}`;
    elements.drawerLumpsumMonthLabel.textContent = `Month ${index}`;
    elements.drawerOpeningCorpus.textContent = formatFullCurrency(data.openingBalance);
    elements.drawerClosingCorpus.textContent = formatFullCurrency(data.closingBalance);
    elements.drawerGrowthPercent.textContent = `+${formatFullCurrency(data.returnsEarned)}`;

    const existingLump = state.config.events.find((e) => e.type === 'lumpsum' && e.month === index);
    elements.drawerLumpsumInput.value = existingLump ? existingLump.amount : 0;

    // Find active SIP in this month
    const activeSip = state.config.events.find(
      (e) => e.type === 'sip' && e.enabled !== false && (e.startMonth || 1) <= index && (e.endMonth || state.config.horizonYears * 12) >= index
    );
    if (elements.drawerSipInput) {
      if (activeSip) {
        const currentYear = Math.ceil(index / 12);
        const sipStartYear = Math.ceil((activeSip.startMonth || 1) / 12);
        const eventYear = currentYear - sipStartYear + 1;
        const topUpStartYear = activeSip.topUpStartYear !== undefined && activeSip.topUpStartYear !== null ? Math.max(1, parseInt(activeSip.topUpStartYear)) : 2;
        const topUpYears = eventYear >= topUpStartYear ? (eventYear - topUpStartYear + 1) : 0;
        const isAbsolute = activeSip.topUpType === 'absolute' || (activeSip.topUpAmount > 0 && !activeSip.stepUpPercent);
        const stepUp = activeSip.stepUpPercent || 0;
        const flatTopUp = activeSip.topUpAmount || 0;

        let effectiveMonthly = activeSip.amount;
        if (isAbsolute && flatTopUp > 0) {
          effectiveMonthly = Math.round(activeSip.amount + flatTopUp * topUpYears);
        } else if (stepUp > 0) {
          effectiveMonthly = Math.round(activeSip.amount * Math.pow(1 + stepUp / 100, topUpYears));
        }
        elements.drawerSipInput.value = effectiveMonthly;
        if (elements.drawerSipHint) {
          elements.drawerSipHint.textContent = topUpYears > 0
            ? `Month ${index}: Stepped-up monthly SIP (${isAbsolute ? '+' + formatCompactCurrency(flatTopUp) : '+' + stepUp + '%'})`
            : `Monthly SIP for Month ${index}`;
        }
      } else {
        elements.drawerSipInput.value = 0;
        if (elements.drawerSipHint) {
          elements.drawerSipHint.textContent = `No active SIP scheduled for Month ${index}`;
        }
      }
    }

    const swpStartsThisMonth = state.config.events.find((e) => e.type === 'swp' && e.startMonth === index);
    elements.drawerSwpInput.value = swpStartsThisMonth ? swpStartsThisMonth.amount : (data.swpAmount || 0);
    elements.drawerReturnOverrideInput.value = data.returnRateAnnual || state.config.expectedAnnualReturn;
  }

  elements.drawerBackdrop.classList.add('active');
  elements.drawerPanel.classList.add('active');
}

function closePeriodDrawer() {
  elements.drawerBackdrop.classList.remove('active');
  elements.drawerPanel.classList.remove('active');
  state.selectedPeriod = null;
}

function applyPeriodDrawerChanges() {
  if (!state.selectedPeriod) return;
  const { mode, index } = state.selectedPeriod;

  const lumpAmount = parseFloat(elements.drawerLumpsumInput.value) || 0;
  const swpAmount = parseFloat(elements.drawerSwpInput.value) || 0;
  const returnRate = parseFloat(elements.drawerReturnOverrideInput.value) || state.config.expectedAnnualReturn;

  // Handle SIP changes
  if (elements.drawerSipInput) {
    const newSipVal = parseFloat(elements.drawerSipInput.value) || 0;
    let coreSip = state.config.events.find((e) => e.type === 'sip');
    if (coreSip) {
      if (newSipVal > 0) {
        const yearNum = mode === 'annual' ? index : Math.ceil(index / 12);
        const yearsElapsed = Math.max(0, yearNum - Math.ceil((coreSip.startMonth || 1) / 12));
        const stepUp = coreSip.stepUpPercent || 0;
        if (yearsElapsed > 0 && stepUp > 0) {
          coreSip.amount = Math.round(newSipVal / Math.pow(1 + stepUp / 100, yearsElapsed));
        } else {
          coreSip.amount = newSipVal;
        }
        coreSip.enabled = true;
      }
    } else if (newSipVal > 0) {
      state.config.events.unshift({
        id: `sip-core-${Date.now()}`,
        name: 'Monthly Core SIP',
        type: 'sip',
        amount: newSipVal,
        startMonth: 1,
        endMonth: state.config.horizonYears * 12,
        stepUpPercent: parseFloat(elements.topSipStepUpInput ? elements.topSipStepUpInput.value : 0) || 0,
        enabled: true,
      });
    }
  }

  if (mode === 'annual') {
    const yearStart = (index - 1) * 12 + 1;
    const yearEnd = index * 12;
    const midMonth = yearStart + 5; // e.g. Month 6, 18, 30...

    // 1. Handle Lumpsum
    const existingLumpIndex = state.config.events.findIndex((e) => e.type === 'lumpsum' && e.month >= yearStart && e.month <= yearEnd);
    if (lumpAmount > 0) {
      if (existingLumpIndex >= 0) {
        state.config.events[existingLumpIndex].amount = lumpAmount;
      } else {
        state.config.events.push({
          id: `lump-y${index}-${Date.now()}`,
          name: `Year ${index} Injection`,
          type: 'lumpsum',
          amount: lumpAmount,
          month: midMonth,
          enabled: true,
        });
      }
    } else if (existingLumpIndex >= 0) {
      // Remove lumpsum if set to 0
      state.config.events.splice(existingLumpIndex, 1);
    }

    // 2. Handle SWP (scoped to this year)
    const existingSwpIndex = state.config.events.findIndex(
      (e) => e.type === 'swp' && Math.ceil(e.startMonth / 12) === index
    );
    if (swpAmount > 0) {
      if (existingSwpIndex >= 0) {
        state.config.events[existingSwpIndex].amount = swpAmount;
      } else {
        state.config.events.push({
          id: `swp-y${index}-${Date.now()}`,
          name: `SWP from Year ${index}`,
          type: 'swp',
          amount: swpAmount,
          startMonth: yearStart,
          durationMonths: -1,
          stepUpPercent: 5,
          enabled: true,
        });
      }
    } else if (existingSwpIndex >= 0 && swpAmount === 0) {
      state.config.events.splice(existingSwpIndex, 1);
    }

    // 3. Return rate override for this year
    if (Math.abs(returnRate - state.config.expectedAnnualReturn) > 0.01) {
      state.config.yearReturnOverrides[index] = returnRate;
    } else {
      delete state.config.yearReturnOverrides[index];
    }
  } else {
    // Monthly mode
    const month = index;
    const year = Math.ceil(month / 12);

    const existingLumpIndex = state.config.events.findIndex((e) => e.type === 'lumpsum' && e.month === month);
    if (lumpAmount > 0) {
      if (existingLumpIndex >= 0) {
        state.config.events[existingLumpIndex].amount = lumpAmount;
      } else {
        state.config.events.push({
          id: `lump-m${month}-${Date.now()}`,
          name: `Month ${month} Inflow`,
          type: 'lumpsum',
          amount: lumpAmount,
          month: month,
          enabled: true,
        });
      }
    } else if (existingLumpIndex >= 0) {
      state.config.events.splice(existingLumpIndex, 1);
    }

    if (Math.abs(returnRate - state.config.expectedAnnualReturn) > 0.01) {
      state.config.yearReturnOverrides[year] = returnRate;
    }
  }

  closePeriodDrawer();
  recalculateAll();
}

// Add / Edit Modal Functions
function openEventModal(mode = 'add', event = null, suggestedMonth = 12) {
  state.editingEventId = event ? event.id : null;
  elements.modalTitle.textContent = mode === 'edit' ? 'Edit Investment Event' : 'Add Investment Event';

  const type = event ? event.type : state.activeEventType;
  setModalEventType(type);

  if (event) {
    elements.modalEventName.value = event.name || '';
    elements.modalEventAmount.value = event.amount || 50000;
    if (event.type === 'lumpsum') {
      elements.modalLumpsumMonth.value = event.month || 12;
      updateLumpsumMonthHint();
    } else if (event.type === 'sip') {
      elements.modalSipStart.value = event.startMonth || 1;
      elements.modalSipEnd.value = event.endMonth || state.config.horizonYears * 12;
      const isAbsolute = event.topUpType === 'absolute' || (event.topUpAmount > 0 && !event.stepUpPercent);
      if (elements.modalSipStepUpType) elements.modalSipStepUpType.value = isAbsolute ? 'absolute' : 'percent';
      if (elements.modalSipStepUpStartYear) elements.modalSipStepUpStartYear.value = event.topUpStartYear !== undefined ? event.topUpStartYear : 2;
      if (elements.modalSipStepUp) elements.modalSipStepUp.value = isAbsolute ? (event.topUpAmount || 0) : (event.stepUpPercent || 0);
      if (elements.modalSipStepUpAddon) elements.modalSipStepUpAddon.textContent = isAbsolute ? (currentCurrency === 'USD' ? '$' : '₹') : '%';
      if (elements.modalSipStepUpLabel) elements.modalSipStepUpLabel.textContent = isAbsolute ? 'Annual Top-Up (Fixed Amount per year)' : 'Annual Top-Up (% per year)';
    } else if (event.type === 'swp') {
      elements.modalSwpStart.value = event.startMonth || 61;
      elements.modalSwpDuration.value = event.durationMonths !== undefined ? event.durationMonths : 60;
      elements.modalSwpStepUp.value = event.stepUpPercent || 5;
    }
  } else {
    // Defaults for new event
    elements.modalEventName.value = '';
    if (type === 'lumpsum') {
      elements.modalEventAmount.value = 200000;
      elements.modalLumpsumMonth.value = suggestedMonth;
      updateLumpsumMonthHint();
    } else if (type === 'sip') {
      elements.modalEventAmount.value = 25000;
      elements.modalSipStart.value = suggestedMonth;
      elements.modalSipEnd.value = state.config.horizonYears * 12;
      if (elements.modalSipStepUpType) elements.modalSipStepUpType.value = 'percent';
      if (elements.modalSipStepUpStartYear) elements.modalSipStepUpStartYear.value = 2;
      if (elements.modalSipStepUp) elements.modalSipStepUp.value = 0;
      if (elements.modalSipStepUpAddon) elements.modalSipStepUpAddon.textContent = '%';
      if (elements.modalSipStepUpLabel) elements.modalSipStepUpLabel.textContent = 'Annual Top-Up (% per year)';
    } else if (type === 'swp') {
      elements.modalEventAmount.value = 50000;
      elements.modalSwpStart.value = suggestedMonth;
      elements.modalSwpDuration.value = 60;
      elements.modalSwpStepUp.value = 5;
    }
  }

  elements.eventModal.classList.add('active');
}

function setModalEventType(type) {
  state.activeEventType = type;
  elements.segmentedOptions.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  elements.modalLumpsumFields.style.display = type === 'lumpsum' ? 'flex' : 'none';
  elements.modalSipFields.style.display = type === 'sip' ? 'flex' : 'none';
  elements.modalSwpFields.style.display = type === 'swp' ? 'flex' : 'none';

  if (type === 'sip') {
    elements.modalAmountLabel.textContent = 'Monthly SIP Amount';
    elements.modalAmountAddon.textContent = '₹/mo';
  } else if (type === 'swp') {
    elements.modalAmountLabel.textContent = 'Monthly Withdrawal Amount';
    elements.modalAmountAddon.textContent = '₹/mo';
  } else {
    elements.modalAmountLabel.textContent = 'Lumpsum Amount';
    elements.modalAmountAddon.textContent = '₹';
  }
}

function updateLumpsumMonthHint() {
  const m = parseInt(elements.modalLumpsumMonth.value) || 1;
  const yr = Math.ceil(m / 12);
  const mInYr = ((m - 1) % 12) + 1;
  elements.modalLumpsumMonthHint.textContent = `Month ${m} (Year ${yr}, M${mInYr})`;
}

function saveModalEvent() {
  const type = state.activeEventType;
  const name = elements.modalEventName.value.trim() || (type === 'sip' ? 'Monthly SIP' : type === 'swp' ? 'Monthly SWP' : 'Lumpsum Injection');
  const amount = parseFloat(elements.modalEventAmount.value) || 0;

  if (amount <= 0) {
    alert('Please enter a valid investment amount greater than zero.');
    return;
  }

  let eventObj = {
    id: state.editingEventId || `${type}-${Date.now()}`,
    name,
    type,
    amount,
    enabled: true,
  };

  if (type === 'lumpsum') {
    const month = parseInt(elements.modalLumpsumMonth.value) || 1;
    eventObj.month = month;
  } else if (type === 'sip') {
    eventObj.startMonth = parseInt(elements.modalSipStart.value) || 1;
    eventObj.endMonth = parseInt(elements.modalSipEnd.value) || state.config.horizonYears * 12;
    const isAbsolute = elements.modalSipStepUpType?.value === 'absolute';
    const topUpVal = parseFloat(elements.modalSipStepUp.value) || 0;
    eventObj.topUpType = isAbsolute ? 'absolute' : 'percent';
    eventObj.topUpStartYear = parseInt(elements.modalSipStepUpStartYear?.value) || 2;
    eventObj.stepUpPercent = isAbsolute ? 0 : topUpVal;
    eventObj.topUpAmount = isAbsolute ? topUpVal : 0;
    eventObj.isPaused = false;
  } else if (type === 'swp') {
    eventObj.startMonth = parseInt(elements.modalSwpStart.value) || 1;
    eventObj.durationMonths = parseInt(elements.modalSwpDuration.value) || -1;
    eventObj.stepUpPercent = parseFloat(elements.modalSwpStepUp.value) || 0;
  }

  if (state.editingEventId) {
    const idx = state.config.events.findIndex((e) => e.id === state.editingEventId);
    if (idx >= 0) {
      state.config.events[idx] = eventObj;
    }
  } else {
    state.config.events.push(eventObj);
  }

  closeEventModal();
  recalculateAll();
}

function closeEventModal() {
  elements.eventModal.classList.remove('active');
  state.editingEventId = null;
}

function duplicateEvent(event) {
  const clone = JSON.parse(JSON.stringify(event));
  clone.id = `${clone.type}-${Date.now()}`;
  clone.name = `${clone.name} (Copy)`;
  if (clone.type === 'lumpsum') {
    clone.month = Math.min(state.config.horizonYears * 12, clone.month + 12);
  }
  state.config.events.push(clone);
  recalculateAll();
}

function deleteEvent(id) {
  state.config.events = state.config.events.filter((e) => e.id !== id);
  recalculateAll();
}

// Goal Seeker Logic
function openGoalModal() {
  updateGoalSeekerComputation();
  elements.goalModal.classList.add('active');
}

function updateGoalSeekerComputation() {
  const target = parseFloat(elements.goalTargetAmountInput.value) || 10000000;
  state.goalTarget = target;
  elements.goalTargetFormatted.textContent = formatFullCurrency(target) + ` (${formatCompactCurrency(target)})`;

  const years = parseInt(elements.goalTargetYearsInput.value) || 10;
  const tempConfig = {
    ...state.config,
    horizonYears: years,
  };

  const solvedSIP = solveRequiredSIP(tempConfig, target);
  elements.goalSolvedSipAmount.textContent = formatFullCurrency(solvedSIP) + '/mo';
  elements.goalSolvedSipAmount.dataset.amount = solvedSIP;
}

function applyGoalSipToTimeline() {
  const solvedSIP = parseFloat(elements.goalSolvedSipAmount.dataset.amount) || 0;
  if (solvedSIP <= 0) return;

  // Update or insert core SIP
  const existingSip = state.config.events.find((e) => e.type === 'sip');
  if (existingSip) {
    existingSip.amount = solvedSIP;
  } else {
    state.config.events.unshift({
      id: `sip-goal-${Date.now()}`,
      name: 'Goal Targeted SIP',
      type: 'sip',
      amount: solvedSIP,
      startMonth: 1,
      endMonth: state.config.horizonYears * 12,
      stepUpPercent: 0,
      enabled: true,
    });
  }

  state.showGoalTarget = true;
  elements.goalModal.classList.remove('active');
  recalculateAll();
}

// CSV Export
function exportLedgerToCsv() {
  const isAnnual = elements.ledgerGranularitySelect.value === 'annual';
  const data = isAnnual ? state.simulation.annualData : state.simulation.monthlyData;

  let csv = isAnnual
    ? 'Year,Opening Balance,Total Invested,Returns Earned,SWP Withdrawn,Closing Balance,Growth Rate\n'
    : 'Month,Year,Opening Balance,SIP,Lumpsum,Total Invested,Returns Earned,SWP Withdrawn,Closing Balance\n';

  data.forEach((r) => {
    if (isAnnual) {
      csv += `${r.year},${r.openingBalance.toFixed(2)},${r.totalInvested.toFixed(2)},${r.returnsEarned.toFixed(2)},${r.swpAmount.toFixed(2)},${r.closingBalance.toFixed(2)},${r.growthPercent.toFixed(2)}%\n`;
    } else {
      csv += `${r.month},${r.year},${r.openingBalance.toFixed(2)},${r.sipAmount.toFixed(2)},${r.lumpsumAmount.toFixed(2)},${r.totalInvested.toFixed(2)},${r.returnsEarned.toFixed(2)},${r.swpAmount.toFixed(2)},${r.closingBalance.toFixed(2)}\n`;
    }
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `portfolio_timeline_${isAnnual ? 'annual' : 'monthly'}_ledger.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Event Listeners Binding
function bindEventListeners() {
  // Parameters Accordion Dropdown Toggle
  if (elements.parametersToggleBtn && elements.parametersPanel) {
    const toggleParameters = () => {
      const isCollapsed = elements.parametersPanel.classList.toggle('collapsed');
      if (elements.parametersToggleLabel) {
        elements.parametersToggleLabel.textContent = isCollapsed ? 'Configure' : 'Collapse';
      }
      elements.parametersToggleBtn.setAttribute('aria-expanded', !isCollapsed);
    };

    elements.parametersToggleBtn.addEventListener('click', toggleParameters);
    elements.parametersToggleBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleParameters();
      }
    });
  }

  // Currency switcher
  elements.currInrBtn.addEventListener('click', () => {
    setCurrency('INR');
    elements.currInrBtn.classList.add('active');
    elements.currUsdBtn.classList.remove('active');
    document.querySelectorAll('.curr-symbol').forEach((el) => {
      el.textContent = el.textContent.includes('/mo') ? '₹/mo' : '₹';
    });
    recalculateAll();
  });
  elements.currUsdBtn.addEventListener('click', () => {
    setCurrency('USD');
    elements.currUsdBtn.classList.add('active');
    elements.currInrBtn.classList.remove('active');
    document.querySelectorAll('.curr-symbol').forEach((el) => {
      el.textContent = el.textContent.includes('/mo') ? '$/mo' : '$';
    });
    recalculateAll();
  });

  // Horizon (Direct Input without limit)
  elements.horizonInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (!val || isNaN(val) || val < 1) {
      elements.horizonLabel.textContent = 'Min 1 Year';
      return;
    }
    const prevHorizon = state.config.horizonYears;
    state.config.horizonYears = val;
    elements.horizonLabel.textContent = `${val * 12} Months`;
    // Ensure core SIP and ongoing SIPs scale with the new horizon
    state.config.events.forEach((evt) => {
      if (evt.type === 'sip') {
        if (
          evt.name === 'Monthly Core SIP' ||
          evt.id.startsWith('sip-core') ||
          !evt.endMonth ||
          evt.endMonth <= 12 ||
          evt.endMonth === prevHorizon * 12
        ) {
          evt.endMonth = val * 12;
        } else if (evt.endMonth > val * 12) {
          evt.endMonth = val * 12;
        }
      }
    });
    populateZoomSelects(val);
    recalculateAll();
  });

  // Return Rate
  elements.returnInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    state.config.expectedAnnualReturn = val;
    // Set scenario pills
    elements.scenarioPills.forEach((p) => p.classList.remove('active'));
    recalculateAll();
  });

  // Scenario Pills
  elements.scenarioPills.forEach((btn) => {
    btn.addEventListener('click', () => {
      elements.scenarioPills.forEach((p) => p.classList.remove('active'));
      btn.classList.add('active');
      const rate = parseFloat(btn.dataset.rate);
      state.config.expectedAnnualReturn = rate;
      elements.returnInput.value = rate.toFixed(1);
      recalculateAll();
    });
  });

  // Compounding Select
  elements.compoundingSelect.addEventListener('change', (e) => {
    state.config.compoundingFrequency = e.target.value;
    recalculateAll();
  });

  // Inflation & Real Corpus
  elements.inflationInput.addEventListener('input', (e) => {
    state.config.inflationRate = parseFloat(e.target.value) || 0;
    recalculateAll();
  });
  elements.realCorpusToggle.addEventListener('change', (e) => {
    state.useRealCorpus = e.target.checked;
    if (elements.toggleSeriesReal) {
      elements.toggleSeriesReal.checked = e.target.checked;
      chartInstance.setSeriesVisibility('real', e.target.checked);
    }
    updateMetricCards();
  });

  // Initial Investment
  elements.initialInvestmentInput.addEventListener('input', (e) => {
    state.config.initialInvestment = parseFloat(e.target.value) || 0;
    recalculateAll();
  });

  // Monthly Core SIP (Top Bar Edit)
  elements.topSipInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    if (elements.topSipFormatted) {
      elements.topSipFormatted.textContent = `${formatCompactCurrency(val)}/mo`;
    }

    // Find primary SIP event or create one
    let primarySip = state.config.events.find((evt) => evt.type === 'sip');
    if (primarySip) {
      primarySip.amount = val;
      primarySip.endMonth = state.config.horizonYears * 12;
    } else if (val > 0) {
      const stepVal = parseFloat(elements.topSipStepUpInput ? elements.topSipStepUpInput.value : 0) || 0;
      state.config.events.unshift({
        id: `sip-core-${Date.now()}`,
        name: 'Monthly Core SIP',
        type: 'sip',
        amount: val,
        startMonth: 1,
        endMonth: state.config.horizonYears * 12,
        stepUpPercent: stepVal,
        isPaused: false,
        enabled: true,
      });
    }
    recalculateAll();
  });

  // SIP Top-Up Mode Toggle (% Rate vs Fixed Currency)
  if (elements.sipTopUpTypePercentBtn && elements.sipTopUpTypeAbsoluteBtn) {
    elements.sipTopUpTypePercentBtn.addEventListener('click', () => {
      let primarySip = state.config.events.find((evt) => evt.type === 'sip');
      if (primarySip) {
        primarySip.topUpType = 'percent';
        if (primarySip.topUpAmount > 0 && !primarySip.stepUpPercent) {
          primarySip.stepUpPercent = 10;
          primarySip.topUpAmount = 0;
        }
      }
      recalculateAll();
    });

    elements.sipTopUpTypeAbsoluteBtn.addEventListener('click', () => {
      let primarySip = state.config.events.find((evt) => evt.type === 'sip');
      if (primarySip) {
        primarySip.topUpType = 'absolute';
        if (primarySip.stepUpPercent > 0 && !primarySip.topUpAmount) {
          primarySip.topUpAmount = currentCurrency === 'USD' ? 100 : 2500;
          primarySip.stepUpPercent = 0;
        }
      }
      recalculateAll();
    });
  }

  // SIP Top-Up Start Year
  if (elements.topSipStepUpStartYear) {
    elements.topSipStepUpStartYear.addEventListener('input', (e) => {
      const startYr = Math.max(1, parseInt(e.target.value) || 2);
      let primarySip = state.config.events.find((evt) => evt.type === 'sip');
      if (primarySip) {
        primarySip.topUpStartYear = startYr;
      }
      recalculateAll();
    });
  }

  // SIP Top-Up Value Input
  if (elements.topSipStepUpInput) {
    elements.topSipStepUpInput.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      const isAbsolute = elements.sipTopUpTypeAbsoluteBtn?.classList.contains('active');
      const startYr = parseInt(elements.topSipStepUpStartYear?.value) || 2;
      let primarySip = state.config.events.find((evt) => evt.type === 'sip');
      if (primarySip) {
        primarySip.topUpType = isAbsolute ? 'absolute' : 'percent';
        primarySip.topUpStartYear = startYr;
        if (isAbsolute) {
          primarySip.topUpAmount = val;
          primarySip.stepUpPercent = 0;
        } else {
          primarySip.stepUpPercent = val;
          primarySip.topUpAmount = 0;
        }
        primarySip.endMonth = state.config.horizonYears * 12;
      } else {
        const sipAmt = parseFloat(elements.topSipInput.value) || 0;
        if (sipAmt > 0) {
          state.config.events.unshift({
            id: `sip-core-${Date.now()}`,
            name: 'Monthly Core SIP',
            type: 'sip',
            amount: sipAmt,
            startMonth: 1,
            endMonth: state.config.horizonYears * 12,
            topUpType: isAbsolute ? 'absolute' : 'percent',
            topUpStartYear: startYr,
            stepUpPercent: isAbsolute ? 0 : val,
            topUpAmount: isAbsolute ? val : 0,
            isPaused: false,
            enabled: true,
          });
        }
      }
      recalculateAll();
    });
  }

  // Modal SIP Step-Up Type selector change
  if (elements.modalSipStepUpType) {
    elements.modalSipStepUpType.addEventListener('change', (e) => {
      const isAbs = e.target.value === 'absolute';
      if (elements.modalSipStepUpAddon) {
        elements.modalSipStepUpAddon.textContent = isAbs ? (currentCurrency === 'USD' ? '$' : '₹') : '%';
      }
      if (elements.modalSipStepUpLabel) {
        elements.modalSipStepUpLabel.textContent = isAbs ? 'Annual Top-Up (Fixed Amount per year)' : 'Annual Top-Up (% per year)';
      }
    });
  }

  // Preset Select
  elements.presetSelect.addEventListener('change', (e) => {
    const preset = PRESETS.find((p) => p.id === e.target.value);
    if (preset) {
      state.config = JSON.parse(JSON.stringify(preset.config));
      elements.horizonInput.value = state.config.horizonYears;
      elements.horizonLabel.textContent = `${state.config.horizonYears * 12} Months`;
      elements.returnInput.value = state.config.expectedAnnualReturn;
      elements.initialInvestmentInput.value = state.config.initialInvestment;
      elements.compoundingSelect.value = state.config.compoundingFrequency;
      elements.inflationInput.value = state.config.inflationRate;
      populateZoomSelects(state.config.horizonYears);
      recalculateAll();
    }
  });

  // Reset to Defaults (Start from Scratch)
  elements.resetDefaultsBtn.addEventListener('click', () => {
    // Clear all predecided rules, events, bonus investments and return overrides
    state.config = {
      horizonYears: 10,
      expectedAnnualReturn: 12.0,
      inflationRate: 6.0,
      compoundingFrequency: 'monthly',
      initialInvestment: 0,
      events: [],
      yearReturnOverrides: {},
    };

    // Reset input fields to clean scratch state
    elements.horizonInput.value = 10;
    elements.horizonLabel.textContent = '120 Months';
    elements.returnInput.value = '12.0';
    elements.initialInvestmentInput.value = 0;
    elements.topSipInput.value = 0;
    if (elements.topSipFormatted) {
      elements.topSipFormatted.textContent = `${formatCompactCurrency(0)}/mo`;
    }
    if (elements.topSipStepUpInput) {
      elements.topSipStepUpInput.value = 0;
    }
    if (elements.topSipStepUpStartYear) {
      elements.topSipStepUpStartYear.value = 2;
    }
    elements.compoundingSelect.value = 'monthly';
    elements.inflationInput.value = '6.0';
    elements.realCorpusToggle.checked = false;
    state.useRealCorpus = false;

    // Reset scenario selection pills to base (12%)
    elements.scenarioPills.forEach((p) => {
      p.classList.toggle('active', p.dataset.scenario === 'base');
    });

    // Reset presets dropdown back to placeholder
    if (elements.presetSelect) {
      elements.presetSelect.value = '';
    }

    // Reset any active chart zoom
    chartInstance.resetZoom();
    if (elements.resetZoomBtn) elements.resetZoomBtn.style.display = 'none';
    if (elements.zoomRangePopover) elements.zoomRangePopover.style.display = 'none';
    populateZoomSelects(10);

    recalculateAll();
  });

  // Chart View Toggle
  elements.viewAnnualBtn.addEventListener('click', () => {
    elements.viewAnnualBtn.classList.add('active');
    elements.viewMonthlyBtn.classList.remove('active');
    state.viewMode = 'annual';
    chartInstance.setViewMode('annual');
  });
  elements.viewMonthlyBtn.addEventListener('click', () => {
    elements.viewMonthlyBtn.classList.add('active');
    elements.viewAnnualBtn.classList.remove('active');
    state.viewMode = 'monthly';
    chartInstance.setViewMode('monthly');
  });

  // Compare Scenarios Toggle
  elements.toggleCompareScenariosBtn.addEventListener('click', () => {
    state.compareScenarios = !state.compareScenarios;
    elements.toggleCompareScenariosBtn.classList.toggle('active', state.compareScenarios);
    elements.toggleCompareScenariosBtn.textContent = state.compareScenarios ? '✓ Comparing Scenarios' : '📊 Compare Scenarios';
    updateChart();
  });

  // Target Goal Toggle
  elements.toggleGoalMarkerBtn.addEventListener('click', () => {
    state.showGoalTarget = !state.showGoalTarget;
    elements.toggleGoalMarkerBtn.classList.toggle('active', state.showGoalTarget);
    elements.toggleGoalMarkerBtn.textContent = state.showGoalTarget ? `🎯 Target: ${formatCompactCurrency(state.goalTarget)}` : '🎯 Target Marker';
    updateChart();
  });

  // Series Line Toggles (Tick / Untick Curves)
  elements.toggleSeriesPortfolio.addEventListener('change', (e) => {
    chartInstance.setSeriesVisibility('portfolio', e.target.checked);
  });
  elements.toggleSeriesInvested.addEventListener('change', (e) => {
    chartInstance.setSeriesVisibility('invested', e.target.checked);
  });
  elements.toggleSeriesReturns.addEventListener('change', (e) => {
    chartInstance.setSeriesVisibility('returns', e.target.checked);
  });
  elements.toggleSeriesReal.addEventListener('change', (e) => {
    chartInstance.setSeriesVisibility('real', e.target.checked);
  });

  // Chart Zoom Section Popover
  populateZoomSelects(state.config.horizonYears);

  elements.openZoomRangeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    populateZoomSelects(state.config.horizonYears);
    const isVisible = elements.zoomRangePopover.style.display === 'flex';
    elements.zoomRangePopover.style.display = isVisible ? 'none' : 'flex';
  });

  elements.closeZoomPopoverBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.zoomRangePopover.style.display = 'none';
  });

  document.addEventListener('click', (e) => {
    if (elements.zoomRangePopover && elements.zoomRangePopover.style.display === 'flex') {
      if (!elements.zoomRangePopover.contains(e.target) && e.target !== elements.openZoomRangeBtn) {
        elements.zoomRangePopover.style.display = 'none';
      }
    }
  });

  // Preset quick jumps inside zoom popover
  elements.zoomPresetPills.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rangeKey = btn.dataset.range;
      const hYears = state.config.horizonYears || 30;
      let fromY = 1;
      let toY = Math.min(10, hYears);

      if (rangeKey === 'first5') {
        fromY = 1;
        toY = Math.min(5, hYears);
      } else if (rangeKey === 'first10') {
        fromY = 1;
        toY = Math.min(10, hYears);
      } else if (rangeKey === 'swpPhase') {
        const swpEvent = state.config.events.find((evt) => evt.type === 'swp' && evt.enabled !== false);
        if (swpEvent) {
          fromY = Math.min(Math.max(1, Math.ceil(swpEvent.startMonth / 12)), Math.max(1, hYears - 1));
        } else {
          fromY = Math.max(1, hYears - 5);
        }
        toY = hYears;
      } else if (rangeKey === 'last5') {
        fromY = Math.max(1, hYears - 5);
        toY = hYears;
      }

      elements.zoomFromSelect.value = fromY;
      elements.zoomToSelect.value = toY;
    });
  });

  elements.applyZoomRangeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const fromY = parseInt(elements.zoomFromSelect.value) || 1;
    let toY = parseInt(elements.zoomToSelect.value) || state.config.horizonYears;
    if (fromY >= toY) {
      toY = fromY + 1;
      elements.zoomToSelect.value = toY;
    }
    chartInstance.zoomToYearRange(fromY, toY);
    elements.resetZoomBtn.style.display = 'inline-flex';
    elements.resetZoomBtn.textContent = `↺ Reset (Y${fromY}–Y${toY})`;
    elements.zoomRangePopover.style.display = 'none';
  });

  const handleResetZoom = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    chartInstance.resetZoom();
    populateZoomSelects(state.config.horizonYears);
    if (elements.resetZoomBtn) elements.resetZoomBtn.style.display = 'none';
    if (elements.zoomRangePopover) elements.zoomRangePopover.style.display = 'none';
  };

  elements.resetZoomBtn.addEventListener('click', handleResetZoom);
  elements.resetZoomInnerBtn.addEventListener('click', handleResetZoom);

  // Timeline & Event Modals
  elements.openAddEventModalBtn.addEventListener('click', () => openEventModal('add'));
  elements.openAddEventBtn2.addEventListener('click', () => openEventModal('add'));
  elements.closeModalBtn.addEventListener('click', closeEventModal);
  elements.cancelModalBtn.addEventListener('click', closeEventModal);
  elements.saveEventModalBtn.addEventListener('click', saveModalEvent);

  elements.segmentedOptions.forEach((btn) => {
    btn.addEventListener('click', () => setModalEventType(btn.dataset.type));
  });

  elements.modalLumpsumMonth.addEventListener('input', updateLumpsumMonthHint);

  // Drawer Controls
  elements.closeDrawerBtn.addEventListener('click', closePeriodDrawer);
  elements.cancelDrawerBtn.addEventListener('click', closePeriodDrawer);
  elements.drawerBackdrop.addEventListener('click', closePeriodDrawer);
  elements.applyDrawerBtn.addEventListener('click', applyPeriodDrawerChanges);

  // Ledger Controls
  elements.ledgerGranularitySelect.addEventListener('change', renderLedgerTable);
  elements.exportCsvBtn.addEventListener('click', exportLedgerToCsv);

  // Goal Seeker
  elements.openGoalModalBtn.addEventListener('click', openGoalModal);
  elements.closeGoalModalBtn.addEventListener('click', () => elements.goalModal.classList.remove('active'));
  elements.cancelGoalModalBtn.addEventListener('click', () => elements.goalModal.classList.remove('active'));
  elements.goalTargetAmountInput.addEventListener('input', updateGoalSeekerComputation);
  elements.goalTargetYearsInput.addEventListener('input', updateGoalSeekerComputation);
  elements.applyGoalSipBtn.addEventListener('click', applyGoalSipToTimeline);

  // Depletion fix button
  elements.fixDepletionBtn.addEventListener('click', () => openEventModal('add', null, state.simulation.summary.depletionMonth || 1));
}

// Kickoff
init();
