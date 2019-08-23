
/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/

var crypto = require("crypto");

var clientVersion = 'SSH-2.0-UNP_1.1';
var traceCrypto = false;
var traceSSHMessage = false;
var traceBasic = true;
var MAX_SEQNO = 4294967295;

var hex = function(x){
  if (x || x === 0){
    return (x).toString(16);
  } else {
    return "<can't hex() unbound number>";
  }
}

var hexDump = function(a, offset, length){
  var start = (offset ? offset : 0);
  var len = (length ? length : a.length);
  var i; 
  var buff = "";
  for (i=0; i<len; i++){
    buff += hex(a[start+i])+" ";
    if ((i%16)==15) {
      console.log(buff);
      buff = "";
    }
  }
  if (buff.length > 0){
    console.log(buff);
  }
}


var SSH_MESSAGE = exports.MESSAGE = {
    SSH_MSG_DISCONNECT                  : 1,  // followed by a String with caose of disconnection
 
    SSH_MSG_SERVICE_REQUEST             : 5,
    SSH_MSG_SERVICE_ACCEPT              : 6,

    SSH_MSG_KEXINIT                     : 20,  
    SSH_MSG_NEWKEYS                     : 21,
    
    SSH_MSG_KEX_DH_GEX_REQUEST_OLD      : 30,
    SSH_MSG_KEX_DH_GEX_GROUP            : 31,
    SSH_MSG_KEX_DH_GEX_INIT             : 32,
    SSH_MSG_KEX_DH_GEX_REPLY            : 33,
    SSH_MSG_KEX_DH_GEX_REQUEST          : 34,
    
    //auth
    SSH_MSG_USERAUTH_REQUEST            : 50,
    SSH_MSG_USERAUTH_FAILURE            : 51,
    SSH_MSG_USERAUTH_SUCCESS            : 52,
    SSH_MSG_USERAUTH_BANNER             : 53,

    SSH_MSG_USERAUTH_INFO_REQUEST       : 60,
    SSH_MSG_USERAUTH_INFO_RESPONSE      : 61,


    SSH_MSG_USERAUTH_PASSWD_CHANGEREQ   : 60, //unknown how to differentiate this versus INFO_REQUEST
  
    //
    SSH_MSG_GLOBAL_REQUEST              : 80,
    SSH_MSG_REQUEST_SUCCESS             : 81,
    SSH_MSG_REQUEST_FAILURE             : 82,
    
    //channel related
    SSH_MSG_CHANNEL_OPEN                : 90,
    SSH_MSG_CHANNEL_OPEN_CONFIRMATION   : 91,
    SSH_MSG_CHANNEL_OPEN_FAILURE        : 92,
    SSH_MSG_CHANNEL_WINDOW_ADJUST       : 93,
    SSH_MSG_CHANNEL_DATA                : 94,
    SSH_MSG_CHANNEL_EXTENDED_DATA       : 95,
    SSH_MSG_CHANNEL_EOF                 : 96,
    SSH_MSG_CHANNEL_CLOSE               : 97,
    SSH_MSG_CHANNEL_REQUEST             : 98,
    SSH_MSG_CHANNEL_SUCCESS             : 99,
    SSH_MSG_CHANNEL_FAILURE             : 100,
    ERROR                               : 1000
}

const TERMINAL_TYPE_DEFAULT = 'vt100';
const VT_COLUMN_DEFAULT = 80;
const VT_ROW_DEFAULT = 24;
const VT_WIDTH_DEFAULT = 640;
const VT_HEIGHT_DEFAULT = 480;
        
var TTY_OP_END = 0;        
                                                   
var maxPacketSize = 0x10000; // lower the size from 2*0x10000 as stack may overflow

var initialWindowSize =  0x100000*2;
var SSH_CONNECTION= 'ssh-connection';
var KEYBOARD_INTERACTIVE='keyboard-interactive';
var Min_N_Max =[ new Number(1024),new Number(4096),new Number(8192) ];  
 


var SSH_TO_OPENSSL_TABLE = {
  'ecdh-sha2-nistp256': 'prime256v1',  
  'ecdh-sha2-nistp384': 'secp384r1',
  'ecdh-sha2-nistp521': 'secp521r1',
  'aes128-gcm': 'aes-128-gcm',
  'aes256-gcm': 'aes-256-gcm',
  'aes128-gcm@openssh.com': 'aes-128-gcm',
  'aes256-gcm@openssh.com': 'aes-256-gcm',
  '3des-cbc': 'des-ede3-cbc',
  'blowfish-cbc': 'bf-cbc',
  'aes256-cbc': 'aes-256-cbc',
  'aes192-cbc': 'aes-192-cbc',
  'aes128-cbc': 'aes-128-cbc',
  'idea-cbc': 'idea-cbc',
  'cast128-cbc': 'cast-cbc',
  'rijndael-cbc@lysator.liu.se': 'aes-256-cbc',
  'arcfour128': 'rc4',
  'arcfour256': 'rc4',
  'arcfour512': 'rc4',
  'arcfour': 'rc4',
  'camellia128-cbc': 'camellia-128-cbc',
  'camellia192-cbc': 'camellia-192-cbc',
  'camellia256-cbc': 'camellia-256-cbc',
  'camellia128-cbc@openssh.com': 'camellia-128-cbc',
  'camellia192-cbc@openssh.com': 'camellia-192-cbc',
  'camellia256-cbc@openssh.com': 'camellia-256-cbc',
  '3des-ctr': 'des-ede3',
  'blowfish-ctr': 'bf-ecb',
  'aes256-ctr': 'aes-256-ctr',
  'aes192-ctr': 'aes-192-ctr',
  'aes128-ctr': 'aes-128-ctr',
  'cast128-ctr': 'cast5-ecb',
  'camellia128-ctr': 'camellia-128-ecb',
  'camellia192-ctr': 'camellia-192-ecb',
  'camellia256-ctr': 'camellia-256-ecb',
  'camellia128-ctr@openssh.com': 'camellia-128-ecb',
  'camellia192-ctr@openssh.com': 'camellia-192-ecb',
  'camellia256-ctr@openssh.com': 'camellia-256-ecb',

  'hmac-sha1-96': 'sha1',
  'hmac-sha1': 'sha1',
  'hmac-sha2-256': 'sha256',
  'hmac-sha2-256-96': 'sha256',
  'hmac-sha2-512': 'sha512',
  'hmac-sha2-512-96': 'sha512',
  'hmac-md5-96': 'md5',
  'hmac-md5': 'md5',
  'hmac-ripemd160': 'ripemd160'
};

// order matters,
var SUPPORTED_KEX = [
'diffie-hellman-group-exchange-sha256',
'diffie-hellman-group-exchange-sha1',
'diffie-hellman-group14-sha1',
'diffie-hellman-group1-sha1',
]
  
var SUPPORTED_SERVER_HOST_KEY = [
'ssh-rsa',
'ssh-dss'
];

var SUPPORTED_CIPHER = [
'aes256-cbc',
'aes128-cbc',
'aes256-ctr',
'aes128-ctr',
'aes192-ctr',
'aes192-cbc',
'blowfish-cbc',
'3des-cbc',
'arcfour256',
'arcfour128',
'cast128-cbc',
'arcfour'
];
  
var SUPPORTED_HMAC = [
'hmac-sha2-256',
'hmac-sha2-512',
'hmac-sha1',
'hmac-md5',
'hmac-sha2-256-96',
'hmac-sha2-512-96',
'hmac-ripemd160',
'hmac-sha1-96',
'hmac-md5-96'
]; 

var SUPPORTED_COMPRESS = [
'none'
];
 

function ssh(){
}

exports.processEncryptedData = function(terminalWebsocketProxy,data) {
  return ssh.processEncryptedData(terminalWebsocketProxy,data);
};

exports.sendSSHData = function(terminalWebsocketProxy,data) {
  return ssh.sendSSHData(terminalWebsocketProxy,data);
};

