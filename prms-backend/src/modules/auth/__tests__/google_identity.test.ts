jest.mock('../../../db', () => ({ prisma: { user: { findUnique: jest.fn(), updateMany: jest.fn() } } }));
jest.mock('../../../config', () => ({ env: { ENABLE_FIREBASE_VERIFY: true } }));
jest.mock('../firebase_auth', () => ({ verifyFirebaseToken: jest.fn() }));
jest.mock('../service_auth', () => ({ generateTokens: jest.fn(() => ({ accessToken: 'test-only', refreshToken: 'test-only' })), saveRefreshToken: jest.fn() }));
jest.mock('../../admin/service_audit', () => ({ recordAudit: jest.fn() }));
jest.mock('../googleRegistration', () => ({ createGoogleRegistrationGrant: jest.fn(() => 'registration-only-grant'), completeGoogleRegistration: jest.fn() }));
import { AuthController } from '../controller_auth';
import { prisma } from '../../../db';
import { env } from '../../../config';
import { verifyFirebaseToken } from '../firebase_auth';
import * as service from '../service_auth';
const user = { id: 'owner', email: 'owner@example.test', firebase_uid: 'local-placeholder', is_active: true, UserRole: [{ role: { name: 'Landlord' } }] };
function response() { return { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() }; }
function request(body: object) { return { body, headers: {}, socket: {}, method: 'POST', originalUrl: '/auth/google' } as any; }
beforeEach(() => { jest.resetAllMocks(); env.ENABLE_FIREBASE_VERIFY = true; (verifyFirebaseToken as jest.Mock).mockResolvedValue({ uid: 'google-owner', email: user.email }); (service.generateTokens as jest.Mock).mockReturnValue({ accessToken: 'test-only', refreshToken: 'test-only' }); });
test('a verified attacker cannot select another account through the supplied email', async () => {
 (verifyFirebaseToken as jest.Mock).mockResolvedValue({ uid: 'attacker', email: 'attacker@example.test' });
 const res=response(); await new AuthController().googleLogin(request({ idToken: 'valid-attacker-token', email: user.email }),res as any);
 expect(res.status).toHaveBeenCalledWith(400); expect(prisma.user.findUnique).not.toHaveBeenCalled(); expect(service.generateTokens).not.toHaveBeenCalled();
});
test.each([false,true])('missing token never signs in with verification enabled=%s', async enabled => {
 env.ENABLE_FIREBASE_VERIFY=enabled;const res=response();await new AuthController().googleLogin(request({email:user.email}),res as any);
 expect(res.status).toHaveBeenCalledWith(400);expect(service.generateTokens).not.toHaveBeenCalled();expect(prisma.user.updateMany).not.toHaveBeenCalled();
});
test('invalid Firebase token is rejected without account lookup',async()=>{
 (verifyFirebaseToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));const res=response();await new AuthController().googleLogin(request({idToken:'forged'}),res as any);expect(res.status).toHaveBeenCalledWith(400);expect(prisma.user.findUnique).not.toHaveBeenCalled();
});
test('links an active local account using only the verified email and an atomic update',async()=>{
 (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(user).mockResolvedValueOnce({...user,firebase_uid:'google-owner'});
 (prisma.user.updateMany as jest.Mock).mockResolvedValue({count:1});const res=response();await new AuthController().googleLogin(request({idToken:'verified',email:' OWNER@example.test '}),res as any);
 expect(prisma.user.updateMany).toHaveBeenCalledWith({where:{id:user.id,firebase_uid:'local-placeholder',is_active:true},data:{firebase_uid:'google-owner'}});expect(res.json).toHaveBeenCalledWith(expect.objectContaining({success:true}));expect(service.generateTokens).toHaveBeenCalledWith(user.id);
});
test('upgrades the exact legacy dev-email placeholder after verified Google sign-in',async()=>{
 const legacy={...user,firebase_uid:`dev-${user.email}`};
 (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(legacy).mockResolvedValueOnce({...user,firebase_uid:'google-owner'});
 (prisma.user.updateMany as jest.Mock).mockResolvedValue({count:1});const res=response();await new AuthController().googleLogin(request({idToken:'verified',email:user.email}),res as any);
 expect(prisma.user.updateMany).toHaveBeenCalledWith({where:{id:user.id,firebase_uid:legacy.firebase_uid,is_active:true},data:{firebase_uid:'google-owner'}});expect(service.generateTokens).toHaveBeenCalledWith(user.id);
});
test('does not replace a dev-email placeholder belonging to another email',async()=>{
 (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({...user,firebase_uid:'dev-someone-else@example.test'});
 const res=response();await new AuthController().googleLogin(request({idToken:'verified',email:user.email}),res as any);
 expect(res.status).toHaveBeenCalledWith(400);expect(prisma.user.updateMany).not.toHaveBeenCalled();expect(service.generateTokens).not.toHaveBeenCalled();
});
test('an already linked identity signs in without relinking',async()=>{
 (prisma.user.findUnique as jest.Mock).mockResolvedValue({...user,firebase_uid:'google-owner'});const res=response();await new AuthController().googleLogin(request({idToken:'verified'}),res as any);expect(service.generateTokens).toHaveBeenCalledWith(user.id);expect(prisma.user.updateMany).not.toHaveBeenCalled();
});
test.each([{...user,firebase_uid:'other-real-uid'},{...user,is_active:false}])('refuses a conflicting or inactive local account',async candidate=>{
 (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(candidate);const res=response();await new AuthController().googleLogin(request({idToken:'verified'}),res as any);expect(res.status).toHaveBeenCalledWith(400);expect(prisma.user.updateMany).not.toHaveBeenCalled();expect(service.generateTokens).not.toHaveBeenCalled();
});
test('a concurrent link change prevents token issuance',async()=>{
 (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(user);(prisma.user.updateMany as jest.Mock).mockResolvedValue({count:0});const res=response();await new AuthController().googleLogin(request({idToken:'verified'}),res as any);expect(res.status).toHaveBeenCalledWith(400);expect(service.generateTokens).not.toHaveBeenCalled();
});
test('unknown verified account receives only a registration grant without access tokens',async()=>{
 const {createGoogleRegistrationGrant}=require('../googleRegistration');(createGoogleRegistrationGrant as jest.Mock).mockReturnValue('registration-only-grant');
 (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);const res=response();await new AuthController().googleLogin(request({idToken:'verified'}),res as any);
 expect(res.json).toHaveBeenCalledWith(expect.objectContaining({success:true,data:{isNewUser:true,registrationToken:'registration-only-grant'}}));expect(service.generateTokens).not.toHaveBeenCalled();expect(prisma.user.updateMany).not.toHaveBeenCalled();
});
test('public email checks return identical generic responses without database lookups',async()=>{
 const a=response(),b=response();const ctrl=new AuthController();await ctrl.checkEmail(request({email:user.email}),a as any);await ctrl.checkEmail(request({email:'unknown@example.test'}),b as any);expect(a.json.mock.calls).toEqual(b.json.mock.calls);expect(JSON.stringify(a.json.mock.calls)).not.toMatch(/exists|isActive/);expect(prisma.user.findUnique).not.toHaveBeenCalled();
});
test('Google registration cannot complete when Google verification is disabled',async()=>{
 env.ENABLE_FIREBASE_VERIFY=false;const res=response();await new AuthController().googleRegister(request({registrationToken:'grant',role:'Agent'}),res as any);
 expect(res.status).toHaveBeenCalledWith(400);expect(require('../googleRegistration').completeGoogleRegistration).not.toHaveBeenCalled();
});
