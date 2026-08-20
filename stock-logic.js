(function(root, factory){
  const api = factory();
  if(typeof module === 'object' && module.exports) module.exports = api;
  else root.StockLogic = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function(){
  const partKeys = ['ssd256', 'ssd512', 'ram8', 'ram16', 'charger65', 'charger150', 'powerCables'];

  function normalizeStockParts(value){
    const source = value && typeof value === 'object' ? value : {};
    return partKeys.reduce((result, key) => {
      result[key] = Math.max(0, Math.floor(Number(source[key]) || 0));
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

  function deductPartsForReceipt(ssdCost, ramCost, stock){
    const changes = {};
    if(Number(ssdCost) === 800) changes.ssd256 = -1;
    if(Number(ssdCost) === 1600) changes.ssd512 = -1;
    if(Number(ramCost) === 800) changes.ram8 = -1;
    if(Number(ramCost) === 1600) changes.ram16 = -1;
    return updateStock(stock, changes);
  }

  return { normalizeStockParts, deductForSale, addChargerForReceipt, deductPartsForReceipt };
});
