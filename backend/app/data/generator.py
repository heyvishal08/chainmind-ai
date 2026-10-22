import math
import random
from datetime import date, datetime, timedelta
from typing import Dict, List, Tuple

# Deterministic seed for reproducible portfolio demonstrations
random.seed(42)

CATEGORIES = [
    "Smart Audio",
    "Smart Wearables",
    "Power & Charging",
    "Smart Home & IoT"
]

WAREHOUSES_DEF = [
    {
        "id": "WH-MUM-01",
        "name": "Mumbai Western Distribution Hub",
        "city": "Bhiwandi, Mumbai",
        "region": "West",
        "latitude": 19.2969,
        "longitude": 73.0631,
        "capacity_m3": 45000.0,
        "holding_cost_rate": 0.016,
        "status": "Operational"
    },
    {
        "id": "WH-DEL-01",
        "name": "Delhi NCR Mega Logistics Center",
        "city": "Gurugram, NCR",
        "region": "North",
        "latitude": 28.4595,
        "longitude": 77.0266,
        "capacity_m3": 55000.0,
        "holding_cost_rate": 0.019,
        "status": "Constrained"  # 84% full
    },
    {
        "id": "WH-BLR-01",
        "name": "Bengaluru Southern Gateway Hub",
        "city": "Hosur Road, Bengaluru",
        "region": "South",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "capacity_m3": 40000.0,
        "holding_cost_rate": 0.017,
        "status": "Operational"
    },
    {
        "id": "WH-MAA-01",
        "name": "Chennai Coastal Logistics Facility",
        "city": "Sriperumbudur, Chennai",
        "region": "South-East",
        "latitude": 12.9738,
        "longitude": 79.9400,
        "capacity_m3": 35000.0,
        "holding_cost_rate": 0.015,
        "status": "Operational"
    }
]

