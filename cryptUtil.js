const  JSEncrypt  = require("node-jsencrypt")

let crypt = null
let privateKey = null

 function generateKeypair () {
     
    crypt = new JSEncrypt({default_key_size: 2056})
    privateKey = crypt.getPrivateKey()
  
    // Only return the public key, keep the private key hidden
    return crypt.getPublicKey()
  }
  
  /** Encrypt the provided string with the destination public key */
  function encrypt (content, publicKey) {
    crypt.setKey(publicKey)
    return crypt.encrypt(content)
  }
  
  /** Decrypt the provided string with the local private key */
  function decrypt (content) {
    crypt.setKey(privateKey)
    return crypt.decrypt(content)
  }
  exports.decrypt = decrypt
  exports.encrypt = encrypt
  exports.generateKeypair = generateKeypair