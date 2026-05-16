const express = require('express');
const router  = express.Router();
const Promo   = require('../models/Promo');

// GET /api/promos/:code — validate a promo code (public, no auth needed)
router.get('/:code', async (req, res) => {
  try {
    const promo = await Promo.findOne({
      code: req.params.code.toUpperCase(),
      isActive: true,
    });

    if (!promo)
      return res.status(404).json({ success: false, message: 'Invalid or expired promo code' });

    if (promo.maxUses !== null && promo.uses >= promo.maxUses)
      return res.status(400).json({ success: false, message: 'This promo code has reached its usage limit' });

    res.json({ success: true, code: promo.code, discountPct: promo.discountPct });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
