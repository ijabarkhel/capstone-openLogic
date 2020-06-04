#!/bin/bash
function errorConfirm {
    echo -e "$1"
    if [[ -z $2 ]]; then
        echo "Continue anyways?"
    else
        echo "$2"
    fi

    select CONFIRM in "Yes" "No"; do
        case $CONFIRM in
            "Yes")
                echo "Continuing."
                return 0
                ;;
            *)
                echo "Exiting."
                exit 1
                ;;
        esac
    done
}

function check_command {
    command -v $1 >/dev/null 2>&1
}

function check_privileges {
    if [[ $EUID -ne 0 ]]; then
        echo "This script must be run as root."
        exit 1
    fi
}
check_privileges

# Check dependencies before running the script
function check_dependencies {
    local MISSING_DEPS=''

    check_command host || MISSING_DEPS="$MISSING_DEPS host"

    check_command curl || MISSING_DEPS="$MISSING_DEPS curl"

    check_command whois || MISSING_DEPS="$MISSING_DEPS whois"

    check_command awk || MISSING_DEPS="$MISSING_DEPS gawk"

    check_command openssl || MISSING_DEPS="$MISSING_DEPS openssl"
    if [[ -z "$MISSING_DEPS" ]]; then
        return 0
    fi

    echo "This script requires some additional software to run."
    errorConfirm "May I run the following command to install the dependencies?" "    apt install $MISSING_DEPS"
    apt update && apt install $MISSING_DEPS
}
check_dependencies

# GET the contents of a URL using either curl or wget
function getUrl {
    check_command curl
    if [[ $? -eq 0 ]]; then
        timeout 5 curl "$1" 2>/dev/null
        return
    fi

    check_command wget
    if [[ $? -eq 0 ]]; then
        timeout 5 wget -qO- "$1" 2>/dev/null
        return
    fi

    echo "Please install either curl or wget to run this script."
    echo "Try: apt install curl"
    exit 1
}

# Set LOCAL_IP to the local IP address(es)
function getInternalIP {
    LOCAL_IP=$(hostname -I)

    NUM_IPS=$(echo "$LOCAL_IP" | awk '{print NF}')
    if [[ NUM_IPS -gt 1 ]]; then
        echo "Multiple local IP addresses found: $LOCAL_IP"
    fi
}
#getInternalIP

# Set EXTERNAL_IP to the external IPv4 address
function getExternalIP {
    # Get external IP address from Cloudflare API
    EXTERNAL_IP=$(getUrl 16777217/cdn-cgi/trace | awk -F= '/ip=/ { print $2 }')
    if [[ -z "$EXTERNAL_IP" ]]; then
        # Try checking another API
        EXTERNAL_IP=$(getUrl ifconfig.me/ip)
        if [[ -z "$EXTERNAL_IP" ]]; then
            return errorConfirm "Unable to determine external IP."
        fi
    fi

    echo "External IPv4: $EXTERNAL_IP"
}
#getExternalIP

# Set PUBLIC_IP to the matching internal and external IP
function findLocalExternalIP {
    for IP in $LOCAL_IP; do
        [[ $IP = $EXTERNAL_IP ]]
        if [[ $? -eq 0 ]]; then
            PUBLIC_IP=$IP
            return 0
        fi
    done
    
    return errorConfirm "Could not find a matching local and external IP address.\nYou may need to configure port forwarding."
}
#findLocalExternalIP

function getDomainNames {
    echo "Please provide your chosen domain (or subdomain) names for the web app."

    read -e -p 'Enter "live" address (e.g. example.com): ' LIVE_DOMAIN
    read -e -p 'Enter "dev" address (e.g. dev.example.com): ' DEV_DOMAIN
}
getDomainNames

function verifyDomainNames {
    echo "You entered these domain names. Are they correct?"
    echo "Live domain: $LIVE_DOMAIN"
    echo "Dev domain: $DEV_DOMAIN"
    select CONFIRM in "Yes" "No"; do
        case $CONFIRM in
            "Yes")
                return 0
                ;;
            "No")
                getDomainNames
                verifyDomainNames
                ;;
        esac
    done
}
verifyDomainNames