ssh.sendSSHData = function (terminalWebsocketProxy,jsonData){
   var sessionData = terminalWebsocketProxy.sshSessionData;
   if(!sessionData){
     return; // error thrown
   }
   var msgCode = jsonData.msgCode;
   var pdu;
   switch (msgCode) {
     case SSH_MESSAGE.SSH_MSG_USERAUTH_INFO_RESPONSE: {
       //numResponses, responses
       if (jsonData.responses) {
         var msgCodeBuffer = new Buffer(1);
         msgCodeBuffer.writeUInt8(msgCode);
         var numResponses = jsonData.responses.length;
         var data = [msgCodeBuffer,jsonData.responses.length];
         jsonData.responses.forEach(function(response){
           data.push(new VarData(new Buffer(response,'utf8')));
         });
         pdu = new SSHv2PDU(msgCode,generateSSHv2PDUBytes(data));
        
       }
       break;
     }
     case SSH_MESSAGE.SSH_MSG_USERAUTH_REQUEST:{
       if (jsonData.method === 'password') {
         var msgCodeBuffer = new Buffer(1);
         msgCodeBuffer.writeUInt8(SSH_MESSAGE.SSH_MSG_USERAUTH_REQUEST);
         var username = new VarData(new Buffer(jsonData.username,'utf8'));
         var sshconnection = new VarData(new Buffer(SSH_CONNECTION,'utf8'));
         var passwordMethod = new VarData(new Buffer('password','utf8'));//this could be publickey,hostbased, or none. USERAUTH_FAILURE results when this attempt was no good.
         //USERAUTH_SUCCESS means the server approved.
         var authData = [msgCodeBuffer,username, sshconnection,passwordMethod,   new Boolean(false),new VarData(new Buffer(jsonData.password,'utf8'))];
         pdu = new SSHv2PDU(SSH_MESSAGE.SSH_MSG_USERAUTH_REQUEST,generateSSHv2PDUBytes(authData));
       }
       else if (jsonData.method === 'publickey') {
         if (jsonData.queryOnly === true) {
           console.log('TODO: publickey algo query');
         }
         else {
           console.log('TODO: publickey');
         }
       }
       break;
     }
     case SSH_MESSAGE.SSH_MSG_CHANNEL_DATA:{
       // sending data
       var dataBuffer = jsonData.data;
       var channelNumber = sessionData.primaryShellChannel;
       var channel = sessionData.channels[channelNumber];
       if (channel) {
         var msgCodeBuffer = new Buffer(1);
         msgCodeBuffer.writeUInt8(SSH_MESSAGE.SSH_MSG_CHANNEL_DATA);
         var shellData = [msgCodeBuffer,new Number(channel.serverChannelNumber), new VarData(dataBuffer)];
         if(traceSSHMessage) console.log("sending SSH_MSG_CHANNEL_DATA:\n"+ dataBuffer.toString('hex') +" to channel "+channel.serverChannelNumber);
          pdu = new SSHv2PDU(SSH_MESSAGE.SSH_MSG_CHANNEL_DATA,generateSSHv2PDUBytes(shellData));
       } else {
         //TODO this occurs occasionally, something must be unimplemented.
         if (traceBasic) console.log('Not sending MSG_CHANNEL_REQUEST because channel & primaryShellChannel cannot be found\n');
       }
       break;
     }
     case SSH_MESSAGE.SSH_MSG_CHANNEL_REQUEST: {
       var msgCodeBuffer = new Buffer(1);
       msgCodeBuffer.writeUInt8(SSH_MESSAGE.SSH_MSG_CHANNEL_REQUEST);
       var channelNumber = sessionData.primaryShellChannel;
       var channel = sessionData.channels[channelNumber];
       if (channel) {
         var requestData = [msgCodeBuffer,jsonData.channel ? new Number(jsonData.channel) : new Number(channel.serverChannelNumber),new VarData(new Buffer(jsonData.type)),new Boolean(jsonData.reply)];
         for (var i = 0; i < jsonData.requestContents.length; i++) {
           requestData.push(jsonData.requestContents[i]);
         }
         pdu = new SSHv2PDU(SSH_MESSAGE.SSH_MSG_CHANNEL_REQUEST,generateSSHv2PDUBytes(requestData));
       }
       else {
         //TODO this occurs occasionally, something must be unimplemented.
         if (traceBasic) console.log('Not sending MSG_CHANNEL_REQUEST because channel & primaryShellChannel cannot be found\n');
       }
       break;
     }
     
   }
   if (pdu!=null){
     if(sessionData.isKeyExchanging){
       sessionData.rekeyQueue.push(pdu);
     } else {
       var queuedPdu = sessionData.rekeyQueue.shift();
       while (queuedPdu){
         writeSSHv2PDU(function(buffer) {terminalWebsocketProxy.netSend(buffer);},sessionData,queuedPdu);
         queuedPdu = sessionData.rekeyQueue.shift();
       }
       writeSSHv2PDU(function(buffer) {terminalWebsocketProxy.netSend(buffer);},sessionData,pdu);    
     }
   }
   terminalWebsocketProxy.sshSessionData=sessionData;
   
}




