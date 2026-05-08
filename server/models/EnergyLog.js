const mongoose = require('mongoose');

const energyLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    // ─── Instantaneous readings ─────────────────────────────────────────
    currentAmps: { type: Number, default: 0 },       // ACS712 reading in Amps
    powerWatts: { type: Number, default: 0 },         // current * 220V
    voltage: { type: Number, default: 220 },          // assumed 220V India

    // ─── Device-level breakdown ─────────────────────────────────────────
    devices: {
      light: { type: Boolean, default: false },       // relay1 ON?
      motor: { type: Boolean, default: false },       // motor ON?
      door: { type: String, default: 'CLOSED' },      // OPEN/CLOSED
    },

    // ─── Gas / Safety snapshot ──────────────────────────────────────────
    gasLevel: { type: Number, default: 0 },
    waterLevel: { type: Number, default: 0 },

    // ─── Aggregation bucket ─────────────────────────────────────────────
    // Which hour this reading belongs to (for hourly aggregation queries)
    hour: { type: Date, index: true },  // e.g. 2026-05-09T14:00:00Z

    // ─── Energy consumed (Wh) in this interval ──────────────────────────
    // Calculated: powerWatts * (intervalSeconds / 3600)
    energyWh: { type: Number, default: 0 },

    timestamp: { type: Date, default: Date.now, index: true },
  },
  {
    timestamps: false,  // we use our own 'timestamp' field
  }
);

// ─── Compound indexes for fast analytics queries ────────────────────────────
energyLogSchema.index({ hour: 1, userId: 1 });
energyLogSchema.index({ timestamp: -1 });

// ─── Static: Log a sensor reading and calculate energy ──────────────────────
energyLogSchema.statics.logReading = async function (sensorData, controls) {
  const now = new Date();
  const hourBucket = new Date(now);
  hourBucket.setMinutes(0, 0, 0); // round down to the hour

  const powerWatts = sensorData.current * 220;
  // Assume readings come every ~5 seconds
  const intervalSeconds = 5;
  const energyWh = (powerWatts * intervalSeconds) / 3600;

  return this.create({
    currentAmps: sensorData.current,
    powerWatts,
    voltage: 220,
    devices: {
      light: controls.relay1 === 'ON',
      motor: controls.motor === 'ON',
      door: controls.door,
    },
    gasLevel: sensorData.gas,
    waterLevel: sensorData.waterLevel,
    hour: hourBucket,
    energyWh,
    timestamp: now,
  });
};

// ─── Static: Get hourly energy consumption summary ──────────────────────────
energyLogSchema.statics.getHourlyConsumption = async function (hoursBack = 24) {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
  return this.aggregate([
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: '$hour',
        totalEnergyWh: { $sum: '$energyWh' },
        avgPowerWatts: { $avg: '$powerWatts' },
        maxPowerWatts: { $max: '$powerWatts' },
        minPowerWatts: { $min: '$powerWatts' },
        avgGasLevel: { $avg: '$gasLevel' },
        avgWaterLevel: { $avg: '$waterLevel' },
        readings: { $sum: 1 },
        lightOnTime: {
          $sum: { $cond: ['$devices.light', 1, 0] },
        },
        motorOnTime: {
          $sum: { $cond: ['$devices.motor', 1, 0] },
        },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// ─── Static: Get daily energy consumption summary ───────────────────────────
energyLogSchema.statics.getDailyConsumption = async function (daysBack = 7) {
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  return this.aggregate([
    { $match: { timestamp: { $gte: since } } },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' },
        },
        totalEnergyWh: { $sum: '$energyWh' },
        avgPowerWatts: { $avg: '$powerWatts' },
        maxPowerWatts: { $max: '$powerWatts' },
        readings: { $sum: 1 },
        avgGasLevel: { $avg: '$gasLevel' },
        avgWaterLevel: { $avg: '$waterLevel' },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// ─── Static: Get energy stats summary ───────────────────────────────────────
energyLogSchema.statics.getEnergySummary = async function () {
  const now = new Date();

  // Today's energy
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  // This month's energy
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayStats, monthStats, currentReading] = await Promise.all([
    this.aggregate([
      { $match: { timestamp: { $gte: todayStart } } },
      {
        $group: {
          _id: null,
          totalEnergyWh: { $sum: '$energyWh' },
          avgPowerWatts: { $avg: '$powerWatts' },
          maxPowerWatts: { $max: '$powerWatts' },
          readings: { $sum: 1 },
        },
      },
    ]),
    this.aggregate([
      { $match: { timestamp: { $gte: monthStart } } },
      {
        $group: {
          _id: null,
          totalEnergyWh: { $sum: '$energyWh' },
          avgPowerWatts: { $avg: '$powerWatts' },
          maxPowerWatts: { $max: '$powerWatts' },
          readings: { $sum: 1 },
        },
      },
    ]),
    this.findOne().sort({ timestamp: -1 }).lean(),
  ]);

  const today = todayStats[0] || { totalEnergyWh: 0, avgPowerWatts: 0, maxPowerWatts: 0, readings: 0 };
  const month = monthStats[0] || { totalEnergyWh: 0, avgPowerWatts: 0, maxPowerWatts: 0, readings: 0 };

  // Estimated monthly cost (India avg: ₹6/kWh)
  const costPerKwh = 6;
  const monthlyKwh = month.totalEnergyWh / 1000;
  const estimatedCost = monthlyKwh * costPerKwh;

  return {
    today: {
      energyWh: Math.round(today.totalEnergyWh * 100) / 100,
      energyKwh: Math.round((today.totalEnergyWh / 1000) * 1000) / 1000,
      avgPowerWatts: Math.round(today.avgPowerWatts * 10) / 10,
      peakPowerWatts: Math.round(today.maxPowerWatts * 10) / 10,
      readings: today.readings,
    },
    month: {
      energyWh: Math.round(month.totalEnergyWh * 100) / 100,
      energyKwh: Math.round(monthlyKwh * 1000) / 1000,
      avgPowerWatts: Math.round(month.avgPowerWatts * 10) / 10,
      peakPowerWatts: Math.round(month.maxPowerWatts * 10) / 10,
      estimatedCostINR: Math.round(estimatedCost * 100) / 100,
      readings: month.readings,
    },
    currentReading: currentReading || null,
  };
};

module.exports = mongoose.model('EnergyLog', energyLogSchema);