function check_cloudflare {
    ORG=$(whois "$1" | awk '/Organization/{ print }')
    if [[ "$ORG" =~ "Cloudflare " ]]; then
        USES_CLOUDFLARE=1
    fi
}

# Check if the entered domain/subdomains are resolvable and resolve to this IP
function checkDNS {
    LIVE_DNS=$(host -t A "$LIVE_DOMAIN" 16777217 | awk '/has address/{ print $(NF) }' | head -1)
    DEV_DNS=$(host -t A "$DEV_DOMAIN" 16777217 | awk '/has address/{ print $(NF) }' | head -1)

    if [[ -z $LIVE_DNS ]]; then
        echo 'The "live" address failed to resolve.'
        errorConfirm "Please confirm that you have configured your DNS settings for $LIVE_DNS to point to: $PUBLIC_IP"
        FAILED_RESOLVE=1
    fi
    
    if [[ -z $DEV_DNS ]]; then
        echo 'The "dev" address failed to resolve.'
        errorConfirm "Please confirm that you have configured your DNS settings for $DEV_DNS to point to: $PUBLIC_IP"
        FAILED_RESOLVE=1
    fi

    if [[ $FAILED_RESOLVE -ne 1 ]]; then
        # check for cloudflare
        check_cloudflare $LIVE_DNS
    fi
}

# Check for a previously installed/running webserver
function checkExistingWebserver {
    LPORTS=$(ss -tlnp '( sport = :http or sport = :https )' | wc -l)
    if [[ LPORTS -gt 1 ]]; then
        echo "A webserver is already listening on ports 80 and/or 443."
        echo "Please terminate and/or uninstall the existing webserver to proceed."
        ss -tlnp '( sport = :http or sport = :https )'
        
        errorConfirm "nginx will not be able to start if another webserver is already using ports 80/443"
    fi
}
checkExistingWebserver

function installWebserver {
    echo "Next step is to install nginx & php7-fpm."
    apt update && apt install nginx php-fpm php-mbstring
    echo "Installing the golang compiler."
    snap install go --classic
}
installWebserver

function configureNginx {
    mkdir -p /var/www/live/public_html
    mkdir -p /var/www/dev/public_html

    echo "Configuring default nginx site to drop requests without a recognized 'Host' header."
    sed -i 's/^/#/' /etc/nginx/sites-enabled/default
    cat <<EOT >>/etc/nginx/sites-enabled/default
# A default server block to drop connections without a recognized 'Host' header
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    return 444;
}
EOT
    nginx -t || errorConfirm "The nginx configuration is not valid, and the webserver cannot start."
    nginx -s reload

    echo "Configuring 'live' and 'dev' nginx sites."

    LIVE_NGINX_CONFIG=/etc/nginx/sites-enabled/live
    cat <<EOT >>$LIVE_NGINX_CONFIG
server {
    #LISTEN_HERE

    server_name $LIVE_DOMAIN

    #SSL_CERT_HERE
    #SSL_CERT_KEY_HERE

    #AUTHENTICATED_ORIGIN_CERT_HERE

    root /var/www/live/public_html;
    index index.html;

    location /backend/ {
        proxy_set_header Proxy "";

        # Note the trailing / means nginx will remove '/backend' from the URL
        proxy_pass http://127.0.0.1:8080/;
    }

    # This is the only php file the site needs to run.
    location = /checkproof.php {
        # Prevent HTTPoxy
        fastcgi_param HTTP_PROXY "";

        # Pass to php-fpm via unix socket
        fastcgi_pass unix:/var/run/php/php-fpm.sock;

        # Specify SCRIPT_FILENAME
        fastcgi_param SCRIPT_FILENAME $document_root/checkproof.php;
        include fastcgi_params;
    }
}
EOT
    DEV_NGINX_CONFIG=/etc/nginx/sites-enabled/dev
    cat <<EOT >>$DEV_NGINX_CONFIG
