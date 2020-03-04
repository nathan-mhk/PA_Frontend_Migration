# Get it up and running

To develop a plugin for Pathadvisor system. You need to fork and clone the project, get it up and running, implement the plugin, test it locally and then create a pull request. Once the pull request is approved, your plugin will be merged back to official repository and will become part of the PathAdvisor system.

## Fork the repository

To fork (create a copy) the PathAdvisor project, go to [official PathAdvisor repository](https://gitlab.com/thenrikie/pathadvisor-frontend) and click Fork button. You need to login to see the fork button.


<sup>Figure 1:  Fork button</sup><br/>
<img src="../imgs/fork-button.png" alt="fork button image" />


After that you should able to find the same repository in your own gitlab account. This repository is a copy of the original one and you can make your own changes here without affecting the official repository.

## Run it locally

The README.md in [official Pathadvisor repository](https://gitlab.com/thenrikie/pathadvisor-frontend) described how to install and run it locally. For updated instruction, please always check there.

Please check that your environment meet [system requirement](index.md#system-requirement) before you move on.

Go to your forked repository and click the blue clone button and copy the address under `Clone with SSH`

Now open a shell terminal and type

`git clone <address copied from Clone with SSH>`

Once it is done go into the project directory.

`cd pathadvisor-frontend`

then install dependencies.

`npx bolt`

then run it locally.

`npm start`

Now you should able to access the app locally at http://localhost:3000