// main method. 
ssh.processEncryptedData = function (terminalWebsocketProxy,rawData){

  var sshMessages = [];
   
  var returnError = function(msg) {
    return [{type: SSH_MESSAGE.ERROR, msg: msg}];
  };
  
  var sessionData = terminalWebsocketProxy.sshSessionData;
  if (!sessionData){
       
    sessionData = new SSHSessionData();
    var serverVersion = new String(rawData).trim();

    sessionData.serverVersion = Buffer.from(serverVersion,'utf8');
   
    var dataBuffer = new Buffer(clientVersion+'\r\n');
    terminalWebsocketProxy.netSend(dataBuffer);
    terminalWebsocketProxy.sshSessionData=sessionData;
    return sshMessages;
  }
       
  
  var currentPosition = 0;
  var channelNumber = sessionData.primaryShellChannel==null?sessionData.highestChannel:sessionData.primaryShellChannel;
 
  if (sessionData.incompletePacketBuffer){      
    if (sessionData.incompletePacketBuffer.length>sessionData.readCipherBlockLength && (sessionData.encryptCipher!=null)){
       sessionData.isFirstBlockDecrypted = true;
    }
    rawData = Buffer.concat([sessionData.incompletePacketBuffer,rawData]);
    if (traceCrypto) console.log("combined rawData.length " + rawData.length);
    sessionData.incompletePacketBuffer=null;
  }
  
  var rawDataLength = rawData.length;
  while (currentPosition<rawDataLength){ 
 
    var readObject = readSSHv2PDUData(sessionData,rawData,currentPosition);
  
    if (!readObject){
      return returnError('SSH parsing failed, socket closed.');
    }
    if (readObject.Continue){
      terminalWebsocketProxy.sshSessionData=sessionData;
      return sshMessages;
    }
    var sshv2PDU = readObject.sshv2PDU;
    currentPosition = readObject.readLength;
    var msgCode = sshv2PDU.readByte()&0xff;
    var sshMessage = {};
    if (msgCode) {
      sshMessage.type = msgCode;
      sessionData.sshMessageCode = msgCode;      
    }
    switch (msgCode) {
      case SSH_MESSAGE.SSH_MSG_SERVICE_ACCEPT:{
        sshMessages.push(sshMessage);
        break;
      } 
      case SSH_MESSAGE.SSH_MSG_DISCONNECT:{
        sshMessage.reasonCode = sshv2PDU.readInt();
        sshMessage.reasonLine = sshv2PDU.readSizedData();
        if(traceBasic) console.log("processed SSH_MSG_DISCONNECT: "+ sshMessage.reasonCode +'\n'+ new Buffer(sshMessage.reasonLine,'ascii').toString());
        sshMessages.push(sshMessage);
        break;
      }
      case SSH_MESSAGE.SSH_MSG_PK_OK: {
        if(traceSSHMessage) console.log("SSH_MESSAGE.SSH_MSG_PK_OK ");
        sshMessage.algorithm=sshv2PDU.readSizedData();
        sshMessage.blob=sshv2PDU.readSizedData();
        sshMessages.push(sshMessage);        
        break;
      }
      case SSH_MESSAGE.SSH_MSG_USERAUTH_BANNER : {
        if(traceSSHMessage) console.log("SSH_MESSAGE.SSH_MSG_USERAUTH_BANNER ");
        sshMessage.message=sshv2PDU.readSizedData();
        sshMessage.language=sshv2PDU.readSizedData();        
        sshMessages.push(sshMessage);
        break;
      } 
      case SSH_MESSAGE.SSH_MSG_USERAUTH_FAILURE:{
        if(traceSSHMessage) console.log('SSH_MESSAGE.SSH_MSG_USERAUTH_FAILURE ');
        sshMessages.push(sshMessage);
       // processData = new Buffer(sshv2PDU.data.length);
       // sshv2PDU.data.copy(processData,0);
        break;
      }
      case SSH_MESSAGE.SSH_MSG_USERAUTH_INFO_REQUEST:{
        if(traceSSHMessage) console.log('SSH_MESSAGE.SSH_MSG_USERAUTH_INFO_REQUEST ');
        sshMessage.name = sshv2PDU.readSizedData();
        sshMessage.inst = sshv2PDU.readSizedData();
        sshMessage.lang = sshv2PDU.readSizedData();
        var pCount = sshv2PDU.readInt();
        sshMessage.prompts = [];
        for (var i = 0; i < pCount; i++) {
          var prompt = {};
          prompt.s = sshv2PDU.readSizedData();
          prompt.e = sshv2PDU.readByte();
          sshMessage.prompts.push(prompt);
        }
        sshMessages.push(sshMessage);
        break;
      }
      case SSH_MESSAGE.SSH_MSG_USERAUTH_SUCCESS:{
        if(traceBasic) console.log('SSH_MSG_USERAUTH_SUCCESS  ');
        sshMessages.push(sshMessage);
        terminalWebsocketProxy.sshAuthenticated = true;
        
        // open a channel here. 
     
        if(traceSSHMessage) console.log('openning new channel, channelNumber: '+channelNumber);

        var msgCodeBuffer = new Buffer(1);
        msgCodeBuffer.writeUInt8(SSH_MESSAGE.SSH_MSG_CHANNEL_OPEN);
 
   
        var sessionVar = new VarData(new Buffer('session','utf8'));
        var openChannelRequestData = [msgCodeBuffer,sessionVar, new Number(channelNumber), new Number (initialWindowSize), new Number (maxPacketSize) ];
        
        var openChannelRequestPDU = new SSHv2PDU( SSH_MESSAGE.SSH_MSG_CHANNEL_OPEN, generateSSHv2PDUBytes(openChannelRequestData));
        writeSSHv2PDU(function(buffer) {terminalWebsocketProxy.netSend(buffer);},sessionData,openChannelRequestPDU);
      
        sessionData.expectedReplyMsgCode = SSH_MESSAGE.SSH_MSG_CHANNEL_OPEN_CONFIRMATION;    
        break;
      }
      case SSH_MESSAGE.SSH_MSG_CHANNEL_REQUEST: {
        console.log('CHANNEL REQUEST SEEN. Data='+hexDump(sshv2PDU.data));
        
        sshMessage.recipientChannel=sshv2PDU.readInt();
        sshMessage.requestName=sshv2PDU.readSizedData();
        sshMessage.needsReply=sshv2PDU.readByte();
        sshMessage.data=sshv2PDU.getRemainingBytes();
        sshMessages.push(sshMessage);
        break;
      }
      case SSH_MESSAGE.SSH_MSG_GLOBAL_REQUEST : { 
        if(traceSSHMessage) console.log('SSH_MESSAGE.SSH_MSG_GLOBAL_REQUEST');
        sshMessages.push(sshMessage);
        break;
      }
      case SSH_MESSAGE.SSH_MSG_CHANNEL_OPEN_CONFIRMATION:{
        if (sessionData.expectedReplyMsgCode){
          if (sessionData.expectedReplyMsgCode!=msgCode){
            //DISCONNECT_ERROR
            return returnError('Unexpected reply message code SSH_MSG_CHANNEL_OPEN_CONFIRMATION ('+msgCode+'). Expected='+sessionData.expectedReplyMsgCode);
          }
        }
        if(traceSSHMessage) console.log('SSH_MSG_CHANNEL_OPEN_CONFIRMATION received');
        
        if (sshv2PDU.readInt() != channelNumber) {
          //error return
          return returnError('SSH_MSG_CHANNEL_OPEN_CONFIRMATION contained incorrect channelNumber. Expected='+channelNumber);
        }
      
        var peerChannelNumber = sshv2PDU.readInt();
        var peerWindowSize = sshv2PDU.readInt();
        var peerMaxPacketSize = sshv2PDU.readInt();
        var channel = new SSH2ChannelData(channelNumber,
                                          peerChannelNumber,
                                          initialWindowSize,
                                          maxPacketSize,
                                          peerWindowSize,
                                          peerMaxPacketSize,
                                          false
                                          );
      
 
        sessionData.channels[channelNumber] = channel;
        var msgCodeBuffer = new Buffer(1);
        msgCodeBuffer.writeUInt8(SSH_MESSAGE.SSH_MSG_CHANNEL_REQUEST);
        var terMode = new VarData(new Buffer(TTY_OP_END));//add CS7=90 maybe?
        
        var settings = terminalWebsocketProxy.securitySettings;
        var terminalType;
        var columns;
        var rows;
        var width;
        var height;
        if (settings) {
          terminalType = settings.termt ? settings.termt : TERMINAL_TYPE_DEFAULT;
          if (settings.termc && settings.termr) {
            columns = settings.termc;
            rows = settings.termr;
          }
          else {
            columns = VT_COLUMN_DEFAULT;
            rows = VT_ROW_DEFAULT;
          }
          if (settings.termw && settings.termh) {
            width = settings.termw;
            height = settings.termh;
          }
          else {
            width = VT_WIDTH_DEFAULT;
            height = VT_HEIGHT_DEFAULT;
          } 
        }
        var shellPTYRequestData  = [msgCodeBuffer, new Number(peerChannelNumber),new VarData(new Buffer('pty-req')),
        new Boolean(true),new VarData(new Buffer(terminalType)),new Number(columns),new Number(rows),
        new Number(width),new Number(height),terMode];
                                  
        var shellPTYRequestPDU = new SSHv2PDU( SSH_MESSAGE.SSH_MSG_CHANNEL_REQUEST, generateSSHv2PDUBytes(shellPTYRequestData));                            
        writeSSHv2PDU(function(buffer) {terminalWebsocketProxy.netSend(buffer);},sessionData,shellPTYRequestPDU);
 
        break;
      } 
      case SSH_MESSAGE.SSH_MSG_CHANNEL_FAILURE:{
        if(traceBasic) console.log('SSH_MSG_CHANNEL_FAILURE ');
        break;
      } 
      case SSH_MESSAGE.SSH_MSG_CHANNEL_DATA : {
        sessionData.sshMessageCode = SSH_MESSAGE.SSH_MSG_CHANNEL_DATA;
        var recipientChannel = sshv2PDU.readInt();
        sshMessage.readData = sshv2PDU.readSizedData();
        sshMessages.push(sshMessage);
        
        // test code for rekey
        /*if (sessionData.isKeyExchanging1 == false ){
          sessionData.isKeyExchanging  = true;
          sessionData.isKeyExchangingInitSent = true;
          console.log("starting re keying ");
    
          var clientKexPDU = makeKeyExchangeResponse(sessionData);
          sessionData.clientKexPayload = clientKexPDU.data;
      
          writeSSHv2PDU(function(buffer) {terminalWebsocketProxy.netSend(buffer);},sessionData,clientKexPDU);
        }*/
      //  if(traceSSHMessage) console.log("processed SSH_MSG_CHANNEL_DATA:\n"+ new Buffer(sshMessage.readData,'ascii').toString());
        break;
      }
      case SSH_MESSAGE.SSH_MSG_CHANNEL_SUCCESS : {
        if(sessionData.channels[channelNumber]){
          var currentChannel = sessionData.channels[channelNumber];
          if (!currentChannel.secondShellRequest){
            currentChannel.secondShellRequest = true;
            var msgCodeBuffer = new Buffer(1);
            msgCodeBuffer.writeUInt8(SSH_MESSAGE.SSH_MSG_CHANNEL_REQUEST);
            var terMode  =  new VarData(new Buffer(TTY_OP_END));
            var shellPTYRequestData =[msgCodeBuffer, new Number(currentChannel.peerChannelNumber),new VarData(new Buffer('shell')),new Boolean(true)];
            var shellPTYRequestPDU = new SSHv2PDU( SSH_MESSAGE.SSH_MSG_CHANNEL_REQUEST, generateSSHv2PDUBytes(shellPTYRequestData));                            
            writeSSHv2PDU(function(buffer) {terminalWebsocketProxy.netSend(buffer);},sessionData,shellPTYRequestPDU);
          } else {
            sessionData.primaryShellChannel = sessionData.highestChannel;
            sessionData.highestChannel++;
            sessionData.sshMessageCode = SSH_MESSAGE.SSH_MSG_CHANNEL_SUCCESS;
            
            if(traceBasic) console.log('SSH_MSG_CHANNEL_SUCCESS built, channel number: ' + sessionData.primaryShellChannel);
            break ;
          }
        }
        
        break;
      }
      case SSH_MESSAGE.SSH_MSG_CHANNEL_WINDOW_ADJUST:{
        if(traceSSHMessage) console.log('SSH_MSG_CHANNEL_WINDOW_ADJUST received');
        if(sessionData.channels[channelNumber]){
          var currentChannel = sessionData.channels[channelNumber];
          var recipientChannel = sshv2PDU.readInt();
          if(traceSSHMessage) console.log("adjusting SSH_MSG_CHANNEL_WINDOW_ADJUST, channel number "+recipientChannel);
          currentChannel.serverWindowSize += sshv2PDU.readInt();
        }
        break;
      }
      
      case SSH_MESSAGE.SSH_MSG_KEXINIT:{
        sessionData.isKeyExchanging = true;
        
        if (sessionData.expectedReplyMsgCode){
          if (sessionData.expectedReplyMsgCode!=msgCode){
            if(traceBasic)console.log("SSH rekeying... ");
          }
        }
        sshv2PDU.readBytes(sessionData.serverCookie);
        if(traceCrypto) console.log("Server Cookie is " + sessionData.serverCookie.toString('hex'));
        var keyExchangeAlgorithms = sshv2PDU.readNameList() ;
        var serverHostKeyAlgorithms = sshv2PDU.readNameList();
 
        var clientToServerEncryptionAlgorithms = sshv2PDU.readNameList();
        var serverToClientEncryptionAlgorithms = sshv2PDU.readNameList();
 
        var clientToServerMACAlgorithms = sshv2PDU.readNameList();
        var serverToClientMACAlgorithms = sshv2PDU.readNameList();
 
        var clientToServerCompressionAlgorithms = sshv2PDU.readNameList();
        var serverToClientCompressionAlgorithms = sshv2PDU.readNameList();

        var clientToServerLanguages = sshv2PDU.readNameList();
        var serverToClientLanguages = sshv2PDU.readNameList();
   
        var serverFirstKexPacketFollows = sshv2PDU.readByte();
        if (traceCrypto) console.log("serverFirstKexPacketFollows " + serverFirstKexPacketFollows);
        var reservedParam = sshv2PDU.readInt();
        sessionData.keyExchangePayload = sshv2PDU.data;
     
        var clientKexPDU = makeKeyExchangeResponse(sessionData,keyExchangeAlgorithms,
                   serverHostKeyAlgorithms,
                   clientToServerEncryptionAlgorithms,
                   serverToClientEncryptionAlgorithms,
                   clientToServerMACAlgorithms,
                   serverToClientMACAlgorithms,
                   clientToServerCompressionAlgorithms,
                   serverToClientCompressionAlgorithms);

        if (!sessionData.isKeyExchangingInitSent){
          sessionData.clientKexPayload = clientKexPDU.data;
          writeSSHv2PDU(function(buffer) {terminalWebsocketProxy.netSend(buffer);},sessionData,clientKexPDU);
          sessionData.isKeyExchangingInitSent = true;
        }
        var dh;
        var msgCodeBuffer = new Buffer(1);
        var hashAlgorithem = 'sha1';
        switch (sessionData.keyExchangeAlgorithms[0]) {
          case 'diffie-hellman-group1-sha1':  
            dh=crypto.getDiffieHellman('modp2');
           
            sessionData.expectedReplyMsgCode = SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_GROUP;
            sessionData.sentMsgCode=SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REQUEST_OLD;
            break;
          case 'diffie-hellman-group14-sha1':
            dh=crypto.getDiffieHellman('modp14');
          
            sessionData.expectedReplyMsgCode = SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_GROUP;
            sessionData.sentMsgCode=SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REQUEST_OLD;
            break;  
          case 'diffie-hellman-group-exchange-sha256':
            hashAlgorithem = 'sha256';
          case 'diffie-hellman-group-exchange-sha1':          
            msgCodeBuffer.writeUInt8(SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REQUEST);
            // 1024, modp2,Minimal size in bits of an acceptable group
            // 4096, modp16,Preferred size in bits of the group the server will send
            // 8192, modp18 Maximal size in bits of an acceptable group, 
            var argsArray = [msgCodeBuffer,Min_N_Max[0],Min_N_Max[1],Min_N_Max[2]];       
            var dhGroupRequestPDU = new SSHv2PDU(SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REQUEST,generateSSHv2PDUBytes(argsArray)); 
            sessionData.expectedReplyMsgCode = SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_GROUP;
            sessionData.sentMsgCode=SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REQUEST;
            writeSSHv2PDU(function(buffer) {terminalWebsocketProxy.netSend(buffer);},sessionData,dhGroupRequestPDU);
            break;
        }
        
        sessionData.hashAlgorithem=hashAlgorithem;
        sessionData.hash = crypto.createHash(hashAlgorithem);
         
        if (dh){ 
          dh.generateKeys();     
          var publicKeys = dh.getPublicKey();
          
          var idx = 0;
          var len = publicKeys.length;
          /*
          mpint
          Represents multiple precision integers in two's complement format,
          stored as a string, 8 bits per byte, MSB first.  Negative numbers
          have the value 1 as the most significant bit of the first byte of
          the data partition.  If the most significant bit would be set for
          a positive number, the number MUST be preceded by a zero byte.
          Unnecessary leading bytes with the value 0 or 255 MUST NOT be
          included.  The value zero MUST be stored as a string with zero
          bytes of data.
          */
          while (publicKeys[idx] === 0x00) {
            ++idx;
            --len;
          }
          if (publicKeys[idx] & 0x80) {
            var tempkey = new Buffer(len + 1);
            tempkey[0] = 0;
            publicKeys.copy(tempkey, 1, idx);
            publicKeys = tempkey;
          }
          
     
          if (traceCrypto) console.log("SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REQUEST_OLD, publicKeys: " + publicKeys.toString('hex'));
          msgCodeBuffer.writeUInt8(SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REQUEST_OLD);
          var keyLength = new Number (publicKeys.length);
          var kexInitPDUData = [msgCodeBuffer,keyLength,publicKeys];
          var kexInitPDU = new SSHv2PDU(SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REQUEST_OLD,generateSSHv2PDUBytes(kexInitPDUData));
          writeSSHv2PDU(function(buffer) {terminalWebsocketProxy.netSend(buffer);},sessionData,kexInitPDU);
          sessionData.dh = dh;
          sessionData.e=publicKeys;
        }
        break;
      }
      
      case SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_GROUP:{
        if (sessionData.expectedReplyMsgCode){
          if (sessionData.expectedReplyMsgCode!=msgCode){
            //DISCONNECT_ERROR
            return returnError('Unexpected reply message code SSH_MSG_KEX_DH_GEX_GROUP ('+msgCode+'). Expected='+sessionData.expectedReplyMsgCode);
          }
        }
        if (sessionData.sentMsgCode==SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REQUEST){
          sessionData.prime =  sshv2PDU.readSizedData();
          sessionData.generator = sshv2PDU.readSizedData();     
          var dh = crypto.createDiffieHellman(sessionData.prime,sessionData.generator);
          sessionData.expectedReplyMsgCode = SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REPLY;
          var msgCodeBuffer = new Buffer(1);
          msgCodeBuffer.writeUInt8(SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_INIT);
          dh.generateKeys();
          var publicKeys = dh.getPublicKey();
          
          var idx = 0;
          var len = publicKeys.length;
          while (publicKeys[idx] === 0x00) {
            ++idx;
            --len;
          }
          if (publicKeys[idx] & 0x80) {
            var tempkey = new Buffer(len + 1);
            tempkey[0] = 0;
            publicKeys.copy(tempkey, 1, idx);
            publicKeys = tempkey;
          }
          
          
          if (traceCrypto) console.log("SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REPLY, publicKeys: " + publicKeys.toString('hex'));

          sessionData.e=publicKeys;
          var keyLength = new Number (publicKeys.length);
          var kexInitPDUData = [msgCodeBuffer,keyLength,publicKeys];
          var kexInitPDU = new SSHv2PDU(SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_INIT,generateSSHv2PDUBytes(kexInitPDUData));
          writeSSHv2PDU(function(buffer) {terminalWebsocketProxy.netSend(buffer);},sessionData,kexInitPDU);
          sessionData.dh = dh;
          break;
        } else {
          sessionData.expectedReplyMsgCode=SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REPLY;
        }
      }
      case SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REPLY: {
        if (sessionData.expectedReplyMsgCode){
          if (sessionData.expectedReplyMsgCode!=SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REPLY){
            //DISCONNECT_ERROR
            return returnError('Unexpected reply message code SSH_MSG_KEX_DH_GEX_REPLY ('+msgCode+'). Expected='+sessionData.expectedReplyMsgCode);
          }        
        }
     
        var hostKeyAndCertificates =  sshv2PDU.readSizedData();
        var hostKeyPseudoPDU = new SSHv2PDU(-1,hostKeyAndCertificates);
        
        if(traceCrypto) console.log("hostKeyAndCertificates:");
        
        if(traceCrypto) console.log(hostKeyAndCertificates.toString('hex')+"\n");
        
        var serverHostKeyAlgorithm = hostKeyPseudoPDU.readSizedData();
        if (serverHostKeyAlgorithm!=sessionData.serverHostKeyAlgorithms[0]){
          return;
          //DISCONNECT_ERROR
        }
        sessionData.hostKey = hostKeyPseudoPDU.getRemainingBytes();
        sessionData.hostKeyPseudoPayload=hostKeyAndCertificates;
        sessionData.f =  sshv2PDU.readSizedData();
  
        var signature =  sshv2PDU.readSizedData();
        
        if(traceCrypto) console.log("signature:");
        
        if(traceCrypto) console.log( signature.toString('hex')+"\n");
        
        var signaturePDU = new SSHv2PDU(-1,signature);
        var sigFormat = signaturePDU.readSizedData();
      
   
        if (sessionData.dh){
          var sharedSecret = sessionData.dh.computeSecret(sessionData.f);
          if(sharedSecret){
            sessionData.k=sharedSecret;
          }
        }
        
        // compute H 
        var serverVersionLength = Buffer.byteLength(sessionData.serverVersion);
        var clientVersionLength = Buffer.byteLength(clientVersion);
        var clientKexLength = sessionData.clientKexPayload.length;
        var serverKexLength = sessionData.keyExchangePayload.length;
        var hostKeyLength = sessionData.hostKeyPseudoPayload.length;
        var clientPubKeyLength = sessionData.e.length;
        var serverPubKeyLength = sessionData.f.length;
        var secretlength = sessionData.k.length;

        var eIndex = 0;
        var fIndex = 0;
        var kIndex = 0;

        while (sessionData.e[eIndex] === 0x00) {
          ++eIndex;
          --clientPubKeyLength;
        }
        while (sessionData.f[fIndex] === 0x00) {
          ++fIndex;
          --serverPubKeyLength;
        }
        while (sessionData.k[kIndex] === 0x00) {
          ++kIndex;
          --secretlength;
        }
        if (sessionData.e[eIndex] & 0x80)
          ++clientPubKeyLength;
        if (sessionData.f[fIndex] & 0x80)
          ++serverPubKeyLength;
        if (sessionData.k[kIndex] & 0x80)
          ++secretlength;
       
        
        var exchangeBufferLength = serverVersionLength
                       + clientVersionLength
                       + clientKexLength
                       + serverKexLength
                       + hostKeyLength
                       + clientPubKeyLength
                       + serverPubKeyLength
                       + secretlength
                       + (4 * 8); //  8 4-byte integers
        
        
        var primeLength;
        var generatorLength;
        var sessionPrime;
        var sessionGenerator; 
        var primeIndex = 0;
        var generatorIndex = 0;
        
        if (sessionData.prime) {            
          sessionPrime = sessionData.prime;
          sessionGenerator = sessionData.generator;
          primeLength = sessionPrime.length;
          generatorLength = sessionGenerator.length;
           while (sessionPrime[primeIndex] === 0x00) {
            ++primeIndex;
            --primeLength;
          } 
           while (sessionGenerator[generatorIndex] === 0x00) {
            ++generatorIndex;
            --generatorLength;
          } 
           if (sessionPrime[primeIndex] & 0x80)
            ++primeLength;
          if (sessionGenerator[generatorIndex] & 0x80)
            ++generatorLength; 
          exchangeBufferLength += (4 * 3); // min, n, max values
          exchangeBufferLength += (4 * 2); // prime, generator length fields
          exchangeBufferLength += primeLength;
          exchangeBufferLength += generatorLength;
        }


        var cp = 0;
        var exchangeDataBuffer = new Buffer(exchangeBufferLength);

        exchangeDataBuffer.writeUInt32BE(clientVersionLength, cp, true);
        cp += 4;
        exchangeDataBuffer.write(clientVersion, cp, 'utf8'); // V_C
        cp += clientVersionLength;
        if(traceCrypto) console.log("clientVersionLength = "+clientVersionLength);

        exchangeDataBuffer.writeUInt32BE(serverVersionLength, cp, true);
        cp += 4;
        sessionData.serverVersion.copy(exchangeDataBuffer, cp); // V_S
        cp += serverVersionLength;
        if(traceCrypto) console.log("serverVersionLength = "+serverVersionLength);

        exchangeDataBuffer.writeUInt32BE(clientKexLength, cp, true);
        if(traceCrypto) console.log("clientKexLength = "+clientKexLength);

        cp += 4;
        sessionData.clientKexPayload.copy(exchangeDataBuffer, cp); // I_C
        cp += clientKexLength;
        sessionData.clientKexPayload = undefined;

        exchangeDataBuffer.writeUInt32BE(serverKexLength, cp, true);
        cp += 4;
        sessionData.keyExchangePayload.copy(exchangeDataBuffer, cp); // I_S
        cp += serverKexLength;
        sessionData.keyExchangePayload = undefined;
        if(traceCrypto) console.log("serverKexLength = "+serverKexLength);

   
        exchangeDataBuffer.writeUInt32BE(hostKeyLength, cp, true);
        cp += 4;
        sessionData.hostKeyPseudoPayload.copy(exchangeDataBuffer, cp); // K_S
        cp += hostKeyLength;
        if(traceCrypto) console.log("hostKeyLength = "+hostKeyLength);

        if (sessionPrime) {
          exchangeDataBuffer.writeUInt32BE(Min_N_Max[0],cp);
          cp += 4;
          exchangeDataBuffer.writeUInt32BE(Min_N_Max[1],cp);
          cp += 4;
          exchangeDataBuffer.writeUInt32BE(Min_N_Max[2],cp);
          cp += 4;
   

          exchangeDataBuffer.writeUInt32BE(primeLength, cp, true);
          cp += 4;
           if (sessionPrime[primeIndex] & 0x80)
             exchangeDataBuffer[cp++] = 0;
          sessionPrime.copy(exchangeDataBuffer, cp, primeIndex); // p
          cp += primeLength - (sessionPrime[primeIndex] & 0x80 ? 1 : 0);
                  if(traceCrypto) console.log("primeLength = "+primeLength);


          exchangeDataBuffer.writeUInt32BE(generatorLength, cp, true);
          cp += 4;
           if (sessionGenerator[generatorIndex] & 0x80)
             exchangeDataBuffer[cp++] = 0;
          sessionGenerator.copy(exchangeDataBuffer, cp, generatorIndex); // g
          cp += generatorLength - (sessionGenerator[generatorIndex] & 0x80 ? 1 : 0);
          if(traceCrypto) console.log("primeLength = "+primeLength);
        }

     
        exchangeDataBuffer.writeUInt32BE(clientPubKeyLength, cp, true);
        cp += 4;
        if ( sessionData.e[eIndex] & 0x80)
          exchangeDataBuffer[cp++] = 0;
        sessionData.e.copy(exchangeDataBuffer, cp, eIndex); 
        cp += clientPubKeyLength - (sessionData.e[eIndex] & 0x80 ? 1 : 0);

        exchangeDataBuffer.writeUInt32BE(serverPubKeyLength, cp, true);
        cp += 4;
        if (sessionData.f[fIndex] & 0x80)
          exchangeDataBuffer[cp++] = 0;
        sessionData.f.copy(exchangeDataBuffer, cp, fIndex); 
        cp += serverPubKeyLength - (sessionData.f[fIndex] & 0x80 ? 1 : 0);

        exchangeDataBuffer.writeUInt32BE(secretlength, cp, true);
        cp += 4;
        if (sessionData.k[kIndex] & 0x80)
          exchangeDataBuffer[cp++] = 0;
        sessionData.k.copy(exchangeDataBuffer, cp, kIndex); 

        if(traceCrypto) console.log("e: length = "+sessionData.e.length);
        if(traceCrypto) console.log( sessionData.e.toString('hex')+"\n");
        if(traceCrypto) console.log("f: length = "+sessionData.f.length);
        if(traceCrypto) console.log( sessionData.f.toString('hex')+"\n");
        if(traceCrypto) console.log("k: length = "+sessionData.k.length);
        if(traceCrypto) console.log( sessionData.k.toString('hex')+"\n");
        if(traceCrypto) console.log("exchangeDataBuffer:");
        if(traceCrypto) console.log( exchangeDataBuffer.toString('hex')+"\n");
        if(traceCrypto) console.log("exchangeDataBuffer length :");
        if(traceCrypto) console.log( exchangeDataBuffer.length+"\n");
        
        sessionData.h = sessionData.hash.update(exchangeDataBuffer).digest(); // the H
        if (sessionData.id == null){
          sessionData.id = sessionData.h;
        }
        if(traceCrypto) console.log("h:\n");
        if(traceCrypto) console.log( sessionData.h.toString('hex'));
        //compute new key .. complicated 
     
        //if(traceCrypto) console.log("getting SSH_MESSAGE.SSH_MSG_KEX_DH_GEX_REPLY");
        sessionData.expectedReplyMsgCode=SSH_MESSAGE.SSH_MSG_NEWKEYS;
        break;
      }
      

      case SSH_MESSAGE.SSH_MSG_NEWKEYS: {
        if (sessionData.expectedReplyMsgCode){
          if (sessionData.expectedReplyMsgCode!=SSH_MESSAGE.SSH_MSG_NEWKEYS){
            return returnError('Unexpected reply message code SSH_MSG_NEWKEYS ('+msgCode+'). Expected='+sessionData.expectedReplyMsgCode);
          }        
        }
                    
        var msgCodeBuffer = new Buffer(1);
        msgCodeBuffer.writeUInt8(SSH_MESSAGE.SSH_MSG_NEWKEYS);
        var clientNewKeyPDU = new SSHv2PDU(SSH_MESSAGE.SSH_MSG_NEWKEYS,generateSSHv2PDUBytes([msgCodeBuffer]));
        writeSSHv2PDU(function(buffer) {terminalWebsocketProxy.netSend(buffer);},sessionData,clientNewKeyPDU);
        initializeCrypto(sessionData);
        if(traceCrypto) console.log("new keys are used");

        if (sessionData.isKeyExchanging){
          sessionData.isKeyExchanging = false;
          sessionData.isKeyExchangingInitSent = false;
          if(traceBasic)console.log("SSH key exchanged finished... ");
          var pdu = sessionData.rekeyQueue.shift();
          while (pdu){
            writeSSHv2PDU(function(buffer) {terminalWebsocketProxy.netSend(buffer);},sessionData,pdu);
            pdu = sessionData.rekeyQueue.shift();
          }
        }
        
        if (!terminalWebsocketProxy.sshAuthenticated){
          msgCodeBuffer.writeUInt8(SSH_MESSAGE.SSH_MSG_SERVICE_REQUEST);
          var sshAuth = new Buffer('ssh-userauth');
          var authReqLength = sshAuth.length;
          var userauthRequestPDU = new SSHv2PDU(SSH_MESSAGE.SSH_MSG_SERVICE_REQUEST,generateSSHv2PDUBytes([msgCodeBuffer, new Number(authReqLength),sshAuth]));
     
          writeSSHv2PDU(function(buffer) {terminalWebsocketProxy.netSend(buffer);},sessionData,userauthRequestPDU);
          sessionData.expectedReplyMsgCode = SSH_MESSAGE.SSH_MSG_SERVICE_ACCEPT;
        } 
      
        break;
      }
      default :{
        if(traceBasic)console.log("unknown msgCode, something unimplemented "+ msgCode);
        break;
      }
     
    } 
    terminalWebsocketProxy.sshSessionData=sessionData;
  }
  if (traceCrypto) console.log('Done with socket read');
  return sshMessages;
};

