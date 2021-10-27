#!/bin/bash

# This script installs all necessary components of the web app.
# Requires: Ubuntu 20.04, 64-bit, IPv4 connectivity

# See INSTALL.md for documentation and manual install instructions.

# Function to display an error message and an option to continue anyways.
# This function cannot be used from within subshells $(...)
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

# Check that a given command exists, and is executable
function check_command {
    command -v $1 >/dev/null 2>&1 && [[ -x $(command -v $1) ]]
}

# Check that the script is being run as root
function check_privileges {
    if [[ $EUID -ne 0 ]]; then
        echo "This script must be run as root."
        exit 1
    fi
}
check_privileges

# Check that the script is being run on Ubuntu 20.04 LTS, x86_64
function check_host_os {
    grep -q -s 'DISTRIB_RELEASE=20.04' /etc/lsb-release || errorConfirm "This script is intended for use only on Ubuntu 20.04 LTS. You may encounter issues on another OS."
    [[ $(uname -m) = 'x86_64' ]] || errorConfirm "This script is intended for use only on 64-bit x86 servers. You may encounter issues on other architectures."
}
check_host_os

# Check dependencies before running the script
function check_dependencies {
    local MISSING_DEPS=''

    check_command host || MISSING_DEPS="$MISSING_DEPS host"

    check_command curl || MISSING_DEPS="$MISSING_DEPS curl"

    check_command awk || MISSING_DEPS="$MISSING_DEPS gawk"

    check_command openssl || MISSING_DEPS="$MISSING_DEPS openssl"

    check_command gcc || MISSING_DEPS="$MISSING_DEPS gcc"

    check_command git || MISSING_DEPS="$MISSING_DEPS git"

    if [[ -z "$MISSING_DEPS" ]]; then
        return 0
    fi

    echo "This script requires some additional software to run."
    errorConfirm "May I run the following command to install the dependencies?" "    apt install -y $MISSING_DEPS"
    apt update && apt install -y $MISSING_DEPS
}
check_dependencies

function checkLocalGitRepository {
    GIT_ORIGIN=$(git config --get remote.origin.url)
    if [[ -z $GIT_ORIGIN ]]; then
        echo "This script must be run from within a git repository."
        exit 1
    fi

    if [[ ! $GIT_ORIGIN =~ ^http ]]; then
        echo "The git-hook configuration is easiest to use with an HTTP(s) origin and a public repository."
        errorConfirm "Please clone the repository using HTTP(s) and start again."
    fi
}
checkLocalGitRepository

# Warn the user if they have uncommited changes to the git repository
function checkGitUncommitedChanges {
    git diff-index --quiet HEAD -- || errorConfirm "Your local git repository has uncommited changes that will be lost. Please commit your changes if you would like to keep them."
}
checkGitUncommitedChanges

# GET the contents of a URL using curl, timeout after 5 seconds
# This function is used by subshells, e.g. CONTENTS=$(getUrl http://example.org/)
function getUrl {
    timeout 5 curl "$1" 2>/dev/null
    if [[ $? -ne 0 ]]; then
        >>/dev/stderr echo "curl $1 timed out. retrying one time."
        timeout 5 curl "$1"
        if [[ $? -ne 0 ]]; then
            >>/dev/stderr echo "Could not retrieve URL after 2 attempts. The script may not be able to complete as intended."
        fi
    fi
}

# Set LOCAL_IP to the local IP address(es)
function getInternalIP {
    LOCAL_IP=$(hostname -I)

    NUM_IPS=$(echo "$LOCAL_IP" | awk '{print NF}')
    if [[ NUM_IPS -gt 1 ]]; then
        echo "Multiple local IP addresses found: $LOCAL_IP"
    fi
}
getInternalIP

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
getExternalIP

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
findLocalExternalIP

# Get domain names from user input, set LIVE_DOMAIN and DEV_DOMAIN
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

