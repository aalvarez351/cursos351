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
    const payments = await Payment.find()
      .populate('prestamo_id')
      .populate('registrado_por', 'username'); // Only populate username field
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

// Get client history with loans and payments
router.get('/client-history', auth, adminAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50; // Limit to prevent resource exhaustion
    const skip = parseInt(req.query.skip) || 0;

    // Get clients with pagination
    const clients = await Client.find()
      .limit(limit)
      .skip(skip)
      .sort({ createdAt: -1 });

    if (clients.length === 0) {
      return res.send([]);
    }

    // Get all loans for these clients in one query
    const clientIds = clients.map(c => c._id);
    const loans = await Loan.find({ cliente_id: { $in: clientIds } });

    // Get all payments for these clients' loans in one query
    const loanIds = loans.map(l => l._id);
    const payments = await Payment.find({ prestamo_id: { $in: loanIds } })
      .populate('registrado_por', 'username');

    // Group data by client
    const clientHistory = clients.map(client => {
      const clientLoans = loans.filter(loan => loan.cliente_id.toString() === client._id.toString());
      const clientLoanIds = clientLoans.map(l => l._id.toString());
      const clientPayments = payments.filter(payment => clientLoanIds.includes(payment.prestamo_id.toString()));

      return {
        client,
        loans: clientLoans,
        payments: clientPayments
      };
    });

    res.send(clientHistory);
  } catch (e) {
    res.status(500).send(e);
  }
});

// Get dashboard statistics in a single efficient request
router.get('/dashboard-stats', auth, adminAuth, async (req, res) => {
  try {
    // Get all stats in parallel for better performance
    const [clientsCount, loansData, paymentsCount] = await Promise.all([
      Client.countDocuments(),
      Loan.aggregate([
        { $group: { _id: null, count: { $sum: 1 }, totalAmount: { $sum: '$capital_inicial' } } }
      ]),
      Payment.countDocuments()
    ]);

    const loansCount = loansData[0]?.count || 0;
    const totalAmount = loansData[0]?.totalAmount || 0;

    res.send({
      totalClientes: clientsCount,
      totalPrestamos: loansCount,
      totalPagos: paymentsCount,
      montoTotal: totalAmount
    });
  } catch (e) {
    res.status(500).send(e);
  }
});

// Get dashboard data (recent items with limits)
router.get('/dashboard-data', auth, adminAuth, async (req, res) => {
  try {
    const [recentClients, recentLoans, recentPayments] = await Promise.all([
      Client.find().sort({ createdAt: -1 }).limit(5),
      Loan.find().populate('cliente_id', 'nombre apellido').sort({ createdAt: -1 }).limit(5),
      Payment.find().populate('prestamo_id', 'cliente_id').sort({ createdAt: -1 }).limit(5)
    ]);

    res.send({
      clients: recentClients,
      loans: recentLoans,
      payments: recentPayments
    });
  } catch (e) {
    res.status(500).send(e);
  }
});

// Get paginated clients
router.get('/clients-paginated', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [clients, total] = await Promise.all([
      Client.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Client.countDocuments()
    ]);

    res.send({
      clients,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (e) {
    res.status(500).send(e);
  }
});

// Get paginated loans
router.get('/loans-paginated', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [loans, total] = await Promise.all([
      Loan.find().populate('cliente_id', 'nombre apellido').sort({ createdAt: -1 }).skip(skip).limit(limit),
      Loan.countDocuments()
    ]);

    res.send({
      loans,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (e) {
    res.status(500).send(e);
  }
});

// Get paginated payments
router.get('/payments-paginated', auth, adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      Payment.find()
        .populate('prestamo_id', 'cliente_id')
        .populate('registrado_por', 'username')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments()
    ]);

    res.send({
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (e) {
    res.status(500).send(e);
  }
});

module.exports = router;