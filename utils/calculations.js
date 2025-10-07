// Loan calculation utilities

// Pago Esperado por Cuota = (Capital / Plazo) + Interés Programado
// Interés Programado = (Capital × Tasa de Interés × 1/24)
function calculateExpectedPayment(capital, plazo, tasaInteres) {
  const interesProgramado = (capital * (tasaInteres / 100) * (1 / 24));
  return (capital / plazo) + interesProgramado;
}

// Interés Quincenal = Capital × (Tasa de Interés / 100) × (1/24)
function calculateBiweeklyInterest(capital, tasaInteres) {
  return capital * (tasaInteres / 100) * (1 / 24);
}

// Update loan totals after payment
async function updateLoanAfterPayment(loanId, paymentAmount) {
  const Loan = require('../models/Loan');
  const Payment = require('../models/Payment');

  const loan = await Loan.findById(loanId);
  if (!loan) return;

  // Get all payments for this loan
  const payments = await Payment.find({ prestamo_id: loanId });

  // Calculate totals
  const totalPagado = payments.reduce((sum, p) => sum + p.monto, 0);
  const interesAcumulado = payments.reduce((sum, p) => sum + p.aplicado_intereses, 0);
  const atrasoAcumulado = payments.reduce((sum, p) => sum + p.aplicado_atrasos, 0);
  const aplicadoCapital = payments.reduce((sum, p) => sum + p.aplicado_capital, 0);

  const saldoActual = loan.capital_inicial - aplicadoCapital;
  const totalAPagar = loan.capital_inicial + interesAcumulado + atrasoAcumulado;
  const diferencia = totalAPagar - totalPagado;

  // Update loan
  loan.saldo_actual = saldoActual;
  loan.total_pagado = totalPagado;
  loan.interes_acumulado = interesAcumulado;
  loan.atraso_acumulado = atrasoAcumulado;
  loan.total_a_pagar = totalAPagar;
  loan.estado = diferencia <= 0 ? 'pagado' : saldoActual > 0 ? 'activo' : 'atrasado';

  await loan.save();
}

// Distribute payment: first atrasos, then intereses, then capital
function distributePayment(paymentAmount, atrasosPendientes, interesesPendientes, capitalPendiente) {
  let aplicadoAtrasos = 0;
  let aplicadoIntereses = 0;
  let aplicadoCapital = 0;
  let remaining = paymentAmount;

  // First: atrasos
  if (remaining > 0 && atrasosPendientes > 0) {
    aplicadoAtrasos = Math.min(remaining, atrasosPendientes);
    remaining -= aplicadoAtrasos;
  }

  // Second: intereses
  if (remaining > 0 && interesesPendientes > 0) {
    aplicadoIntereses = Math.min(remaining, interesesPendientes);
    remaining -= aplicadoIntereses;
  }

  // Third: capital
  if (remaining > 0 && capitalPendiente > 0) {
    aplicadoCapital = Math.min(remaining, capitalPendiente);
    remaining -= aplicadoCapital;
  }

  return { aplicadoAtrasos, aplicadoIntereses, aplicadoCapital, remaining };
}

module.exports = {
  calculateExpectedPayment,
  calculateBiweeklyInterest,
  updateLoanAfterPayment,
  distributePayment
};