const crypto = require('crypto')
const Swarm = require('discovery-swarm')
const defaults = require('dat-swarm-defaults')
const getPort = require('get-port')
const readline = require('readline')
const reader = require("readline-sync")
const colors = require("colors")
const { header, ruvikmedium } = require("./asciiArt")
const { generateKeypair, decrypt, encrypt } = require('./cryptUtil')

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function truncateString(str, num) {
  if (str.length <= num) {
    return str
  }
  return str.slice(0, num) + '...'
}

console.log(header.green)
const arr = ruvikmedium.split("\n")
async function printruvik() {
  for (const line in arr) {
    console.log(arr[line])
    await sleep(150)
  }
}
printruvik().then(()=>{
/**
 * Here we will save our TCP peer connections
 * using the peer id as key: { peer_id: TCP_Connection }
 */
 const peers = {}
 // Counter for connections, used for identify connections
 let connSeq = 0
 
 //Map to hold id -nickname
 let idNickMap = new Map()
 
 //Lets hold a nickname
 let nickname = reader.question(" Enter your nickname Nickname:".green)
 if (nickname == "" || nickname == null) {
   nickname = "anonymous"
 }
 let channel = reader.question("  Channel name to connect(leave empty for deafult) :".green)
 if (channel == "" || channel == null) {
   channel = "49195848f22457e887bfbbc53db68465"
 }
 // Peer Identity, a random hash for identify your peer
 const myId = crypto.randomBytes(32)
 console.log('Your identity: ' + myId.toString('hex'))
 console.log("Generating RSA keys")
 let myPublicKey = generateKeypair()
 console.log(truncateString(myPublicKey,50).green)
 let peerPublicKey = null
 // reference to redline interface
 let rl
 rl = readline.createInterface({
   input: process.stdin,
   output: process.stdout
 })
 /**
  * Function for safely call console.log with readline interface active
  */
 function log() {
   rl.clearLine()
 
   for (let i = 0, len = arguments.length; i < len; i++) {
     console.log(arguments[i])
   }
   askUser()
 }
 
 /*
 * Function to get text input from user and send it to other peers
 * Like a chat :)
 */
 const askUser = async () => {
 
   rl.question('Send message: ', message => {
     // Broadcast to peers
     for (let id in peers) {
       let data = JSON.stringify({ message: message, user: nickname })
       let encrypted = encrypt(data, peers[id].publicKey)
       peers[id].conn.write(JSON.stringify({ type: "message", payload: encrypted }))
     }
     askUser()
   });
 
 }
 
 /** 
  * Default DNS and DHT servers
  * This servers are used for peer discovery and establishing connection
  */
 const config = defaults({
   // peer-id
   id: myId,
   maxConnections: 2,
   keepExistingConnections: true
 })
 
 /**
  * discovery-swarm library establishes a TCP p2p connection and uses
  * discovery-channel library for peer discovery
  */
 const sw = Swarm(config)
 
 
 
   ; (async () => {
 
     // Choose a random unused port for listening TCP peer connections
     const port = await getPort()
 
     sw.listen(port)
     console.log('Listening to port: ' + port)
 
     /**
      * The channel we are connecting to.
      * Peers should discover other peers in this channel
      */
 
     sw.join(channel)
 
     sw.on('connection', (conn, info) => {
       // Connection id
       const seq = connSeq
 
       const peerId = info.id.toString('hex')
       //log(`Connected #${seq} to peer: ${peerId}`)
       //lets send our key,nickname we are connecting for the first time 
       conn.write(JSON.stringify({ type: "connection", key: myPublicKey, name: nickname }))
       // Keep alive TCP connection with peer
       if (info.initiator) {
         try {
           conn.setKeepAlive(true, 600)
         } catch (exception) {
           log('exception', exception)
         }
       }
 
       conn.on('data', data => {
         obj = JSON.parse(data)
         if (obj.type == "connection") {
           peers[peerId].publicKey = obj.key
           idNickMap.set(obj.name, peerId)
           log(`----> User ${obj.name} joined the chat`.green)
           for (const key in idNickMap.keys()) {
             log(key)
           }
         }
 
         if (obj.type == "message") {
           decrypted = JSON.parse(decrypt(obj.payload))
           // Here we handle incomming messages
           log(
             'Received Message from user: '.red + decrypted.user.yellow,
             '----> ' + decrypted.message
           )
         }
       })
 
       conn.on('close', () => {
         // Here we handle peer disconnection
         //log(`Connection ${seq} closed, peer id: ${peerId}`)
         // If the closing connection is the last connection with the peer, removes the peer
         if (peers[peerId].seq === seq) {
           delete peers[peerId]
         }
       })
 
       // Save the connection
       if (!peers[peerId]) {
         peers[peerId] = {}
       }
       peers[peerId].conn = conn
       peers[peerId].seq = seq
       connSeq++
 
     })
 
     // Read user message from command line
     askUser()
 
   })()
})
 