# Check if the entered domain/subdomains are resolvable and resolve to this IP
function checkDNS {
    LIVE_DNS=$(host -t A "$LIVE_DOMAIN" 16777217 | awk '/has address/{ print $(NF) }' | head -1)
    DEV_DNS=$(host -t A "$DEV_DOMAIN" 16777217 | awk '/has address/{ print $(NF) }' | head -1)

    if [[ -z $LIVE_DNS ]]; then
        echo 'The "live" address failed to resolve.'
        errorConfirm "Please confirm that you have configured your DNS settings for $LIVE_DOMAIN to point to: $PUBLIC_IP"
        FAILED_RESOLVE=1
    fi
    
    if [[ -z $DEV_DNS ]]; then
        echo 'The "dev" address failed to resolve.'
        errorConfirm "Please confirm that you have configured your DNS settings for $DEV_DOMAIN to point to: $PUBLIC_IP"
        FAILED_RESOLVE=1
    fi
}

# Check for a previously installed/running webserver
function checkExistingWebserver {
    LPORTS=$(ss -tlnp '( sport = :http or sport = :https )' | grep -v nginx | wc -l)
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

    chown -R www-data:www-data /var/www

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
    rm -f /etc/nginx/sites-enabled/{live,dev}

    nginx -t || errorConfirm "The nginx configuration is not valid, and the webserver cannot start."
    nginx -s reload

    echo "Configuring 'live' and 'dev' nginx sites."

    LIVE_NGINX_CONFIG=/etc/nginx/sites-enabled/live
    sed "s/LIVE_DOMAIN/$LIVE_DOMAIN/" installer_files/live.conf >$LIVE_NGINX_CONFIG

    DEV_NGINX_CONFIG=/etc/nginx/sites-enabled/dev
    sed "s/DEV_DOMAIN/$DEV_DOMAIN/" installer_files/dev.conf >$DEV_NGINX_CONFIG
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
    configureNginxHTTPS

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
}

function configureAuthenticatedOriginPulls {
    echo "Configuring authenticated origin pulls."
    #curl "https://support.cloudflare.com/hc/en-us/article_attachments/360044928032/origin-pull-ca.pem" > /etc/nginx/certs/origin-pull-ca.pem
    echo
    #echo "Please copy/paste the origin-pull-ca certificate now from https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/set-up, followed by pressing CTRL+d (control key and d) when done"
    #cat  > /etc/nginx/certs/origin-pull-ca.pem
    sed -i 's/\#AUTHENTICATED_ORIGIN_CERT_HERE/ssl_client_certificate \/etc\/nginx\/certs\/origin-pull-ca.pem;\n\tssl_verify_client on;/' $LIVE_NGINX_CONFIG
    sed -i 's/\#AUTHENTICATED_ORIGIN_CERT_HERE/ssl_client_certificate \/etc\/nginx\/certs\/origin-pull-ca.pem;\n\tssl_verify_client on;/' $DEV_NGINX_CONFIG
}

function getCloudflareCerts {
    local OPT3="Use 'flexible SSL' and configure the local webserver for HTTP only (least secure, not recommended)"
    local OPT2="Use a Cloudflare-generated certificate, accept all requests"
    local OPT1="Use a Cloudflare-generated certificate, accept only Cloudflare-signed requests (most secure)"

    select CHOICE in "$OPT1" "$OPT2" "$OPT3"; do
        case "$CHOICE" in
            "$OPT3")
                echo "Selected 'flexible SSL' -- will configure webserver for HTTP only"
                configureNginxHTTP
                break
                ;;
            "$OPT2")
                getCloudFlareCertsFromUser
                break
                ;;
            "$OPT1")
                echo "Configuring the webserver to accept only Cloudflare-signed requests."
                echo "For authenticated origin pulls to work, use 'Full SSL' in the Cloudflare dashboard SSL/TLS app."
                getCloudFlareCertsFromUser
                configureAuthenticatedOriginPulls
                break
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
                break
                ;;
            "$OPT2")
                echo "Starting LetsEncrypt certbot to get a free certificate and key."
                getLetsEncryptCerts
                break
                ;;
            "$OPT3")
                configureNginxHTTPS
                echo "Please save your certificate in the following path: /etc/nginx/certs/cf.pem"
                echo "Please save your private key in the following path: /etc/nginx/certs/cf.key"
                read -p "Press enter to continue."
                break
                ;;
        esac
    done
}
getTLSCerts

nginx -t || errorConfirm "The nginx configuration is not valid, and the webserver will not be able to start."
nginx -s reload

