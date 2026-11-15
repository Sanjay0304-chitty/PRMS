jest.mock('../../../config', () => ({ env: { JWT_SECRET: 'test-registration-secret' } }));
jest.mock('../../../db', () => ({ prisma: { $transaction: jest.fn() } }));
import jwt from 'jsonwebtoken';
import { prisma } from '../../../db';
import { env } from '../../../config';
import { createGoogleRegistrationGrant, completeGoogleRegistration } from '../googleRegistration';
const identity={uid:'verified-google-user',email:'verified@example.test',name:'Google Tester'};
const consent=[{type:'PRIVACY_NOTICE',wording:'Test notice',version:'2.1',consented:true}];
const tx={user:{findFirst:jest.fn(),create:jest.fn()},agent:{create:jest.fn()},consentRecord:{create:jest.fn()}};
beforeEach(()=>{
 jest.clearAllMocks();(prisma.$transaction as jest.Mock).mockImplementation(fn=>fn(tx));
 tx.user.findFirst.mockResolvedValue(null);tx.user.create.mockResolvedValue({id:'new-account'});
});
afterEach(()=>jest.useRealTimers());
test.each(['Tenant','Landlord','Agent'])('creates a %s only after verified registration grant and acknowledgement',async role=>{
 const grant=createGoogleRegistrationGrant(identity);await completeGoogleRegistration(grant,role,consent,'127.0.0.1');
 expect(tx.user.create).toHaveBeenCalledWith(expect.objectContaining({data:{email:identity.email,firebase_uid:identity.uid,full_name:identity.name,UserRole:{create:{role:{connect:{name:role}}}}}}));
 expect(tx.consentRecord.create).toHaveBeenCalledWith({data:{userId:'new-account',...consent[0],ipAddress:'127.0.0.1'}});
 expect(tx.agent.create).toHaveBeenCalledTimes(role==='Agent'?1:0);
});
test.each(['Admin','admin','Owner','',undefined])('rejects self-selected role %s before any write',async role=>{
 await expect(completeGoogleRegistration(createGoogleRegistrationGrant(identity),role as string,consent)).rejects.toThrow('Choose Tenant');expect(prisma.$transaction).not.toHaveBeenCalled();
});
test('a Google registration grant is not an API access token',()=>{
 const grant=createGoogleRegistrationGrant(identity);expect(()=>jwt.verify(grant,env.JWT_SECRET)).toThrow();expect(tx.user.create).not.toHaveBeenCalled();
});
test('forged registration token cannot select a role',async()=>{
 const forged=jwt.sign(identity,'wrong-secret',{audience:'google-registration',issuer:'PRMS'});
 await expect(completeGoogleRegistration(forged,'Landlord',consent)).rejects.toThrow('invalid');expect(prisma.$transaction).not.toHaveBeenCalled();
});
test('expired registration token is rejected',async()=>{
 jest.useFakeTimers();const grant=createGoogleRegistrationGrant(identity);jest.advanceTimersByTime(11*60000);
 await expect(completeGoogleRegistration(grant,'Tenant',consent)).rejects.toThrow('expired');expect(prisma.$transaction).not.toHaveBeenCalled();
});
test.each([{consents:[]},{consents:[{...consent[0],consented:false}]},{consents:[{...consent[0],wording:''}]}])('acknowledgement is required before creation',async ({consents})=>{
 await expect(completeGoogleRegistration(createGoogleRegistrationGrant(identity),'Tenant',consents)).rejects.toThrow('Privacy Notice');expect(prisma.$transaction).not.toHaveBeenCalled();
});
test('a completed or colliding registration cannot replace an existing account or role',async()=>{
 tx.user.findFirst.mockResolvedValue({id:'existing-account'});
 await expect(completeGoogleRegistration(createGoogleRegistrationGrant(identity),'Agent',consent)).rejects.toThrow('already exists');expect(tx.user.create).not.toHaveBeenCalled();expect(tx.agent.create).not.toHaveBeenCalled();
});
