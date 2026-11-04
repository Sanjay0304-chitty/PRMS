import { PaymentController } from '../controller_payment';
import * as paymentService from '../service_payment';
import { notifyPaymentReceived } from '../../notification/property_notifications';
jest.mock('../service_payment',()=>({completeMockTransaction:jest.fn(),getPaymentById:jest.fn(),markAsPaid:jest.fn()}));
jest.mock('../../notification/property_notifications',()=>({notifyPaymentReceived:jest.fn().mockResolvedValue(undefined)}));
jest.mock('../../admin/service_audit',()=>({recordAudit:jest.fn().mockResolvedValue(undefined)}));
function response(){const res:any={};res.status=jest.fn(()=>res);res.json=jest.fn(()=>res);return res;}
function request(body:any={}){return {body,params:{transactionId:'tx',id:'pay'},user:{id:'tenant',role:'Tenant'},socket:{remoteAddress:''},headers:{},method:'POST',originalUrl:'/test'} as any;}
beforeEach(()=>jest.clearAllMocks());
test.each(['SUCCESS','FAILED','CANCELLED'])('checkout %s only notifies managers on success',async outcome=>{
 (paymentService.completeMockTransaction as jest.Mock).mockResolvedValue({payment:{id:'pay',status:outcome==='SUCCESS'?'PAID':'UNPAID'}});
 await new PaymentController().completeMockTransaction(request({outcome}),response());
 expect(notifyPaymentReceived).toHaveBeenCalledTimes(outcome==='SUCCESS'?1:0);
 if(outcome==='SUCCESS')expect(notifyPaymentReceived).toHaveBeenCalledWith('pay');
});
test('rejected checkout retry cannot produce another payment alert',async()=>{
 (paymentService.completeMockTransaction as jest.Mock).mockRejectedValue(new Error('Transaction is no longer pending'));
 await new PaymentController().completeMockTransaction(request({outcome:'SUCCESS'}),response());
 expect(notifyPaymentReceived).not.toHaveBeenCalled();
});
test('Landlord manual confirmation notifies managers after success',async()=>{
 (paymentService.getPaymentById as jest.Mock).mockResolvedValue({id:'pay',booking:{property:{ownerId:'owner'}}});
 (paymentService.markAsPaid as jest.Mock).mockResolvedValue({id:'pay',status:'PAID'});
 const req=request();req.user={id:'owner',role:'Landlord'};
 await new PaymentController().markPaid(req,response());
 expect(notifyPaymentReceived).toHaveBeenCalledWith('pay');
});
test('Agent cannot confirm payment or trigger paid notifications',async()=>{
 const req=request();req.user={id:'agent',role:'Agent'};const res=response();
 await new PaymentController().markPaid(req,res);
 expect(res.status).toHaveBeenCalledWith(403);expect(notifyPaymentReceived).not.toHaveBeenCalled();
});