function SSHSessionData(){
  this.serverCookie = new Buffer(16);
  this.clientCookie;
  this.serverVersion;
  this.incompletePacketBuffer;
  this.isFirstBlockDecrypted;
  this.sshMessageCode;
  this.isKeyExchanging = false;
  this.isKeyExchangingInitSent = false;
  this.rekeyQueue = [];
  // Shared Secret params
  //BigInteger prime, generator, e, f, x, k;
  this.h; // *THE* hash
  this.e;
  this.f;
  this.k;
  this.prime;
  this.generator;
  this.dh;
  this.hostKey;
  this.hash;
  this.hashAlgorithem;
  this.expectedReplyMsgCode;
  this.sentMsgCode;
  this.keyExchangePayload;
  this.clientKexPayload;
  this.hostKeyPseudoPayload;
  
  // The first of each of these arrays is the chosen algorithm for the session
  this.keyExchangeAlgorithms;
  this.serverHostKeyAlgorithms;
  this.clientToServerEncryptionAlgorithms;
  this.serverToClientEncryptionAlgorithms;
  this.clientToServerMACAlgorithms;
  this.serverToClientMACAlgorithms;
  this.clientToServerCompressionAlgorithms;
  this.serverToClientCompressionAlgorithms;
  
 
  this.id;
 
  this.readCipherBlockLength = 0;
  this.writeCipherBlockLength = 0;
  this.decryptCipher;
  this.encryptCipher;
  this.readingMACLength = 0;
  this.writingMACLength = 0;
  this.writingMACAlgorithm;
  this.readingMACAlgorithm;
  this.writingMACKey;
  this.readingMACKey;
  this.messagesSent = 0;    // needed for computing MAC
  this.messagesReceived = 0; // needed for verifying MAC
  
  this.highestChannel = 1;
  this.channels = new Array();
  this.primaryShellChannel;
  
}

