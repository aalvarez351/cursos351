const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  cliente_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  capital_inicial: { type: Number, required: true },
  plazo: { type: Number, required: true }, // number of installments
  tasa_interes: { type: Number, required: true }, // annual interest rate in %
  frecuencia_pago: { type: String, default: '15 dias' },
  condiciones_mora: { type: String, default: 'Default mora conditions' },
  fecha_otorgamiento: { type: Date, default: Date.now },
  estado: { type: String, enum: ['activo', 'pagado', 'atrasado'], default: 'activo' },
  saldo_actual: { type: Number, default: function() { return this.capital_inicial; } },
  total_pagado: { type: Number, default: 0 },
  interes_acumulado: { type: Number, default: 0 },
  atraso_acumulado: { type: Number, default: 0 },
  total_a_pagar: { type: Number, default: function() { return this.capital_inicial; } } // will be calculated
}, { timestamps: true });

module.exports = mongoose.model('Loan', loanSchema);