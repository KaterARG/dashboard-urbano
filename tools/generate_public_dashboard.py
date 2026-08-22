#!/usr/bin/env python3
"""Generate the public, sanitized dashboard dataset.

Reads a local Master snapshot and writes a JSON safe to commit publicly. It
deliberately omits customers, orders, destinations, cash, purchases, recipes,
costs and exact inventory quantities.
"""

from __future__ import annotations

import argparse
import json
from collections import defaultdict
from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path


def text(value: object) -> str:
    return str(value).strip() if value is not None else ""


def amount(value: object) -> Decimal:
    raw = text(value).replace("$", "").replace(" ", "")
    if not raw:
        return Decimal("0")
    if "," in raw and "." in raw:
        raw = raw.replace(".", "").replace(",", ".")
    elif "," in raw:
        raw = raw.replace(",", ".")
    try:
        return Decimal(raw)
    except InvalidOperation:
        return Decimal("0")


def number(value: Decimal) -> float:
    return float(value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def as_date(value: object) -> date | None:
    raw = text(value).split(" ")[0]
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def sheet(snapshot: dict, title: str) -> list[list[str]]:
    for entry in snapshot.get("sheets", []):
        if entry.get("title") == title:
            return entry.get("formatted_values") or []
    return []


def row_value(row: list[str], headers: list[str], name: str) -> str:
    try:
        index = headers.index(name)
    except ValueError:
        return ""
    return row[index] if index < len(row) else ""


def stock_status(value: str) -> str:
    value = value.upper()
    if any(word in value for word in ("REPOS", "FALTA", "CRIT")):
        return "REPOSICIÓN NECESARIA"
    if any(word in value for word in ("REVIS", "CONTROL")):
        return "REVISAR"
    return "OK"


def month_label(value: date) -> str:
    names = ("enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre")
    return f"{names[value.month - 1].capitalize()} {value.year}"


def main() -> None:
    parser = argparse.ArgumentParser(description="Crea el JSON público anónimo del dashboard.")
    parser.add_argument("snapshot", type=Path, help="Ruta local al master_snapshot.json")
    parser.add_argument("--output", type=Path, default=Path("public/dashboard-data.json"))
    args = parser.parse_args()
    master = json.loads(args.snapshot.read_text(encoding="utf-8"))
    sales_rows, stock_rows = sheet(master, "VENTAS"), sheet(master, "STOCK")
    if not sales_rows or not stock_rows:
        raise SystemExit("El snapshot debe contener las hojas VENTAS y STOCK.")

    sales_headers, stock_headers = sales_rows[0], stock_rows[0]
    sales = []
    for row in sales_rows[1:]:
        sale_date = as_date(row_value(row, sales_headers, "Fecha Compra"))
        product = text(row_value(row, sales_headers, "Producto"))
        if sale_date and product:
            sales.append({
                "date": sale_date,
                "product": product,
                "gross": amount(row_value(row, sales_headers, "SubTotal") or row_value(row, sales_headers, "Facturación")),
                "net": amount(row_value(row, sales_headers, "Total Neto")),
                "profit": amount(row_value(row, sales_headers, "Ganancia")),
                "quantity": amount(row_value(row, sales_headers, "Cantidad")),
                "shipping": text(row_value(row, sales_headers, "Envios")) or "Sin dato",
            })

    latest = max((sale["date"] for sale in sales), default=date.today())
    scoped = [sale for sale in sales if sale["date"] >= latest.replace(day=1)]
    gross = sum((sale["gross"] for sale in scoped), Decimal("0"))
    net = sum((sale["net"] for sale in scoped), Decimal("0"))
    profit = sum((sale["profit"] for sale in scoped), Decimal("0"))
    units = sum((sale["quantity"] for sale in scoped), Decimal("0"))
    by_day: dict[date, Decimal] = defaultdict(Decimal)
    products: dict[str, dict] = defaultdict(lambda: {"gross": Decimal("0"), "qty": Decimal("0"), "orders": 0})
    logistics: dict[str, int] = defaultdict(int)
    for sale in scoped:
        by_day[sale["date"]] += sale["gross"]
        products[sale["product"]]["gross"] += sale["gross"]
        products[sale["product"]]["qty"] += sale["quantity"]
        products[sale["product"]]["orders"] += 1
        logistics[sale["shipping"]] += 1

    alerts = []
    for row in stock_rows[1:]:
        sku, name = text(row_value(row, stock_headers, "SKU")), text(row_value(row, stock_headers, "Producto"))
        status = stock_status(text(row_value(row, stock_headers, "Estado")))
        if sku and name and status != "OK":
            alerts.append({"sku": sku, "name": name, "status": status})

    payload = {
        "schemaVersion": 1,
        "generatedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "period": month_label(latest),
        "privacy": "Datos agregados y anónimos. No incluye clientes, órdenes, caja, compras, recetas, costos ni cantidades de stock.",
        "metrics": {
            "grossSales": number(gross), "netReceived": number(net), "registeredProfit": number(profit),
            "orders": len(scoped), "units": number(units),
            "marginOnGross": number((profit / gross * Decimal("100")) if gross else Decimal("0")),
            "critical": len(alerts),
        },
        "charts": {
            "salesByDay": [{"name": day.strftime("%d/%m"), "value": number(value)} for day, value in sorted(by_day.items())],
            "logistics": [{"name": name, "count": count} for name, count in sorted(logistics.items(), key=lambda item: item[1], reverse=True)],
        },
        "topProducts": [
            {"name": name, "gross": number(stats["gross"]), "qty": number(stats["qty"]), "orders": stats["orders"]}
            for name, stats in sorted(products.items(), key=lambda item: item[1]["gross"], reverse=True)[:8]
        ],
        "toRestock": sorted(alerts, key=lambda item: (item["status"], item["name"]))[:12],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Archivo público generado: {args.output}")


if __name__ == "__main__":
    main()