function VarData(varData){
  this.data = varData;
}

function SSHv2PDU(messageCode,payload){
  this.msgCode=messageCode;
  this.data = payload;
  this.offset = 0;
}

SSHv2PDU.prototype.readByte = function (){
  var currentOffset = this.offset;
  var payload = this.data;
  this.offset++;
  return payload[currentOffset];
}

SSHv2PDU.prototype.readInt = function (){
  var currentOffset = this.offset;
  var payload = this.data;
  var res = payload.readUInt32BE(currentOffset);
  this.offset+=4;
  return res;
}

SSHv2PDU.prototype.getRemainingBytes = function (){
  var currentOffset = this.offset;
  var payload = this.data;
  var remaining = new Buffer(payload.length-currentOffset);
  payload.copy(remaining,0,currentOffset);
  return remaining;
}

// read data format, [length][data], where first four bytes is length to be read.
SSHv2PDU.prototype.readSizedData = function (){
  var currentOffset = this.offset;
  var payload = this.data;
  var length = payload.readUInt32BE(currentOffset);
  var res = new Buffer(length);
  payload.copy(res,0,currentOffset+4,currentOffset+length+4);
  this.offset+= (length+4);
  return res;
}


SSHv2PDU.prototype.readNameList = function (){
  var payload = this.data;
  var currentOffset = this.offset;
  var size = payload.readUInt32BE(currentOffset);
  var kexNames = new Buffer(size);
  payload.copy(kexNames,0,currentOffset+4);
 
  var commaSeparatedNames = kexNames.toString('ascii');
  var res = commaSeparatedNames.split(',');
  this.offset+= (size+4);
  return res;
}


