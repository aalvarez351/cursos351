const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  prestamo_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
  fecha: { type: Date, default: Date.now },
  monto: { type: Number, required: true },
  comprobante: { type: String }, // file path or URL
  registrado_por: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Distribution
  aplicado_atrasos: { type: Number, default: 0 },
  aplicado_intereses: { type: Number, default: 0 },
  aplicado_capital: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Payment', paymentSchema, 'pagos');