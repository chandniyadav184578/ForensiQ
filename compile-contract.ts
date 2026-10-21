import fs from 'fs';
import path from 'path';
import solc from 'solc';

const passportPath = path.resolve(process.cwd(), 'contracts/ORBITPassport.sol');
const passportSource = fs.readFileSync(passportPath, 'utf8');

const escrowPath = path.resolve(process.cwd(), 'contracts/ORBITRecoveryEscrow.sol');
const escrowSource = fs.readFileSync(escrowPath, 'utf8');

function findImports(importPath: string) {
  try {
    if (importPath.startsWith('@openzeppelin/')) {
      const fullPath = path.resolve(process.cwd(), 'node_modules', importPath);
      if (fs.existsSync(fullPath)) {
        return { contents: fs.readFileSync(fullPath, 'utf8') };
      }
    }
    const localPath = path.resolve(process.cwd(), 'contracts', importPath);
    if (fs.existsSync(localPath)) {
      return { contents: fs.readFileSync(localPath, 'utf8') };
    }
    return { error: 'File not found: ' + importPath };
  } catch (err: any) {
    return { error: err.message };
  }
}

const input = {
  language: 'Solidity',
  sources: {
    'ORBITPassport.sol': {
      content: passportSource,
    },
    'ORBITRecoveryEscrow.sol': {
      content: escrowSource,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode'],
      },
    },
  },
};

console.log('Compiling ORBIT smart contracts (ORBITPassport & ORBITRecoveryEscrow) with OpenZeppelin...');
const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));

if (output.errors) {
  let hasFatal = false;
  for (const error of output.errors) {
    console.log(error.formattedMessage);
    if (error.severity === 'error') hasFatal = true;
  }
  if (hasFatal) {
    process.exit(1);
  }
}

const outDir = path.resolve(process.cwd(), 'src/blockchain');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Save ORBITPassport artifact
const passportContract = output.contracts['ORBITPassport.sol']['ORBITPassport'];
fs.writeFileSync(
  path.resolve(outDir, 'ORBITPassportArtifact.json'),
  JSON.stringify({ abi: passportContract.abi, bytecode: passportContract.evm.bytecode.object }, null, 2)
);
console.log(`Saved ORBITPassport artifact: ${passportContract.abi.length} functions/events`);

// Save ORBITRecoveryEscrow artifact
const escrowContract = output.contracts['ORBITRecoveryEscrow.sol']['ORBITRecoveryEscrow'];
fs.writeFileSync(
  path.resolve(outDir, 'ORBITRecoveryEscrowArtifact.json'),
  JSON.stringify({ abi: escrowContract.abi, bytecode: escrowContract.evm.bytecode.object }, null, 2)
);
console.log(`Saved ORBITRecoveryEscrow artifact: ${escrowContract.abi.length} functions/events`);

console.log('All smart contracts successfully compiled!');

