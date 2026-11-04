import test from 'node:test';
import assert from 'node:assert/strict';
import { notificationLink } from '../src/utils/notificationLink.js';
test('Admin report notifications link into Audit Logs without trusting arbitrary URLs', () => {
 assert.equal(notificationLink({type:'property_reported:report-1'}, 'Admin'), '/admin/audit-logs?view=reports&report=report-1');
 assert.equal(notificationLink({type:'property_reported'}, 'Admin'), '/admin/audit-logs?view=reports');
 assert.equal(notificationLink({type:'property_reported:x&view=other'}, 'Admin'), '/admin/audit-logs?view=reports&report=x%26view%3Dother');
 assert.equal(notificationLink({type:'property_reported:report-1'}, 'Tenant'), null);
 assert.equal(notificationLink({type:'system'}, 'Admin'), null);
});
