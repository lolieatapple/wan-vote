import Cors from 'cors'
const iWanClient = require('iwan-sdk');
import Web3 from 'web3';
var MongoClient = require('mongodb').MongoClient;
var url = process.env.MONGO_URL;
var openStoremanAddress = '0x1e7450d5d17338a348c5438546f0b4d0a5fbeab6';

const multicallAbi = require('./abi/multicall.abi.json');
const BigNumber = require('bignumber.js');


async function main(req) {
  let query = req.query;
  if (!query || !query.addr || !query.block) {
    return { success: false };
  }
  let addr = query.addr.toLowerCase();
  let block = query.block;

  console.log('query addr:', addr, 'block:', block);

  // let connection = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  // let db = connection.db("wanVote");

  // let ret = await db.collection('cache').find({addr, block}).toArray();

  // console.log('db ret', ret);

  // if (ret && ret.length > 0) {
  //   return {success: true, data: ret[0]};
  // }

  let total = new BigNumber(0);


  let web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));
  let multicallSc = new web3.eth.Contract(multicallAbi, process.env.MULTICALL_ADDR)

  let balance = await multicallSc.methods.getEthBalance(addr).call(undefined, block);

  console.log('wallet balance:', balance / 1e18);

  total = total.plus(balance);

  let apiClient = new iWanClient(process.env.IWAN_API_KEY, process.env.IWAN_SEC_KEY);

  total = total.plus(await getStoremanStakeIn(apiClient, addr, block));

  total = total.plus(await getStoremanPartnerIn(apiClient, addr, block));

  total = total.plus(await getStoremanDelegateIn(apiClient, addr, block));

  console.log('total:', total.div(1e18).toString());

  // await db.collection('cache').insertOne({addr, block, balance, time: Date.now()});

  apiClient.close();
  // connection.close();
  return { success: true, data: { addr, block, balance: total.div(1e18).toString(), time: Date.now() } };
}

async function getStoremanStakeIn(apiClient, addr, block) {
  let total = new BigNumber(0);

  // Add Storeman Stake In amount------------------------
  // stakeInEvent(bytes32,address,address,uint256)
  const storemanStakeInEvent = ['0xf620af888e897c3d0789deac5936ca29750d86a1d1648fca250e95af616705ce', null, null, '0x' + addr.slice(2).padStart(64, '0')];

  // stakeAppendEvent(address,address,uint256)
  const stakeAppendEvent = ['0x77ac8cfa7ffa986cec0e1e671ee8364772856042d29ce17e7fc1e7e448692dd2', null, '0x' + addr.slice(2).padStart(64, '0'), null];

  // stakeClaimEvent(address,address,bytes32,uint256)
  const storemanStakeClaimEvent = ['0x7f2ac19b2240a1d5b889d9e08ba81350cdcce028fcadef7227c3965a46c1853e', null, '0x' + addr.slice(2).padStart(64, '0'), null];

  let stmStakeIn = await apiClient.getScEvent('WAN', openStoremanAddress, storemanStakeInEvent, { toBlockoptional: block });
  console.log('getStoremanStakeIn stmStakeIn', stmStakeIn.length);

  let stmStakeClaim = await apiClient.getScEvent('WAN', openStoremanAddress, storemanStakeClaimEvent, { toBlockoptional: block });
  console.log('getStoremanStakeIn stmStakeClaim', stmStakeClaim.length);

  let stmStakeAppend = await apiClient.getScEvent('WAN', openStoremanAddress, stakeAppendEvent, { toBlockoptional: block });
  console.log('getStoremanStakeIn stmStakeAppend', stmStakeClaim.length);

  if (stmStakeIn.length > 0) {
    for (let i=0; i<stmStakeIn.length; i++) {
      total = total.plus(stmStakeIn[i].data);
    }
  }

  if (stmStakeAppend.length > 0) {
    for (let i=0; i<stmStakeAppend.length; i++) {
      total = total.plus(stmStakeAppend[i].topics[3]);
    }
  }

  if (stmStakeClaim.length > 0) {
    for (let i=0; i<stmStakeClaim.length; i++) {
      total = total.minus(stmStakeClaim[i].data);
    }
  }
  //------------------------------------------------------
  console.log('stake in', total.div(1e18).toString());

  return total;
}

