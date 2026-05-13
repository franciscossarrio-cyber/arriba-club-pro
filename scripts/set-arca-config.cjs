/**
 * Guarda la configuración ARCA en Firestore (config/arca).
 * Ejecutar con: node scripts/set-arca-config.js
 */
const { initializeApp, cert: adminCert, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ credential: applicationDefault() });

const db = getFirestore();

const CERT = `-----BEGIN CERTIFICATE-----
MIIDQjCCAiqgAwIBAgIIeWd3dk/MjSMwDQYJKoZIhvcNAQENBQAwMzEVMBMGA1UEAwwMQ29tcHV0
YWRvcmVzMQ0wCwYDVQQKDARBRklQMQswCQYDVQQGEwJBUjAeFw0yNjA1MTExNDAwNDRaFw0yODA1
MTAxNDAwNDRaMC0xEDAOBgNVBAMMB2ZyYW5hcHAxGTAXBgNVBAUTEENVSVQgMzA3MTc2MjgyNjQw
ggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCbXKf3YgtPVPGCsi2cmPxcYewp8qTTVb+U
Swi56fGwSsnZiuT6T+kRVLzqH4K2mAZ70UUGAMxLZsA5dRkhgBCgZpsi8yQ4/jHX1mUqyRBxfPA9
KQ0XQpnGqqtYwL1pVZJtXZkmPmmvRcP7rcyNhP58Q9gM+Frk98rWQyd9ZBnVmlcWZe040KZWYyR5
pbjM+jPcZB12LBcyhj94Z5pbfUjQNo3yzvZJQ2GaZjKN9KVFUOKFe6GcwQKxgUrsqyT+OTVc2sOR
V3mtbrCdPPE1jZOA4SgnXWT8eH22H0dz5Q+T/UtaJjPwyKrNsj2wE+Ga5OABG1Hp8O+KYmPM/vnQ
MdB1AgMBAAGjYDBeMAwGA1UdEwEB/wQCMAAwHwYDVR0jBBgwFoAUKw0vyN9h/QjJThHQNZMEbY5b
0G4wHQYDVR0OBBYEFPGgpRRzogHrkNo1/RLSZk7Y+sBfMA4GA1UdDwEB/wQEAwIF4DANBgkqhkiG
9w0BAQ0FAAOCAQEAfddulxXJFN6nB7uBviSWpY3+nXI49rdc32uDvnIHqKdVytj1RVoM2UGUxmEn
HqUyE7KCvKmoZy/8/25ixyTDU/Jst3LV4DUY5+oNmdYynxov5eHZih7ShICSr5pOf/mzqhmNJEjq
vkzAEfUMfJHhBM6pUmegt/u8cG/QGmYdWzFPrIMzDtjfkrB8DtwC7wQRFyisoUg/AJxAaXeJhRMo
A4cDO036N3jN3VQQ2U3+bNkI6jgQjEi5uYvnzl0PyPPZbL1qpRF40RTYhg3brCzH2oxfR2kOcoX9
2jdXOAGWpqvrVK3cGhTMPfin1Hw6aW7LuOxdYnMCkGXIQ9cNYMr90w==
-----END CERTIFICATE-----`;

const KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA2so/so7laW7dubyY8kmAz+TpFW2yR7qgo07KA+ichAE/xDcN
3Vd8sfkUDPny5GFbwoOYfpbBxUDOWB3BreRdNMzqIfdOzDYZwOckI0xFOmguoRpL
sGSDq60XuK9XUKL536o/wsAOjeczlLLzFEv5gFvi1MnMc8OcQETHvHlpS+g0OGCr
5fn+WE4YjgjNIgkXkQfzL7wNKZY3spTjZQ+W8+LWFVr4Slap5zqoS9nI/2p31mFv
HHBJQftF9Zv6JYzZO0OSl/veBK9n5BVizNtKEZucMWHuHRKj7eTFXrWplJFmMOOi
KGQkzU9t02Rtu/yLghR9s2JV0UYzZSBr2L/tbQIDAQABAoIBACJZxbVxpQgwLWS3
fSXxL2W0kXnZTrffT9BEEwiZEVXSYmIaqLUbQssoiaLd7Wo49PCtu5gIcGTZX2xL
Q7jbFV0wXQQ3MWpzhgiY4b4e//GDIOsPV1na9idSllpbQTC6XdPlhXw8rixOY/VR
QUPrB8HE63CwPEbiq9oVUmy/fS46/QBNLj2nHdai/9bop1H3YvcyaQ6+fewyBZUn
e9ITVjm2cGTQj3rqRwHaGyDlnB2AB98nFB6IXF8cnC3vkpXTEEy3bgx3RvaOdU0l
Pc1ojbBFGEJHiZdTHhdPkfN4aITkxyAqstF4MzK5dew0Ss+Nj+mCbxOBjJkAtqeK
xKfJwcECgYEA8NZ7itoWgGBWnv9r7UV2/CxA2p6fHjcpwqTwLqMWKcvSvgPFaJrw
CILNPUJVoZmLE/b4riEZhol+hSPlYNcdx3NGCRGckpXd6fSLyqw64938PNEDOayG
gwjoyNzqu6xQxx3tnCrTDjO0KLtcec163okzJx37LnFeOSOY12UcLeECgYEA6JBt
lLdpvknzDyxzMfljhXqQIVulLt7rWXHh1hH4n2y9QRn7dhjShfi7kNqy9v3fKC6A
yxe2+RI0PxUrHDBTYA7t4ZoLQ9+jLo3oiV663mzG1MMcN4v8CiTL/KFhif7C3cW5
7UGAGoubk8WcklHkTL9/u58nFf6uTWws5ppquQ0CgYEAsPn7uPI//MBOhvJNPgOA
xxhB5CUR6mNA9b68nJjNbZNQ3r7ortDEOIzeAvke8exhzh77aQH7vuiEp5PUOBB7
2pfzzDA77V/hvc0teJaNg+sZMxuokhYclmfSn9/vQlAC3/83Hz4877/A0Pm1n/AG
LUeG5mTasqsuQTDOXOH5DiECgYBP9Pf33WdZqQsL+HhSgi+ZQJ41GdEc4D+CLQk8
FEmqZjRbIZe27qnSrcWu88H78SS8J+DX8ntR/tQ/rAN6WZMQv5FBsziUSVtNMjT0
pcERn8xscfhNkK9CvYv0e3eRfil5HfXigFaOydjfYV2HYOhhCqXb18gUY8+BhuOZ
FRYEMQKBgQDa4DI4OjJwHt0H42uRCO/dcdifHaYE4do9dyxQxmwRiKOHfEsHQmcH
TjCZACdGHSn6CE5b4Rv2f5Y3x+fmwoOueX019Tg0qZVgl23hrSSY/IpiXxeU/fi5
KIFU1+FjMKc/PcU2sszr3El36ZL/yFDtzqnggp4yEag0vmH+VuIFAg==
-----END RSA PRIVATE KEY-----`;

async function main() {
  await db.doc('config/arca').set({
    cuit:       '30717628264',
    ptoVta:     2,
    cert:       CERT,
    key:        KEY,
    production: false,
  }, { merge: true });

  console.log('✓ config/arca guardado en Firestore');
  console.log('  CUIT:    30717628264');
  console.log('  PtoVta:  2');
  console.log('  Cert:    ✓ (franapp_796777764fcc8d23.crt)');
  console.log('  Key:     ✓ (arenagroup.key)');
  console.log('  Modo:    homologación (production: false)');
}

main().catch(console.error).finally(() => process.exit());
