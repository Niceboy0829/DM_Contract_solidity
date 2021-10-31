
const fs = require('fs');
require('colors');
/* const {DeployTest} = require ("./1_TokenDeploy");
const {deployDMToken} = require ("./1_TokenDeploy");
const { deployUSDT } = require('./2_USDTDeploy');
const { deployStaking } = require('./3_StakingDeploy'); */
/* const { deployInsurrancePool } = require('./4_insurranceDeploy'); */

const contracts = require("../src/config/contracts.json");

const abiDeployDM = require("../artifacts/contracts/DeployDM.sol/DeployDM.json");
const abiDeployOthers = require("../artifacts/contracts/DeployOthers.sol/DeployOthers.json");

const abiDMToken = require("../artifacts/contracts/DMToken.sol/DMToken.json");
const abiRouter = require("../artifacts/contracts/dexRouter.sol/PancakeswapRouter.json");
/* const abiERC20 = require("../artifacts/contracts/DMToken.sol/IERC20.json"); */
const abiStaking = require("../artifacts/contracts/staking.sol/Staking.json");
const abiPair = require("../artifacts/contracts/dexfactory.sol/IPancakeswapPair.json");

const {ethers} = require("ethers");
const hre = require("hardhat");


const tokenList = [
	'DM',
	'USDT',
	'ETH',
	'TRX',
	'FIL',
	'XRP',
	'DOT',
	'ADA',
	'HT',
]

async function main() {
	const signer = await hre.ethers.getSigner();
	const stakeFeeAddress = '0x768502E4fFd6b0492f52D996d754398E1164A52F'
	const communityFeeAddress = '0x396F9cdB598384B889E07398B784AF49E0639B7F'
	const router = '0x3bb13600339417da0C6e987e4e75cf4aF8eFDc56' // icicb
	// const router = '0xED6Dd43eDA37589cA4418b954cbbD6728ac3bdd2' // icicbtest
	const account = signer.address // '0xC5df89579D7A2f85b8a4b1a6395083da394Bba92'
	const balance =  1e8

	const result = {router, tokens:{}, staking: {}};
	const network = await signer.provider._networkPromise;
	const chainId = network.chainId;
	console.log('Starting by '.blue, signer.address.yellow);
	console.log('Preparing...'.blue, "Step 1");
	const dmDeploy = await hre.ethers.getContractFactory("DeployDM");
	const deployDM = await dmDeploy.deploy();
	/* await deployDM.deployed(); */
	console.log('Preparing...'.blue, "Step 2");
	const othersDeploy = await hre.ethers.getContractFactory("DeployOthers");
	const deployOthers = await othersDeploy.deploy();
	/* await deployOthers.deployed(); */

	console.log('Deploying DM contract...'.blue);
	const dm = new ethers.Contract(deployDM.address, abiDeployDM.abi, signer);
	
	await dm.deplyDM(stakeFeeAddress, communityFeeAddress, deployOthers.address, result.router, account, balance);
	const {_dm, _usdt} = await dm.getTokens();
	console.log("DM"   + (" ".repeat(10-2)), _dm.green);
	console.log("USDT" + (" ".repeat(10-4)), _usdt.green);
	
	console.log('Deploying tokens & staking contracts...'.blue);
	const others = new ethers.Contract(deployOthers.address, abiDeployOthers.abi, signer);
	await others.deplyTokens1(stakeFeeAddress, _dm, _usdt, account, balance);
	await others.deplyTokens2(stakeFeeAddress, _dm, _usdt, account, balance);
	const tokens = await others.getTokens();
	tokens.map((v,k)=>{
		console.log(tokenList[k] + (" ".repeat(10 - tokenList[k].length)), v.token.green);
		result.tokens[tokenList[k]]={address:v.token, decimals:v.decimals}
	})
	const stakings = await others.getStakings();
	stakings.map((v,k)=>{
		console.log(tokenList[k]+' / DM'  + (" ".repeat(5 - tokenList[k].length)), v.green);
		result.staking[tokenList[k]]=v
	})
	
	console.log('writing abis and addresses...'.blue);
	/* -------------- writing... -----------------*/
	fs.writeFileSync(`./src/config/abi/router.json`,  JSON.stringify(abiRouter.abi, null, 4));
	fs.writeFileSync(`./src/config/abi/dmtoken.json`, JSON.stringify(abiDMToken.abi, null, 4));
	fs.writeFileSync(`./src/config/abi/staking.json`, JSON.stringify(abiStaking.abi, null, 4));
	fs.writeFileSync(`./src/config/abi/pair.json`,	  JSON.stringify(abiPair.abi, null, 4));
	fs.writeFileSync(`./src/config/contracts.json`,   JSON.stringify({...contracts, [chainId]:result}, null, 4));
	console.log('complete'.green);
}

main().then(() => {
}).catch((error) => {
	console.error(error);
	process.exit(1);
});
