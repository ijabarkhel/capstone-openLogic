# Logic Proof Check: Web App

There are three components of this web app:

- Front-end (static HTML/JavaScript)

- Backend part #1 (open logic proof checker, php7)

- Backend part #2 (database/user accounts, used by front-end)

## Installation

### Prerequisites

#### Domain Name or Subdomain

- In order to use Sign-in with Google, you will need a domain name or subdomain.

- Websites like https://tld-list.com are useful if choosing a domain name.

- Once you've decided on which domain and/or subdomains you will use, a later step will be to choose a server to run the web app. This can be a hosted server, or any other server that is internet-reachable. See _Deployment_ for more.

#### Sign-in with Google

- You need a Google OAUTH client ID for Web Application

Obtain one by following the instructions here: https://developers.google.com/identity/sign-in/web/sign-in#create_authorization_credentials

*The client secret is not needed, as this application uses Google accounts only for authentication.*

- After obtaining a client ID, ensure that you have edited `index.html` (meta tag, around line 43) and `backend.go` (authorized_client_ids) to contain your client ID.

*Without a Google OAUTH client ID which has been configured via the Google Developer Console with your selected domain name(s), the app can be installed and configured but sign in will not be available.*

#### Server setup

1. Log in via ssh as root to your server instance.

2. Clone your repository, for example: `git clone https://github.com/cohunter/capstone-openLogic.git` (but use your repo's URL).

3. Change into the 'capstone-openLogic' directory: `cd capstone-openLogic`

4. Run the install script: `bash install.sh`

The install script will interactively guide you through setup of the web app, including:

- Installation and configuration of Nginx (web server)

- Installation of php7-fpm and the multibyte extension

- Installation of service configuration files for the backend part #2, and for receiving webhooks from GitHub

After completion of the install script, the VPS/server will have been configured to start all necessary services automatically on reboot.


## Making code changes

Your repository should have two branches: _dev_ and _master_. When prompted by the install script, create web hooks via the GitHub website. Then, to make changes:

- Test your changes by pushing new commits to the _dev_ branch.

If your site is example.com, then the dev branch will deploy to dev.example.com.

- When satisfied with the changes, deploy them to the live site by pushing new commits to the _master_ branch.

## Deployment

Recommended deployment strategy (optimizing for simplicity, low-cost, and minimal required maintenance) is to use a VPS running Ubuntu 20.04 LTS to host all components of the app.

Suggested VPS size:

- Minimum:
-- 1 CPU core, 512 MB ram.
- Recommenced:
-- 1 high-performance CPU core, or 2 standard CPU cores per 50 concurrent users.
-- 1 GB ram
-- NVME local storage

VPS meeting or exceeding these specs should not cost more than $6-10/month.

Hosting suggestions for a single class:

Vultr - $6/month

https://www.vultr.com/products/high-frequency-compute/#pricing

OVH - $6/month

https://www.ovhcloud.com/en/vps/

Linode - $5/month

https://www.linode.com/pricing/

AWS Lightsail - $5/month

https://aws.amazon.com/lightsail/pricing/

### Along with a hosting provider, it is recommended to use a CDN

Cloudflare - free

https://www.cloudflare.com/

By using Cloudflare, or any similar CDN/security service, you gain greatly improved front-end load times and prevent most common types of attacks, including DoS/DDoS, with no additional effort. You also get the easiest, lowest-maintenance/hassle-free option for enabling HTTPS. Their free plan is more than sufficient for this web app, even if it were to be used by many classes/universities.

### Scaling and/or migrating

The front-end and backend part #1 (php7) are stateless. They store no data and have no special requirements (php7 and the multibyte extension for backend part #1). Therefore, moving them or scaling them can be done by copying the files to any suitably configured webserver.

All of the application state is managed by backend part #2. The data is stored in an SQLite database, which consists of a single file. The database can be transferred to a different server by standard Unix utilities such as scp. After ensuring correct filesystem permissions, the backend part #2 can be run on a new server and will use the copy of the database.

### Original README.md (outdated) below
-----
## Capstone Spring 2019: Logic Proof Checker
This project was created for the Spring 2019 Capstone Class at California State University, Monterey Bay. The proof checking done in the project is derived from [OpenLogicProject](https://github.com/OpenLogicProject/fitch-checker).

## Deployment
This project is deployed on heroku at [https://logic-proof-checker.herokuapp.com/](https://logic-proof-checker.herokuapp.com/). The project is set to automatically deploy when new changes are made to the master branch. 

**For an alternate method of deployment or to deploy a branch other than master**: 

- Go to [this link](https://dashboard.heroku.com/apps/logic-proof-checker/deploy/github) if you have access to the deployment.
- Find the section of the page that under _Manual deployment_.
- Select the branch you would like to deploy, and click _Deploy Branch_.
> **Note**: changing the currently deployed branch will not affect the automatic deployment and the master branch will still be deployed when changes are made to it. If you would like to disable Automatic deployments from master follow the steps below.

**To disable automatic deployment**: 

- Go to [this link](https://dashboard.heroku.com/apps/logic-proof-checker/deploy/github) if you have access to the deployment.
- Find the section of the page that under _Automatic deploys_.
- Click on _Disable Automatic Deploys_.
> **Note**: This will mean that you will have to deploy manually everytime you make changes to the code.
