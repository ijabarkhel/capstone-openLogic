# Logic Proof Check: Web App

There are three components of this web app:

- Front-end (static HTML/JavaScript)

- Backend part #1 (open logic proof checker, php7)

- Backend part #2 (database/user accounts, used by front-end)

### Original README.md below
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
