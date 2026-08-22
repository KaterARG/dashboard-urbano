import * as XLSX from 'xlsx';

const number = (value) => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (value == null || value === '') return 0;
  const text = String(value).trim();
  if (text.includes(',') && text.includes('.')) return Number(text.replace(/\./g, '').replace(',', '.')) || 0;
  if (text.includes(',')) return Number(text.replace(',', '.')) || 0;
  return Number(text) || 0;
};

const dateFromCell = (value) => {
  if (!value) return null;
  if (typeof value === 'number') return new Date(Math.round((value - 25569) * 86400 * 1000));
  const text = String(value).split(' ')[0];
  const parts = text.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts.map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const displayDate = (value) => {
  const date = dateFromCell(value);
  return date ? date.toLocaleDateString('es-AR') : 'Sin fecha';
};

const isSameMonth = (date, reference) => date
  && date.getMonth() === reference.getMonth()
  && date.getFullYear() === reference.getFullYear();

const emptyLogistics = () => ({
  'Mercado Envíos': { total: 0, count: 0 },
  Flex: { total: 0, count: 0, sub: { Marina: { total: 0, count: 0 }, LBS: { total: 0, count: 0 } } },
});

export const parseMasterExcel = (data) => {
  const workbook = XLSX.read(data, { type: 'array' });
  const ventasSheet = workbook.Sheets.VENTAS;
  const stockSheet = workbook.Sheets.STOCK;
  if (!ventasSheet || !stockSheet) throw new Error('El archivo debe incluir las hojas VENTAS y STOCK.');

  const ventas = XLSX.utils.sheet_to_json(ventasSheet);
  const stock = XLSX.utils.sheet_to_json(stockSheet);
  const today = new Date();
  const month = { grossSales: 0, netReceived: 0, registeredProfit: 0, ads: 0, units: 0 };
  const salesByDay = {};
  const logistics = emptyLogistics();
  const products = {};
  const recentSales = [];

  ventas.forEach((row) => {
    const date = dateFromCell(row['Fecha Compra']);
    const gross = number(row.SubTotal ?? row.Facturación);
    const net = number(row['Total Neto']);
    const profit = number(row.Ganancia);
    const ads = number(row.Publicidad);
    const qty = number(row.Cantidad);
    const product = row.Producto || 'Producto sin nombre';
    const shippingType = String(row.Envios || '').trim();
    const logisticsProvider = String(row.Logistica || '').trim();
    const shippingCost = number(row.$Envios);

    if (isSameMonth(date, today)) {
      month.grossSales += gross;
      month.netReceived += net;
      month.registeredProfit += profit;
      month.ads += ads;
      month.units += qty;
      const key = displayDate(row['Fecha Compra']);
      salesByDay[key] = (salesByDay[key] || 0) + gross;
      if (!products[product]) products[product] = { name: product, gross: 0, qty: 0 };
      products[product].gross += gross;
      products[product].qty += qty;
      recentSales.push({ date, displayDate: key, product, channel: row.Canal || 'Sin canal', qty, gross });
    }

    if (shippingType === 'Flex') {
      logistics.Flex.total += shippingCost;
      logistics.Flex.count += 1;
      if (logisticsProvider === 'Marina' || logisticsProvider === 'LBS') {
        logistics.Flex.sub[logisticsProvider].total += shippingCost;
        logistics.Flex.sub[logisticsProvider].count += 1;
      }
    } else if (shippingType === 'Mercado Envios') {
      logistics['Mercado Envíos'].total += shippingCost;
      logistics['Mercado Envíos'].count += 1;
    }
  });

  const inventory = stock.map((row) => {
    const current = number(row['Stock Actual']);
    const minimum = number(row['Stock Minimo']);
    const sourceStatus = String(row.Estado || '').toUpperCase();
    const status = current <= minimum || sourceStatus.includes('FALTA') || sourceStatus.includes('REPOSICIÓN') ? 'REVISAR' : 'OK';
    return { sku: row.SKU || 'N/A', name: row.Producto || 'Sin nombre', stock: current, min: minimum, status };
  });

  const chartData = Object.entries(salesByDay)
    .map(([name, value]) => ({ name, value, date: dateFromCell(name) }))
    .sort((a, b) => a.date - b.date)
    .slice(-31)
    .map(({ name, value }) => ({ name, value }));

  return {
    period: today.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
    metrics: {
      ...month,
      marginOnGross: month.grossSales > 0 ? (month.registeredProfit / month.grossSales) * 100 : 0,
      critical: inventory.filter((item) => item.status === 'REVISAR').length,
    },
    charts: { salesByDay: chartData, logistics },
    toRestock: inventory.filter((item) => item.status === 'REVISAR').sort((a, b) => a.stock - b.stock).slice(0, 10),
    topProducts: Object.values(products).sort((a, b) => b.gross - a.gross).slice(0, 10),
    fullInventory: inventory,
    fullSales: recentSales.sort((a, b) => b.date - a.date).slice(0, 50),
  };
};
