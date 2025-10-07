const express = require('express');
const Client = require('../models/Client');
const Loan = require('../models/Loan');
const Payment = require('../models/Payment');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// All admin routes require auth and admin role
router.use(auth, adminAuth);

// Clients CRUD
router.get('/clients', async (req, res) => {
  try {
    const clients = await Client.find();
    res.send(clients);
  } catch (e) {
    res.status(500).send(e);
  }
});

router.post('/clients', async (req, res) => {
  try {
    const client = new Client(req.body);
    await client.save();
    res.status(201).send(client);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.get('/clients/:id', async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).send();
    res.send(client);
  } catch (e) {
    res.status(500).send(e);
  }
});

router.patch('/clients/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!client) return res.status(404).send();
    res.send(client);
  } catch (e) {
    res.status(400).send(e);
  }
});

router.delete('/clients/:id', async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) return res.status(404).send();
    res.send(client);
  } catch (e) {
    res.status(500).send(e);
  }
});

// Loans CRUD
router.get('/loans', async (req, res) => {
  try {
    const loans = await Loan.find().populate('cliente_id');
    res.send(loans);
  } catch (e) {
    res.status(500).send(e);
  }
});

router.post('/loans', async (req, res) => {
  try {
    const loan = new Loan(req.body);
    await loan.save();
    res.status(201).send(loan);
  } catch (e) {
    res.status(400).send(e);
  }
});

// Payments CRUD
router.get('/payments', async (req, res) => {
  try {
    const payments = await Payment.find().populate('prestamo_id').populate('registrado_por');
    res.send(payments);
  } catch (e) {
    res.status(500).send(e);
  }
});

router.post('/payments', async (req, res) => {
  try {
    const { prestamo_id, monto } = req.body;
    const loan = await Loan.findById(prestamo_id);
    if (!loan) return res.status(404).send({ error: 'Loan not found' });

    // Get pending amounts (simplified, assuming no previous atrasos for now)
    const atrasosPendientes = loan.atraso_acumulado || 0;
    const interesesPendientes = loan.interes_acumulado || 0;
    const capitalPendiente = loan.saldo_actual;

    const { aplicadoAtrasos, aplicadoIntereses, aplicadoCapital } = require('../utils/calculations').distributePayment(monto, atrasosPendientes, interesesPendientes, capitalPendiente);

    const payment = new Payment({
      ...req.body,
      registrado_por: req.user._id,
      aplicado_atrasos: aplicadoAtrasos,
      aplicado_intereses: aplicadoIntereses,
      aplicado_capital: aplicadoCapital
    });
    await payment.save();

    // Update loan
    await require('../utils/calculations').updateLoanAfterPayment(prestamo_id, monto);

    res.status(201).send(payment);
  } catch (e) {
    res.status(400).send(e);
  }
});

module.exports = router;