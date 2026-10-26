import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  isStepUpRequired,
  validateStaffDeactivation,
  validateStaffInvite,
  validateStaffMfaReset,
  validateStaffRoleChange,
} from '../lib/staff/guard-rails';

describe('Staff Guard Rails', () => {
  it('1. Blocks changing own role in staff directory', () => {
    const result = validateStaffRoleChange({
      actorId: 'user-1',
      targetUserId: 'user-1',
      targetUserRole: 'owner',
      newRole: 'manager',
      activeOwnerCount: 2,
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'CANNOT_CHANGE_OWN_ROLE');
  });

  it('2. Blocks demoting the last active owner', () => {
    const result = validateStaffRoleChange({
      actorId: 'user-2',
      targetUserId: 'owner-solo',
      targetUserRole: 'owner',
      newRole: 'manager',
      activeOwnerCount: 1,
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'CANNOT_DEMOTE_LAST_OWNER');
  });

  it('3. Allows demoting an owner when another active owner exists', () => {
    const result = validateStaffRoleChange({
      actorId: 'user-2',
      targetUserId: 'owner-two',
      targetUserRole: 'owner',
      newRole: 'manager',
      activeOwnerCount: 2,
    });
    assert.strictEqual(result.ok, true);
  });

  it('4. Blocks deactivating yourself', () => {
    const result = validateStaffDeactivation({
      actorId: 'user-1',
      targetUserId: 'user-1',
      targetUserRole: 'owner',
      activeOwnerCount: 2,
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'CANNOT_DEACTIVATE_SELF');
  });

  it('5. Blocks deactivating the last active owner', () => {
    const result = validateStaffDeactivation({
      actorId: 'user-2',
      targetUserId: 'owner-solo',
      targetUserRole: 'owner',
      activeOwnerCount: 1,
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'CANNOT_DEACTIVATE_LAST_OWNER');
  });

  it('6. Blocks resetting 2FA for the last active owner', () => {
    const result = validateStaffMfaReset({
      actorId: 'user-2',
      targetUserId: 'owner-solo',
      targetUserRole: 'owner',
      activeOwnerCount: 1,
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'CANNOT_RESET_MFA_LAST_OWNER');
  });

  it('7. Blocks inviting a duplicate staff email address', () => {
    const result = validateStaffInvite({
      email: 'Alice.Smith@Hotel.com',
      existingStaffEmails: ['alice.smith@hotel.com', 'bob@hotel.com'],
    });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.code, 'EMAIL_ALREADY_IN_USE');
  });

  it('8. Verifies step-up requirement TTL logic', () => {
    assert.strictEqual(isStepUpRequired(null), true);
    assert.strictEqual(isStepUpRequired(undefined), true);

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    assert.strictEqual(isStepUpRequired(fiveMinutesAgo, 15), false);

    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);
    assert.strictEqual(isStepUpRequired(twentyMinutesAgo, 15), true);
  });
});