SUPPLIERS_DEF = [
    {
        "id": "SUP-001",
        "name": "Apex Microtronics Ltd",
        "tier": 1,
        "country": "India",
        "city": "Pune",
        "contact_email": "supply@apexmicro.in",
        "contract_ref": "MSA-2024-APEX-001",
        "base_lead_time_days": 12,
        "lead_time_variance_days": 1.8,
        "on_time_delivery_rate": 0.94,
        "defect_rate": 0.009,
        "min_order_qty": 150,
        "daily_production_capacity": 3500,
        "risk_score": 18.0,
        "risk_level": "Low"
    },
    {
        "id": "SUP-002",
        "name": "Velox Semiconductor Asia",
        "tier": 2,
        "country": "Taiwan",
        "city": "Hsinchu",
        "contact_email": "orders@veloxsemi.tw",
        "contract_ref": "MSA-2024-VELOX-002",
        "base_lead_time_days": 18,
        "lead_time_variance_days": 3.4,
        "on_time_delivery_rate": 0.88,
        "defect_rate": 0.014,
        "min_order_qty": 300,
        "daily_production_capacity": 5000,
        "risk_score": 42.0,
        "risk_level": "Medium"
    },
    {
        "id": "SUP-003",
        "name": "Zenith Battery Technologies",
        "tier": 1,
        "country": "India",
        "city": "Noida",
        "contact_email": "b2b@zenithbattery.in",
        "contract_ref": "MSA-2024-ZENITH-003",
        "base_lead_time_days": 14,
        "lead_time_variance_days": 5.2,
        "on_time_delivery_rate": 0.74,  # Experiencing severe supplier disruption
        "defect_rate": 0.026,
        "min_order_qty": 200,
        "daily_production_capacity": 2000,
        "risk_score": 78.5,
        "risk_level": "Critical"
    },
    {
        "id": "SUP-004",
        "name": "Aura Acoustics Systems",
        "tier": 1,
        "country": "India",
        "city": "Bengaluru",
        "contact_email": "enterprise@aura-acoustics.com",
        "contract_ref": "MSA-2024-AURA-004",
        "base_lead_time_days": 9,
        "lead_time_variance_days": 1.2,
        "on_time_delivery_rate": 0.96,
        "defect_rate": 0.007,
        "min_order_qty": 100,
        "daily_production_capacity": 2800,
        "risk_score": 14.0,
        "risk_level": "Low"
    },
    {
        "id": "SUP-005",
        "name": "Precision Moulds & Enclosures",
        "tier": 2,
        "country": "India",
        "city": "Ahmedabad",
        "contact_email": "sales@precisionmoulds.co.in",
        "contract_ref": "MSA-2024-PREC-005",
        "base_lead_time_days": 11,
        "lead_time_variance_days": 2.1,
        "on_time_delivery_rate": 0.91,
        "defect_rate": 0.018,
        "min_order_qty": 250,
        "daily_production_capacity": 4000,
        "risk_score": 28.0,
        "risk_level": "Low"
    },
    {
        "id": "SUP-006",
        "name": "Quantum Cable & Wire Tech",
        "tier": 2,
        "country": "India",
        "city": "Chennai",
        "contact_email": "ops@quantumwire.in",
        "contract_ref": "MSA-2024-QCBL-006",
        "base_lead_time_days": 7,
        "lead_time_variance_days": 1.0,
        "on_time_delivery_rate": 0.97,
        "defect_rate": 0.005,
        "min_order_qty": 200,
        "daily_production_capacity": 6000,
        "risk_score": 11.0,
        "risk_level": "Low"
    },
    {
        "id": "SUP-007",
        "name": "Pacific Display & Optics",
        "tier": 1,
        "country": "Taiwan",
        "city": "Taipei",
        "contact_email": "global@pacificoptics.tw",
        "contract_ref": "MSA-2024-PDO-007",
        "base_lead_time_days": 22,
        "lead_time_variance_days": 4.8,
        "on_time_delivery_rate": 0.79,
        "defect_rate": 0.021,
        "min_order_qty": 400,
        "daily_production_capacity": 3000,
        "risk_score": 68.0,
        "risk_level": "High"
    },
    {
        "id": "SUP-008",
        "name": "Bharat Sensor Dynamics",
        "tier": 1,
        "country": "India",
        "city": "Hyderabad",
        "contact_email": "biz@bharatsensors.in",
        "contract_ref": "MSA-2024-BSD-008",
        "base_lead_time_days": 10,
        "lead_time_variance_days": 1.4,
        "on_time_delivery_rate": 0.95,
        "defect_rate": 0.008,
        "min_order_qty": 150,
        "daily_production_capacity": 2200,
        "risk_score": 16.0,
        "risk_level": "Low"
    }
]

