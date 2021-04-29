import Cors from 'cors'
const iWanClient = require('iwan-sdk');
import Web3 from 'web3';
var MongoClient = require('mongodb').MongoClient;
var url = process.env.MONGO_URL;


const multicallAbi = require('./abi/multicall.abi.json');


async function main(req) {
  let query = req.query;
  if(!query || !query.addr || !query.block) {
    return {success: false};
  }
  let addr = query.addr;
  let block = query.block;
  let connection = await MongoClient.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });
  let db = connection.db("wanVote");

  let ret = await db.collection('cache').find({addr, block}).toArray();

  console.log('db ret', ret);

  if (ret && ret.length > 0) {
    return {success: true, data: ret[0]};
  }


  let apiClient = new iWanClient(process.env.IWAN_API_KEY, process.env.IWAN_SEC_KEY);
  let web3 = new Web3(new Web3.providers.HttpProvider(process.env.RPC_URL));
  let multicallSc = new web3.eth.Contract(multicallAbi, process.env.MULTICALL_ADDR)

  let balance = await multicallSc.methods.getEthBalance(addr).call(undefined, block);

  // let balance = await apiClient.getBalance('WAN', '0x5560aF0F46D00FCeA88627a9DF7A4798b1b10961');

  await db.collection('cache').insertOne({addr, block, balance, time: Date.now()});
  
  apiClient.close();
  connection.close();
  return { balance };
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