SSHv2PDU.prototype.readBytes = function (buffer){
  var payload = this.data;
  var currentOffset = this.offset;
  payload.copy(buffer,0,currentOffset);
  this.offset+=buffer.length;
}

function SSH2ChannelData(channelNumber,peerChannelNumber,initialWindowSize,maxPacketSize,peerWindowSize,peerMaxPacketSize,isSecondShellRequest){
  this.clientChannelNumber = channelNumber;
  this.serverChannelNumber = peerChannelNumber;
  this.clientWindowSize = initialWindowSize ;
  this.clientMaxPacketSize = maxPacketSize;
  this.serverWindowSize = peerWindowSize;
  this.serverMaxPacketSize = peerMaxPacketSize;
  this.secondShellRequest = isSecondShellRequest;
}




function readSSHv2PDUData(sessionData,rawData,currentPosition){
 
  var computedMac = null;
  var readCipherBlockLength = sessionData.readCipherBlockLength;
  var decryptedData;
  var messageSequenceNumber = sessionData.messagesReceived; // needed for MAC computation

  if (sessionData.decryptCipher != null) {
    
    if(traceCrypto) console.log("decryption attempted...");
    
    var bytesRead=0;
    var firstBlock;
    
    var decryptedFirstBlock;
    if (sessionData.isFirstBlockDecrypted){
      if(traceCrypto) console.log("first block is already decrypted...");
      bytesRead = readCipherBlockLength;
      decryptedFirstBlock = rawData.slice(currentPosition,currentPosition+readCipherBlockLength);
      sessionData.isFirstBlockDecrypted = false;
    } else {
      if (rawData.length>readCipherBlockLength+currentPosition){
        bytesRead = readCipherBlockLength;
        firstBlock = rawData.slice(currentPosition,currentPosition+readCipherBlockLength);
      } else {
        bytesRead = rawData.length-currentPosition;
        sessionData.incompletePacketBuffer = new Buffer(bytesRead);
        rawData.copy(sessionData.incompletePacketBuffer,0,currentPosition);
        return {Continue: true};;
       
      }
  
      decryptedFirstBlock = sessionData.decryptCipher.update(firstBlock);
    }
    bytesRead-= 4;
 
    var packetLength = decryptedFirstBlock.readUInt32BE(0); 
    // sometimes it is larger than maxPacketSize, perhaps due to random padding; 50 tolerance was added here
    var maxSize = maxPacketSize + 4 + sessionData.readingMACLength+50; 
    if (packetLength > maxSize || packetLength < 0) {
      if(traceCrypto) console.log('incorrect decrypt packet length = '+packetLength);
      return;
    }
    var remainingPacketLengthInThisRawDataLength = rawData.length - currentPosition;
    if ((packetLength + sessionData.readingMACLength+4) > remainingPacketLengthInThisRawDataLength){  // sometimes the mac is incomplete, to combine with next packet
      if(traceCrypto) console.log('decrypt packet length large than remainning data , length of remainingPacketLengthInThisRawData = '+remainingPacketLengthInThisRawDataLength);
      sessionData.incompletePacketBuffer = new Buffer(remainingPacketLengthInThisRawDataLength);
      rawData.copy(sessionData.incompletePacketBuffer,0,currentPosition);
      decryptedFirstBlock.copy(sessionData.incompletePacketBuffer,0);
      return {Continue: true};;
    }
    

    
    if(traceCrypto) console.log('decrypt packet length ' +packetLength);
    var readDataLength = packetLength - bytesRead;//because we already read length and some bytes more, depend on readCipherBlockLength
  
    var encryptedBytesRead = 0;
    var encryptedData = new Buffer(readDataLength);
    
    
    if (readDataLength>0){
      rawData.copy(encryptedData,0,currentPosition+decryptedFirstBlock.length,currentPosition+decryptedFirstBlock.length+readDataLength);      
    }
    var remainingData = sessionData.decryptCipher.update(encryptedData);
    var computedMac;
    
    if (sessionData.readingMACAlgorithm != null) {
      computedMac = crypto.createHmac(SSH_TO_OPENSSL_TABLE[sessionData.readingMACAlgorithm], sessionData.readingMACKey);
      var seqNumberBuffer = new Buffer(4);
      seqNumberBuffer.writeUInt32BE(messageSequenceNumber, 0, true);  
      computedMac.update(seqNumberBuffer);
      computedMac.update(Buffer.concat([decryptedFirstBlock,remainingData]));
      computedMac = computedMac.digest();
      if (computedMac.length > sessionData.readingMACLength){
        computedMac = computedMac.slice(0,sessionData.readingMACLength);
      }
    }
 
    var decryptedDataPaddedLength = new Buffer (currentPosition);
    decryptedData  = Buffer.concat([decryptedDataPaddedLength,decryptedFirstBlock,remainingData]);
    
  } else {
    decryptedData = rawData;
    
  }
     
  var packetLength = decryptedData.readUInt32BE(currentPosition);
  currentPosition+=4;

  if (packetLength > rawData.length){
    // this only happens before key exchange, when kex init is incomplete. 
     sessionData.incompletePacketBuffer = new Buffer(rawData.length);
     rawData.copy(sessionData.incompletePacketBuffer,0,0);
     return {Continue: true};;
  }
  
  sessionData.messagesReceived++;
  if (sessionData.messagesReceived>MAX_SEQNO){
    sessionData.messagesReceived=0;
  }
  
  var paddingLength = decryptedData.readUInt8(currentPosition)&0xff;
  currentPosition+=1;
  var payloadLength = packetLength-(paddingLength+1); // +1 for the padding length byte
  var payload = new Buffer(payloadLength);
     
  decryptedData.copy(payload,0,currentPosition);
  currentPosition+=payloadLength+paddingLength;
  if (sessionData.readingMACAlgorithm) {
   
    var receivedMac = new Buffer(sessionData.readingMACLength);
    rawData.copy(receivedMac,0,currentPosition);
    currentPosition+=receivedMac.length;
    if (receivedMac.toString('hex')!=computedMac.toString('hex')){
      if(traceBasic)console.log("mac verification failed. ");
    }
    if(traceCrypto) console.log("received mac: "+receivedMac.toString('hex'));
    if(traceCrypto) console.log("computed mac: "+computedMac.toString('hex'));
      //should disconnect if not matching.
  }
  return  {readLength: currentPosition, sshv2PDU: new SSHv2PDU(0,payload)};
}


function writeSSHv2PDU(socketWriteFunction,sessionData, pdu) {
    
  var payload = pdu.data;

  var messageSequenceNumber = sessionData.messagesSent; // needed for MAC computation
  
  if(traceCrypto) console.log("messageSequenceNumber: "+messageSequenceNumber);
  
  sessionData.messagesSent++;
  if (sessionData.messagesSent>MAX_SEQNO){
    sessionData.messagesSent=0;
  }
  var lengthWithoutPadding = payload.length+5;
  var paddingModulus = Math.max(sessionData.writeCipherBlockLength,8);
  var paddingLength = paddingModulus - (lengthWithoutPadding % paddingModulus);
  if (paddingLength < 4){
    paddingLength += paddingModulus;
  }
     
  var padding = crypto.randomBytes(paddingLength);
  var data = new Array();
  var packetBuffer = new Buffer (payload.length+paddingLength+5);
     
 // if (sessionData.writingMACAlgorithm != null || sessionData.encryptCipher != null) {// implies encryption too
  //}
  
  var packetBufferOffset = packetBuffer.writeInt32BE(payload.length+paddingLength+1);
  packetBufferOffset = packetBuffer.writeUInt8(paddingLength,packetBufferOffset);
  packetBufferOffset += payload.copy(packetBuffer,packetBufferOffset);
  packetBufferOffset += padding.copy(packetBuffer,packetBufferOffset);
  var mac; 
    
  if (sessionData.writingMACAlgorithm != null || sessionData.encryptCipher != null) {// implies encryption too       
    if (sessionData.writingMACAlgorithm != null) {
      mac = crypto.createHmac(SSH_TO_OPENSSL_TABLE[sessionData.writingMACAlgorithm], sessionData.writingMACKey);
      var seqNumberBuffer = new Buffer(4);
      seqNumberBuffer.writeUInt32BE(messageSequenceNumber, 0, true);  
      mac.update(seqNumberBuffer);
      mac.update(packetBuffer);
      mac = mac.digest();
      if (mac.length > sessionData.writingMACLength){
        mac = mac.slice(0,sessionData.writingMACLength);
      }
    }
    
    if(traceCrypto) console.log("padding: ");
    if(traceCrypto) console.log(padding.toString('hex')+"\n");
    if(traceCrypto) console.log("payload: ");
    if(traceCrypto) console.log(payload.toString('hex')+"\n");
    if(traceCrypto) console.log("packetBufferLength: ");
    if(traceCrypto) console.log(packetBuffer.length+"\n");
    
    if (sessionData.encryptCipher != null) {
      packetBuffer = sessionData.encryptCipher.update(packetBuffer);
    } 

  }
  data.push(packetBuffer);
  if (mac != null){
    data.push(mac);
  } 
  
  socketWriteFunction(Buffer.concat(data));
}


