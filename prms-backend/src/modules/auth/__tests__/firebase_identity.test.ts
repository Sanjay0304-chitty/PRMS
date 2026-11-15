jest.mock('firebase-admin/app', () => ({ initializeApp: jest.fn(() => ({ name: 'prms-auth' })), cert: jest.fn(), getApps: () => [] }));
jest.mock('firebase-admin/auth', () => ({ getAuth: () => ({ verifyIdToken: verify }) }));
jest.mock('../../../config', () => ({ env: { ENABLE_FIREBASE_VERIFY: true, FIREBASE_PROJECT_ID: 'test-project' } }));
const verify=jest.fn();
import { verifyFirebaseToken } from '../firebase_auth';
beforeEach(()=>verify.mockReset());
test('returns normalized email from verified Google claims',async()=>{
 verify.mockResolvedValue({uid:'google-uid',email:' User@Example.test ',email_verified:true,firebase:{sign_in_provider:'google.com'}});expect(await verifyFirebaseToken('signed-token')).toEqual({uid:'google-uid',email:'user@example.test'});
});
test.each([
 {uid:'x',email:'user@example.test',email_verified:false,firebase:{sign_in_provider:'google.com'}},
 {uid:'x',email_verified:true,firebase:{sign_in_provider:'google.com'}},
 {uid:'x',email:'user@example.test',email_verified:true,firebase:{sign_in_provider:'password'}}
])('rejects unverified, missing email or non-Google identities',async claims=>{verify.mockResolvedValue(claims);await expect(verifyFirebaseToken('signed-token')).rejects.toThrow('verified Google email');});
