import { notifyPropertyManagers, notifyAgentAssignment, notifyPaymentReceived } from '../property_notifications';
import { prisma } from '../../../db';
jest.mock('../../../db', () => ({ prisma: {
 property: { findUnique: jest.fn() }, agentProperty: { findMany: jest.fn() },
 user: { findMany: jest.fn() }, agent: { findUnique: jest.fn() }, payment: { findUnique: jest.fn() },
 userPreference: { findUnique: jest.fn() }, notification: { create: jest.fn() },
} }));
const db = prisma as any;
const notice = {type:'application_submitted',title:'Application',message:'Application received'};
beforeEach(() => {
 jest.clearAllMocks();
 db.property.findUnique.mockResolvedValue({ownerId:'owner',title:'Assigned Home'});
 db.agentProperty.findMany.mockResolvedValue([{agent:{userId:'agent'}},{agent:{userId:'agent'}}]);
 db.user.findMany.mockImplementation(({where}:any)=>Promise.resolve(where.id.in.map((id:string)=>({id}))));
 db.userPreference.findUnique.mockResolvedValue(null);
 db.notification.create.mockResolvedValue({id:'notice'});
 db.agent.findUnique.mockResolvedValue({userId:'agent'});
 db.payment.findUnique.mockResolvedValue({id:'pay',status:'PAID',amount:1500,booking:{propertyId:'p',property:{title:'Assigned Home'}}});
});
test('owner and assigned Agent each receive one event without duplicate recipients',async()=>{
 await notifyPropertyManagers('p',notice);
 expect(db.agentProperty.findMany).toHaveBeenCalledWith(expect.objectContaining({where:{propertyId:'p'}}));
 expect(db.notification.create.mock.calls.map((c:any)=>c[0].data.userId).sort()).toEqual(['agent','owner']);
});
test('unassigned Agent receives no future events',async()=>{
 db.agentProperty.findMany.mockResolvedValue([]);
 await notifyPropertyManagers('p',notice);
 expect(db.notification.create.mock.calls.map((c:any)=>c[0].data.userId)).toEqual(['owner']);
});
test('actor can be excluded from manager notifications',async()=>{
 await notifyPropertyManagers('p',notice,'agent');
 expect(db.notification.create.mock.calls.map((c:any)=>c[0].data.userId)).toEqual(['owner']);
});
test('disabled category preferences are respected independently',async()=>{
 db.userPreference.findUnique.mockImplementation(({where}:any)=>Promise.resolve(where.userId==='agent'?{notificationsEnabled:true,applicationNotifications:false}:null));
 await notifyPropertyManagers('p',notice);
 expect(db.notification.create.mock.calls.map((c:any)=>c[0].data.userId)).toEqual(['owner']);
});
test('payment alerts respect global notification opt-out',async()=>{
 db.userPreference.findUnique.mockResolvedValue({notificationsEnabled:false});
 await notifyPaymentReceived('pay');expect(db.notification.create).not.toHaveBeenCalled();
});
test('paid alerts include only safe property and amount information',async()=>{
 await notifyPaymentReceived('pay');
 expect(db.notification.create).toHaveBeenCalledTimes(2);
 const data=db.notification.create.mock.calls[0][0].data;
 expect(data.type).toBe('payment_received');expect(data.message).toContain('1,500.00');
 expect(data.message).toContain('Assigned Home');expect(data).not.toHaveProperty('bankAccount');
});
test.each(['PENDING','FAILED','UNPAID'])('no paid alert for %s',async status=>{
 db.payment.findUnique.mockResolvedValue({status});
 await notifyPaymentReceived('pay');expect(db.notification.create).not.toHaveBeenCalled();
});
test.each([true,false])('assignment change %s alerts the Agent and owner',async assigned=>{
 await notifyAgentAssignment('a','p',assigned);
 expect(db.notification.create.mock.calls.map((c:any)=>c[0].data.userId)).toEqual(['agent','owner']);
});
test('delivery only targets active accounts',async()=>{
 db.user.findMany.mockResolvedValue([{id:'owner'}]);
 await notifyPropertyManagers('p',notice);
 expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({is_active:true})}));
 expect(db.notification.create).toHaveBeenCalledTimes(1);
});