function initializeCrypto(sessionData)  {
  
  var kData = sessionData.k;
  var bufPointer = 0;
  var index = 0;
  var sharedSecretlen = kData.length;
  while (kData[index] === 0x00) {
    ++index;
    --sharedSecretlen;
  }
  var secretlen = (kData[index] & 0x80 ? 1 : 0) + sharedSecretlen;
  var secretData = new Buffer(4 + secretlen);
  
  secretData.writeUInt32BE(secretlen, bufPointer, true);
  bufPointer= bufPointer+4;
  if (kData[index] & 0x80){
    secretData[bufPointer++] = 0;
  }
  kData.copy(secretData,bufPointer,index);
  
  var hashAlgorithm = sessionData.hashAlgorithem;
  var h = sessionData.h;
  var sessionID = sessionData.id;
  
 
   
  if (traceCrypto) console.log("secretData:\n "+secretData.toString('hex')+'\n');
  var clientToServerIVBlock;
  var clientToServerEncryptionKeyBlock;
  var serverToClientEncryptionKeyBlock;
  var serverToClientIVBlock;
  var blockLength = 8;
  var encryptionKeyLength= 0;
  
  var clientToServerEncryptionAlgorithm= sessionData.clientToServerEncryptionAlgorithms[0];
  var serverToClientEncryptionAlgorithm= sessionData.serverToClientEncryptionAlgorithms[0];
  var clientToServerMACAlgorithm= sessionData.clientToServerMACAlgorithms[0];
  var serverToClientMACAlgorithm= sessionData.serverToClientMACAlgorithms[0];
  sessionData.writingMACAlgorithm= clientToServerMACAlgorithm;
  sessionData.readingMACAlgorithm= serverToClientMACAlgorithm;
  switch (clientToServerEncryptionAlgorithm) {
    case 'aes256-cbc':
    case 'aes192-cbc':
    case 'aes128-cbc':
    case 'aes256-ctr':
    case 'aes192-ctr':
    case 'aes128-ctr':
      blockLength = 16;
  } 
  
  clientToServerIVBlock = generateKeyBlock(hashAlgorithm,secretData,h,'A',sessionID,blockLength);
 
  sessionData.writeCipherBlockLength = blockLength;
  
  if(traceCrypto) console.log("clientToServerIVBlock:");      
  if(traceCrypto) console.log( clientToServerIVBlock.toString('hex')+"\n");
  
  switch (clientToServerEncryptionAlgorithm) {
    case 'aes256-cbc':
    case 'aes256-ctr':
    case 'arcfour256':
      encryptionKeyLength = 32;
      break;
    case '3des-cbc':
    case '3des-ctr':
    case 'aes192-cbc':
    case 'aes192-ctr':
      encryptionKeyLength = 24;
      break;
 
    case 'aes128-cbc':
    case 'aes128-ctr':
    case 'cast128-cbc':
    case 'blowfish-cbc':
    case 'arcfour':
    case 'arcfour128':
      encryptionKeyLength = 16;
      break;
  }
  clientToServerEncryptionKeyBlock = generateKeyBlock(hashAlgorithm,secretData,h,'C',sessionID,encryptionKeyLength);
  if (traceCrypto) {
    console.log("hashAlgorithm:" +hashAlgorithm);
    console.log("clientToServerEncryptionAlgorithm:" +clientToServerEncryptionAlgorithm);

    console.log("clientToServerEncryptionKeyBlock:");
    console.log( clientToServerEncryptionKeyBlock.toString('hex')+"\n");
  }
  var cipherAlgo = SSH_TO_OPENSSL_TABLE[clientToServerEncryptionAlgorithm];
  if (traceCrypto) console.log("cipherAlgo:\n" + cipherAlgo );
  sessionData.encryptCipher = crypto.createCipheriv(cipherAlgo, clientToServerEncryptionKeyBlock, clientToServerIVBlock);
  sessionData.encryptCipher.setAutoPadding(false);
  
  
  //decryptCipher
  blockLength = 8;
  encryptionKeyLength = 0;
  switch (serverToClientEncryptionAlgorithm) {
    case 'aes256-cbc':
    case 'aes192-cbc':
    case 'aes128-cbc':
    case 'aes256-ctr':
    case 'aes192-ctr':
    case 'aes128-ctr':
      blockLength = 16;
  }
  serverToClientIVBlock = generateKeyBlock(hashAlgorithm,secretData,h,'B',sessionID,blockLength);
  sessionData.readCipherBlockLength = blockLength;     
  if (traceCrypto) {
    console.log("serverToClientIVBlock:");
    console.log( serverToClientIVBlock.toString('hex')+"\n");
  }
  switch (serverToClientEncryptionAlgorithm) {
 
    case 'aes256-cbc':
    case 'aes256-ctr':
    case 'arcfour256':
      encryptionKeyLength = 32;
      break;
    case '3des-cbc':
    case '3des-ctr':
    case 'aes192-cbc':
    case 'aes192-ctr':
      encryptionKeyLength = 24;
      break;
    case 'aes128-cbc':
    case 'aes128-ctr':
    case 'cast128-cbc':
    case 'blowfish-cbc':
    case 'arcfour':
    case 'arcfour128':
      encryptionKeyLength = 16;
      break;
  }
  serverToClientEncryptionKeyBlock = generateKeyBlock(hashAlgorithm,secretData,h,'D',sessionID,encryptionKeyLength);

  if (traceCrypto) {
    console.log("hashAlgorithm:" +hashAlgorithm);
    console.log("serverToClientEncryptionAlgorithm:" +serverToClientEncryptionAlgorithm);
    console.log("serverToClientEncryptionKeyBlock:");
    console.log( serverToClientEncryptionKeyBlock.toString('hex')+"\n");
  }
  var decipherAlgo = SSH_TO_OPENSSL_TABLE[serverToClientEncryptionAlgorithm];
  //sessionData.decryptCipher = crypto.createDecipheriv(cipherAlgo, clientToServerEncryptionKeyBlock, clientToServerIVBlock);
  sessionData.decryptCipher = crypto.createDecipheriv(decipherAlgo, serverToClientEncryptionKeyBlock, serverToClientIVBlock);
  sessionData.decryptCipher.setAutoPadding(false);
  if (traceCrypto) console.log("decipherAlgo:\n" + decipherAlgo );
  var arcfourBuffer;
  if (clientToServerEncryptionAlgorithm.substr(0, 7) === 'arcfour') {
    arcfourBuffer = new Buffer(1536);
    arcfourBuffer.fill(0);
    sessionData.encryptCipher.update(arcfourBuffer);
  }
  if (serverToClientEncryptionAlgorithm.substr(0, 7) === 'arcfour') {
    arcfourBuffer = new Buffer(1536);
    arcfourBuffer.fill(0);
    sessionData.decryptCipher.update(arcfourBuffer);
  }
  
  var createKeyLen = 0;
  var checkKeyLen = 0;
  switch (clientToServerMACAlgorithm) {
    case 'hmac-ripemd160':
    case 'hmac-sha1':
      createKeyLen = 20;
       
      sessionData.writingMACLength = 20;
      break;
    case 'hmac-sha1-96':
      createKeyLen = 20;
      sessionData.writingMACLength = 12;
      break;
    case 'hmac-sha2-256':
      createKeyLen = 32;
      sessionData.writingMACLength = 32;
      break;
    case 'hmac-sha2-256-96':
      createKeyLen = 32;
      sessionData.writingMACLength = 12;
      break;
    case 'hmac-sha2-512':
      createKeyLen = 64;
      sessionData.writingMACLength = 64;
      break;
    case 'hmac-sha2-512-96':
      createKeyLen = 64;
      sessionData.writingMACLength = 12;
      break;
    case 'hmac-md5':
      createKeyLen = 16;
      sessionData.writingMACLength = 16;
      break;
    case 'hmac-md5-96':
      createKeyLen = 16;
      sessionData.writingMACLength = 12;
      break;
  }
  switch (serverToClientMACAlgorithm) {
    case 'hmac-ripemd160':
    case 'hmac-sha1':
      checkKeyLen = 20;
      sessionData.readingMACLength = 20;
      break;
    case 'hmac-sha1-96':
      checkKeyLen = 20;
      sessionData.readingMACLength = 12;
      break;
    case 'hmac-sha2-256':
      checkKeyLen = 32;
      sessionData.readingMACLength = 32;
      break;
    case 'hmac-sha2-256-96':
      checkKeyLen = 32;
      sessionData.readingMACLength = 12;
      break;
    case 'hmac-sha2-512':
      checkKeyLen = 64;
      sessionData.readingMACLength = 64;
      break;
    case 'hmac-sha2-512-96':
      checkKeyLen = 64;
      sessionData.readingMACLength = 12;
      break;
    case 'hmac-md5':
      checkKeyLen = 16;
      sessionData.readingMACLength = 16;
      break;
    case 'hmac-md5-96':
      checkKeyLen = 16;
      sessionData.readingMACLength = 12;
      break;
  }
  if (traceCrypto) {
    console.log("clientToServerMACAlgorithm:" +clientToServerMACAlgorithm);
    console.log("serverToClientMACAlgorithm:" +serverToClientMACAlgorithm);
  }
  var clientToServerMACBlock = generateKeyBlock(hashAlgorithm,secretData,h,'E',sessionID,createKeyLen);
  var serverToClientMACBlock = generateKeyBlock(hashAlgorithm,secretData,h,'F',sessionID,checkKeyLen);          
 // secretData.h = undefined;
   
  sessionData.writingMACKey = new Buffer(sessionData.writingMACLength);
  clientToServerMACBlock.copy(sessionData.writingMACKey,0,0);
  sessionData.readingMACKey = new Buffer (sessionData.readingMACLength);
  serverToClientMACBlock.copy(sessionData.readingMACKey,0,0);
  if (traceCrypto) {
    console.log("sessionData.writingMACKey:");
    
    console.log( sessionData.writingMACKey.toString('hex')+"\n");
    console.log("sessionData.readingMACKey:");
    
    console.log( sessionData.readingMACKey.toString('hex')+"\n");
  }
  releaseImtermediateSessionData(sessionData);
}

