const express = require('express');
const AlertHistory = require('../models/AlertHistory');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/alerts/history?limit=50 — Alert history from MongoDB
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = await AlertHistory.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, total: alerts.length, alerts });
  } catch (err) {
    console.error('❌ Alert history error:', err.message);
    res.status(500).json({ error: 'Failed to fetch alert history.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/alerts/stats — Alert statistics
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, today, thisWeek, unresolved, byType] = await Promise.all([
      AlertHistory.countDocuments(),
      AlertHistory.countDocuments({ timestamp: { $gte: todayStart } }),
      AlertHistory.countDocuments({ timestamp: { $gte: weekStart } }),
      AlertHistory.countDocuments({ resolved: false }),
      AlertHistory.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    res.json({
      success: true,
      stats: {
        total,
        today,
        thisWeek,
        unresolved,
        byType: byType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
      },
    });
  } catch (err) {
    console.error('❌ Alert stats error:', err.message);
    res.status(500).json({ error: 'Failed to fetch alert stats.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/alerts/:id/resolve — Mark alert as resolved
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id/resolve', optionalAuth, async (req, res) => {
  try {
    const { notes } = req.body;
    const alert = await AlertHistory.findByIdAndUpdate(
      req.params.id,
      {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: req.user?.name || 'System',
        notes: notes || '',
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found.' });
    }

    res.json({ success: true, alert });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve alert.' });
  }
});

module.exports = router;
