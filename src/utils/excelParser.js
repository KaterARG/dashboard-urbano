import * as XLSX from 'xlsx';

export const parseMasterExcel = (data) => {
  const workbook = XLSX.read(data, { type: 'array' });
  
  // 1. Process VENTAS
  const ventasSheet = workbook.Sheets['VENTAS'];
  if (!ventasSheet) throw new Error("No se encontró la hoja VENTAS");
  const ventasData = XLSX.utils.sheet_to_json(ventasSheet);
  
  let totalSales = 0;
  let totalProfit = 0;
  let salesByDay = {};
  let logisticsSummary = {
    'Mercado Envíos': { total: 0, count: 0 },
    'Flex': { 
      total: 0, 
      count: 0, 
      sub: { 'Marina': { total: 0, count: 0 }, 'LBS': { total: 0, count: 0 } } 
    }
  };
  let productStats = {};
  let clientsData = {};

  ventasData.forEach(row => {
    const sale = parseFloat(row['Total Neto']) || 0;
    const profit = parseFloat(row['Ganancia']) || 0;
    const dateValue = row['Fecha Compra'];
    const enviosFlag = (row['Envios'] || '').toString().trim(); // Column Q
    const logisticaRaw = (row['Logistica'] || '').toString().trim(); // Column S
    const enviosCost = parseFloat(row['$Envios']) || 0;
    const product = row['Producto'] || 'Desconocido';
    const qty = parseInt(row['Cantidad']) || 0;
    const client = row['Cliente'] || 'Consumidor Final';

    totalSales += sale;
    totalProfit += profit;

    if (dateValue) {
      const dateStr = formatDate(dateValue);
      salesByDay[dateStr] = (salesByDay[dateStr] || 0) + sale;
    }

    // Correct Logistics Logic based on Column Q (Envios)
    if (enviosFlag === 'Flex') {
      logisticsSummary['Flex'].total += enviosCost;
      logisticsSummary['Flex'].count += 1;
      
      if (logisticaRaw === 'Marina' || logisticaRaw === 'LBS') {
        logisticsSummary['Flex'].sub[logisticaRaw].total += enviosCost;
        logisticsSummary['Flex'].sub[logisticaRaw].count += 1;
      }
    } else if (enviosFlag === 'Mercado Envios') {
      logisticsSummary['Mercado Envíos'].total += enviosCost;
      logisticsSummary['Mercado Envíos'].count += 1;
    }
    // If enviosFlag is empty, we don't count it as a shipment

    // Top Products
    if (!productStats[product]) productStats[product] = { name: product, sales: 0, profit: 0, qty: 0 };
    productStats[product].sales += sale;
    productStats[product].profit += profit;
    productStats[product].qty += qty;

    // Clients
    if (!clientsData[client]) clientsData[client] = { name: client, totalBought: 0, orders: 0 };
    clientsData[client].totalBought += sale;
    clientsData[client].orders += 1;
  });

  // 2. Process STOCK
  const stockSheet = workbook.Sheets['STOCK'];
  if (!stockSheet) throw new Error("No se encontró la hoja STOCK");
  const stockData = XLSX.utils.sheet_to_json(stockSheet);
  
  let criticalItems = 0;
  let toRestock = [];
  let fullInventory = [];

  stockData.forEach(row => {
    const sku = row['SKU'];
    const producto = row['Producto'];
    const stockActual = parseFloat(row['Stock Actual']) || 0;
    const stockMin = parseFloat(row['Stock Minimo']) || 0;
    const estado = (row['Estado'] || '').toString().toUpperCase();

    const item = {
      sku: sku || 'N/A',
      name: producto || 'N/A',
      stock: stockActual,
      min: stockMin,
      status: estado
    };

    fullInventory.push(item);

    if (estado.includes('REPOSICIÓN') || estado.includes('FALTA')) {
      criticalItems++;
      toRestock.push(item);
    }
  });

  const chartData = Object.entries(salesByDay)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => new Date(a.name) - new Date(b.name));

  return {
    metrics: {
      sales: totalSales,
      profit: totalProfit,
      margin: totalSales > 0 ? (totalProfit / totalSales) * 100 : 0,
      critical: criticalItems
    },
    charts: {
      salesByDay: chartData,
      logistics: logisticsSummary
    },
    toRestock: toRestock.slice(0, 10),
    topProducts: Object.values(productStats).sort((a, b) => b.sales - a.sales).slice(0, 10),
    fullInventory,
    fullSales: ventasData.slice(0, 50).map(s => ({...s, 'Fecha Compra': formatDate(s['Fecha Compra'])})),
    clients: Object.values(clientsData).sort((a, b) => b.totalBought - a.totalBought).slice(0, 20)
  };
};

const formatDate = (excelDate) => {
  if (!excelDate) return 'N/A';
  if (typeof excelDate === 'number') {
    const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
  return excelDate.toString().split(' ')[0];
};