async function getStoremanPartnerIn(apiClient, addr, block) {
  let total = new BigNumber(0);

  // Add Storeman Stake In amount------------------------
  // partInEvent(address,address,uint256)
  const partInEvent = ['0x9663ccdbd15adbf4add5f18689c9f9b81f7e7c00f8cbc5919bbfe24458b10fbc', null, '0x' + addr.slice(2).padStart(64, '0'), null];

  // partClaimEvent(address,address,uint256)
  const partClaimEvent = ['0xfde86f3ee194464e5d73c3f384ffa41375e69dbd5291844c2d17e9fb98164de8', null, '0x' + addr.slice(2).padStart(64, '0'), null];

  let inEvents = await apiClient.getScEvent('WAN', openStoremanAddress, partInEvent, { toBlockoptional: block });
  console.log('getStoremanPartnerIn inEvents', inEvents.length);

  let claimEvents = await apiClient.getScEvent('WAN', openStoremanAddress, partClaimEvent, { toBlockoptional: block });
  console.log('getStoremanPartnerIn claimEvents', claimEvents.length);

  if (inEvents.length > 0) {
    for (let i=0; i<inEvents.length; i++) {
      total = total.plus(inEvents[i].topics[3]);
    }
  }

  if (claimEvents.length > 0) {
    for (let i=0; i<claimEvents.length; i++) {
      total = total.minus(claimEvents[i].topics[3]);
    }
  }
  //------------------------------------------------------
  console.log('partner in', total.div(1e18).toString());
  return total;
}

async function getStoremanDelegateIn(apiClient, addr, block) {
  let total = new BigNumber(0);

  // Add Storeman Stake In amount------------------------
  // delegateInEvent(address,address,uint256)
  const delegateInEvent = ['0x2cdfa7fa6191cc7743846e325dbe6b22c68e2b5f83692a3e432bdd28b13e7996', null, '0x' + addr.slice(2).padStart(64, '0'), null];

  // delegateClaimEvent(address,address,uint256)
  const delegateClaimEvent = ['0xc15174799c65ba4753ac2bb2d2e80ee4684235e9302345671327b0894e7c7026', null, '0x' + addr.slice(2).padStart(64, '0'), null];

  let inEvents = await apiClient.getScEvent('WAN', openStoremanAddress, delegateInEvent, { toBlockoptional: block });
  console.log('getStoremanDelegateIn inEvents', inEvents.length);

  let claimEvents = await apiClient.getScEvent('WAN', openStoremanAddress, delegateClaimEvent, { toBlockoptional: block });
  console.log('getStoremanDelegateIn claimEvents', claimEvents.length);

  if (inEvents.length > 0) {
    for (let i=0; i<inEvents.length; i++) {
      total = total.plus(inEvents[i].topics[3]);
    }
  }

  if (claimEvents.length > 0) {
    for (let i=0; i<claimEvents.length; i++) {
      total = total.minus(claimEvents[i].topics[3]);
    }
  }
  //------------------------------------------------------
  console.log('delegate in', total.div(1e18).toString());
  return total;
}


// Initializing the cors middleware
const cors = Cors({
  methods: ['GET', 'HEAD'],
})

// Helper method to wait for a middleware to execute before continuing
// And to throw an error when an error happens in a middleware
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result)
      }

      return resolve(result)
    })
  })
}

async function handler(req, res) {
  // Run the middleware
  await runMiddleware(req, res, cors)
  res.statusCode = 200
  res.json(await main(req));
}

export default handler;
