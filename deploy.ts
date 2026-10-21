import fs from 'fs';
import path from 'path';
import { ethers, JsonRpcProvider, Wallet, ContractFactory } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_SEPOLIA_RPC = 'https://ethereum-sepolia-rpc.publicnode.com';

async function main() {
  console.log('--- ORBIT SEPOLIA DUAL CONTRACT DEPLOYMENT ---');

  const rpcUrl = process.env.SEPOLIA_RPC_URL || DEFAULT_SEPOLIA_RPC;
  const privateKey = process.env.DEPLOYER_PRIVATE_KEY;

  if (!privateKey) {
    console.error('ERROR: DEPLOYER_PRIVATE_KEY environment variable is not set.');
    console.error('Please set DEPLOYER_PRIVATE_KEY in your environment or .env file.');
    console.error('Example: export DEPLOYER_PRIVATE_KEY=0x...');
    console.error('Optional: export SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com');
    process.exit(1);
  }

  // Load Passport artifact
  const passportArtifactPath = path.resolve(process.cwd(), 'src/blockchain/ORBITPassportArtifact.json');
  const escrowArtifactPath = path.resolve(process.cwd(), 'src/blockchain/ORBITRecoveryEscrowArtifact.json');

  if (!fs.existsSync(passportArtifactPath) || !fs.existsSync(escrowArtifactPath)) {
    console.error('Artifacts not found. Please run npx tsx scripts/compile-contract.ts first.');
    process.exit(1);
  }

  const passportArtifact = JSON.parse(fs.readFileSync(passportArtifactPath, 'utf8'));
  const escrowArtifact = JSON.parse(fs.readFileSync(escrowArtifactPath, 'utf8'));

  const provider = new JsonRpcProvider(rpcUrl);
  const network = await provider.getNetwork();
  console.log(`Connected to Network: ${network.name} (Chain ID: ${network.chainId})`);

  if (Number(network.chainId) !== 11155111) {
    console.warn(`WARNING: Target chain ID is ${network.chainId}, expected Sepolia (11155111).`);
  }

  const wallet = new Wallet(privateKey, provider);
  const deployerAddress = await wallet.getAddress();
  const balance = await provider.getBalance(deployerAddress);

  console.log(`Deployer Account: ${deployerAddress}`);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    console.error('ERROR: Deployer account has 0 Sepolia ETH. Please fund account from a Sepolia faucet.');
    process.exit(1);
  }

  // 1. Deploy ORBITPassport
  console.log('\n[1/2] Deploying ORBITPassport contract to Ethereum Sepolia...');
  const passportFactory = new ContractFactory(passportArtifact.abi, passportArtifact.bytecode, wallet);
  const passportContract = await passportFactory.deploy();
  console.log(`Passport deployment broadcasted. Tx Hash: ${passportContract.deploymentTransaction()?.hash}`);
  await passportContract.waitForDeployment();
  const passportAddress = await passportContract.getAddress();
  const passportReceipt = await passportContract.deploymentTransaction()?.wait(1);
  console.log(`✓ ORBITPassport deployed at: ${passportAddress} (Block: ${passportReceipt?.blockNumber})`);

  // 2. Deploy ORBITRecoveryEscrow
  console.log('\n[2/2] Deploying ORBITRecoveryEscrow contract linked to Passport...');
  const escrowFactory = new ContractFactory(escrowArtifact.abi, escrowArtifact.bytecode, wallet);
  const escrowContract = await escrowFactory.deploy(passportAddress);
  console.log(`Escrow deployment broadcasted. Tx Hash: ${escrowContract.deploymentTransaction()?.hash}`);
  await escrowContract.waitForDeployment();
  const escrowAddress = await escrowContract.getAddress();
  const escrowReceipt = await escrowContract.deploymentTransaction()?.wait(1);
  console.log(`✓ ORBITRecoveryEscrow deployed at: ${escrowAddress} (Block: ${escrowReceipt?.blockNumber})`);

  console.log('\n======================================================');
  console.log('ORBIT DUAL CONTRACT DEPLOYMENT SUCCESSFUL!');
  console.log('------------------------------------------------------');
  console.log(`ORBITPassport:       ${passportAddress}`);
  console.log(`ORBITRecoveryEscrow: ${escrowAddress}`);
  console.log(`Passport Tx Hash:    ${passportContract.deploymentTransaction()?.hash}`);
  console.log(`Escrow Tx Hash:      ${escrowContract.deploymentTransaction()?.hash}`);
  console.log('======================================================\n');

  // Update .env file
  const envPath = path.resolve(process.cwd(), '.env');
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Helper to upsert env var
  const upsertEnv = (key: string, value: string) => {
    const regex = new RegExp(`^${key}=.*`, 'm');
    if (regex.test(envContent)) {
      envContent = envContent.replace(regex, `${key}="${value}"`);
    } else {
      envContent += `\n${key}="${value}"`;
    }
  };

  upsertEnv('VITE_ORBIT_PASSPORT_CONTRACT', passportAddress);
  upsertEnv('VITE_ORBIT_PASSPORT_CONTRACT_ADDRESS', passportAddress);
  upsertEnv('VITE_ORBIT_ESCROW_CONTRACT', escrowAddress);
  upsertEnv('VITE_ORBIT_ESCROW_CONTRACT_ADDRESS', escrowAddress);

  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log(`Updated .env with deployed contract addresses.`);
}

main().catch(err => {
  console.error('Deployment failed:', err);
  process.exit(1);
});

