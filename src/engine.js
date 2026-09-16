/**
 * Discrete Monthly Timeline Simulation Engine & Financial Math
 */

/**
 * Run a full monthly timeline portfolio simulation
 */
export function simulatePortfolio(config) {
  const {
    horizonYears = 10,
    expectedAnnualReturn = 12.0,
    inflationRate = 6.0,
    compoundingFrequency = 'monthly', // 'monthly' | 'annual'
    initialInvestment = 1000000,
    events = [],
    yearReturnOverrides = {}, // { 4: 10.0 }
  } = config;

  const totalMonths = Math.max(1, Math.round(horizonYears * 12));
  const monthlyData = [];
  const annualData = [];

  let currentBalance = 0;
  let cumulativeInvested = 0;
  let cumulativeWithdrawn = 0;
  let cumulativeReturns = 0;
  let depletionMonth = null;
  let peakCorpus = 0;
  let peakMonth = 0;

  // Track cash flows for exact XIRR calculation
  // { month: number, amount: number } where amount < 0 is investment, > 0 is withdrawal
  const xirrCashFlows = [];

  for (let m = 1; m <= totalMonths; m++) {
    const yearIndex = Math.ceil(m / 12);
    const openingBalance = currentBalance;

    // Determine return rate for this month
    const annualRate = yearReturnOverrides[yearIndex] !== undefined
      ? yearReturnOverrides[yearIndex]
      : expectedAnnualReturn;

    const monthlyReturnRate = compoundingFrequency === 'monthly'
      ? Math.pow(1 + Math.max(-0.99, annualRate / 100), 1 / 12) - 1
      : (annualRate / 100) / 12;

    // Calculate Inflows for this month
    let sipAmount = 0;
    let lumpsumAmount = 0;

    // Month 1 initial investment
    if (m === 1 && initialInvestment > 0) {
      lumpsumAmount += initialInvestment;
    }

    // Active events processing
    events.forEach(event => {
      if (event.enabled === false) return;

      if (event.type === 'sip') {
        const start = event.startMonth || 1;
        const end = event.endMonth || totalMonths;
        if (m >= start && m <= end && !event.isPaused) {
          // Check step-up / top-up with configurable start year and mode
          let amt = event.amount;
          const currentEventYear = Math.floor((m - start) / 12) + 1;
          const topUpStartYear = event.topUpStartYear !== undefined && event.topUpStartYear !== null ? Math.max(1, parseInt(event.topUpStartYear)) : 2;
          const topUpYears = currentEventYear >= topUpStartYear ? (currentEventYear - topUpStartYear + 1) : 0;

          const isAbsolute = event.topUpType === 'absolute' || (event.topUpAmount > 0 && !event.stepUpPercent);
          if (isAbsolute && event.topUpAmount > 0) {
            amt = amt + (event.topUpAmount * topUpYears);
          } else if (event.stepUpPercent && event.stepUpPercent > 0) {
            amt = amt * Math.pow(1 + event.stepUpPercent / 100, topUpYears);
          }
          sipAmount += amt;
        }
      } else if (event.type === 'lumpsum') {
        if (event.month === m) {
          lumpsumAmount += event.amount;
        }
      }
    });

    const totalInvestedThisMonth = sipAmount + lumpsumAmount;
    cumulativeInvested += totalInvestedThisMonth;

    // Calculate Outflows (SWP) for this month
    let swpRequested = 0;
    events.forEach(event => {
      if (event.enabled === false) return;

      if (event.type === 'swp') {
        const start = event.startMonth || 1;
        const duration = event.durationMonths || -1;
        const isWithinDuration = duration === -1 || (m >= start && m < start + duration);

        if (m >= start && isWithinDuration) {
          let amt = event.amount;
          if (event.stepUpPercent && event.stepUpPercent > 0) {
            const yearsSinceStart = Math.floor((m - start) / 12);
            amt = amt * Math.pow(1 + event.stepUpPercent / 100, yearsSinceStart);
          }
          swpRequested += amt;
        }
      }
    });

    // Handle withdrawal limits (cannot withdraw more than available corpus)
    const availableBeforeReturn = Math.max(0, openingBalance + totalInvestedThisMonth);
    let actualWithdrawnThisMonth = 0;
    let isDepleted = false;

    if (swpRequested > 0) {
      if (availableBeforeReturn >= swpRequested) {
        actualWithdrawnThisMonth = swpRequested;
      } else {
        actualWithdrawnThisMonth = availableBeforeReturn;
        isDepleted = true;
        if (depletionMonth === null && availableBeforeReturn <= 0.01) {
          depletionMonth = m;
        }
      }
    }

    cumulativeWithdrawn += actualWithdrawnThisMonth;

    // Investor cash flow for XIRR:
    // Money into portfolio = negative flow for investor (-invested)
    // Money withdrawn = positive flow for investor (+withdrawn)
    const netInvestorFlow = actualWithdrawnThisMonth - totalInvestedThisMonth;
    if (netInvestorFlow !== 0) {
      xirrCashFlows.push({ month: m - 1, amount: netInvestorFlow });
    }

    // Balance after cash flows
    const postCashFlowBalance = Math.max(0, openingBalance + totalInvestedThisMonth - actualWithdrawnThisMonth);

    // Compounding growth applied to post cash-flow balance
    const returnsEarned = postCashFlowBalance > 0 ? postCashFlowBalance * monthlyReturnRate : 0;
    const closingBalance = postCashFlowBalance + returnsEarned;

    if (closingBalance <= 0.01 && availableBeforeReturn <= 0.01 && depletionMonth === null) {
      depletionMonth = m;
    }

    cumulativeReturns += returnsEarned;
    currentBalance = closingBalance;

    if (closingBalance > peakCorpus) {
      peakCorpus = closingBalance;
      peakMonth = m;
    }

    // Inflation-adjusted real corpus
    const inflationDiscount = Math.pow(1 + (inflationRate / 100), m / 12);
    const realClosingBalance = closingBalance / inflationDiscount;

    monthlyData.push({
      month: m,
      year: yearIndex,
      monthInYear: ((m - 1) % 12) + 1,
      openingBalance,
      sipAmount,
      lumpsumAmount,
      totalInvested: totalInvestedThisMonth,
      swpRequested,
      swpAmount: actualWithdrawnThisMonth,
      netCashFlow: totalInvestedThisMonth - actualWithdrawnThisMonth,
      returnRateAnnual: annualRate,
      returnsEarned,
      closingBalance,
      realClosingBalance,
      cumulativeInvested,
      cumulativeWithdrawn,
      cumulativeReturns,
      isDepleted: currentBalance <= 0.01 && (openingBalance > 0 || totalInvestedThisMonth > 0),
    });
  }

  // Terminal cash flow for XIRR: portfolio value returned to investor
  if (currentBalance > 0) {
    xirrCashFlows.push({ month: totalMonths, amount: currentBalance });
  }

  // Aggregate into Annual data
  for (let y = 1; y <= horizonYears; y++) {
    const startM = (y - 1) * 12 + 1;
    const endM = Math.min(y * 12, totalMonths);
    const monthsSlice = monthlyData.slice(startM - 1, endM);

    if (monthsSlice.length > 0) {
      const yearOpening = monthsSlice[0].openingBalance;
      const yearClosing = monthsSlice[monthsSlice.length - 1].closingBalance;
      const yearRealClosing = monthsSlice[monthsSlice.length - 1].realClosingBalance;
      const yearSIP = monthsSlice.reduce((sum, item) => sum + item.sipAmount, 0);
      const yearLumpsum = monthsSlice.reduce((sum, item) => sum + item.lumpsumAmount, 0);
      const yearInvested = yearSIP + yearLumpsum;
      const yearSWP = monthsSlice.reduce((sum, item) => sum + item.swpAmount, 0);
      const yearReturns = monthsSlice.reduce((sum, item) => sum + item.returnsEarned, 0);
      const yearAnnualReturnRate = yearReturnOverrides[y] !== undefined ? yearReturnOverrides[y] : expectedAnnualReturn;
      
      const growthPercent = yearOpening + yearInvested > 0
        ? (yearReturns / (yearOpening + yearInvested)) * 100
        : 0;

      annualData.push({
        year: y,
        openingBalance: yearOpening,
        closingBalance: yearClosing,
        realClosingBalance: yearRealClosing,
        sipAmount: yearSIP,
        lumpsumAmount: yearLumpsum,
        totalInvested: yearInvested,
        swpAmount: yearSWP,
        returnsEarned: yearReturns,
        returnRate: yearAnnualReturnRate,
        growthPercent,
        cumulativeInvested: monthsSlice[monthsSlice.length - 1].cumulativeInvested,
        cumulativeWithdrawn: monthsSlice[monthsSlice.length - 1].cumulativeWithdrawn,
        cumulativeReturns: monthsSlice[monthsSlice.length - 1].cumulativeReturns,
      });
    }
  }

  // Calculate XIRR
  const calculatedXIRR = computeXIRR(xirrCashFlows);

  // Calculate simple CAGR if applicable
  const netInflow = cumulativeInvested - cumulativeWithdrawn;
  const wealthCreated = currentBalance + cumulativeWithdrawn - cumulativeInvested;
  
  return {
    monthlyData,
    annualData,
    summary: {
      finalCorpus: currentBalance,
      realFinalCorpus: monthlyData[monthlyData.length - 1]?.realClosingBalance || 0,
      totalInvested: cumulativeInvested,
      totalWithdrawn: cumulativeWithdrawn,
      wealthCreated,
      xirr: calculatedXIRR,
      peakCorpus,
      peakMonth,
      depletionMonth,
      isDepleted: depletionMonth !== null,
    },
    xirrCashFlows,
  };
}