server {
    #LISTEN_HERE

    server_name $DEV_DOMAIN

    #SSL_CERT ssl_certificate /etc/nginx/certs/cf.pem;
    #SSL_CERT_KEY ssl_certificate_key /etc/nginx/certs/cf.key;

    #AUTHENTICATED_ORIGIN_CERT_HERE

    root /var/www/dev/public_html;
    index index.html;

    # The dev instance runs on port 8081 instead of 8080
    location /backend/ {
        proxy_set_header Proxy "";
        proxy_pass http://127.0.0.1:8081/
    }

    # This is the only php file the site needs to run.
    location = /checkproof.php {
        # Prevent HTTPoxy
        fastcgi_param HTTP_PROXY "";

        # Pass to php-fpm via unix socket
        fastcgi_pass unix:/var/run/php/php-fpm.sock;

        # Specify SCRIPT_FILENAME
        fastcgi_param SCRIPT_FILENAME $document_root/checkproof.php;
        include fastcgi_params;
    }
}
EOT
}
configureNginx

function configureNginxHTTP {
    sed -i 's/\#LISTEN_HERE/listen 80;/' $LIVE_NGINX_CONFIG
    sed -i 's/\#LISTEN_HERE/listen 80;/' $DEV_NGINX_CONFIG
}

function configureNginxHTTPS {
    mkdir /etc/nginx/certs

    sed -i 's/\#LISTEN_HERE/listen 443 ssl;/' $LIVE_NGINX_CONFIG
    sed -i 's/\#LISTEN_HERE/listen 443 ssl;/' $DEV_NGINX_CONFIG

    sed -i 's/\#SSL_CERT_KEY //' $LIVE_NGINX_CONFIG
    sed -i 's/\#SSL_CERT //' $LIVE_NGINX_CONFIG
    sed -i 's/\#SSL_CERT_KEY //' $DEV_NGINX_CONFIG
    sed -i 's/\#SSL_CERT //' $DEV_NGINX_CONFIG
}

function getCloudFlareCertsFromUser {
    echo "Please follow these directions to generate a certificate."
    echo "1. Log in to Cloudflare."
    echo "2. Select the appropriate account for the domain requiring an Origin CA certificate."
    echo "3. Select the domain."
    echo "4. Click the SSL/TLS app."
    echo "5. Click the Origin Server tab."
    echo "6. Click Create Certificate to open the Origin Certificate Installation window."
    echo "7. Choose the 'Let Cloudflare generate a private key and a CSR' option."
    echo "8. Enter both your 'live' and 'dev' (sub)domains: $LIVE_DOMAIN, $DEV_DOMAIN"
    echo "9. Choose the certificate expiration. The default is 15 years."
    echo "10. Click Next."
    echo "11. Select the key format: PEM."
    echo "12. Copy the origin certificate and private key, then enter them here when prompted."

    echo
    echo "Please copy/paste the ORIGIN CERTIFICATE now, followed by pressing CTRL+d (control key and d) when done:"
    cat > /etc/nginx/certs/cf.pem

    echo "File written to /etc/nginx/certs/cf.pem"
    
    echo
    echo "Please copy/paste the PRIVATE KEY now, followed by pressing CTRL+d (control key and d) when done:"
    cat > /etc/nginx/certs/cf.key

    echo "File written to /etc/nginx/certs/cf.key"

    configureNginxHTTPS
}

function configureAuthenticatedOriginPulls {
    echo "Configuring authenticated origin pulls."
    curl "https://support.cloudflare.com/hc/en-us/article_attachments/360044928032/origin-pull-ca.pem" > /etc/nginx/certs/origin-pull-ca.pem

    sed -i 's/\#AUTHENTICATED_ORIGIN_CERT_HERE/ssl_client_certificate \/etc\/nginx\/certs\/cloudflare.crt;\n\tssl_verify_client on;/' $LIVE_NGINX_CONFIG
    sed -i 's/\#AUTHENTICATED_ORIGIN_CERT_HERE/ssl_client_certificate \/etc\/nginx\/certs\/cloudflare.crt;\n\tssl_verify_client on;/' $DEV_NGINX_CONFIG
}

