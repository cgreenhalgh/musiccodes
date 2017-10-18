# security - some notes

## issues

chrome restricts access to devices (web cam, audio, midi) to localhost/127.0.x.x or HTTPS connections.

## SSL notes

[1](https://datacenteroverlords.com/2012/03/01/creating-your-own-ssl-certificate-authority/)
[1](http://blog.endpoint.com/2014/10/openssl-csr-with-alternative-names-one.html)

let's make a custom CA...
```
mkdir certs crl newcerts private
chmod 700 private
touch index.txt
echo 1000 > serial
```
openssl.cfg:
```
[ ca ]
# `man ca`
default_ca = CA_default

[ CA_default ]
policy = policy_strict
private_key       = rootCA.key
certificate       = rootCA.pem
dir               = /home/vagrant/ssl
certs             = $dir/certs
crl_dir           = $dir/crl
new_certs_dir     = $dir/newcerts
database          = $dir/index.txt
serial            = $dir/serial
RANDFILE          = $dir/private/.rand

copy_extensions = copy

[ policy_strict ]
countryName             = match
stateOrProvinceName     = match
organizationName        = match
organizationalUnitName  = optional
commonName              = supplied
emailAddress            = optional

[ req ]
# Options for the `req` tool (`man req`).
default_bits        = 2048
distinguished_name  = req_distinguished_name
string_mask         = utf8only

# SHA-1 is deprecated, so use SHA-2 instead.
default_md          = sha256

# Extension to add when the -x509 option is used.
x509_extensions     = v3_ca

[ req_distinguished_name ]
# See <https://en.wikipedia.org/wiki/Certificate_signing_request>.
countryName                     = Country Name (2 letter code)
stateOrProvinceName             = State or Province Name
localityName                    = Locality Name
0.organizationName              = Organization Name
organizationalUnitName          = Organizational Unit Name
commonName                      = Common Name
emailAddress                    = Email Address

# Optionally, specify some defaults.
countryName_default             = UK
stateOrProvinceName_default     = Nottinghamshire
localityName_default            = Nottingham
0.organizationName_default      = Muzicodes
organizationalUnitName_default  = Muzicodes on MYMACHINE
emailAddress_default            = none@example.com

[ v3_ca ]
# Extensions for a typical CA (`man x509v3_config`).
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid:always,issuer
basicConstraints = critical, CA:true, pathlen:0
keyUsage = critical, digitalSignature, cRLSign, keyCertSign

[ server_cert ]
# Extensions for server certificates (`man x509v3_config`).
basicConstraints = CA:FALSE
nsCertType = server
nsComment = "OpenSSL Generated Server Certificate"
subjectKeyIdentifier = hash
authorityKeyIdentifier = keyid,issuer:always
keyUsage = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[ crl_ext ]


```

```
mkdir ssl
cd ssl
openssl genrsa -out rootCA.key 2048
openssl req -x509 -new -nodes -key rootCA.key -sha256 -days 1024 -out rootCA.pem -config openssl.cfg -extensions v3_ca
```
enter required info..., e.g. 'UK', 'Nottinghamshire', 'Nottingham', 'University of Nottingham', 'Muzicodes', 'Muzicodes on MYMACHINE', 'nonesuch@example.com'

check...
```
openssl x509 -noout -text -in rootCA.pem
openssl x509 -outform der -in rootCA.pem -out rootCA.crt
```
Copy rootCA.pem and install. E.g. in windows install under Trusted Root Certification Authorities.
 
Now let's make a key for the server...
```
openssl genrsa -out muzicodes.key 2048
```

And a certificate for its current IP address, and sign it...
muzicodes.config:
```
[req]
prompt = no
default_md = sha256
req_extensions = req_ext
distinguished_name = dn
string_mask         = utf8only
 
[ dn ]
countryName             = UK
stateOrProvinceName     = Nottinghamshire
localityName            = Nottingham
0.organizationName      = Muzicodes
organizationalUnitName  = Muzicodes on MYMACHINE
#C=UK
#ST=Nottinghamshire
#L=Nottingham
#O=Muzicodes
#OU=Muzicodes on MYMACHINE
emailAddress=none@example.com
CN = 127.243.22.74
 
[ req_ext ]
subjectAltName = @alt_names
 
[ alt_names ]
IP.1 = 128.243.22.74
#DNS.1 = 128.243.22.74
```

```
openssl req -new -key muzicodes.key -out muzicodes.csr -config muzicodes.config
openssl req -noout -text -in muzicodes.csr
```
sign
```
openssl x509 -req -in muzicodes.csr -CA rootCA.pem -CAkey rootCA.key -CAcreateserial -out muzicodes.crt -days 500 -sha256
openssl ca -config openssl.cfg -extensions server_cert -days 500 -md sha256 -in muzicodes.csr -out muzicodes.crt 
openssl x509 -noout -text -in muzicodes.crt
```

## node.js / express

[1](https://stackoverflow.com/questions/11744975/enabling-https-on-express-js)
