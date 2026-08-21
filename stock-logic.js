(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.StockLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  const partKeys = ['ssd256', 'ssd512', 'ram8', 'ram16', 'charger65', 'charger150', 'powerCables'];
  const priceKeys = ['ssd256', 'ssd512', 'ram8', 'ram16', 'charger65', 'charger150', 'olxAd', 'engraving', 'euroRate'];
  const defaultStockPrices = Object.freeze({
    ssd256: 800,
    ssd512: 1600,
    ram8: 800,
    ram16: 1600,
    charger65: 400,
    charger150: 900,
    olxAd: 300,
    engraving: 200,
    euroRate: 50
  });

  function normalizeStockParts(value){
    const source = value && typeof value === 'object' ? value : {};
    return partKeys.reduce((result, key) => {
      result[key] = Math.max(0, Math.floor(Number(source[key]) || 0));
      return result;
    }, {});
  }

  function normalizeStockPrices(value){
    const source = value && typeof value === 'object' ? value : {};
    return priceKeys.reduce((result, key) => {
      const amount = Number(source[key]);
      const allowsZero = key === 'olxAd' || key === 'engraving';
      result[key] = Number.isFinite(amount) && (allowsZero ? amount >= 0 : amount > 0)
        ? Math.round(amount * 100) / 100
        : defaultStockPrices[key];
      return result;
    }, {});
  }

  function updateStock(stock, changes){
    const next = normalizeStockParts(stock);
    const deductions = [];
    let becameEmpty = false;
    Object.entries(changes).forEach(([key, amount]) => {
      if(!amount) return;
      if(amount < 0){
        becameEmpty ||= next[key] > 0 && next[key] + amount <= 0;
        next[key] = Math.max(0, next[key] + amount);
        deductions.push(key);
      } else {
        next[key] += amount;
      }
    });
    return { stock: next, deductions, becameEmpty };
  }

  function deductForSale(modelType, stock){
    if(modelType === 'Zbook') return updateStock(stock, { charger150: -1, powerCables: -1 });
    if(modelType === 'Elitebook') return updateStock(stock, { charger65: -1, powerCables: -1 });
    return updateStock(stock, {});
  }

  function addChargerForReceipt(modelType, stock){
    if(modelType === 'Zbook') return updateStock(stock, { charger150: 1 });
    if(modelType === 'Elitebook') return updateStock(stock, { charger65: 1 });
    return updateStock(stock, {});
  }

  function deductPartsForReceipt(ssdCost, ramCost, stock, prices){
    const normalizedPrices = normalizeStockPrices(prices);
    const changes = {};
    if(Number(ssdCost) === normalizedPrices.ssd256) changes.ssd256 = -1;
    else if(Number(ssdCost) === normalizedPrices.ssd512) changes.ssd512 = -1;
    if(Number(ramCost) === normalizedPrices.ram8) changes.ram8 = -1;
    else if(Number(ramCost) === normalizedPrices.ram16) changes.ram16 = -1;
    return updateStock(stock, changes);
  }

  return { defaultStockPrices, normalizeStockParts, normalizeStockPrices, deductForSale, addChargerForReceipt, deductPartsForReceipt };
});