function releaseImtermediateSessionData(sessionData){
  sessionData.keyExchangePayload=null;
  sessionData.clientKexPayload=null;
  sessionData.keyExchangeAlgorithms=null;
  sessionData.hostKeyPseudoPayload=null;
  sessionData.serverHostKeyAlgorithms=null;
  sessionData.clientToServerEncryptionAlgorithms=null;
  sessionData.serverToClientEncryptionAlgorithms=null;
  sessionData.clientToServerMACAlgorithms=null;
  sessionData.serverToClientMACAlgorithms=null;
  sessionData.clientToServerCompressionAlgorithms=null;
  sessionData.serverToClientCompressionAlgorithms=null;
}

function generateKeyBlock(hashAlgorithm,secretData,h,letter,sessionID,blockLength){
  var dataBlock = crypto.createHash(hashAlgorithm)
               .update(secretData)
               .update(h)
               .update(letter, 'ascii')
               .update(sessionID)
               .digest();
               
            
  while (blockLength > dataBlock.length) {
    dataBlock = Buffer.concat([dataBlock,
                        crypto.createHash(hashAlgorithm)
                              .update(secretData)
                              .update(h)
                              .update(dataBlock)
                              .digest()]);
  }
  dataBlock = dataBlock.slice(0, blockLength);
  return dataBlock;
}

 
function getAgreeableAlgorithms(clientSupportedAlgorithms,serverSupportedAlgorithms){
  if (serverSupportedAlgorithms == null){
    return clientSupportedAlgorithms;
  }
  var i = 0;
  var agreeableAlgorithems = [];
  for (i = 0, len = clientSupportedAlgorithms.length; i < len ;++i){
    var candidate = clientSupportedAlgorithms[i];
    if (serverSupportedAlgorithms.indexOf(candidate)!=-1){
      agreeableAlgorithems.push(candidate);
     
    }
  }
  if (agreeableAlgorithems.length==0){
    return undefined;
  }
  return agreeableAlgorithems;
}

function makeKeyExchangeResponse (sessionData,keyExchangeAlgorithms,
							   serverHostKeyAlgorithms,
							   clientToServerEncryptionAlgorithms,
							   serverToClientEncryptionAlgorithms,
							   clientToServerMACAlgorithms,
							   serverToClientMACAlgorithms,
							   clientToServerCompressionAlgorithms,
							   serverToClientCompressionAlgorithms)
{
  var agreeableKeyExchangeAlgorithms = getAgreeableAlgorithms(SUPPORTED_KEX,keyExchangeAlgorithms);
  if (!agreeableKeyExchangeAlgorithms){
    return undefined;
  }
  sessionData.keyExchangeAlgorithms=agreeableKeyExchangeAlgorithms;
  if(traceCrypto) console.log("agreeableKeyExchangeAlgorithms " + agreeableKeyExchangeAlgorithms);

  var agreeableServerHostKeyAlgorithms = getAgreeableAlgorithms(SUPPORTED_SERVER_HOST_KEY,serverHostKeyAlgorithms);
  if (!agreeableServerHostKeyAlgorithms){
    return undefined;
  }
  sessionData.serverHostKeyAlgorithms=agreeableServerHostKeyAlgorithms;
  if(traceCrypto) console.log("agreeableServerHostKeyAlgorithms " + agreeableServerHostKeyAlgorithms);

  var agreeableClientToServerEncryptionAlgorithms = getAgreeableAlgorithms(SUPPORTED_CIPHER,clientToServerEncryptionAlgorithms);
  if (!agreeableClientToServerEncryptionAlgorithms){
    return undefined;
  }
  sessionData.clientToServerEncryptionAlgorithms=agreeableClientToServerEncryptionAlgorithms;
  if(traceCrypto) console.log("agreeableClientToServerEncryptionAlgorithms " + agreeableClientToServerEncryptionAlgorithms);

  var agreeableServerToClientEncryptionAlgorithms = getAgreeableAlgorithms(SUPPORTED_CIPHER,serverToClientEncryptionAlgorithms);
  if (!agreeableServerToClientEncryptionAlgorithms){
    return undefined;
  }
 
  sessionData.serverToClientEncryptionAlgorithms=agreeableServerToClientEncryptionAlgorithms;
  if(traceCrypto) console.log("agreeableServerToClientEncryptionAlgorithms " + agreeableServerToClientEncryptionAlgorithms);

  var agreeableClientToServerMACAlgorithms = getAgreeableAlgorithms(SUPPORTED_HMAC,clientToServerMACAlgorithms);
  if (!agreeableClientToServerMACAlgorithms){
    return undefined;
  }
  sessionData.clientToServerMACAlgorithms=agreeableClientToServerMACAlgorithms;
  if(traceCrypto) console.log("agreeableClientToServerMACAlgorithms " + agreeableClientToServerMACAlgorithms);

  var agreeableServerToClientMACAlgorithms = getAgreeableAlgorithms(SUPPORTED_HMAC,serverToClientMACAlgorithms);
  if (!agreeableServerToClientMACAlgorithms){
    return undefined;
  }
  sessionData.serverToClientMACAlgorithms=agreeableServerToClientMACAlgorithms;
  if(traceCrypto) console.log("agreeableServerToClientMACAlgorithms " + agreeableServerToClientMACAlgorithms);

  var agreeableClientToServerCompressionAlgorithms = getAgreeableAlgorithms(SUPPORTED_COMPRESS,clientToServerCompressionAlgorithms);
  if (!agreeableClientToServerCompressionAlgorithms){
    return undefined;
  }
  sessionData.clientToServerCompressionAlgorithms=agreeableClientToServerCompressionAlgorithms;
  
  var agreeableServerToClientCompressionAlgorithms = getAgreeableAlgorithms(SUPPORTED_COMPRESS,serverToClientCompressionAlgorithms);
  if (!agreeableServerToClientCompressionAlgorithms){
    return undefined;
  }
  sessionData.serverToClientCompressionAlgorithms=agreeableServerToClientCompressionAlgorithms;
 
  var clientCookie = crypto.randomBytes(16);
  sessionData.clientCookie = clientCookie;
 
  var msgCodeBuffer = new Buffer(1);
  msgCodeBuffer.writeUInt8(SSH_MESSAGE.SSH_MSG_KEXINIT);
  var empty =[];
  
  var payloadArray = [
  msgCodeBuffer,
  clientCookie,
  agreeableKeyExchangeAlgorithms,
  agreeableServerHostKeyAlgorithms,
  agreeableClientToServerEncryptionAlgorithms,
	agreeableServerToClientEncryptionAlgorithms,
	agreeableClientToServerMACAlgorithms,
  agreeableServerToClientMACAlgorithms,
	agreeableClientToServerCompressionAlgorithms,
	agreeableServerToClientCompressionAlgorithms,
  empty,
  empty,
  new Boolean(false),
  new Number (0)
  ];
  var payload = generateSSHv2PDUBytes(payloadArray);
  return new SSHv2PDU(SSH_MESSAGE.SSH_MSG_KEXINIT,payload);  
 
}


function generateSSHv2PDUBytes(argsArray){
  var bufferArray = new Array();
  
  for(var i = 0; i < argsArray.length; i ++){
    var object = argsArray[i];
    var objectBuffer;
    
    if (object instanceof Number || (typeof object == 'number')){
          //four bytes
      var objectBuffer = new Buffer(4);
      objectBuffer.writeInt32BE(object);
  
    } else if (object instanceof Array){
      var stringList = new Array();
      for (var j=0;j<object.length;j++){
        var string = object[j];
        if (j>0){
          stringList.push(Buffer.from(','));
        }
        stringList.push(Buffer.from(string));
      }
      var concatedStringBuffer = Buffer.concat(stringList);
      objectBuffer = new Buffer (concatedStringBuffer.length+4);
      objectBuffer.writeInt32BE(concatedStringBuffer.length);
      concatedStringBuffer.copy(objectBuffer,4);
    } else if (object instanceof Buffer){
      objectBuffer = Buffer.from(object);   
    } else if (object instanceof Boolean || (typeof object == 'boolean')){
      var objectBuffer = new Buffer(1);
      objectBuffer.writeUInt8(object);      
    } else if (object instanceof VarData){
      var varLength = object.data ? object.data.length : 0;
      var objectBuffer = new Buffer(4+varLength);
      objectBuffer.writeInt32BE(varLength);
      if (varLength) { object.data.copy(objectBuffer,4); }
    } else if (typeof object == 'string') {
      var varLength = object ? object.length : 0;
      var objectBuffer = new Buffer(4+varLength);
      objectBuffer.writeInt32BE(varLength);
      if (varLength) { objectBuffer.write(object,4); }
    }
    bufferArray.push(objectBuffer);    
  }
  return Buffer.concat(bufferArray);
}



/*
  This program and the accompanying materials are
  made available under the terms of the Eclipse Public License v2.0 which accompanies
  this distribution, and is available at https://www.eclipse.org/legal/epl-v20.html
  
  SPDX-License-Identifier: EPL-2.0
  
  Copyright Contributors to the Zowe Project.
*/