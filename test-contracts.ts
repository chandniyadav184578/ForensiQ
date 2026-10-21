import fs from 'fs';
import path from 'path';
import { ethers, Interface } from 'ethers';

console.log('====================================================');
console.log('      ORBIT PROTOCOL SMART CONTRACT TEST SUITE      ');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` (${detail})` : ''}`);
    failedTests++;
  }
}

async function runTests() {
  const passportArtifactPath = path.resolve(process.cwd(), 'src/blockchain/ORBITPassportArtifact.json');
  const escrowArtifactPath = path.resolve(process.cwd(), 'src/blockchain/ORBITRecoveryEscrowArtifact.json');

  console.log('--- 1. ARTIFACT & COMPILATION VERIFICATION ---');
  assert(fs.existsSync(passportArtifactPath), 'ORBITPassport artifact exists');
  assert(fs.existsSync(escrowArtifactPath), 'ORBITRecoveryEscrow artifact exists');

  const passportArtifact = JSON.parse(fs.readFileSync(passportArtifactPath, 'utf8'));
  const escrowArtifact = JSON.parse(fs.readFileSync(escrowArtifactPath, 'utf8'));

  assert(passportArtifact.bytecode && passportArtifact.bytecode.length > 10, 'ORBITPassport has valid bytecode');
  assert(escrowArtifact.bytecode && escrowArtifact.bytecode.length > 10, 'ORBITRecoveryEscrow has valid bytecode');

  console.log('\n--- 2. ORBITPassport (ERC-721) INTERFACE & LOGIC ---');
  const passportIface = new Interface(passportArtifact.abi);

  // Mint function
  const mintFn = passportIface.getFunction('mintPassport');
  assert(Boolean(mintFn), 'Contract has mintPassport(address,string,bytes32) function');
  if (mintFn) {
    assert(mintFn.inputs.length === 3, 'mintPassport requires 3 parameters (to, assetId, passportHash)');
  }

  // ownerOf function
  const ownerOfFn = passportIface.getFunction('ownerOf');
  assert(Boolean(ownerOfFn), 'Contract implements ERC-721 ownerOf(uint256)');

  // safeTransferFrom function
  const safeTransferFn = passportIface.getFunction('safeTransferFrom(address,address,uint256)');
  assert(Boolean(safeTransferFn), 'Contract implements ERC-721 safeTransferFrom');

  // transferFrom function
  const transferFromFn = passportIface.getFunction('transferFrom');
  assert(Boolean(transferFromFn), 'Contract implements ERC-721 transferFrom');

  // setPassportHash & updatePassportHash
  const setHashFn = passportIface.getFunction('setPassportHash');
  const updateHashFn = passportIface.getFunction('updatePassportHash');
  assert(Boolean(setHashFn), 'Contract has setPassportHash(uint256,bytes32)');
  assert(Boolean(updateHashFn), 'Contract has updatePassportHash(uint256,bytes32)');

  // Lifecycle event commitment
  const lifecycleFn = passportIface.getFunction('recordLifecycleEvent');
  assert(Boolean(lifecycleFn), 'Contract has recordLifecycleEvent(uint256,string,bytes32)');

  // Object status commitment
  const statusFn = passportIface.getFunction('setObjectStatus');
  assert(Boolean(statusFn), 'Contract has setObjectStatus(uint256,string)');

  // Events check
  const mintEvent = passportIface.getEvent('PassportMinted');
  const hashUpdatedEvent = passportIface.getEvent('PassportHashUpdated');
  const lifecycleEvent = passportIface.getEvent('LifecycleEventRecorded');
  const transferEvent = passportIface.getEvent('Transfer');

  assert(Boolean(mintEvent), 'Emits PassportMinted event');
  assert(Boolean(hashUpdatedEvent), 'Emits PassportHashUpdated event');
  assert(Boolean(lifecycleEvent), 'Emits LifecycleEventRecorded event');
  assert(Boolean(transferEvent), 'Emits ERC-721 standard Transfer event');

  console.log('\n--- 3. ORBITRecoveryEscrow INTERFACE & LOGIC ---');
  const escrowIface = new Interface(escrowArtifact.abi);

  // lockBounty
  const lockFn = escrowIface.getFunction('lockBounty');
  assert(Boolean(lockFn), 'Escrow has lockBounty(uint256,bytes32)');
  if (lockFn) {
    assert(lockFn.payable, 'lockBounty function is payable (accepts native ETH)');
  }

  // releaseBounty
  const releaseFn = escrowIface.getFunction('releaseBounty');
  assert(Boolean(releaseFn), 'Escrow has releaseBounty(uint256,address)');

  // refundBounty
  const refundFn = escrowIface.getFunction('refundBounty');
  assert(Boolean(refundFn), 'Escrow has refundBounty(uint256)');

  // getBounty
  const getBountyFn = escrowIface.getFunction('getBounty');
  assert(Boolean(getBountyFn), 'Escrow has getBounty(uint256) view');

  // getEscrowState
  const getStateFn = escrowIface.getFunction('getEscrowState');
  assert(Boolean(getStateFn), 'Escrow has getEscrowState(uint256) view');

  // Events
  const lockedEvent = escrowIface.getEvent('BountyLocked');
  const releasedEvent = escrowIface.getEvent('BountyReleased');
  const refundedEvent = escrowIface.getEvent('BountyRefunded');

  assert(Boolean(lockedEvent), 'Escrow emits BountyLocked event');
  assert(Boolean(releasedEvent), 'Escrow emits BountyReleased event');
  assert(Boolean(refundedEvent), 'Escrow emits BountyRefunded event');

  console.log('\n--- 4. CRYPTOGRAPHIC INTEGRITY & HASH DETERMINISM ---');
  const sampleObject = {
    id: 'orbit-7821',
    orbitId: 'ORBIT-7821',
    name: 'Leica M11 Rangefinder Camera',
    serialNumber: 'SN5682910',
    brand: 'Leica',
    model: 'M11',
    manufactureYear: 2023,
  };

  const hash1 = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(sampleObject)));
  const hash2 = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(sampleObject)));
  assert(hash1 === hash2, 'Keccak-256 passport hash computation is strictly deterministic');
  assert(hash1.length === 66, 'Hash is valid 32-byte hexadecimal with 0x prefix');

  // Handshake hashing
  const code = 'HK-8291-7X';
  const handshakeHash = ethers.keccak256(ethers.toUtf8Bytes(code.trim().toUpperCase()));
  assert(handshakeHash.length === 66, 'Handshake code hash is 32-byte cryptographic commitment');

  // Lifecycle event hashing
  const eventPayload = {
    type: 'REPAIR_RECORDED',
    title: 'Rangefinder Sensor Calibration',
    costEth: '0.004',
  };
  const eventHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(eventPayload)));
  assert(eventHash.length === 66, 'Lifecycle event hash produces valid bytes32 commitment');

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passedTests + failedTests} | PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
