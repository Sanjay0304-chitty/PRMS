import { apiClient } from './ApiClient';

export const paymentApi = {
  list(params) {
    return apiClient.get('/payments', { params });
  },
  getById(id) {
    return apiClient.get(`/payments/${id}`);
  },
  create(data) {
    return apiClient.post('/payments', data);
  },
  markPaid(id) {
    return apiClient.patch(`/payments/${id}/mark-paid`);
  },
  getPaymentSummary() {
    return apiClient.get('/payments/summary');
  },
  getInvoices(params) {
    return apiClient.get('/payments/invoices', { params });
  },
  getInvoiceById(id) {
    return apiClient.get(`/payments/invoices/${id}`);
  },
  payPayment(id) {
    return apiClient.post(`/payments/${id}/pay`);
  },
  // Mock Payment Gateway
  myPayments(params) {
    return apiClient.get('/payments/my-payments', { params });
  },
  startMockCheckout(paymentId, method) {
    return apiClient.post(`/payments/${paymentId}/checkout`, { method });
  },
  getMockTransaction(transactionId) {
    return apiClient.get(`/payments/mock-transactions/${transactionId}`);
  },
  completeMockTransaction(transactionId, outcome, failureMessage) {
    return apiClient.post(`/payments/mock-transactions/${transactionId}/complete`, { outcome, failureMessage });
  },
};