/**
 * Exact XIRR calculation using Newton-Raphson iteration with bisection fallback
 * Cash flows: array of { month: number, amount: number }
 */
export function computeXIRR(cashFlows) {
  if (!cashFlows || cashFlows.length < 2) return 0;

  // Check if we have at least one positive and one negative cash flow
  let hasPositive = false;
  let hasNegative = false;
  for (const cf of cashFlows) {
    if (cf.amount > 0) hasPositive = true;
    if (cf.amount < 0) hasNegative = true;
  }
  if (!hasPositive || !hasNegative) return 0;

  // NPV function at annual rate r
  const npv = (r) => {
    let sum = 0;
    for (const cf of cashFlows) {
      const tYears = cf.month / 12;
      const discount = Math.pow(1 + r, tYears);
      if (discount === 0 || !isFinite(discount)) return NaN;
      sum += cf.amount / discount;
    }
    return sum;
  };

  // Derivative of NPV with respect to r
  const dNpv = (r) => {
    let sum = 0;
    for (const cf of cashFlows) {
      const tYears = cf.month / 12;
      const discount = Math.pow(1 + r, tYears + 1);
      if (discount === 0 || !isFinite(discount)) return NaN;
      sum -= (tYears * cf.amount) / discount;
    }
    return sum;
  };

  // Newton-Raphson method
  let rate = 0.10; // Initial guess: 10%
  const maxIterations = 50;
  const tolerance = 1e-6;

  for (let i = 0; i < maxIterations; i++) {
    const fValue = npv(rate);
    const fDerivative = dNpv(rate);

    if (Math.abs(fValue) < tolerance) {
      return rate * 100;
    }

    if (!isFinite(fValue) || !isFinite(fDerivative) || Math.abs(fDerivative) < 1e-12) {
      break; // Fallback to bisection
    }

    const newRate = rate - fValue / fDerivative;
    // Bound rates between -95% and +500%
    if (newRate <= -0.95 || newRate > 5.0) {
      break;
    }

    if (Math.abs(newRate - rate) < tolerance) {
      return newRate * 100;
    }
    rate = newRate;
  }

  // Bisection method fallback
  let low = -0.90;
  let high = 3.00;
  let fLow = npv(low);
  let fHigh = npv(high);

  if (fLow * fHigh > 0) {
    // If same sign, try extended range
    high = 10.0;
    fHigh = npv(high);
    if (fLow * fHigh > 0) return rate * 100;
  }

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    const fMid = npv(mid);

    if (Math.abs(fMid) < tolerance || (high - low) / 2 < tolerance) {
      return mid * 100;
    }

    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }

  return ((low + high) / 2) * 100;
}

/**
 * Goal planning solver: Computes required monthly SIP to reach target corpus
 */
export function solveRequiredSIP(config, targetCorpus) {
  if (!targetCorpus || targetCorpus <= 0) return 0;

  let low = 0;
  let high = targetCorpus;
  let bestSIP = 0;

  for (let iter = 0; iter < 35; iter++) {
    const mid = (low + high) / 2;
    // Clone config and replace base SIP with mid
    const testEvents = config.events.filter(e => e.type !== 'sip' || e.id !== 'base-sip');
    testEvents.push({
      id: 'base-sip',
      name: 'Primary SIP',
      type: 'sip',
      amount: mid,
      startMonth: 1,
      endMonth: config.horizonYears * 12,
      stepUpPercent: 0,
    });

    const result = simulatePortfolio({
      ...config,
      events: testEvents,
    });

    const finalCorpus = result.summary.finalCorpus;
    if (Math.abs(finalCorpus - targetCorpus) < 100) {
      return Math.round(mid);
    }

    if (finalCorpus < targetCorpus) {
      low = mid;
    } else {
      high = mid;
      bestSIP = mid;
    }
  }

  return Math.round(bestSIP);
}