PRODUCTS_DEF = [
    # Smart Audio
    ("SKU-AUD-101", "Aura Pro Wireless ANC Earbuds", "Smart Audio", 4499.0, 2100.0, 0.18, 0.0012, "SUP-001"),
    ("SKU-AUD-102", "SonicBass 120W Dolby Soundbar", "Smart Audio", 12999.0, 6800.0, 4.20, 0.0280, "SUP-004"),
    ("SKU-AUD-103", "Pulse Sport Bluetooth Headphones", "Smart Audio", 2999.0, 1350.0, 0.28, 0.0025, "SUP-004"),
    ("SKU-AUD-104", "EchoStudio Hi-Res Studio Monitors", "Smart Audio", 18499.0, 9900.0, 5.80, 0.0380, "SUP-004"),
    ("SKU-AUD-105", "PocketGroove Waterproof Speaker", "Smart Audio", 1999.0, 890.0, 0.45, 0.0032, "SUP-001"),
    ("SKU-AUD-106", "Clarity Gaming Headset w/ Mic", "Smart Audio", 3499.0, 1600.0, 0.38, 0.0040, "SUP-004"),
    ("SKU-AUD-107", "Aura Lite TWS Earbuds", "Smart Audio", 1799.0, 780.0, 0.15, 0.0010, "SUP-001"),
    
    # Smart Wearables
    ("SKU-WRB-201", "Titan Chrono AMOLED Smartwatch", "Smart Wearables", 6999.0, 3200.0, 0.12, 0.0015, "SUP-007"),
    ("SKU-WRB-202", "FitTrack Pulse 5 Fitness Band", "Smart Wearables", 2499.0, 1050.0, 0.08, 0.0008, "SUP-002"),
    ("SKU-WRB-203", "Apex Rugged GPS Outdoor Watch", "Smart Wearables", 14999.0, 7500.0, 0.22, 0.0022, "SUP-007"),
    ("SKU-WRB-204", "BioGlow Smart Health Ring", "Smart Wearables", 9999.0, 4600.0, 0.04, 0.0004, "SUP-002"),
    ("SKU-WRB-205", "VibeFit Kids GPS Calling Watch", "Smart Wearables", 3799.0, 1750.0, 0.10, 0.0012, "SUP-007"),
    ("SKU-WRB-206", "Aero Titanium Luxury Smartwatch", "Smart Wearables", 21999.0, 11200.0, 0.18, 0.0020, "SUP-007"),
    ("SKU-WRB-207", "SwimPulse Waterproof Tracker", "Smart Wearables", 3299.0, 1420.0, 0.07, 0.0007, "SUP-002"),
    
    # Power & Charging
    ("SKU-PWR-301", "MagSafe HyperCharge 100W GaN Hub", "Power & Charging", 3999.0, 1850.0, 0.35, 0.0020, "SUP-003"),
    ("SKU-PWR-302", "CarbonCore 20000mAh Power Bank", "Power & Charging", 2499.0, 1150.0, 0.42, 0.0018, "SUP-003"),
    ("SKU-PWR-303", "VoltGrip 65W GaN Dual Wall Charger", "Power & Charging", 1699.0, 720.0, 0.14, 0.0008, "SUP-003"),
    ("SKU-PWR-304", "UltraBraided 240W USB-C 2M Cable", "Power & Charging", 799.0, 260.0, 0.08, 0.0005, "SUP-006"),
    ("SKU-PWR-305", "TriPower 3-in-1 Wireless Stand", "Power & Charging", 3499.0, 1600.0, 0.32, 0.0025, "SUP-003"),
    ("SKU-PWR-306", "SolarVoyage 30W Outdoor Solar Panel", "Power & Charging", 4999.0, 2300.0, 0.85, 0.0060, "SUP-003"),
    ("SKU-PWR-307", "SwiftCar 45W Metal Car Charger", "Power & Charging", 999.0, 380.0, 0.09, 0.0006, "SUP-006"),
    ("SKU-PWR-308", "Titanium Armor Lightning Cable 1.5M", "Power & Charging", 899.0, 310.0, 0.07, 0.0005, "SUP-006"),
    
    # Smart Home & IoT
    ("SKU-IOT-401", "Aura Lumina RGB Smart Ambient Bar", "Smart Home & IoT", 2999.0, 1300.0, 0.65, 0.0045, "SUP-005"),
    ("SKU-IOT-402", "AirSense Pro PM2.5 & CO2 Monitor", "Smart Home & IoT", 4499.0, 2050.0, 0.28, 0.0020, "SUP-008"),
    ("SKU-IOT-403", "Sentinel Ultra 2K Smart Video Doorbell", "Smart Home & IoT", 6499.0, 3100.0, 0.40, 0.0030, "SUP-008"),
    ("SKU-IOT-404", "PureBreeze HEPA Smart Air Purifier", "Smart Home & IoT", 11999.0, 5900.0, 5.20, 0.0450, "SUP-005"),
    ("SKU-IOT-405", "SmartLock Pro Biometric Door Handle", "Smart Home & IoT", 9999.0, 4800.0, 1.80, 0.0120, "SUP-008"),
    ("SKU-IOT-406", "Thermosense WiFi Smart Thermostat", "Smart Home & IoT", 3999.0, 1850.0, 0.25, 0.0018, "SUP-008"),
    ("SKU-IOT-407", "Guardian Water Leak & Freeze Sensor", "Smart Home & IoT", 1499.0, 580.0, 0.12, 0.0009, "SUP-008"),
    ("SKU-IOT-408", "MotionSense Zigbee Smart Sensor Hub", "Smart Home & IoT", 2299.0, 950.0, 0.18, 0.0012, "SUP-008"),
]

