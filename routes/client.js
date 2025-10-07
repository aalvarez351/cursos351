const express = require('express');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const { auth } = require('../middleware/auth');

const router = express.Router();

// All client routes require auth
router.use(auth);

// Get my loans
router.get('/loans', async (req, res) => {
  try {
    const loans = await Loan.find({ cliente_id: req.user.clientId });
    res.send(loans);
  } catch (e) {
    res.status(500).send(e);
  }
});

// Get my payments
router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find({ prestamo_id: { $in: (await Loan.find({ cliente_id: req.user.clientId })).map(l => l._id) } }).populate('prestamo_id');
    res.send(payments);
  } catch (e) {
    res.status(500).send(e);
  }
});

module.exports = router;