function getCloudflareCerts {
    local OPT1="Use 'flexible SSL' and configure the local webserver for HTTP only (least secure)"
    local OPT2="Use a Cloudflare-generated certificate, accept all requests"
    local OPT3="Use a Cloudflare-generated certificate, accept only Cloudflare-signed requests (most secure)"

    select CHOICE in "$OPT1" "$OPT2" "$OPT3"; do
        case "$CHOICE" in
            "$OPT1")
                echo "Selected 'flexible SSL' -- will configure webserver for HTTP only"
                configureNginxHTTP
                ;;
            "$OPT2")
                getCloudFlareCertsFromUser
                ;;
            "$OPT3")
                echo "Configuring the webserver to accept only Cloudflare-signed requests."
                echo "For authenticated origin pulls to work, use 'Full SSL' in the Cloudflare dashboard SSL/TLS app."
                getCloudFlareCertsFromUser
                configureAuthenticatedOriginPulls
                ;;
            esac
    done
}

# Configure nginx & certbot for automatic renewal
function getLetsEncryptCerts {
    echo "The LetsEncrypt certbot package comes from the Ubuntu 'universe' repository."
    echo "Directions here (will be done by this script automatically): https://certbot.eff.org/lets-encrypt/ubuntufocal-nginx"

    read -p "Press enter to add this repository and install the required packages."

    apt update
    apt install software-properties-common
    add-apt-repository universe
    apt update

    apt install certbot python3-certbot-nginx

    certbot --nginx
}

function getTLSCerts {
    echo "To use Sign-in with Google, a valid HTTPS certificate is required."

    if [[ $USES_CLOUDFLARE -eq 1 ]]; then
        # The domain is on Cloudflare, provide instructions for getting a cert from them
        echo "Your DNS records indicate that you are using Cloudflare."
        getCloudflareCerts
    fi

    local OPT1="Cloudflare (free, easiest/least maintenance)"
    local OPT2="LetsEncrypt (free)"
    local OPT3="I already have my own certificate and key"

    select CHOICE in "$OPT1" "$OPT2" "$OPT3"; do
        case "$CHOICE" in
            "$OPT1")
                getCloudflareCerts
            "$OPT2")
                echo "Starting LetsEncrypt certbot to get a free certificate and key."
                getLetsEncryptCerts
                ;;
            "$OPT3")
                configureNginxHTTPS
                echo "Please save your certificate in the following path: /etc/nginx/certs/cf.pem"
                echo "Please save your private key in the following path: /etc/nginx/certs/cf.key"
                read -p "Press enter to continue."
                ;;
        esac
    done
}
getTLSCerts

nginx -t || errorConfirm "The nginx configuration is not valid, and the webserver will not be able to start."
nginx -s reload

function configureBackend {
    echo "Compiling backend (live)..."
    git checkout master
    go build backend.go

    if [[ $? -ne 0 ]]; then
        errorConfirm "Could not compile backend (live)."
    fi

    mkdir -p /usr/local/bin
    cp backend /usr/local/bin

    cat <<EOT >>/etc/systemd/system/backend.service
[Unit]
Description=Logic App Backend Service (Go)
After=network.target
StartLimitIntervalSec=0

[Service]
WorkingDirectory=/var/www/live
Type=simple
Restart=always
RestartSec=3
User=www-data
ExecStart=/usr/local/bin/backend

[Install]
WantedBy=multi-user.target
EOT

    echo "Compiling backend (dev)..."
    git checkout dev
    git stash

    go build backend.go
    if [[ $? -ne 0 ]]; then
        errorConfirm "Could not compile backend (dev)."
    fi

    cp backend /usr/local/bin/backend-dev

    cat <<EOT >>/etc/systemd/system/backend-dev.service
[Unit]
Description=Logic App Backend Service (Go) Dev Branch
After=network.target
StartLimitIntervalSec=0

[Service]
WorkingDirectory=/var/www/dev
Type=simple
Restart=always
RestartSec=3
User=www-data
ExecStart=/usr/local/bin/backend-dev

[Install]
WantedBy=multi-user.target
EOT

}
configureBackend