(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.SalesAnalytics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  // Match the UTC calendar-day convention used by the sold-card counters.
  function durationDays(startValue, endValue){
    if(!startValue || !endValue) return null;
    const start = new Date(startValue);
    const end = new Date(endValue);
    if(!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) return null;
    return (Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
      - Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())) / 86400000;
  }

  // The caller supplies the same sold records as the financial summary.
  function summarize(sold){
    function average(startKey, endKey){
      const values = sold.map(item => durationDays(item[startKey], item[endKey])).filter(value => value !== null);
      return { days: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null, count: values.length };
    }
    return { delivery: average('created_at', 'received_at'), sale: average('received_at', 'sold_at') };
  }
  function monthlySales(sold, now = new Date()){
    const currentMonth = now.getUTCFullYear() * 12 + now.getUTCMonth();
    const months = sold.filter(item => item.sold_at).map(item => new Date(item.sold_at))
      .filter(date => Number.isFinite(date.getTime()))
      .map(date => date.getUTCFullYear() * 12 + date.getUTCMonth())
      .filter(month => month < currentMonth);
    if(!months.length) return { average: null, count: 0, months: 0 };
    const firstMonth = months.reduce((first, month) => Math.min(first, month), currentMonth);
    const monthCount = currentMonth - firstMonth;
    return { average: months.length / monthCount, count: months.length, months: monthCount };
  }
  return { durationDays, summarize, monthlySales };
});
