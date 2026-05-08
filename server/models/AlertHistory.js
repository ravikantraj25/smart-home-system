const mongoose = require('mongoose');

const alertHistorySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['GAS_LEAK', 'FIRE', 'MANUAL_ALERT', 'MANUAL_CALL', 'INTRUSION', 'POWER_SURGE'],
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'high',
    },
    gasValue: { type: Number, default: 0 },
    waterLevel: { type: Number, default: 0 },
    currentAmps: { type: Number, default: 0 },

    // Notification status
    whatsappSent: { type: Boolean, default: false },
    callSent: { type: Boolean, default: false },

    // Response details
    whatsappResults: [{ type: mongoose.Schema.Types.Mixed }],
    callResult: { type: mongoose.Schema.Types.Mixed },

    // Resolution
    resolved: { type: Boolean, default: false },
    resolvedAt: { type: Date, default: null },
    resolvedBy: { type: String, default: null },
    notes: { type: String, default: '' },

    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

alertHistorySchema.index({ timestamp: -1 });
alertHistorySchema.index({ type: 1, timestamp: -1 });

module.exports = mongoose.model('AlertHistory', alertHistorySchema);
