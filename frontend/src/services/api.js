const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1';

export async function fetchOverview() {
  const res = await fetch(`${API_BASE}/dashboard/overview`);
  if (!res.ok) throw new Error('Failed to fetch dashboard overview');
  return res.json();
}

export async function fetchInventory(warehouseId = '', category = '', maxDos = '') {
  let url = `${API_BASE}/inventory/?`;
  if (warehouseId) url += `warehouse_id=${encodeURIComponent(warehouseId)}&`;
  if (category) url += `category=${encodeURIComponent(category)}&`;
  if (maxDos) url += `max_dos=${encodeURIComponent(maxDos)}&`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch inventory');
  return res.json();
}

export async function fetchForecast(productId, warehouseId, horizonDays = 14) {
  const res = await fetch(`${API_BASE}/forecasting/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, warehouse_id: warehouseId, horizon_days: horizonDays })
  });
  if (!res.ok) throw new Error('Failed to generate forecast');
  return res.json();
}

export async function fetchOptimization(sku, destinationWh, delayDays = 5, budget = 50000) {
  const res = await fetch(`${API_BASE}/optimization/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenario_type: 'inter_wh_transfer',
      sku,
      destination_wh: destinationWh,
      supplier_delay_days: delayDays,
      budget_limit: budget,
      target_service_level: 0.95
    })
  });
  if (!res.ok) throw new Error('Failed to run optimization simulation');
  return res.json();
}

export async function fetchSuppliers() {
  const res = await fetch(`${API_BASE}/suppliers/`);
  if (!res.ok) throw new Error('Failed to fetch suppliers');
  return res.json();
}

export async function createDraftPO(productId, warehouseId, quantity) {
  const res = await fetch(`${API_BASE}/suppliers/draft-po`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ product_id: productId, warehouse_id: warehouseId, quantity })
  });
  if (!res.ok) throw new Error('Failed to generate draft PO');
  return res.json();
}

export async function fetchShipments() {
  const res = await fetch(`${API_BASE}/logistics/shipments`);
  if (!res.ok) throw new Error('Failed to fetch shipments');
  return res.json();
}

export async function fetchCarriers() {
  const res = await fetch(`${API_BASE}/logistics/carriers`);
  if (!res.ok) throw new Error('Failed to fetch carriers');
  return res.json();
}

export async function fetchKnowledgeDocs() {
  const res = await fetch(`${API_BASE}/knowledge/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function queryKnowledge(queryText) {
  const res = await fetch(`${API_BASE}/knowledge/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: queryText, top_k: 3 })
  });
  if (!res.ok) throw new Error('Failed to query knowledge hub');
  return res.json();
}

export async function fetchActions() {
  const res = await fetch(`${API_BASE}/actions/`);
  if (!res.ok) throw new Error('Failed to fetch actions');
  return res.json();
}

export async function submitActionDecision(actionId, decision, reviewer = 'Supply Chain Manager', notes = '') {
  const res = await fetch(`${API_BASE}/actions/${actionId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision, reviewer, notes })
  });
  if (!res.ok) throw new Error('Failed to submit action decision');
  return res.json();
}

export async function sendCopilotChat(prompt) {
  const res = await fetch(`${API_BASE}/copilot/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  if (!res.ok) throw new Error('Failed to send copilot prompt');
  return res.json();
}

export async function fetchProducts() {
  const res = await fetch(`${API_BASE}/products/`);
  if (!res.ok) throw new Error('Failed to fetch products');
  return res.json();
}

export async function fetchWarehouses() {
  const res = await fetch(`${API_BASE}/warehouses/`);
  if (!res.ok) throw new Error('Failed to fetch warehouses');
  return res.json();
}
