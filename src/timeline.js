import { formatCompactCurrency } from './formatters.js';

export class PortfolioTimeline {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.onEditEvent = options.onEditEvent || null;
    this.onAddEventAtMonth = options.onAddEventAtMonth || null;
    this.onSelectYear = options.onSelectYear || null;
  }

  render(config, simulation) {
    const { horizonYears = 10, events = [], initialInvestment = 0 } = config;
    const totalMonths = horizonYears * 12;

    this.container.innerHTML = '';

    const timelineWrapper = document.createElement('div');
    timelineWrapper.className = 'timeline-scroll-container';

    const track = document.createElement('div');
    track.className = 'timeline-track';

    // Build timeline columns for each year
    for (let y = 1; y <= horizonYears; y++) {
      const yearStartMonth = (y - 1) * 12 + 1;
      const yearEndMonth = y * 12;

      const col = document.createElement('div');
      col.className = 'timeline-year-column';

      // Year Header
      const header = document.createElement('div');
      header.className = 'timeline-year-header';
      header.innerHTML = `
        <span class="year-label">YEAR ${y}</span>
        <span class="month-span">M${yearStartMonth}–${yearEndMonth}</span>
      `;
      header.addEventListener('click', () => {
        if (this.onSelectYear && simulation?.annualData[y - 1]) {
          this.onSelectYear(y, simulation.annualData[y - 1]);
        }
      });
      col.appendChild(header);

      // Milestone node dot and line
      const node = document.createElement('div');
      node.className = 'timeline-node';
      node.innerHTML = `
        <div class="node-dot" title="Inspect Year ${y}"></div>
        <div class="node-line"></div>
      `;
      col.appendChild(node);

      // Event bucket for this year
      const eventBucket = document.createElement('div');
      eventBucket.className = 'timeline-events-bucket';

      // Initial investment in Year 1
      if (y === 1 && initialInvestment > 0) {
        const initCard = document.createElement('div');
        initCard.className = 'timeline-event-pill type-initial';
        initCard.innerHTML = `
          <div class="pill-badge">INITIAL</div>
          <div class="pill-title">Seed Capital</div>
          <div class="pill-amount">${formatCompactCurrency(initialInvestment)}</div>
        `;
        eventBucket.appendChild(initCard);
      }

      // Find events occurring in or spanning across this year
      events.forEach((evt) => {
        if (evt.enabled === false) return;

        if (evt.type === 'sip') {
          const start = evt.startMonth || 1;
          const end = evt.endMonth || totalMonths;
          // Check if SIP is active in this year
          if (start <= yearEndMonth && end >= yearStartMonth) {
            const isStartYear = start >= yearStartMonth && start <= yearEndMonth;
            const card = document.createElement('div');
            card.className = `timeline-event-pill type-sip ${isStartYear ? 'is-start' : 'is-ongoing'}`;
            
            // Calculate effective amount this year if step-up / top-up exists
            let effectiveAmt = evt.amount;
            const stepUp = evt.stepUpPercent || 0;
            const topUpAmt = evt.topUpAmount || 0;
            const sipStartYear = Math.ceil(start / 12);
            const eventYear = y - sipStartYear + 1;
            const topUpStartYear = evt.topUpStartYear !== undefined && evt.topUpStartYear !== null ? Math.max(1, parseInt(evt.topUpStartYear)) : 2;
            const topUpYears = eventYear >= topUpStartYear ? (eventYear - topUpStartYear + 1) : 0;

            const isAbsolute = evt.topUpType === 'absolute' || (topUpAmt > 0 && !stepUp);
            if (isAbsolute && topUpAmt > 0) {
              effectiveAmt = effectiveAmt + (topUpAmt * topUpYears);
            } else if (stepUp > 0) {
              effectiveAmt = effectiveAmt * Math.pow(1 + stepUp / 100, topUpYears);
            }

            const activeStartInYear = Math.max(yearStartMonth, start);
            const activeEndInYear = Math.min(yearEndMonth, end);
            const activeMonthsInYear = Math.max(0, activeEndInYear - activeStartInYear + 1);
            const annualContribution = effectiveAmt * activeMonthsInYear;

            let tagHtml = '';
            if (topUpYears > 0) {
              const topUpText = isAbsolute ? `+${formatCompactCurrency(topUpAmt)}` : `+${stepUp}%`;
              tagHtml = `<span class="pill-tag" style="background: rgba(16, 185, 129, 0.25); color: #34d399; font-weight: 700;">${topUpText} Top-Up</span>`;
            } else if (stepUp > 0 || topUpAmt > 0) {
              tagHtml = `<span class="pill-tag" style="background: rgba(56, 189, 248, 0.18); color: #38bdf8;">Top-Up from Y${topUpStartYear}</span>`;
            } else if (isStartYear) {
              tagHtml = `<span class="pill-tag">Starts M${start}</span>`;
            } else {
              tagHtml = `<span class="pill-tag" style="opacity: 0.85;">Year ${y}</span>`;
            }

            card.innerHTML = `
              <div class="pill-header">
                <span class="pill-badge">SIP</span>
                ${tagHtml}
              </div>
              <div class="pill-title">${evt.name || 'Monthly Core SIP'}</div>
              <div class="pill-amount">${formatCompactCurrency(effectiveAmt)}/mo</div>
              <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">
                ${formatCompactCurrency(annualContribution)} / yr
              </div>
            `;
            card.addEventListener('click', (e) => {
              e.stopPropagation();
              if (this.onEditEvent) this.onEditEvent(evt);
            });
            eventBucket.appendChild(card);
          }
        } else if (evt.type === 'lumpsum') {
          if (evt.month >= yearStartMonth && evt.month <= yearEndMonth) {
            const card = document.createElement('div');
            card.className = 'timeline-event-pill type-lumpsum';
            card.innerHTML = `
              <div class="pill-header">
                <span class="pill-badge">LUMPSUM</span>
                <span class="pill-tag">M${evt.month}</span>
              </div>
              <div class="pill-title">${evt.name || 'Additional Lumpsum'}</div>
              <div class="pill-amount">+${formatCompactCurrency(evt.amount)}</div>
            `;
            card.addEventListener('click', (e) => {
              e.stopPropagation();
              if (this.onEditEvent) this.onEditEvent(evt);
            });
            eventBucket.appendChild(card);
          }
        } else if (evt.type === 'swp') {
          const start = evt.startMonth || 1;
          const duration = evt.durationMonths || -1;
          const end = duration === -1 ? totalMonths : start + duration;
          if (start <= yearEndMonth && end >= yearStartMonth) {
            const card = document.createElement('div');
            card.className = 'timeline-event-pill type-swp';

            let effectiveAmt = evt.amount;
            if (evt.stepUpPercent && evt.stepUpPercent > 0) {
              const yearsPassed = Math.max(0, Math.floor((yearStartMonth - start) / 12));
              effectiveAmt = effectiveAmt * Math.pow(1 + evt.stepUpPercent / 100, yearsPassed);
            }

            card.innerHTML = `
              <div class="pill-header">
                <span class="pill-badge">SWP</span>
                <span class="pill-tag">Starts M${start}</span>
              </div>
              <div class="pill-title">${evt.name || 'Monthly Withdrawal'}</div>
              <div class="pill-amount">-${formatCompactCurrency(effectiveAmt)}/mo</div>
            `;
            card.addEventListener('click', (e) => {
              e.stopPropagation();
              if (this.onEditEvent) this.onEditEvent(evt);
            });
            eventBucket.appendChild(card);
          }
        }
      });

      // Quick "+ Add here" button
      const addBtn = document.createElement('button');
      addBtn.className = 'timeline-quick-add-btn';
      addBtn.innerHTML = `+ Add in Y${y}`;
      addBtn.title = `Add investment or withdrawal event in Year ${y}`;
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (this.onAddEventAtMonth) {
          this.onAddEventAtMonth(yearStartMonth);
        }
      });
      eventBucket.appendChild(addBtn);

      // Annual summary footer
      if (simulation?.annualData[y - 1]) {
        const yearSummary = simulation.annualData[y - 1];
        const footer = document.createElement('div');
        footer.className = 'timeline-year-footer';
        footer.innerHTML = `
          <div class="footer-portfolio">Balance: <strong>${formatCompactCurrency(yearSummary.closingBalance)}</strong></div>
          <div class="footer-details">
            ${yearSummary.totalInvested > 0 ? `<span class="inv">+${formatCompactCurrency(yearSummary.totalInvested)}</span>` : ''}
            ${yearSummary.swpAmount > 0 ? `<span class="with">-${formatCompactCurrency(yearSummary.swpAmount)}</span>` : ''}
          </div>
        `;
        col.appendChild(footer);
      }

      col.appendChild(eventBucket);
      track.appendChild(col);
    }

    timelineWrapper.appendChild(track);
    this.container.appendChild(timelineWrapper);
  }
}