# Set up the server to report backend status during login
function configureMotd {
    [[ -d /etc/update-motd.d ]] || errorConfirm "The directory /etc/update-motd.d does not exist."
    [[ -d /etc/update-motd.d ]] || mkdir -p /etc/update-motd.d

    cat installer_files/99-backend > /etc/update-motd.d/99-backend
    chmod +x /etc/update-motd.d/99-backend
}
configureMotd

# Configure the server to automatically install security updates
function configureUnattendedUpgrades {
    echo "Configuring unattended-upgrades to automatically install security updates."
    apt install -y unattended-upgrades && dpkg-reconfigure unattended-upgrades

    echo "Configuring server to reboot automatically after updates."
    echo 'Unattended-Upgrade::Automatic-Reboot "false";' >>/etc/apt/apt.conf.d/50unattended-upgrades
}
configureUnattendedUpgrades

# Add a "git-hook" user and clone the repository in that user's home dir
function configureGitHook {
    echo "Creating user 'git-hook' to run Git-Hook..."
    adduser --ingroup www-data --disabled-password --gecos 'User for running Git-Hook' git-hook || true

    if [[ $(id -g git-hook) -ne $(id -g www-data) ]]; then
        errorConfirm "The git-hook user and www-data user do not have matching group IDs. Git hook updates may not work as expected."
    fi

    mkdir -p /usr/local/bin

    # Install dummy binaries to enable write permissions for git-hook user
    cp /bin/true /usr/local/bin/backend
    cp /bin/true /usr/local/bin/backend-dev
    chown git-hook /usr/local/bin/backend
    chown git-hook /usr/local/bin/backend-dev


    echo "Adding git-hook user to sudoers for backend stop/start commands..."
    cat installer_files/03-git-hook > /etc/sudoers.d/03-git-hook
    chmod 0440 /etc/sudoers.d/03-git-hook

    if [[ ! $GIT_ORIGIN =~ ^http ]]; then
        echo "This git repository was cloned using ssh. Please copy your private key to /home/git-hook/.ssh/ so that the git-hook user can clone it."
        echo "Alternatively, if the repository is public, use the HTTPS origin instead of SSH."
        read -p "Press enter to continue..."
    fi

    pushd .
    cd /home/git-hook/
    sudo -u git-hook git clone "$GIT_ORIGIN"
    chown -R git-hook /home/git-hook
    popd
}
configureGitHook

function configureNginxGitHook {
    echo "Configuring git-hook URL."
    RAND_PATH=$(</dev/urandom tr -cd '[:alnum:]' | head -c32)
    GIT_HOOK_URL="https://$DEV_DOMAIN/$RAND_PATH/git-hook"
    sed -i "s/RAND_PATH_HERE/$RAND_PATH/" "$DEV_NGINX_CONFIG"

    nginx -t || errorConfirm "The nginx configuration is not valid, and the webserver will not be able to start."
    nginx -s reload

    echo "IMPORTANT: Your unique git-hook Payload URL:"
    echo
    echo $GIT_HOOK_URL
    echo
    echo "Add to your GitHub repository by clicking 'Settings', then 'Webhooks', then 'Add Webhook' on the GitHub website."
    read -p "Enter the URL into your GitHub settings, then press enter to continue..."
}
configureNginxGitHook

function configureBackend {
    echo "Installing backend service..."
    cat installer_files/backend.service >/etc/systemd/system/backend.service

    echo "Installing backend-dev service..."
    cat installer_files/backend-dev.service >/etc/systemd/system/backend-dev.service

    echo "Configuring services to start at boot..."
    systemctl enable backend
    systemctl enable backend-dev

    # The services will fail at first due to the first deployment not having been done yet
    echo "Starting services..."
    systemctl start backend >/dev/null 2>&1
    systemctl start backend-dev >/dev/null 2>&1
}
configureBackend

function installGitHookService {
    cp installer_files/git-hook.sh /usr/local/bin/git-hook.sh
    chmod +x /usr/local/bin/git-hook.sh

    cp installer_files/git-hook.service /etc/systemd/system/git-hook.service

    echo "Configuring git-hook service to start at boot."
    systemctl enable git-hook.service

    echo "Starting git-hook service..."
    systemctl start git-hook
}
installGitHookService

# Set permissions on /var/www to allow group writes
function setPermissionsWeb {
    echo "Settings filesystem permissions..."
    chown -R www-data:www-data /var/www
    chmod -R g+w /var/www
}
setPermissionsWeb

echo
echo "Installation complete!"