def generate_daily_sales_series(
    start_date: date,
    end_date: date,
    product_id: str,
    warehouse_id: str,
    base_demand: float
) -> List[Dict]:
    """Generates realistic daily sales transactions with weekly seasonality,
    annual festive spikes (Diwali, New Year, Republic Day), YoY trend, and stockout events."""
    sales = []
    curr = start_date
    day_idx = 0
    total_days = (end_date - start_date).days + 1
    
    # Regional warehouse weighting
    wh_weight = {
        "WH-DEL-01": 1.25,  # North has largest market share
        "WH-MUM-01": 1.15,  # West
        "WH-BLR-01": 0.95,  # South Tech Corridor
        "WH-MAA-01": 0.65   # Coastal Hub
    }.get(warehouse_id, 1.0)

    while curr <= end_date:
        # 1. Day-of-week seasonality (Fri, Sat, Sun peak)
        weekday = curr.weekday()
        if weekday in (5, 6): # Weekend
            dow_multiplier = 1.35
        elif weekday == 4:    # Friday
            dow_multiplier = 1.15
        elif weekday in (1, 2): # Tue/Wed slower
            dow_multiplier = 0.88
        else:
            dow_multiplier = 0.95

        # 2. Annual festive seasonality
        month = curr.month
        day = curr.day
        is_promo = False
        promo_multiplier = 1.0

        # Diwali season (Mid Oct - Early Nov)
        if (month == 10 and day >= 15) or (month == 11 and day <= 10):
            is_promo = True
            promo_multiplier = 1.85 + (0.2 * math.sin(day_idx / 3.0))
        # New Year / Christmas (Dec 22 - Jan 2)
        elif (month == 12 and day >= 22) or (month == 1 and day <= 3):
            is_promo = True
            promo_multiplier = 1.55
        # Republic Day Sale (Jan 20 - Jan 26)
        elif month == 1 and 20 <= day <= 26:
            is_promo = True
            promo_multiplier = 1.40
        # Freedom Sale (Aug 10 - Aug 16)
        elif month == 8 and 10 <= day <= 16:
            is_promo = True
            promo_multiplier = 1.35

        # 3. Organic annual growth trend (~12% per year)
        growth_multiplier = 1.0 + (0.12 * (day_idx / 365.0))

        # 4. Expected demand lambda for Poisson/Gaussian
        expected = base_demand * wh_weight * dow_multiplier * promo_multiplier * growth_multiplier
        # Add realistic noise
        noise = random.gauss(0, max(1.5, expected * 0.15))
        daily_units = max(0, int(round(expected + noise)))

        # 5. Simulate periodic historical stockouts (e.g. during massive flash sales or supplier delays)
        stockout = False
        unfulfilled = 0
        if is_promo and random.random() < 0.04:
            stockout = True
            unfulfilled = int(daily_units * 0.4)
            daily_units = daily_units - unfulfilled

        sales.append({
            "date": curr,
            "product_id": product_id,
            "warehouse_id": warehouse_id,
            "units_sold": daily_units,
            "stockout_occurred": stockout,
            "unfulfilled_demand": unfulfilled,
            "is_promo_day": is_promo
        })

        curr += timedelta(days=1)
        day_idx += 1

    return sales
