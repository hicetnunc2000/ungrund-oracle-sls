require('dotenv').config()

const { TezosToolkit } = require('@taquito/taquito')
const { InMemorySigner } = require('@taquito/signer')
const axios = require('axios')
const _ = require('lodash')

const ungrund = proccess.env.KT_ORACLE
const Tezos = new TezosToolkit(process.env.TZ_ENDPOINT)

Tezos.setProvider({
	signer : new InMemorySigner(process.env.TZ_SK)
})

// FUNCTIONS

// key management

// fail configuration

const inject = async (reqId, result) => {
  console.log([reqId, result])
  try {
    let kt = await Tezos.contract.at(ungrund)
    let op = await kt.methods.fullFillRequest(reqId, result).send()
  } catch (e) {
    console.log(e)
  }

}

//inject()
// requests link and path from storage for such stateId
const getStorage = async (network, kt) => {
  let ptr = await axios.get(`https://api.better-call.dev/v1/contract/${network}/${kt}/storage`).then(res => res.data.children[0].value)
  let bigMap = await axios.get(`https://api.better-call.dev/v1/bigmap/${network}/${ptr}/keys`).then(res => res.data)
  let keys = bigMap.map(e => e.data).filter(e => e.value.children[1].value == false).map(e => parseInt(e.key.value)).sort()
  console.log(keys)
  let callback = bigMap.filter(e => e.data.key.value == keys[0])[0].data.value.children[0].value
  let payload = bigMap.filter(e => e.data.key.value == keys[0])[0].data.value.children[2].children.map(e => e.value)
  console.log(callback) //verify if callback is configured with proper parameters entrypoint
  console.log(payload)
  //verify if args follows a pattern
  return [keys[0], payload]
}
//getStorage('delphinet', ungrund)
//getStorage('delphinet', 'KT1VNKfd8dVzQ1rvkRDQrMfJgwGFUdMBcxdZ')

const fullFillRequest = async (link) => {
  return await axios.get(link).then(res => res.data)
}

const compare = async (request, response) => {

  var response = await response
  var allkeys = _.union(_.keys(request), _.keys(response))

  var difference = _.reduce(allkeys, function (result, key) {
    if (!_.isEqual(request[key], response[key])) {
      result[key] = { request: request[key], response: response[key] }
    }
    return result
  }, {})

  const key = Object.keys(request).find(key => request[key] === "UNG")
  //console.log(key)
  //console.log(difference[key].response)
  return difference[key].response

}

// PROCEDURE

const mult = (response, factor) => {
  return response * factor
}

const procedure = async () => {

  var arr = await getStorage('delphinet', ungrund)
  console.log(arr)
  var requestResult = await fullFillRequest(arr[1][0])
  console.log(requestResult)
  var nat = await compare(JSON.parse(arr[1][2]), requestResult)
  await inject(arr[0], nat * arr[1][1])

}

procedure()


//let res = compare(JSON.parse('{"BRL":"UNG"}'), fullFillRequest('https://min-api.cryptocompare.com/data/price?fsym=USDT&tsyms=BRL'))
//let res = compare(JSON.parse('{"randomness" : "UNG"}'), fullFillRequest('https://api.drand.sh/public/latest'))
//console.log(mult(res, 1000))

// HANDLE
