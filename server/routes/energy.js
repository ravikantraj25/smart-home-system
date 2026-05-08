const express = require('express');
const EnergyLog = require('../models/EnergyLog');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/energy/hourly?hours=24 — Hourly energy consumption
// ─────────────────────────────────────────────────────────────────────────────
router.get('/hourly', optionalAuth, async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const data = await EnergyLog.getHourlyConsumption(hours);

    // Format for frontend chart
    const formatted = data.map((item) => ({
      hour: item._id,
      label: new Date(item._id).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Kolkata',
      }),
      totalEnergyWh: Math.round(item.totalEnergyWh * 100) / 100,
      avgPowerWatts: Math.round(item.avgPowerWatts * 10) / 10,
      maxPowerWatts: Math.round(item.maxPowerWatts * 10) / 10,
      minPowerWatts: Math.round(item.minPowerWatts * 10) / 10,
      avgGasLevel: Math.round(item.avgGasLevel),
      avgWaterLevel: Math.round(item.avgWaterLevel),
      readings: item.readings,
      lightOnPercent: item.readings > 0
        ? Math.round((item.lightOnTime / item.readings) * 100)
        : 0,
      motorOnPercent: item.readings > 0
        ? Math.round((item.motorOnTime / item.readings) * 100)
        : 0,
    }));

    res.json({ success: true, hours, data: formatted });
  } catch (err) {
    console.error('❌ Hourly energy error:', err.message);
    res.status(500).json({ error: 'Failed to fetch hourly data.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/energy/daily?days=7 — Daily energy consumption
// ─────────────────────────────────────────────────────────────────────────────
router.get('/daily', optionalAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const data = await EnergyLog.getDailyConsumption(days);

    const formatted = data.map((item) => ({
      date: item._id,
      totalEnergyWh: Math.round(item.totalEnergyWh * 100) / 100,
      totalEnergyKwh: Math.round((item.totalEnergyWh / 1000) * 1000) / 1000,
      avgPowerWatts: Math.round(item.avgPowerWatts * 10) / 10,
      maxPowerWatts: Math.round(item.maxPowerWatts * 10) / 10,
      avgGasLevel: Math.round(item.avgGasLevel),
      avgWaterLevel: Math.round(item.avgWaterLevel),
      readings: item.readings,
      costINR: Math.round((item.totalEnergyWh / 1000) * 6 * 100) / 100,
    }));

    res.json({ success: true, days, data: formatted });
  } catch (err) {
    console.error('❌ Daily energy error:', err.message);
    res.status(500).json({ error: 'Failed to fetch daily data.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/energy/summary — Energy dashboard summary
// ─────────────────────────────────────────────────────────────────────────────
router.get('/summary', optionalAuth, async (req, res) => {
  try {
    const summary = await EnergyLog.getEnergySummary();
    res.json({ success: true, ...summary });
  } catch (err) {
    console.error('❌ Energy summary error:', err.message);
    res.status(500).json({ error: 'Failed to fetch energy summary.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/energy/realtime — Latest 50 readings (for real-time chart)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/realtime', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const readings = await EnergyLog.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json({
      success: true,
      data: readings.reverse().map((r) => ({
        timestamp: r.timestamp,
        powerWatts: Math.round(r.powerWatts * 10) / 10,
        currentAmps: Math.round(r.currentAmps * 1000) / 1000,
        gasLevel: r.gasLevel,
        waterLevel: r.waterLevel,
        devices: r.devices,
      })),
    });
  } catch (err) {
    console.error('❌ Realtime energy error:', err.message);
    res.status(500).json({ error: 'Failed to fetch realtime data.' });
  }
});

module.exports = router;
